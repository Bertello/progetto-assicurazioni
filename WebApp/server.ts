import _https from "https";
import _http from "http";
import _url from "url";
import _fs from "fs";
import _express from "express";
import _dotenv from "dotenv";
import _cors from "cors";
import _fileUpload from "express-fileupload";
import _cloudinary, { UploadApiResponse } from 'cloudinary';
import _streamifier from "streamifier";
import _axios from "axios";
import _nodemailer from "nodemailer";
import _bcrypt from "bcryptjs";
import _jwt from "jsonwebtoken";
import { google } from 'googleapis';

// Lettura delle password e parametri fondamentali
_dotenv.config({ "path": ".env" });

// Configurazione Cloudinary
_cloudinary.v2.config({
    cloud_name: process.env.cloud_name,
    api_key: process.env.api_key,
    api_secret: process.env.api_secret
});

// Variabili relative a MongoDB ed Express
import { MongoClient, ObjectId } from "mongodb";
const DBNAME = process.env.DBNAME;
const connectionString: string = process.env.connectionStringAtlas;
const app = _express();

// Creazione ed avvio del server https, a questo server occorre passare le chiavi RSA (pubblica e privata)
// app è il router di Express, si occupa di tutta la gestione delle richieste https
const HTTPS_PORT: number = parseInt(process.env.PORT);
let paginaErrore;
const PRIVATE_KEY = _fs.readFileSync("./keys/privateKey.pem", "utf8");
const CERTIFICATE = _fs.readFileSync("./keys/certificate.crt", "utf8");
const ENCRYPTION_KEY = _fs.readFileSync("./keys/encryptionKey.txt", "utf8");
const CREDENTIALS = { "key": PRIVATE_KEY, "cert": CERTIFICATE };

const http_server = _http.createServer(app);
http_server.listen(HTTPS_PORT, () => {
    init();
    console.log(`Server HTTP in ascolto sulla porta ${HTTPS_PORT}`);
});

/*const https_server = _https.createServer(CREDENTIALS, app);
// Il secondo parametro facoltativo ipAddress consente di mettere il server in ascolto su una delle interfacce della macchina, se non lo metto viene messo in ascolto su tutte le interfacce (3 --> loopback e 2 di rete)
https_server.listen(HTTPS_PORT, () => {
    init();
    console.log(`Server HTTPS in ascolto sulla porta ${HTTPS_PORT}`);
});*/

function init() {
    _fs.readFile("./static/error.html", function (err, data) {
        if (err) {
            paginaErrore = `<h1>Risorsa non trovata</h1>`;
        }
        else {
            paginaErrore = data.toString();
        }
    });
}

//********************************************************************************************//
// Routes middleware
//********************************************************************************************//

// 1. Request log
app.use("/", (req: any, res: any, next: any) => {
    console.log(`-----> ${req.method}: ${req.originalUrl}`);
    next();
});

// 2. Gestione delle risorse statiche
// .static() è un metodo di express che ha già implementata la firma di sopra. Se trova il file fa la send() altrimenti fa la next()
app.use("/", _express.static("./static"));

// 3. Lettura dei parametri POST di req["body"] (bodyParser)
// .json() intercetta solo i parametri passati in json nel body della http request
app.use("/", _express.json({ "limit": "50mb" }));
// .urlencoded() intercetta solo i parametri passati in urlencoded nel body della http request
app.use("/", _express.urlencoded({ "limit": "50mb", "extended": true }));

// 4. Aggancio dei parametri del FormData e dei parametri scalari passati dentro il FormData
// Dimensione massima del file = 10 MB
app.use("/", _fileUpload({ "limits": { "fileSize": (10 * 1024 * 1024) } }));

// 5. Log dei parametri GET, POST, PUT, PATCH, DELETE
app.use("/", (req: any, res: any, next: any) => {
    if (Object.keys(req["query"]).length > 0) {
        console.log(`       ${JSON.stringify(req["query"])}`);
    }
    if (Object.keys(req["body"]).length > 0) {
        console.log(`       ${JSON.stringify(req["body"])}`);
    }
    next();
});

// 6. Controllo degli accessi tramite CORS
// Procedura che lascia passare tutto, accetta tutte le richieste
const corsOptions = {
    origin: function (origin, callback) {
        return callback(null, true);
    },
    credentials: true
};
app.use("/", _cors(corsOptions));

// 7. Login
app.post("/api/login", async (req, res, next) => {
    let username = req["body"].username;
    let pwd = req["body"].password;
    const client = new MongoClient(connectionString);
    await client.connect();
    const collection = client.db(DBNAME).collection("utenti");
    let regex = new RegExp(`^${username}$`, "i");
    let rq = collection.findOne({ "username": regex }, { "projection": { "username": 1, "password": 1, "admin": 1 } });
    rq.then((dbUser) => {
        if (!dbUser) {
            res.status(401).send("Username non valido");
        }
        else {
            _bcrypt.compare(pwd, dbUser.password, (err, success) => {
                if (err) {
                    res.status(500).send(`Bcrypt compare error: ${err.message}`);
                }
                else {
                    if (!success) {
                        res.status(401).send("Password non valida");
                    }
                    else {
                        let token = createToken(dbUser);
                        console.log(token);
                        res.setHeader("authorization", token);
                        // Fa si che la header authorization venga restituita al client
                        res.setHeader("access-control-expose-headers", "authorization");
                        res.send(dbUser.admin);
                    }
                }
            })
        }
    });
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err.message}`));
    rq.finally(() => client.close());
});



//8. Controllo del token
app.use("/", (req: any, res: any, next: any) => {
    if (!req.headers["authorization"]) {
        res.status(403).send("Token mancante");
    }
    else {
        let token = req.headers["authorization"];
        _jwt.verify(token, ENCRYPTION_KEY, (err, payload) => {
            if (err) {
                res.status(403).send(`Token non valido: ${err}`);
            }
            else {
                let newToken = createToken(payload);
                console.log(newToken);
                res.setHeader("authorization", newToken);
                // Fa si che la header authorization venga restituita al client
                res.setHeader("access-control-expose-headers", "authorization");
                req["payload"] = payload;
                next();
            }
        });
    }
});

function createToken(data) {
    let currentTimeSeconds = Math.floor(new Date().getTime() / 1000);
    let payload = {
        "_id": data._id,
        "username": data.username,
        // Se c'è iat mette iat altrimenti mette currentTimeSeconds
        "iat": data.iat || currentTimeSeconds,
        "exp": currentTimeSeconds + parseInt(process.env.durata_token)
    }
    let token = _jwt.sign(payload, ENCRYPTION_KEY);
    return token;
}

//********************************************************************************************//
// Routes finali di risposta al client
//********************************************************************************************//

app.get("/api/perizie", (req, res, next) => {
    const client = new MongoClient(connectionString);
    client.connect().then(() => {
        const collection = client.db(DBNAME).collection("perizie");
        let rq = collection.find({}).toArray();
        rq.then((data) => {
            res.send(data);
        });
        rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err.message}`));
        rq.finally(() => client.close());
    });
});

// recupera perizia in base a codperizia
app.get("/api/periziebyid/:codperizia", (req, res, next) => {
    console.log(req.params.codperizia)
    const client = new MongoClient(connectionString);
    client.connect().then(() => {
        const collection = client.db(DBNAME).collection("perizie");
        let rq = collection.findOne({ "codperizia": parseInt(req.params.codperizia) });
        rq.then((data) => {
            res.send(data);
        });
        rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err.message}`));
        rq.finally(() => client.close());
    });
});

// recupera perizia in base a codoperatore
app.get("/api/operatorebyid/:codoperatore", (req, res, next) => {
    console.log(req.params.codoperatore)
    const client = new MongoClient(connectionString);
    client.connect().then(() => {
        const collection = client.db(DBNAME).collection("perizie");
        //let rq = collection.findOne({ "codoperatore": parseInt(req.params.codoperatore) });
        let rq = collection.find({ "codoperatore": parseInt(req.params.codoperatore) }).toArray();
        rq.then((data) => {
            res.send(data);
        });
        rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err.message}`));
        rq.finally(() => client.close());
    });
});

//salva i nuovi dati ricevuti da client
app.put("/api/aggiornaperizie", (req, res, next) => {
    console.log(req.body);
    const client = new MongoClient(connectionString);
    client.connect().then(() => {
        const collection = client.db(DBNAME).collection("perizie");
        let codperizia = req.body.codperizia;
        let descrizione = req.body.descrizione;
        let nuoviCommenti = req.body.commenti;
        // modifica la descrizione, ancora da implementare modifica commenti
        let rqimg = collection.find({ "codperizia": codperizia }).project({ "immagini": 1, _id: 0 }).toArray();
        rqimg.then((data) => {
            let immagini = data[0].immagini;
            console.log(immagini);
            immagini = immagini.map((img, i) => {
                img["commento"] = nuoviCommenti[i];
                return img
            });
            let rq = collection.updateOne({ "codperizia": codperizia }, { $set: { "descrizione": descrizione, immagini } });
            rq.then((data) => {
                res.send("ok");
            });
            rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err.message}`));
            rq.finally(() => client.close());
        });
    });
});

app.get("/api/operatore", (req, res, next) => {
    const client = new MongoClient(connectionString);
    client.connect().then(() => {
        const collection = client.db(DBNAME).collection("utenti");
        let rq = collection.find({"admin":false}).toArray();
        rq.then((data) => {
            res.send(data);
        });
        rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err.message}`));
        rq.finally(() => client.close());
    });
});








/* CREA UTENTE E INVIO MAIL*/
app.post("/api/nuovoUtente", async (req, res, next) => {
    const user = req["body"]["utente"];

    const client = new MongoClient(connectionString);
    await client.connect();
    const collection = client.db(DBNAME).collection("utenti");
    const isUtenteEsistente = await collection.findOne({
        $or: [
            { username: user.username },
            { mail: user.mail }
        ]
    });
    if (isUtenteEsistente) {
        res.status(400).send("Username o email già esistenti");
    } else {
        const userCount = await collection.countDocuments();
        let codOperatore = userCount - 1;

        const isCodOperatoreEsistente = await collection.findOne({ "codoperatore": codOperatore });
        if (isCodOperatoreEsistente)
            codOperatore++;

        user["codoperatore"] = codOperatore;
        user["admin"] = false;
        user["_id"] = new ObjectId();
        user["password"] = creaPassword();

        inviaPassword(user, res);
        console.log(user)
        user["password"] = _bcrypt.hashSync(user["password"]);
        //console.log(user)
        let rq = collection.insertOne(user)
        rq.then((data) => res.send(data))
        rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err.message}`));
        rq.finally(() => client.close());
    }

})

function creaPassword(): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_';
    let password = '';
    for (let i = 0; i < 12; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
}

const o_Auth2 = JSON.parse(process.env.oAuthCredential as any)
const OAuth2 = google.auth.OAuth2; // Oggetto OAuth2
const OAuth2Client = new OAuth2(
    o_Auth2["client_id"],
    o_Auth2["client_secret"]
);
OAuth2Client.setCredentials({
    refresh_token: o_Auth2.refresh_token,
});
let message = _fs.readFileSync("./message.html", "utf8");

async function inviaPassword(user: any, res: any) {
    console.log("IMPORTANTE:" + user.username)
    const access_token = await OAuth2Client.getAccessToken().catch((err) => {
        res.status(500).send(`Errore richiesta Access_Token a Google: ${err}`);
    });
    const auth = {
        "type": "OAuth2",
        "user": process.env.gmailUser,
        "clientId": o_Auth2.client_id,
        "clientSecret": o_Auth2.client_secret,
        "refreshToken": o_Auth2.refresh_token,
        "accessToken": access_token,
    }
    const transporter = _nodemailer.createTransport({
        "service": "gmail",
        "auth": auth
    });
    let mailOptions = {
        "from": auth.user,
        "to": user.mail,
        "subject": "Nuova password di accesso a Rilievi e Perizie",
        "html": message.replace("__user", user.username).replace("__password", user.password),
        /*"attachments": [
            {
                "filename": "nuovaPassword.png",
                "path": "./qrCode.png"
            }
        ]*/
    }
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log(err)
            res.status(500).send(`Errore invio mail:\n${err.message}`);
        }
        else {
            console.log("OK")
            res.send("Email inviata correttamente!");
        }
    });
}


// La .send() mette status 200 e fa il parsing. In caso di codice diverso da 200 la .send() non fa il parsing
// I parametri GET in Express sono restituiti in req["query"]
// I parametri POST, PATCH, PUT, DELETE in Express sono restituiti in req["body"]
// Se nella url ho /api/:parametro il valore del parametro passato lo troverò in req["params"].parametro
// Se uso un input:files il contenuto dei files li troverò in req["files"].nomeParametro
// nomeParametro contiene due campi principali: 
// nomeParametro.name contiene il nome del file scelto dal client
// nomeParametro.data contiene il contenuto binario del file
// _streamifier serve solo per aggiungere immagine binarie su Cloudinary


//********************************************************************************************//
// Default route e gestione degli errori
//********************************************************************************************//

app.use("/", (req, res, next) => {
    res.status(404);
    if (req.originalUrl.startsWith("/api/")) {
        res.send(`Api non disponibile`);
    }
    else {
        res.send(paginaErrore);
    }
});

app.use("/", (err, req, res, next) => {
    console.log("************* SERVER ERROR ***************\n", err.stack);
    res.status(500).send(err.message);
});