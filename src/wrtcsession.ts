import FBDatabase from "./fbdatabase";

interface WRTCMessage {
  from: string;
  type: string;
}

export default class WRTCSession {
  _database: FBDatabase;
  PeerConnections = [];
  ClientId;
  _myBroadcast;
  MyVideo: MediaStream;
  OnReadyCallback;
  OnLog;
  _onEndConnection;

  /**
   * ctor.
   * @param myVid
   * @param api
   */
  constructor(myVid, api) {
    this._database = new FBDatabase(api);
    this.ClientId = this._database.ClientId;
    this._myBroadcast = this._database.BroadcastRef;
    this.MyVideo = myVid;
    this._database.BroadcastRef.on("child_added", this.OnBroadcastChildAdded);
    this._database.ClientRef.on("child_added", this.OnSignalingMessage);
    console.log("database initialized. my id is" + this.ClientId);
  }

  /**
   * Send a offer when a possible candidate of listener is added,
   */
  OnBroadcastChildAdded = (data) => {
    let message = <WRTCMessage>data.val();

    // do nothing when it's from self
    if (this.ClientId === message.from) return;
    console.log("Detected new broadcast.");

    // end connection if message was bye
    if (message.type === "bye") {
      if (!this.PeerConnections[message.from]) return;
      // this.stopConnection();
      return;
    }
    // do nothing when it's not call
    if (message.type !== "call") return;

    // not ready
    if (!this.MyVideo) {
      console.error("My Video is not set.");
      return;
    }
    if (!this._myBroadcast) {
      console.error("MyBroadcast is not set.");
      return;
    }
    // too many connections
    if (this.PeerConnections.length > 2) return;

    // already connected
    if (this.PeerConnections[message.from]) return;
    this.SendOffer(message.from);
  };

  /**
   *
   */
  OnSignalingMessage = (data) => {
    let message = data.val();
    switch (message.type) {
      case "offer": {
        this.ReceiveOffer(message.from, new RTCSessionDescription(message));
        break;
      }
      case "answer": {
        this.ReceiveAnswer(message.from, new RTCSessionDescription(message));
        break;
      }
      case "candidate": {
        let cand = JSON.parse(message.ice);
        this.addIceCandidate(message.from, new RTCIceCandidate(cand));
        break;
      }
    }
    // clear message
    this._database.clearFromClient(this.ClientId, data.key);
  };

  /**
   * Send offer as host.
   */
  SendOffer = (streamerId) => {
    console.log("SendOffer called. Streamer id is " + streamerId);
    if (this.PeerConnections[streamerId]) {
      console.error("connection already exists.");
      return;
    }
    let peer = this.newConnection(streamerId);
    this.PeerConnections[streamerId] = peer;
    peer
      .createOffer()
      .then((desc) => {
        return peer.setLocalDescription(desc);
      })
      .then(() => {
        let message = {
          type: peer.localDescription.type,
          sdp: peer.localDescription.sdp,
          from: this.ClientId,
        };
        this._database.pushToClient(streamerId, message);
        this.OnLog("sendOffer");
      })
      .catch((err) => {
        console.error(err);
      });
  };

  /**
   * Receive offer as a peer.
   */
  ReceiveOffer = (listnerId, desc) => {
    console.log("ReceiveOffer called. Listener id is " + listnerId);
    let peer = this.newConnection(listnerId);
    this.PeerConnections[listnerId] = peer;
    peer
      .setRemoteDescription(desc)
      .then(() => {
        console.log("set offer: set remote desc done.");
        this.SendAnswer(listnerId);
        this.OnLog("receiveAnswer");
      })
      .catch((err) => {
        console.error(err);
      });
  };

  /**
   * Send answer as a peer.
   */
  SendAnswer = (listenerId) => {
    console.log("SendAnswer answer called. Listner id is " + listenerId);
    let peer: RTCPeerConnection = this.PeerConnections[listenerId];
    if (!peer) {
      console.error("getConnection() peer must exist");
      return;
    }
    // make answer
    peer
      .createAnswer()
      .then((desc) => {
        return peer.setLocalDescription(desc);
      })
      .then(() => {
        let message = {
          type: peer.localDescription.type,
          sdp: peer.localDescription.sdp,
          from: this.ClientId,
        };
        this._database.pushToClient(listenerId, message);
        this.OnLog("sendAnswer");
      })
      .catch((err) => {
        console.error(err);
      });
  };

  /**
   * Receive answer as a host.
   */
  ReceiveAnswer = (streamerId, desc) => {
    console.log("ReceiveAnswer called. id is " + streamerId);
    let peer: RTCPeerConnection = this.PeerConnections[streamerId];
    if (!peer) {
      console.error("getConnection() peer must exist");
      return;
    }
    console.warn("trying to set remote desc.");
    peer
      .setRemoteDescription(desc)
      .then(() => {
        console.warn("set remote desc done. trying to add track.");
        this.OnLog("receiveAnswer");
      })
      .catch((err) => {
        console.error(err);
      });
  };

  /**
   * Creates new connection.
   */
  newConnection = (id) => {
    let conf = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    };
    let temp = this.OnLog;
    let peer = new RTCPeerConnection(conf);
    let inbound = null;
    peer.addTrack(this.MyVideo.getTracks()[0], this.MyVideo);
    peer.ontrack = (ev) => {
      console.log("peer.ontrack");
      if (ev.streams && ev.streams[0]) {
        console.log("using normal ontrack event.");
        let stream = ev.streams[0];
        this.OnReadyCallback(stream);
      } else {
        if (!inbound) {
          console.log("using inbound ontrack event.");
          inbound = new MediaStream();
          inbound.addTrack(ev.track);
          this.OnReadyCallback(inbound);
        }
      }
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendIceCandidate(id, event.candidate);
      } else return;
    };
    // --- when need to exchange SDP ---
    peer.onnegotiationneeded = function (event) {
      console.log(`onnegotiationneeded()`);
    };

    // --- other events ----
    peer.onicecandidateerror = function (event) {
      console.error("ICE candidate ERROR:", event);
    };

    peer.onsignalingstatechange = function () {
      console.log("== signaling status=" + peer.signalingState);
    };

    peer.oniceconnectionstatechange = () => {
      console.log("== ice connection status=" + peer.iceConnectionState);
      if (peer.iceConnectionState === "disconnected") {
        console.log("-- disconnected --");
        // stopConnection(id);
        temp("endConnection");
      }
    };

    peer.onicegatheringstatechange = function () {
      console.log("==***== ice gathering state=" + peer.iceGatheringState);
    };

    peer.onconnectionstatechange = function () {
      console.log("==***== connection state=" + peer.connectionState);
    };
    return peer;
  };
  addIceCandidate = (id, cand) => {
    console.log("add ice cand.");
    let conn = this.PeerConnections[id];
    if (!conn || !conn.remoteDescription) return;
    conn.addIceCandidate(cand);
  };
  sendIceCandidate = (to, cand) => {
    console.log("send ice cand.");
    let message = {
      type: "candidate",
      ice: JSON.stringify(cand),
      from: this.ClientId,
    };
    this._database.pushToClient(to, message);
  };
  onClose() {
    if (this._database && this._myBroadcast && this.ClientId) {
      this._database.clearBroadcast();
    }
  }
}
