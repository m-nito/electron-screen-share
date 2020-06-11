import * as firebase from "firebase";

const DatabaseRoot = "origin/";
const ChannelId = "channel";

/**
 * Class for Firebase-Database.
 */
export default class FBDatabase {
  Database: firebase.database.Database;
  BroadcastRef: firebase.database.Reference;
  ClientRef: firebase.database.Reference;
  ClientId: string;
  BroadcastId: string;

  /**
   * .ctor
   * @param api Api data required for firebase-database.
   */
  constructor(api) {
    firebase.initializeApp(api);
    this.Database = firebase.database();
    this.Setup();
  }

  /**
   * Sets initial state.
   */
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

  /**
   * push message to client table.
   * @param id
   * @param message
   */
  pushToClient(id, message) {
    this.query("/_direct_/" + id).push(message);
  }

  /**
   * Clears data from client table.
   * @param id
   * @param dataKey
   */
  clearFromClient(id, dataKey) {
    this.query(`/_direct_/${id}/${dataKey}`).remove();
  }

  /**
   * Clear current broadcast record.
   */
  clearBroadcast() {
    this.query("/_broadcast_/" + this.BroadcastId).remove();
  }
}
