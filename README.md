Espruino-Red
============

__WARNING__ Espruino-red is a prototype, don't expect it to work!

To chat about espruino-red please use
[![gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/jeelabs/espruino-red)
or the [node-red Google group](https://groups.google.com/forum/#!forum/node-red).

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
in node-red on your latop, raspi, etc.

When an e-red node is connected with a regular node the messages that
traverse the wire need to be sent between Espruino and node-red over
some network. The current implementation uses MQTT but this could be
changed for a different technology very easily. When an e-red
node is connected to another e-red node on the same embedded board the
communication happens locally on the embedded board. Finally, two e-red
nodes residing on different boards can be connected in which case MQTT
is involved in routing messages from the first node to the second without
going through node-red.

Espruino-red is different from node-red-contrib-gpio in that node-red
nodes and the wires between them run directly on Espruino, i.e., the
microcontroller isn't just there do do the I/O. In addition, algorithms
expressed in `e-red function` nodes also run directly on Espruino.
All this means that if you shut down node-red the embedded board continue
running their flows (although an MQTT broker may need to be running if
the boards communicate with one-another).

The node-red portion of Espruino0-red is not limited to Espruino, in fact
it knows nothing about Espruino and has been designed such that a
different embedded system can be used just as easily. The node-red
portion is called "e-red" standing for "embedded-red" and it is
entirely conceivable to write an embedded system that uses lua or
forth instead of espruino.

Terminology: 'board' refers to an embedded board running espruino-red,
'node' refers to a node in node-red, 'node-red' generally refers to the
node-red process and environment running on some linux computer,
'standard node' refers to any of the normal nodes in node-red, while
'e-red node' refers to the special nodes that are built for
espruino-red and that have both a component in node-red and in espruino-red.

Espruino-red nodes
------------------

Espruino-red does _not_ just run standard node-red nodes on the embedded
board! This would not be practical due to the various constraints of
embedded boards. Instead it requires that special nodes be written that
use fewer resources (!) and that target the useful set of features
on an embedded system.

Each espruino-red node (or e-red node in general) consists of 3 parts:
the familiar node-red html file to display the node in the UI, the
familiar node-red js file to serve as a local surrogate so node-red can
instantiate something, and a new Espruino file/function that actually
implements the node's embedded functionality and that will run in
Espruino.

The implementation of the espruino part of the node is relatively similar
to the implementation of a regular node, just the javascript environment
is more basic and instead of subscribing to inputs using events currently
the node object must provide an input function that receives a msg and
returns an output msg array. (These details could all be improved.)

The standard node-red js implementation of the espruino-red node serves as
local surrogate. It has two roles. The first is to gather the configuration
from the UI and craft an ered\_config object which will be forwarded to
the espruino constructor. The second role is to receive input messages coming from
other standard nodes and forward them to the embedded board by calling into
the e-red portion of the node-red runtime. (This second part could be
delegated more generically to the e-red runtime than the current implenmentation
does.)

Network Messages
----------------

The communication between node-red and Espruino serves a number of
purposes. When node-red instantiates an e-red node it needs to tell
Espruino to also instantiate the node and node-red needs to send Espruino
the details that are necessary. When a standard node-red node sends
an e-red node a message then that message needs to be routed appropriately
and vice-versa, when an e-red node sends a standard node a messagei
that message needs to find its destination in node-red.

The messages used in Espruino-red assume that all embedded boards are
loaded with the Espruino-red firmware and configured to talk to a common
MQTT broker and that each board is configured with its own unique name
(a short string). E-red nodes are set-up in node-red with the name of
the board they should reside on. Messages between node-red and Espruino
then find their way using these board names, which are entirely the
responsibility of the user to keep unique and consistent.

Espruino-red assumes that each board is pre-loaded with the code necessary
to implement all e-red nodes that will need to run there. For example,
if an e-red node to display text onto a display attached to the board is
deployed to the board using the node-red UI it is assumed that Espruino
already has all the necessary code to instantiate the node. Of course in
the case of the `e-red function` node, which contains user code, Espruino
will receive the user code as part of the instantiation message.  All this
does not preclude devising a separate mechanism which would allow Espruino
to download code dynamically for an e-red node using the node type, it's
just not a part of the current espruino-red implementation.
(Such a mechanism could actually be implemented using a node-red flow!)

### General message topic structure

All MQTT messages use a first path component of `e-red` (this can be
overridden in the e-red gateway node), which is followed
by the name of the board or by `core` for the node-red process.  The next
path component contains the kind of message (currently `node`, `wire`,
or `msg`) followed by the ID of the target node (i.e., the ID assigned
by node-red to all nodes). Example: `e-red/espruino1/node/e7f801fa.4517d`.

### E-red node instantiation

When node-red instantiates an e-red node a parallel instantiation needs to
happen in Espruino. Node-red sends a message to `e-red/<board>/node/<id>`
where the `<id>` is the ID assigned to the node by node-red. The message
carries a payload that contains the node type, and any additional
parameters that are needed to instantiate the node.  The message needs
to have the retain flag set so the instantiation is not lost if Espruino
is not currently connected to the MQTT broker and so it can be re-created
if Espruino restarts.

### E-red node destruction

When node-red destroys an e-red node a parallel destruction needs to happen
in Espruino. Node-red sends a message to `e-red/<board>/node/<id>` with
an empty message body.  The message needs to have the retain flag set.
It's not clear yet when and how these destroy messages can be garbage
collected, perhaps Espruino can remove the message retention when it
receives the message...

### E-red wire creation

When node-red connects an e-red node output to another e-red node
or to a regular node it sends Espruino a message to tell it how to
route messages. The message is sent to `e-red/<board>/wire/<id>` with
a message body that contains an array of destinations for each output
(i.e. nested arrays). This array has the same structure as the wire
field in node-red except that each destination is the topic to reach the
destination node if it is not local on the board.

### Message to a node

To send a message to the input of a specific node the source (node-red
or Espruino) sends a message to `e-red/<board>/msg/<id>` where `<board>` is
either the board name or `core` for the node-red process, and `<id>` is
the node id assigned by node-red.  The body of the message is node-red's
`msg` object. (This means that somewhat confusingly there will often be
a topic contained in the message body.)

Note: there probably needs to be a denser encoding of messages than json,
but for right now json will have to do for simnplicity's sake.
