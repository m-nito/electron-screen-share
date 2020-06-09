import { ipcRenderer } from "electron";
import WRTCSession from "./wrtcsession";
import fs = require("fs");
import { EVT_CLOSING, EVT_APP_CLOSE, EVT_SRC_SELECTED } from "./eventMessages";

let MyVideo: MediaStreamTrack;
let MySession: WRTCSession;

const toggleLoading = (loading) => {
  let elem = <HTMLElement>document.querySelector(".loader");
  elem.style.display = loading ? "block" : "none";
};
const onClose = () => {
  if (MySession) {
    MySession.onClose();
  }
  ipcRenderer.send("closed");
};
const log = (text) => {
  let parent = document.querySelector(".video-overlay");
  parent.innerHTML = "";
  let message = document.createTextNode(text);
  parent.appendChild(message);
};
const onMessage = (msg: string) => {
  switch (msg) {
    case "start":
      log("通信の準備を行っています...");
      break;
    case "waitingForPeer":
      log("通信相手を探しています...");
      break;
    case "sendOffer":
      log("通信相手との接続を確立しています...");
      break;
    case "receiveOffer":
      log("通信相手との接続を確立しています...");
      break;
    case "sendAnswer":
      log("");
      break;
    case "receiveAnswer":
      log("");
      break;
    case "endConnection":
      log("通信相手との接続が終了しました。アプリケーションを終了します...");
      setTimeout(() => {
        ipcRenderer.send(EVT_APP_CLOSE);
      }, 5000);
      break;
    case "jsonError":
      log("conf.jsonの読み込みに失敗しました。アプリケーションを終了します...");
      setTimeout(() => {
        ipcRenderer.send(EVT_APP_CLOSE);
      }, 5000);
      break;
    default:
      break;
  }
};
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
    //successCallback
    (myStream) => {
      MyVideo = myStream;
      myStream.onended = () => {
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
    },
    // errorCallback
    () => {
      console.log("getUserMedia() failed.");
    }
  );
  ipcRenderer.on(EVT_CLOSING, onClose);
});
