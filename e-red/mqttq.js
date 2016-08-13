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

// Espruino-red function node

module.exports = function(RED) {
  "use strict";

  function MQTTqueue(n) {
    var node = this;
    node.name = n.name;
    node.queue = [];
    this.broker = n.broker;
    this.brokerConn = RED.nodes.getNode(this.broker);

    // Create a RED node
    RED.nodes.createNode(node, n);

    if (this.brokerConn) {
      this.status({fill:"red",shape:"ring",text:"common.status.disconnected"});

      this.on('input', function (msg) {
        if (msg.retain && (msg.retain === true || msg.retain === "true") &&
            node.brokerConn && !node.brokerConn.connected) {
          // looks like we're not currently connected to the broker, so we'll queue messages
          node.queue.push(msg);
          //console.log("MQTT queue: holding message:", msg.topic);
          return;
        }
        // broker is connected or we don't care, just forward the message unchanged
        //console.log("MQTT queue: forwarding message:", msg.topic);
        node.send(msg);
      });

      if (this.brokerConn.connected) {
        node.status({fill:"green",shape:"dot",text:"common.status.connected"});
      }
      node.brokerConn.register(node);

      // interpose our own status function so we get notified when the broker connects and
      // we can flush queued messages. Yuck!!!
      node.origStatus = node.status;
      node.status = function(x) {
        //console.log("MQTT queue: broker", x.text);
        // if we have a queue and we seem to be connected: flush the queue
        if (node.queue.length > 0 && node.brokerConn.connected) {
          node.log("Flushing queue with " + node.queue.length + " messages");
          node.send([node.queue]);
          node.queue = [];
        }
        return node.origStatus(x);
      };

      this.on("close", function(done) {
        if (node.brokerConn) node.brokerConn.deregister(node, done);
      });

    } else {
      this.error(RED._("mqtt.errors.missing-config"));
    }
  }

  RED.nodes.registerType("mqtt queue", MQTTqueue);
}
