//----------------------------------------------------------------------------
//  Copyright (C) 2008-2011  The IPython Development Team
//
//  Distributed under the terms of the BSD License.  The full license is in
//  the file COPYING, distributed as part of this software.
//----------------------------------------------------------------------------

//============================================================================
// CodeCell
//============================================================================

var IPython = (function (IPython) {
    "use strict";

    var utils = IPython.utils;
    var key   = IPython.utils.keycodes;
    var regexpG = /\bplot\W|\bdensityplot\W|\bqplot\W|\bboxplot\W|\bbarplot\W|\bhist\W|\bmatplot\W|\bcontour\W|\bimage\W|\bstars\W|\bpairs\W|\bscatterplot3d\W|\bscatterplot\W/g;
	var regexp =  /\bplot\W|\bdensityplot\W|\bqplot\W|\bboxplot\W|\bbarplot\W|\bhist\W|\bmatplot\W|\bcontour\W|\bimage\W|\bstars\W|\bpairs\W|\bscatterplot3d\W|\bscatterplot\W/;
	var regexpParLayout = /\bpar\W|\blayout\W/;
	var regexpParLayoutG = /\bpar\W|\blayout\W/g;
	
    var CodeCellR = function (kernel) {
        // The kernel doesn't have to be set at creation time, in that case
        // it will be null and set_kernel has to be called later.
        this.kernel = kernel || null;
        this.code_mirror = null;
        this.input_prompt_number = null;
        this.tooltip_on_tab = true;
        this.collapsed = false;
        this.cell_type = 'codeR';
        IPython.Cell.apply(this, arguments);
    };


    CodeCellR.prototype = new IPython.Cell();


    CodeCellR.prototype.create_element = function () {
        var cell =  $('<div></div>').addClass('cell border-box-sizing code_cell vbox');
        cell.attr('tabindex','2');
        var input = $('<div></div>').addClass('input hbox');
        input.append($('<div/>').addClass('prompt input_prompt'));
        var input_area = $('<div/>').addClass('input_area box-flex1');
        this.code_mirror = CodeMirror(input_area.get(0), {
            indentUnit : 4,
            mode: 'r',
            theme: 'ipython',
            readOnly: this.read_only,
            onKeyEvent: $.proxy(this.handle_codemirror_keyevent,this)
        });
        input.append(input_area);
        var output = $('<div></div>');
        cell.append(input).append(output);
        this.element = cell;
        this.output_area = new IPython.OutputArea(output, true);

        // construct a completer only if class exist
        // otherwise no print view
        if (IPython.Completer !== undefined)
        {
            this.completer = new IPython.Completer(this);
        }
    };

    CodeCellR.prototype.handle_codemirror_keyevent = function (editor, event) {
        // This method gets called in CodeMirror's onKeyDown/onKeyPress
        // handlers and is used to provide custom key handling. Its return
        // value is used to determine if CodeMirror should ignore the event:
        // true = ignore, false = don't ignore.

        if (this.read_only){
            return false;
        }

        var that = this;
        // whatever key is pressed, first, cancel the tooltip request before
        // they are sent, and remove tooltip if any, except for tab again
        if (event.type === 'keydown' && event.which != key.TAB ) {
            IPython.tooltip.remove_and_cancel_tooltip();
        };

        var cur = editor.getCursor();

        if (event.keyCode === key.ENTER && (event.shiftKey || event.ctrlKey)) {
            // Always ignore shift-enter in CodeMirror as we handle it.
            return true;
        } else if (event.which === 40 && event.type === 'keypress' && IPython.tooltip.time_before_tooltip >= 0) {
            // triger on keypress (!) otherwise inconsistent event.which depending on plateform
            // browser and keyboard layout !
            // Pressing '(' , request tooltip, don't forget to reappend it
            IPython.tooltip.pending(that);
        } else if (event.which === key.UPARROW && event.type === 'keydown') {
            // If we are not at the top, let CM handle the up arrow and
            // prevent the global keydown handler from handling it.
            if (!that.at_top()) {
                event.stop();
                return false;
            } else {
                return true;
            };
        } else if (event.which === key.ESC) {
            IPython.tooltip.remove_and_cancel_tooltip(true);
            return true;
        } else if (event.which === key.DOWNARROW && event.type === 'keydown') {
            // If we are not at the bottom, let CM handle the down arrow and
            // prevent the global keydown handler from handling it.
            if (!that.at_bottom()) {
                event.stop();
                return false;
            } else {
                return true;
            };
        } else if (event.keyCode === key.TAB && event.type == 'keydown') {
            // Tab completion.
            //Do not trim here because of tooltip
            var pre_cursor = editor.getRange({line:cur.line,ch:0},cur);
            if (pre_cursor.trim() === "") {
                // Don't autocomplete if the part of the line before the cursor
                // is empty.  In this case, let CodeMirror handle indentation.
                return false;
            } else if ((pre_cursor.substr(-1) === "("|| pre_cursor.substr(-1) === " ") && that.tooltip_on_tab ) {
                IPython.tooltip.request(that);
                // Prevent the event from bubbling up.
                event.stop();
                // Prevent CodeMirror from handling the tab.
                return true;
            } else {
                event.stop();
                this.completer.startCompletion();
                return true;
            };
        } else if (event.keyCode === key.BACKSPACE && event.type == 'keydown') {
            // If backspace and the line ends with 4 spaces, remove them.
            var line = editor.getLine(cur.line);
            var ending = line.slice(-4);
            if (ending === '    ') {
                editor.replaceRange('',
                    {line: cur.line, ch: cur.ch-4},
                    {line: cur.line, ch: cur.ch}
                );
                event.stop();
                return true;
            } else {
                return false;
            };
        } else {
            // keypress/keyup also trigger on TAB press, and we don't want to
            // use those to disable tab completion.
            return false;
        };
        return false;
    };


    // Kernel related calls.

    CodeCellR.prototype.set_kernel = function (kernel) {
        this.kernel = kernel;
    }


    CodeCellR.prototype.execute = function (options) {
    	default_options = {isFile: false};
        $.extend(default_options, options);
    	
        this.output_area.clear_output(true, true, true);
        this.set_input_prompt('*');
        this.element.addClass("running");
        
        //alert(this.get_text());
        //alert(this.R2Python(this.get_text()));
        var R_code = "";
        if (!IPython.notebook.executedR) {
        	R_code = "import rpy2.robjects as robjects; ";
        	IPython.notebook.executedR = true;
        }
        var obj = this.R2Python(this.get_text(),default_options.isFile);
        var callbacks = {
                'execute_reply': $.proxy(this._handle_execute_reply, this),
                'output': $.proxy(this.output_area.handle_output, this.output_area),
                'clear_output': $.proxy(this.output_area.handle_clear_output, this.output_area),
                'set_next_input': $.proxy(this._handle_set_next_input, this)
            };
        this.output_area.plotsName = obj.plots.slice(0);		//Clone de array
        R_code = R_code + obj.str;
        var msg_id = this.kernel.execute(R_code, callbacks, {silent: false});
    };


    CodeCellR.prototype._handle_execute_reply = function (content) {
        this.set_input_prompt(content.execution_count);
        this.element.removeClass("running");
        $([IPython.events]).trigger('set_dirty.Notebook', {'value': true});
    }

    CodeCellR.prototype._handle_set_next_input = function (text) {
        var data = {'cell': this, 'text': text}
        $([IPython.events]).trigger('set_next_input.Notebook', data);
    }

    // Basic cell manipulation.

    CodeCellR.prototype.select = function () {
        IPython.Cell.prototype.select.apply(this);
        this.code_mirror.refresh();
        this.code_mirror.focus();
        // We used to need an additional refresh() after the focus, but
        // it appears that this has been fixed in CM. This bug would show
        // up on FF when a newly loaded markdown cell was edited.
    };


    CodeCellR.prototype.select_all = function () {
        var start = {line: 0, ch: 0};
        var nlines = this.code_mirror.lineCount();
        var last_line = this.code_mirror.getLine(nlines-1);
        var end = {line: nlines-1, ch: last_line.length};
        this.code_mirror.setSelection(start, end);
    };


    CodeCellR.prototype.collapse = function () {
        this.collapsed = true;
        this.output_area.collapse();
    };


    CodeCellR.prototype.expand = function () {
        this.collapsed = false;
        this.output_area.expand();
    };


    CodeCellR.prototype.toggle_output = function () {
        this.collapsed = Boolean(1 - this.collapsed);
        this.output_area.toggle_output();
    };


    CodeCellR.prototype.toggle_output_scroll = function () {
    this.output_area.toggle_scroll();
    };


    CodeCellR.prototype.set_input_prompt = function (number) {
        this.input_prompt_number = number;
        var ns = number || "&nbsp;";
        this.element.find('div.input_prompt').html('R:[' + ns + ']');
    };


    CodeCellR.prototype.clear_input = function () {
        this.code_mirror.setValue('');
    };


    CodeCellR.prototype.get_text = function () {
        return this.code_mirror.getValue();
    };


    CodeCellR.prototype.set_text = function (code) {
        return this.code_mirror.setValue(code);
    };


    CodeCellR.prototype.at_top = function () {
        var cursor = this.code_mirror.getCursor();
        if (cursor.line === 0) {
            return true;
        } else {
            return false;
        }
    };


    CodeCellR.prototype.at_bottom = function () {
        var cursor = this.code_mirror.getCursor();
        if (cursor.line === (this.code_mirror.lineCount()-1)) {
            return true;
        } else {
            return false;
        }
    };


    CodeCellR.prototype.clear_output = function (stdout, stderr, other) {
        this.output_area.clear_output(stdout, stderr, other);
    };


    // JSON serialization

    CodeCellR.prototype.fromJSON = function (data) {
        IPython.Cell.prototype.fromJSON.apply(this, arguments);
        if (data.cell_type === 'codeR') {
            if (data.input !== undefined) {
                this.set_text(data.input);
                // make this value the starting point, so that we can only undo
                // to this state, instead of a blank cell
                this.code_mirror.clearHistory();
            }
            if (data.prompt_number !== undefined) {
                this.set_input_prompt(data.prompt_number);
            } else {
                this.set_input_prompt();
            };
            this.output_area.fromJSON(data.outputs);
            if (data.collapsed !== undefined) {
                if (data.collapsed) {
                    this.collapse();
                } else {
                    this.expand();
                };
            };
        };
    };


    CodeCellR.prototype.toJSON = function () {
        var data = IPython.Cell.prototype.toJSON.apply(this);
        data.input = this.get_text();
        data.cell_type = 'codeR';
        if (this.input_prompt_number) {
            data.prompt_number = this.input_prompt_number;
        };
        var outputs = this.output_area.toJSON();
        data.outputs = outputs;
        data.language = 'r';
        data.collapsed = this.collapsed;
        return data;
    };

    CodeCellR.prototype.R2Python = function (rString, isFile) {
    	
    	var codeR = rString.split("\n");
    	var lengthData = codeR.length;
    	var linea = "";
    	var instructionsTranslated = "";
    	var imagePosition = -1;
    	
    	for (var i=0;i<lengthData;i++) {
    		var auxLinea = codeR[i];
    		auxLinea = auxLinea.replace(/"/g,"'");
    		auxLinea= $.trim(auxLinea);
    		auxLinea = auxLinea.replace(/(\r\n|\n|\r)/gm,"");
    		//auxLinea = CodeCellR.prototype.eliminateComments(auxLinea);
    		instructionsTranslated = instructionsTranslated + auxLinea + '\\n';
    	};
    	var semiColon = "__SEMICOLON__";  // The string that ';' in string will be substituted with
    	instructionsTranslated = CodeCellR.prototype.eliminateNoSemicolons(instructionsTranslated, semiColon);	// Eliminate ';' that are part of string or comments
    	if (!isFile) {
    		instructionsTranslated = CodeCellR.prototype.placePrint(instructionsTranslated);
    	}
    	var obj = CodeCellR.prototype.placeSVG(instructionsTranslated);
    	instructionsTranslated = obj.str;
    	
    	var rx = new RegExp(semiColon, "g");
    	instructionsTranslated = instructionsTranslated.replace(rx, ";");
    	var aux = {str:'robjects.r("' + instructionsTranslated + '")', plots:obj.plots };
    	return aux;
    }
    
    CodeCellR.prototype.placePrint = function (rString) {
    	
    	
    	var output = "";
    	var indent = 0;		// To control the indentation of code blocks: {} ()
    	var trans = "";
    	var inBlock = false;
    	var idChar = 0;		// To control the active () = 1 {} = 2, or none = 0
    	var ins = rString.split(";"); 			// We split by instructions with ';'
    	for(var i=0; i<ins.length; i++) {
    		var curIns = ins[i];
    		var parts = curIns.split("\\n");	// We split by \\n  		
    		for(var j=0; j<parts.length; j++) {
    			var curLine = parts[j];
    			if (curLine.trim().length > 0){
    				trans = trans + CodeCellR.prototype.eliminateCommentsInn(curLine.trim(),idChar);
    				var obj = CodeCellR.prototype.getIndent(curLine, indent, idChar);
    				indent = obj.indent;
    				idChar = obj.idChar;
    				if ((indent === 0) && (!CodeCellR.prototype.endWithOperator(trans)) && (!CodeCellR.prototype.resWord(trans))) {		// The case in which we finish an instruction
    					if (!inBlock) {
    						//trans = CodeCellR.prototype.eliminateCommentsInn(trans);
    						var aa = trans.match(/\bprint\W*\x28/);	// To check that there is no print sentence
    						var aa2 = trans.match(regexp);	// To check that there is no plot sentence
    						var aa3 = trans.match(/\bdev.off/);		// To check that there is no dev.off sentence
    						var bb = trans.split("==");				// To check that assigment with = is not present
    						var bb2 = trans.split("=");				// The same as above
    						var cc = trans.split("<-");				// To check assingments with <-
    						if ((aa == null) && (aa2 == null) && (aa3 == null) && ((bb2.length == 1) || (bb2.length > 1 && bb.length > 1)) && (cc.length == 1)){
    							if (trans.trim().length>0) {
    								output = output + "print(" + trans + "); ";
    							};
    						} else {
    							output = output + trans + "; ";
    						}
    						
    						inBlock = false;
    					}
    					else {
    						if(j<parts.length-1) { 
    							output = output + trans + "\\n";
    						} else {
    							output = output + trans;
    						}
    						inBlock = true;
    					}
    					trans = "";
    				} else {							// The case an instruction keeps going
    					if(j<parts.length-1) {
    						trans = trans + "\\n";
    					};
    				};
    				
    			};
    		};
    		if ((i<ins.length-1) && (trans.trim().length > 0)){
				trans = trans + "; ";
			};
    	};
    	return output;
    }
    
    CodeCellR.prototype.eliminateNoSemicolons = function(rString, semiColon) {
    	// Replace ';' for the String semicolon when ';' is in String characters and eliminates comments
    	var activeChar = "";
    	var output = "";
    	var isComment = false;
    	var currChar;
    	var i = 0;
    	while (i<rString.length) {
    		var toAdd;
    		currChar = rString.charAt(i);
    		if (i<rString.length-2) {
    			var aux = rString.charAt(i) + rString.charAt(i+1);
    			if (aux == "\\n") {
    				currChar = "\\n";
    				i++;
    			}; 
    		};
    		i++;
    		if (currChar == activeChar && activeChar != "" && !isComment) {
    			// We found a closing string outside a comment
    			activeChar = ""; 
    			toAdd = currChar;
    		} else if((currChar == "'" || currChar == '"') && !isComment) {
    			// We found an oppening string outside a comment
    			activeChar = currChar;
    			toAdd = currChar;
    		} else if(currChar == ';' && activeChar != "" && !isComment) {
    			// We found a ";" in a String outside a comment, so we replace it by 'semicolon'
    			toAdd = semiColon;
    		} else if(!isComment && currChar == '#' && activeChar == "") {
    			// we found a # outside a String, so, from now on until we find a \n we are in a comment
    			toAdd = "";
    			isComment = true;
    		} else if(isComment && currChar != '\\n') {
    			// we find a ';' in a comment, so, we eliminate it
    			toAdd = "";
    		} else if(isComment && currChar == '\\n') {
    			// we find '\n' inside a comment, so, we are at the end of the comment
    			toAdd = '\\n';
    			isComment = false;
    		} else {
    			// In any other case, we add the current character
    			toAdd = currChar;
    		};
    		output = output + toAdd;
    	};
    	return output;
    	
    } 
    
    CodeCellR.prototype.eliminateCommentsInn = function(rString, idChar) {
    	// Eliminates comments that are not between string literals
    	var ret = rString;
    	var done = false;
    	var i = 0;
    	var chActive = "";
    	if(idChar == 3) {
    		chActive = '"';
    	} else if(idChar == 4) {
    		chActive ="'";
    	};
    	
    	while(!done && i < rString.length) {
    		var ch = rString[i];
    		if(ch == "#" && chActive == "") {
    			done = true;		// From here on, the string is a comment
    		};
    		
    		if(ch == chActive) {
    			chActive = "";
    		} else if (chActive=="" && ch =="'") {
    			chActive = "'";
    		} else if (chActive=="" && ch =='"') {
    			chActive = '"';
    		};
    		
    		i++;
    	};
    	if (done) {
    		var aux = ret.substring(0,i-1);
    		var ind = ret.indexOf("\\n",i-1);
    		if (ind > -1) {
    			ret = aux + ret.substring(ind);
    		} else {
    			ret = aux;
    		};
    	};
    	return ret;
    }
    
    CodeCellR.prototype.endWithOperator = function(rString) {
    	//Returns true if the last character of rString is one valid R operator
    	var ret = false;
    	var str = rString.trim();
    	var rOperators = ["+","-","*","/","^", "%", "<", ">", "=", "&", "|", "!"];
    	
    	var last = str[str.length-1];
    	ret = (rOperators.indexOf(last)>-1);
    	return ret;
    }
    
    CodeCellR.prototype.resWord = function(rString) {
    	//PRE: a line that has 0 indent. We must check whether it finishes with a reserved word (if, while, else, for)
    	var ret = false;
    	
    	var str = rString.trim();
    	
    	var patternIF = /\bif\s*\x28.*\x29/g;
    	var patternWHILE = /\bwhile\s*\x28.*\x29/g;
    	var patternFOR = /\bfor\s*\x28.*\x29/g;
    	var patternELSE = /\belse/g;
    	
    	var patternOIF = /\bif/g;
    	var patternOWHILE = /\bwhile/g;
    	var patternOFOR = /\bfor/g;
    	
    	var pIF = str.match(patternIF);
    	var pOIF = str.match(patternOIF);
    	var pWHILE = str.match(patternWHILE);
    	var pOWHILE = str.match(patternOWHILE);
    	var pFOR = str.match(patternFOR);
    	var pOFOR = str.match(patternOFOR);
    	var pELSE = str.match(patternELSE);
    	
    	ret = ret || CodeCellR.prototype.isLastString(pIF,str);
    	ret = ret || CodeCellR.prototype.isLastString(pOIF,str);
    	ret = ret || CodeCellR.prototype.isLastString(pWHILE,str);
    	ret = ret || CodeCellR.prototype.isLastString(pWHILE,str);
    	ret = ret || CodeCellR.prototype.isLastString(pFOR,str);
    	ret = ret || CodeCellR.prototype.isLastString(pOFOR,str);
    	ret = ret || CodeCellR.prototype.isLastString(pELSE,str);
    	
    	return ret;
    }
    
    CodeCellR.prototype.isLastString = function(lMatch, str) {
    	var ret = false;
    	
    	if (lMatch != null) {
    		var aux = lMatch[lMatch.length-1];
    		var sub = str.substring(str.length - aux.length);
    		ret = (aux === sub);
    	}  
    	return ret;
    }
    
    CodeCellR.prototype.placeSVG = function(rString) {
    	rString = rString.replace(/\\n/g,"\\n ");
    	
    	var matchesLayout = rString.match(regexpParLayoutG);
    	var layouts = rString.split(regexpParLayout);
    	var realLayouts = CodeCellR.prototype.checkRealPlots(matchesLayout, rString); // Find all real 'par' and 'layout' instructions, those that are not inside "" or ''
    	
    	var aux = 0;
    	var done = false;
    	var overf = 0;
    	while (aux < realLayouts.length && !done) {		// We find the index from which appears the first valid Layout / Par. From that moment on, we do not have to open other graphical devices!
    		if (realLayouts[aux]) {
    			done = true;
    		}
    		overf = overf + layouts[aux].length + matchesLayout[aux].length;
    		aux++;
    	}
    	if(!done) {
    		overf = overf + layouts[aux].length;
    	}
    	
    	var matches = rString.match(regexpG);
    	var plots = rString.split(regexp);		// We find all plots
    	var realPlots = CodeCellR.prototype.checkRealPlots(matches, rString); // Finds all real plots, those that are not inside "" or ''
    	var ret = "";
    	var arr = new Array();
    	var pointerOverF = 0;
    	if(plots.length > 1) {
    		for(var i=1; i<plots.length; i++) {		// We start from 1, which is the real first plot
    			pointerOverF = pointerOverF + plots[i-1].length + matches[i-1].length;
    			if (realPlots[i-1] && pointerOverF < overf) {
    				IPython.notebook.genericCounter++;
    				var nameFile = "test_" + IPython.notebook.genericCounter + ".svg";
    				var fullPath = "/home/temp/" + nameFile;
    			
    				arr[i-1] = nameFile;
    				if(i==1) {
    					ret = plots[0] + "svg(file='" + fullPath + "'); " + matches[i-1] + plots[i];
    				} else {
    					ret = ret + "dev.off();" + " svg(file='" + fullPath + "'); " + matches[i-1] + plots[i];
    				};
    			} else {
    				if(i==1){
    					ret = plots[0] + matches[i-1] + plots[i];
    				} else {
    					ret = ret + matches[i-1] + plots[i];
    				};
    			};
    			if(i == plots.length-1) {
					ret = ret + "\\n dev.off();";
				};
    		};
    	} else {
    		ret = rString;
    	};
    	
    	// We place a svg stuff in front of the first real par or layout
    	matchesLayout = ret.match(regexpParLayoutG);
    	layouts = ret.split(regexpParLayout);
    	realLayouts = CodeCellR.prototype.checkRealPlots(matchesLayout, ret); // Find all real 'par' and 'layout' instructions, those that are not inside "" or ''
    	var aux = 0;
    	var done = false;
    	var output = "";
    	for(var i = 0; i<realLayouts.length; i++) {
    		if(!done && realLayouts[i]) {
    			done = true;
    			IPython.notebook.genericCounter++;
    			var nameFile = "test_" + IPython.notebook.genericCounter + ".svg";
				var fullPath = "/home/temp/" + nameFile;
				arr[arr.length] = nameFile;
    			output = output + layouts[i]+ "svg(file='" + fullPath + "'); " + matchesLayout[i];
    		} else if(done || !realLayouts[i]) {
    			output = output + layouts[i] + matchesLayout[i];
    		}
    	}
    	if (realLayouts.length > 0) {
    		output = output + layouts[layouts.length-1];
    	} else {
    		output = ret;
    	}
    	return {"str":output, "plots":arr};
    }
    
    CodeCellR.prototype.checkRealPlots = function (matches, rString) {
    	// Returns an array of boolens arr, where arr[i] == FALSE is the ploting function in mathces[i] is part of a String (so, inside "" or '')
    	// Otherwise, it will be true
    	
    	var arr = new Array();
    	var firstInd = 0;
    	var overFlow = "";
    	if (matches != null) {
    		for(var i=0; i<matches.length; i++) {
    			var currPlot = matches[i];
    			var lastInd = rString.indexOf(currPlot, firstInd);
    			var aux = CodeCellR.prototype.isValidPlot(rString, firstInd, lastInd, overFlow); 
    			arr[i] = aux.isValidPlot;
    			overFlow = aux.overFlow;
    			firstInd = lastInd+1;
    		}
    	};
    	return arr;
    }
    
    CodeCellR.prototype.isValidPlot = function (rString, firstInd, lastInd, overFlow) {
    	var overFlowFinal = overFlow;
    	var isValidPlot = true;
    	
    	for(var i=firstInd; i<lastInd; i++){
    		if (rString.charAt(i) == overFlowFinal && overFlowFinal != "") {
    			overFlowFinal = "";
    		} else if (rString.charAt(i) == "'" || rString.charAt(i) == '"') {
    			overFlowFinal = rString.charAt(i); 
    		}
    	}
    	isValidPlot = (overFlowFinal == "");    	
    	return {"overFlow":overFlowFinal, "isValidPlot":isValidPlot};
    }
    
    CodeCellR.prototype.checkIsExp = function (linea) {
    	var ret = false;
    	var inst = linea.split(";"); 		// We split the line with instructions
    	var last = inst[inst.length-1];		// we get the last instruction
    	
    	if (last.length > 0) {					// if the length of the last instruction is 0, it means that the line ends up with a ';', so we return false
    		ret = ret || last.match(/while/g);	// otherwise, we check for the situations that accept on single more line
    		ret = ret || last.match(/for/g);
    		ret = ret || last.match(/if/g);
    		ret = ret || last.match(/else/g);
    		ret = ret || last.match(/function/g);
    		if (!ret) {	// Also, we check whether the last character of the line is one valid R operator
    			last = last.trim();
    			lastCh = last[last.length-1];
    		};
    	};
    	return ret;
    } 
    
    CodeCellR.prototype.getIndent = function (str, overflow, charId) {
    	// CharId = 0 -> NONE, CharId =1 -> ( ), CharId = 2 -> { }, charId =3 -> "", charId = 4 -> ''
    	//  overflow = 0 iff charId = 0
    	var open = "";
    	var close = "";
    	var indent = overflow;
    	var idC = charId;
    	switch (charId) {
    	case 1:
    		open="(";
    		close=")";
    		break;
    	case 2:
    		open="{";
    		close="}";
    		break;
    	case 3:
    		open='"';
    		close='"';
    		break;
    	case 4:
    		open="'";
    		close="'";
    		break;
    	};
    	
    	for(var i=0; i<str.length; i++) {
    		if ((open != close) && (open == str[i])) {
    			indent++;
    		} else if (close==str[i]) {
    			indent--;
    		};
    		
    		if ((open == "") && (str[i]== "(")) {
    			open = "(";
    			close = ")";
    			idC = 1;
    			indent++;
    		};
    		
    		if ((open == "") && (str[i] == "{")) {
    			open = "{";
    			close = "}";
    			idC = 2;
    			indent++;
    		};
    		
    		if ((open == "") && (str[i] == '"')) {
    			open = '"';
    			close = '"';
    			idC = 3;
    			indent++;
    		};
    		
    		if ((open == "") && (str[i] == "'")) {
    			open = "'";
    			close = "'";
    			idC = 4;
    			indent++;
    		};
    		
    		if (indent == 0) {
    			open = "";
    			close = "";
    			idC = 0;
    		};
    	};
    	
    	return {"indent":indent, "idChar":idC};

    };

    IPython.CodeCellR = CodeCellR;

    return IPython;
}(IPython));
