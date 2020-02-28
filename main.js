const electron = require('electron');
const url = require('url')
const path = require('path')
const { app, BrowserWindow, Menu, MenuItem, shell, ipcMain, desktopCapturer, ipcRenderer } = electron;
let mainWindow;
const menu = new Menu();
let fs = require('fs')

// SET ENV
process.env.NODE_ENV = 'development';
app.allowRendererProcessReuse = true;

const onClose = (event) =>{
    event.preventDefault();
    mainWindow.webContents.send('closing');
}

const onReady = () =>{
    mainWindow = new BrowserWindow({
        autoHideMenuBar: true,
        webPreferences: {nodeIntegration: true}
    });

    // load html
    mainWindow.loadURL(url.format({ pathname: path.join(__dirname, 'main.html'), protocol: 'file', slashes: true }));
    
    // Quit app when closed
    mainWindow.on('close', onClose);

    ipcMain.on('showSourceSelector', (event, options)=>{
        mainWindow.webContents.send('showSourceSelector', options);
    });
    ipcMain.on('sourceSelected', (event, sourceId)=>{
        mainWindow.loadURL(url.format({ pathname: path.join(__dirname, 'loading.html'), protocol: 'file', slashes: true })).then(()=>{
            mainWindow.webContents.send('sourceSelected', sourceId);
        });
    });
    ipcMain.on('close', onClose);
    ipcMain.on('closed', ()=>{
        mainWindow.destroy();
        app.quit();
    });
    // shortcut key
    const mainMenu = Menu.buildFromTemplate(
        [{
            label: 'Dev Tools',
            accelerator: process.platform == 'darwin' ? 'Command+D' :'Ctrl+D',
            click(){ if (process.env.NODE_ENV == "development") mainWindow.toggleDevTools(); }
        }]
    );
    Menu.setApplicationMenu(mainMenu);
}

// Listen for app to be ready
app.on('ready', onReady);

