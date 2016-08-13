// Copyright (c) 2016 Thorsten von Eicken. See the file LICENSE for copying permission.

function func(type, config) {
  //this.input = new Function("msg", 'LL("func(",msg,")");' + config.code);
  this.input = new Function("msg", config.code);
}

function blinker(type, config) {
  var node = this;
  node.pin = parseFloat(config.pin) || 0;
  LL("Blinker pin", node.pin);

  this.callback = function() {
    if (global.esp8266 !== undefined) {
      digitalWrite(node.pin, !digitalRead(node.pin));
    } else {
      // linux
      LL("LED ", node.on?"ON":"OFF");
      node.on = !node.on;
    }
  }

  this.close = function() {
    if (node.tmr) clearInterval(node.tmr);
    delete node.tmr;
  }

  this.input = function(msg) {
    node.rate = msg.payload;
    LL("blinker rate", node.rate);
    node.close();
    if (node.rate > 0) {
      node.tmr = setInterval(node.callback, 500/node.rate);
    }
  }
}

function ds18b20(type, config) {
  var node = this;
  node.pin = parseInt(config.pin) || 0;
  LL("DS18B20 pin", node.pin);

  node.temp = 60;

  this.close = function() {
  }

  this.input = function(msg) {
    node.temp += 2;
    if (node.temp > 80) node.temp = 60;
    return { payload: node.temp };
  }
}

function timer(type, config) {
  var node = this;
  node.rate = parseFloat(config.rate) || 0;
  LL("Timer rate", node.rate);

  setInterval(function() {
    node.send({ payload: node.rate });
  }, 1000/node.rate);
}

function not_exist(type, config) {
  LL("*** Node type", type, "does not exist");
}

module.exports = {
  function: func,
  blinker: blinker,
  ds18b20: ds18b20,
  timer: timer,
  "not-exist": not_exist,
};
