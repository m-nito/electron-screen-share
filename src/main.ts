import * as url from "url";
import * as path from "path";
import {
  app,
  BrowserWindow,
  Menu,
  MenuItem,
  shell,
  ipcMain,
  desktopCapturer,
  ipcRenderer,
} from "electron";
import electronLocalshortcut = require("electron-localshortcut");
let fs = require("fs");

let mainWindow: Electron.BrowserWindow;
const menu = new Menu();

// SET ENV
process.env.NODE_ENV = "development";
app.allowRendererProcessReuse = true;

const onClose = (event) => {
  event.preventDefault();
  mainWindow.webContents.send("closing");
};

const onReady = () => {
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: true },
  });

  // load html
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "main.html"),
      protocol: "file",
      slashes: true,
    })
  );

  // Quit app when closed
  mainWindow.on("close", onClose);

  ipcMain.on("showSourceSelector", (event, options) => {
    mainWindow.webContents.send("showSourceSelector", options);
  });
  ipcMain.on("sourceSelected", (event, sourceId) => {
    mainWindow
      .loadURL(
        url.format({
          pathname: path.join(__dirname, "loading.html"),
          protocol: "file",
          slashes: true,
        })
      )
      .then(() => {
        mainWindow.webContents.send("sourceSelected", sourceId);
      });
  });
  ipcMain.on("close", onClose);
  ipcMain.on("closed", () => {
    mainWindow.destroy();
    app.quit();
  });

  // shortcut keys
  electronLocalshortcut.register(mainWindow, "F12", () => {
    if (process.env.NODE_ENV == "development")
      mainWindow.webContents.toggleDevTools();
  });
};
// Listen for app to be ready
app.on("ready", onReady);
