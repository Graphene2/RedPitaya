/*
 * Red Pitaya Oscilloscope client
 *
 * Author: Luka Golinar <luka.golinar@gmail.com>
 * Author: Dakus <info@eskala.eu>
 *
 * (c) Red Pitaya  http://www.redpitaya.com
 *
*/

(function(LCR, $, undefined){

	//Configure APP
	LCR.config = {};
	LCR.config.app_id = 'lcr_meter';
	LCR.config.server_ip = '';
	LCR.config.start_app_url = (LCR.config.server_ip.length ? 'http://' + LCR.config.server_ip : '') + '/bazaar?start=' + LCR.config.app_id;
	LCR.config.socket_url = 'ws://' + (LCR.config.server_ip.length ? LCR.config.server_ip : window.location.hostname) + ':9002';  // WebSocket server URI

	// App state
	LCR.state = {
		socket_opened: false,
		processing: false,
		editing: false,
		trig_dragging: false,
		cursor_dragging: false,
		resized: false,
		sel_sig_name: null,
		fine: false,
		graph_grid_height: null,
		graph_grid_width: null,
		calib: 0
	};

	// Params cache
	LCR.params = {
		orig: {},
	    local: {}
	};

	// Other global variables
  	LCR.ws = null;
  	LCR.touch = {};

  	LCR.connect_time;

  	LCR.displ_params = {
  		prim: "LCR_Z",
  		sec:  "LCR_P"
  	};

  	LCR.tolerance = {
  		apply_tolerance: false,
  		ampl_tol: 0
  	};

  	//LCR.units = {'Ohm'}

  	LCR.startApp = function(){
  		$.get(LCR.config.start_app_url)
  		.done(function(dresult) {
  			if(dresult.status == 'OK'){
  				LCR.connectWebSocket();
  				console.log('Socket opened');
  			}
  			else if(dresult.status == 'ERROR'){
  				console.log(dresult.reason ? dresult.reason : 'Could not start the application (ERR1)');
  			}else{
  				console.log('Could not start application (ERR2)');
  			}
  		})
  		.fail(function() {
      		console.log('Could not start the application (ERR3)');
    	});
  	};

	LCR.connectWebSocket = function(){
		if(window.WebSocket){
			LCR.ws = new WebSocket(LCR.config.socket_url);
		}else if(window.MozWebSocket){
			LCR.ws = new MozWebSocket(LCR.config.socket_url);
		}else{
			console.log('Browser does not support WebSocket');
		}
	

		//Define WebSocket event listeners
		if(LCR.ws){
			LCR.ws.onopen = function() {
				LCR.state.socket_opened = true;
				console.log('Socket opened');

				LCR.params.local['in_command'] = { value: 'send_all_params' };
				LCR.ws.send(JSON.stringify({ parameters: LCR.params.local }));
				LCR.params.local = {};
			};

			LCR.ws.onclose = function() {
				LCR.state.socket_opened = false;
				console.log('Socket closed');
			};

			LCR.ws.onerror = function(ev) {
	        	console.log('Websocket error: ', ev);
	      	};

	      	LCR.ws.onmessage = function(ev){
	      		if(LCR.state.processing){ return; }

	      		LCR.state.processing = true;
	      		var receive = JSON.parse(ev.data);
	      		if(receive.parameters){
	      			if((Object.keys(LCR.params.orig).length == 0)
	      				&& (Object.keys(receive.parameters).length == 0)){

	      				LCR.params.local['in_command'] = {value: 'send_all_params'};
	      				LCR.ws.send(JSON.stringify({parameters: LCR.params.local}));
	      				LCR.params.local = {};
	      			}else{
	      				LCR.processParameters(receive.parameters);
	      			}
	      		}
	      		LCR.state.processing = false;
	      	};
		}
	};

	LCR.processParameters = function(new_params){
		var old_params = $.extend(true, {}, LCR.params.orig);

		var send_all_params = Object.keys(new_params).indexOf('send_all_params') != -1;
		for(var param_name in new_params){
			LCR.params.orig[param_name] = new_params[param_name];

			if(param_name == LCR.displ_params.prim  && LCR.tolerance.apply_tolerance == false){
				$('#lb_prim_displ').empty().append(Math.round(new_params[param_name].value * 100) / 100);

				//function check for suffix/units
			}

			if(param_name == LCR.displ_params.sec && LCR.tolerance.apply_tolerance == false){
				$('#lb_sec_displ').empty().append(Math.round(new_params[param_name].value * 100) / 100);

				//function check for suffix/units
			}

			if(param_name == 'LCR_Z' && LCR.tolerance.apply_tolerance == true 
				&& old_params['LCR_RUN'].value == false){

				var diff = (new_params[param_name].value - LCR.tolerance.ampl_tol) / 100;
				console.log(diff);

				if( Math.abs(diff) > 0.01){
					$('#lb_sec_displ').empty().append((Math.round(diff * 100) / 100) * 100 + "%");
					$('#lb_prim_displ').empty().append(Math.round(new_params[param_name].value * 100) / 100);
				}else if(diff > Math.abs(1)){
					$('#lb_sec_displ').empty().append("100% >");
					$('#lb_prim_displ').empty().append("100% >");
				}else{
					$('#lb_sec_displ').empty().append("100%");
					$('#lb_prim_displ').empty().append(Math.round(LCR.tolerance.ampl_tol * 100) / 100);
				}
			}

			if($('#LCR_LOG').val() == '1'){
	      		$('#m_table tbody').append('<tr><td>1</td><td>' + new_params['LCR_Z'].value + '</td><td>!</td></tr>');
	      	}
		}
	};

	// Sends to server modified parameters
	LCR.sendParams = function() {
		if($.isEmptyObject(LCR.params.local)) {
	  		return false;
		}

		if(! LCR.state.socket_opened) {
	  		console.log('ERROR: Cannot save changes, socket not opened');
	  		return false;
		}

		LCR.params.local['in_command'] = { value: 'send_all_params' };
		LCR.ws.send(JSON.stringify({ parameters: LCR.params.local }));
		LCR.params.local = {};

		return true;
	};


}(window.LCR = window.LCR || {}, jQuery));

$(function() {

	//Header options. Prevent aggressive firefox caching
	$("html :checkbox").attr("autocomplete", "off");

	console.log('Processing on site events');

	//LCR set run state
	$('#LCR_START').on('click', function(ev) {
		ev.preventDefault();
		$('#LCR_START').hide();
		$('#LCR_HOLD').css('display', 'block');
		
		//Get value
		var freq = parseInt($("#LCR_FREQUENCY").val());
		LCR.params.local['LCR_FREQ'] = { value: freq };
		LCR.params.local['LCR_RUN'] = { value: true };
		LCR.sendParams();
	});

	//Freeze LCR data
	$('#LCR_HOLD').on('click', function(ev) {
		ev.preventDefault();
		$('#LCR_HOLD').hide();
		$('#LCR_START').css('display', 'block');
		LCR.params.local['LCR_RUN'] = { value: false };
		LCR.sendParams();
	});

	/* --------------------- CALIBRATION --------------------- */
	$('#LCR_CALIBRATE').on('click', function(ev) {
		ev.preventDefault();
		$('#LCR_HOLD').hide();
		$('#LCR_START').css('display', 'block');
		LCR.params.local['LCR_RUN'] = { value: false };
		LCR.sendParams();
		$('#modal_calib_start').modal('show');
	});

	$('#bt_calib_start').on('click', function(ev) {
		ev.preventDefault();
		LCR.params.local['LCR_CALIB_MODE'] = { value: 1 };
		LCR.params.local['LCR_CALIBRATION'] = { value: true };
		$('#modal_calib_start').modal('hide');
		$('#modal_calib_open').modal('show');
		LCR.sendParams();
	});

	$('#bt_calib_open').on('click', function(ev) {
		ev.preventDefault();
		LCR.params.local['LCR_CALIB_MODE'] = { value: 2 };
		LCR.params.local['LCR_CALIBRATION'] = { value: true };
		$('#modal_calib_open').modal('hide');
		$('#modal_calib_short').modal('show');
		LCR.sendParams();
		setTimeout(function(){return;}, 100);
		LCR.params.local['LCR_CALIB_MODE'] = { value: 0};
		LCR.params.local['LCR_CALIBRATION'] = { value: true };
		LCR.sendParams();
	});

	/* ------------------------------------------------------- */

	//Log data
	$('#LCR_LOG').click(function(ev){
		ev.preventDefault();
		$('#LCR_LOG').hide();
		$('#LCR_LOG_STOP').css('display', 'block');
		$('#LCR_LOG').val('1');
	});

	$('#LCR_LOG_STOP').click(function(ev){
		ev.preventDefault();
		$('#LCR_LOG_STOP').hide();
		$('#LCR_LOG').css('display', 'block');
		$('#LCR_LOG').val('0');
	});
	
	$('#LCR_FREQUENCY').change(function(){
		LCR.params.local['LCR_FREQ'] = { value: parseInt(this.value) };
		LCR.sendParams();
	});

	$('#prim_displ_choice :checkbox').click(function(){
		LCR.displ_params.prim = this.id;
		//if()
	});

	$('#sec_displ_choice :checkbox').click(function(){
		LCR.displ_params.sec = this.id;
	});

	$('#cb_tol').click(function(){
		LCR.tolerance.apply_tolerance = true;
		LCR.tolerance.ampl_tol = LCR.params.orig['LCR_Z'].value;
		LCR.params.local['LCR_TOLERANCE'] = { value: true };
		$('#lb_prim_displ').empty().append("100%");
		$('#rec_led').css('display', 'block');
		LCR.sendParams();
	});

	$('#cb_rel').click(function(){
		LCR.tolerance.apply_tolerance = false;
		LCR.params.local['LCR_TOLERANCE'] = { value: false };
		LCR.sendParams();
	});

	$('#cb_ser').click(function(){
		LCR.params.local['LCR_SERIES'] = { value: true };
		LCR.sendParams();
	});

	$('#cb_paralel').click(function(){
		console.log('Paralel');
		LCR.params.local['LCR_SERIES'] = { value: false };
		LCR.sendParams();
	});

	LCR.startApp();
});