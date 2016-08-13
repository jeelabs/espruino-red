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

// Espruino-red gateway

module.exports = function(RED) {
  "use strict";
  // require any external libraries we may need....
  var ered = require("./ered");

  // The main node definition - most things happen in here
  function ERedGateway(n) {
    var node = this;
    node.name = n.name;
    node.prefix = n.prefix;

    // Create a RED node
    RED.nodes.createNode(node, n);

    //console.log("E-Red gateway constructor:", node.name, node.id, "prefix="+node.prefix);

    // input messages are received from Espruino and need to be forwarded to the actual
    // target node. Each message must have a topic and a payload, the topic must have a
    // structure of /e-red/core/msg/<node id>
    this.on('input', function (msg) {
      //console.log("E-Red gateway incoming message:", msg);
      var t = msg.topic.split('/');
      ered.SendTo(t[1], t[2], t[3], JSON.parse(msg.payload));
    });

    this.on("close", function() {
      //node.warn("E-Red gateway close.");
      ered.DeregisterGateway(node.id);
    });

    this.Outbound = function(board, kind, id, payload) {
      var msg = {
        topic: node.prefix+"/"+board+"/"+kind+"/"+id,
        payload: payload,
        retain: kind !== "msg",
      };
      //console.log("E-Red gateway outbound message: topic="+msg.topic, "retain="+msg.retain, "payload="+payload);
      node.send(msg);
    };

    // register as gateway with ered
    ered.RegisterGateway(node);
  }

  // Register the node by name. This must be called before overriding any of the
  // Node functions.
  RED.nodes.registerType("e-red gateway", ERedGateway);
}
