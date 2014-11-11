var MSG_EXECUTE_CODE = "EXE";		   // message to execute the sent code to the console
var MSG_EXECUTE_CODE_R = "EXR";	 	   // message to execute the sent code to R console
var MSG_DEFAULT_LANGUAGE = "LAN"; 	   // message to indicate the default language of the user
var MSG_DEFAULT_USER_ENVIRONMENT = "ENV"   // message to indicate the content of the environment variable that contains the iMathCloud user root path
var MSG_PORTCONSOLE = "PRT";

var portConsole;

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
		case MSG_DEFAULT_USER_ENVIRONMENT:
			CoreInteraction.prototype.setEnvironmentVariable(message);
			break;
		case MSG_PORTCONSOLE:
			portConsole = message;
			//console.log("MSG_PORTCONSOLE " + portConsole);
			break;		
		};
	};


	
	CoreInteraction.prototype.setDefaultLanguage = function (message) {
		// Pretty ugly, but for the alpha release is fine! 
		window.setTimeout(function(){$('#cell_type').val(message); $('#cell_type').change();} ,350);
		//console.log("SET DEFAULT LANGUAGE " + message);
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

	CoreInteraction.prototype.setEnvironmentVariable = function (message) {
		var userName = message.split(";")[1]
		IPython.notebook.userName = userName
		var id = setInterval(function () {
			var url = message.split(";")[0]
			k = IPython.notebook.get_Kernel();
			sh_ch = k.get_shellChannel();
			if(k != null && sh_ch != null && sh_ch.readyState == 1) {							
				var var_env = "import os; os.environ[\"USER_ROOT\"] = \"" + url + "\";";
				//var path_env = "import sys;";
				var path_env = "import sys; sys.path.append(\"/home/andrea/git/hpc2\");";
				var import_imath = "from HPC2.imath.iMath import iMath; from JSAnimation import IPython_display";			
				var sentence = var_env.concat(path_env, import_imath);
				//console.log(sentence);
				
				IPython.notebook.insert_cell_above('code');
				var cell = IPython.notebook.get_selected_cell();				
				cell.set_text(sentence);				
				IPython.notebook.execute_selected_cell({isFile:true});		

		
				
				index = IPython.notebook.find_cell_index(cell);			
				//console.log(index)
				//console.log("celda 1 " + cell.get_text())
				IPython.notebook.delete_cell(index);

				//var cell_next = IPython.notebook.get_selected_cell();
				//index_next = IPython.notebook.find_cell_index(cell_next);            		
				//console.log("celda 2 " + cell_next.get_text())
				//IPython.notebook.delete_cell(index_next);
				
				clearInterval(id);
     			}			

		}, 100);
	
	}



	IPython.CoreInteraction = CoreInteraction;
	return IPython;

}(IPython));
