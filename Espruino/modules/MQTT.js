/*
 * tinyMQTT.js
 * Stripped out MQTT module that does basic PUB/SUB
 * Intended for devices running Espruino, particularly the ESP8266
 * Ollie Phillips 2015
 * MIT License
 * Modified by Thorsten von Eicken 2015
*/

var MQTT = function(server){
  this.server = server;
};
var sfcc = String.fromCharCode;
var data = "";
var _p = MQTT.prototype;

// event handler receiving data
function mqEv(d) {
  data += d;
  while (data.length > 2) {
    var dcca = data.charCodeAt.bind(data);

    var cmd = dcca(0);
    // determine total packet length
    var i=1, len = dcca(i++);
    if (len > 127) len = (len&0x7F) | (dcca(i++)<<7);

    // if we don't have a full msg return
    if (data.length < len+i) return;

    if ((cmd >> 4) === 3) {
      // got a 'publish' message
      var tlen = (dcca(i+0) << 8) | dcca(i+1);
      this.emit('message', {
        topic: data.substr(i+2, tlen),
        message: data.substr(i+2+tlen, len-2-tlen),
        //dup: (cmd & 0b00001000) >> 3,
        //qos: (cmd & 0b00000110) >> 1,
        retain: cmd & 0b00000001
      });
    }
    data = data.slice(i+len);
  }
};

// encode a string for mqtt by prefixing the length (16-bits)
function mqSt(str) {
        return sfcc(str.length >> 8, str.length&255) + str;
};

// write an mqtt packet
function mqWr(wr, cmd, topic, payload) {
  var l = topic.length+payload.length;
  //console.log("MQwr:", typeof(payload), l, 0x80+(l&0x7f), l>>7, payload);
  wr(l < 128 ? sfcc(cmd, l) : sfcc(cmd, 0x80+(l&0x7f), l>>7));
  wr(topic);
  wr(payload);
};

_p.connect = function(id, clean){
  var mq = this;
  var onC = function() {
    //console.log("mqtt connected");
    mq.wr = mq.cl.write.bind(mq.cl); // write method
    // send connect message
    var v =
      mqSt("MQTT") +           // protocol name
      "\x04" +                 // protocol level, 4=v3.1.1
      (clean?"\x02":"\x00") +  // connect flags, 02=clean session
      "\x00\x00";              // keep-alive timeout, 0=disable
    mqWr(mq.wr, 0b00010000, v, mqSt(id));
    // register callbacks
    mq.emit("connected");
    mq.cl.on('data', mqEv.bind(mq));
    mq.cl.on('end', function() { mq.wr = null; mq.emit("disconnected"); });
  };
  mq.cl = require("net").connect({host : mq.server, port: 1883}, onC);
};

_p.subscribe = function(topic) {
  mqWr(this.wr, 0b10000010,
       sfcc(0, 0),             // packet identifier
       mqSt(topic) + sfcc(0)); // QoS 0
};

_p.publish = function(topic, data, retain) {
  if (typeof(data) !== "string") data = JSON.stringify(data);
  mqWr(this.wr, 0b00110000 + (retain?1:0), // QoS0, retain=0
       mqSt(topic),
       data);
  this.emit("published");
};

_p.ready = function() { return this.wr !== null; }

_p.disconnect = function(){
  if (this.wr) {
    this.wr(sfcc(14<<4)+"\x00");
    this.cl.end();
    this.wr = null;
  }
};

// Exports
exports.create = function (server) {
  return new MQTT(server);
};
