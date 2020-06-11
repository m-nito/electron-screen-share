import { ipcRenderer } from "electron";
import WRTCSession from "./wrtcsession";
import fs = require("fs");
import { EVT_CLOSING, EVT_APP_CLOSE, EVT_SRC_SELECTED } from "./eventMessages";

/**
 * Current user video.
 */
let MyVideo: MediaStreamTrack;

/**
 * Current WebRTC Session.
 */
let MySession: WRTCSession;

/**
 * Event on app-close.
 */
const onClose = () => {
  if (MySession) {
    MySession.onClose();
  }
  ipcRenderer.send("closed");
};

/**
 * Toggle loading state.
 * @param loading True if loading.
 */
const toggleLoading = (loading: boolean) => {
  let elem = <HTMLElement>document.querySelector(".loader");
  elem.style.display = loading ? "block" : "none";
};

/**
 * Show log message.
 * @param text Message to show.
 */
const showLog = (text: string) => {
  let parent = document.querySelector(".video-overlay");
  parent.innerHTML = "";
  let message = document.createTextNode(text);
  parent.appendChild(message);
};

/**
 * Handle message.
 * @param msg message key.
 */
const onMessage = (msg: string) => {
  switch (msg) {
    case "start":
      showLog("通信の準備を行っています...");
      break;
    case "waitingForPeer":
      showLog("通信相手を探しています...");
      break;
    case "sendOffer":
      showLog("通信相手との接続を確立しています...");
      break;
    case "receiveOffer":
      showLog("通信相手との接続を確立しています...");
      break;
    case "sendAnswer":
      showLog("");
      break;
    case "receiveAnswer":
      showLog("");
      break;
    case "endConnection":
      showLog(
        "通信相手との接続が終了しました。アプリケーションを終了します..."
      );
      setTimeout(() => {
        ipcRenderer.send(EVT_APP_CLOSE);
      }, 5000);
      break;
    case "jsonError":
      showLog(
        "conf.jsonの読み込みに失敗しました。アプリケーションを終了します..."
      );
      setTimeout(() => {
        ipcRenderer.send(EVT_APP_CLOSE);
      }, 5000);
      break;
    default:
      break;
  }
};

/**
 *Loads json.
 */
const loadJson = () => {
  let path = "./conf.json";
  let enc = "utf8";
  if (!fs.existsSync(path)) {
    try {
      fs.writeFileSync(
        path,
        JSON.stringify({
          apiKey: "",
          authDomain: "",
          databaseURL: "",
          projectId: "",
          storageBucket: "",
          messagingSenderId: "",
          appId: "",
          measurementId: "",
        }),
        enc
      );
    } catch (err) {
      console.error(err);
    }
  }
  let getApi = () => {
    let conf = fs.readFileSync(path, enc);
    try {
      let parsed = JSON.parse(conf);
      return parsed;
    } catch (err) {
      console.error(err);
      return null;
    }
  };
  let api = getApi();
  if (!api || !api.apiKey || !api.databaseURL) {
    onMessage("jsonError");
    return null;
  }
  return api;
};

/**
 * Starts session.
 * @param stream Stream of user video.
 */
const initSession = (stream: MediaStreamTrack) => {
  MyVideo = stream;
  stream.onended = () => {
    console.log("Media stream ended.");
  };
  let api = loadJson();
  if (!api) return;
  MySession = new WRTCSession(MyVideo, api);
  MySession.OnLog = onMessage;
  onMessage("waitingForPeer");
  MySession.OnReadyCallback = (stream) => {
    let vid = document.createElement("video");
    let cont = document.querySelector(".outer-container");
    vid.className = "video";
    cont.appendChild(vid);
    vid.srcObject = stream;
    vid.autoplay = true;
    toggleLoading(false);
  };
};

/**
 * Register an event on source selection.
 */
ipcRenderer.on(EVT_SRC_SELECTED, (event, source) => {
  let sourceId = source.id;
  toggleLoading(true);
  if (!sourceId) return;
  onMessage("start");
  let n = <any>navigator;
  n.webkitGetUserMedia(
    // constraints
    {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId,
          maxWidth: window.screen.width,
          maxHeight: window.screen.height,
        },
      },
    },
    // successCallback
    initSession,
    // errorCallback
    () => {
      console.log("getUserMedia() failed.");
    }
  );
  ipcRenderer.on(EVT_CLOSING, onClose);
});
