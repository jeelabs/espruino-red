// Copyright (c) 2016 Thorsten von Eicken. See the file LICENSE for copying permission.

esp8266 = require("ESP8266");
wifi = require("Wifi");
mqtt = require("MQTT").create("h.voneicken.com");

var board = "dev";

var mqLED = D0;     // LED to signal MQTT connection and messages
var mqTmr;          // Timer for mqLED
var blinkLED = D12; // LED to play with

// Helpers
var LL = console.log; // shorter than "console.log"
// RR rounds v to d digits, useful to display numbers
function RR(v,d) { var f=Math.pow(10,d); return Math.round(v*f)/f; }

// mqBlink makes the mqLED blink briefly to indicate mqtt activity
function mqBlink() {
  mqLED.set();
  if (mqTmr) clearTimeout(mqTmr);
  mqTmr = setTimeout(function() { if (mqtt.ready()) mqLED.reset(); mqTmr = 0; }, 100);
}

//===== mqtt

function mqRecv(msg) {
  //LL("MQTT recv:", msg.topic, msg.message);
  mqBlink();
  var t = msg.topic.split('/');
  switch (t.shift()) {
    case 'system': break;
    case 'e-red':
      t.shift(); // drop board ID
      route(t[0], t[1], JSON.parse(msg.message));
      LL(process.memory());
      break;
  }
}

function mqConn() {
  //LL("MQTT...");
  mqtt.connect(wifi.getHostname()+"-"+getSerial(), 0);
}

function mqReady() {
  LL("MQTT connected");
  mqLED.reset();
  mqtt.subscribe("system/#");
  mqtt.subscribe("e-red/"+board+"/#");
}

function mqDisc() {
  LL("MQTT disconnected");
  mqLED.set();
  setTimeout(mqConn, 5000);
}

function mqPub(t, d) {
  //LL("MQTT send:", t, d);
  if (mqtt.ready()) {
    mqtt.publish(t, d);
    mqBlink();
  }
}

//===== E-RED board manager

// nodes is the set of e-red nodes residing on this board. Each node is indexed by id and has:
// type, wires, and config, which is the configuration params that were passed down from the
// node-red node.
var nodes = {};
// types is the set of e-red node types. Each node type is indexed by name and has: ... ?
var types = {};

// route recevies an e-red mqtt message and interprets it
function route(kind, id, payload) {
  var node;
  switch (kind) {
  case 'node': // create/destroy a node
    if (!payload || payload === "") {
      LL('destroy node', id);
      node = nodes[id];
      if (node) {
        if (node.close) node.close();
        nodes[id] = undefined;
      }
    } else {
      LL('creating node', id, payload.type);
      var constructor = types[payload.type] || types["not-exist"];
      node = new constructor(payload.config);
      if (node) {
        node.id = id;
        node.type = payload.type;
        nodes[id] = node;
      }
    }
    break;
  case 'wire': // set the outgoing wires for a node
    node = nodes[id];
    if (node) {
      LL("set wires for node", id, JSON.stringify(payload));
      node.wires = payload;
    }
    break;
  case 'msg': // "data" message for a node's input
    runNode(id, payload);
    break;
  }
}

// outputMsg outputs a message from a node, scheduling local nodes for execution and pushing
// MQTT messages to the broker as appropriate
function outputMsg(node, msg) {
  var wires = node.wires;
  //LL("wires:", typeof wires, wires.length, wires);
  if (!wires) { LL("No wires"); return; }

  // iterate through all outputs and all destinations and either send a message or
  // use setTimeout to schedule the execution (yeah, there sure is a better way!)
  if (!Array.isArray(msg)) msg = [msg];
  //LL("msg:", msg.length, msg);
  //LL('iterating through', msg.length, wires.length);
  // iterate through all outputs
  for (var o=0; o<msg.length && o<wires.length; o++) {
    var m = msg[o]; // message on:e / output o
    // iterate through all destinations for this output
    for (var d=0; d<wires[o].length; d++) {
      var dest = wires[o][d]; // destination local node id or remote node mqtt topic
      if (dest.indexOf('/') === -1) {
        // local delivery
        LL('Local delivery to', dest);
        setTimeout(runNode.bind(null, dest, m.clone()), 0);
      } else {
        // remote delivery
        LL('Remote delivery to', dest);
        mqPub(dest, JSON.stringify(m));
      }
    }
  }
}

// runNode actually executes the input function of a node passing it a message and then collecting
// its output
function runNode(id, msg) {
  node = nodes[id];
  if (node) {
    LL("Running node", id);
    var out;
    try { out = node.input(msg); }
    catch(e) { LL("OOPS, failure running node["+id+"].input:", e); }
    //LL("->", out);
    if (out) outputMsg(node, out);
  } else {
    LL("Unknown node", id);
  }
}

//===== main

function onInit() {
  esp8266.setLog(2); // log to memory and 2:uart0 3:uart1
  LL("Start...");
  // load node types
  types = require('ered_lib');
  // start mqtt
  mqtt.on("message", mqRecv);
  mqtt.on("connected", mqReady);
  mqtt.on("disconnected", mqDisc);
  mqConn();
}

LL(String.fromCharCode(0x1B) +"[?7h");
LL(process.memory());

onInit();
