Espruino-red demo
=================

The following demo simulates having a DS18B20 temperature sensor and a blinking LED using the linux
version of Espruino. The flow makes the LED blink at a rate controlled by the temperature.
The simulation prints the LED state on stdout and ramps the temperature up slowly. The same
flow can run using real ds18b20 and LED components on an ESP8266.

The flow is:
```
[{"id":"751cab70.dc2334","type":"e-red function","z":"437d0112.082c6","name":"calc rate","board":"linux","code":"msg.payload = 1 + (msg.payload-60)/10; return msg;","x":420,"y":300,"wires":[["3c19a49f.1cbd6c","198b8e93.68ba81"]]},{"id":"9e6984e3.515e28","type":"inject","z":"437d0112.082c6","name":"60F","topic":"","payload":"60","payloadType":"num","repeat":"","crontab":"","once":false,"x":110,"y":100,"wires":[["751cab70.dc2334"]]},{"id":"331d4df3.117c62","type":"inject","z":"437d0112.082c6","name":"70F","topic":"","payload":"70","payloadType":"num","repeat":"","crontab":"","once":false,"x":110,"y":160,"wires":[["751cab70.dc2334"]]},{"id":"7cdf204e.35387","type":"inject","z":"437d0112.082c6","name":"80F","topic":"","payload":"80","payloadType":"num","repeat":"","crontab":"","once":false,"x":110,"y":220,"wires":[["751cab70.dc2334"]]},{"id":"3c19a49f.1cbd6c","type":"e-red blinker","z":"437d0112.082c6","name":"blinker","board":"linux","pin":"1","x":570,"y":300,"wires":[]},{"id":"198b8e93.68ba81","type":"debug","z":"437d0112.082c6","name":"blink rate","active":true,"console":"false","complete":"payload","x":480,"y":380,"wires":[]},{"id":"3b3aa691.b2c31a","type":"e-red ds18b20","z":"437d0112.082c6","name":"ds18b20","board":"linux","pin":"1","x":260,"y":300,"wires":[["751cab70.dc2334"]]},{"id":"7bf8273b.f62bf8","type":"e-red timer","z":"437d0112.082c6","name":"","board":"linux","rate":"0.2","x":100,"y":300,"wires":[["3b3aa691.b2c31a"]]}]
```

In addition, the following flow is needed to hook things up to MQTT:
```
[{"id":"deb880aa.f7238","type":"mqtt in","z":"c4220dc6.b5a2","name":"mqtt-in","topic":"e-red/core/#","qos":"1","broker":"dff8c141.3e5d7","x":110,"y":420,"wires":[["7e2ce79c.151d08"]]},{"id":"223c6741.0ddba8","type":"mqtt out","z":"c4220dc6.b5a2","name":"mqtt-out","topic":"","qos":"1","retain":"","broker":"dff8c141.3e5d7","x":400,"y":480,"wires":[]},{"id":"7e2ce79c.151d08","type":"e-red gateway","z":"c4220dc6.b5a2","name":"e-red gw","prefix":"e-red","x":260,"y":420,"wires":[["958469a4.0f53b8"]]},{"id":"3d8c26e1.fdaada","type":"debug","z":"c4220dc6.b5a2","name":"MQTT debug","active":true,"console":"false","complete":"payload","x":380,"y":540,"wires":[]},{"id":"958469a4.0f53b8","type":"mqtt queue","z":"c4220dc6.b5a2","name":"queue","broker":"dff8c141.3e5d7","x":190,"y":480,"wires":[["3d8c26e1.fdaada","223c6741.0ddba8"]]},{"id":"dff8c141.3e5d7","type":"mqtt-broker","z":"c4220dc6.b5a2","broker":"h.voneicken.com","port":"1883","tls":null,"clientid":"node-red-dev","usetls":false,"compatmode":false,"keepalive":"60","cleansession":true,"willTopic":"","willQos":"0","willRetain":null,"willPayload":"","birthTopic":"","birthQos":"0","birthRetain":null,"birthPayload":""}]
```

A linux version of espruino is needed, which must be compiled from source (sigh)
from https://github.com/espruino/espruino

Change the MQTT connect in `./Espruino/projects/e-red-linux.js` as well as in the 3 MQTT
nodes in node-red (in, out, queue).

Run using the command line `./espruino projects/e-red-linux.js` in `./Espruino`

