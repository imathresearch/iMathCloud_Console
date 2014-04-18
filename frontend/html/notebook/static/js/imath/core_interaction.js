var MSG_EXECUTE_CODE = "EXE";		// message to execute the sent code to the console
var MSG_EXECUTE_CODE_R = "EXR";		// message to execute the sent code to R console
var MSG_DEFAULT_LANGUAGE = "LAN";	// message to indicate the default language of the user

var IPython = (function (IPython) {

	var CoreInteraction = function() {
		if ( window.attachEvent ) {
			// IE
			window.attachEvent("onmessage", function(e){IPython.coreInteraction.handleMessage(e);});
		}
		if ( window.addEventListener ){
			// FF
			window.addEventListener("message", function(e){IPython.coreInteraction.handleMessage(e);}, false);
		}
	};
		//window.addEventListener('storage', function () { alert("here");}, false );

	CoreInteraction.prototype.handleMessage = function (e) {
		var msgType = e.data.substring(0,3);
		var message = e.data.substring(3);
		switch (msgType) {
		case MSG_EXECUTE_CODE:
			CoreInteraction.prototype.executeCellFromCore(message);
			break;
		case MSG_EXECUTE_CODE_R:
			CoreInteraction.prototype.executeCellRFromCore(message);
			break;
		case MSG_DEFAULT_LANGUAGE:
			CoreInteraction.prototype.setDefaultLanguage(message);
			break;
		};
	};
	
	CoreInteraction.prototype.setDefaultLanguage = function (message) {
		// Pretty ugly, but for the alpha release is fine! 
		window.setTimeout(function(){$('#cell_type').val(message); $('#cell_type').change();} ,350);
		//$('#cell_type').val(message);
		//$('#cell_type').change();
		//IPython.notebook.currentCode = message;		// Currently: 'code' for Python, 'codeR' for R
	};
	
	CoreInteraction.prototype.executeCellFromCore = function (message) {

		IPython.notebook.insert_cell_below('code');
		var cell = IPython.notebook.get_selected_cell();
		cell.set_text(message);
		IPython.notebook.execute_selected_cell({isFile:true});
	};
	
	CoreInteraction.prototype.executeCellRFromCore = function (message) {

		IPython.notebook.insert_cell_below('codeR');
		var cell = IPython.notebook.get_selected_cell();
		cell.set_text(message);
		IPython.notebook.execute_selected_cell({isFile:true});
		IPython.notebook.insert_cell_below(IPython.notebook.currentCode);
        IPython.notebook.scroll_to_bottom();
	};

	IPython.CoreInteraction = CoreInteraction;
	return IPython;

}(IPython));

