const {app, BrowserWindow, globalShortcut, clipboard, Menu, Tray} = require('electron');
const ipc = require("electron").ipcMain;
const {exec} = require('child_process');
const debug = require('debug')('app');
console.log(app.getPath('userData'));
//----------------------------------------------------------------------------------------------------------------------

const platform = require('hyperkeys-api').platform;
const macrosProvider = require('./providers/macros-provider');
const keybindsService = require('./services/keybinds-service');
const actionsService = require('./services/actions-service');
//----------------------------------------------------------------------------------------------------------------------

const extensions = require('../extensions');
for (let iextension in extensions) {
	var extension = extensions[iextension];
	for (let action of extension.actions) {
		actionsService.registerActionFactory(action.name, action.factory);
	}
}
//----------------------------------------------------------------------------------------------------------------------

debug("platform:", platform.name);
const APPPATH = __dirname;
debug("APPPATH:", APPPATH);
var DIRSEP = "/";
if (platform.isWin)
	DIRSEP = "\\";

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;

var window_open = false;
var window_focus = false;
var appIcon = null;
//----------------------------------------------------------------------------------------------------------------------

function toggleWindow() {
	if (window_open && window_focus) {
		mainWindow.hide();
		window_open = false;
	}
	else {
		if (!window_open) {
			mainWindow.show();
			mainWindow.restore();
			mainWindow.webContents.send('openWindow', {"APPPATH": APPPATH});
		}
		window_open = true;
		mainWindow.focus();
		
		//LINUX - force focus on the window, even if Gnome Shell is messing up with the focus
		if (platform.isLinux)
			exec('wmctrl -v -F -a "Snippr"', function callback(error, stdout, stderr) {
			});
	}
}
//----------------------------------------------------------------------------------------------------------------------

var App = {
	ready: () => {
		if (platform.isWin || platform.isLinux) {
			appIcon = new Tray(APPPATH + DIRSEP + 'icon.png');
			var contextMenu = Menu.buildFromTemplate([
				{label: 'Show', click: toggleWindow},
				{label: 'Exit', click: App.exit}
			]);
			appIcon.setContextMenu(contextMenu);
			appIcon.setToolTip('Snippr | Press ALT+S to open');
			appIcon.on('double-clicked', toggleWindow);
			appIcon.on('clicked', toggleWindow);
		}
		
		// Create the browser window.
		mainWindow = new BrowserWindow({width: 1024, height: 768, show: false});
		mainWindow.setMenu(null);
		// and load the index.html of the app
		mainWindow.loadURL('file://' + __dirname + '/index.html');
		
		//mainWindow.openDevTools();
		
		var macros;
		macrosProvider.loadMacros()
		.then(_macros => {
			try {
				macros = _macros;
				for (let macro of macros) {
					for (let action of Object.keys(macro.shortcuts)) {
						let shortcut = macro.shortcuts[action];
						keybindsService.registerKey({key: shortcut, action: {name: action, options: macro.options}});
					}
				}
			}
			catch (e) {
				console.error(e);
			}
		})
		.catch(e => console.error(e));
		
		ipc.on('request_macros', function (event, arg) {
			mainWindow.webContents.send('macros', macros);
		});
		
		ipc.on('login', function (event, arg) {
			
		});
		
		ipc.on('copy', function (event, arg) {
			clipboard.writeText(arg);
		});
		ipc.on('close', function (event, arg) {
			mainWindow.hide();
			window_open = false;
		});
		
		ipc.on('devtools', function (event, arg) {
			mainWindow.toggleDevTools();
		});
		
		mainWindow.on('blur', function (e) {
			window_focus = false;
		});
		mainWindow.on('focus', function (e) {
			window_focus = true;
		});
		
		// Emitted when the window is closed.
		mainWindow.on('close', function (e) {
			if (mainWindow != null) {
				e.preventDefault();
				mainWindow.hide();
				window_open = false;
			}
		});
		
		//TODO remove this toggleWindow()
		toggleWindow();
		mainWindow.toggleDevTools();
	},
	
	exit: () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
		
		//Unregister all shortcuts.
		globalShortcut.unregisterAll();
		
		//Destroy the app icon
		if (appIcon != null)
			appIcon.destroy();
		
		app.quit();
	}
};

module.exports = App;