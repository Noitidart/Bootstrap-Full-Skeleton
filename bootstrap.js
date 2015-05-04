const {interfaces: Ci, utils: Cu, classes: Cc} = Components;
const self = {
	name: 'GlobalFindBar',
	id: 'jid0-GlobalFindBar@jetpack',
	path: {
		chrome: 'chrome://globalfindbar/content/',
		locale: 'chrome://globalfindbar/locale/',
	},
	aData: 0,
};

const myPrefBranch = 'extensions.' + self.name + '@jetpack.';
const BreakException = {};
const myServices = {};

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Promise.jsm');
XPCOMUtils.defineLazyGetter(myServices, 'as', function () { return Cc['@mozilla.org/alerts-service;1'].getService(Ci.nsIAlertsService) });
XPCOMUtils.defineLazyGetter(myServices, 'dsp', function () { return Cc['@mozilla.org/file/directory_service;1'].getService(Ci.nsIProperties) });
XPCOMUtils.defineLazyGetter(myServices, 'stringBundle', function () { return Services.strings.createBundle('chrome://profilist/locale/bootstrap.properties?' + Math.random()) /* Randomize URI to work around bug 719376 */ });

//start obs stuff
var observers = {
	'inline-options-shown': {
		observe: function (aSubject, aTopic, aData) {
			if (aData == self.aData.id) {
				var contDoc = aSubject;
			}
		},
		reg: function () {
			Services.obs.addObserver(observers['inline-options-shown'], 'addon-options-displayed', false);
		},
		unreg: function () {
			Services.obs.removeObserver(observers['inline-options-shown'], 'addon-options-displayed');
		}
	},
	'inline-options-hid': {
		observe: function (aSubject, aTopic, aData) {
			if (aData == self.aData.id) {
				var contDoc = aSubject;
			}
		},
		reg: function () {
			Services.obs.addObserver(observers['inline-options-hid'], 'addon-options-hidden', false);
		},
		unreg: function () {
			Services.obs.removeObserver(observers['inline-options-hid'], 'addon-options-hidden');
		}
	}
};
//end obs stuff

//start pref stuff
const myPrefBranch = 'extensions.' + self.name + '@jetpack.';
var myPrefListener;
//needs ES5, i dont know what min browser version of FF starts support for ES5
/**
 * if want to change value of preference dont do prefs.holdTime.value = blah, instead must do `prefs.holdTime.setval(500)`
 * because this will then properly set the pref on the branch then it will do the onChange properly with oldVal being correct
 * NOTE: this fucntion prefSetval is not to be used directly, its only here as a contructor
 */
PrefListener.prototype.prefSetval = function(pass_pref_name, pass_branch_name) {
	//console.log('this outside', this);
	var passBranchObj = this.watchBranches[pass_branch_name];
	var passPrefObj = passBranchObj.prefNames[pass_pref_name];
	var func = function(updateTo, iHave__on_PrefOnObj_Change__butOnNextChangeSkipExecute) {
		var pref_name = pass_pref_name;
		var branch_name = pass_branch_name;
		var branchObj = passBranchObj; //this.watchBranches[branch_name];
		var prefObj = passPrefObj; //branchObj.prefNames[pref_name];
		//console.info('in prefSetval', 'this:', this, 'branchObj', branchObj, 'prefObj', prefObj, 'pref_name', pass_pref_name);
		if (iHave__on_PrefOnObj_Change__butOnNextChangeSkipExecute) {
			var curValOnTree = branchObj._branchLive['get' + typeStr_from_typeLong(prefObj.type) + 'Pref'](pref_name);
			if (curValOnTree == updateTo) {
				console.warn('setval called said to mark it for skipOnChange, however updateTo and curValOnTree are same so on_PrefOnTree_Change will not call after running this updateTo so will not mark for skip');
			} else {
				prefObj.iHave__on_PrefOnObj_Change__butOnNextChangeSkipExecute = new Date().getTime();
			}
		}
		branchObj._branchLive['set' + typeStr_from_typeLong(prefObj.type) + 'Pref'](pref_name, updateTo);
		console.log('set   doooone');
	};
	return func;
}
function typeStr_from_typeLong(typeLong) {
	switch (typeLong) {
		case Ci.nsIPrefBranch.PREF_STRING:
			return 'Char';
		case Ci.nsIPrefBranch.PREF_INT:
			return 'Int';
		case Ci.nsIPrefBranch.PREF_BOOL:
			return 'Bool';
		case Ci.nsIPrefBranch.PREF_INVALID:
			//probably pref does not exist
			throw new Error('typeLong is PREF_INVALID so probably pref DOES NOT EXIST');
		default:
			throw new Error('unrecognized typeLong:', typeLong);
	}
}
///pref listener generic stuff NO NEED TO EDIT
/**
 * @constructor
 *
 * @param {string} branch_name
 * @param {Function} callback must have the following arguments:
 *   branch, pref_leaf_name
 */
 //note: a weakness with this api i made for prefs, is that, if upgrading/downgrading and in installing rev a pref is no longer in use, the old pref will stay in the about:config system. prefs are only deleted when addon is uninstalled note: as of 080314 though i think i have a solution for this, watch the info/warn dump and if it holds true than edit it in
 //note: good thing about this overhaul of the pref skeleton is that i can have this skeleton pasted in, and if no prefs being watched it doesnt do anything funky
function PrefListener() {
	//is an array
  // Keeping a reference to the observed preference branch or it will get garbage collected.
	Object.keys(this.watchBranches).forEach(function(branch_name) {
		this.watchBranches[branch_name]._branchLive = Services.prefs.getBranch(branch_name);
		this.watchBranches[branch_name]._branchDefault = Services.prefs.getDefaultBranch(branch_name);
		//this.watchBranches[branch_name]._branchLive.QueryInterface(Ci.nsIPrefBranch2); //do not need this anymore as i dont support FF3.x
	}.bind(this));
}
//start - edit in here your prefs to watch
PrefListener.prototype.watchBranches = {
	/*
	// start - demo
	'branch.name': { //for own branch we handle this outside of this object as we key to `myPrefBranch` for others branch like set to `'gecko.handlerService.schemes.mailto'`
		ownType: 0, //0-full, 1-none, 2-partial //defines whether all prefs on this branch are owned (full,0), you own none of them so just watching whole, or partial which is mix
		prefNames: { //this is an object of the prefs that i add into this branch, meaning i set the defaults on them. my prefs meaning that they belong to this addon and should be removed when this addon is uninstalled
			//each key here must match the exact name the pref is saved in the about:config database (without the prefix)
			//note: if i include a default key on the pref then it is a pref that i make on this branch
			someNameOfPref: { //this pref gets created if not found in this branch in about:config, a defaultBranch value is set for it too, this pref is also deleted on uninstall of the addon. createdPrefs are denoted by supplying a `default` and `type` key
				owned: true, //set this to true as we create this, if set to false it expects that the pref was made and we just want to watch
				default: 300, //if owned is true must have default, else if its false, then cannot have default
				value: undefined, //start value at undefined
				type: Ci.nsIPrefBranch.PREF_STRING, //should call thi skey typeLong but whatever //Ci.nsIPrefBranch.PREF_BOOL or Ci.nsIPrefBranch.PREF_STRING or Ci.nsIPrefBranch.PREF_INT
				//json: null, //if want to use json type must be string //NOT SUPPORTED IN V2.0 //12/8/14
				on_PrefOnObj_Change: function(oldVal, newVal, refObj) { } //on change means on change of the object prefs.blah.value within. NOT on change of the pref in about:config. likewise onPreChange means before chanigng the perfs.blah.value, this is because if users changes pref from about:config, newVal is always obtained by doing a getIntVal etc //refObj holds
			}
		},
		unknownNameOnChange: function(oldVal, newVal, refObj) { //really this just is unspecifiedNameOnChange
			//this onChange function is called for prefs not found in the the prefNames object. if the pref_name change exists in the prefNames object and it doesnt have an onChange, then no onChange is called for that. So again this unknownNameOnChange is only called for if pref_name does not exist in prefNames obj
		}
	},
	'gecko.handlerService.schemes.mailto': {
		ownType: 1, //1 means none, but if i create any prefs on this (by setting nams in prefNames to owned:true) then i should set this to partial
		prefNames: {
			nameOfPreSpecifiedPref: {
				owned: false, //set to false we're just watching, set to true, it gets created
			}
		},
		// unknownNameOnChange: function(oldVal, newVal, refObj) {} //this is not required
	}
	// end - demo 
	*/
}

PrefListener.prototype.watchBranches[myPrefBranch] = { //have to do it this way because in the watchBranches obj i can't do { myPrefBranch: {...} }
	ownType: 0, //0-full, 1-none, 2-partial
	prefNames: {
		'notifications': { //name of your pref
			owned: true,
			default: true,
			value: undefined,
			type: Ci.nsIPrefBranch.PREF_BOOL,
			on_PrefOnObj_Change: writePrefToIni
		},
		tabScope: {
			owned: true,
			default: 0, //0 = all tabs, 1 = per tab domain
			value: undefined,
			type: Ci.nsIPrefBranch.PREF_INT
		},
		winScope: {
			owned: true,
			default: 0, //0 = per window, 1 = per profile so all windows
			value: undefined,
			type: Ci.nsIPrefBranch.PREF_INT
		},
		restore_old_style: {
			owned: true,
			default: false,
			value: undefined,
			type: Ci.nsIPrefBranch.PREF_BOOL,
			on_PrefOnObj_Change: function(oldVal, newVal, refObj) {
				restore_old_style(newVal);
			}
		},
		findbarFocus: {
			owned: true,
			default: 1, //on tabselect findbar: 0 = always gets focus, 1 = focus only if currently focused element is not text, 2 = never focus
			value: undefined,
			type: Ci.nsIPrefBranch.PREF_INT
		}
	},
	on_UnknownPrefNameOnObj_Change: function(oldVal, newVal, refObj) {
		console.warn('on_UnknownPrefNameOnObj_Change', 'oldVal:', oldVal, 'newVal:', newVal, 'refObj:', refObj);
	}
};

//end - edit in here your prefs to watch
PrefListener.prototype.observe = function(subject, topic, data) {
	//console.log('incoming PrefListener observe :: ', 'topic:', topic, 'data:', data, 'subject:', subject);
	//console.info('compare subject to this._branchLive[extensions.MailtoWebmails@jetpack.]', this.watchBranches[subject.root]._branchLive);
	if (topic == 'nsPref:changed') {
		var branch_name = subject.root;
		var pref_name = data;
		this.on_PrefOnTree_Change(branch_name, pref_name);
	} else {
		console.warn('topic is something totally unexpected it is:', topic);
	}
};

/**
 * @param {boolean=} trigger if true triggers the registered function
 *   on registration, that is, when this method is called.
 */
PrefListener.prototype.register = function(aReason, exec__on_PrefOnObj_Change__onRegister) {
	var branchesOnObj = Object.keys(this.watchBranches);
	for (var i=0; i<branchesOnObj.length; i++) {
		var branch_name = branchesOnObj[i];
		var branchObj = this.watchBranches[branch_name];
		if (branchObj.ownType == 0) {
			var unusedPrefNamesOnTree = branchObj._branchLive.getChildList('', {});
		}
		var prefNamesOnObj = Object.keys(this.watchBranches[branch_name].prefNames);
		for (var j=0; j<prefNamesOnObj.length; j++) {
			var pref_name_on_obj = prefNamesOnObj[j];
			var prefObj = branchObj.prefNames[pref_name_on_obj];
			if (prefObj.owned) {
				prefObj.setval = this.prefSetval(pref_name_on_obj, branch_name);
				if (aReason == ADDON_INSTALL) {
					prefObj.value = prefObj.default;
				} else {
					console.log('not install so fetching value of owned pref, as it should exist, may need to catch error here and on error set to default');
					console.info('aReason == ', aReason);
					try {
						prefObj.value = branchObj._branchLive['get' + typeStr_from_typeLong(prefObj.type) + 'Pref'](pref_name_on_obj);
					} catch(ex) {
						//console.warn('excpetion occured when trying to fetch value, startup is not install so it should exist, however it probably doesnt so weird, so setting it to default, CAN GET HERE IF say have v1.2 installed and prefs were introduced in v1.3, so on update it can get here. ex:', ex); //this may happen if prefs were deleted somehow even though not uninstalled
						console.warn('pref is missing, aReason == ', aReason); //expected if startup and pref value was default value on shutdown. or if upgrade/downgrade to new version which has prefs that were not there in previous version.
						prefObj.value = prefObj.default;
						var prefMissing = true;
					}
				}
				if (prefMissing || [ADDON_INSTALL, ADDON_UPGRADE, ADDON_DOWNGRADE].indexOf(aReason) > -1) {
					if (prefMissing) {
						console.error('setting on default branch because prefMissing is true, aReason btw is ', aReason);
					} else {
						console.error('setting on default branch because aReason == ', aReason);
					}
					branchObj._branchDefault['set' + typeStr_from_typeLong(prefObj.type) + 'Pref'](pref_name_on_obj, prefObj.default);
				} else {
					console.error('NOT setting on default branch because aReason == ', aReason);
				}
				if (branchObj.ownType == 0) {
					var indexOfPrefName_ON_unusedPrefNamesOnTree = unusedPrefNamesOnTree.indexOf(pref_name_on_obj);
					if (indexOfPrefName_ON_unusedPrefNamesOnTree > -1) {
						unusedPrefNamesOnTree.splice(indexOfPrefName_ON_unusedPrefNamesOnTree, 1);
					}
				}
			} else {
				prefObj.type = branchObj._branchLive.getPrefType(pref_name_on_obj); //use _branchLive in case it doesnt have default value //and its got to have _branchLive value as it is NOT owned UNLESS dev messed ownership up
				prefObj.default = branchObj._branchDefault['get' + typeStr_from_typeLong(prefObj.type) + 'Pref'](pref_name_on_obj);
				prefObj.value = branchObj._branchLive['get' + typeStr_from_typeLong(prefObj.type) + 'Pref'](pref_name_on_obj);
				prefObj.setval = this.prefSetval(pref_name_on_obj, branch_name);
			}
		}
		branchObj._branchLive.addObserver('', this, false);
		
		for (var j=0; j<unusedPrefNamesOnTree.length; j++) {
			var pref_name_in_arr = unusedPrefNamesOnTree[j];
			/*
			if (!this._branchDefault) {
				this._branchDefault = Services.prefs.getDefaultBranch(null);
			}
			this._branchDefault.deleteBranch(branch_name + pref_name); //delete default value
			branchObj._branchLive.clearUserPref(pref_name_in_arr); //delete live value
			*/
			Services.prefs.deleteBranch(branch_name + pref_name_in_arr); //deletes the default and live value so pref_name is gone from tree
		}
	}
	
	if (exec__on_PrefOnObj_Change__onRegister) { //for robustness this must not be a per branch or a per pref property but on the whole watchBranches
		for (var i=0; i<branchesOnObj.length; i++) {
			var branch_name = branchesOnObj[i];
			var branchObj = this.watchBranches[branch_name];
			var prefNamesOnObj = Object.keys(this.watchBranches[branch_name].prefNames);
			for (var j=0; j<prefNamesOnObj.length; j++) {
				var pref_name_on_obj = prefNamesOnObj[j];
				var prefObj = branchObj.prefNames[pref_name_on_obj];
				if (prefObj.on_PrefOnObj_Change) {
					var oldVal = undefined; //because this is what value on obj was before i set it to something
					var newVal = prefObj.value;
					var refObj = {
						branch_name: branch_name,
						pref_name: pref_name_on_obj,
						prefObj: prefObj,
						branchObj: branchObj
					};
					prefObj.on_PrefOnObj_Change(oldVal, newVal, refObj);
				}
			}
		}
	}
};

PrefListener.prototype.unregister = function() {
	var branchesOnObj = Object.keys(this.watchBranches);
	for (var i=0; i<branchesOnObj.length; i++) {
		var branch_name = branchesOnObj[i];
		var branchObj = this.watchBranches[branch_name];
		branchObj._branchLive.removeObserver('', this);
		console.log('removed observer from branch_name', branch_name);
	}
};

PrefListener.prototype.uninstall = function(aReason) {
	console.log('in PrefListener.uninstall proc');
	if (aReason == ADDON_UNINSTALL) {
		var branchesOnObj = Object.keys(this.watchBranches);
		for (var i=0; i<branchesOnObj.length; i++) {
			var branch_name = branchesOnObj[i];
			var branchObj = this.watchBranches[branch_name];
			if (branchObj.ownType == 0) {
				Services.prefs.deleteBranch(branch_name);
			} else {
				var prefNamesOnObj = Object.keys(this.watchBranches[branch_name].prefNames);
				for (var j=0; j<prefNamesOnObj.length; j++) {
					var pref_name_on_obj = prefNamesOnObj[j];
					var prefObj = branchObj.prefNames[pref_name_on_obj];
					if (prefObj.owned) {
						Services.prefs.deleteBranch(branch_name + pref_name_on_obj);
					}
				}
			}
		}
	} else {
		console.log('not real uninstall so quitting preflistener.uninstall proc');
	}
};

PrefListener.prototype.on_PrefOnTree_Change = function (branch_name, pref_name_on_tree) {
	console.log('on_PrefOnTree_Change', 'pref_name_on_tree:', pref_name_on_tree, 'branch_name:', branch_name);
	var branchObj = this.watchBranches[branch_name];
	var refObj = {
		branch_name: branch_name,
		pref_name: pref_name_on_tree,
		branchObj: branchObj
	};
	if (pref_name_on_tree in branchObj.prefNames) {
		var prefObj = branchObj.prefNames[pref_name_on_tree];
		var oldVal = prefObj.value;
		try {
			var newVal = branchObj._branchLive['get' + typeStr_from_typeLong(prefObj.type) + 'Pref'](pref_name_on_tree);
		} catch (ex) {
			console.info('probably deleted', 'newVal exception:', ex);
		}
		refObj.prefObj = prefObj;
		if (prefObj.iHave__on_PrefOnObj_Change__butOnNextChangeSkipExecute) {
			var msAgo_markedForSkip = new Date().getTime() - prefObj.iHave__on_PrefOnObj_Change__butOnNextChangeSkipExecute;
			console.log('skipping this onChange as 2nd arg told to skip it, it was marked for skip this many ms ago:', msAgo_markedForSkip);
			delete prefObj.iHave__on_PrefOnObj_Change__butOnNextChangeSkipExecute
		} else {
			if (prefObj.on_PrefOnObj_Change) {
				prefObj.on_PrefOnObj_Change(oldVal, newVal, refObj);
			} else {
				//do nothing
			}
		}
		prefObj.value = newVal;
		console.log('prefObj value updated, prefObj:', prefObj);
	} else {
		if (branchObj.on_UnknownPrefNameOnObj_Change) {
			var oldVal = null; //i actually dont know if it existed before
			refObj.type = branchObj._branchLive.getPrefType(pref_name_on_tree);
			console.info('refObj.type:', refObj.type);
			if (refObj.type == 0) {
				console.info('unknownNameOnObj pref probably deleted');
				newVal = null;
			}
			var newVal = branchObj._branchLive['get' + typeStr_from_typeLong(refObj.type) + 'Pref'](pref_name_on_tree);
			refObj.setval = function(updateTo) {
				branchObj._branchLive['set' + typeStr_from_typeLong(refObj.type) + 'Pref'](pref_name_on_tree, updateTo);
			}
			branchObj.on_UnknownPrefNameOnObj_Change(oldVal, newVal, refObj);
		} else {
			//do nothing
		}
	}
	console.log('DONE on_PrefOnTree_Change');
};
////end pref listener stuff
//end pref stuff

/////start unloader stuff
var unloaders = []; // Keeps track of unloader functions.

function unload(fn) {
  if (typeof(fn) != "function") {
    throw new Error("unloader is not a function");
  }
  unloaders.push(fn); //EXPLAINED: this position is important. these functions are called on shutdown and ONLY on shutdown BUT there is a possibility that it will not run on shutdown even though it was added into here. (POSSIBILITY 1) If `unloadWindow` was used to add a "unloader" `fn` AND the window closed before add-on shutdown THAN the `fn` pushed into this array will NEVER run, it will be removed from the `unloaders` array. (POSSIBILITY 2) If you did a manual remove
  return function() { //EXPLAINED: the purpose of this return is purely for `unloadWindow` and manual removes
    //EXPLAINED: the thing thats different in here is that it runs on the `unload` event of a `window` OR on manual remove and if it does, then it filters it out of the `unloaders` array so it will not run on shutdown
    try {
      fn();
    }
    catch (ex) {
      Cu.reportError("unloader threw " + fn.toSource());
      Cu.reportError(ex);
    }
    unloaders = unloaders.filter(function(c) { return c != fn; });
  };
}

function unloadWindow(window, fn) {
  let handler = unload(function() { //EXPLAINED: `let handler` will hold reference to the `return`ed `fn` from `unload`. This is a reason why we make `function unload` `return` a function. This `handler` will run in two possibilites (1) manual remove or (2) window close. AGAIN KEEP IN MIND, this `function() { }` wrap is NOT the same function that `handler` holds reference to, see the `unload` return function, thats what `handler`is
    //EXPLAINED: now this `function() { }` wrap function will run ONLY on add-on shutdown
    window.removeEventListener('unload', handler, false); //EXPLAINED: the reason we have this line is becuase (1) if this runs on add-on shutdown the window is still open, so we want to remove this from the window as it was added from L#153 (end of this function wrap, end of this unloadWindow function) (2) if manual remove done than the window is still open, we want to remove this, otherwise on close of window it will still fire, and we dont want that. (3) this will run on window close on the `unload` event but it will not cause any errors, but its really no point for window close
    try {
      fn();
    }
    catch (ex) {
      Cu.reportError("window unloader threw " + fn.toSource());
      Cu.reportError(ex);
    }
  });
  window.addEventListener('unload', handler, false); //EXPLAINED: we add the function wrap that we passed to `unload` in block above this. reason is for (1) window close and window close only. This `unload` event will NOT trigger for the possibility of manual remove or addon shutdown
};
/////end unloader stuff

/*start - windowlistener*/
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		var aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener('load', function () {
			aDOMWindow.removeEventListener('load', arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		
		// Load into any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			if (aDOMWindow.document.readyState == 'complete') { //on startup `aDOMWindow.document.readyState` is `uninitialized`
				windowListener.loadIntoWindow(aDOMWindow);
			} else {
				aDOMWindow.addEventListener('load', function () {
					aDOMWindow.removeEventListener('load', arguments.callee, false);
					windowListener.loadIntoWindow(aDOMWindow);
				}, false);
			}
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	},
	unregister: function () {
		// Unload from any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			windowListener.unloadFromWindow(aDOMWindow);
		}
		/*
		for (var u in unloaders) {
			unloaders[u]();
		}
		*/
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow) {
		if (!aDOMWindow) {
			return;
		}
		
		/*
		//if you want to use the unloader interface then:
		//you either use unloadWindow for unloader interface or use unloadFromWindow from wm interface, its one or the other, i cant think of why you would use both
		unloadWindow(aDOMWindow, function() {
			//opposite of loadIntoWindow
		});
		*/
	},
	unloadFromWindow: function (aDOMWindow) {
		if (!aDOMWindow) {
			return;
		}
		//opposite of loadIntoWindow
	}
};
/*end - windowlistener*/


// start bootstrap hook ins
function startup(aData, aReason) {
	console.log('startup reason = ', aReason);
	
	self.aData = aData; //must go first, because functions in loadIntoWindow use self.aData
	
	//start observers stuff more
	for (var o in observers) {
		observers[o].reg();
	}
	//end observers stuff more
	
	//start pref stuff more
	myPrefListener = new PrefListener(); //init
	console.info('myPrefListener', myPrefListener);
	myPrefListener.register(aReason, false);
	//end pref stuff more
	
	//wm watcher more
	windowListener.register();
	//end wm watcher more
	
}

function shutdown(aData, aReason) {
	console.log('shutdown reason = ', aReason);
	if (aReason == APP_SHUTDOWN) return;
	
	//start observers stuff more
	for (var o in observers) {
		observers[o].unreg();
	}
	//end observers stuff more
	
	//wm watcher more
	windowListener.unregister();
	//end wm watcher more
	
	//start pref stuff more
	myPrefListener.unregister();
	//end pref stuff more
}

function install(aData, aReason) {
	//must have arguments of aData and aReason otherwise the uninstall function doesn't trigger
}

function uninstall(aData, aReason) {
	console.info('UNINSTALLING reason = ', aReason);
	//start pref stuff more
	if (!myPrefListener) {
		//lets not register observer/listener lets just "install" it which populates branches
		console.log('in uninstall had to init (soft install) myPrefListener')
		myPrefListener = new PrefListener(); //this pouplates this.watchBranches[branch_name] so we can access .branchLive and .branchDefault IT WILL NOT register the perf observer/listener so no overhead there
	}
	myPrefListener.uninstall(aReason); //deletes owned branches AND owned prefs on UNowned branches, this is optional, you can choose to leave your preferences on the users computer	
	//end pref stuff more
}
// end bootstrap hook ins
