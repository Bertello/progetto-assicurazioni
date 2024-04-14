"use strict"

// vettore globale di markers 
let markers = [];
let contmarkers = 0;


$(document).ready(async function () {


	await caricaGoogleMaps();

	/* ************************* LOGOUT  *********************** */

	/*  Per il logout è inutile inviare una richiesta al server.
		E' sufficiente cancellare il cookie o il token dal pc client.
		Se però si utilizzano i cookies la gestione dei cookies lato client 
		è trasparente, per cui in quel caso occorre inviare una req al server */

	$("#btnLogout").on("click", function () {
		localStorage.removeItem("token")
		window.location.href = "login.html"
	});

	$("#infopercorso").hide();
	$("#btnvisualizza").hide();
	CaricaMappa();
	$("#creautente").hide();

	$("#btnvisualizza").on("click", function () {
		$("#btnnascondi").show();
		$("#btnvisualizza").hide();
		$("#map").show();
		$("#creautente").hide();
		CaricaMappa()
	});

	$("#btnnascondi").on("click", function () {
		$("#btnnascondi").hide();
		$("#btnvisualizza").show();
		$("#creautente").hide();
		$("#map").hide();
	});

	$("#btncrea").on("click", function () {
		$("#btnnascondi").hide();
		$("#btnvisualizza").show();
		$("#map").hide();
		$("#creautente").show();
	});

	$("#btnInvia").on("click", function () {
		const utente = {
			username: $("#username").val(),
			mail: $("#mail").val()
		}

		inviaRichiesta("POST", "/api/nuovoUtente", { utente }).catch(errore)
			.then(function (response) {
				console.log(response)
				if (response!=undefined && response.data.matchedCount!=0)
					alert("Utente creato correttamente")
				//window.location.href = "index.html"
				$("#username").val("")
				$("#mail").val("")
			})
	})

	const usernameinput = $("#username");
	const emailInput = $("#email");
	usernameinput.on('input', function() {
		const usernameValue = usernameinput.val();
		const emailValue = emailInput.val();
		const isValid = usernameValue.length > 0 && validateEmail(emailValue);
		let bntinvia = $("#btnInvia");
		bntinvia.prop("disabled", !isValid);
	});

	emailInput.on('input', function() {
		const usernameValue = usernameinput.val();
		const emailValue = emailInput.val();
		const isValid = usernameValue.length > 0 && validateEmail(emailValue);
		let bntinvia = $("#btnInvia");
		bntinvia.prop("disabled", !isValid);
	});

	function validateEmail(email) {
		const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(email);
	}



});

function CaricaMappa() {
	let mapContainer = $("#mapContainer").get(0);
	$("#mapContainer").css("float", "none");
	$("#msg").html("");
	$("#select").show();
	$("#select-label").show();
	// Posizione Vallauri    
	let position = new google.maps.LatLng(44.5557763, 7.7347183);
	let mapOptions = {
		"center": position,
		"zoom": 16,
		"mapTypeId": google.maps.MapTypeId.ROADMAP,

		"disableDefaultUI": true,

		"mapTypeControl": true,
		"mapTypeControlOptions": {
			"style": google.maps.MapTypeControlStyle.HORIZONTAL_BAR, // default
			"style": google.maps.MapTypeControlStyle.DROPDOWN_MENU,  // verticale
			"position": google.maps.ControlPosition.TOP_LEFT,
		},

		"streetViewControl": true,
		"streetViewControlOptions": {
			"position": google.maps.ControlPosition.RIGHT_CENTER
		},

		"zoomControl": true,
		"zoomControlOptions": {
			"position": google.maps.ControlPosition.RIGHT_CENTER
		},

		"fullscreenControl": false,
		"fullscreenOptions": {
		},
		"scaleControl": true,
		"scaleControlOptions": {
		}
	}
	let mappa = new google.maps.Map(mapContainer, mapOptions);
	let markerOptions = {
		"map": mappa,
		"icon": "img/workshop.png",
		"position": position,
		"title": "I.I.S. G. Vallauri",
		"draggable": true,
		"animation": google.maps.Animation.DROP
	}
	let marker = new google.maps.Marker(markerOptions);
	let infoWindowOptions = {
		"content":
			`
			<div id="infoWindow">
				<h2>I.I.S. G. Vallauri</h2>
				<img src="img/icoVallauri.png">
				<p>Indirizzo: Via San Michele 68, Fossano</p>
				<p>Coordinate GPS 1: ${position.toString()}</p>
				<p>Coordinate GPS 2: ${position.lat()} - ${position.lng()}</p>
			</div>
		`
	}

	let infoWindow = new google.maps.InfoWindow(infoWindowOptions);

	marker.addListener("click", function () {
		infoWindow.open(mappa, marker);
	});

	$("#select").on("change", function () {
		onselectchange(mappa);
	});
	caricaPerizie(mappa);
}

function caricaPerizie(mappa) {
	// manda richiesta al server che ti invia tutte le perizie
	let request = inviaRichiesta('GET', '/api/perizie');
	request.then((response) => {
		console.log(response.data);
		for (let perizia of response.data) {
			// carichiamo la select con i codperizia
			// controllare se la select ha più di un option, se si non aggiungere l'option
			/*let option;
				console.log($("#select option[value='" + perizia.codoperatore + "']").length);
				let option1;
				option1 = $("#cod:" + perizia.codoperatore);
				if(option1.lenght == undefined){
					let username = "";
					// fare richiesta ed inviare perizia.codoperatore non concatenato ma come stringa
					let rq = inviaRichiesta('GET', '/api/operatorebyusername', { "codoperatore": perizia.codoperatore });
					rq.then((response) => {
						username = response.data.username;
						option = $("<option>").text("username: " + username).val(perizia.codoperatore);
						// aggiungere id ad option
						option.attr("id", "cod:" + perizia.codoperatore);
						$("#select").append(option);
					});
					rq.catch(errore);
				}*/
			addMarker(perizia, mappa);
		}
	})
	request.catch(errore);
	caricaSelect();
}

function caricaSelect() {
	let request = inviaRichiesta('GET', '/api/operatore');
	request.then((response) => {
		console.log(response.data);
		for (let operatore of response.data) {
			if($("#select option[value='" + operatore.codoperatore + "']").length == 0)
			{
				let option = $("<option>").text("Operatore: " + operatore.username).val(operatore.codoperatore);
				$("#select").append(option);
			}
		}
	})
	request.catch(errore);
}

function editPerizia(codperizia) {
	// Recupera i dati della perizia dal server
	let request = inviaRichiesta('GET', '/api/periziebyid/' + codperizia);
	request.then((response) => {
		const perizia = response.data;
		const modal = document.createElement('div');
		modal.classList.add('modal');
		modal.id = 'modal';
		modal.innerHTML = `
		<div class="modal-content overflow-auto">
		<button type="button" class="close" onclick="closeModal()">
			<i class="fas fa-times"></i>
		</button>
		<h2 class="text-center mb-4">Modifica perizia ${perizia.codperizia}</h2>
		<form>
			<div class="form-group">
				<label for="codperizia">Codice perizia:</label>
				<input type="text" id="codperizia" name="codperizia" value="${perizia.codperizia}" class="form-control" disabled>
			</div>
			<div class="form-group">
				<label for="codoperatore">Codice operatore:</label>
				<input type="text" id="codoperatore" name="codoperatore" value="${perizia.codoperatore}" class="form-control" disabled>
			</div>
			<div class="form-group">
				<label for="oraperizia">Ora perizia:</label>
				<input type="text" id="oraperizia" name="oraperizia" value="${perizia.oraperizia}" class="form-control" disabled>
			</div>
			<div class="form-group">
				<label for="dataperizia">Data perizia:</label>
				<input type="date" id="dataperizia" name="dataperizia" value="${perizia.dataperizia}" class="form-control" disabled>
			</div>
			<div class="form-group">
				<label for="coordinate">Coordinate:</label>
				<input type="text" id="coordinate" name="coordinate" value="${perizia.coordinate}" class="form-control" disabled>
			</div>
			<div class="form-group">
				<label for="descrizione">Descrizione:</label>
				<textarea id="descrizione" name="descrizione" class="form-control">${perizia.descrizione}</textarea>
			</div>
			<h3 class="mt-4">Immagini</h3>
			<div class="images-container row">
            ${perizia.immagini.map(immagine => {
			return `
                <div class="col-md-4 mb-3">
                    <div class="image-item text-center">
                        <img src="img/${immagine.img}" alt="Immagine perizia" class="img-fluid rounded mb-2" style="height: 150px;">
                        <input type="text" name="immagine-commento-${immagine.img}" value="${immagine.commento}" class="form-control">
                    </div>
                </div>
                `;
		}).join('')}
        	</div>
			<button type="button" class="btn btn-primary mt-3" style="width:150px" onclick="savePerizia(${perizia.codperizia})">
				Salva
			</button>
		</form>
	</div>

	<style>
		.modal-content {
			background-color: #fff;
			border-radius: 10px;
			box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
			padding: 20px;
		}

		.close {
			position: absolute;
			top: 15px;
			right: 15px;
			background: none;
			border: none;
			font-size: 24px;
			color: #888;
			cursor: pointer;
		}

		.close:hover {
			color: #555;
		}

		.form-group label {
			font-weight: bold;
		}

		.images-container {
			display: flex;
			flex-wrap: wrap;
		}

		.image-item {
			width: 100%;
			text-align: center;
		}

		.image-item input[type="text"] {
			width: 100%;
			margin-top: 5px;
		}
	</style>
		`;

		// Aggiungi la modale al body e mostrala
		document.body.appendChild(modal);
		modal.style.display = 'block';
	})
	request.catch(errore);

}

// Funzione per salvare le modifiche apportate alla perizia
function savePerizia(codperizia) {
	let j = 0;
	const data = {};
	const formData = new FormData(document.querySelector('.modal form'));

	data.codperizia = codperizia;
	data.descrizione = formData.get('descrizione');
	let commenti = [];

	/*for (const coppia of formData.entries()) {
		const [key, value] = coppia;

		if (key.startsWith('immagine-commento-')) {
			// non fare push, ma aggiungere a data.commenti un oggetto "commento" = value
			commenti.push({
				"commento": value
			});
		}
	}*/

	// Get all comment input fields
	const commentInputs = document.querySelectorAll(`input[name^="immagine-commento-"]`);

	// Create an object to store comments
	const comments = {};
	for (const input of commentInputs) {
		const immagine = input.name.split('-')[2]; // Extract image name from input name
		const commento = input.value; // Get comment value
		commenti[j] = commento; // Store comment in object
		j++;
	}

	data.commenti = commenti;
	console.log(data);

	// Invia i dati al server per l'aggiornamento
	const request = inviaRichiesta('PUT', '/api/aggiornaperizie', data);
	request.then((response) => {
		console.log(response.data);
		if (response.data === 'ok') {
			$("#select").val("tutti");
			alert('Perizia aggiornata correttamente');
			CaricaMappa();
			closeModal();
		};
	});
	request.catch(errore);


}

function closeModal() {
	// chiudi modale
	const modal = document.getElementById('modal');
	modal.remove();
}

function addMarker(perizia, mappa) {
	let lat = parseFloat(perizia.coordinate.split(",")[0]);
	let lng = parseFloat(perizia.coordinate.split(",")[1]);
	let position = new google.maps.LatLng(lat, lng);
	let markerOptions = {
		"map": mappa,
		"icon": "img/workshop.png",
		"position": position,
		"title": "cod perizia: " + perizia.codperizia,
		"draggable": false,
		"animation": google.maps.Animation.DROP
	}
	let marker = new google.maps.Marker(markerOptions);
	markers[contmarkers] = marker;
	contmarkers++;

	// creare un infowindows option che contenga le informazioni della perizia, cioè codperizia,codoperatore,oraperizia,dataperizia,coordinate,descrizione e le immmagini che possono essere più di una e possono contenere un commento. inoltre consetire dal window options di modificare tutti i campi
	let infoWindowOptions = {
		"content":
			`
		<div class="info-window">
		<h2 class="info-title">Perizia ${perizia.codperizia}</h2>
		<ul class="info-list">
			<li><strong>Codice operatore:</strong> ${perizia.codoperatore}</li>
			<li><strong>Ora perizia:</strong> ${perizia.oraperizia}</li>
			<li><strong>Data perizia:</strong> ${perizia.dataperizia}</li>
			<li><strong>Coordinate:</strong> ${perizia.coordinate}</li>
			<li><strong>Descrizione:</strong> ${perizia.descrizione}</li>
		</ul>
		<div class="images-container">
			${perizia.immagini.map(immagine => {
				return `
				<div class="image-wrapper">
					<img src="img/${immagine.img}" alt="Immagine perizia" class="perizia-image">
					${immagine.commento ? `<p class="image-comment">Commento: ${immagine.commento}</p>` : ''}
				</div>
				`;
			}).join('')}
		</div>
		<div class="buttons-container">
			<button class="edit-button" onclick="editPerizia(${perizia.codperizia})">Modifica perizia</button>
			<button class="edit-button" onclick="visualizzaroute(${perizia.codperizia})">Visualizza percorso</button>
		</div>
	</div>

	<style>
		.info-window {
			background-color: #fff;
			padding: 20px;
			border-radius: 5px;
			box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
		}

		.info-title {
			font-size: 24px;
			margin-bottom: 10px;
		}

		.info-list {
			list-style: none;
			padding: 0;
		}

		.info-list li {
			margin-bottom: 5px;
		}

		.perizia-image {
			width: 100px;
			height: 100px;
			object-fit: cover;
			border-radius: 5px;
			margin-right: 10px;
		}

		.image-wrapper {
			margin-bottom: 10px;
		}

		.image-comment {
			margin-top: 5px;
			font-style: italic;
		}

		.buttons-container {
			margin-top: 15px;
		}

		.edit-button {
			background-color: #6c757d;
			color: #fff;
			border: none;
			padding: 10px 20px;
			border-radius: 5px;
			cursor: pointer;
			transition: background-color 0.3s;
		}

		.edit-button:hover {
			background-color: #222;
		}
	</style>

	 	`
	}

	let infoWindow = new google.maps.InfoWindow(infoWindowOptions);

	marker.addListener("click", function () {
		infoWindow.open(mappa, marker);
	});
}

function onselectchange(mappa) {
	let OperatoreSelezionato = $("#select").val();

	if (OperatoreSelezionato === 'tutti') {
		CaricaMappa();
	}
	else {
		// Filtra i dati delle perizie in base al codice perizia selezionato
		let request = inviaRichiesta('GET', '/api/operatorebyid/' + OperatoreSelezionato);
		request.then((response) => {
			console.log(response.data);
			removeAllMarkers();
			for (let i = 0; i < response.data.length; i++) {
				let perizia = response.data[i];
				addMarker(perizia, mappa);
			}
		});
		request.catch(errore);
	}

	function removeAllMarkers() {
		// Per ogni marker presente nell'array, rimuovilo dalla mappa
		for (let i = markers.length - 1; i >= 0; i--) {
			markers[i].setMap(null);
		}
		markers = [];
		contmarkers = 0;
	}
}

function visualizzaroute(codperizia) {
	$("#infopercorso").show();
	$("#select").val("tutti");
	$("#select").hide();
	$("#select-label").hide();
	console.log(codperizia);
	let request = inviaRichiesta('GET', '/api/periziebyid/' + codperizia);
	request.then((response) => {
		let lat = parseFloat(response.data.coordinate.split(",")[0]);
		let lng = parseFloat(response.data.coordinate.split(",")[1]);
		let partenza = new google.maps.LatLng(44.5557763, 7.7347183);
		let arrivo = new google.maps.LatLng(lat, lng);
		let routeOptions = {
			'origin': partenza,
			'destination': arrivo,
			'travelMode': google.maps.TravelMode.DRIVING,
			'provideRouteAlternatives': false,
			'avoidTolls': false
		}
		let directionsService = new google.maps.DirectionsService()
		let promise = directionsService.route(routeOptions)

		promise.then((result) => {
			if (result.status == google.maps.DirectionsStatus.OK) {
				console.log(result.routes[0])
				let mapOptions = {}
				let map = new google.maps.Map(mapContainer, mapOptions)
				let rendererOptions = {
					'polylineOptions': {
						'strokeColor': '#44F', //Colore percorso
						'strokeWeight': 6,		//Spessore percorso
						//'zIndex':100					//Livello di posizionamento
					}
				}
				let directionsRenderer = new google.maps.DirectionsRenderer(rendererOptions)
				directionsRenderer.setMap(map)
				//Tracciamento del percorso
				directionsRenderer.setDirections(result)
				//Calcolo distanza e tempo
				let distanza = result.routes[0].legs[0].distance.text
				let tempo = result.routes[0].legs[0].duration.text
				console.log("Distanza: " + distanza)
				console.log("Tempo: " + tempo)
				$("#distanza").text(distanza)
				$("#tempo").text(tempo)
				$("#mapContainer").css("float", "left");
				// crea un bottone che sull'onclick richiama caricamppa() e appendilo al div msg
				$("#chiudipercorso").on("click", function () {
					$("#infopercorso").hide();
					CaricaMappa()
				})
			}
		}).catch((err) => {
			console.log(err)
			alert("Errore: " + err.message)
		})
	});
	request.catch(errore);
}