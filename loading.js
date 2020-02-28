const { ipcRenderer } = require('electron')
const WRTCSession = require('./wrtcsession')
const FBDatabase = require('./fbdatabase')
const fs = require('fs');

let _myVideo;
let _mySession;

const toggleLoading = (loading) => {
    if (loading){
        document.querySelector(".loader").style.display = "block";
    }else{
        document.querySelector(".loader").style.display = "none";
    }
}
const onClose = () =>{
  if (_mySession) { _mySession.onClose(); }
  ipcRenderer.send('closed');
}
const log = (text) =>{
  let parent = document.querySelector('.video-overlay');
  parent.innerHTML = '';
  let message = document.createTextNode(text);
  parent.appendChild(message);
}
const onMessage = (msg) =>{
  switch(msg){
    case 'start':
        log("通信の準備を行っています...");
        break;
    case 'waitingForPeer':
        log("通信相手を探しています...");
        break;
    case 'sendOffer':
      log("通信相手との接続を確立しています...");
      break;
    case 'receiveOffer':
      log("通信相手との接続を確立しています...");
      break;
    case 'sendAnswer':
      log("");
      break;
    case 'receiveAnswer':
      log("");
      break;
    case 'endConnection':
      log('通信相手との接続が終了しました。アプリケーションを終了します...');
      setTimeout(()=>{ ipcRenderer.send('close') }, 5000);
      break;
    case 'jsonError':
      log('conf.jsonの読み込みに失敗しました。アプリケーションを終了します...');
      setTimeout(()=>{ ipcRenderer.send('close') }, 5000);
      break;
    default:
      break;
  }
}
 const loadJson = () => {
  let path = './conf.json';
  let enc = 'utf8';
   if (!fs.existsSync(path)){
    try { fs.writeFileSync(path, JSON.stringify({apiKey: "", databaseURL: ""}), enc); }
    catch(err) { console.error(err); }
   }
  let getApi = () => {
    let conf = fs.readFileSync(path, enc);
    try {
      let parsed = JSON.parse(conf);
      return parsed;
    }
    catch(err) {
      console.error(err);
      return null;
    }
  }
  let api = getApi();
  if (!api || !api.apiKey || !api.databaseURL){
    onMessage('jsonError');
    return null;
  }
  return api;
 }
ipcRenderer.on('sourceSelected', (event, sourceId) => {
    toggleLoading(true);
    if (!sourceId) return;
    onMessage('start');
    navigator.webkitGetUserMedia(
        // constraints
        {
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              maxWidth: window.screen.width,
              maxHeight: window.screen.height
            }
          }
        },
        //successCallback
        (stream) =>{
            _myVideo = stream;
            stream.onended = () => { console.log('Media stream ended.') }
            let api = loadJson();
            if (!api) return;
            _mySession = new WRTCSession(_myVideo, api);
            _mySession._onLog = onMessage;
            onMessage('waitingForPeer');
            _mySession._onReadyCallback = (stream) =>{
                let vid = document.createElement('video');
                let cont = document.querySelector('.outer-container');
                vid.className = 'video';
                cont.appendChild(vid);
                vid.srcObject = stream;
                vid.autoplay = true;
                toggleLoading(false);
            };
        },
        // errorCallback
        () => { console.log('getUserMedia() failed.'); }
      );
      ipcRenderer.on('closing', onClose);
})