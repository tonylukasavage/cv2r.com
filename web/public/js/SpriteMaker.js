(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],2:[function(require,module,exports){
const EventEmitter = require('events');
const { colors, palette } = require('./data');
const { rgb2hex } = require('./utils');

class ColorPicker extends EventEmitter {
	constructor() {
		super();
		const self = this;
		colors.forEach((color, index) => {
			var rowIndex = Math.floor(index / 16);
			var button = $(document.createElement('button'));
			button.data('pi', index);
			button.addClass('picker-button');
			button.css('background-color', '#' + color.hex);
			$('#cp-row-' + (rowIndex + 1)).append(button);

			button.click(function() {
				var paletteButton = $('.palette-button-selected').first();
				var bgc = $(this).css('background-color');
				if (bgc.indexOf('rgb') === 0) {
					bgc = rgb2hex(bgc);
				}
				var paletteIndex = parseInt(paletteButton.data('pi'), 10);
				paletteButton.css('background-color', '#' + bgc);
				palette[paletteIndex].hex = bgc;
				palette[paletteIndex].index = parseInt($(this).attr('data-pi'), 10);

				self.emit('update');
			});
		});
	}
}

module.exports = ColorPicker;
},{"./data":8,"./utils":9,"events":1}],3:[function(require,module,exports){
const EventEmitter = require('events');
const { CHR, palette } = require('./data');
const { getPaletteIndex, loadChr, resizeCanvas } = require('./utils');

class Editor extends EventEmitter {
	constructor() {
		super();
		this.chrIndex = 0;
		this.zoom = 16;
		this.mousedown = false;
		this.pixels = [];

		// create canvas for editor
		const canvas = document.createElement('canvas');
		canvas.className = 'editor-canvas';
		canvas.id = 'editor-canvas';
		$('#editor-container').append(canvas);
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');

		// add drawing events for editor canvas
		canvas.addEventListener('click', this.drawPixel.bind(this), false);
		canvas.addEventListener('mouseup', () => this.mousedown = false);
		canvas.addEventListener('mousedown', ev => {
			this.mousedown = true;
			this.drawPixel(ev);
		});
		canvas.addEventListener('mousemove', ev => {
			if (this.mousedown) {
				this.drawPixel(ev);
			}
		});

		// load default CHR data into editor and draw
		this.updateChr(null, this.chrIndex);
	}

	draw() {
		const { ctx, zoom } = this;
		this.pixels.forEach(p => {
			ctx.fillStyle = '#' + palette[p.paletteIndex].hex;
			ctx.fillRect(p.x, p.y, zoom, zoom);
		});
		this.grid.draw();
		this.dividers.draw();
	}

	drawPixel(ev) {
		const { chrIndex } = this;
		const chrData = CHR[this.chrIndex];
		const rect = this.canvas.getBoundingClientRect();
		const x = ev.clientX - rect.left;
		const y = ev.clientY - rect.top;
		const xScale = Math.floor(x / this.zoom);
		const yScale = Math.floor(y / this.zoom);
		let pixelIndex = (yScale * chrData.width) + xScale;

		if (chrData.width > 8) {
			let offset = 0;
			if (xScale >= chrData.width / 2) { offset++; }
			if (yScale >= chrData.height / 2) { offset++; }
			pixelIndex = (64 * offset) + (yScale * 8) + (xScale % 8);
		}

		const paletteIndex = getPaletteIndex();
		this.pixels[pixelIndex].paletteIndex = paletteIndex;
		this.draw();
		this.emit('pixel', { chrIndex, paletteIndex, pixelIndex });
	}

	updateChr(tiles, chrIndex) {
		this.chrIndex = chrIndex;
		const { width, height } = loadChr(tiles, chrIndex, this.pixels, this.zoom);
		resizeCanvas.call(this, this.canvas, width, height, this.zoom);
		this.grid = new Grid(this);
		this.dividers = new Dividers(this);
		this.draw();
	}
}

class Dividers {
	constructor(editor) {
		Object.assign(this, {
			style: 'rgba(255,255,255,0.8)',
			show: true,
			editor
		});
	}

	draw() {
		if (this.show) {
			const { ctx, height, width, zoom } = this.editor;
			ctx.strokeStyle = this.style;
			ctx.beginPath();
			ctx.moveTo(0, height * zoom / 2);
			ctx.lineTo(width * zoom, height * zoom / 2);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(width * zoom / 2, 0);
			ctx.lineTo(width * zoom / 2, height * zoom);
			ctx.stroke();
		}
	}
}

class Grid {
	constructor(editor) {
		Object.assign(this, {
			style: 'rgba(255,255,255,0.5)',
			show: true,
			editor
		});
	}

	draw() {
		if (this.show) {
			const { ctx, height, width, zoom } = this.editor;
			ctx.strokeStyle = this.style;
			for (let i = 0; i < width + 1; i++) {
				ctx.beginPath();
				ctx.moveTo(i * zoom, 0);
				ctx.lineTo(i * zoom, height * zoom);
				ctx.stroke();
			}
			for (let i = 0; i <height + 1; i++) {
				ctx.beginPath();
				ctx.moveTo(0, i * zoom);
				ctx.lineTo(width * zoom, i * zoom);
				ctx.stroke();
			}
		}
	}
}

module.exports = Editor;
},{"./data":8,"./utils":9,"events":1}],4:[function(require,module,exports){
const { palette } = require('./data');

class Palette {
	constructor() {
		palette.forEach((p, index) => {
			const button = $('<button></button>');
			button.addClass('palette-button');
			if (index === 0) {
				button.addClass('palette-button-selected');
			}
			button.css('background-color', '#' + p.hex);
			button.data('pi', index);
			$('#palette-container').append(button);

			button.click(function() {
				var self = this;
				$('.palette-button').each(function() {
					if (this === self) {
						$(this).addClass('palette-button-selected');
					} else {
						$(this).removeClass('palette-button-selected');
					}
				});
			});
		});
	}
}

module.exports = Palette;
},{"./data":8}],5:[function(require,module,exports){
const ColorPicker = require('./ColorPicker');
const Editor = require('./Editor');
const Palette = require('./Palette');
const Tiles = require('./Tiles');
const States = require('./States');

class SpriteMaker {
	constructor() {
		this.editor = new Editor();
		this.tiles = new Tiles();
		this.states = new States(this.tiles, this.editor.chrIndex);
		this.palette = new Palette();
		this.colorPicker = new ColorPicker();

		this.editor.on('pixel', this.tiles.updatePixel.bind(this.tiles));
		this.tiles.on('click', chrIndex => {
			this.editor.updateChr(this.tiles, chrIndex);
			this.states.showAffected(chrIndex);
		});
		this.colorPicker.on('update', this.draw.bind(this));

		$('#fps').change(this.states.updateFps.bind(this.states));
	}

	draw() {
		this.editor.draw();
		this.tiles.draw();
		this.states.draw();
	}
}

window.SpriteMaker = SpriteMaker;
},{"./ColorPicker":2,"./Editor":3,"./Palette":4,"./States":6,"./Tiles":7}],6:[function(require,module,exports){
const { CHR, palette, states } = require('./data');
const { resizeCanvas } = require('./utils');

class States {
	constructor(tiles, chrIndex) {
		Object.assign(this, {
			animations: [],
			zoom: 3,
			fps: 3
		});

		states.forEach((state, index) => {
			const canvas = $('<canvas></canvas>');
			canvas.addClass('state-canvas');
			canvas.attr('data-sid', index);
			$('#states').append(canvas);
			state.canvas = canvas;
			state.ctx = canvas[0].getContext('2d');
			state.frameCount = 0;

			state.frames.forEach(frame => {
				frame.forEach(part => {
					part.pixels = tiles.pixels.find(pixels => {
						return pixels.name === part.name;
					});
				});
			});
			resizeCanvas.call(this, canvas, state.width, state.height, this.zoom);
		});

		this.updateFps(this.fps);
		this.showAffected(chrIndex);
	}

	updateFps(fps) {
		if (!$.isNumeric(fps)) {
			fps = $('#fps').val();
		}
		this.fps = fps;
		if (this.interval) {
			clearInterval(this.interval);
		}
		if (fps > 0) {
			this.interval = setInterval(this.draw.bind(this), 1000 / this.fps);
		}
	}

	showAffected(chrIndex) {
		const chrName = CHR[chrIndex].name;
		states.forEach((state, index) => {
			const found = state.frames.find(frame => frame.find(f => f.name === chrName));
			const stateCanvas = $('canvas[data-sid="' + index + '"]');
			if (found) {
				stateCanvas.css('display', '');
			} else {
				stateCanvas.css('display', 'none');
			}
		});
	}

	draw() {
		states.forEach(state => {
			const { ctx } = state;
			ctx.clearRect(0, 0, state.width * this.zoom, state.height * this.zoom);

			const frame = state.frames[state.frameCount];
			frame.forEach(part => {
				part.pixels.forEach(p => {
					ctx.fillStyle = '#' + palette[p.paletteIndex].hex;
					ctx.fillRect(
						p.x + (part.x > 0 ? 4 * part.x * this.zoom : 0), 
						p.y + (part.y > 0 ? 8 * part.y * this.zoom : 0), 
						this.zoom, 
						this.zoom
					);
				});
			});
			state.frameCount++;
			if (state.frameCount >= state.frames.length) {
				state.frameCount = 0;
			}
		});
	}
}

module.exports = States;
},{"./data":8,"./utils":9}],7:[function(require,module,exports){
const EventEmitter = require('events');
const { CHR, palette } = require('./data');
const { loadChr, resizeCanvas } = require('./utils');

class Tiles extends EventEmitter {
	constructor() {
		super();
		this.pixels = [];
		this.zoom = 3;

		const self = this;
		CHR.forEach((chr, index) => {
			const canvas = $('<canvas></canvas>');
			canvas.addClass('tile-canvas');
			canvas.data('tid', index);
			canvas.click(() => {
				self.emit('click', index);
			});
			$('#tiles').append(canvas);

			const pixels = [];
			pixels.name = chr.name;
			loadChr(null, index, pixels, this.zoom);
			this.pixels.push(pixels);

			pixels.canvas = canvas;
			pixels.ctx = canvas[0].getContext('2d');
			resizeCanvas.call(this, canvas[0], chr.width, chr.height, this.zoom);
		});

		this.draw();
	}

	updatePixel({ chrIndex, paletteIndex, pixelIndex }) {
		this.pixels[chrIndex][pixelIndex].paletteIndex = paletteIndex;
		this.draw();
	}

	draw() {
		this.pixels.forEach(pixels => {
			pixels.forEach(p => {
				pixels.ctx.fillStyle = '#' + palette[p.paletteIndex].hex;
				pixels.ctx.fillRect(p.x, p.y, this.zoom, this.zoom);
			});
		});
	}
}

module.exports = Tiles;
},{"./data":8,"./utils":9,"events":1}],8:[function(require,module,exports){
// DO NOT EDIT THIS FILE DIRECTLY! This file has been generated via a ROM sprite
// extraction tool located at tools/sprite-extract.js

module.exports = {
	CHR: [
		{
			name: 'simonIdleTop',
			height: 16,
			width: 16,
			offset: 135216,
			layout: [
				0,
				2,
				1,
				3
			],
			data: [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,1,1,1,1,1,0,0,0,1,3,1,1,1,0,0,0,1,1,3,2,1,0,0,0,1,3,3,2,1,0,0,0,1,3,2,1,1,0,0,0,1,1,1,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,1,1,0,0,0,1,1,1,1,2,1,0,0,1,2,2,1,1,1,0,0,0,0,0,0,1,3,2,2,0,0,0,0,0,1,1,1,0,1,1,0,1,1,3,1,1,3,3,1,1,1,1,1,1,3,3,3,3,1,1,1,0,1,3,3,3,1,1,1,0,0,1,1,1,1,1,1,0,0,0,0,0,0,1,1,2,1,2,1,1,1,1,0,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,3,1,0,1,1,2,2,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,0,0,0,2,1,1,2,2,1,0,0]
		},
		{
			name: 'simonIdleBottom',
			height: 16,
			width: 16,
			offset: 135280,
			layout: [
				0,
				2,
				1,
				3
			],
			data: [0,0,0,0,0,0,2,2,0,0,0,0,0,0,1,1,0,0,0,0,0,3,1,1,0,0,0,0,3,1,1,1,0,0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,0,0,1,1,1,1,0,0,0,0,1,3,1,1,0,0,2,2,2,2,2,1,0,0,1,2,2,2,2,1,0,0,1,1,1,1,1,1,0,0,1,3,1,1,1,0,0,0,1,3,1,1,1,0,0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0,0,0,0,1,1,3,1,0,0,0,0,1,3,3,1,0,0,0,0,1,3,3,1,0,0,0,0,1,3,3,1,0,0,0,0,1,3,1,1,0,0,1,1,3,3,3,1,0,0,1,3,3,3,3,1,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,3,3,1,1,0,0,0,0,1,3,3,1,1,0,0,0,0,1,3,3,1,0,0,0,0,1,3,3,1,0,0,0,0,1,3,3,1,0,0,0,1,3,3,3,1,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0]
		},
		{
			name: 'simonWalk1Top',
			height: 16,
			width: 16,
			offset: 135344,
			layout: [
				0,
				2,
				1,
				3
			],
			data: [0,0,1,1,1,1,0,0,0,1,1,1,1,1,1,0,0,1,3,1,1,1,1,1,0,1,1,3,2,1,1,1,0,1,3,3,2,2,1,1,0,1,3,2,2,1,1,1,0,1,1,1,1,2,3,2,0,0,0,1,1,3,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,2,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,2,1,1,1,3,0,0,1,2,2,1,1,1,0,0,1,1,2,2,1,1,0,0,0,1,1,1,1,1,0,0,0,1,3,1,1,3,0,0,1,3,3,3,3,3,0,0,1,3,3,3,3,3,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,3,1,1,0,0,0,0,0,1,1,1,1,0,0,0,0,3,1,1,1,0,0,0,0,3,3,1,1,0,0,0,0,3,3,1,0,0,0,0,0,1,1,1,0,0,0,0,0,1,2,1,0,0,0,0,0]
		},
		{
			name: 'simonWalk1Bottom',
			height: 16,
			width: 16,
			offset: 135408,
			layout: [
				0,
				2,
				1,
				3
			],
			data: [0,0,0,0,1,2,2,2,0,0,0,0,1,1,1,1,0,0,0,1,3,1,3,1,0,0,0,1,1,1,3,1,0,0,0,1,1,1,3,1,0,0,0,1,1,1,3,1,0,0,0,0,1,1,1,1,0,0,0,0,0,1,1,1,2,2,1,0,0,0,0,0,1,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1,3,3,0,0,0,0,0,0,1,3,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,3,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,3,1,0,0,0,0,0,0,3,1,1,0,0,0,0,0,3,3,1,0,0,0,0,0,3,3,1,1,0,0,0,0,3,3,3,1,0,0,0,0,3,3,3,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0]
		},
		{
			name: 'simonWalk2Top',
			height: 16,
			width: 16,
			offset: 135472,
			layout: [
				0,
				2,
				1,
				3
			],
			data: [0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,1,1,1,1,1,1,1,0,1,3,1,1,1,1,1,0,1,1,3,2,1,1,1,0,1,3,3,2,2,1,1,0,1,3,2,2,2,1,1,0,1,1,1,2,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,1,3,2,2,1,0,0,0,3,2,2,1,1,0,0,0,0,0,0,1,1,1,2,1,0,0,0,2,1,2,2,1,0,0,0,1,2,2,2,2,0,1,1,1,2,2,2,2,1,3,3,1,1,2,2,2,1,3,3,3,1,1,1,1,1,3,3,1,1,1,1,1,0,1,1,0,0,1,1,2,1,1,1,1,1,1,0,0,1,3,1,1,1,1,1,0,1,1,3,1,1,3,3,1,2,1,1,1,3,3,3,1,1,1,1,1,1,3,3,1,1,1,1,3,3,3,3,1,1,2,1,3,3,3,1,0,2,2,1,1,3,3,1,0]
		},
		{
			name: 'simonWalk2Bottom',
			height: 16,
			width: 16,
			offset: 135536,
			layout: [
				0,
				2,
				1,
				3
			],
			data: [0,0,0,0,0,0,1,2,0,0,0,0,0,1,2,1,0,0,0,0,0,1,3,1,0,0,0,0,1,3,1,1,0,0,0,1,3,1,1,1,0,0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,0,0,1,3,3,1,1,0,2,2,2,1,1,1,0,0,1,2,2,2,2,1,0,0,1,1,1,1,1,0,0,0,1,1,1,1,1,0,0,0,1,1,1,1,1,0,0,0,0,3,1,1,1,0,0,0,0,3,1,1,1,1,0,0,0,0,1,1,3,1,1,0,0,0,1,3,3,3,1,0,0,0,1,3,3,3,1,0,0,0,1,3,3,3,1,0,0,0,1,3,3,1,0,0,0,1,3,3,3,1,0,0,1,3,3,3,3,1,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,3,3,3,1,0,0,0,0,1,3,3,1,1,0,0,0,0,1,3,3,1,0,0,0,0,0,1,3,3,0,0,0,0,1,3,3,1,0,0,0,1,3,3,3,1,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0]
		},
		{
			name: 'simonCrouchFrontLeg',
			height: 8,
			width: 8,
			offset: 135600,
			layout: [
				0
			],
			data: [0,1,1,1,1,1,1,2,1,3,3,1,1,1,1,1,1,3,3,3,1,1,1,1,1,3,3,3,1,1,1,3,0,1,3,3,1,1,3,1,0,0,1,3,3,1,1,1,0,1,3,3,3,1,1,1,1,3,3,3,3,3,1,1]
		},
		{
			name: 'simonCrouchEmpty1',
			height: 8,
			width: 8,
			offset: 135616,
			layout: [
				0
			],
			data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
		},
		{
			name: 'simonCrouchBackLeg',
			height: 8,
			width: 8,
			offset: 135632,
			layout: [
				0
			],
			data: [2,2,2,2,2,1,0,0,2,2,2,2,2,1,0,0,1,2,2,2,2,1,1,0,1,1,2,2,1,3,3,1,1,1,1,1,3,3,3,1,1,1,3,3,3,1,3,1,1,3,1,1,1,1,3,1,1,1,0,1,1,3,3,1]
		},
		{
			name: 'simonCrouchEmpty2',
			height: 8,
			width: 8,
			offset: 135648,
			layout: [
				0
			],
			data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
		},
		{
			name: 'simonStairsDamageLeg',
			height: 16,
			width: 8,
			offset: 135664,
			layout: [
				0,
				1
			],
			data: [0,0,0,0,0,1,1,2,0,0,0,0,1,3,1,1,0,0,0,1,3,1,1,1,0,0,0,1,3,1,1,1,0,0,1,3,1,1,1,1,0,0,1,1,1,1,1,3,0,0,1,1,1,1,0,1,0,1,1,1,1,0,0,0,0,1,3,3,3,1,0,0,0,1,3,3,3,1,0,0,0,1,3,3,3,1,0,0,0,0,1,3,3,1,0,0,0,0,1,3,3,1,0,0,0,0,1,3,3,3,1,0,0,1,3,3,3,1,1,0,1,3,3,3,1,0,0,0]
		},
		{
			name: 'simonStairWalkUpLegs',
			height: 16,
			width: 16,
			offset: 135696,
			layout: [
				0,
				2,
				1,
				3
			],
			data: [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,3,3,3,1,1,1,0,0,1,3,3,1,0,0,0,0,0,1,3,3,1,0,0,0,1,3,3,3,3,1,0,1,3,3,3,3,3,1,2,2,2,2,2,1,0,0,2,2,2,2,2,1,0,0,1,1,2,2,2,1,0,0,1,1,1,1,1,1,0,0,1,3,1,1,1,0,0,0,1,3,1,1,1,0,0,0,1,1,1,1,1,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,3,1,1,0,0,0,1,3,3,3,1,0,0,0,1,1,3,3,1,0,0,0,0,1,3,3,1,0,0,0,0,1,3,3,1,0,0,0,0,1,3,3,3,1,0,0,1,3,3,3,1,1,0,1,3,3,3,1,0,0,0]
		},
		{
			name: 'simonWhipTop1',
			height: 16,
			width: 16,
			offset: 135760,
			layout: [
				0,
				2,
				1,
				3
			],
			data: [0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,1,1,1,1,1,1,0,0,1,3,3,1,1,1,0,0,1,1,3,3,1,1,0,0,1,3,3,2,1,1,0,1,1,2,2,1,1,1,1,2,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,3,2,1,1,0,1,1,0,1,1,1,2,2,1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,1,1,2,2,2,2,2,2,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,0,0,2,2,2,2,2,1,0,0,1,2,2,1,1,3,3,1,1,1,1,0,1,3,3,3,1,1,1,1,1,1,3,1,1,1,1,3,3,3,1,0,1,1,1,3,3,3,1,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
		},
		{
			name: 'simonWhipTop2',
			height: 16,
			width: 16,
			offset: 135888,
			layout: [
				0,
				2,
				1,
				3
			],
			data: [0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,1,1,1,1,1,1,0,0,1,3,3,1,1,1,1,0,1,1,3,3,1,1,1,0,1,3,3,2,1,3,3,1,1,2,2,1,3,3,3,3,0,1,1,2,1,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,3,3,3,3,3,3,1,1,0,1,2,1,1,3,3,2,1,2,1,1,3,3,2,1,1,2,1,1,2,2,2,1,1,2,2,1,1,2,1,1,0,1,2,2,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,0,2,2,2,2,2,1,0,0,1,1,1,1,1,1,3,3,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
		},
		{
			name: 'simonWhipTop3',
			height: 16,
			width: 16,
			offset: 135984,
			layout: [
				0,
				2,
				1,
				3
			],
			data: [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,1,1,1,1,1,0,0,0,1,3,1,1,1,0,0,0,1,3,3,1,1,0,0,0,1,1,1,1,1,0,0,1,3,3,2,1,1,0,1,3,2,2,2,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,1,1,1,0,0,2,2,2,1,2,3,1,0,2,2,2,1,1,1,1,0,0,1,2,2,2,1,1,2,1,1,1,1,1,1,1,2,3,1,1,1,1,1,1,2,3,1,1,1,1,1,2,2,3,3,1,1,0,0,1,2,3,1,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,1,2,2,2,2,1,1,1,0,2,2,2,2,1,1,1,1,2,2,2,2,1,1,3,1,2,2,2,2,1,3,3,1,2,1,1,1,1,1,1,0,1,1,1,1,1,0,0,0,1,1,1,1,1,0,0,0,2,2,2,2,2,1,0,0]
		},
		{
			name: 'simonHand',
			height: 8,
			width: 8,
			offset: 136064,
			layout: [
				0
			],
			data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,1,1,1,3,0,0,1,1,3,3,3,3,0,0,1,3,3,3,3,3,0,0,1,1,3,3,1,1,0,0,0,1,0,1,1,0]
		},
		{
			name: 'simonDamageTop',
			height: 16,
			width: 16,
			offset: 136144,
			layout: [
				0,
				2,
				1,
				3
			],
			data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,1,0,0,0,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,2,1,1,1,1,1,3,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,1,1,1,3,2,1,0,0,1,1,2,1,1,2,1,0,1,1,1,1,1,3,2,2,1,1,1,3,1,1,2,1,0,0,0,1,1,1,1,1,0,0,0,0,1,1,1,1,0,0,1,1,1,1,1,1,0,1,3,3,1,1,1,1,0,1,3,3,3,1,1,1,0,0,1,1,1,1,1,1,2,1,2,2,1,1,1,0,1,1,2,2,2,1,1,1,1,1,2,2,2,1,1,1,1,1,2,2,2,1,1,1,1,2,2,2,2,3,3,1,1,2,2,2,1,3,1,0,2,2,2,1,1,1,0,0,1,1,1,1,1,1,0,0]
		},
		{
			name: 'simonDeadLeft',
			height: 16,
			width: 16,
			offset: 136208,
			layout: [
				0,
				2,
				1,
				3
			],
			data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,1,1,0,1,1,1,1,1,1,2,1,3,1,1,2,2,1,2,0,0,0,0,0,0,0,1,0,0,0,0,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,3,1,0,1,1,1,1,3,3,3,0,1,1,1,1,2,2,2,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,0,3,2,2,1,1,2,1,2,2,2,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,3,3,3,1,1,1,3,3,3,3,3,1,1,0,3,3,1,1,1,1,1]
		},
		{
			name: 'simonDeadRight',
			height: 16,
			width: 16,
			offset: 136272,
			layout: [
				0,
				2,
				1,
				3
			],
			data: [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,2,1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,1,1,2,1,0,0,0,0,2,2,1,2,1,0,0,0,2,2,2,1,2,1,0,0,2,2,2,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,1,1,1,1,0,0,2,1,1,1,1,1,1,0,1,1,1,3,1,1,1,1,1,1,1,1,3,1,1,1,1,3,1,1,1,3,1,1,1,3,1,3,1,1,3,1,1,1,1,3,3,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,3,3,3,1,3,3,1,0,1,3,3,3,3,3,1,0,1,3,3,1,3,3,3,1,1,1,1,1,3,3,3,1,3,3,1,1,1,3,3,1]
		}
	],
	states: [
		{
			name: 'idle',
			height: 32,
			width: 16,
			frames: [
				[
					{
						name: 'simonIdleTop',
						x: 0,
						y: 0
					},
					{
						name: 'simonIdleBottom',
						x: 0,
						y: 2
					}
				]
			]
		},
		{
			name: 'crouch',
			height: 32,
			width: 16,
			frames: [
				[
					{
						name: 'simonIdleTop',
						x: 0,
						y: 0
					},
					{
						name: 'simonCrouchFrontLeg',
						x: 0,
						y: 2
					},
					{
						name: 'simonCrouchBackLeg',
						x: 2,
						y: 2
					},
					{
						name: 'simonCrouchEmpty1',
						x: 0,
						y: 3
					},
					{
						name: 'simonCrouchEmpty2',
						x: 2,
						y: 3
					}
				]
			]
		},
		{
			name: 'walk',
			height: 32,
			width: 16,
			frames: [
				[
					{
						name: 'simonIdleTop',
						x: 0,
						y: 0
					},
					{
						name: 'simonIdleBottom',
						x: 0,
						y: 2
					}
				],
				[
					{
						name: 'simonWalk1Top',
						x: 0,
						y: 0
					},
					{
						name: 'simonWalk1Bottom',
						x: 0,
						y: 2
					}
				],
				[
					{
						name: 'simonWalk2Top',
						x: 0,
						y: 0
					},
					{
						name: 'simonWalk2Bottom',
						x: 0,
						y: 2
					}
				],
				[
					{
						name: 'simonWalk1Top',
						x: 0,
						y: 0
					},
					{
						name: 'simonWalk1Bottom',
						x: 0,
						y: 2
					}
				]
			]
		},
		{
			name: 'walk (down stairs)',
			height: 32,
			width: 16,
			frames: [
				[
					{
						name: 'simonIdleTop',
						x: 0,
						y: 0
					},
					{
						name: 'simonStairsDamageLeg',
						x: 0,
						y: 2
					},
					{
						name: 'simonCrouchBackLeg',
						x: 2,
						y: 2
					},
					{
						name: 'simonCrouchEmpty2',
						x: 2,
						y: 3
					}
				],
				[
					{
						name: 'simonWalk1Top',
						x: 0,
						y: 0
					},
					{
						name: 'simonWalk1Bottom',
						x: 0,
						y: 2
					}
				]
			]
		},
		{
			name: 'walk (up stairs)',
			height: 32,
			width: 16,
			frames: [
				[
					{
						name: 'simonIdleTop',
						x: 0,
						y: 0
					},
					{
						name: 'simonStairWalkUpLegs',
						x: 0,
						y: 2
					}
				],
				[
					{
						name: 'simonWalk1Top',
						x: 0,
						y: 0
					},
					{
						name: 'simonWalk1Bottom',
						x: 0,
						y: 2
					}
				]
			]
		},
		{
			name: 'dead',
			height: 16,
			width: 32,
			frames: [
				[
					{
						name: 'simonDeadLeft',
						x: 0,
						y: 0
					},
					{
						name: 'simonDeadRight',
						x: 4,
						y: 0
					}
				]
			]
		},
		{
			name: 'hurt',
			height: 32,
			width: 16,
			frames: [
				[
					{
						name: 'simonDamageTop',
						x: 0,
						y: 0
					},
					{
						name: 'simonStairsDamageLeg',
						x: 0,
						y: 2
					},
					{
						name: 'simonCrouchBackLeg',
						x: 2,
						y: 2
					},
					{
						name: 'simonCrouchEmpty2',
						x: 2,
						y: 3
					}
				]
			]
		},
		{
			name: 'whip',
			height: 32,
			width: 32,
			frames: [
				[
					{
						name: 'simonWhipTop1',
						x: 4,
						y: 0
					},
					{
						name: 'simonIdleBottom',
						x: 2,
						y: 2
					}
				],
				[
					{
						name: 'simonWhipTop2',
						x: 4,
						y: 0
					},
					{
						name: 'simonIdleBottom',
						x: 2,
						y: 2
					}
				],
				[
					{
						name: 'simonHand',
						x: 0,
						y: 1
					},
					{
						name: 'simonWhipTop3',
						x: 2,
						y: 0
					},
					{
						name: 'simonIdleBottom',
						x: 2,
						y: 2
					}
				]
			]
		},
		{
			name: 'whip (ducking)',
			height: 32,
			width: 32,
			frames: [
				[
					{
						name: 'simonWhipTop1',
						x: 4,
						y: 0
					},
					{
						name: 'simonCrouchFrontLeg',
						x: 2,
						y: 2
					},
					{
						name: 'simonCrouchBackLeg',
						x: 4,
						y: 2
					},
					{
						name: 'simonCrouchEmpty1',
						x: 2,
						y: 3
					},
					{
						name: 'simonCrouchEmpty2',
						x: 4,
						y: 3
					}
				],
				[
					{
						name: 'simonWhipTop2',
						x: 4,
						y: 0
					},
					{
						name: 'simonCrouchFrontLeg',
						x: 2,
						y: 2
					},
					{
						name: 'simonCrouchBackLeg',
						x: 4,
						y: 2
					},
					{
						name: 'simonCrouchEmpty1',
						x: 2,
						y: 3
					},
					{
						name: 'simonCrouchEmpty2',
						x: 4,
						y: 3
					}
				],
				[
					{
						name: 'simonHand',
						x: 0,
						y: 1
					},
					{
						name: 'simonWhipTop3',
						x: 2,
						y: 0
					},
					{
						name: 'simonCrouchFrontLeg',
						x: 2,
						y: 2
					},
					{
						name: 'simonCrouchBackLeg',
						x: 4,
						y: 2
					},
					{
						name: 'simonCrouchEmpty1',
						x: 2,
						y: 3
					},
					{
						name: 'simonCrouchEmpty2',
						x: 4,
						y: 3
					}
				]
			]
		},
		{
			name: 'whip (down stairs)',
			height: 32,
			width: 32,
			frames: [
				[
					{
						name: 'simonWhipTop1',
						x: 4,
						y: 0
					},
					{
						name: 'simonStairsDamageLeg',
						x: 2,
						y: 2
					},
					{
						name: 'simonCrouchBackLeg',
						x: 4,
						y: 2
					},
					{
						name: 'simonCrouchEmpty2',
						x: 4,
						y: 3
					}
				],
				[
					{
						name: 'simonWhipTop2',
						x: 4,
						y: 0
					},
					{
						name: 'simonStairsDamageLeg',
						x: 2,
						y: 2
					},
					{
						name: 'simonCrouchBackLeg',
						x: 4,
						y: 2
					},
					{
						name: 'simonCrouchEmpty2',
						x: 4,
						y: 3
					}
				],
				[
					{
						name: 'simonHand',
						x: 0,
						y: 1
					},
					{
						name: 'simonWhipTop3',
						x: 2,
						y: 0
					},
					{
						name: 'simonStairsDamageLeg',
						x: 2,
						y: 2
					},
					{
						name: 'simonCrouchBackLeg',
						x: 4,
						y: 2
					},
					{
						name: 'simonCrouchEmpty2',
						x: 4,
						y: 3
					}
				]
			]
		},
		{
			name: 'whip (up stairs)',
			height: 32,
			width: 32,
			frames: [
				[
					{
						name: 'simonWhipTop1',
						x: 4,
						y: 0
					},
					{
						name: 'simonStairWalkUpLegs',
						x: 2,
						y: 2
					}
				],
				[
					{
						name: 'simonWhipTop2',
						x: 4,
						y: 0
					},
					{
						name: 'simonStairWalkUpLegs',
						x: 2,
						y: 2
					}
				],
				[
					{
						name: 'simonHand',
						x: 0,
						y: 1
					},
					{
						name: 'simonWhipTop3',
						x: 2,
						y: 0
					},
					{
						name: 'simonStairWalkUpLegs',
						x: 2,
						y: 2
					}
				]
			]
		},
		{
			name: 'subweapon throw',
			height: 32,
			width: 24,
			frames: [
				[
					{
						name: 'simonWhipTop1',
						x: 4,
						y: 0
					},
					{
						name: 'simonIdleBottom',
						x: 2,
						y: 2
					}
				],
				[
					{
						name: 'simonWhipTop2',
						x: 4,
						y: 0
					},
					{
						name: 'simonIdleBottom',
						x: 2,
						y: 2
					}
				],
				[
					{
						name: 'simonHand',
						x: 0,
						y: 1
					},
					{
						name: 'simonWhipTop3',
						x: 2,
						y: 0
					},
					{
						name: 'simonIdleBottom',
						x: 2,
						y: 2
					}
				]
			]
		},
		{
			name: 'subweapon throw (down stairs)',
			height: 32,
			width: 24,
			frames: [
				[
					{
						name: 'simonWhipTop1',
						x: 4,
						y: 0
					},
					{
						name: 'simonStairsDamageLeg',
						x: 2,
						y: 2
					},
					{
						name: 'simonCrouchBackLeg',
						x: 4,
						y: 2
					},
					{
						name: 'simonCrouchEmpty2',
						x: 4,
						y: 3
					}
				],
				[
					{
						name: 'simonWhipTop2',
						x: 4,
						y: 0
					},
					{
						name: 'simonStairsDamageLeg',
						x: 2,
						y: 2
					},
					{
						name: 'simonCrouchBackLeg',
						x: 4,
						y: 2
					},
					{
						name: 'simonCrouchEmpty2',
						x: 4,
						y: 3
					}
				],
				[
					{
						name: 'simonHand',
						x: 0,
						y: 1
					},
					{
						name: 'simonWhipTop3',
						x: 2,
						y: 0
					},
					{
						name: 'simonStairsDamageLeg',
						x: 2,
						y: 2
					},
					{
						name: 'simonCrouchBackLeg',
						x: 4,
						y: 2
					},
					{
						name: 'simonCrouchEmpty2',
						x: 4,
						y: 3
					}
				]
			]
		},
		{
			name: 'subweapon throw (up stairs)',
			height: 32,
			width: 24,
			frames: [
				[
					{
						name: 'simonWhipTop1',
						x: 4,
						y: 0
					},
					{
						name: 'simonStairWalkUpLegs',
						x: 2,
						y: 2
					}
				],
				[
					{
						name: 'simonWhipTop2',
						x: 4,
						y: 0
					},
					{
						name: 'simonStairWalkUpLegs',
						x: 2,
						y: 2
					}
				],
				[
					{
						name: 'simonHand',
						x: 0,
						y: 1
					},
					{
						name: 'simonWhipTop3',
						x: 2,
						y: 0
					},
					{
						name: 'simonStairWalkUpLegs',
						x: 2,
						y: 2
					}
				]
			]
		}
	],
	colors: [
		{
			hex: '7C7C7C',
			rgb: [
				124,
				124,
				124
			]
		},
		{
			hex: '0000FC',
			rgb: [
				0,
				0,
				252
			]
		},
		{
			hex: '0000BC',
			rgb: [
				0,
				0,
				188
			]
		},
		{
			hex: '4428BC',
			rgb: [
				68,
				40,
				188
			]
		},
		{
			hex: '940084',
			rgb: [
				148,
				0,
				132
			]
		},
		{
			hex: 'A80020',
			rgb: [
				168,
				0,
				32
			]
		},
		{
			hex: 'A81000',
			rgb: [
				168,
				16,
				0
			]
		},
		{
			hex: '881400',
			rgb: [
				136,
				20,
				0
			]
		},
		{
			hex: '503000',
			rgb: [
				80,
				48,
				0
			]
		},
		{
			hex: '007800',
			rgb: [
				0,
				120,
				0
			]
		},
		{
			hex: '006800',
			rgb: [
				0,
				104,
				0
			]
		},
		{
			hex: '005800',
			rgb: [
				0,
				88,
				0
			]
		},
		{
			hex: '004058',
			rgb: [
				0,
				64,
				88
			]
		},
		{
			hex: '000000',
			rgb: [
				0,
				0,
				0
			]
		},
		{
			hex: '000000',
			rgb: [
				0,
				0,
				0
			]
		},
		{
			hex: '000000',
			rgb: [
				0,
				0,
				0
			]
		},
		{
			hex: 'BCBCBC',
			rgb: [
				188,
				188,
				188
			]
		},
		{
			hex: '0078F8',
			rgb: [
				0,
				120,
				248
			]
		},
		{
			hex: '0058F8',
			rgb: [
				0,
				88,
				248
			]
		},
		{
			hex: '6844FC',
			rgb: [
				104,
				68,
				252
			]
		},
		{
			hex: 'D800CC',
			rgb: [
				216,
				0,
				204
			]
		},
		{
			hex: 'E40058',
			rgb: [
				228,
				0,
				88
			]
		},
		{
			hex: 'F83800',
			rgb: [
				248,
				56,
				0
			]
		},
		{
			hex: 'E45C10',
			rgb: [
				228,
				92,
				16
			]
		},
		{
			hex: 'AC7C00',
			rgb: [
				172,
				124,
				0
			]
		},
		{
			hex: '00B800',
			rgb: [
				0,
				184,
				0
			]
		},
		{
			hex: '00A800',
			rgb: [
				0,
				168,
				0
			]
		},
		{
			hex: '00A844',
			rgb: [
				0,
				168,
				68
			]
		},
		{
			hex: '008888',
			rgb: [
				0,
				136,
				136
			]
		},
		{
			hex: '000000',
			rgb: [
				0,
				0,
				0
			]
		},
		{
			hex: '000000',
			rgb: [
				0,
				0,
				0
			]
		},
		{
			hex: '000000',
			rgb: [
				0,
				0,
				0
			]
		},
		{
			hex: 'F8F8F8',
			rgb: [
				248,
				248,
				248
			]
		},
		{
			hex: '3CBCFC',
			rgb: [
				60,
				188,
				252
			]
		},
		{
			hex: '6888FC',
			rgb: [
				104,
				136,
				252
			]
		},
		{
			hex: '9878F8',
			rgb: [
				152,
				120,
				248
			]
		},
		{
			hex: 'F878F8',
			rgb: [
				248,
				120,
				248
			]
		},
		{
			hex: 'F85898',
			rgb: [
				248,
				88,
				152
			]
		},
		{
			hex: 'F87858',
			rgb: [
				248,
				120,
				88
			]
		},
		{
			hex: 'FCA044',
			rgb: [
				252,
				160,
				68
			]
		},
		{
			hex: 'F8B800',
			rgb: [
				248,
				184,
				0
			]
		},
		{
			hex: 'B8F818',
			rgb: [
				184,
				248,
				24
			]
		},
		{
			hex: '58D854',
			rgb: [
				88,
				216,
				84
			]
		},
		{
			hex: '58F898',
			rgb: [
				88,
				248,
				152
			]
		},
		{
			hex: '00E8D8',
			rgb: [
				0,
				232,
				216
			]
		},
		{
			hex: '787878',
			rgb: [
				120,
				120,
				120
			]
		},
		{
			hex: '000000',
			rgb: [
				0,
				0,
				0
			]
		},
		{
			hex: '000000',
			rgb: [
				0,
				0,
				0
			]
		},
		{
			hex: 'FCFCFC',
			rgb: [
				252,
				252,
				252
			]
		},
		{
			hex: 'A4E4FC',
			rgb: [
				164,
				228,
				252
			]
		},
		{
			hex: 'B8B8F8',
			rgb: [
				184,
				184,
				248
			]
		},
		{
			hex: 'D8B8F8',
			rgb: [
				216,
				184,
				248
			]
		},
		{
			hex: 'F8B8F8',
			rgb: [
				248,
				184,
				248
			]
		},
		{
			hex: 'F8A4C0',
			rgb: [
				248,
				164,
				192
			]
		},
		{
			hex: 'F0D0B0',
			rgb: [
				240,
				208,
				176
			]
		},
		{
			hex: 'FCE0A8',
			rgb: [
				252,
				224,
				168
			]
		},
		{
			hex: 'F8D878',
			rgb: [
				248,
				216,
				120
			]
		},
		{
			hex: 'D8F878',
			rgb: [
				216,
				248,
				120
			]
		},
		{
			hex: 'B8F8B8',
			rgb: [
				184,
				248,
				184
			]
		},
		{
			hex: 'B8F8D8',
			rgb: [
				184,
				248,
				216
			]
		},
		{
			hex: '00FCFC',
			rgb: [
				0,
				252,
				252
			]
		},
		{
			hex: 'D8D8D8',
			rgb: [
				216,
				216,
				216
			]
		},
		{
			hex: '000000',
			rgb: [
				0,
				0,
				0
			]
		},
		{
			hex: '000000',
			rgb: [
				0,
				0,
				0
			]
		}
	],
	palette: [
		{
			hex: '00A800',
			index: 26
		},
		{
			hex: '000000',
			index: 15
		},
		{
			hex: 'A81000',
			index: 6
		},
		{
			hex: 'FCFCFC',
			index: 48
		}
	]
};

},{}],9:[function(require,module,exports){
const { CHR } = require('./data');

exports.loadChr = function loadChr(tiles, chrIndex, pixels, zoom) {
	const chrData = CHR[chrIndex];
	pixels.length = 0;
	chrData.data.forEach((paletteIndex, index) => {
		const layoutIndex = Math.floor(index / 64);
		const layout = chrData.layout[layoutIndex];
		pixels.push({
			x: ((index % 8) + (layout >= 2 ? 8 : 0)) * zoom,
			y: ((Math.floor((index % 64) / 8)) + (layout % 2 === 1 ? 8 : 0)) * zoom,
			paletteIndex: tiles ? tiles.pixels[chrIndex][index].paletteIndex : paletteIndex
		});
	});
	return chrData;
};

exports.resizeCanvas = function resizeCanvas(canvas, width, height, zoom) {
	const $canvas= $(canvas);
	this.zoom = zoom;
	this.width = width;
	this.height = height;
	$canvas.attr('height', height * zoom);
	$canvas.attr('width', width * zoom);
	$canvas.css({
		width: width * zoom,
		height: height * zoom
	});
};

exports.getPaletteIndex = function getPaletteIndex() {
	return parseInt($('.palette-button-selected').first().data('pi'), 10);
};

exports.rgb2hex = function rgb2hex(rgb){
	rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	return ('0' + parseInt(rgb[1],10).toString(16)).slice(-2) +
		('0' + parseInt(rgb[2],10).toString(16)).slice(-2) +
		('0' + parseInt(rgb[3],10).toString(16)).slice(-2);
};
},{"./data":8}]},{},[5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsInNyYy9zcHJpdGUtbWFrZXIvQ29sb3JQaWNrZXIuanMiLCJzcmMvc3ByaXRlLW1ha2VyL0VkaXRvci5qcyIsInNyYy9zcHJpdGUtbWFrZXIvUGFsZXR0ZS5qcyIsInNyYy9zcHJpdGUtbWFrZXIvU3ByaXRlTWFrZXIuanMiLCJzcmMvc3ByaXRlLW1ha2VyL1N0YXRlcy5qcyIsInNyYy9zcHJpdGUtbWFrZXIvVGlsZXMuanMiLCJzcmMvc3ByaXRlLW1ha2VyL2RhdGEuanMiLCJzcmMvc3ByaXRlLW1ha2VyL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzZ0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2g2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIG9iamVjdENyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgb2JqZWN0Q3JlYXRlUG9seWZpbGxcbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgb2JqZWN0S2V5c1BvbHlmaWxsXG52YXIgYmluZCA9IEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kIHx8IGZ1bmN0aW9uQmluZFBvbHlmaWxsXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCAnX2V2ZW50cycpKSB7XG4gICAgdGhpcy5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgIHRoaXMuX2V2ZW50c0NvdW50ID0gMDtcbiAgfVxuXG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbnZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbnZhciBoYXNEZWZpbmVQcm9wZXJ0eTtcbnRyeSB7XG4gIHZhciBvID0ge307XG4gIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCAneCcsIHsgdmFsdWU6IDAgfSk7XG4gIGhhc0RlZmluZVByb3BlcnR5ID0gby54ID09PSAwO1xufSBjYXRjaCAoZXJyKSB7IGhhc0RlZmluZVByb3BlcnR5ID0gZmFsc2UgfVxuaWYgKGhhc0RlZmluZVByb3BlcnR5KSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShFdmVudEVtaXR0ZXIsICdkZWZhdWx0TWF4TGlzdGVuZXJzJywge1xuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihhcmcpIHtcbiAgICAgIC8vIGNoZWNrIHdoZXRoZXIgdGhlIGlucHV0IGlzIGEgcG9zaXRpdmUgbnVtYmVyICh3aG9zZSB2YWx1ZSBpcyB6ZXJvIG9yXG4gICAgICAvLyBncmVhdGVyIGFuZCBub3QgYSBOYU4pLlxuICAgICAgaWYgKHR5cGVvZiBhcmcgIT09ICdudW1iZXInIHx8IGFyZyA8IDAgfHwgYXJnICE9PSBhcmcpXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiZGVmYXVsdE1heExpc3RlbmVyc1wiIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgICAgIGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSBhcmc7XG4gICAgfVxuICB9KTtcbn0gZWxzZSB7XG4gIEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gZGVmYXVsdE1heExpc3RlbmVycztcbn1cblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24gc2V0TWF4TGlzdGVuZXJzKG4pIHtcbiAgaWYgKHR5cGVvZiBuICE9PSAnbnVtYmVyJyB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcIm5cIiBhcmd1bWVudCBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuZnVuY3Rpb24gJGdldE1heExpc3RlbmVycyh0aGF0KSB7XG4gIGlmICh0aGF0Ll9tYXhMaXN0ZW5lcnMgPT09IHVuZGVmaW5lZClcbiAgICByZXR1cm4gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gIHJldHVybiB0aGF0Ll9tYXhMaXN0ZW5lcnM7XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZ2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24gZ2V0TWF4TGlzdGVuZXJzKCkge1xuICByZXR1cm4gJGdldE1heExpc3RlbmVycyh0aGlzKTtcbn07XG5cbi8vIFRoZXNlIHN0YW5kYWxvbmUgZW1pdCogZnVuY3Rpb25zIGFyZSB1c2VkIHRvIG9wdGltaXplIGNhbGxpbmcgb2YgZXZlbnRcbi8vIGhhbmRsZXJzIGZvciBmYXN0IGNhc2VzIGJlY2F1c2UgZW1pdCgpIGl0c2VsZiBvZnRlbiBoYXMgYSB2YXJpYWJsZSBudW1iZXIgb2Zcbi8vIGFyZ3VtZW50cyBhbmQgY2FuIGJlIGRlb3B0aW1pemVkIGJlY2F1c2Ugb2YgdGhhdC4gVGhlc2UgZnVuY3Rpb25zIGFsd2F5cyBoYXZlXG4vLyB0aGUgc2FtZSBudW1iZXIgb2YgYXJndW1lbnRzIGFuZCB0aHVzIGRvIG5vdCBnZXQgZGVvcHRpbWl6ZWQsIHNvIHRoZSBjb2RlXG4vLyBpbnNpZGUgdGhlbSBjYW4gZXhlY3V0ZSBmYXN0ZXIuXG5mdW5jdGlvbiBlbWl0Tm9uZShoYW5kbGVyLCBpc0ZuLCBzZWxmKSB7XG4gIGlmIChpc0ZuKVxuICAgIGhhbmRsZXIuY2FsbChzZWxmKTtcbiAgZWxzZSB7XG4gICAgdmFyIGxlbiA9IGhhbmRsZXIubGVuZ3RoO1xuICAgIHZhciBsaXN0ZW5lcnMgPSBhcnJheUNsb25lKGhhbmRsZXIsIGxlbik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSlcbiAgICAgIGxpc3RlbmVyc1tpXS5jYWxsKHNlbGYpO1xuICB9XG59XG5mdW5jdGlvbiBlbWl0T25lKGhhbmRsZXIsIGlzRm4sIHNlbGYsIGFyZzEpIHtcbiAgaWYgKGlzRm4pXG4gICAgaGFuZGxlci5jYWxsKHNlbGYsIGFyZzEpO1xuICBlbHNlIHtcbiAgICB2YXIgbGVuID0gaGFuZGxlci5sZW5ndGg7XG4gICAgdmFyIGxpc3RlbmVycyA9IGFycmF5Q2xvbmUoaGFuZGxlciwgbGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgbGlzdGVuZXJzW2ldLmNhbGwoc2VsZiwgYXJnMSk7XG4gIH1cbn1cbmZ1bmN0aW9uIGVtaXRUd28oaGFuZGxlciwgaXNGbiwgc2VsZiwgYXJnMSwgYXJnMikge1xuICBpZiAoaXNGbilcbiAgICBoYW5kbGVyLmNhbGwoc2VsZiwgYXJnMSwgYXJnMik7XG4gIGVsc2Uge1xuICAgIHZhciBsZW4gPSBoYW5kbGVyLmxlbmd0aDtcbiAgICB2YXIgbGlzdGVuZXJzID0gYXJyYXlDbG9uZShoYW5kbGVyLCBsZW4pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpXG4gICAgICBsaXN0ZW5lcnNbaV0uY2FsbChzZWxmLCBhcmcxLCBhcmcyKTtcbiAgfVxufVxuZnVuY3Rpb24gZW1pdFRocmVlKGhhbmRsZXIsIGlzRm4sIHNlbGYsIGFyZzEsIGFyZzIsIGFyZzMpIHtcbiAgaWYgKGlzRm4pXG4gICAgaGFuZGxlci5jYWxsKHNlbGYsIGFyZzEsIGFyZzIsIGFyZzMpO1xuICBlbHNlIHtcbiAgICB2YXIgbGVuID0gaGFuZGxlci5sZW5ndGg7XG4gICAgdmFyIGxpc3RlbmVycyA9IGFycmF5Q2xvbmUoaGFuZGxlciwgbGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgbGlzdGVuZXJzW2ldLmNhbGwoc2VsZiwgYXJnMSwgYXJnMiwgYXJnMyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZW1pdE1hbnkoaGFuZGxlciwgaXNGbiwgc2VsZiwgYXJncykge1xuICBpZiAoaXNGbilcbiAgICBoYW5kbGVyLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICBlbHNlIHtcbiAgICB2YXIgbGVuID0gaGFuZGxlci5sZW5ndGg7XG4gICAgdmFyIGxpc3RlbmVycyA9IGFycmF5Q2xvbmUoaGFuZGxlciwgbGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICB9XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQodHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgZXZlbnRzO1xuICB2YXIgZG9FcnJvciA9ICh0eXBlID09PSAnZXJyb3InKTtcblxuICBldmVudHMgPSB0aGlzLl9ldmVudHM7XG4gIGlmIChldmVudHMpXG4gICAgZG9FcnJvciA9IChkb0Vycm9yICYmIGV2ZW50cy5lcnJvciA9PSBudWxsKTtcbiAgZWxzZSBpZiAoIWRvRXJyb3IpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKGRvRXJyb3IpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpXG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEF0IGxlYXN0IGdpdmUgc29tZSBraW5kIG9mIGNvbnRleHQgdG8gdGhlIHVzZXJcbiAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoJ1VuaGFuZGxlZCBcImVycm9yXCIgZXZlbnQuICgnICsgZXIgKyAnKScpO1xuICAgICAgZXJyLmNvbnRleHQgPSBlcjtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaGFuZGxlciA9IGV2ZW50c1t0eXBlXTtcblxuICBpZiAoIWhhbmRsZXIpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBpc0ZuID0gdHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbic7XG4gIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gIHN3aXRjaCAobGVuKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgY2FzZSAxOlxuICAgICAgZW1pdE5vbmUoaGFuZGxlciwgaXNGbiwgdGhpcyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDI6XG4gICAgICBlbWl0T25lKGhhbmRsZXIsIGlzRm4sIHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDM6XG4gICAgICBlbWl0VHdvKGhhbmRsZXIsIGlzRm4sIHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgNDpcbiAgICAgIGVtaXRUaHJlZShoYW5kbGVyLCBpc0ZuLCB0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSwgYXJndW1lbnRzWzNdKTtcbiAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgZGVmYXVsdDpcbiAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgZW1pdE1hbnkoaGFuZGxlciwgaXNGbiwgdGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbmZ1bmN0aW9uIF9hZGRMaXN0ZW5lcih0YXJnZXQsIHR5cGUsIGxpc3RlbmVyLCBwcmVwZW5kKSB7XG4gIHZhciBtO1xuICB2YXIgZXZlbnRzO1xuICB2YXIgZXhpc3Rpbmc7XG5cbiAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJylcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RlbmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHM7XG4gIGlmICghZXZlbnRzKSB7XG4gICAgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHMgPSBvYmplY3RDcmVhdGUobnVsbCk7XG4gICAgdGFyZ2V0Ll9ldmVudHNDb3VudCA9IDA7XG4gIH0gZWxzZSB7XG4gICAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gICAgaWYgKGV2ZW50cy5uZXdMaXN0ZW5lcikge1xuICAgICAgdGFyZ2V0LmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA/IGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gICAgICAvLyBSZS1hc3NpZ24gYGV2ZW50c2AgYmVjYXVzZSBhIG5ld0xpc3RlbmVyIGhhbmRsZXIgY291bGQgaGF2ZSBjYXVzZWQgdGhlXG4gICAgICAvLyB0aGlzLl9ldmVudHMgdG8gYmUgYXNzaWduZWQgdG8gYSBuZXcgb2JqZWN0XG4gICAgICBldmVudHMgPSB0YXJnZXQuX2V2ZW50cztcbiAgICB9XG4gICAgZXhpc3RpbmcgPSBldmVudHNbdHlwZV07XG4gIH1cblxuICBpZiAoIWV4aXN0aW5nKSB7XG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgZXhpc3RpbmcgPSBldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgICArK3RhcmdldC5fZXZlbnRzQ291bnQ7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHR5cGVvZiBleGlzdGluZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgICBleGlzdGluZyA9IGV2ZW50c1t0eXBlXSA9XG4gICAgICAgICAgcHJlcGVuZCA/IFtsaXN0ZW5lciwgZXhpc3RpbmddIDogW2V4aXN0aW5nLCBsaXN0ZW5lcl07XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICAgIGlmIChwcmVwZW5kKSB7XG4gICAgICAgIGV4aXN0aW5nLnVuc2hpZnQobGlzdGVuZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXhpc3RpbmcucHVzaChsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgICBpZiAoIWV4aXN0aW5nLndhcm5lZCkge1xuICAgICAgbSA9ICRnZXRNYXhMaXN0ZW5lcnModGFyZ2V0KTtcbiAgICAgIGlmIChtICYmIG0gPiAwICYmIGV4aXN0aW5nLmxlbmd0aCA+IG0pIHtcbiAgICAgICAgZXhpc3Rpbmcud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgdmFyIHcgPSBuZXcgRXJyb3IoJ1Bvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgbGVhayBkZXRlY3RlZC4gJyArXG4gICAgICAgICAgICBleGlzdGluZy5sZW5ndGggKyAnIFwiJyArIFN0cmluZyh0eXBlKSArICdcIiBsaXN0ZW5lcnMgJyArXG4gICAgICAgICAgICAnYWRkZWQuIFVzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvICcgK1xuICAgICAgICAgICAgJ2luY3JlYXNlIGxpbWl0LicpO1xuICAgICAgICB3Lm5hbWUgPSAnTWF4TGlzdGVuZXJzRXhjZWVkZWRXYXJuaW5nJztcbiAgICAgICAgdy5lbWl0dGVyID0gdGFyZ2V0O1xuICAgICAgICB3LnR5cGUgPSB0eXBlO1xuICAgICAgICB3LmNvdW50ID0gZXhpc3RpbmcubGVuZ3RoO1xuICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09ICdvYmplY3QnICYmIGNvbnNvbGUud2Fybikge1xuICAgICAgICAgIGNvbnNvbGUud2FybignJXM6ICVzJywgdy5uYW1lLCB3Lm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRhcmdldDtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uIGFkZExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHJldHVybiBfYWRkTGlzdGVuZXIodGhpcywgdHlwZSwgbGlzdGVuZXIsIGZhbHNlKTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gcHJlcGVuZExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgICByZXR1cm4gX2FkZExpc3RlbmVyKHRoaXMsIHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgICB9O1xuXG5mdW5jdGlvbiBvbmNlV3JhcHBlcigpIHtcbiAgaWYgKCF0aGlzLmZpcmVkKSB7XG4gICAgdGhpcy50YXJnZXQucmVtb3ZlTGlzdGVuZXIodGhpcy50eXBlLCB0aGlzLndyYXBGbik7XG4gICAgdGhpcy5maXJlZCA9IHRydWU7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICBjYXNlIDA6XG4gICAgICAgIHJldHVybiB0aGlzLmxpc3RlbmVyLmNhbGwodGhpcy50YXJnZXQpO1xuICAgICAgY2FzZSAxOlxuICAgICAgICByZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0LCBhcmd1bWVudHNbMF0pO1xuICAgICAgY2FzZSAyOlxuICAgICAgICByZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0LCBhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSk7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHJldHVybiB0aGlzLmxpc3RlbmVyLmNhbGwodGhpcy50YXJnZXQsIGFyZ3VtZW50c1swXSwgYXJndW1lbnRzWzFdLFxuICAgICAgICAgICAgYXJndW1lbnRzWzJdKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGgpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyArK2kpXG4gICAgICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgdGhpcy5saXN0ZW5lci5hcHBseSh0aGlzLnRhcmdldCwgYXJncyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIF9vbmNlV3JhcCh0YXJnZXQsIHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBzdGF0ZSA9IHsgZmlyZWQ6IGZhbHNlLCB3cmFwRm46IHVuZGVmaW5lZCwgdGFyZ2V0OiB0YXJnZXQsIHR5cGU6IHR5cGUsIGxpc3RlbmVyOiBsaXN0ZW5lciB9O1xuICB2YXIgd3JhcHBlZCA9IGJpbmQuY2FsbChvbmNlV3JhcHBlciwgc3RhdGUpO1xuICB3cmFwcGVkLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHN0YXRlLndyYXBGbiA9IHdyYXBwZWQ7XG4gIHJldHVybiB3cmFwcGVkO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiBvbmNlKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICB0aGlzLm9uKHR5cGUsIF9vbmNlV3JhcCh0aGlzLCB0eXBlLCBsaXN0ZW5lcikpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZE9uY2VMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gcHJlcGVuZE9uY2VMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgdGhpcy5wcmVwZW5kTGlzdGVuZXIodHlwZSwgX29uY2VXcmFwKHRoaXMsIHR5cGUsIGxpc3RlbmVyKSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4vLyBFbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWYgYW5kIG9ubHkgaWYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpIHtcbiAgICAgIHZhciBsaXN0LCBldmVudHMsIHBvc2l0aW9uLCBpLCBvcmlnaW5hbExpc3RlbmVyO1xuXG4gICAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RlbmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgICAgIGV2ZW50cyA9IHRoaXMuX2V2ZW50cztcbiAgICAgIGlmICghZXZlbnRzKVxuICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgbGlzdCA9IGV2ZW50c1t0eXBlXTtcbiAgICAgIGlmICghbGlzdClcbiAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fCBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikge1xuICAgICAgICBpZiAoLS10aGlzLl9ldmVudHNDb3VudCA9PT0gMClcbiAgICAgICAgICB0aGlzLl9ldmVudHMgPSBvYmplY3RDcmVhdGUobnVsbCk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSBldmVudHNbdHlwZV07XG4gICAgICAgICAgaWYgKGV2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgICAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0Lmxpc3RlbmVyIHx8IGxpc3RlbmVyKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbGlzdCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBwb3NpdGlvbiA9IC0xO1xuXG4gICAgICAgIGZvciAoaSA9IGxpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHwgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHtcbiAgICAgICAgICAgIG9yaWdpbmFsTGlzdGVuZXIgPSBsaXN0W2ldLmxpc3RlbmVyO1xuICAgICAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgICBpZiAocG9zaXRpb24gPT09IDApXG4gICAgICAgICAgbGlzdC5zaGlmdCgpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgc3BsaWNlT25lKGxpc3QsIHBvc2l0aW9uKTtcblxuICAgICAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpXG4gICAgICAgICAgZXZlbnRzW3R5cGVdID0gbGlzdFswXTtcblxuICAgICAgICBpZiAoZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBvcmlnaW5hbExpc3RlbmVyIHx8IGxpc3RlbmVyKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPVxuICAgIGZ1bmN0aW9uIHJlbW92ZUFsbExpc3RlbmVycyh0eXBlKSB7XG4gICAgICB2YXIgbGlzdGVuZXJzLCBldmVudHMsIGk7XG5cbiAgICAgIGV2ZW50cyA9IHRoaXMuX2V2ZW50cztcbiAgICAgIGlmICghZXZlbnRzKVxuICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICAgICAgaWYgKCFldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLl9ldmVudHMgPSBvYmplY3RDcmVhdGUobnVsbCk7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzQ291bnQgPSAwO1xuICAgICAgICB9IGVsc2UgaWYgKGV2ZW50c1t0eXBlXSkge1xuICAgICAgICAgIGlmICgtLXRoaXMuX2V2ZW50c0NvdW50ID09PSAwKVxuICAgICAgICAgICAgdGhpcy5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGRlbGV0ZSBldmVudHNbdHlwZV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIGtleXMgPSBvYmplY3RLZXlzKGV2ZW50cyk7XG4gICAgICAgIHZhciBrZXk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgICAgICB0aGlzLl9ldmVudHMgPSBvYmplY3RDcmVhdGUobnVsbCk7XG4gICAgICAgIHRoaXMuX2V2ZW50c0NvdW50ID0gMDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIGxpc3RlbmVycyA9IGV2ZW50c1t0eXBlXTtcblxuICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICAgICAgfSBlbHNlIGlmIChsaXN0ZW5lcnMpIHtcbiAgICAgICAgLy8gTElGTyBvcmRlclxuICAgICAgICBmb3IgKGkgPSBsaXN0ZW5lcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuZnVuY3Rpb24gX2xpc3RlbmVycyh0YXJnZXQsIHR5cGUsIHVud3JhcCkge1xuICB2YXIgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHM7XG5cbiAgaWYgKCFldmVudHMpXG4gICAgcmV0dXJuIFtdO1xuXG4gIHZhciBldmxpc3RlbmVyID0gZXZlbnRzW3R5cGVdO1xuICBpZiAoIWV2bGlzdGVuZXIpXG4gICAgcmV0dXJuIFtdO1xuXG4gIGlmICh0eXBlb2YgZXZsaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJylcbiAgICByZXR1cm4gdW53cmFwID8gW2V2bGlzdGVuZXIubGlzdGVuZXIgfHwgZXZsaXN0ZW5lcl0gOiBbZXZsaXN0ZW5lcl07XG5cbiAgcmV0dXJuIHVud3JhcCA/IHVud3JhcExpc3RlbmVycyhldmxpc3RlbmVyKSA6IGFycmF5Q2xvbmUoZXZsaXN0ZW5lciwgZXZsaXN0ZW5lci5sZW5ndGgpO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uIGxpc3RlbmVycyh0eXBlKSB7XG4gIHJldHVybiBfbGlzdGVuZXJzKHRoaXMsIHR5cGUsIHRydWUpO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yYXdMaXN0ZW5lcnMgPSBmdW5jdGlvbiByYXdMaXN0ZW5lcnModHlwZSkge1xuICByZXR1cm4gX2xpc3RlbmVycyh0aGlzLCB0eXBlLCBmYWxzZSk7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgaWYgKHR5cGVvZiBlbWl0dGVyLmxpc3RlbmVyQ291bnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZW1pdHRlci5saXN0ZW5lckNvdW50KHR5cGUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBsaXN0ZW5lckNvdW50LmNhbGwoZW1pdHRlciwgdHlwZSk7XG4gIH1cbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJDb3VudCA9IGxpc3RlbmVyQ291bnQ7XG5mdW5jdGlvbiBsaXN0ZW5lckNvdW50KHR5cGUpIHtcbiAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50cztcblxuICBpZiAoZXZlbnRzKSB7XG4gICAgdmFyIGV2bGlzdGVuZXIgPSBldmVudHNbdHlwZV07XG5cbiAgICBpZiAodHlwZW9mIGV2bGlzdGVuZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAoZXZsaXN0ZW5lcikge1xuICAgICAgcmV0dXJuIGV2bGlzdGVuZXIubGVuZ3RoO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiAwO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50TmFtZXMgPSBmdW5jdGlvbiBldmVudE5hbWVzKCkge1xuICByZXR1cm4gdGhpcy5fZXZlbnRzQ291bnQgPiAwID8gUmVmbGVjdC5vd25LZXlzKHRoaXMuX2V2ZW50cykgOiBbXTtcbn07XG5cbi8vIEFib3V0IDEuNXggZmFzdGVyIHRoYW4gdGhlIHR3by1hcmcgdmVyc2lvbiBvZiBBcnJheSNzcGxpY2UoKS5cbmZ1bmN0aW9uIHNwbGljZU9uZShsaXN0LCBpbmRleCkge1xuICBmb3IgKHZhciBpID0gaW5kZXgsIGsgPSBpICsgMSwgbiA9IGxpc3QubGVuZ3RoOyBrIDwgbjsgaSArPSAxLCBrICs9IDEpXG4gICAgbGlzdFtpXSA9IGxpc3Rba107XG4gIGxpc3QucG9wKCk7XG59XG5cbmZ1bmN0aW9uIGFycmF5Q2xvbmUoYXJyLCBuKSB7XG4gIHZhciBjb3B5ID0gbmV3IEFycmF5KG4pO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG47ICsraSlcbiAgICBjb3B5W2ldID0gYXJyW2ldO1xuICByZXR1cm4gY29weTtcbn1cblxuZnVuY3Rpb24gdW53cmFwTGlzdGVuZXJzKGFycikge1xuICB2YXIgcmV0ID0gbmV3IEFycmF5KGFyci5sZW5ndGgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHJldC5sZW5ndGg7ICsraSkge1xuICAgIHJldFtpXSA9IGFycltpXS5saXN0ZW5lciB8fCBhcnJbaV07XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gb2JqZWN0Q3JlYXRlUG9seWZpbGwocHJvdG8pIHtcbiAgdmFyIEYgPSBmdW5jdGlvbigpIHt9O1xuICBGLnByb3RvdHlwZSA9IHByb3RvO1xuICByZXR1cm4gbmV3IEY7XG59XG5mdW5jdGlvbiBvYmplY3RLZXlzUG9seWZpbGwob2JqKSB7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGsgaW4gb2JqKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgaykpIHtcbiAgICBrZXlzLnB1c2goayk7XG4gIH1cbiAgcmV0dXJuIGs7XG59XG5mdW5jdGlvbiBmdW5jdGlvbkJpbmRQb2x5ZmlsbChjb250ZXh0KSB7XG4gIHZhciBmbiA9IHRoaXM7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZuLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG4gIH07XG59XG4iLCJjb25zdCBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKTtcbmNvbnN0IHsgY29sb3JzLCBwYWxldHRlIH0gPSByZXF1aXJlKCcuL2RhdGEnKTtcbmNvbnN0IHsgcmdiMmhleCB9ID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5jbGFzcyBDb2xvclBpY2tlciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdFx0Y29sb3JzLmZvckVhY2goKGNvbG9yLCBpbmRleCkgPT4ge1xuXHRcdFx0dmFyIHJvd0luZGV4ID0gTWF0aC5mbG9vcihpbmRleCAvIDE2KTtcblx0XHRcdHZhciBidXR0b24gPSAkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpKTtcblx0XHRcdGJ1dHRvbi5kYXRhKCdwaScsIGluZGV4KTtcblx0XHRcdGJ1dHRvbi5hZGRDbGFzcygncGlja2VyLWJ1dHRvbicpO1xuXHRcdFx0YnV0dG9uLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICcjJyArIGNvbG9yLmhleCk7XG5cdFx0XHQkKCcjY3Atcm93LScgKyAocm93SW5kZXggKyAxKSkuYXBwZW5kKGJ1dHRvbik7XG5cblx0XHRcdGJ1dHRvbi5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHBhbGV0dGVCdXR0b24gPSAkKCcucGFsZXR0ZS1idXR0b24tc2VsZWN0ZWQnKS5maXJzdCgpO1xuXHRcdFx0XHR2YXIgYmdjID0gJCh0aGlzKS5jc3MoJ2JhY2tncm91bmQtY29sb3InKTtcblx0XHRcdFx0aWYgKGJnYy5pbmRleE9mKCdyZ2InKSA9PT0gMCkge1xuXHRcdFx0XHRcdGJnYyA9IHJnYjJoZXgoYmdjKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgcGFsZXR0ZUluZGV4ID0gcGFyc2VJbnQocGFsZXR0ZUJ1dHRvbi5kYXRhKCdwaScpLCAxMCk7XG5cdFx0XHRcdHBhbGV0dGVCdXR0b24uY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJyMnICsgYmdjKTtcblx0XHRcdFx0cGFsZXR0ZVtwYWxldHRlSW5kZXhdLmhleCA9IGJnYztcblx0XHRcdFx0cGFsZXR0ZVtwYWxldHRlSW5kZXhdLmluZGV4ID0gcGFyc2VJbnQoJCh0aGlzKS5hdHRyKCdkYXRhLXBpJyksIDEwKTtcblxuXHRcdFx0XHRzZWxmLmVtaXQoJ3VwZGF0ZScpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb2xvclBpY2tlcjsiLCJjb25zdCBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKTtcbmNvbnN0IHsgQ0hSLCBwYWxldHRlIH0gPSByZXF1aXJlKCcuL2RhdGEnKTtcbmNvbnN0IHsgZ2V0UGFsZXR0ZUluZGV4LCBsb2FkQ2hyLCByZXNpemVDYW52YXMgfSA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuY2xhc3MgRWRpdG9yIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmNockluZGV4ID0gMDtcblx0XHR0aGlzLnpvb20gPSAxNjtcblx0XHR0aGlzLm1vdXNlZG93biA9IGZhbHNlO1xuXHRcdHRoaXMucGl4ZWxzID0gW107XG5cblx0XHQvLyBjcmVhdGUgY2FudmFzIGZvciBlZGl0b3Jcblx0XHRjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHRjYW52YXMuY2xhc3NOYW1lID0gJ2VkaXRvci1jYW52YXMnO1xuXHRcdGNhbnZhcy5pZCA9ICdlZGl0b3ItY2FudmFzJztcblx0XHQkKCcjZWRpdG9yLWNvbnRhaW5lcicpLmFwcGVuZChjYW52YXMpO1xuXHRcdHRoaXMuY2FudmFzID0gY2FudmFzO1xuXHRcdHRoaXMuY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cblx0XHQvLyBhZGQgZHJhd2luZyBldmVudHMgZm9yIGVkaXRvciBjYW52YXNcblx0XHRjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmRyYXdQaXhlbC5iaW5kKHRoaXMpLCBmYWxzZSk7XG5cdFx0Y2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCAoKSA9PiB0aGlzLm1vdXNlZG93biA9IGZhbHNlKTtcblx0XHRjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZXYgPT4ge1xuXHRcdFx0dGhpcy5tb3VzZWRvd24gPSB0cnVlO1xuXHRcdFx0dGhpcy5kcmF3UGl4ZWwoZXYpO1xuXHRcdH0pO1xuXHRcdGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBldiA9PiB7XG5cdFx0XHRpZiAodGhpcy5tb3VzZWRvd24pIHtcblx0XHRcdFx0dGhpcy5kcmF3UGl4ZWwoZXYpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ly8gbG9hZCBkZWZhdWx0IENIUiBkYXRhIGludG8gZWRpdG9yIGFuZCBkcmF3XG5cdFx0dGhpcy51cGRhdGVDaHIobnVsbCwgdGhpcy5jaHJJbmRleCk7XG5cdH1cblxuXHRkcmF3KCkge1xuXHRcdGNvbnN0IHsgY3R4LCB6b29tIH0gPSB0aGlzO1xuXHRcdHRoaXMucGl4ZWxzLmZvckVhY2gocCA9PiB7XG5cdFx0XHRjdHguZmlsbFN0eWxlID0gJyMnICsgcGFsZXR0ZVtwLnBhbGV0dGVJbmRleF0uaGV4O1xuXHRcdFx0Y3R4LmZpbGxSZWN0KHAueCwgcC55LCB6b29tLCB6b29tKTtcblx0XHR9KTtcblx0XHR0aGlzLmdyaWQuZHJhdygpO1xuXHRcdHRoaXMuZGl2aWRlcnMuZHJhdygpO1xuXHR9XG5cblx0ZHJhd1BpeGVsKGV2KSB7XG5cdFx0Y29uc3QgeyBjaHJJbmRleCB9ID0gdGhpcztcblx0XHRjb25zdCBjaHJEYXRhID0gQ0hSW3RoaXMuY2hySW5kZXhdO1xuXHRcdGNvbnN0IHJlY3QgPSB0aGlzLmNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblx0XHRjb25zdCB4ID0gZXYuY2xpZW50WCAtIHJlY3QubGVmdDtcblx0XHRjb25zdCB5ID0gZXYuY2xpZW50WSAtIHJlY3QudG9wO1xuXHRcdGNvbnN0IHhTY2FsZSA9IE1hdGguZmxvb3IoeCAvIHRoaXMuem9vbSk7XG5cdFx0Y29uc3QgeVNjYWxlID0gTWF0aC5mbG9vcih5IC8gdGhpcy56b29tKTtcblx0XHRsZXQgcGl4ZWxJbmRleCA9ICh5U2NhbGUgKiBjaHJEYXRhLndpZHRoKSArIHhTY2FsZTtcblxuXHRcdGlmIChjaHJEYXRhLndpZHRoID4gOCkge1xuXHRcdFx0bGV0IG9mZnNldCA9IDA7XG5cdFx0XHRpZiAoeFNjYWxlID49IGNockRhdGEud2lkdGggLyAyKSB7IG9mZnNldCsrOyB9XG5cdFx0XHRpZiAoeVNjYWxlID49IGNockRhdGEuaGVpZ2h0IC8gMikgeyBvZmZzZXQrKzsgfVxuXHRcdFx0cGl4ZWxJbmRleCA9ICg2NCAqIG9mZnNldCkgKyAoeVNjYWxlICogOCkgKyAoeFNjYWxlICUgOCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgcGFsZXR0ZUluZGV4ID0gZ2V0UGFsZXR0ZUluZGV4KCk7XG5cdFx0dGhpcy5waXhlbHNbcGl4ZWxJbmRleF0ucGFsZXR0ZUluZGV4ID0gcGFsZXR0ZUluZGV4O1xuXHRcdHRoaXMuZHJhdygpO1xuXHRcdHRoaXMuZW1pdCgncGl4ZWwnLCB7IGNockluZGV4LCBwYWxldHRlSW5kZXgsIHBpeGVsSW5kZXggfSk7XG5cdH1cblxuXHR1cGRhdGVDaHIodGlsZXMsIGNockluZGV4KSB7XG5cdFx0dGhpcy5jaHJJbmRleCA9IGNockluZGV4O1xuXHRcdGNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gbG9hZENocih0aWxlcywgY2hySW5kZXgsIHRoaXMucGl4ZWxzLCB0aGlzLnpvb20pO1xuXHRcdHJlc2l6ZUNhbnZhcy5jYWxsKHRoaXMsIHRoaXMuY2FudmFzLCB3aWR0aCwgaGVpZ2h0LCB0aGlzLnpvb20pO1xuXHRcdHRoaXMuZ3JpZCA9IG5ldyBHcmlkKHRoaXMpO1xuXHRcdHRoaXMuZGl2aWRlcnMgPSBuZXcgRGl2aWRlcnModGhpcyk7XG5cdFx0dGhpcy5kcmF3KCk7XG5cdH1cbn1cblxuY2xhc3MgRGl2aWRlcnMge1xuXHRjb25zdHJ1Y3RvcihlZGl0b3IpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHtcblx0XHRcdHN0eWxlOiAncmdiYSgyNTUsMjU1LDI1NSwwLjgpJyxcblx0XHRcdHNob3c6IHRydWUsXG5cdFx0XHRlZGl0b3Jcblx0XHR9KTtcblx0fVxuXG5cdGRyYXcoKSB7XG5cdFx0aWYgKHRoaXMuc2hvdykge1xuXHRcdFx0Y29uc3QgeyBjdHgsIGhlaWdodCwgd2lkdGgsIHpvb20gfSA9IHRoaXMuZWRpdG9yO1xuXHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gdGhpcy5zdHlsZTtcblx0XHRcdGN0eC5iZWdpblBhdGgoKTtcblx0XHRcdGN0eC5tb3ZlVG8oMCwgaGVpZ2h0ICogem9vbSAvIDIpO1xuXHRcdFx0Y3R4LmxpbmVUbyh3aWR0aCAqIHpvb20sIGhlaWdodCAqIHpvb20gLyAyKTtcblx0XHRcdGN0eC5zdHJva2UoKTtcblxuXHRcdFx0Y3R4LmJlZ2luUGF0aCgpO1xuXHRcdFx0Y3R4Lm1vdmVUbyh3aWR0aCAqIHpvb20gLyAyLCAwKTtcblx0XHRcdGN0eC5saW5lVG8od2lkdGggKiB6b29tIC8gMiwgaGVpZ2h0ICogem9vbSk7XG5cdFx0XHRjdHguc3Ryb2tlKCk7XG5cdFx0fVxuXHR9XG59XG5cbmNsYXNzIEdyaWQge1xuXHRjb25zdHJ1Y3RvcihlZGl0b3IpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHtcblx0XHRcdHN0eWxlOiAncmdiYSgyNTUsMjU1LDI1NSwwLjUpJyxcblx0XHRcdHNob3c6IHRydWUsXG5cdFx0XHRlZGl0b3Jcblx0XHR9KTtcblx0fVxuXG5cdGRyYXcoKSB7XG5cdFx0aWYgKHRoaXMuc2hvdykge1xuXHRcdFx0Y29uc3QgeyBjdHgsIGhlaWdodCwgd2lkdGgsIHpvb20gfSA9IHRoaXMuZWRpdG9yO1xuXHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gdGhpcy5zdHlsZTtcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgd2lkdGggKyAxOyBpKyspIHtcblx0XHRcdFx0Y3R4LmJlZ2luUGF0aCgpO1xuXHRcdFx0XHRjdHgubW92ZVRvKGkgKiB6b29tLCAwKTtcblx0XHRcdFx0Y3R4LmxpbmVUbyhpICogem9vbSwgaGVpZ2h0ICogem9vbSk7XG5cdFx0XHRcdGN0eC5zdHJva2UoKTtcblx0XHRcdH1cblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDxoZWlnaHQgKyAxOyBpKyspIHtcblx0XHRcdFx0Y3R4LmJlZ2luUGF0aCgpO1xuXHRcdFx0XHRjdHgubW92ZVRvKDAsIGkgKiB6b29tKTtcblx0XHRcdFx0Y3R4LmxpbmVUbyh3aWR0aCAqIHpvb20sIGkgKiB6b29tKTtcblx0XHRcdFx0Y3R4LnN0cm9rZSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvcjsiLCJjb25zdCB7IHBhbGV0dGUgfSA9IHJlcXVpcmUoJy4vZGF0YScpO1xuXG5jbGFzcyBQYWxldHRlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0cGFsZXR0ZS5mb3JFYWNoKChwLCBpbmRleCkgPT4ge1xuXHRcdFx0Y29uc3QgYnV0dG9uID0gJCgnPGJ1dHRvbj48L2J1dHRvbj4nKTtcblx0XHRcdGJ1dHRvbi5hZGRDbGFzcygncGFsZXR0ZS1idXR0b24nKTtcblx0XHRcdGlmIChpbmRleCA9PT0gMCkge1xuXHRcdFx0XHRidXR0b24uYWRkQ2xhc3MoJ3BhbGV0dGUtYnV0dG9uLXNlbGVjdGVkJyk7XG5cdFx0XHR9XG5cdFx0XHRidXR0b24uY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJyMnICsgcC5oZXgpO1xuXHRcdFx0YnV0dG9uLmRhdGEoJ3BpJywgaW5kZXgpO1xuXHRcdFx0JCgnI3BhbGV0dGUtY29udGFpbmVyJykuYXBwZW5kKGJ1dHRvbik7XG5cblx0XHRcdGJ1dHRvbi5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0XHQkKCcucGFsZXR0ZS1idXR0b24nKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmICh0aGlzID09PSBzZWxmKSB7XG5cdFx0XHRcdFx0XHQkKHRoaXMpLmFkZENsYXNzKCdwYWxldHRlLWJ1dHRvbi1zZWxlY3RlZCcpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKHRoaXMpLnJlbW92ZUNsYXNzKCdwYWxldHRlLWJ1dHRvbi1zZWxlY3RlZCcpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhbGV0dGU7IiwiY29uc3QgQ29sb3JQaWNrZXIgPSByZXF1aXJlKCcuL0NvbG9yUGlja2VyJyk7XG5jb25zdCBFZGl0b3IgPSByZXF1aXJlKCcuL0VkaXRvcicpO1xuY29uc3QgUGFsZXR0ZSA9IHJlcXVpcmUoJy4vUGFsZXR0ZScpO1xuY29uc3QgVGlsZXMgPSByZXF1aXJlKCcuL1RpbGVzJyk7XG5jb25zdCBTdGF0ZXMgPSByZXF1aXJlKCcuL1N0YXRlcycpO1xuXG5jbGFzcyBTcHJpdGVNYWtlciB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHRoaXMuZWRpdG9yID0gbmV3IEVkaXRvcigpO1xuXHRcdHRoaXMudGlsZXMgPSBuZXcgVGlsZXMoKTtcblx0XHR0aGlzLnN0YXRlcyA9IG5ldyBTdGF0ZXModGhpcy50aWxlcywgdGhpcy5lZGl0b3IuY2hySW5kZXgpO1xuXHRcdHRoaXMucGFsZXR0ZSA9IG5ldyBQYWxldHRlKCk7XG5cdFx0dGhpcy5jb2xvclBpY2tlciA9IG5ldyBDb2xvclBpY2tlcigpO1xuXG5cdFx0dGhpcy5lZGl0b3Iub24oJ3BpeGVsJywgdGhpcy50aWxlcy51cGRhdGVQaXhlbC5iaW5kKHRoaXMudGlsZXMpKTtcblx0XHR0aGlzLnRpbGVzLm9uKCdjbGljaycsIGNockluZGV4ID0+IHtcblx0XHRcdHRoaXMuZWRpdG9yLnVwZGF0ZUNocih0aGlzLnRpbGVzLCBjaHJJbmRleCk7XG5cdFx0XHR0aGlzLnN0YXRlcy5zaG93QWZmZWN0ZWQoY2hySW5kZXgpO1xuXHRcdH0pO1xuXHRcdHRoaXMuY29sb3JQaWNrZXIub24oJ3VwZGF0ZScsIHRoaXMuZHJhdy5iaW5kKHRoaXMpKTtcblxuXHRcdCQoJyNmcHMnKS5jaGFuZ2UodGhpcy5zdGF0ZXMudXBkYXRlRnBzLmJpbmQodGhpcy5zdGF0ZXMpKTtcblx0fVxuXG5cdGRyYXcoKSB7XG5cdFx0dGhpcy5lZGl0b3IuZHJhdygpO1xuXHRcdHRoaXMudGlsZXMuZHJhdygpO1xuXHRcdHRoaXMuc3RhdGVzLmRyYXcoKTtcblx0fVxufVxuXG53aW5kb3cuU3ByaXRlTWFrZXIgPSBTcHJpdGVNYWtlcjsiLCJjb25zdCB7IENIUiwgcGFsZXR0ZSwgc3RhdGVzIH0gPSByZXF1aXJlKCcuL2RhdGEnKTtcbmNvbnN0IHsgcmVzaXplQ2FudmFzIH0gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbmNsYXNzIFN0YXRlcyB7XG5cdGNvbnN0cnVjdG9yKHRpbGVzLCBjaHJJbmRleCkge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywge1xuXHRcdFx0YW5pbWF0aW9uczogW10sXG5cdFx0XHR6b29tOiAzLFxuXHRcdFx0ZnBzOiAzXG5cdFx0fSk7XG5cblx0XHRzdGF0ZXMuZm9yRWFjaCgoc3RhdGUsIGluZGV4KSA9PiB7XG5cdFx0XHRjb25zdCBjYW52YXMgPSAkKCc8Y2FudmFzPjwvY2FudmFzPicpO1xuXHRcdFx0Y2FudmFzLmFkZENsYXNzKCdzdGF0ZS1jYW52YXMnKTtcblx0XHRcdGNhbnZhcy5hdHRyKCdkYXRhLXNpZCcsIGluZGV4KTtcblx0XHRcdCQoJyNzdGF0ZXMnKS5hcHBlbmQoY2FudmFzKTtcblx0XHRcdHN0YXRlLmNhbnZhcyA9IGNhbnZhcztcblx0XHRcdHN0YXRlLmN0eCA9IGNhbnZhc1swXS5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdFx0c3RhdGUuZnJhbWVDb3VudCA9IDA7XG5cblx0XHRcdHN0YXRlLmZyYW1lcy5mb3JFYWNoKGZyYW1lID0+IHtcblx0XHRcdFx0ZnJhbWUuZm9yRWFjaChwYXJ0ID0+IHtcblx0XHRcdFx0XHRwYXJ0LnBpeGVscyA9IHRpbGVzLnBpeGVscy5maW5kKHBpeGVscyA9PiB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcGl4ZWxzLm5hbWUgPT09IHBhcnQubmFtZTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHRcdHJlc2l6ZUNhbnZhcy5jYWxsKHRoaXMsIGNhbnZhcywgc3RhdGUud2lkdGgsIHN0YXRlLmhlaWdodCwgdGhpcy56b29tKTtcblx0XHR9KTtcblxuXHRcdHRoaXMudXBkYXRlRnBzKHRoaXMuZnBzKTtcblx0XHR0aGlzLnNob3dBZmZlY3RlZChjaHJJbmRleCk7XG5cdH1cblxuXHR1cGRhdGVGcHMoZnBzKSB7XG5cdFx0aWYgKCEkLmlzTnVtZXJpYyhmcHMpKSB7XG5cdFx0XHRmcHMgPSAkKCcjZnBzJykudmFsKCk7XG5cdFx0fVxuXHRcdHRoaXMuZnBzID0gZnBzO1xuXHRcdGlmICh0aGlzLmludGVydmFsKSB7XG5cdFx0XHRjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWwpO1xuXHRcdH1cblx0XHRpZiAoZnBzID4gMCkge1xuXHRcdFx0dGhpcy5pbnRlcnZhbCA9IHNldEludGVydmFsKHRoaXMuZHJhdy5iaW5kKHRoaXMpLCAxMDAwIC8gdGhpcy5mcHMpO1xuXHRcdH1cblx0fVxuXG5cdHNob3dBZmZlY3RlZChjaHJJbmRleCkge1xuXHRcdGNvbnN0IGNock5hbWUgPSBDSFJbY2hySW5kZXhdLm5hbWU7XG5cdFx0c3RhdGVzLmZvckVhY2goKHN0YXRlLCBpbmRleCkgPT4ge1xuXHRcdFx0Y29uc3QgZm91bmQgPSBzdGF0ZS5mcmFtZXMuZmluZChmcmFtZSA9PiBmcmFtZS5maW5kKGYgPT4gZi5uYW1lID09PSBjaHJOYW1lKSk7XG5cdFx0XHRjb25zdCBzdGF0ZUNhbnZhcyA9ICQoJ2NhbnZhc1tkYXRhLXNpZD1cIicgKyBpbmRleCArICdcIl0nKTtcblx0XHRcdGlmIChmb3VuZCkge1xuXHRcdFx0XHRzdGF0ZUNhbnZhcy5jc3MoJ2Rpc3BsYXknLCAnJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzdGF0ZUNhbnZhcy5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0ZHJhdygpIHtcblx0XHRzdGF0ZXMuZm9yRWFjaChzdGF0ZSA9PiB7XG5cdFx0XHRjb25zdCB7IGN0eCB9ID0gc3RhdGU7XG5cdFx0XHRjdHguY2xlYXJSZWN0KDAsIDAsIHN0YXRlLndpZHRoICogdGhpcy56b29tLCBzdGF0ZS5oZWlnaHQgKiB0aGlzLnpvb20pO1xuXG5cdFx0XHRjb25zdCBmcmFtZSA9IHN0YXRlLmZyYW1lc1tzdGF0ZS5mcmFtZUNvdW50XTtcblx0XHRcdGZyYW1lLmZvckVhY2gocGFydCA9PiB7XG5cdFx0XHRcdHBhcnQucGl4ZWxzLmZvckVhY2gocCA9PiB7XG5cdFx0XHRcdFx0Y3R4LmZpbGxTdHlsZSA9ICcjJyArIHBhbGV0dGVbcC5wYWxldHRlSW5kZXhdLmhleDtcblx0XHRcdFx0XHRjdHguZmlsbFJlY3QoXG5cdFx0XHRcdFx0XHRwLnggKyAocGFydC54ID4gMCA/IDQgKiBwYXJ0LnggKiB0aGlzLnpvb20gOiAwKSwgXG5cdFx0XHRcdFx0XHRwLnkgKyAocGFydC55ID4gMCA/IDggKiBwYXJ0LnkgKiB0aGlzLnpvb20gOiAwKSwgXG5cdFx0XHRcdFx0XHR0aGlzLnpvb20sIFxuXHRcdFx0XHRcdFx0dGhpcy56b29tXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHRcdHN0YXRlLmZyYW1lQ291bnQrKztcblx0XHRcdGlmIChzdGF0ZS5mcmFtZUNvdW50ID49IHN0YXRlLmZyYW1lcy5sZW5ndGgpIHtcblx0XHRcdFx0c3RhdGUuZnJhbWVDb3VudCA9IDA7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTdGF0ZXM7IiwiY29uc3QgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJyk7XG5jb25zdCB7IENIUiwgcGFsZXR0ZSB9ID0gcmVxdWlyZSgnLi9kYXRhJyk7XG5jb25zdCB7IGxvYWRDaHIsIHJlc2l6ZUNhbnZhcyB9ID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5jbGFzcyBUaWxlcyBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5waXhlbHMgPSBbXTtcblx0XHR0aGlzLnpvb20gPSAzO1xuXG5cdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdFx0Q0hSLmZvckVhY2goKGNociwgaW5kZXgpID0+IHtcblx0XHRcdGNvbnN0IGNhbnZhcyA9ICQoJzxjYW52YXM+PC9jYW52YXM+Jyk7XG5cdFx0XHRjYW52YXMuYWRkQ2xhc3MoJ3RpbGUtY2FudmFzJyk7XG5cdFx0XHRjYW52YXMuZGF0YSgndGlkJywgaW5kZXgpO1xuXHRcdFx0Y2FudmFzLmNsaWNrKCgpID0+IHtcblx0XHRcdFx0c2VsZi5lbWl0KCdjbGljaycsIGluZGV4KTtcblx0XHRcdH0pO1xuXHRcdFx0JCgnI3RpbGVzJykuYXBwZW5kKGNhbnZhcyk7XG5cblx0XHRcdGNvbnN0IHBpeGVscyA9IFtdO1xuXHRcdFx0cGl4ZWxzLm5hbWUgPSBjaHIubmFtZTtcblx0XHRcdGxvYWRDaHIobnVsbCwgaW5kZXgsIHBpeGVscywgdGhpcy56b29tKTtcblx0XHRcdHRoaXMucGl4ZWxzLnB1c2gocGl4ZWxzKTtcblxuXHRcdFx0cGl4ZWxzLmNhbnZhcyA9IGNhbnZhcztcblx0XHRcdHBpeGVscy5jdHggPSBjYW52YXNbMF0uZ2V0Q29udGV4dCgnMmQnKTtcblx0XHRcdHJlc2l6ZUNhbnZhcy5jYWxsKHRoaXMsIGNhbnZhc1swXSwgY2hyLndpZHRoLCBjaHIuaGVpZ2h0LCB0aGlzLnpvb20pO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5kcmF3KCk7XG5cdH1cblxuXHR1cGRhdGVQaXhlbCh7IGNockluZGV4LCBwYWxldHRlSW5kZXgsIHBpeGVsSW5kZXggfSkge1xuXHRcdHRoaXMucGl4ZWxzW2NockluZGV4XVtwaXhlbEluZGV4XS5wYWxldHRlSW5kZXggPSBwYWxldHRlSW5kZXg7XG5cdFx0dGhpcy5kcmF3KCk7XG5cdH1cblxuXHRkcmF3KCkge1xuXHRcdHRoaXMucGl4ZWxzLmZvckVhY2gocGl4ZWxzID0+IHtcblx0XHRcdHBpeGVscy5mb3JFYWNoKHAgPT4ge1xuXHRcdFx0XHRwaXhlbHMuY3R4LmZpbGxTdHlsZSA9ICcjJyArIHBhbGV0dGVbcC5wYWxldHRlSW5kZXhdLmhleDtcblx0XHRcdFx0cGl4ZWxzLmN0eC5maWxsUmVjdChwLngsIHAueSwgdGhpcy56b29tLCB0aGlzLnpvb20pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUaWxlczsiLCIvLyBETyBOT1QgRURJVCBUSElTIEZJTEUgRElSRUNUTFkhIFRoaXMgZmlsZSBoYXMgYmVlbiBnZW5lcmF0ZWQgdmlhIGEgUk9NIHNwcml0ZVxuLy8gZXh0cmFjdGlvbiB0b29sIGxvY2F0ZWQgYXQgdG9vbHMvc3ByaXRlLWV4dHJhY3QuanNcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdENIUjogW1xuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbklkbGVUb3AnLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM1MjE2LFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwzLDEsMSwxLDAsMCwwLDEsMSwzLDIsMSwwLDAsMCwxLDMsMywyLDEsMCwwLDAsMSwzLDIsMSwxLDAsMCwwLDEsMSwxLDMsMywwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDEsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDIsMSwwLDAsMSwyLDIsMSwxLDEsMCwwLDAsMCwwLDAsMSwzLDIsMiwwLDAsMCwwLDAsMSwxLDEsMCwxLDEsMCwxLDEsMywxLDEsMywzLDEsMSwxLDEsMSwxLDMsMywzLDMsMSwxLDEsMCwxLDMsMywzLDEsMSwxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMCwwLDAsMCwxLDEsMiwxLDIsMSwxLDEsMSwwLDEsMSwyLDIsMSwxLDEsMSwxLDEsMiwyLDEsMSwxLDEsMSwxLDIsMiwxLDMsMSwwLDEsMSwyLDIsMSwxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMSwxLDEsMSwxLDAsMCwwLDIsMSwxLDIsMiwxLDAsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbklkbGVCb3R0b20nLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM1MjgwLFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMiwyLDAsMCwwLDAsMCwwLDEsMSwwLDAsMCwwLDAsMywxLDEsMCwwLDAsMCwzLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMSwxLDEsMSwxLDAsMCwwLDEsMSwxLDEsMCwwLDAsMCwxLDMsMSwxLDAsMCwyLDIsMiwyLDIsMSwwLDAsMSwyLDIsMiwyLDEsMCwwLDEsMSwxLDEsMSwxLDAsMCwxLDMsMSwxLDEsMCwwLDAsMSwzLDEsMSwxLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwwLDEsMSwxLDEsMCwwLDAsMCwwLDEsMSwzLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwwLDEsMywzLDEsMCwwLDAsMCwxLDMsMSwxLDAsMCwxLDEsMywzLDMsMSwwLDAsMSwzLDMsMywzLDEsMCwwLDEsMSwxLDEsMSwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMywzLDEsMSwwLDAsMCwwLDEsMywzLDEsMSwwLDAsMCwwLDEsMywzLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwxLDMsMywzLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDAsMCwwLDAsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbldhbGsxVG9wJyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRvZmZzZXQ6IDEzNTM0NCxcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyLFxuXHRcdFx0XHQxLFxuXHRcdFx0XHQzXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwxLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwxLDAsMCwxLDMsMSwxLDEsMSwxLDAsMSwxLDMsMiwxLDEsMSwwLDEsMywzLDIsMiwxLDEsMCwxLDMsMiwyLDEsMSwxLDAsMSwxLDEsMSwyLDMsMiwwLDAsMCwxLDEsMywyLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMiwxLDAsMCwwLDAsMCwwLDEsMSwwLDAsMCwwLDAsMCwwLDAsMSwyLDEsMSwxLDMsMCwwLDEsMiwyLDEsMSwxLDAsMCwxLDEsMiwyLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwzLDEsMSwzLDAsMCwxLDMsMywzLDMsMywwLDAsMSwzLDMsMywzLDMsMCwwLDAsMSwxLDEsMSwxLDEsMSwxLDAsMCwwLDAsMCwzLDEsMSwwLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwwLDMsMSwxLDEsMCwwLDAsMCwzLDMsMSwxLDAsMCwwLDAsMywzLDEsMCwwLDAsMCwwLDEsMSwxLDAsMCwwLDAsMCwxLDIsMSwwLDAsMCwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25XYWxrMUJvdHRvbScsXG5cdFx0XHRoZWlnaHQ6IDE2LFxuXHRcdFx0d2lkdGg6IDE2LFxuXHRcdFx0b2Zmc2V0OiAxMzU0MDgsXG5cdFx0XHRsYXlvdXQ6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0Mixcblx0XHRcdFx0MSxcblx0XHRcdFx0M1xuXHRcdFx0XSxcblx0XHRcdGRhdGE6IFswLDAsMCwwLDEsMiwyLDIsMCwwLDAsMCwxLDEsMSwxLDAsMCwwLDEsMywxLDMsMSwwLDAsMCwxLDEsMSwzLDEsMCwwLDAsMSwxLDEsMywxLDAsMCwwLDEsMSwxLDMsMSwwLDAsMCwwLDEsMSwxLDEsMCwwLDAsMCwwLDEsMSwxLDIsMiwxLDAsMCwwLDAsMCwxLDEsMSwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMywzLDAsMCwwLDAsMCwwLDEsMywwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwxLDMsMCwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDAsMCwzLDEsMCwwLDAsMCwwLDAsMywxLDEsMCwwLDAsMCwwLDMsMywxLDAsMCwwLDAsMCwzLDMsMSwxLDAsMCwwLDAsMywzLDMsMSwwLDAsMCwwLDMsMywzLDEsMCwwLDAsMCwxLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwXVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3NpbW9uV2FsazJUb3AnLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM1NDcyLFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDEsMSwxLDEsMCwwLDEsMSwxLDEsMSwxLDEsMCwxLDMsMSwxLDEsMSwxLDAsMSwxLDMsMiwxLDEsMSwwLDEsMywzLDIsMiwxLDEsMCwxLDMsMiwyLDIsMSwxLDAsMSwxLDEsMiwxLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDEsMSwxLDEsMCwwLDAsMCwxLDMsMiwyLDEsMCwwLDAsMywyLDIsMSwxLDAsMCwwLDAsMCwwLDEsMSwxLDIsMSwwLDAsMCwyLDEsMiwyLDEsMCwwLDAsMSwyLDIsMiwyLDAsMSwxLDEsMiwyLDIsMiwxLDMsMywxLDEsMiwyLDIsMSwzLDMsMywxLDEsMSwxLDEsMywzLDEsMSwxLDEsMSwwLDEsMSwwLDAsMSwxLDIsMSwxLDEsMSwxLDEsMCwwLDEsMywxLDEsMSwxLDEsMCwxLDEsMywxLDEsMywzLDEsMiwxLDEsMSwzLDMsMywxLDEsMSwxLDEsMSwzLDMsMSwxLDEsMSwzLDMsMywzLDEsMSwyLDEsMywzLDMsMSwwLDIsMiwxLDEsMywzLDEsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbldhbGsyQm90dG9tJyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRvZmZzZXQ6IDEzNTUzNixcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyLFxuXHRcdFx0XHQxLFxuXHRcdFx0XHQzXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDEsMiwwLDAsMCwwLDAsMSwyLDEsMCwwLDAsMCwwLDEsMywxLDAsMCwwLDAsMSwzLDEsMSwwLDAsMCwxLDMsMSwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwzLDMsMSwxLDAsMiwyLDIsMSwxLDEsMCwwLDEsMiwyLDIsMiwxLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMCwwLDMsMSwxLDEsMCwwLDAsMCwzLDEsMSwxLDEsMCwwLDAsMCwxLDEsMywxLDEsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDEsMywzLDMsMSwwLDAsMCwxLDMsMywzLDEsMCwwLDAsMSwzLDMsMSwwLDAsMCwxLDMsMywzLDEsMCwwLDEsMywzLDMsMywxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDMsMywzLDEsMCwwLDAsMCwxLDMsMywxLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDAsMCwxLDMsMywwLDAsMCwwLDEsMywzLDEsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMCwwLDAsMCwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hGcm9udExlZycsXG5cdFx0XHRoZWlnaHQ6IDgsXG5cdFx0XHR3aWR0aDogOCxcblx0XHRcdG9mZnNldDogMTM1NjAwLFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDBcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwxLDEsMSwxLDEsMSwyLDEsMywzLDEsMSwxLDEsMSwxLDMsMywzLDEsMSwxLDEsMSwzLDMsMywxLDEsMSwzLDAsMSwzLDMsMSwxLDMsMSwwLDAsMSwzLDMsMSwxLDEsMCwxLDMsMywzLDEsMSwxLDEsMywzLDMsMywzLDEsMV1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MScsXG5cdFx0XHRoZWlnaHQ6IDgsXG5cdFx0XHR3aWR0aDogOCxcblx0XHRcdG9mZnNldDogMTM1NjE2LFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDBcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEJhY2tMZWcnLFxuXHRcdFx0aGVpZ2h0OiA4LFxuXHRcdFx0d2lkdGg6IDgsXG5cdFx0XHRvZmZzZXQ6IDEzNTYzMixcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzIsMiwyLDIsMiwxLDAsMCwyLDIsMiwyLDIsMSwwLDAsMSwyLDIsMiwyLDEsMSwwLDEsMSwyLDIsMSwzLDMsMSwxLDEsMSwxLDMsMywzLDEsMSwxLDMsMywzLDEsMywxLDEsMywxLDEsMSwxLDMsMSwxLDEsMCwxLDEsMywzLDFdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0aGVpZ2h0OiA4LFxuXHRcdFx0d2lkdGg6IDgsXG5cdFx0XHRvZmZzZXQ6IDEzNTY0OCxcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25TdGFpcnNEYW1hZ2VMZWcnLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiA4LFxuXHRcdFx0b2Zmc2V0OiAxMzU2NjQsXG5cdFx0XHRsYXlvdXQ6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MVxuXHRcdFx0XSxcblx0XHRcdGRhdGE6IFswLDAsMCwwLDAsMSwxLDIsMCwwLDAsMCwxLDMsMSwxLDAsMCwwLDEsMywxLDEsMSwwLDAsMCwxLDMsMSwxLDEsMCwwLDEsMywxLDEsMSwxLDAsMCwxLDEsMSwxLDEsMywwLDAsMSwxLDEsMSwwLDEsMCwxLDEsMSwxLDAsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDEsMywzLDMsMSwwLDAsMCwxLDMsMywzLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwwLDEsMywzLDMsMSwwLDAsMSwzLDMsMywxLDEsMCwxLDMsMywzLDEsMCwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25TdGFpcldhbGtVcExlZ3MnLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM1Njk2LFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMCwxLDMsMywzLDEsMSwxLDAsMCwxLDMsMywxLDAsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDEsMywzLDMsMywxLDAsMSwzLDMsMywzLDMsMSwyLDIsMiwyLDIsMSwwLDAsMiwyLDIsMiwyLDEsMCwwLDEsMSwyLDIsMiwxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMSwzLDEsMSwxLDAsMCwwLDEsMywxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDEsMywxLDEsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDEsMSwzLDMsMSwwLDAsMCwwLDEsMywzLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDAsMSwzLDMsMywxLDAsMCwxLDMsMywzLDEsMSwwLDEsMywzLDMsMSwwLDAsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AxJyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRvZmZzZXQ6IDEzNTc2MCxcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyLFxuXHRcdFx0XHQxLFxuXHRcdFx0XHQzXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwxLDAsMCwxLDMsMywxLDEsMSwwLDAsMSwxLDMsMywxLDEsMCwwLDEsMywzLDIsMSwxLDAsMSwxLDIsMiwxLDEsMSwxLDIsMSwxLDEsMSwxLDMsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwxLDEsMCwwLDAsMCwwLDMsMiwxLDEsMCwxLDEsMCwxLDEsMSwyLDIsMSwxLDEsMSwyLDIsMiwyLDEsMSwxLDEsMiwyLDIsMiwxLDEsMSwxLDIsMiwyLDIsMiwyLDEsMSwxLDEsMSwyLDIsMSwxLDEsMSwxLDEsMSwxLDEsMCwxLDEsMSwxLDEsMSwwLDAsMiwyLDIsMiwyLDEsMCwwLDEsMiwyLDEsMSwzLDMsMSwxLDEsMSwwLDEsMywzLDMsMSwxLDEsMSwxLDEsMywxLDEsMSwxLDMsMywzLDEsMCwxLDEsMSwzLDMsMywxLDAsMCwxLDEsMSwxLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMicsXG5cdFx0XHRoZWlnaHQ6IDE2LFxuXHRcdFx0d2lkdGg6IDE2LFxuXHRcdFx0b2Zmc2V0OiAxMzU4ODgsXG5cdFx0XHRsYXlvdXQ6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0Mixcblx0XHRcdFx0MSxcblx0XHRcdFx0M1xuXHRcdFx0XSxcblx0XHRcdGRhdGE6IFswLDAsMCwwLDAsMCwwLDAsMCwxLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwxLDAsMCwxLDMsMywxLDEsMSwxLDAsMSwxLDMsMywxLDEsMSwwLDEsMywzLDIsMSwzLDMsMSwxLDIsMiwxLDMsMywzLDMsMCwxLDEsMiwxLDMsMywzLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMSwxLDEsMSwxLDAsMCwzLDMsMywzLDMsMywxLDEsMCwxLDIsMSwxLDMsMywyLDEsMiwxLDEsMywzLDIsMSwxLDIsMSwxLDIsMiwyLDEsMSwyLDIsMSwxLDIsMSwxLDAsMSwyLDIsMSwxLDEsMSwwLDEsMSwxLDEsMSwxLDAsMSwxLDEsMSwxLDEsMCwwLDIsMiwyLDIsMiwxLDAsMCwxLDEsMSwxLDEsMSwzLDMsMCwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwXVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDMnLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM1OTg0LFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwzLDEsMSwxLDAsMCwwLDEsMywzLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDEsMywzLDIsMSwxLDAsMSwzLDIsMiwyLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDEsMSwxLDEsMSwxLDAsMCwyLDIsMiwxLDIsMywxLDAsMiwyLDIsMSwxLDEsMSwwLDAsMSwyLDIsMiwxLDEsMiwxLDEsMSwxLDEsMSwxLDIsMywxLDEsMSwxLDEsMSwyLDMsMSwxLDEsMSwxLDIsMiwzLDMsMSwxLDAsMCwxLDIsMywxLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwxLDEsMiwyLDIsMiwxLDEsMSwwLDIsMiwyLDIsMSwxLDEsMSwyLDIsMiwyLDEsMSwzLDEsMiwyLDIsMiwxLDMsMywxLDIsMSwxLDEsMSwxLDEsMCwxLDEsMSwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDIsMiwyLDIsMiwxLDAsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbkhhbmQnLFxuXHRcdFx0aGVpZ2h0OiA4LFxuXHRcdFx0d2lkdGg6IDgsXG5cdFx0XHRvZmZzZXQ6IDEzNjA2NCxcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDEsMSwxLDEsMywwLDAsMSwxLDMsMywzLDMsMCwwLDEsMywzLDMsMywzLDAsMCwxLDEsMywzLDEsMSwwLDAsMCwxLDAsMSwxLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25EYW1hZ2VUb3AnLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM2MTQ0LFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMCwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMywyLDEsMSwxLDEsMSwzLDIsMiwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDEsMSwwLDAsMCwxLDEsMSwzLDIsMSwwLDAsMSwxLDIsMSwxLDIsMSwwLDEsMSwxLDEsMSwzLDIsMiwxLDEsMSwzLDEsMSwyLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDAsMSwxLDEsMSwwLDAsMSwxLDEsMSwxLDEsMCwxLDMsMywxLDEsMSwxLDAsMSwzLDMsMywxLDEsMSwwLDAsMSwxLDEsMSwxLDEsMiwxLDIsMiwxLDEsMSwwLDEsMSwyLDIsMiwxLDEsMSwxLDEsMiwyLDIsMSwxLDEsMSwxLDIsMiwyLDEsMSwxLDEsMiwyLDIsMiwzLDMsMSwxLDIsMiwyLDEsMywxLDAsMiwyLDIsMSwxLDEsMCwwLDEsMSwxLDEsMSwxLDAsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbkRlYWRMZWZ0Jyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRvZmZzZXQ6IDEzNjIwOCxcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyLFxuXHRcdFx0XHQxLFxuXHRcdFx0XHQzXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMSwwLDAsMCwwLDEsMSwxLDEsMCwxLDEsMSwxLDEsMSwyLDEsMywxLDEsMiwyLDEsMiwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwxLDEsMSwxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMSwxLDEsMSwzLDEsMCwxLDEsMSwxLDMsMywzLDAsMSwxLDEsMSwyLDIsMiwxLDEsMSwxLDEsMiwyLDEsMSwxLDEsMSwxLDEsMSwwLDMsMiwyLDEsMSwyLDEsMiwyLDIsMSwxLDEsMSwxLDEsMiwyLDIsMSwxLDEsMSwxLDEsMiwxLDEsMSwxLDEsMSwxLDEsMSwxLDMsMSwxLDEsMSwxLDEsMywzLDMsMSwxLDEsMywzLDMsMywzLDEsMSwwLDMsMywxLDEsMSwxLDFdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25EZWFkUmlnaHQnLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM2MjcyLFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwyLDEsMCwwLDAsMCwwLDAsMSwxLDEsMCwwLDAsMCwwLDEsMSwyLDEsMCwwLDAsMCwyLDIsMSwyLDEsMCwwLDAsMiwyLDIsMSwyLDEsMCwwLDIsMiwyLDEsMSwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDIsMiwxLDEsMSwxLDAsMCwyLDEsMSwxLDEsMSwxLDAsMSwxLDEsMywxLDEsMSwxLDEsMSwxLDEsMywxLDEsMSwxLDMsMSwxLDEsMywxLDEsMSwzLDEsMywxLDEsMywxLDEsMSwxLDMsMywxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDEsMSwxLDEsMSwwLDAsMywzLDMsMSwzLDMsMSwwLDEsMywzLDMsMywzLDEsMCwxLDMsMywxLDMsMywzLDEsMSwxLDEsMSwzLDMsMywxLDMsMywxLDEsMSwzLDMsMV1cblx0XHR9XG5cdF0sXG5cdHN0YXRlczogW1xuXHRcdHtcblx0XHRcdG5hbWU6ICdpZGxlJyxcblx0XHRcdGhlaWdodDogMzIsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRmcmFtZXM6IFtcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVUb3AnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVCb3R0b20nLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdjcm91Y2gnLFxuXHRcdFx0aGVpZ2h0OiAzMixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdGZyYW1lczogW1xuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSWRsZVRvcCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRnJvbnRMZWcnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEJhY2tMZWcnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MScsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogM1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAzXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnd2FsaycsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDE2LFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlVG9wJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2FsazFUb3AnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsxQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2FsazJUb3AnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsyQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2FsazFUb3AnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsxQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnd2FsayAoZG93biBzdGFpcnMpJyxcblx0XHRcdGhlaWdodDogMzIsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRmcmFtZXM6IFtcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVUb3AnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vblN0YWlyc0RhbWFnZUxlZycsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAzXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2FsazFUb3AnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsxQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnd2FsayAodXAgc3RhaXJzKScsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDE2LFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlVG9wJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25TdGFpcldhbGtVcExlZ3MnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XYWxrMVRvcCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2FsazFCb3R0b20nLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdkZWFkJyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMzIsXG5cdFx0XHRmcmFtZXM6IFtcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkRlYWRMZWZ0Jyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25EZWFkUmlnaHQnLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdodXJ0Jyxcblx0XHRcdGhlaWdodDogMzIsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRmcmFtZXM6IFtcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkRhbWFnZVRvcCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICd3aGlwJyxcblx0XHRcdGhlaWdodDogMzIsXG5cdFx0XHR3aWR0aDogMzIsXG5cdFx0XHRmcmFtZXM6IFtcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AxJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVCb3R0b20nLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25IYW5kJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAxXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSWRsZUJvdHRvbScsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3doaXAgKGR1Y2tpbmcpJyxcblx0XHRcdGhlaWdodDogMzIsXG5cdFx0XHR3aWR0aDogMzIsXG5cdFx0XHRmcmFtZXM6IFtcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AxJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hGcm9udExlZycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkxJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAzXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMicsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRnJvbnRMZWcnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEJhY2tMZWcnLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MScsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogM1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAzXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSGFuZCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDMnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEZyb250TGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTEnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MicsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogM1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3doaXAgKGRvd24gc3RhaXJzKScsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDMyLFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMScsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMicsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25IYW5kJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAxXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICd3aGlwICh1cCBzdGFpcnMpJyxcblx0XHRcdGhlaWdodDogMzIsXG5cdFx0XHR3aWR0aDogMzIsXG5cdFx0XHRmcmFtZXM6IFtcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AxJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25TdGFpcldhbGtVcExlZ3MnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMicsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJXYWxrVXBMZWdzJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSGFuZCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDMnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vblN0YWlyV2Fsa1VwTGVncycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3N1YndlYXBvbiB0aHJvdycsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDI0LFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMScsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSWRsZUJvdHRvbScsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XSxcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AyJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSGFuZCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDMnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVCb3R0b20nLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzdWJ3ZWFwb24gdGhyb3cgKGRvd24gc3RhaXJzKScsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDI0LFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMScsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMicsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25IYW5kJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAxXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzdWJ3ZWFwb24gdGhyb3cgKHVwIHN0YWlycyknLFxuXHRcdFx0aGVpZ2h0OiAzMixcblx0XHRcdHdpZHRoOiAyNCxcblx0XHRcdGZyYW1lczogW1xuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDEnLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vblN0YWlyV2Fsa1VwTGVncycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XSxcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AyJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25TdGFpcldhbGtVcExlZ3MnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25IYW5kJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAxXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJXYWxrVXBMZWdzJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHRdXG5cdFx0fVxuXHRdLFxuXHRjb2xvcnM6IFtcblx0XHR7XG5cdFx0XHRoZXg6ICc3QzdDN0MnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDEyNCxcblx0XHRcdFx0MTI0LFxuXHRcdFx0XHQxMjRcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwMDBGQycsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MCxcblx0XHRcdFx0MjUyXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwQkMnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDE4OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnNDQyOEJDJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQ2OCxcblx0XHRcdFx0NDAsXG5cdFx0XHRcdDE4OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnOTQwMDg0Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQxNDgsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDEzMlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnQTgwMDIwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQxNjgsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDMyXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdBODEwMDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDE2OCxcblx0XHRcdFx0MTYsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzg4MTQwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTM2LFxuXHRcdFx0XHQyMCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnNTAzMDAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQ4MCxcblx0XHRcdFx0NDgsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwNzgwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MTIwLFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDY4MDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDEwNCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDA1ODAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQ4OCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDA0MDU4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQ2NCxcblx0XHRcdFx0ODhcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwMDAwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDAwMDAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQwLFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0JDQkNCQycsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTg4LFxuXHRcdFx0XHQxODgsXG5cdFx0XHRcdDE4OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDA3OEY4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQxMjAsXG5cdFx0XHRcdDI0OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDA1OEY4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQ4OCxcblx0XHRcdFx0MjQ4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICc2ODQ0RkMnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDEwNCxcblx0XHRcdFx0NjgsXG5cdFx0XHRcdDI1MlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRDgwMENDJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyMTYsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIwNFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRTQwMDU4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyMjgsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDg4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGODM4MDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0NTYsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0U0NUMxMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjI4LFxuXHRcdFx0XHQ5Mixcblx0XHRcdFx0MTZcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0FDN0MwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTcyLFxuXHRcdFx0XHQxMjQsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwQjgwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MTg0LFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMEE4MDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDE2OCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDBBODQ0Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQxNjgsXG5cdFx0XHRcdDY4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDg4ODgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDEzNixcblx0XHRcdFx0MTM2XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwMDAwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDAwMDAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQwLFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGOEY4RjgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0MjQ4LFxuXHRcdFx0XHQyNDhcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzNDQkNGQycsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0NjAsXG5cdFx0XHRcdDE4OCxcblx0XHRcdFx0MjUyXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICc2ODg4RkMnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDEwNCxcblx0XHRcdFx0MTM2LFxuXHRcdFx0XHQyNTJcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzk4NzhGOCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTUyLFxuXHRcdFx0XHQxMjAsXG5cdFx0XHRcdDI0OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRjg3OEY4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyNDgsXG5cdFx0XHRcdDEyMCxcblx0XHRcdFx0MjQ4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGODU4OTgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0ODgsXG5cdFx0XHRcdDE1MlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRjg3ODU4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyNDgsXG5cdFx0XHRcdDEyMCxcblx0XHRcdFx0ODhcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0ZDQTA0NCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjUyLFxuXHRcdFx0XHQxNjAsXG5cdFx0XHRcdDY4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGOEI4MDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0MTg0LFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdCOEY4MTgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDE4NCxcblx0XHRcdFx0MjQ4LFxuXHRcdFx0XHQyNFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnNThEODU0Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQ4OCxcblx0XHRcdFx0MjE2LFxuXHRcdFx0XHQ4NFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnNThGODk4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQ4OCxcblx0XHRcdFx0MjQ4LFxuXHRcdFx0XHQxNTJcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwRThEOCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MjMyLFxuXHRcdFx0XHQyMTZcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzc4Nzg3OCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTIwLFxuXHRcdFx0XHQxMjAsXG5cdFx0XHRcdDEyMFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDAwMDAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQwLFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0ZDRkNGQycsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjUyLFxuXHRcdFx0XHQyNTIsXG5cdFx0XHRcdDI1MlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnQTRFNEZDJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQxNjQsXG5cdFx0XHRcdDIyOCxcblx0XHRcdFx0MjUyXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdCOEI4RjgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDE4NCxcblx0XHRcdFx0MTg0LFxuXHRcdFx0XHQyNDhcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0Q4QjhGOCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjE2LFxuXHRcdFx0XHQxODQsXG5cdFx0XHRcdDI0OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRjhCOEY4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyNDgsXG5cdFx0XHRcdDE4NCxcblx0XHRcdFx0MjQ4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGOEE0QzAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0MTY0LFxuXHRcdFx0XHQxOTJcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0YwRDBCMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjQwLFxuXHRcdFx0XHQyMDgsXG5cdFx0XHRcdDE3NlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRkNFMEE4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyNTIsXG5cdFx0XHRcdDIyNCxcblx0XHRcdFx0MTY4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGOEQ4NzgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0MjE2LFxuXHRcdFx0XHQxMjBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0Q4Rjg3OCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjE2LFxuXHRcdFx0XHQyNDgsXG5cdFx0XHRcdDEyMFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnQjhGOEI4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQxODQsXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0MTg0XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdCOEY4RDgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDE4NCxcblx0XHRcdFx0MjQ4LFxuXHRcdFx0XHQyMTZcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwRkNGQycsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MjUyLFxuXHRcdFx0XHQyNTJcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0Q4RDhEOCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjE2LFxuXHRcdFx0XHQyMTYsXG5cdFx0XHRcdDIxNlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDAwMDAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQwLFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9XG5cdF0sXG5cdHBhbGV0dGU6IFtcblx0XHR7XG5cdFx0XHRoZXg6ICcwMEE4MDAnLFxuXHRcdFx0aW5kZXg6IDI2XG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxuXHRcdFx0aW5kZXg6IDE1XG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdBODEwMDAnLFxuXHRcdFx0aW5kZXg6IDZcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0ZDRkNGQycsXG5cdFx0XHRpbmRleDogNDhcblx0XHR9XG5cdF1cbn07XG4iLCJjb25zdCB7IENIUiB9ID0gcmVxdWlyZSgnLi9kYXRhJyk7XG5cbmV4cG9ydHMubG9hZENociA9IGZ1bmN0aW9uIGxvYWRDaHIodGlsZXMsIGNockluZGV4LCBwaXhlbHMsIHpvb20pIHtcblx0Y29uc3QgY2hyRGF0YSA9IENIUltjaHJJbmRleF07XG5cdHBpeGVscy5sZW5ndGggPSAwO1xuXHRjaHJEYXRhLmRhdGEuZm9yRWFjaCgocGFsZXR0ZUluZGV4LCBpbmRleCkgPT4ge1xuXHRcdGNvbnN0IGxheW91dEluZGV4ID0gTWF0aC5mbG9vcihpbmRleCAvIDY0KTtcblx0XHRjb25zdCBsYXlvdXQgPSBjaHJEYXRhLmxheW91dFtsYXlvdXRJbmRleF07XG5cdFx0cGl4ZWxzLnB1c2goe1xuXHRcdFx0eDogKChpbmRleCAlIDgpICsgKGxheW91dCA+PSAyID8gOCA6IDApKSAqIHpvb20sXG5cdFx0XHR5OiAoKE1hdGguZmxvb3IoKGluZGV4ICUgNjQpIC8gOCkpICsgKGxheW91dCAlIDIgPT09IDEgPyA4IDogMCkpICogem9vbSxcblx0XHRcdHBhbGV0dGVJbmRleDogdGlsZXMgPyB0aWxlcy5waXhlbHNbY2hySW5kZXhdW2luZGV4XS5wYWxldHRlSW5kZXggOiBwYWxldHRlSW5kZXhcblx0XHR9KTtcblx0fSk7XG5cdHJldHVybiBjaHJEYXRhO1xufTtcblxuZXhwb3J0cy5yZXNpemVDYW52YXMgPSBmdW5jdGlvbiByZXNpemVDYW52YXMoY2FudmFzLCB3aWR0aCwgaGVpZ2h0LCB6b29tKSB7XG5cdGNvbnN0ICRjYW52YXM9ICQoY2FudmFzKTtcblx0dGhpcy56b29tID0gem9vbTtcblx0dGhpcy53aWR0aCA9IHdpZHRoO1xuXHR0aGlzLmhlaWdodCA9IGhlaWdodDtcblx0JGNhbnZhcy5hdHRyKCdoZWlnaHQnLCBoZWlnaHQgKiB6b29tKTtcblx0JGNhbnZhcy5hdHRyKCd3aWR0aCcsIHdpZHRoICogem9vbSk7XG5cdCRjYW52YXMuY3NzKHtcblx0XHR3aWR0aDogd2lkdGggKiB6b29tLFxuXHRcdGhlaWdodDogaGVpZ2h0ICogem9vbVxuXHR9KTtcbn07XG5cbmV4cG9ydHMuZ2V0UGFsZXR0ZUluZGV4ID0gZnVuY3Rpb24gZ2V0UGFsZXR0ZUluZGV4KCkge1xuXHRyZXR1cm4gcGFyc2VJbnQoJCgnLnBhbGV0dGUtYnV0dG9uLXNlbGVjdGVkJykuZmlyc3QoKS5kYXRhKCdwaScpLCAxMCk7XG59O1xuXG5leHBvcnRzLnJnYjJoZXggPSBmdW5jdGlvbiByZ2IyaGV4KHJnYil7XG5cdHJnYiA9IHJnYi5tYXRjaCgvXnJnYlxcKChcXGQrKSxcXHMqKFxcZCspLFxccyooXFxkKylcXCkkLyk7XG5cdHJldHVybiAoJzAnICsgcGFyc2VJbnQocmdiWzFdLDEwKS50b1N0cmluZygxNikpLnNsaWNlKC0yKSArXG5cdFx0KCcwJyArIHBhcnNlSW50KHJnYlsyXSwxMCkudG9TdHJpbmcoMTYpKS5zbGljZSgtMikgK1xuXHRcdCgnMCcgKyBwYXJzZUludChyZ2JbM10sMTApLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTIpO1xufTsiXX0=
