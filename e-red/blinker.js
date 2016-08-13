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

module.exports = function(RED) {
  "use strict";
  var ered = require("./ered");

  // The main node definition - most things happen in here
  function ERedBlinker(n) {
    var node = this;
    node.name = n.name;

    // Create a RED node
    RED.nodes.createNode(node, n);

    // Store the node configuration (as defined in the .html) into ered_config so it can be
    // shipped to Espruino
    node.board = n.board;
    node.ered_config = { pin: n.pin };
    // add this node to the ered registry, this will instantiate it in Espruino as well
    ered.RegisterNode(node);

    this.on('input', function (msg) {
      // this node lives on Espruino, so we need to forward the message there...
      ered.SendTo(node.board, "msg", node.id, msg);
    });

    this.on("close", function() {
      // deregister, which will tell Espruino to remove the node as well
      ered.DeregisterNode(node);
    });
  }

  RED.nodes.registerType("e-red blinker", ERedBlinker);
}
