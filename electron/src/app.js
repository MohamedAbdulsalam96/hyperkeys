const {app, globalShortcut, Menu, Tray} = require('electron');
const debug = require('debug')('app');
const ipcService = require('./ipc');
//----------------------------------------------------------------------------------------------------------------------

const HKAPI = require('hyperkeys-api');
const platform = HKAPI.platform;
const extensionsProvider = require('./providers/extensions-provider');
const macrosProvider = require('./providers/macros-provider');
const actionsService = require('./services/actions-service');
const uuid = require('uuid');
const notifier = require('node-notifier');
const path = require('path');
//----------------------------------------------------------------------------------------------------------------------

debug("platform:", platform.name);
const APPPATH = __dirname;
debug("APPPATH:", APPPATH);
//----------------------------------------------------------------------------------------------------------------------

const extensions = extensionsProvider.loadExtensions();
const extensionsMetadata = {};
//Extract metadata
for (let iextension in extensions) {
	if (extensions.hasOwnProperty(iextension)) {
		let extension = extensions[iextension];
		for (let action of extension.actions) {
			actionsService.registerActionFactory(action.name, action.factory);
		}
		extensionsMetadata[extension.metadata.name] = extension.metadata;
		extensionsMetadata[extension.metadata.name].directory = path.join(__dirname, 'extensions', iextension);
	}
}
//----------------------------------------------------------------------------------------------------------------------

let DIRSEP = "/";
if (platform.isWin)
	DIRSEP = "\\";

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
let mainWindow = null;

let window_open = false;
let appIcon = null;
//----------------------------------------------------------------------------------------------------------------------

let App = {
	ready: () => {
		mainWindow = require('./main-window');
		
		function toggleWindow() {
			mainWindow.show();
		}
		
		if (platform.isWin || platform.isLinux) {
			appIcon = new Tray(APPPATH + DIRSEP + 'icon.png');
			let contextMenu = Menu.buildFromTemplate([
				{label: 'Show', click: toggleWindow},
				{label: 'Exit', click: App.exit}
			]);
			appIcon.setContextMenu(contextMenu);
			appIcon.setToolTip('Hyperkeys');
			appIcon.on('double-clicked', toggleWindow);
			appIcon.on('clicked', toggleWindow);
		}
		
		let macros;
		macrosProvider.loadMacros()
		.then(_macros => {
			macros = _macros;
			ipcService.start(macros, extensionsMetadata);
		})
		.catch(e => {
			console.error(e);
			app.quit();
			app.exit(1);
		});
		
		//TODO remove this toggleWindow()
		toggleWindow();
	},
	
	exit: () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
		
		//Unregister all shortcuts.
		globalShortcut.unregisterAll();
		
		//Destroy the app icon
		if (appIcon != null) {
			appIcon.destroy();
		}
		
		app.quit();
		app.exit(0);
	}
};

module.exports = App;