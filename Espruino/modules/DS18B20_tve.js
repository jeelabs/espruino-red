/* Copyright (c) 2013 Gordon Williams, Pur3 Ltd. See the file LICENSE for copying permission. */
/* Improved by Thorsten von Eicken, 2015 */
/*
Module for the DS18B20 temperature sensor

```
var ow = new OneWire(A1);
var sensor = require("DS18B20").connect(ow);
console.log(sensor.getTemp());
sensor.setRes(9);
console.log(sensor.getTemp());
var sensor2 = require("DS18B20").connect(ow, 1);
var sensor3 = require("DS18B20").connect(ow, -8358680895374756824);
```
*/

var C = {
  CV: 0x44,  // convert command
  CP: 0x48,  // copy scratchpad to eeprom
  RD: 0xBE,  // read scratchpad
  WR: 0x4E   // write scratchpad
};

function DS18B20(oneWire, device) {
  this.bus = oneWire;
  this.res = 12; // worst case
  if (device === undefined) {
    this.sCode = this.bus.search()[0];
  } else {
    if (parseInt(device, 16).toString()==device && device >= 0 && device <= 126) {
      this.sCode = this.bus.search()[device];
    } else {
      this.sCode = device;
    }
  }
}

var _p = DS18B20.prototype;

/** For internal use - read the scratchpad region */
_p._readSpad = function () {
  var spad = [],
      bus = this.bus;
  //bus.reset();
  bus.select(this.sCode);
  bus.write(C.RD);
  for (var i = 0; i < 9; i++) {
    spad.push(bus.read());
  }
  var crc = this._crc(spad.slice(0,8));
  if (crc != spad[8]) spad = null;
  return spad;
};

/** For internal use - start a conversion */
_p._cvt = function () {
  //this.bus.reset();
  this.bus.select(this.sCode);
  this.bus.write(C.CV, true);
};

/** For internal use - calculate the CRC */
_p._crc = function(data) {
  var crc=0;
  data.forEach(function(d){
    for(var i=8;i>0;i--){
      var m=(crc^d)&1;
      crc >>= 1;
      if (m) crc ^= 0x8c;
      d>>=1;
    }
  });
  return crc;
};

/** For internal use - write the scratchpad region */
_p._writeSpad = function (th, tl, conf) {
  var b = this.bus;
  //b.reset();
  b.select(this.sCode);
  b.write([C.WR, th, tl, conf]);
  //b.reset();
  b.select(this.sCode);
  b.write(C.CP);
  b.reset();
};

/** Set the resolution in bits. From 9 to 12 bits */
_p.setRes = function (res) {
  var spad = this._readSpad();
  if (spad === null) return;
  this.res = res;
  res = [0x1F, 0x3F, 0x5F, 0x7F][E.clip(res, 9, 12) - 9];
  this._writeSpad(spad[2], spad[3], res);
};

/** Return the resolution in bits. From 9 to 12 bits */
/*
_p.getRes = function () {
  return [0x1F, 0x3F, 0x5F, 0x7F].indexOf(this._readSpad()[4]) + 9;
};
*/

/** Return true if this device is present */
_p.isPresent = function () {
  return this.bus.search().indexOf(this.sCode) !== -1;
};

/** For internal use - finish readout */
_p._getTemp = function(callback) {
  var s = this._readSpad();
  var t = null;
  if (s !== null) {
    t = s[0] + (s[1]<<8);
    if (t > 32767) t -= 65536;
    t = t/16.0;
  }
  if (callback !== undefined) callback(t);
};

/** Get a temperature reading, in degrees C */
_p.getTemp = function (callback) {
  this._cvt();
  var self = this;
  // time for conversion depends on resolution
  setTimeout(function(){self._getTemp(callback)},
             [100, 190, 380, 760][E.clip(this.res, 9, 12) - 9]);
};

/* * Return a list of all DS18B20 sensors with the alarms set */
/*
DS18B20.prototype.searchAlarm = function() {
  return this.bus.search(0xEC);
};
*/

/* * Set alarm low and high values in degrees C - see DS18B20.prototype.searchAlarm.
  If the temperature goes below `lo` or above `hi` the alarm will be set. */
/*
DS18B20.prototype.setAlarm = function(lo,hi) {
  lo--; // DS18B20 alarms if (temp<=lo || temp>hi), but we want (temp<lo || temp>hi)
  if (lo<0) lo+=256;
  if (hi<0) hi+=256;
  var spad = this._readSpad();
  this._writeSpad(hi,lo,spad[4]);
};
*/

/** Initialise a DS18B20 device. Use either as:
  connect(new OneWire(pin)) - use the first found DS18B20 device
  connect(new OneWire(pin), N) - use the Nth DS18B20 device
  connect(new OneWire(pin), ID) - use the DS18B20 device with the given ID
 */
exports.connect = function (oneWire, device) {return new DS18B20(oneWire, device);};
