require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var buffers = require("./impl/buffers");
var channels = require("./impl/channels");
var select = require("./impl/select");
var process = require("./impl/process");
var timers = require("./impl/timers");

function spawn(gen, creator) {
  var ch = channels.chan(buffers.fixed(1));
  new process.Process(gen, function (value) {
    if (value === channels.CLOSED) {
      ch.close();
    } else {
      process.put_then_callback(ch, value, function (ok) {
        ch.close();
      });
    }
  }, creator).run();
  return ch;
};

function go(f, args) {
  args = args || [];

  var gen = f.apply(null, args);
  return spawn(gen, f);
};

function chan(bufferOrNumber, xform, exHandler) {
  var buf;
  if (bufferOrNumber === 0) {
    bufferOrNumber = null;
  }
  if (typeof bufferOrNumber === "number") {
    buf = buffers.fixed(bufferOrNumber);
  } else {
    buf = bufferOrNumber;
  }
  return channels.chan(buf, xform, exHandler);
};

module.exports = {
  buffers: {
    fixed: buffers.fixed,
    dropping: buffers.dropping,
    sliding: buffers.sliding
  },

  spawn: spawn,
  go: go,
  chan: chan,
  DEFAULT: select.DEFAULT,
  CLOSED: channels.CLOSED,

  put: process.put,
  take: process.take,
  offer: process.offer,
  poll: process.poll,
  sleep: process.sleep,
  alts: process.alts,
  putAsync: process.put_then_callback,
  takeAsync: process.take_then_callback,
  NO_VALUE: process.NO_VALUE,

  timeout: timers.timeout
};

},{"./impl/buffers":4,"./impl/channels":5,"./impl/process":7,"./impl/select":8,"./impl/timers":9}],2:[function(require,module,exports){
"use strict";

var _marked = [mapcat].map(regeneratorRuntime.mark);

var Box = require("./impl/channels").Box;

var csp = require("./csp.core"),
    go = csp.go,
    take = csp.take,
    put = csp.put,
    takeAsync = csp.takeAsync,
    putAsync = csp.putAsync,
    alts = csp.alts,
    chan = csp.chan,
    CLOSED = csp.CLOSED;

function mapFrom(f, ch) {
  return {
    is_closed: function is_closed() {
      return ch.is_closed();
    },
    close: function close() {
      ch.close();
    },
    _put: function _put(value, handler) {
      return ch._put(value, handler);
    },
    _take: function _take(handler) {
      var result = ch._take({
        is_active: function is_active() {
          return handler.is_active();
        },
        commit: function commit() {
          var take_cb = handler.commit();
          return function (value) {
            return take_cb(value === CLOSED ? CLOSED : f(value));
          };
        }
      });
      if (result) {
        var value = result.value;
        return new Box(value === CLOSED ? CLOSED : f(value));
      } else {
        return null;
      }
    }
  };
}

function mapInto(f, ch) {
  return {
    is_closed: function is_closed() {
      return ch.is_closed();
    },
    close: function close() {
      ch.close();
    },
    _put: function _put(value, handler) {
      return ch._put(f(value), handler);
    },
    _take: function _take(handler) {
      return ch._take(handler);
    }
  };
}

function filterFrom(p, ch, bufferOrN) {
  var out = chan(bufferOrN);
  go(regeneratorRuntime.mark(function _callee() {
    var value;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!true) {
              _context.next = 12;
              break;
            }

            _context.next = 3;
            return take(ch);

          case 3:
            value = _context.sent;

            if (!(value === CLOSED)) {
              _context.next = 7;
              break;
            }

            out.close();
            return _context.abrupt("break", 12);

          case 7:
            if (!p(value)) {
              _context.next = 10;
              break;
            }

            _context.next = 10;
            return put(out, value);

          case 10:
            _context.next = 0;
            break;

          case 12:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, this);
  }));
  return out;
}

function filterInto(p, ch) {
  return {
    is_closed: function is_closed() {
      return ch.is_closed();
    },
    close: function close() {
      ch.close();
    },
    _put: function _put(value, handler) {
      if (p(value)) {
        return ch._put(value, handler);
      } else {
        return new Box(!ch.is_closed());
      }
    },
    _take: function _take(handler) {
      return ch._take(handler);
    }
  };
}

function removeFrom(p, ch) {
  return filterFrom(function (value) {
    return !p(value);
  }, ch);
}

function removeInto(p, ch) {
  return filterInto(function (value) {
    return !p(value);
  }, ch);
}

function mapcat(f, src, dst) {
  var value, seq, length, i;
  return regeneratorRuntime.wrap(function mapcat$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          if (!true) {
            _context2.next = 22;
            break;
          }

          _context2.next = 3;
          return take(src);

        case 3:
          value = _context2.sent;

          if (!(value === CLOSED)) {
            _context2.next = 9;
            break;
          }

          dst.close();
          return _context2.abrupt("break", 22);

        case 9:
          seq = f(value);
          length = seq.length;
          i = 0;

        case 12:
          if (!(i < length)) {
            _context2.next = 18;
            break;
          }

          _context2.next = 15;
          return put(dst, seq[i]);

        case 15:
          i++;
          _context2.next = 12;
          break;

        case 18:
          if (!dst.is_closed()) {
            _context2.next = 20;
            break;
          }

          return _context2.abrupt("break", 22);

        case 20:
          _context2.next = 0;
          break;

        case 22:
        case "end":
          return _context2.stop();
      }
    }
  }, _marked[0], this);
}

function mapcatFrom(f, ch, bufferOrN) {
  var out = chan(bufferOrN);
  go(mapcat, [f, ch, out]);
  return out;
}

function mapcatInto(f, ch, bufferOrN) {
  var src = chan(bufferOrN);
  go(mapcat, [f, src, ch]);
  return src;
}

function pipe(src, dst, keepOpen) {
  go(regeneratorRuntime.mark(function _callee2() {
    var value;
    return regeneratorRuntime.wrap(function _callee2$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            if (!true) {
              _context3.next = 13;
              break;
            }

            _context3.next = 3;
            return take(src);

          case 3:
            value = _context3.sent;

            if (!(value === CLOSED)) {
              _context3.next = 7;
              break;
            }

            if (!keepOpen) {
              dst.close();
            }
            return _context3.abrupt("break", 13);

          case 7:
            _context3.next = 9;
            return put(dst, value);

          case 9:
            if (_context3.sent) {
              _context3.next = 11;
              break;
            }

            return _context3.abrupt("break", 13);

          case 11:
            _context3.next = 0;
            break;

          case 13:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee2, this);
  }));
  return dst;
}

function split(p, ch, trueBufferOrN, falseBufferOrN) {
  var tch = chan(trueBufferOrN);
  var fch = chan(falseBufferOrN);
  go(regeneratorRuntime.mark(function _callee3() {
    var value;
    return regeneratorRuntime.wrap(function _callee3$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            if (!true) {
              _context4.next = 12;
              break;
            }

            _context4.next = 3;
            return take(ch);

          case 3:
            value = _context4.sent;

            if (!(value === CLOSED)) {
              _context4.next = 8;
              break;
            }

            tch.close();
            fch.close();
            return _context4.abrupt("break", 12);

          case 8:
            _context4.next = 10;
            return put(p(value) ? tch : fch, value);

          case 10:
            _context4.next = 0;
            break;

          case 12:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee3, this);
  }));
  return [tch, fch];
}

function reduce(f, init, ch) {
  return go(regeneratorRuntime.mark(function _callee4() {
    var result, value;
    return regeneratorRuntime.wrap(function _callee4$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            result = init;

          case 1:
            if (!true) {
              _context5.next = 12;
              break;
            }

            _context5.next = 4;
            return take(ch);

          case 4:
            value = _context5.sent;

            if (!(value === CLOSED)) {
              _context5.next = 9;
              break;
            }

            return _context5.abrupt("return", result);

          case 9:
            result = f(result, value);

          case 10:
            _context5.next = 1;
            break;

          case 12:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee4, this);
  }), [], true);
}

function onto(ch, coll, keepOpen) {
  return go(regeneratorRuntime.mark(function _callee5() {
    var length, i;
    return regeneratorRuntime.wrap(function _callee5$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            length = coll.length;
            // FIX: Should be a generic looping interface (for...in?)

            i = 0;

          case 2:
            if (!(i < length)) {
              _context6.next = 8;
              break;
            }

            _context6.next = 5;
            return put(ch, coll[i]);

          case 5:
            i++;
            _context6.next = 2;
            break;

          case 8:
            if (!keepOpen) {
              ch.close();
            }

          case 9:
          case "end":
            return _context6.stop();
        }
      }
    }, _callee5, this);
  }));
}

// TODO: Bounded?
function fromColl(coll) {
  var ch = chan(coll.length);
  onto(ch, coll);
  return ch;
}

function map(f, chs, bufferOrN) {
  var out = chan(bufferOrN);
  var length = chs.length;
  // Array holding 1 round of values
  var values = new Array(length);
  // TODO: Not sure why we need a size-1 buffer here
  var dchan = chan(1);
  // How many more items this round
  var dcount;
  // put callbacks for each channel
  var dcallbacks = new Array(length);
  for (var i = 0; i < length; i++) {
    dcallbacks[i] = function (i) {
      return function (value) {
        values[i] = value;
        dcount--;
        if (dcount === 0) {
          putAsync(dchan, values.slice(0));
        }
      };
    }(i);
  }
  go(regeneratorRuntime.mark(function _callee6() {
    var i, values;
    return regeneratorRuntime.wrap(function _callee6$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            if (!true) {
              _context7.next = 18;
              break;
            }

            dcount = length;
            // We could just launch n goroutines here, but for effciency we
            // don't
            for (i = 0; i < length; i++) {
              try {
                takeAsync(chs[i], dcallbacks[i]);
              } catch (e) {
                // FIX: Hmm why catching here?
                dcount--;
              }
            }
            _context7.next = 5;
            return take(dchan);

          case 5:
            values = _context7.sent;
            i = 0;

          case 7:
            if (!(i < length)) {
              _context7.next = 14;
              break;
            }

            if (!(values[i] === CLOSED)) {
              _context7.next = 11;
              break;
            }

            out.close();
            return _context7.abrupt("return");

          case 11:
            i++;
            _context7.next = 7;
            break;

          case 14:
            _context7.next = 16;
            return put(out, f.apply(null, values));

          case 16:
            _context7.next = 0;
            break;

          case 18:
          case "end":
            return _context7.stop();
        }
      }
    }, _callee6, this);
  }));
  return out;
}

function merge(chs, bufferOrN) {
  var out = chan(bufferOrN);
  var actives = chs.slice(0);
  go(regeneratorRuntime.mark(function _callee7() {
    var r, value, i;
    return regeneratorRuntime.wrap(function _callee7$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            if (!true) {
              _context8.next = 15;
              break;
            }

            if (!(actives.length === 0)) {
              _context8.next = 3;
              break;
            }

            return _context8.abrupt("break", 15);

          case 3:
            _context8.next = 5;
            return alts(actives);

          case 5:
            r = _context8.sent;
            value = r.value;

            if (!(value === CLOSED)) {
              _context8.next = 11;
              break;
            }

            // Remove closed channel
            i = actives.indexOf(r.channel);

            actives.splice(i, 1);
            return _context8.abrupt("continue", 0);

          case 11:
            _context8.next = 13;
            return put(out, value);

          case 13:
            _context8.next = 0;
            break;

          case 15:
            out.close();

          case 16:
          case "end":
            return _context8.stop();
        }
      }
    }, _callee7, this);
  }));
  return out;
}

function into(coll, ch) {
  var result = coll.slice(0);
  return reduce(function (result, item) {
    result.push(item);
    return result;
  }, result, ch);
}

function takeN(n, ch, bufferOrN) {
  var out = chan(bufferOrN);
  go(regeneratorRuntime.mark(function _callee8() {
    var i, value;
    return regeneratorRuntime.wrap(function _callee8$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            i = 0;

          case 1:
            if (!(i < n)) {
              _context9.next = 12;
              break;
            }

            _context9.next = 4;
            return take(ch);

          case 4:
            value = _context9.sent;

            if (!(value === CLOSED)) {
              _context9.next = 7;
              break;
            }

            return _context9.abrupt("break", 12);

          case 7:
            _context9.next = 9;
            return put(out, value);

          case 9:
            i++;
            _context9.next = 1;
            break;

          case 12:
            out.close();

          case 13:
          case "end":
            return _context9.stop();
        }
      }
    }, _callee8, this);
  }));
  return out;
}

var NOTHING = {};

function unique(ch, bufferOrN) {
  var out = chan(bufferOrN);
  var last = NOTHING;
  go(regeneratorRuntime.mark(function _callee9() {
    var value;
    return regeneratorRuntime.wrap(function _callee9$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            if (!true) {
              _context10.next = 13;
              break;
            }

            _context10.next = 3;
            return take(ch);

          case 3:
            value = _context10.sent;

            if (!(value === CLOSED)) {
              _context10.next = 6;
              break;
            }

            return _context10.abrupt("break", 13);

          case 6:
            if (!(value === last)) {
              _context10.next = 8;
              break;
            }

            return _context10.abrupt("continue", 0);

          case 8:
            last = value;
            _context10.next = 11;
            return put(out, value);

          case 11:
            _context10.next = 0;
            break;

          case 13:
            out.close();

          case 14:
          case "end":
            return _context10.stop();
        }
      }
    }, _callee9, this);
  }));
  return out;
}

function partitionBy(f, ch, bufferOrN) {
  var out = chan(bufferOrN);
  var part = [];
  var last = NOTHING;
  go(regeneratorRuntime.mark(function _callee10() {
    var value, newItem;
    return regeneratorRuntime.wrap(function _callee10$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            if (!true) {
              _context11.next = 23;
              break;
            }

            _context11.next = 3;
            return take(ch);

          case 3:
            value = _context11.sent;

            if (!(value === CLOSED)) {
              _context11.next = 12;
              break;
            }

            if (!(part.length > 0)) {
              _context11.next = 8;
              break;
            }

            _context11.next = 8;
            return put(out, part);

          case 8:
            out.close();
            return _context11.abrupt("break", 23);

          case 12:
            newItem = f(value);

            if (!(newItem === last || last === NOTHING)) {
              _context11.next = 17;
              break;
            }

            part.push(value);
            _context11.next = 20;
            break;

          case 17:
            _context11.next = 19;
            return put(out, part);

          case 19:
            part = [value];

          case 20:
            last = newItem;

          case 21:
            _context11.next = 0;
            break;

          case 23:
          case "end":
            return _context11.stop();
        }
      }
    }, _callee10, this);
  }));
  return out;
}

function partition(n, ch, bufferOrN) {
  var out = chan(bufferOrN);
  go(regeneratorRuntime.mark(function _callee11() {
    var part, i, value;
    return regeneratorRuntime.wrap(function _callee11$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            if (!true) {
              _context12.next = 21;
              break;
            }

            part = new Array(n);
            i = 0;

          case 3:
            if (!(i < n)) {
              _context12.next = 17;
              break;
            }

            _context12.next = 6;
            return take(ch);

          case 6:
            value = _context12.sent;

            if (!(value === CLOSED)) {
              _context12.next = 13;
              break;
            }

            if (!(i > 0)) {
              _context12.next = 11;
              break;
            }

            _context12.next = 11;
            return put(out, part.slice(0, i));

          case 11:
            out.close();
            return _context12.abrupt("return");

          case 13:
            part[i] = value;

          case 14:
            i++;
            _context12.next = 3;
            break;

          case 17:
            _context12.next = 19;
            return put(out, part);

          case 19:
            _context12.next = 0;
            break;

          case 21:
          case "end":
            return _context12.stop();
        }
      }
    }, _callee11, this);
  }));
  return out;
}

// For channel identification
var genId = function () {
  var i = 0;
  return function () {
    i++;
    return "" + i;
  };
}();

var ID_ATTR = "__csp_channel_id";

// TODO: Do we need to check with hasOwnProperty?
function len(obj) {
  var count = 0;
  for (var p in obj) {
    count++;
  }
  return count;
}

function chanId(ch) {
  var id = ch[ID_ATTR];
  if (id === undefined) {
    id = ch[ID_ATTR] = genId();
  }
  return id;
}

var Mult = function Mult(ch) {
  this.taps = {};
  this.ch = ch;
};

var Tap = function Tap(channel, keepOpen) {
  this.channel = channel;
  this.keepOpen = keepOpen;
};

Mult.prototype.muxch = function () {
  return this.ch;
};

Mult.prototype.tap = function (ch, keepOpen) {
  var id = chanId(ch);
  this.taps[id] = new Tap(ch, keepOpen);
};

Mult.prototype.untap = function (ch) {
  delete this.taps[chanId(ch)];
};

Mult.prototype.untapAll = function () {
  this.taps = {};
};

function mult(ch) {
  var m = new Mult(ch);
  var dchan = chan(1);
  var dcount;
  function makeDoneCallback(tap) {
    return function (stillOpen) {
      dcount--;
      if (dcount === 0) {
        putAsync(dchan, true);
      }
      if (!stillOpen) {
        m.untap(tap.channel);
      }
    };
  }
  go(regeneratorRuntime.mark(function _callee12() {
    var value, id, t, taps, initDcount;
    return regeneratorRuntime.wrap(function _callee12$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            if (!true) {
              _context13.next = 17;
              break;
            }

            _context13.next = 3;
            return take(ch);

          case 3:
            value = _context13.sent;
            taps = m.taps;

            if (!(value === CLOSED)) {
              _context13.next = 9;
              break;
            }

            for (id in taps) {
              t = taps[id];
              if (!t.keepOpen) {
                t.channel.close();
              }
            }
            // TODO: Is this necessary?
            m.untapAll();
            return _context13.abrupt("break", 17);

          case 9:
            dcount = len(taps);
            // XXX: This is because putAsync can actually call back
            // immediately. Fix that
            initDcount = dcount;
            // Put value on tapping channels...

            for (id in taps) {
              t = taps[id];
              putAsync(t.channel, value, makeDoneCallback(t));
            }
            // ... waiting for all puts to complete

            if (!(initDcount > 0)) {
              _context13.next = 15;
              break;
            }

            _context13.next = 15;
            return take(dchan);

          case 15:
            _context13.next = 0;
            break;

          case 17:
          case "end":
            return _context13.stop();
        }
      }
    }, _callee12, this);
  }));
  return m;
}

mult.tap = function tap(m, ch, keepOpen) {
  m.tap(ch, keepOpen);
  return ch;
};

mult.untap = function untap(m, ch) {
  m.untap(ch);
};

mult.untapAll = function untapAll(m) {
  m.untapAll();
};

var Mix = function Mix(ch) {
  this.ch = ch;
  this.stateMap = {};
  this.change = chan();
  this.soloMode = mix.MUTE;
};

Mix.prototype._changed = function () {
  putAsync(this.change, true);
};

Mix.prototype._getAllState = function () {
  var allState = {};
  var stateMap = this.stateMap;
  var solos = [];
  var mutes = [];
  var pauses = [];
  var reads;
  for (var id in stateMap) {
    var chanData = stateMap[id];
    var state = chanData.state;
    var channel = chanData.channel;
    if (state[mix.SOLO]) {
      solos.push(channel);
    }
    // TODO
    if (state[mix.MUTE]) {
      mutes.push(channel);
    }
    if (state[mix.PAUSE]) {
      pauses.push(channel);
    }
  }
  var i, n;
  if (this.soloMode === mix.PAUSE && solos.length > 0) {
    n = solos.length;
    reads = new Array(n + 1);
    for (i = 0; i < n; i++) {
      reads[i] = solos[i];
    }
    reads[n] = this.change;
  } else {
    reads = [];
    for (id in stateMap) {
      chanData = stateMap[id];
      channel = chanData.channel;
      if (pauses.indexOf(channel) < 0) {
        reads.push(channel);
      }
    }
    reads.push(this.change);
  }

  return {
    solos: solos,
    mutes: mutes,
    reads: reads
  };
};

Mix.prototype.admix = function (ch) {
  this.stateMap[chanId(ch)] = {
    channel: ch,
    state: {}
  };
  this._changed();
};

Mix.prototype.unmix = function (ch) {
  delete this.stateMap[chanId(ch)];
  this._changed();
};

Mix.prototype.unmixAll = function () {
  this.stateMap = {};
  this._changed();
};

Mix.prototype.toggle = function (updateStateList) {
  // [[ch1, {}], [ch2, {solo: true}]];
  var length = updateStateList.length;
  for (var i = 0; i < length; i++) {
    var ch = updateStateList[i][0];
    var id = chanId(ch);
    var updateState = updateStateList[i][1];
    var chanData = this.stateMap[id];
    if (!chanData) {
      chanData = this.stateMap[id] = {
        channel: ch,
        state: {}
      };
    }
    for (var mode in updateState) {
      chanData.state[mode] = updateState[mode];
    }
  }
  this._changed();
};

Mix.prototype.setSoloMode = function (mode) {
  if (VALID_SOLO_MODES.indexOf(mode) < 0) {
    throw new Error("Mode must be one of: ", VALID_SOLO_MODES.join(", "));
  }
  this.soloMode = mode;
  this._changed();
};

function mix(out) {
  var m = new Mix(out);
  go(regeneratorRuntime.mark(function _callee13() {
    var state, result, value, channel, solos, stillOpen;
    return regeneratorRuntime.wrap(function _callee13$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            state = m._getAllState();

          case 1:
            if (!true) {
              _context14.next = 23;
              break;
            }

            _context14.next = 4;
            return alts(state.reads);

          case 4:
            result = _context14.sent;
            value = result.value;
            channel = result.channel;

            if (!(value === CLOSED)) {
              _context14.next = 11;
              break;
            }

            delete m.stateMap[chanId(channel)];
            state = m._getAllState();
            return _context14.abrupt("continue", 1);

          case 11:
            if (!(channel === m.change)) {
              _context14.next = 14;
              break;
            }

            state = m._getAllState();
            return _context14.abrupt("continue", 1);

          case 14:
            solos = state.solos;

            if (!(solos.indexOf(channel) > -1 || solos.length === 0 && !(state.mutes.indexOf(channel) > -1))) {
              _context14.next = 21;
              break;
            }

            _context14.next = 18;
            return put(out, value);

          case 18:
            stillOpen = _context14.sent;

            if (stillOpen) {
              _context14.next = 21;
              break;
            }

            return _context14.abrupt("break", 23);

          case 21:
            _context14.next = 1;
            break;

          case 23:
          case "end":
            return _context14.stop();
        }
      }
    }, _callee13, this);
  }));
  return m;
}

mix.MUTE = "mute";
mix.PAUSE = "pause";
mix.SOLO = "solo";
var VALID_SOLO_MODES = [mix.MUTE, mix.PAUSE];

mix.add = function admix(m, ch) {
  m.admix(ch);
};

mix.remove = function unmix(m, ch) {
  m.unmix(ch);
};

mix.removeAll = function unmixAll(m) {
  m.unmixAll();
};

mix.toggle = function toggle(m, updateStateList) {
  m.toggle(updateStateList);
};

mix.setSoloMode = function setSoloMode(m, mode) {
  m.setSoloMode(mode);
};

function constantlyNull() {
  return null;
}

var Pub = function Pub(ch, topicFn, bufferFn) {
  this.ch = ch;
  this.topicFn = topicFn;
  this.bufferFn = bufferFn;
  this.mults = {};
};

Pub.prototype._ensureMult = function (topic) {
  var m = this.mults[topic];
  var bufferFn = this.bufferFn;
  if (!m) {
    m = this.mults[topic] = mult(chan(bufferFn(topic)));
  }
  return m;
};

Pub.prototype.sub = function (topic, ch, keepOpen) {
  var m = this._ensureMult(topic);
  return mult.tap(m, ch, keepOpen);
};

Pub.prototype.unsub = function (topic, ch) {
  var m = this.mults[topic];
  if (m) {
    mult.untap(m, ch);
  }
};

Pub.prototype.unsubAll = function (topic) {
  if (topic === undefined) {
    this.mults = {};
  } else {
    delete this.mults[topic];
  }
};

function pub(ch, topicFn, bufferFn) {
  bufferFn = bufferFn || constantlyNull;
  var p = new Pub(ch, topicFn, bufferFn);
  go(regeneratorRuntime.mark(function _callee14() {
    var value, mults, topic, m, stillOpen;
    return regeneratorRuntime.wrap(function _callee14$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            if (!true) {
              _context15.next = 17;
              break;
            }

            _context15.next = 3;
            return take(ch);

          case 3:
            value = _context15.sent;
            mults = p.mults;

            if (!(value === CLOSED)) {
              _context15.next = 8;
              break;
            }

            for (topic in mults) {
              mults[topic].muxch().close();
            }
            return _context15.abrupt("break", 17);

          case 8:
            // TODO: Somehow ensure/document that this must return a string
            // (otherwise use proper (hash)maps)
            topic = topicFn(value);
            m = mults[topic];

            if (!m) {
              _context15.next = 15;
              break;
            }

            _context15.next = 13;
            return put(m.muxch(), value);

          case 13:
            stillOpen = _context15.sent;

            if (!stillOpen) {
              delete mults[topic];
            }

          case 15:
            _context15.next = 0;
            break;

          case 17:
          case "end":
            return _context15.stop();
        }
      }
    }, _callee14, this);
  }));
  return p;
}

pub.sub = function sub(p, topic, ch, keepOpen) {
  return p.sub(topic, ch, keepOpen);
};

pub.unsub = function unsub(p, topic, ch) {
  p.unsub(topic, ch);
};

pub.unsubAll = function unsubAll(p, topic) {
  p.unsubAll(topic);
};

module.exports = {
  mapFrom: mapFrom,
  mapInto: mapInto,
  filterFrom: filterFrom,
  filterInto: filterInto,
  removeFrom: removeFrom,
  removeInto: removeInto,
  mapcatFrom: mapcatFrom,
  mapcatInto: mapcatInto,

  pipe: pipe,
  split: split,
  reduce: reduce,
  onto: onto,
  fromColl: fromColl,

  map: map,
  merge: merge,
  into: into,
  take: takeN,
  unique: unique,
  partition: partition,
  partitionBy: partitionBy,

  mult: mult,
  mix: mix,
  pub: pub
};

// Possible "fluid" interfaces:

// thread(
//   [fromColl, [1, 2, 3, 4]],
//   [mapFrom, inc],
//   [into, []]
// )

// thread(
//   [fromColl, [1, 2, 3, 4]],
//   [mapFrom, inc, _],
//   [into, [], _]
// )

// wrap()
//   .fromColl([1, 2, 3, 4])
//   .mapFrom(inc)
//   .into([])
//   .unwrap();

},{"./csp.core":1,"./impl/channels":5}],3:[function(require,module,exports){
"use strict";

var csp = require('./csp.core');

function pipelineInternal(n, to, from, close, taskFn) {
  if (n <= 0) {
    throw new Error('n must be positive');
  }

  var jobs = csp.chan(n);
  var results = csp.chan(n);

  for (var _ = 0; _ < n; _++) {
    csp.go(regeneratorRuntime.mark(function _callee(taskFn, jobs, results) {
      var job;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (!true) {
                _context.next = 9;
                break;
              }

              _context.next = 3;
              return csp.take(jobs);

            case 3:
              job = _context.sent;

              if (taskFn(job)) {
                _context.next = 7;
                break;
              }

              results.close();
              return _context.abrupt('break', 9);

            case 7:
              _context.next = 0;
              break;

            case 9:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this);
    }), [taskFn, jobs, results]);
  }

  csp.go(regeneratorRuntime.mark(function _callee2(jobs, from, results) {
    var v, p;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            if (!true) {
              _context2.next = 16;
              break;
            }

            _context2.next = 3;
            return csp.take(from);

          case 3:
            v = _context2.sent;

            if (!(v === csp.CLOSED)) {
              _context2.next = 9;
              break;
            }

            jobs.close();
            return _context2.abrupt('break', 16);

          case 9:
            p = csp.chan(1);
            _context2.next = 12;
            return csp.put(jobs, [v, p]);

          case 12:
            _context2.next = 14;
            return csp.put(results, p);

          case 14:
            _context2.next = 0;
            break;

          case 16:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }), [jobs, from, results]);

  csp.go(regeneratorRuntime.mark(function _callee3(results, close, to) {
    var p, res, v;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            if (!true) {
              _context3.next = 26;
              break;
            }

            _context3.next = 3;
            return csp.take(results);

          case 3:
            p = _context3.sent;

            if (!(p === csp.CLOSED)) {
              _context3.next = 9;
              break;
            }

            if (close) {
              to.close();
            }
            return _context3.abrupt('break', 26);

          case 9:
            _context3.next = 11;
            return csp.take(p);

          case 11:
            res = _context3.sent;

          case 12:
            if (!true) {
              _context3.next = 24;
              break;
            }

            _context3.next = 15;
            return csp.take(res);

          case 15:
            v = _context3.sent;

            if (!(v !== csp.CLOSED)) {
              _context3.next = 21;
              break;
            }

            _context3.next = 19;
            return csp.put(to, v);

          case 19:
            _context3.next = 22;
            break;

          case 21:
            return _context3.abrupt('break', 24);

          case 22:
            _context3.next = 12;
            break;

          case 24:
            _context3.next = 0;
            break;

          case 26:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }), [results, close, to]);

  return to;
}

function pipeline(to, xf, from, keepOpen, exHandler) {

  function taskFn(job) {
    if (job === csp.CLOSED) {
      return null;
    } else {
      var v = job[0];
      var p = job[1];
      var res = csp.chan(1, xf, exHandler);

      csp.go(regeneratorRuntime.mark(function _callee4(res, v) {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return csp.put(res, v);

              case 2:
                res.close();

              case 3:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }), [res, v]);

      csp.putAsync(p, res);

      return true;
    }
  }

  return pipelineInternal(1, to, from, !keepOpen, taskFn);
}

function pipelineAsync(n, to, af, from, keepOpen) {

  function taskFn(job) {
    if (job === csp.CLOSED) {
      return null;
    } else {
      var v = job[0];
      var p = job[1];
      var res = csp.chan(1);
      af(v, res);
      csp.putAsync(p, res);
      return true;
    }
  }

  return pipelineInternal(n, to, from, !keepOpen, taskFn);
}

module.exports = {
  pipeline: pipeline,
  pipelineAsync: pipelineAsync
};

},{"./csp.core":1}],4:[function(require,module,exports){
"use strict";

// TODO: Consider EmptyError & FullError to avoid redundant bound
// checks, to improve performance (may need benchmarks)

function acopy(src, src_start, dst, dst_start, length) {
  var count = 0;
  while (true) {
    if (count >= length) {
      break;
    }
    dst[dst_start + count] = src[src_start + count];
    count++;
  }
}

var EMPTY = {
  toString: function toString() {
    return "[object EMPTY]";
  }
};

var RingBuffer = function RingBuffer(head, tail, length, array) {
  this.length = length;
  this.array = array;
  this.head = head;
  this.tail = tail;
};

// Internal method, callers must do bound check
RingBuffer.prototype._unshift = function (item) {
  var array = this.array;
  var head = this.head;
  array[head] = item;
  this.head = (head + 1) % array.length;
  this.length++;
};

RingBuffer.prototype._resize = function () {
  var array = this.array;
  var new_length = 2 * array.length;
  var new_array = new Array(new_length);
  var head = this.head;
  var tail = this.tail;
  var length = this.length;
  if (tail < head) {
    acopy(array, tail, new_array, 0, length);
    this.tail = 0;
    this.head = length;
    this.array = new_array;
  } else if (tail > head) {
    acopy(array, tail, new_array, 0, array.length - tail);
    acopy(array, 0, new_array, array.length - tail, head);
    this.tail = 0;
    this.head = length;
    this.array = new_array;
  } else if (tail === head) {
    this.tail = 0;
    this.head = 0;
    this.array = new_array;
  }
};

RingBuffer.prototype.unbounded_unshift = function (item) {
  if (this.length + 1 === this.array.length) {
    this._resize();
  }
  this._unshift(item);
};

RingBuffer.prototype.pop = function () {
  if (this.length === 0) {
    return EMPTY;
  }
  var array = this.array;
  var tail = this.tail;
  var item = array[tail];
  array[tail] = null;
  this.tail = (tail + 1) % array.length;
  this.length--;
  return item;
};

RingBuffer.prototype.cleanup = function (predicate) {
  var length = this.length;
  for (var i = 0; i < length; i++) {
    var item = this.pop();
    if (predicate(item)) {
      this._unshift(item);
    }
  }
};

var FixedBuffer = function FixedBuffer(buf, n) {
  this.buf = buf;
  this.n = n;
};

FixedBuffer.prototype.is_full = function () {
  return this.buf.length >= this.n;
};

FixedBuffer.prototype.remove = function () {
  return this.buf.pop();
};

FixedBuffer.prototype.add = function (item) {
  // Note that even though the underlying buffer may grow, "n" is
  // fixed so after overflowing the buffer is still considered full.
  this.buf.unbounded_unshift(item);
};

FixedBuffer.prototype.count = function () {
  return this.buf.length;
};

var DroppingBuffer = function DroppingBuffer(buf, n) {
  this.buf = buf;
  this.n = n;
};

DroppingBuffer.prototype.is_full = function () {
  return false;
};

DroppingBuffer.prototype.remove = function () {
  return this.buf.pop();
};

DroppingBuffer.prototype.add = function (item) {
  if (this.buf.length < this.n) {
    this.buf._unshift(item);
  }
};

DroppingBuffer.prototype.count = function () {
  return this.buf.length;
};

var SlidingBuffer = function SlidingBuffer(buf, n) {
  this.buf = buf;
  this.n = n;
};

SlidingBuffer.prototype.is_full = function () {
  return false;
};

SlidingBuffer.prototype.remove = function () {
  return this.buf.pop();
};

SlidingBuffer.prototype.add = function (item) {
  if (this.buf.length === this.n) {
    this.buf.pop();
  }
  this.buf._unshift(item);
};

SlidingBuffer.prototype.count = function () {
  return this.buf.length;
};

var ring = exports.ring = function ring_buffer(n) {
  return new RingBuffer(0, 0, 0, new Array(n));
};

/**
 * Returns a buffer that is considered "full" when it reaches size n,
 * but still accepts additional items, effectively allow overflowing.
 * The overflowing behavior is useful for supporting "expanding"
 * transducers, where we want to check if a buffer is full before
 * running the transduced step function, while still allowing a
 * transduced step to expand into multiple "essence" steps.
 */
exports.fixed = function fixed_buffer(n) {
  return new FixedBuffer(ring(n), n);
};

exports.dropping = function dropping_buffer(n) {
  return new DroppingBuffer(ring(n), n);
};

exports.sliding = function sliding_buffer(n) {
  return new SlidingBuffer(ring(n), n);
};

exports.EMPTY = EMPTY;

},{}],5:[function(require,module,exports){
"use strict";

var buffers = require("./buffers");
var dispatch = require("./dispatch");

var MAX_DIRTY = 64;
var MAX_QUEUE_SIZE = 1024;

var CLOSED = null;

var Box = function Box(value) {
  this.value = value;
};

var PutBox = function PutBox(handler, value) {
  this.handler = handler;
  this.value = value;
};

var Channel = function Channel(takes, puts, buf, xform) {
  this.buf = buf;
  this.xform = xform;
  this.takes = takes;
  this.puts = puts;

  this.dirty_takes = 0;
  this.dirty_puts = 0;
  this.closed = false;
};

function isReduced(v) {
  return v && v["@@transducer/reduced"];
}

function schedule(f, v) {
  dispatch.run(function () {
    f(v);
  });
}

Channel.prototype._put = function (value, handler) {
  if (value === CLOSED) {
    throw new Error("Cannot put CLOSED on a channel.");
  }

  // TODO: I'm not sure how this can happen, because the operations
  // are registered in 1 tick, and the only way for this to be inactive
  // is for a previous operation in the same alt to have returned
  // immediately, which would have short-circuited to prevent this to
  // be ever register anyway. The same thing goes for the active check
  // in "_take".
  if (!handler.is_active()) {
    return null;
  }

  if (this.closed) {
    handler.commit();
    return new Box(false);
  }

  var taker, callback;

  // Soak the value through the buffer first, even if there is a
  // pending taker. This way the step function has a chance to act on the
  // value.
  if (this.buf && !this.buf.is_full()) {
    handler.commit();
    var done = isReduced(this.xform["@@transducer/step"](this.buf, value));
    while (true) {
      if (this.buf.count() === 0) {
        break;
      }
      taker = this.takes.pop();
      if (taker === buffers.EMPTY) {
        break;
      }
      if (taker.is_active()) {
        value = this.buf.remove();
        callback = taker.commit();
        schedule(callback, value);
      }
    }
    if (done) {
      this.close();
    }
    return new Box(true);
  }

  // Either the buffer is full, in which case there won't be any
  // pending takes, or we don't have a buffer, in which case this loop
  // fulfills the first of them that is active (note that we don't
  // have to worry about transducers here since we require a buffer
  // for that).
  while (true) {
    taker = this.takes.pop();
    if (taker === buffers.EMPTY) {
      break;
    }
    if (taker.is_active()) {
      handler.commit();
      callback = taker.commit();
      schedule(callback, value);
      return new Box(true);
    }
  }

  // No buffer, full buffer, no pending takes. Queue this put now if blockable.
  if (this.dirty_puts > MAX_DIRTY) {
    this.puts.cleanup(function (putter) {
      return putter.handler.is_active();
    });
    this.dirty_puts = 0;
  } else {
    this.dirty_puts++;
  }
  if (handler.is_blockable()) {
    if (this.puts.length >= MAX_QUEUE_SIZE) {
      throw new Error("No more than " + MAX_QUEUE_SIZE + " pending puts are allowed on a single channel.");
    }
    this.puts.unbounded_unshift(new PutBox(handler, value));
  }
  return null;
};

Channel.prototype._take = function (handler) {
  if (!handler.is_active()) {
    return null;
  }

  var putter, put_handler, callback, value;

  if (this.buf && this.buf.count() > 0) {
    handler.commit();
    value = this.buf.remove();
    // We need to check pending puts here, other wise they won't
    // be able to proceed until their number reaches MAX_DIRTY
    while (true) {
      if (this.buf.is_full()) {
        break;
      }
      putter = this.puts.pop();
      if (putter === buffers.EMPTY) {
        break;
      }
      put_handler = putter.handler;
      if (put_handler.is_active()) {
        callback = put_handler.commit();
        if (callback) {
          schedule(callback, true);
        }
        if (isReduced(this.xform["@@transducer/step"](this.buf, putter.value))) {
          this.close();
        }
      }
    }
    return new Box(value);
  }

  // Either the buffer is empty, in which case there won't be any
  // pending puts, or we don't have a buffer, in which case this loop
  // fulfills the first of them that is active (note that we don't
  // have to worry about transducers here since we require a buffer
  // for that).
  while (true) {
    putter = this.puts.pop();
    value = putter.value;
    if (putter === buffers.EMPTY) {
      break;
    }
    put_handler = putter.handler;
    if (put_handler.is_active()) {
      handler.commit();
      callback = put_handler.commit();
      if (callback) {
        schedule(callback, true);
      }
      return new Box(value);
    }
  }

  if (this.closed) {
    handler.commit();
    return new Box(CLOSED);
  }

  // No buffer, empty buffer, no pending puts. Queue this take now if blockable.
  if (this.dirty_takes > MAX_DIRTY) {
    this.takes.cleanup(function (handler) {
      return handler.is_active();
    });
    this.dirty_takes = 0;
  } else {
    this.dirty_takes++;
  }
  if (handler.is_blockable()) {
    if (this.takes.length >= MAX_QUEUE_SIZE) {
      throw new Error("No more than " + MAX_QUEUE_SIZE + " pending takes are allowed on a single channel.");
    }
    this.takes.unbounded_unshift(handler);
  }
  return null;
};

Channel.prototype.close = function () {
  if (this.closed) {
    return;
  }
  this.closed = true;

  // TODO: Duplicate code. Make a "_flush" function or something
  if (this.buf) {
    this.xform["@@transducer/result"](this.buf);
    while (true) {
      if (this.buf.count() === 0) {
        break;
      }
      taker = this.takes.pop();
      if (taker === buffers.EMPTY) {
        break;
      }
      if (taker.is_active()) {
        callback = taker.commit();
        var value = this.buf.remove();
        schedule(callback, value);
      }
    }
  }

  while (true) {
    var taker = this.takes.pop();
    if (taker === buffers.EMPTY) {
      break;
    }
    if (taker.is_active()) {
      var callback = taker.commit();
      schedule(callback, CLOSED);
    }
  }

  while (true) {
    var putter = this.puts.pop();
    if (putter === buffers.EMPTY) {
      break;
    }
    if (putter.handler.is_active()) {
      var put_callback = putter.handler.commit();
      if (put_callback) {
        schedule(put_callback, false);
      }
    }
  }
};

Channel.prototype.is_closed = function () {
  return this.closed;
};

function defaultHandler(e) {
  console.log('error in channel transformer', e.stack);
  return CLOSED;
}

function handleEx(buf, exHandler, e) {
  var def = (exHandler || defaultHandler)(e);
  if (def !== CLOSED) {
    buf.add(def);
  }
  return buf;
}

// The base transformer object to use with transducers
function AddTransformer() {}

AddTransformer.prototype["@@transducer/init"] = function () {
  throw new Error('init not available');
};

AddTransformer.prototype["@@transducer/result"] = function (v) {
  return v;
};

AddTransformer.prototype["@@transducer/step"] = function (buffer, input) {
  buffer.add(input);
  return buffer;
};

function handleException(exHandler) {
  return function (xform) {
    return {
      "@@transducer/step": function transducerStep(buffer, input) {
        try {
          return xform["@@transducer/step"](buffer, input);
        } catch (e) {
          return handleEx(buffer, exHandler, e);
        }
      },
      "@@transducer/result": function transducerResult(buffer) {
        try {
          return xform["@@transducer/result"](buffer);
        } catch (e) {
          return handleEx(buffer, exHandler, e);
        }
      }
    };
  };
}

// XXX: This is inconsistent. We should either call the reducing
// function xform, or call the transducer xform, not both
exports.chan = function (buf, xform, exHandler) {
  if (xform) {
    if (!buf) {
      throw new Error("Only buffered channels can use transducers");
    }

    xform = xform(new AddTransformer());
  } else {
    xform = new AddTransformer();
  }
  xform = handleException(exHandler)(xform);

  return new Channel(buffers.ring(32), buffers.ring(32), buf, xform);
};

exports.Box = Box;
exports.Channel = Channel;
exports.CLOSED = CLOSED;

},{"./buffers":4,"./dispatch":6}],6:[function(require,module,exports){
"use strict";

// TODO: Use process.nextTick if it's available since it's more
// efficient
// http://howtonode.org/understanding-process-next-tick
// Maybe we don't even need to queue ourselves in that case?

// XXX: But http://blog.nodejs.org/2013/03/11/node-v0-10-0-stable/
// Looks like it will blow up the stack (or is that just about
// pre-empting IO (but that's already bad enough IMO)?)

// Looks like
// http://nodejs.org/api/process.html#process_process_nexttick_callback
// is the equivalent of our TASK_BATCH_SIZE

var buffers = require("./buffers");

var TASK_BATCH_SIZE = 1024;

var tasks = buffers.ring(32);
var running = false;
var queued = false;

var queue_dispatcher;

function process_messages() {
  running = true;
  queued = false;
  var count = 0;
  while (true) {
    var task = tasks.pop();
    if (task === buffers.EMPTY) {
      break;
    }
    // TODO: Don't we need a try/finally here?
    task();
    if (count >= TASK_BATCH_SIZE) {
      break;
    }
    count++;
  }
  running = false;
  if (tasks.length > 0) {
    queue_dispatcher();
  }
}

if (typeof MessageChannel !== "undefined") {
  var message_channel = new MessageChannel();
  message_channel.port1.onmessage = function (_) {
    process_messages();
  };
  queue_dispatcher = function queue_dispatcher() {
    if (!(queued && running)) {
      queued = true;
      message_channel.port2.postMessage(0);
    }
  };
} else if (typeof setImmediate !== "undefined") {
  queue_dispatcher = function queue_dispatcher() {
    if (!(queued && running)) {
      queued = true;
      setImmediate(process_messages);
    }
  };
} else {
  queue_dispatcher = function queue_dispatcher() {
    if (!(queued && running)) {
      queued = true;
      setTimeout(process_messages, 0);
    }
  };
}

exports.run = function (f) {
  tasks.unbounded_unshift(f);
  queue_dispatcher();
};

exports.queue_delay = function (f, delay) {
  setTimeout(f, delay);
};

},{"./buffers":4}],7:[function(require,module,exports){
"use strict";

var dispatch = require("./dispatch");
var select = require("./select");
var Channel = require("./channels").Channel;

var NO_VALUE = {};

var FnHandler = function FnHandler(blockable, f) {
  this.f = f;
  this.blockable = blockable;
};

FnHandler.prototype.is_active = function () {
  return true;
};

FnHandler.prototype.is_blockable = function () {
  return this.blockable;
};

FnHandler.prototype.commit = function () {
  return this.f;
};

function put_then_callback(channel, value, callback) {
  var result = channel._put(value, new FnHandler(true, callback));
  if (result && callback) {
    callback(result.value);
  }
}

function take_then_callback(channel, callback) {
  var result = channel._take(new FnHandler(true, callback));
  if (result) {
    callback(result.value);
  }
}

var Process = function Process(gen, onFinish, creator) {
  this.gen = gen;
  this.creatorFunc = creator;
  this.finished = false;
  this.onFinish = onFinish;
};

var Instruction = function Instruction(op, data) {
  this.op = op;
  this.data = data;
};

var TAKE = "take";
var PUT = "put";
var SLEEP = "sleep";
var ALTS = "alts";

// TODO FIX XXX: This is a (probably) temporary hack to avoid blowing
// up the stack, but it means double queueing when the value is not
// immediately available
Process.prototype._continue = function (response) {
  var self = this;
  dispatch.run(function () {
    self.run(response);
  });
};

Process.prototype._done = function (value) {
  if (!this.finished) {
    this.finished = true;
    var onFinish = this.onFinish;
    if (typeof onFinish === "function") {
      dispatch.run(function () {
        onFinish(value);
      });
    }
  }
};

Process.prototype.run = function (response) {
  if (this.finished) {
    return;
  }

  // TODO: Shouldn't we (optionally) stop error propagation here (and
  // signal the error through a channel or something)? Otherwise the
  // uncaught exception will crash some runtimes (e.g. Node)
  var iter = this.gen.next(response);
  if (iter.done) {
    this._done(iter.value);
    return;
  }

  var ins = iter.value;
  var self = this;

  if (ins instanceof Instruction) {
    switch (ins.op) {
      case PUT:
        var data = ins.data;
        put_then_callback(data.channel, data.value, function (ok) {
          self._continue(ok);
        });
        break;

      case TAKE:
        var channel = ins.data;
        take_then_callback(channel, function (value) {
          self._continue(value);
        });
        break;

      case SLEEP:
        var msecs = ins.data;
        dispatch.queue_delay(function () {
          self.run(null);
        }, msecs);
        break;

      case ALTS:
        select.do_alts(ins.data.operations, function (result) {
          self._continue(result);
        }, ins.data.options);
        break;
    }
  } else if (ins instanceof Channel) {
    var channel = ins;
    take_then_callback(channel, function (value) {
      self._continue(value);
    });
  } else {
    this._continue(ins);
  }
};

function take(channel) {
  return new Instruction(TAKE, channel);
}

function put(channel, value) {
  return new Instruction(PUT, {
    channel: channel,
    value: value
  });
}

function poll(channel) {
  if (channel.closed) {
    return NO_VALUE;
  }

  var result = channel._take(new FnHandler(false));
  if (result) {
    return result.value;
  } else {
    return NO_VALUE;
  }
}

function offer(channel, value) {
  if (channel.closed) {
    return false;
  }

  var result = channel._put(value, new FnHandler(false));
  if (result) {
    return true;
  } else {
    return false;
  }
}

function sleep(msecs) {
  return new Instruction(SLEEP, msecs);
}

function alts(operations, options) {
  return new Instruction(ALTS, {
    operations: operations,
    options: options
  });
}

exports.put_then_callback = put_then_callback;
exports.take_then_callback = take_then_callback;
exports.put = put;
exports.take = take;
exports.offer = offer;
exports.poll = poll;
exports.sleep = sleep;
exports.alts = alts;
exports.Instruction = Instruction;
exports.Process = Process;
exports.NO_VALUE = NO_VALUE;

},{"./channels":5,"./dispatch":6,"./select":8}],8:[function(require,module,exports){
"use strict";

var Box = require("./channels").Box;

var AltHandler = function AltHandler(flag, f) {
  this.f = f;
  this.flag = flag;
};

AltHandler.prototype.is_active = function () {
  return this.flag.value;
};

AltHandler.prototype.is_blockable = function () {
  return true;
};

AltHandler.prototype.commit = function () {
  this.flag.value = false;
  return this.f;
};

var AltResult = function AltResult(value, channel) {
  this.value = value;
  this.channel = channel;
};

function rand_int(n) {
  return Math.floor(Math.random() * (n + 1));
}

function random_array(n) {
  var a = new Array(n);
  var i;
  for (i = 0; i < n; i++) {
    a[i] = 0;
  }
  for (i = 1; i < n; i++) {
    var j = rand_int(i);
    a[i] = a[j];
    a[j] = i;
  }
  return a;
}

var hasOwnProperty = Object.prototype.hasOwnProperty;

var DEFAULT = {
  toString: function toString() {
    return "[object DEFAULT]";
  }
};

// TODO: Accept a priority function or something
exports.do_alts = function (operations, callback, options) {
  var length = operations.length;
  // XXX Hmm
  if (length === 0) {
    throw new Error("Empty alt list");
  }

  var priority = options && options.priority ? true : false;
  if (!priority) {
    var indexes = random_array(length);
  }

  var flag = new Box(true);

  for (var i = 0; i < length; i++) {
    var operation = operations[priority ? i : indexes[i]];
    var port, result;
    // XXX Hmm
    if (operation instanceof Array) {
      var value = operation[1];
      port = operation[0];
      // We wrap this in a function to capture the value of "port",
      // because js' closure captures vars by "references", not
      // values. "let port" would have worked, but I don't want to
      // raise the runtime requirement yet. TODO: So change this when
      // most runtimes are modern enough.
      result = port._put(value, function (port) {
        return new AltHandler(flag, function (ok) {
          callback(new AltResult(ok, port));
        });
      }(port));
    } else {
      port = operation;
      result = port._take(function (port) {
        return new AltHandler(flag, function (value) {
          callback(new AltResult(value, port));
        });
      }(port));
    }
    // XXX Hmm
    if (result instanceof Box) {
      callback(new AltResult(result.value, port));
      break;
    }
  }

  if (!(result instanceof Box) && options && hasOwnProperty.call(options, "default")) {
    if (flag.value) {
      flag.value = false;
      callback(new AltResult(options["default"], DEFAULT));
    }
  }
};

exports.DEFAULT = DEFAULT;

},{"./channels":5}],9:[function(require,module,exports){
"use strict";

var dispatch = require("./dispatch");
var channels = require("./channels");

exports.timeout = function timeout_channel(msecs) {
  var chan = channels.chan();
  dispatch.queue_delay(function () {
    chan.close();
  }, msecs);
  return chan;
};

},{"./channels":5,"./dispatch":6}],"csp":[function(require,module,exports){
"use strict";

var csp = require("./csp.core");
var operations = require("./csp.operations");
var pipeline = require('./csp.pipeline');

csp.operations = operations;
csp.operations.pipeline = pipeline.pipeline;
csp.operations.pipelineAsync = pipeline.pipelineAsync;

module.exports = csp;

},{"./csp.core":1,"./csp.operations":2,"./csp.pipeline":3}]},{},[]);
