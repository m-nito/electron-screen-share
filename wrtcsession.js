const FBDatabase = require('./fbdatabase')

class WRTCSession{
    _database = null;
    _peerConnections = [];
    _clientId;
    _myBroadcast;
    _myVideo;
    _onReadyCallback;
    _onLog;
    _onEndConnection;
    constructor(myVid, api){
        this._database = new FBDatabase(api);
        this._clientId = this._database._clientId;
        this._myBroadcast = this._database._myBroadcast;
        this._myVideo = myVid;
        this._database._myBroadcast.on('child_added', this.onBroadcastChildAdded);
        this._database._myClient.on('child_added', this.onClientChildAdded);
    }
    onBroadcastChildAdded = (data) =>{
        let message = data.val();
        // do nothing when it's from self
        if (this._clientId === message.from) return;
        console.log("Detected new broadcast.");
        // end connection if message was bye
        if (message.type === 'bye'){
            if (!this._peerConnections[message.from]) return;
            stopConnection();
            return;
        }
        // do nothing when it's not call
        if (!message.type === 'call') return;
        // not ready
        if (!this._myVideo){
            console.error("My Video is not set.");
            return;
        }
        if (!this._myBroadcast) {
            console.error("MyBroadcast is not set.");
            return;
        }
        // too many connections
        if (this._peerConnections.length > 2) return;
        // already connected
        if (this._peerConnections[message.from]) return;
        this.SendOffer(message.from);
    }
    onClientChildAdded = (data) =>{
        let message = data.val();
        switch(message.type){
            case "offer":{
                this.ReceiveOffer(message.from, new RTCSessionDescription(message));
                break;
            }
            case "answer":{
                this.ReceiveAnswer(message.from, new RTCSessionDescription(message));
                break;
            }
            case "candidate":{
                let cand = JSON.parse(message.ice);
                this.addIceCandidate(message.from, new RTCIceCandidate(cand));
                break;
            }
        }
        // clear message
        this._database.clearFromClient(this._clientId, data.key);
    }
    SendOffer = (streamerId) => {
        console.log("SendOffer called. Streamer id is "+ streamerId);
        if (this._peerConnections[streamerId]){
            console.error("connection already exists.");
            return;
        }
        let peer = this.newConnection(streamerId);
        this._peerConnections[streamerId] = peer;
        peer.createOffer().then((desc) => {
            return peer.setLocalDescription(desc);
        }).then(()=>{
            let message = {type: peer.localDescription.type, sdp: peer.localDescription.sdp};
            message.from = this._clientId;
            this._database.pushToClient(streamerId, message);
            this._onLog('sendOffer');
        }).catch((err) =>{
            console.error(err);
        });
    }
    ReceiveOffer = (listnerId, desc) =>{
        console.log("ReceiveOffer called. Listener id is "+ listnerId);
        let peer = this.newConnection(listnerId);
        this._peerConnections[listnerId] = peer;
        peer.setRemoteDescription(desc).then(() =>{
            console.log("set offer: set remote desc done.");
            this.SendAnswer(listnerId);
            this._onLog('receiveAnswer');
        }).catch((err) => {
            console.error(err);
        });
    }
    SendAnswer = (listenerId) =>{
        console.log("SendAnswer answer called. Listner id is " + listenerId)
        let peer = this._peerConnections[listenerId];
        if (!peer){
            console.error('getConnection() peer must exist');
            return;
        }
        // make answer
        peer.createAnswer().then((desc) =>{
            return peer.setLocalDescription(desc);
        }).then(() =>{
            let message = {type: peer.localDescription.type, sdp: peer.localDescription.sdp};
            message.from = this._clientId;
            this._database.pushToClient(listenerId, message);
            this._onLog('sendAnswer');
        }).catch((err) =>{
            console.error(err);
        });
    }
    ReceiveAnswer = (streamerId, desc) =>{
        console.log("ReceiveAnswer called. id is " + streamerId);
        let peer = this._peerConnections[streamerId];
        if (!peer){
            console.error('getConnection() peer must exist');
            return;
        }
        peer.setRemoteDescription(desc).then(()=>{
            this._onLog('receiveAnswer');
        }).catch((err) =>{
            console.error(err);
        });
    }
    newConnection = (id) => {
        let conf = {"iceServers":[
            {"urls": "stun:stun.l.google.com:19302"},
            {"urls": "stun:stun1.l.google.com:19302"},
            {"urls": "stun:stun2.l.google.com:19302"}
        ]};
        let temp = this._onLog;
        let peer = new RTCPeerConnection(conf);
        if ('ontrack' in peer){
            peer.ontrack = (event) =>{
                console.log("on track");
                let stream = event.streams[0];
                this._onReadyCallback(stream);
            }
        }
        else {
            peer.onaddstream = (event) =>{
                let stream = event.stream;
                console.log("on add stream");
                this._onReadyCallback(stream);
            }
        }
        peer.onicecandidate = (event) =>{
            if (event.candidate) {
                this.sendIceCandidate(id, event.candidate);
            }
            else return;
        }
        // --- when need to exchange SDP ---
        peer.onnegotiationneeded = function(event) {
            console.log('-- onnegotiationneeded() ---');
        };
    
        // --- other events ----
        peer.onicecandidateerror = function (event) {
            console.error('ICE candidate ERROR:', event);
        };
    
        peer.onsignalingstatechange = function() {
            console.log('== signaling status=' + peer.signalingState);
        };
    
        peer.oniceconnectionstatechange = () => {
            console.log('== ice connection status=' + peer.iceConnectionState);
            if (peer.iceConnectionState === 'disconnected') {
                console.log('-- disconnected --');
                // stopConnection(id);
                temp('endConnection');
            }
        };
    
        peer.onicegatheringstatechange = function() {
            console.log('==***== ice gathering state=' + peer.iceGatheringState);
        };
    
        peer.onconnectionstatechange = function() {
            console.log('==***== connection state=' + peer.connectionState);
        };
    
        peer.onremovestream = function(event) {
            console.log('-- peer.onremovestream()');
            // deleteRemoteStream(id);
            // detachVideo(id);
        };
    
        // -- add local stream --
        if (_myVideo) {
            console.log('Adding My Stream.');
            peer.addStream(_myVideo);
        }
        else {
            console.warn('no local stream, but continue.');
        }
        return peer;
    }
    addIceCandidate = (id, cand) =>{
        let conn = this._peerConnections[id];
        if (!conn || !conn.remoteDescription) return;
        conn.addIceCandidate(cand);
    }
    sendIceCandidate = (to, cand) =>{
        let message = {type: 'candidate', ice: JSON.stringify(cand)};
        message.from = this._clientId;
        this._database.pushToClient(to, message);
    }
    onClose(){
        if (this._database && this._myBroadcast && this._clientId){
            this._database.clearBroadcast();
        }
    }
}
module.exports = WRTCSession;