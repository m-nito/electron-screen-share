class FBDatabase {
    _database;
    _myBroadcast;
    _myClient;
    _channelId;
    _clientId;
    _myBroadcast;
    _myClient;
    _broadcastId;
    constructor (api){
        firebase.initializeApp({apiKey: api.apiKey, databaseURL: api.databaseURL});
        this._database = firebase.database();
        this._databaseRoot = 'origin/';
        this._channelId = 'channel';
        // client
        this._clientId = this.query('/_join_').push({ joined: 'unknown'}).key
        if (!this._clientId) console.error("failed to get client id.");
        this.query('/_join_/' + this._clientId).update({ joined: this._clientId});
        this.query('/_join_/' + this._clientId).remove();
        // broadcast
        this._myBroadcast = this.query('/_broadcast_/');
        // client
        this._myClient = this.query('/_direct_/' + this._clientId);
        // call
        this._myBroadcast.once('value', parent => {
            if (parent.numChildren() > 0) return;
            this._broadcastId = this._myBroadcast.push({type: 'call', from: this._clientId}).key;
        });
    }
    query(arg){
        let q = this._databaseRoot + this._channelId + arg;
        return this._database.ref(q);
    }
    pushToClient(id, message){
        this.query('/_direct_/' + id).push(message);
    }
    clearFromClient(id, dataKey){
        this.query('/_direct_/' + id + '/' + dataKey).remove();
    }
    clearBroadcast(){
        this.query('/_broadcast_/' + this._broadcastId).remove();
    }
}
module.exports = FBDatabase;