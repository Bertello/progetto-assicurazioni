"use strict"

$(document).ready(function () {
	let _username = $("#usr")
	let _password = $("#pwd")
	let _lblErrore = $("#lblErrore")

	_lblErrore.hide();

	$("#btnLogin").on("click", controllaLogin)

	// il submit deve partire anche senza click 
	// con il solo tasto INVIO
	$(document).on('keydown', function (event) {
		if (event.keyCode == 13)
			controllaLogin();
	});

	// Funzione per mostrare/nascondere la password
	$('#togglePassword').click(function() {
		const pwd = $('#pwd');
		const type = pwd.attr('type') === 'password' ? 'text' : 'password';
		pwd.attr('type', type);
		$(this).find('i').toggleClass('fa-eye fa-eye-slash');
	});

	function controllaLogin() {
		_username.removeClass("is-invalid");
		_username.prev().removeClass("icona-rossa");
		_password.removeClass("is-invalid");
		_password.prev().removeClass("icona-rossa");

		_lblErrore.hide();

		if (_username.val() == "") {
			_username.addClass("is-invalid");
			_username.prev().addClass("icona-rossa");
		}
		else if (_password.val() == "") {
			_password.addClass("is-invalid");
			_password.prev().addClass("icona-rossa");
		}
		else {
			let request = inviaRichiesta('POST', '/api/login',
				{
					"username": _username.val(),
					"password": _password.val()
				}
			);
			request.catch(function (err) {
				if (err.response.status == 401) {
					// mettere a togglepassowrd in css un top: 30%;
					$("#togglePassword").css("top", "32%");
					_lblErrore.show();
					console.log(err.response.data);
				}
				else {
					errore(err);
				}
			});
			request.then((response) => {
				if(response.data == true)
					window.location.href = "index.html";
				else
					window.location.href = "errore.html";
			})
		}
	}


	_lblErrore.children("button").on("click", function () {
		_lblErrore.hide();
		$("#togglePassword").css("top", "43.5%");
	})

});