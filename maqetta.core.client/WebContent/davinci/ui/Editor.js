dojo.provide("davinci.ui.Editor");

if (typeof orion == "undefined") { orion = {}; } // workaround because orion code did not declare orion global in a way that works with the Dojo loader

dojo.require("orion.editor.editor");
dojo.require("orion.editor.editorFeatures");
dojo.require("orion.textview.textView");
dojo.require("davinci.ui.editor.Styler");
dojo.require("davinci.commands.CommandStack");
dojo.require("dojox.timing.doLater");

dojo.declare("davinci.ui.Editor", null, {
	
	constructor: function (element, existWhenVisible) {
		this.contentDiv = element;
		this._existWhenVisible=existWhenVisible;
		this.commandStack=new davinci.commands.CommandStack();
		this._isVisible=!existWhenVisible;
	},

	setContent: function (filename, content) {
		if (!this.editor && (!this._existWhenVisible || this._isVisible)) {
			this._createEditor();
		}
		if (!this._textModel) {
			this._textModel = this.editor ? this.editor.getModel() : new orion.textview.TextModel();
			dojo.connect(this._textModel,"onChanged",this,this._onTextChanged); // editor.onInputChange?
		}
		this.fileName=filename;

		this._updateStyler();

		this.setValue(content, true);
	},

	setVisible: function (visible) {

//console.log("setVisible="+visible + " "+s)
		if (visible!=this._isVisible && this._existWhenVisible)
		{
			if (visible && this._existWhenVisible)
			{
				this._createEditor();
				this._updateStyler();
			}
			else
			{
	            this.editor.getTextView().removeEventListener("Selection", this, this._onSelectionChanged);
//	            try {
//					this.editor.destroy();
//	            } catch (e){ console.error(e); }
				delete this.editor;
			}
		}
		this._isVisible=visible;
	},
	setValue: function (content,dontNotify) {
		this._dontNotifyChange=dontNotify;
		if (this.editor) {
			this.editor.setText(content);
		} else {
			this._textModel.setText(content);
		}
		this._dontNotifyChange=false;
	},

	_createEditor: function () {
		var parent = this.contentDiv,
			model = this._textModel,
			options = {
				statusReporter: function(message, isError) {
					var method = isError ? "error" : "log";
					console[method]("orion.editor: " + message);
				},
				textViewFactory: function() {
					return new orion.textview.TextView({
						parent: parent,
						model: model,
						/*
						stylesheet: [ "../../orion/textview/textview.css",
										"../../orion/textview/rulers.css",
										"../../orion/textview/annotations.css",
										"../textview/textstyler.css"],
						*/
						tabSize: 4
					})
				},
				undoStackFactory: new orion.editor.UndoFactory(),
				annotationFactory: new orion.editor.AnnotationFactory(),
				lineNumberRulerFactory: new orion.editor.LineNumberRulerFactory(),
				contentAssistFactory: null,
//TODO				keyBindingFactory: keyBindingFactory, 
				domNode: parent // redundant with textView parent?
		};
		this.editor = new orion.editor.Editor(options);
		this.editor.installTextView();
		this.editor.getTextView().focus();

		dojo.style(this.contentDiv, "overflow", "hidden");

		if (this.selectionChange) {
            this.editor.getTextView().addEventListener("Selection", this, this._onSelectionChanged);
		}
		this.cutAction=new davinci.ui._EditorCutAction(this.editor);
		this.copyAction=new davinci.ui._EditorCopyAction(this.editor);
		this.pasteAction=new davinci.ui._EditorPasteAction(this.editor);

	},
	_updateStyler: function () {
		var extension=this.fileName.substr(this.fileName.lastIndexOf('.')+1);
		var map={js: 'js', json: 'js', html:'html', css:'css'};
		var style=map[extension];
		
		if (style)
		{
			if (this._styler) {
				this._styler.destroy();
			}
			this._styler=new davinci.ui.editor.Styler(style);
			if (this.editor){
//				new eclipse.TextStyler(this.editor, style);
				this._styler.setView(this.editor.getTextView());
			}
		}
	},
	_onTextChanged: function(textChangeEvent) {
		if (this._dontNotifyChange) {
			return;
		}
		this.lastChangeStamp = Date.now();
		if (this.handleChange && !("waiter" in this)) {
			try {
				// don't process keystrokes until the user stops typing
				// keep re-executing the following closure until the doLater condition is satisfied
				this.waiter = true;
				(function(that){
					if (dojox.timing.doLater(Date.now() - that.lastChangeStamp > 200, that)) { return; }
					delete that.waiter;
					that.handleChange(that._textModel.getText());
				})(this);
			} catch (e){console.error(e);}
		}
	},
	
	update_size: function(){
		
	},
		
	selectionChange: function (selection) {
	},

	_onSelectionChanged: function(selectionEvent) {
		if (this._selecting) 
			return;
//		var startPos=this._textModel.getPosition(selectionEvent.newValue.start);
//		var endPos=this._textModel.getPosition(selectionEvent.newValue.end);
        this.selectionChange({startOffset:selectionEvent.newValue.start,endOffset:selectionEvent.newValue.end});

	},
	destroy: function () {
	},

	select: function (selectionInfo)
	{
		
//		var start=this._textModel.getLineStart(selectionInfo.startLine)+selectionInfo.startCol;
//		var end=this._textModel.getLineStart(selectionInfo.endLine)+selectionInfo.endCol;
		this._selecting=true;
		if (this.editor) {
			this.editor.setSelection(selectionInfo.startOffset,selectionInfo.endOffset);
		}
		this._selecting=false;
	},
	getText: function() {
		return this._textModel.getText(0);
	}	
	
});

dojo.declare("davinci.ui._EditorCutAction", davinci.actions.Action, {
	constructor: function (editor) {
		this._editor=editor;
	},
	run: function(context){
		this._editor._doCut();
	},
	isEnabled: function(context){
		return !this._editor._getSelection().isEmpty()
	}
});
dojo.declare("davinci.ui._EditorCopyAction", davinci.actions.Action, {
	constructor: function (editor) {
		this._editor=editor;
	},
	run: function(context){
		this._editor._doCopy();
	},
	isEnabled: function(context){
		return !this._editor._getSelection().isEmpty()
	}
});
dojo.declare("davinci.ui._EditorPasteAction", davinci.actions.Action, {
	constructor: function (editor) {
		this._editor=editor;
	},
	run: function(context){
		this._editor._doPaste();
	}
});

