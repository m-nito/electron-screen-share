import { ipcRenderer, IpcRendererEvent } from "electron";
import WRTCSession from "./wrtcsession";
import loadJson from "./configHandler";
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
 * Starts session.
 * @param myStream Stream of user video.
 */
const initSession = (myStream: MediaStreamTrack) => {
  MyVideo = myStream;
  myStream.onended = () => {
    console.log("Media stream ended.");
  };
  let api = loadJson();
  if (!api || !api.apiKey || !api.databaseURL) {
    onMessage("jsonError");
    return;
  }
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
ipcRenderer.on(EVT_SRC_SELECTED, (event: IpcRendererEvent, source) => {
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
