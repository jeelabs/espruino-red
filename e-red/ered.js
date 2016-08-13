/**
 * Copyright 2016 Thorsten von Eicken
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

// Espruino-red core
// Collection of common functions, node registry, and some abstractions
// to communicate with boards via a gateway

"use strict";

// Horrific way to require node-red/red/runtime/flows
var flows = require(module.parent.parent.id + "/../../flows");
// Another hack to get log.warn, I'm sure there's a better way...
var log = require(module.parent.parent.id + "/../../../log");
// And a hack to get events so we can hook to the nodes-started event
var events = require(module.parent.parent.id + "/../../../events");

// ered_gateway is a node that handles communication to/from Espruino boards.
// (It should probably be a map from board name to gateway for that board.)
var ered_gateway;
var ered_tq = []; // queue of messages waiting for gateway to appear
var ered_started; // flag when nodes-started event has occurred

const RETAIN = true;
const EPHEMERAL = false;

// RegisterNode expects the node to have a board name, a type, and ered_config. It contacts the
// gateway to send information about the node to the board and it hooks the updateWires
// function to be able to update the board when these change.
exports.RegisterNode = function(n) {
  // Horrific hack to be notified when the output wires of the node being registered change:
  // we interpose our own function for updateWires so we can be part of the action
  n.originalUpdateWires = n.updateWires;
  n.updateWires = function(wires) { n.originalUpdateWires(wires); updateWires(n); }
  // craft message to Espruino's manager
  var t = n.type.replace("ered ", "").replace("e-red ", "");
  var msg = { type: t, config: n.ered_config };
  sendTo(n.board, "node", n.id, msg);
  // wire the node up
  updateWires(n);
}

// DeregisterNode sends a deletion message to the board
exports.DeregisterNode = function(n) {
  sendTo(n.board, "node", n.id, "");
}

// SendTo sends a node-red message to the input of a node running in node-red or on
// a remote board.
function sendTo(board, kind, id, msg) {
  // check local delivery first
  if (board === "core") {
    var dest = flows.get(id);
    //console.log("E-Red msg local delivery to", id, typeof msg, msg);
    if (dest) dest.receive(msg);
    return;
  }

  // remote message
  if (typeof msg !== "string") msg = JSON.stringify(msg);
  if (ered_gateway && ered_started) {
    // remote message, we have a way to send it, doit
    log.info("E-Red msg sent to "+board+"/"+kind+"/"+id);
    ered_gateway.Outbound(board, kind, id, msg);
  } else if (kind != "msg") {
    // remote message, no way (yet) to send it
    // we queue set-up/config messages but not regular data messages
    // TODO: limit or flush the queue at some point so we don't fill memory
    // if no gateway ever exists
    log.info("E-Red msg queued for "+board+"/"+kind+"/"+id);
    ered_tq.push({b:board, k:kind, i:id, m:msg});
  } else {
    // no way to send regular message, drop it
    log.warn("E-Red has no gateway for board " + board);
  }
}
exports.SendTo = sendTo;

// Flush queue of pending messages
function flushQueue() {
  while (ered_tq.length > 0) {
    var m = ered_tq.shift();
    sendTo(m.b, m.k, m.i, m.m);
  }
}

// Hook nodes-started event so we can flush the queue of pending messages
events.on('nodes-started', function() {
  ered_started = true;
  if (ered_gateway) flushQueue();
});

// Wish this existed?
//events.on('nodes-stopped', function() {
//  ered_started = false;
//});

// updateWires iterates through all outbound wires of a node and updates the remote board
// that owns the node with the routing info.
function updateWires(n) {
  //console.log("Node has", n.wires.length, "outputs");
  var info = [];
  var prefix = ered_gateway ? ered_gateway.prefix : "e-red"; // yuck
  // iterate through all outputs of the node
  for (var i=0; i<n.wires.length; i++) {
    var w = n.wires[i]; // wires for output i
    info[i] = []; // start the list destinations
    // iterate through all wires leaving output i
    for (var j=0; j<w.length; j++) {
      // get the destination node, and if it hasn't been constructed yet, retry later (yuck)
      var dest = flows.get(w[j]);
      if (!dest) {
        //log.warn("E-Red node " + n.id + " has not-yet-instantiated destinations");
        setTimeout(function() {updateWires(n);}, 10); // really shitty yuck!
        return;
      }
      //console.log("Dest["+i+"]["+j+"]=", JSON.stringify(dest));
      // figure out whether the desitnation is in the core, local to the board, or on another board
      if (dest.ered_config && dest.board) { // fuzzy test for e-red nodes: FIXME
        // looks like an e-red node on some board
        if (dest.board == n.board) {
          // local wire on that board, we just send the target id
          info[i][j] = dest.id;
        } else {
          // wire going to a different board, send mqtt topic
          info[i][j] = prefix+"/"+dest.board+"/msg/"+dest.id;
        }
      } else {
        // node is in the core, send mqtt topic
        info[i][j] = prefix+"/core/msg/"+dest.id;
      }
    }
  }
  log.info("E-Red updateWires for node " + n.id + ": " + JSON.stringify(info));
  sendTo(n.board, "wire", n.id, info);
}

exports.RegisterGateway = function(n) {
  ered_gateway = n;
  //console.log("Registered gateway", n);
  if (ered_started) flushQueue();
}

exports.DeregisterGateway = function(id) {
  ered_gateway = null;
}
