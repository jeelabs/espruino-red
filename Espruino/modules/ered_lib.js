// Copyright (c) 2016 Thorsten von Eicken. See the file LICENSE for copying permission.

function func(config) {
  //this.input = new Function("msg", 'LL("func(",msg,")");' + config.code);
  this.input = new Function("msg", config.code);
}

function blinker(config) {
  this.pin = config.pin || 0;
  this.rate = config.rate || 1;

  this.callback = function() {
    digitalWrite(this.pin, !digitalRead(this.pin));
  }

  this.close = function() {
    if (this.tmr) clearInterval(tmr);
    delete this.tmr;
  }

  this.input = function(msg) {
    this.close();
    if (this.rate > 0) {
      this.tmr = setInterval(this.callback, 1/this.rate);
    }
  }

  this.input(this.rate);
}

module.exports = {
  function: func,
  blinker: blinker,
};
