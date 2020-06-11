import * as url from "url";
import * as path from "path";
import { app, BrowserWindow, ipcMain } from "electron";
import electronLocalshortcut = require("electron-localshortcut");
import {
  EVT_CLOSING,
  EVT_APP_CLOSE,
  EVT_APP_READY,
  EVT_SHOW_SELECTOR,
  EVT_SRC_SELECTED,
} from "./eventMessages";

/**
 * Main window of this app.
 */
let mainWindow: Electron.BrowserWindow;

// SET ENV
process.env.NODE_ENV = "development";
app.allowRendererProcessReuse = true;

/**
 * Event on app-close.
 * @param event
 */
const onClose = (event) => {
  event.preventDefault();
  mainWindow.webContents.send(EVT_CLOSING);
};

/**
 * Event on app-ready.
 * Creates mainwindow and load main.html.
 */
const onReady = () => {
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: true },
  });
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "main.html"),
      protocol: "file",
      slashes: true,
    })
  );

  // Quit app when closed
  mainWindow.on(EVT_APP_CLOSE, onClose);

  // On capture.ts is ready (or on refresh event of it), relay message to capture.ts.
  ipcMain.on(EVT_SHOW_SELECTOR, (event, options) => {
    mainWindow.webContents.send(EVT_SHOW_SELECTOR, options);
  });

  // When source is selected, toggle to loading.html
  ipcMain.on(EVT_SRC_SELECTED, (event, sourceId) => {
    mainWindow
      .loadURL(
        url.format({
          pathname: path.join(__dirname, "loading.html"),
          protocol: "file",
          slashes: true,
        })
      )
      .then(() => {
        mainWindow.webContents.send(EVT_SRC_SELECTED, sourceId);
      });
  });

  // register onClose method.
  ipcMain.on(EVT_APP_CLOSE, onClose);
  ipcMain.on("closed", () => {
    mainWindow.destroy();
    app.quit();
  });

  // Register shortcut keys
  electronLocalshortcut.register(mainWindow, "F12", () => {
    if (process.env.NODE_ENV == "development")
      mainWindow.webContents.toggleDevTools();
  });
};
// Listen for app to be ready
app.on(EVT_APP_READY, onReady);
