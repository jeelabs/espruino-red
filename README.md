Espruino-Red
============

Espruino-red extends the node-red framework to run special nodes directly
on a microcontroller that runs Espruino (http://www.espruino.com).

Espruino can run on many embedded ARM boards as well as on the ESP8266. It
is a tiny javascript interpreter that functions very similarly to
node.js, but works with programs and data stored in a few tens of KB of
RAM and/or flash.

The main concept behind espruino-red is that a set of special node-red
nodes run on espruino while the standard ones continue to run within
node-red as usual. So, in essence, some nodes represent computation
and I/O that is happening in Espruino. For example, there is an `e-red
function` node that runs the javascript function in Espruino as opposed
to what the normal function node does, which is to run the function
in node-red.

When an e-red node is connected with a regular node the messages that
traverse the wire need to be sent between Espruino and node-red over
some network. The current implementation uses MQTT but this could be
changed for a different technology relatively easily. When an e-red
node is connected to another e-red node on the same embedded board the
communication happens locally on the embedded board. Finally, two e-red
nodes residing on different boards can be connected in which case MQTT
is involved in routing messages from the first node to the second without
going through node-red.

Espruino-red is different from node-red-contrib-gpio in that node-red
nodes and the wires between them run directly on Espruino, i.e., the
microcontroller isn't just there do do the I/O. In addition, algorithms
expressed in `e-red function` nodes also run directly on Espruino.

Network Messages
----------------

The communication between node-red and Espruino serves a number of
purposes. When node-red instantiates an e-red node it needs to tell
Espruino to also instantiate the node and node-red needs to send Espruino
the details that are necessary. When node-red needs to send the e-red
node a message that needs to be routed appropriately and vice-versa,
when Espruino needs to route a message to a regular node that needs to
find its destination.

The messages used in Espruino-red assume that all embedded boards are
loaded with the Espruino-red firmware and configured to talk to a common
MQTT broker and that each board is configured with its own unique name
(a short string). E-red nodes are set-up in node-red with the name of
the board they should reside on. Messages between node-red and Espruino
then find their way using these board names, which are entirely the
responsibility of the user to keep unique and consistent.

Espruino-red also assumes that each board is pre-loaded with the code
necessary to implement all e-red nodes that will need to run there. For
example, if an e-red node to display text onto a display attached to the
board is deployed to the board it is assumed that Espruino already has all
the necessary code to instantiate the node. Of course in the case of the
`e-red function` node, which contains user code, Espruino will receive
the user code as part of the instantiation message.  All this does not
preclude devising a separate mechanism which would allow Espruino to
download code for an e-red node using the node type, in fact, such a
mechanism could be implemented using a node-red flow.

### General message topic structure

All MQTT messages us a first path component of `e-red`, which is followed
by the name of the board or by `core` for the node-red process.  The next
path component contains the ID of the target node (i.e., the ID assigned
by node-red to all nodes) or `mgr` to target the node manager.

### E-red node instantiation

When node-red instantiates an e-red node a mirror instantiation needs to
happen in Espruino. Node-red sends a message to `e-red/<board>/node/<id>`
where the `<id>` is the ID assigned to thenode by node-red. The message
carries a payload that contains the node type, and any additional
parameters that are needed to instantiate the node.  The message needs
to have the retain flag set so the instantiation is not lost of Espruino
is not currently connected to the MQTT broker and so it can be re-created
if Espruino restarts.

### E-red node destruction

When node-red destroys an e-red node a mirror destruction needs to happen
in Espruino. Node-red sends a message to `e-red/<board>/node/<id>` with
an empty message body.  The message needs to have the retain flag set.
It's not clear yet when and how these destroy messages can be garbage
collected, perhaps Espruino can remove the message retention when it
receives the message..

### E-red wire creation

When node-red connects an e-red node output to another e-red node
or to a regular node it sends Espruino a message to tell it how to
route messages. The message is sent to `e-red/<board>/wire/<id>` with
a message body that contains an array of destinations for each output
(i.e. nested arrays). Each destination is simply the topic to reach the
destination node.  (Espruino has to match the board name with its own
board name in order to detect wires that it can handle internally.)

### Message to a node

To send a message to the input of a specific node the source (node-red
or Espruino) sends a message to `e-red/<board>/msg/<id>` where `<board>` is
either the board name or `core` for the node-red process, and `<id>` is
the node id assigned by node-red.  The body of the message is node-red's
`msg` object. (This means that somewhat confusingly there will often be
a topic contained in the message body.)

Note: there probably needs to be a denser encoding of messages than json,
but for right now json will have to do for simnplicity's sake.
