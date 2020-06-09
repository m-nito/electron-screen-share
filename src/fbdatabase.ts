import * as firebase from "firebase";

const DatabaseRoot = "origin/";
const ChannelId = "channel";
export default class FBDatabase {
  Database: firebase.database.Database;
  BroadcastRef: firebase.database.Reference;
  ClientRef: firebase.database.Reference;
  ClientId: string;
  BroadcastId: string;
  constructor(api) {
    firebase.initializeApp(api);
    this.Database = firebase.database();
    this.Setup();
  }
  Setup() {
    // client id
    this.ClientId = this.query("/_join_")
      .push({ joined: "unknown" })
      .key.toString();
    this.query("/_join_/" + this.ClientId).update({
      joined: this.ClientId,
    });
    this.query("/_join_/" + this.ClientId).remove();

    // client
    this.ClientRef = this.query("/_direct_/" + this.ClientId);

    // broadcast
    this.BroadcastRef = this.query("/_broadcast_/");

    // call
    this.BroadcastRef.once("value", (parent) => {
      if (parent.numChildren() > 0) return;
      this.BroadcastId = this.BroadcastRef.push({
        type: "call",
        from: this.ClientId,
      }).key;
    });
  }
  /**
   * Make query.
   * @param {*} arg
   */
  query(arg): firebase.database.Reference {
    return this.Database.ref(DatabaseRoot + ChannelId + arg);
  }
  pushToClient(id, message) {
    this.query("/_direct_/" + id).push(message);
  }
  clearFromClient(id, dataKey) {
    this.query(`/_direct_/${id}/${dataKey}`).remove();
  }
  clearBroadcast() {
    this.query("/_broadcast_/" + this.BroadcastId).remove();
  }
}
