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

	$("#btnnascondi").hide();
	$("#map").hide();

	$("#btnvisualizza").on("click", function () {
		$("#btnnascondi").show();
		$("#btnvisualizza").hide();
		$("#map").show();
		CaricaMappa()
	});

	$("#btnnascondi").on("click", function () {
		$("#btnnascondi").hide();
		$("#btnvisualizza").show();
		$("#map").hide();
	});
	
});

function CaricaMappa() {
	let mapContainer = $("#mapContainer").get(0);
	$("#select").show();
	// Posizione Vallauri    
	let position = new google.maps.LatLng(44.5557763, 7.7347183);	
	let mapOptions = {
		"center":position,
		"zoom":16,
		"mapTypeId":google.maps.MapTypeId.ROADMAP, 
			
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

	marker.addListener("click", function() {
		infoWindow.open(mappa, marker);
	});

	$("#select").on("change", function(){
		onselectchange(mappa);
	});
	caricaPerizie(mappa);
}

function caricaPerizie(mappa)
{
	// manda richiesta al server che ti invia tutte le perizie
	let request = inviaRichiesta('GET', '/api/perizie');
	request.then((response) => {
		console.log(response.data);
		for (let perizia of response.data)
		{
			// carichiamo la select con i codperizia
			// controllare se la select ha più di un option, se si non aggiungere l'option
			let option;
			if($("#select option").length <= response.data.length)
			{
				option = $("<option>").text("codice perizia: " + perizia.codperizia).val(perizia.codperizia);
				$("#select").append(option);
			}
			addMarker(perizia,mappa);
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
		  <div class="modal-content">
		  	<button class="close-button" onclick="closeModal()">X</button>
			<h2>Modifica perizia ${perizia.codperizia}</h2>
			<form>
			  <ul>
				<li>
				  <label for="codperizia">Codice perizia:</label>
				  <input type="text" id="codperizia" name="codperizia" value="${perizia.codperizia}" disabled>
				</li>
				<li>
				  <label for="codoperatore">Codice operatore:</label>
				  <input type="text" id="codoperatore" name="codoperatore" value="${perizia.codoperatore}" disabled>
				</li>
				<li>
				  <label for="oraperizia">Ora perizia:</label>
				  <input type="text" id="oraperizia" name="oraperizia" value="${perizia.oraperizia}" disabled>
				</li>
				<li>
				  <label for="dataperizia">Data perizia:</label>
				  <input type="date" id="dataperizia" name="dataperizia" value="${perizia.dataperizia}" disabled>
				</li>
				<li>
				  <label for="coordinate">Coordinate:</label>
				  <input type="text" id="coordinate" name="coordinate" value="${perizia.coordinate}" disabled>
				</li>
				<li>
				  <label for="descrizione">Descrizione:</label>
				  <textarea id="descrizione" name="descrizione">${perizia.descrizione}</textarea>
				</li>
			  </ul>
			  <h3>Immagini</h3>
			  <ul class="images-container">
				${perizia.immagini.map(immagine => {
				  return `
					<li>
					  <img src="img/${immagine.img}" alt="Immagine perizia" style="width: 65px; height:65">
					  <input type="text" name="immagine-commento-${immagine.img}" value="${immagine.commento}">
					</li>
				  `;
				}).join('')}
			  </ul>
			</form>
			<button style="width:150px" onclick="savePerizia(${perizia.codperizia})">Salva</button>
		  </div>
		`;
	  
		// Aggiungi la modale al body e mostrala
		document.body.appendChild(modal);
		modal.style.display = 'block';
	})
	request.catch(errore);

}

// Funzione per salvare le modifiche apportate alla perizia
function savePerizia(codperizia) {
	const data = {};
	const formData =  new FormData(document.querySelector('.modal form'));

	data.codperizia = codperizia;
	data.descrizione = formData.get('descrizione');
	data.commenti = [];
	let commenti = [];

	for (const coppia of formData.entries()) {
		const [key, value] = coppia;

		if (key.startsWith('immagine-commento-')) {
			// non fare push, ma aggiungere a data.commenti un oggetto "commento" = value
			commenti.push({
				"commento": value
			});
		}
	}

	data.commenti = commenti;
	console.log(data);

	// Invia i dati al server per l'aggiornamento
	const request = inviaRichiesta('PUT', '/api/aggiornaperizie', data);
	request.then((response) => {
	  console.log(response.data);
	  if(response.data === 'ok') {
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

  function addMarker(perizia,mappa){
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
			<h2>Perizia ${perizia.codperizia}</h2>
				<ul>
						<li>Codice operatore: ${perizia.codoperatore}</li>
						<li>Ora perizia: ${perizia.oraperizia}</li>
						<li>Data perizia: ${perizia.dataperizia}</li>
						<li>Coordinate: ${perizia.coordinate}</li>
						<li>Descrizione: ${perizia.descrizione}</li>
				</ul>
				<div class="images-container">
					${perizia.immagini.map(immagine => {
						return `
						<div class="image-wrapper">
							<img src="img/${immagine.img}" alt="Immagine perizia" style="width: 50 px; height:50px">
							${immagine.commento ? `<p class="image-comment">Commento: ${immagine.commento}</p>` : ''}
						</div>
						  `;
					}).join('')}
				</div>
			<button class="edit-button" onclick="editPerizia(${perizia.codperizia})">Modifica perizia</button>
			<button class="edit-button" onclick="visualizzaroute(${perizia.codperizia})">Visualizza percorso</button>
		</div>
	 	`
	}

	let infoWindow = new google.maps.InfoWindow(infoWindowOptions);
			
	marker.addListener("click", function() {
		infoWindow.open(mappa, marker);
	});
  }

  function onselectchange(mappa){
	let codicePeriziaSelezionato = $("#select").val();

	if (codicePeriziaSelezionato === 'tutti') {
	  CaricaMappa();
	}
	else
	{
		// Filtra i dati delle perizie in base al codice perizia selezionato
		let request = inviaRichiesta('GET', '/api/periziebyid/' + codicePeriziaSelezionato);
		request.then((response) => {
			console.log(response.data);
			let perizia = response.data;
			removeAllMarkers();
			addMarker(perizia,mappa);
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

function visualizzaroute(codperizia){
	$("#select").val("tutti");
	$("#select").hide();
	console.log(codperizia);
	let request = inviaRichiesta('GET', '/api/periziebyid/' + codperizia);
	request.then((response) => {
		let lat = parseFloat(response.data.coordinate.split(",")[0]);
		let lng = parseFloat(response.data.coordinate.split(",")[1]);
		let partenza = new google.maps.LatLng(44.5557763, 7.7347183);
		let arrivo = new google.maps.LatLng(lat, lng);
		let routeOptions = {
			'origin':partenza,
			'destination':arrivo,
			'travelMode':google.maps.TravelMode.DRIVING,
			'provideRouteAlternatives':false,
			'avoidTolls':false
		}
		let directionsService = new google.maps.DirectionsService()
		let promise = directionsService.route(routeOptions)

		promise.then((result) => {
			if(result.status == google.maps.DirectionsStatus.OK){
				console.log(result.routes[0])
				let mapOptions = {}
				let map = new google.maps.Map(mapContainer,mapOptions)
				let rendererOptions = {
					'polylineOptions': {
						'strokeColor':'#44F', //Colore percorso
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
				console.log("Distanza: "+distanza)
				console.log("Tempo: "+tempo)
				$("#msg").html("Distanza: "+distanza+"<br> Tempo di percorrenza: "+tempo)
				// crea un bottone che sull'onclick richiama caricamppa() e appendilo al div msg
				let btn = $("<button>").text("Chiudi percorso").on("click",function(){
					CaricaMappa()
				})
				$("#msg").append(btn)
			}
		}).catch((err) => {
			console.log(err)
			alert("Errore: "+err.message)
		})
	});
	request.catch(errore);
}