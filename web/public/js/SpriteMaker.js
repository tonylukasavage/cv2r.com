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
		canvas.addEventListener('mouseout', () => this.mousedown = false);
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
		if (x < 0 || x > chrData.width * this.zoom) { return; }
		if (y < 0 || y > chrData.height * this.zoom) { return; }
		
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
		console.log({x, y, pixelIndex });
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

const template = `
<div class="palette-button">
	<div class="palette-button-corner">
		<div class="palette-button-index">1</div>
	</div>
</div>
`;

class Palette {
	constructor() {
		palette.forEach((p, index) => {
			const button = $(template);
			if (index === 0) {
				button.addClass('palette-button-selected');
			}
			button.css('background-color', '#' + p.hex);
			button.data('pi', index);
			button.find('.palette-button-index').text(index === 0 ? 'X' : index);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsInNyYy9zcHJpdGUtbWFrZXIvQ29sb3JQaWNrZXIuanMiLCJzcmMvc3ByaXRlLW1ha2VyL0VkaXRvci5qcyIsInNyYy9zcHJpdGUtbWFrZXIvUGFsZXR0ZS5qcyIsInNyYy9zcHJpdGUtbWFrZXIvU3ByaXRlTWFrZXIuanMiLCJzcmMvc3ByaXRlLW1ha2VyL1N0YXRlcy5qcyIsInNyYy9zcHJpdGUtbWFrZXIvVGlsZXMuanMiLCJzcmMvc3ByaXRlLW1ha2VyL2RhdGEuanMiLCJzcmMvc3ByaXRlLW1ha2VyL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzZ0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaDZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgb2JqZWN0Q3JlYXRlID0gT2JqZWN0LmNyZWF0ZSB8fCBvYmplY3RDcmVhdGVQb2x5ZmlsbFxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBvYmplY3RLZXlzUG9seWZpbGxcbnZhciBiaW5kID0gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgfHwgZnVuY3Rpb25CaW5kUG9seWZpbGxcblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMsICdfZXZlbnRzJykpIHtcbiAgICB0aGlzLl9ldmVudHMgPSBvYmplY3RDcmVhdGUobnVsbCk7XG4gICAgdGhpcy5fZXZlbnRzQ291bnQgPSAwO1xuICB9XG5cbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxudmFyIGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxudmFyIGhhc0RlZmluZVByb3BlcnR5O1xudHJ5IHtcbiAgdmFyIG8gPSB7fTtcbiAgaWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sICd4JywgeyB2YWx1ZTogMCB9KTtcbiAgaGFzRGVmaW5lUHJvcGVydHkgPSBvLnggPT09IDA7XG59IGNhdGNoIChlcnIpIHsgaGFzRGVmaW5lUHJvcGVydHkgPSBmYWxzZSB9XG5pZiAoaGFzRGVmaW5lUHJvcGVydHkpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEV2ZW50RW1pdHRlciwgJ2RlZmF1bHRNYXhMaXN0ZW5lcnMnLCB7XG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKGFyZykge1xuICAgICAgLy8gY2hlY2sgd2hldGhlciB0aGUgaW5wdXQgaXMgYSBwb3NpdGl2ZSBudW1iZXIgKHdob3NlIHZhbHVlIGlzIHplcm8gb3JcbiAgICAgIC8vIGdyZWF0ZXIgYW5kIG5vdCBhIE5hTikuXG4gICAgICBpZiAodHlwZW9mIGFyZyAhPT0gJ251bWJlcicgfHwgYXJnIDwgMCB8fCBhcmcgIT09IGFyZylcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJkZWZhdWx0TWF4TGlzdGVuZXJzXCIgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICAgICAgZGVmYXVsdE1heExpc3RlbmVycyA9IGFyZztcbiAgICB9XG4gIH0pO1xufSBlbHNlIHtcbiAgRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSBkZWZhdWx0TWF4TGlzdGVuZXJzO1xufVxuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbiBzZXRNYXhMaXN0ZW5lcnMobikge1xuICBpZiAodHlwZW9mIG4gIT09ICdudW1iZXInIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiblwiIGFyZ3VtZW50IG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5mdW5jdGlvbiAkZ2V0TWF4TGlzdGVuZXJzKHRoYXQpIHtcbiAgaWYgKHRoYXQuX21heExpc3RlbmVycyA9PT0gdW5kZWZpbmVkKVxuICAgIHJldHVybiBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgcmV0dXJuIHRoYXQuX21heExpc3RlbmVycztcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5nZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbiBnZXRNYXhMaXN0ZW5lcnMoKSB7XG4gIHJldHVybiAkZ2V0TWF4TGlzdGVuZXJzKHRoaXMpO1xufTtcblxuLy8gVGhlc2Ugc3RhbmRhbG9uZSBlbWl0KiBmdW5jdGlvbnMgYXJlIHVzZWQgdG8gb3B0aW1pemUgY2FsbGluZyBvZiBldmVudFxuLy8gaGFuZGxlcnMgZm9yIGZhc3QgY2FzZXMgYmVjYXVzZSBlbWl0KCkgaXRzZWxmIG9mdGVuIGhhcyBhIHZhcmlhYmxlIG51bWJlciBvZlxuLy8gYXJndW1lbnRzIGFuZCBjYW4gYmUgZGVvcHRpbWl6ZWQgYmVjYXVzZSBvZiB0aGF0LiBUaGVzZSBmdW5jdGlvbnMgYWx3YXlzIGhhdmVcbi8vIHRoZSBzYW1lIG51bWJlciBvZiBhcmd1bWVudHMgYW5kIHRodXMgZG8gbm90IGdldCBkZW9wdGltaXplZCwgc28gdGhlIGNvZGVcbi8vIGluc2lkZSB0aGVtIGNhbiBleGVjdXRlIGZhc3Rlci5cbmZ1bmN0aW9uIGVtaXROb25lKGhhbmRsZXIsIGlzRm4sIHNlbGYpIHtcbiAgaWYgKGlzRm4pXG4gICAgaGFuZGxlci5jYWxsKHNlbGYpO1xuICBlbHNlIHtcbiAgICB2YXIgbGVuID0gaGFuZGxlci5sZW5ndGg7XG4gICAgdmFyIGxpc3RlbmVycyA9IGFycmF5Q2xvbmUoaGFuZGxlciwgbGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgbGlzdGVuZXJzW2ldLmNhbGwoc2VsZik7XG4gIH1cbn1cbmZ1bmN0aW9uIGVtaXRPbmUoaGFuZGxlciwgaXNGbiwgc2VsZiwgYXJnMSkge1xuICBpZiAoaXNGbilcbiAgICBoYW5kbGVyLmNhbGwoc2VsZiwgYXJnMSk7XG4gIGVsc2Uge1xuICAgIHZhciBsZW4gPSBoYW5kbGVyLmxlbmd0aDtcbiAgICB2YXIgbGlzdGVuZXJzID0gYXJyYXlDbG9uZShoYW5kbGVyLCBsZW4pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpXG4gICAgICBsaXN0ZW5lcnNbaV0uY2FsbChzZWxmLCBhcmcxKTtcbiAgfVxufVxuZnVuY3Rpb24gZW1pdFR3byhoYW5kbGVyLCBpc0ZuLCBzZWxmLCBhcmcxLCBhcmcyKSB7XG4gIGlmIChpc0ZuKVxuICAgIGhhbmRsZXIuY2FsbChzZWxmLCBhcmcxLCBhcmcyKTtcbiAgZWxzZSB7XG4gICAgdmFyIGxlbiA9IGhhbmRsZXIubGVuZ3RoO1xuICAgIHZhciBsaXN0ZW5lcnMgPSBhcnJheUNsb25lKGhhbmRsZXIsIGxlbik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSlcbiAgICAgIGxpc3RlbmVyc1tpXS5jYWxsKHNlbGYsIGFyZzEsIGFyZzIpO1xuICB9XG59XG5mdW5jdGlvbiBlbWl0VGhyZWUoaGFuZGxlciwgaXNGbiwgc2VsZiwgYXJnMSwgYXJnMiwgYXJnMykge1xuICBpZiAoaXNGbilcbiAgICBoYW5kbGVyLmNhbGwoc2VsZiwgYXJnMSwgYXJnMiwgYXJnMyk7XG4gIGVsc2Uge1xuICAgIHZhciBsZW4gPSBoYW5kbGVyLmxlbmd0aDtcbiAgICB2YXIgbGlzdGVuZXJzID0gYXJyYXlDbG9uZShoYW5kbGVyLCBsZW4pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpXG4gICAgICBsaXN0ZW5lcnNbaV0uY2FsbChzZWxmLCBhcmcxLCBhcmcyLCBhcmczKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBlbWl0TWFueShoYW5kbGVyLCBpc0ZuLCBzZWxmLCBhcmdzKSB7XG4gIGlmIChpc0ZuKVxuICAgIGhhbmRsZXIuYXBwbHkoc2VsZiwgYXJncyk7XG4gIGVsc2Uge1xuICAgIHZhciBsZW4gPSBoYW5kbGVyLmxlbmd0aDtcbiAgICB2YXIgbGlzdGVuZXJzID0gYXJyYXlDbG9uZShoYW5kbGVyLCBsZW4pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkoc2VsZiwgYXJncyk7XG4gIH1cbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gZW1pdCh0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBldmVudHM7XG4gIHZhciBkb0Vycm9yID0gKHR5cGUgPT09ICdlcnJvcicpO1xuXG4gIGV2ZW50cyA9IHRoaXMuX2V2ZW50cztcbiAgaWYgKGV2ZW50cylcbiAgICBkb0Vycm9yID0gKGRvRXJyb3IgJiYgZXZlbnRzLmVycm9yID09IG51bGwpO1xuICBlbHNlIGlmICghZG9FcnJvcilcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAoZG9FcnJvcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSlcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQXQgbGVhc3QgZ2l2ZSBzb21lIGtpbmQgb2YgY29udGV4dCB0byB0aGUgdXNlclxuICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcignVW5oYW5kbGVkIFwiZXJyb3JcIiBldmVudC4gKCcgKyBlciArICcpJyk7XG4gICAgICBlcnIuY29udGV4dCA9IGVyO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBoYW5kbGVyID0gZXZlbnRzW3R5cGVdO1xuXG4gIGlmICghaGFuZGxlcilcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIGlzRm4gPSB0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJztcbiAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgc3dpdGNoIChsZW4pIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICBjYXNlIDE6XG4gICAgICBlbWl0Tm9uZShoYW5kbGVyLCBpc0ZuLCB0aGlzKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMjpcbiAgICAgIGVtaXRPbmUoaGFuZGxlciwgaXNGbiwgdGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMzpcbiAgICAgIGVtaXRUd28oaGFuZGxlciwgaXNGbiwgdGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSA0OlxuICAgICAgZW1pdFRocmVlKGhhbmRsZXIsIGlzRm4sIHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdLCBhcmd1bWVudHNbM10pO1xuICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICBkZWZhdWx0OlxuICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICBlbWl0TWFueShoYW5kbGVyLCBpc0ZuLCB0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuZnVuY3Rpb24gX2FkZExpc3RlbmVyKHRhcmdldCwgdHlwZSwgbGlzdGVuZXIsIHByZXBlbmQpIHtcbiAgdmFyIG07XG4gIHZhciBldmVudHM7XG4gIHZhciBleGlzdGluZztcblxuICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBldmVudHMgPSB0YXJnZXQuX2V2ZW50cztcbiAgaWYgKCFldmVudHMpIHtcbiAgICBldmVudHMgPSB0YXJnZXQuX2V2ZW50cyA9IG9iamVjdENyZWF0ZShudWxsKTtcbiAgICB0YXJnZXQuX2V2ZW50c0NvdW50ID0gMDtcbiAgfSBlbHNlIHtcbiAgICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAgIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgICBpZiAoZXZlbnRzLm5ld0xpc3RlbmVyKSB7XG4gICAgICB0YXJnZXQuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyID8gbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgICAgIC8vIFJlLWFzc2lnbiBgZXZlbnRzYCBiZWNhdXNlIGEgbmV3TGlzdGVuZXIgaGFuZGxlciBjb3VsZCBoYXZlIGNhdXNlZCB0aGVcbiAgICAgIC8vIHRoaXMuX2V2ZW50cyB0byBiZSBhc3NpZ25lZCB0byBhIG5ldyBvYmplY3RcbiAgICAgIGV2ZW50cyA9IHRhcmdldC5fZXZlbnRzO1xuICAgIH1cbiAgICBleGlzdGluZyA9IGV2ZW50c1t0eXBlXTtcbiAgfVxuXG4gIGlmICghZXhpc3RpbmcpIHtcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICBleGlzdGluZyA9IGV2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICAgICsrdGFyZ2V0Ll9ldmVudHNDb3VudDtcbiAgfSBlbHNlIHtcbiAgICBpZiAodHlwZW9mIGV4aXN0aW5nID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICAgIGV4aXN0aW5nID0gZXZlbnRzW3R5cGVdID1cbiAgICAgICAgICBwcmVwZW5kID8gW2xpc3RlbmVyLCBleGlzdGluZ10gOiBbZXhpc3RpbmcsIGxpc3RlbmVyXTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgICAgaWYgKHByZXBlbmQpIHtcbiAgICAgICAgZXhpc3RpbmcudW5zaGlmdChsaXN0ZW5lcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBleGlzdGluZy5wdXNoKGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICAgIGlmICghZXhpc3Rpbmcud2FybmVkKSB7XG4gICAgICBtID0gJGdldE1heExpc3RlbmVycyh0YXJnZXQpO1xuICAgICAgaWYgKG0gJiYgbSA+IDAgJiYgZXhpc3RpbmcubGVuZ3RoID4gbSkge1xuICAgICAgICBleGlzdGluZy53YXJuZWQgPSB0cnVlO1xuICAgICAgICB2YXIgdyA9IG5ldyBFcnJvcignUG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSBsZWFrIGRldGVjdGVkLiAnICtcbiAgICAgICAgICAgIGV4aXN0aW5nLmxlbmd0aCArICcgXCInICsgU3RyaW5nKHR5cGUpICsgJ1wiIGxpc3RlbmVycyAnICtcbiAgICAgICAgICAgICdhZGRlZC4gVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gJyArXG4gICAgICAgICAgICAnaW5jcmVhc2UgbGltaXQuJyk7XG4gICAgICAgIHcubmFtZSA9ICdNYXhMaXN0ZW5lcnNFeGNlZWRlZFdhcm5pbmcnO1xuICAgICAgICB3LmVtaXR0ZXIgPSB0YXJnZXQ7XG4gICAgICAgIHcudHlwZSA9IHR5cGU7XG4gICAgICAgIHcuY291bnQgPSBleGlzdGluZy5sZW5ndGg7XG4gICAgICAgIGlmICh0eXBlb2YgY29uc29sZSA9PT0gJ29iamVjdCcgJiYgY29uc29sZS53YXJuKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKCclczogJXMnLCB3Lm5hbWUsIHcubWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGFyZ2V0O1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24gYWRkTGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpIHtcbiAgcmV0dXJuIF9hZGRMaXN0ZW5lcih0aGlzLCB0eXBlLCBsaXN0ZW5lciwgZmFsc2UpO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZExpc3RlbmVyID1cbiAgICBmdW5jdGlvbiBwcmVwZW5kTGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpIHtcbiAgICAgIHJldHVybiBfYWRkTGlzdGVuZXIodGhpcywgdHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICAgIH07XG5cbmZ1bmN0aW9uIG9uY2VXcmFwcGVyKCkge1xuICBpZiAoIXRoaXMuZmlyZWQpIHtcbiAgICB0aGlzLnRhcmdldC5yZW1vdmVMaXN0ZW5lcih0aGlzLnR5cGUsIHRoaXMud3JhcEZuKTtcbiAgICB0aGlzLmZpcmVkID0gdHJ1ZTtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgcmV0dXJuIHRoaXMubGlzdGVuZXIuY2FsbCh0aGlzLnRhcmdldCk7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHJldHVybiB0aGlzLmxpc3RlbmVyLmNhbGwodGhpcy50YXJnZXQsIGFyZ3VtZW50c1swXSk7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHJldHVybiB0aGlzLmxpc3RlbmVyLmNhbGwodGhpcy50YXJnZXQsIGFyZ3VtZW50c1swXSwgYXJndW1lbnRzWzFdKTtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgcmV0dXJuIHRoaXMubGlzdGVuZXIuY2FsbCh0aGlzLnRhcmdldCwgYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0sXG4gICAgICAgICAgICBhcmd1bWVudHNbMl0pO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7ICsraSlcbiAgICAgICAgICBhcmdzW2ldID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB0aGlzLmxpc3RlbmVyLmFwcGx5KHRoaXMudGFyZ2V0LCBhcmdzKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gX29uY2VXcmFwKHRhcmdldCwgdHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIHN0YXRlID0geyBmaXJlZDogZmFsc2UsIHdyYXBGbjogdW5kZWZpbmVkLCB0YXJnZXQ6IHRhcmdldCwgdHlwZTogdHlwZSwgbGlzdGVuZXI6IGxpc3RlbmVyIH07XG4gIHZhciB3cmFwcGVkID0gYmluZC5jYWxsKG9uY2VXcmFwcGVyLCBzdGF0ZSk7XG4gIHdyYXBwZWQubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgc3RhdGUud3JhcEZuID0gd3JhcHBlZDtcbiAgcmV0dXJuIHdyYXBwZWQ7XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uIG9uY2UodHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJylcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RlbmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gIHRoaXMub24odHlwZSwgX29uY2VXcmFwKHRoaXMsIHR5cGUsIGxpc3RlbmVyKSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kT25jZUxpc3RlbmVyID1cbiAgICBmdW5jdGlvbiBwcmVwZW5kT25jZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RlbmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICB0aGlzLnByZXBlbmRMaXN0ZW5lcih0eXBlLCBfb25jZVdyYXAodGhpcywgdHlwZSwgbGlzdGVuZXIpKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbi8vIEVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZiBhbmQgb25seSBpZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID1cbiAgICBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgICAgdmFyIGxpc3QsIGV2ZW50cywgcG9zaXRpb24sIGksIG9yaWdpbmFsTGlzdGVuZXI7XG5cbiAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICAgICAgZXZlbnRzID0gdGhpcy5fZXZlbnRzO1xuICAgICAgaWYgKCFldmVudHMpXG4gICAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgICBsaXN0ID0gZXZlbnRzW3R5cGVdO1xuICAgICAgaWYgKCFsaXN0KVxuICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8IGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB7XG4gICAgICAgIGlmICgtLXRoaXMuX2V2ZW50c0NvdW50ID09PSAwKVxuICAgICAgICAgIHRoaXMuX2V2ZW50cyA9IG9iamVjdENyZWF0ZShudWxsKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIGV2ZW50c1t0eXBlXTtcbiAgICAgICAgICBpZiAoZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3QubGlzdGVuZXIgfHwgbGlzdGVuZXIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBsaXN0ICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHBvc2l0aW9uID0gLTE7XG5cbiAgICAgICAgZm9yIChpID0gbGlzdC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fCBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikge1xuICAgICAgICAgICAgb3JpZ2luYWxMaXN0ZW5lciA9IGxpc3RbaV0ubGlzdGVuZXI7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgICAgIGlmIChwb3NpdGlvbiA9PT0gMClcbiAgICAgICAgICBsaXN0LnNoaWZ0KCk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzcGxpY2VPbmUobGlzdCwgcG9zaXRpb24pO1xuXG4gICAgICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSlcbiAgICAgICAgICBldmVudHNbdHlwZV0gPSBsaXN0WzBdO1xuXG4gICAgICAgIGlmIChldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIG9yaWdpbmFsTGlzdGVuZXIgfHwgbGlzdGVuZXIpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9XG4gICAgZnVuY3Rpb24gcmVtb3ZlQWxsTGlzdGVuZXJzKHR5cGUpIHtcbiAgICAgIHZhciBsaXN0ZW5lcnMsIGV2ZW50cywgaTtcblxuICAgICAgZXZlbnRzID0gdGhpcy5fZXZlbnRzO1xuICAgICAgaWYgKCFldmVudHMpXG4gICAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gICAgICBpZiAoIWV2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMuX2V2ZW50cyA9IG9iamVjdENyZWF0ZShudWxsKTtcbiAgICAgICAgICB0aGlzLl9ldmVudHNDb3VudCA9IDA7XG4gICAgICAgIH0gZWxzZSBpZiAoZXZlbnRzW3R5cGVdKSB7XG4gICAgICAgICAgaWYgKC0tdGhpcy5fZXZlbnRzQ291bnQgPT09IDApXG4gICAgICAgICAgICB0aGlzLl9ldmVudHMgPSBvYmplY3RDcmVhdGUobnVsbCk7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgZGVsZXRlIGV2ZW50c1t0eXBlXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIga2V5cyA9IG9iamVjdEtleXMoZXZlbnRzKTtcbiAgICAgICAgdmFyIGtleTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgICAgIHRoaXMuX2V2ZW50cyA9IG9iamVjdENyZWF0ZShudWxsKTtcbiAgICAgICAgdGhpcy5fZXZlbnRzQ291bnQgPSAwO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgbGlzdGVuZXJzID0gZXZlbnRzW3R5cGVdO1xuXG4gICAgICBpZiAodHlwZW9mIGxpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gICAgICB9IGVsc2UgaWYgKGxpc3RlbmVycykge1xuICAgICAgICAvLyBMSUZPIG9yZGVyXG4gICAgICAgIGZvciAoaSA9IGxpc3RlbmVycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG5mdW5jdGlvbiBfbGlzdGVuZXJzKHRhcmdldCwgdHlwZSwgdW53cmFwKSB7XG4gIHZhciBldmVudHMgPSB0YXJnZXQuX2V2ZW50cztcblxuICBpZiAoIWV2ZW50cylcbiAgICByZXR1cm4gW107XG5cbiAgdmFyIGV2bGlzdGVuZXIgPSBldmVudHNbdHlwZV07XG4gIGlmICghZXZsaXN0ZW5lcilcbiAgICByZXR1cm4gW107XG5cbiAgaWYgKHR5cGVvZiBldmxpc3RlbmVyID09PSAnZnVuY3Rpb24nKVxuICAgIHJldHVybiB1bndyYXAgPyBbZXZsaXN0ZW5lci5saXN0ZW5lciB8fCBldmxpc3RlbmVyXSA6IFtldmxpc3RlbmVyXTtcblxuICByZXR1cm4gdW53cmFwID8gdW53cmFwTGlzdGVuZXJzKGV2bGlzdGVuZXIpIDogYXJyYXlDbG9uZShldmxpc3RlbmVyLCBldmxpc3RlbmVyLmxlbmd0aCk7XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24gbGlzdGVuZXJzKHR5cGUpIHtcbiAgcmV0dXJuIF9saXN0ZW5lcnModGhpcywgdHlwZSwgdHJ1ZSk7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJhd0xpc3RlbmVycyA9IGZ1bmN0aW9uIHJhd0xpc3RlbmVycyh0eXBlKSB7XG4gIHJldHVybiBfbGlzdGVuZXJzKHRoaXMsIHR5cGUsIGZhbHNlKTtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICBpZiAodHlwZW9mIGVtaXR0ZXIubGlzdGVuZXJDb3VudCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBlbWl0dGVyLmxpc3RlbmVyQ291bnQodHlwZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGxpc3RlbmVyQ291bnQuY2FsbChlbWl0dGVyLCB0eXBlKTtcbiAgfVxufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lckNvdW50ID0gbGlzdGVuZXJDb3VudDtcbmZ1bmN0aW9uIGxpc3RlbmVyQ291bnQodHlwZSkge1xuICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzO1xuXG4gIGlmIChldmVudHMpIHtcbiAgICB2YXIgZXZsaXN0ZW5lciA9IGV2ZW50c1t0eXBlXTtcblxuICAgIGlmICh0eXBlb2YgZXZsaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmIChldmxpc3RlbmVyKSB7XG4gICAgICByZXR1cm4gZXZsaXN0ZW5lci5sZW5ndGg7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIDA7XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnROYW1lcyA9IGZ1bmN0aW9uIGV2ZW50TmFtZXMoKSB7XG4gIHJldHVybiB0aGlzLl9ldmVudHNDb3VudCA+IDAgPyBSZWZsZWN0Lm93bktleXModGhpcy5fZXZlbnRzKSA6IFtdO1xufTtcblxuLy8gQWJvdXQgMS41eCBmYXN0ZXIgdGhhbiB0aGUgdHdvLWFyZyB2ZXJzaW9uIG9mIEFycmF5I3NwbGljZSgpLlxuZnVuY3Rpb24gc3BsaWNlT25lKGxpc3QsIGluZGV4KSB7XG4gIGZvciAodmFyIGkgPSBpbmRleCwgayA9IGkgKyAxLCBuID0gbGlzdC5sZW5ndGg7IGsgPCBuOyBpICs9IDEsIGsgKz0gMSlcbiAgICBsaXN0W2ldID0gbGlzdFtrXTtcbiAgbGlzdC5wb3AoKTtcbn1cblxuZnVuY3Rpb24gYXJyYXlDbG9uZShhcnIsIG4pIHtcbiAgdmFyIGNvcHkgPSBuZXcgQXJyYXkobik7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgKytpKVxuICAgIGNvcHlbaV0gPSBhcnJbaV07XG4gIHJldHVybiBjb3B5O1xufVxuXG5mdW5jdGlvbiB1bndyYXBMaXN0ZW5lcnMoYXJyKSB7XG4gIHZhciByZXQgPSBuZXcgQXJyYXkoYXJyLmxlbmd0aCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcmV0Lmxlbmd0aDsgKytpKSB7XG4gICAgcmV0W2ldID0gYXJyW2ldLmxpc3RlbmVyIHx8IGFycltpXTtcbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBvYmplY3RDcmVhdGVQb2x5ZmlsbChwcm90bykge1xuICB2YXIgRiA9IGZ1bmN0aW9uKCkge307XG4gIEYucHJvdG90eXBlID0gcHJvdG87XG4gIHJldHVybiBuZXcgRjtcbn1cbmZ1bmN0aW9uIG9iamVjdEtleXNQb2x5ZmlsbChvYmopIHtcbiAgdmFyIGtleXMgPSBbXTtcbiAgZm9yICh2YXIgayBpbiBvYmopIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrKSkge1xuICAgIGtleXMucHVzaChrKTtcbiAgfVxuICByZXR1cm4gaztcbn1cbmZ1bmN0aW9uIGZ1bmN0aW9uQmluZFBvbHlmaWxsKGNvbnRleHQpIHtcbiAgdmFyIGZuID0gdGhpcztcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZm4uYXBwbHkoY29udGV4dCwgYXJndW1lbnRzKTtcbiAgfTtcbn1cbiIsImNvbnN0IEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpO1xuY29uc3QgeyBjb2xvcnMsIHBhbGV0dGUgfSA9IHJlcXVpcmUoJy4vZGF0YScpO1xuY29uc3QgeyByZ2IyaGV4IH0gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbmNsYXNzIENvbG9yUGlja2VyIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHRjb25zdCBzZWxmID0gdGhpcztcblx0XHRjb2xvcnMuZm9yRWFjaCgoY29sb3IsIGluZGV4KSA9PiB7XG5cdFx0XHR2YXIgcm93SW5kZXggPSBNYXRoLmZsb29yKGluZGV4IC8gMTYpO1xuXHRcdFx0dmFyIGJ1dHRvbiA9ICQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJykpO1xuXHRcdFx0YnV0dG9uLmRhdGEoJ3BpJywgaW5kZXgpO1xuXHRcdFx0YnV0dG9uLmFkZENsYXNzKCdwaWNrZXItYnV0dG9uJyk7XG5cdFx0XHRidXR0b24uY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJyMnICsgY29sb3IuaGV4KTtcblx0XHRcdCQoJyNjcC1yb3ctJyArIChyb3dJbmRleCArIDEpKS5hcHBlbmQoYnV0dG9uKTtcblxuXHRcdFx0YnV0dG9uLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcGFsZXR0ZUJ1dHRvbiA9ICQoJy5wYWxldHRlLWJ1dHRvbi1zZWxlY3RlZCcpLmZpcnN0KCk7XG5cdFx0XHRcdHZhciBiZ2MgPSAkKHRoaXMpLmNzcygnYmFja2dyb3VuZC1jb2xvcicpO1xuXHRcdFx0XHRpZiAoYmdjLmluZGV4T2YoJ3JnYicpID09PSAwKSB7XG5cdFx0XHRcdFx0YmdjID0gcmdiMmhleChiZ2MpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBwYWxldHRlSW5kZXggPSBwYXJzZUludChwYWxldHRlQnV0dG9uLmRhdGEoJ3BpJyksIDEwKTtcblx0XHRcdFx0cGFsZXR0ZUJ1dHRvbi5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAnIycgKyBiZ2MpO1xuXHRcdFx0XHRwYWxldHRlW3BhbGV0dGVJbmRleF0uaGV4ID0gYmdjO1xuXHRcdFx0XHRwYWxldHRlW3BhbGV0dGVJbmRleF0uaW5kZXggPSBwYXJzZUludCgkKHRoaXMpLmF0dHIoJ2RhdGEtcGknKSwgMTApO1xuXG5cdFx0XHRcdHNlbGYuZW1pdCgndXBkYXRlJyk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9yUGlja2VyOyIsImNvbnN0IEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpO1xuY29uc3QgeyBDSFIsIHBhbGV0dGUgfSA9IHJlcXVpcmUoJy4vZGF0YScpO1xuY29uc3QgeyBnZXRQYWxldHRlSW5kZXgsIGxvYWRDaHIsIHJlc2l6ZUNhbnZhcyB9ID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5jbGFzcyBFZGl0b3IgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuY2hySW5kZXggPSAwO1xuXHRcdHRoaXMuem9vbSA9IDE2O1xuXHRcdHRoaXMubW91c2Vkb3duID0gZmFsc2U7XG5cdFx0dGhpcy5waXhlbHMgPSBbXTtcblxuXHRcdC8vIGNyZWF0ZSBjYW52YXMgZm9yIGVkaXRvclxuXHRcdGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdGNhbnZhcy5jbGFzc05hbWUgPSAnZWRpdG9yLWNhbnZhcyc7XG5cdFx0Y2FudmFzLmlkID0gJ2VkaXRvci1jYW52YXMnO1xuXHRcdCQoJyNlZGl0b3ItY29udGFpbmVyJykuYXBwZW5kKGNhbnZhcyk7XG5cdFx0dGhpcy5jYW52YXMgPSBjYW52YXM7XG5cdFx0dGhpcy5jdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuXHRcdC8vIGFkZCBkcmF3aW5nIGV2ZW50cyBmb3IgZWRpdG9yIGNhbnZhc1xuXHRcdGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuZHJhd1BpeGVsLmJpbmQodGhpcyksIGZhbHNlKTtcblx0XHRjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsICgpID0+IHRoaXMubW91c2Vkb3duID0gZmFsc2UpO1xuXHRcdGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsICgpID0+IHRoaXMubW91c2Vkb3duID0gZmFsc2UpO1xuXHRcdGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBldiA9PiB7XG5cdFx0XHR0aGlzLm1vdXNlZG93biA9IHRydWU7XG5cdFx0XHR0aGlzLmRyYXdQaXhlbChldik7XG5cdFx0fSk7XG5cdFx0Y2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGV2ID0+IHtcblx0XHRcdGlmICh0aGlzLm1vdXNlZG93bikge1xuXHRcdFx0XHR0aGlzLmRyYXdQaXhlbChldik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyBsb2FkIGRlZmF1bHQgQ0hSIGRhdGEgaW50byBlZGl0b3IgYW5kIGRyYXdcblx0XHR0aGlzLnVwZGF0ZUNocihudWxsLCB0aGlzLmNockluZGV4KTtcblx0fVxuXG5cdGRyYXcoKSB7XG5cdFx0Y29uc3QgeyBjdHgsIHpvb20gfSA9IHRoaXM7XG5cdFx0dGhpcy5waXhlbHMuZm9yRWFjaChwID0+IHtcblx0XHRcdGN0eC5maWxsU3R5bGUgPSAnIycgKyBwYWxldHRlW3AucGFsZXR0ZUluZGV4XS5oZXg7XG5cdFx0XHRjdHguZmlsbFJlY3QocC54LCBwLnksIHpvb20sIHpvb20pO1xuXHRcdH0pO1xuXHRcdHRoaXMuZ3JpZC5kcmF3KCk7XG5cdFx0dGhpcy5kaXZpZGVycy5kcmF3KCk7XG5cdH1cblxuXHRkcmF3UGl4ZWwoZXYpIHtcblx0XHRjb25zdCB7IGNockluZGV4IH0gPSB0aGlzO1xuXHRcdGNvbnN0IGNockRhdGEgPSBDSFJbdGhpcy5jaHJJbmRleF07XG5cdFx0Y29uc3QgcmVjdCA9IHRoaXMuY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXHRcdGNvbnN0IHggPSBldi5jbGllbnRYIC0gcmVjdC5sZWZ0O1xuXHRcdGNvbnN0IHkgPSBldi5jbGllbnRZIC0gcmVjdC50b3A7XG5cdFx0aWYgKHggPCAwIHx8IHggPiBjaHJEYXRhLndpZHRoICogdGhpcy56b29tKSB7IHJldHVybjsgfVxuXHRcdGlmICh5IDwgMCB8fCB5ID4gY2hyRGF0YS5oZWlnaHQgKiB0aGlzLnpvb20pIHsgcmV0dXJuOyB9XG5cdFx0XG5cdFx0Y29uc3QgeFNjYWxlID0gTWF0aC5mbG9vcih4IC8gdGhpcy56b29tKTtcblx0XHRjb25zdCB5U2NhbGUgPSBNYXRoLmZsb29yKHkgLyB0aGlzLnpvb20pO1xuXHRcdGxldCBwaXhlbEluZGV4ID0gKHlTY2FsZSAqIGNockRhdGEud2lkdGgpICsgeFNjYWxlO1xuXG5cdFx0aWYgKGNockRhdGEud2lkdGggPiA4KSB7XG5cdFx0XHRsZXQgb2Zmc2V0ID0gMDtcblx0XHRcdGlmICh4U2NhbGUgPj0gY2hyRGF0YS53aWR0aCAvIDIpIHsgb2Zmc2V0Kys7IH1cblx0XHRcdGlmICh5U2NhbGUgPj0gY2hyRGF0YS5oZWlnaHQgLyAyKSB7IG9mZnNldCsrOyB9XG5cdFx0XHRwaXhlbEluZGV4ID0gKDY0ICogb2Zmc2V0KSArICh5U2NhbGUgKiA4KSArICh4U2NhbGUgJSA4KTtcblx0XHR9XG5cblx0XHRjb25zdCBwYWxldHRlSW5kZXggPSBnZXRQYWxldHRlSW5kZXgoKTtcblx0XHRjb25zb2xlLmxvZyh7eCwgeSwgcGl4ZWxJbmRleCB9KTtcblx0XHR0aGlzLnBpeGVsc1twaXhlbEluZGV4XS5wYWxldHRlSW5kZXggPSBwYWxldHRlSW5kZXg7XG5cdFx0dGhpcy5kcmF3KCk7XG5cdFx0dGhpcy5lbWl0KCdwaXhlbCcsIHsgY2hySW5kZXgsIHBhbGV0dGVJbmRleCwgcGl4ZWxJbmRleCB9KTtcblx0fVxuXG5cdHVwZGF0ZUNocih0aWxlcywgY2hySW5kZXgpIHtcblx0XHR0aGlzLmNockluZGV4ID0gY2hySW5kZXg7XG5cdFx0Y29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBsb2FkQ2hyKHRpbGVzLCBjaHJJbmRleCwgdGhpcy5waXhlbHMsIHRoaXMuem9vbSk7XG5cdFx0cmVzaXplQ2FudmFzLmNhbGwodGhpcywgdGhpcy5jYW52YXMsIHdpZHRoLCBoZWlnaHQsIHRoaXMuem9vbSk7XG5cdFx0dGhpcy5ncmlkID0gbmV3IEdyaWQodGhpcyk7XG5cdFx0dGhpcy5kaXZpZGVycyA9IG5ldyBEaXZpZGVycyh0aGlzKTtcblx0XHR0aGlzLmRyYXcoKTtcblx0fVxufVxuXG5jbGFzcyBEaXZpZGVycyB7XG5cdGNvbnN0cnVjdG9yKGVkaXRvcikge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywge1xuXHRcdFx0c3R5bGU6ICdyZ2JhKDI1NSwyNTUsMjU1LDAuOCknLFxuXHRcdFx0c2hvdzogdHJ1ZSxcblx0XHRcdGVkaXRvclxuXHRcdH0pO1xuXHR9XG5cblx0ZHJhdygpIHtcblx0XHRpZiAodGhpcy5zaG93KSB7XG5cdFx0XHRjb25zdCB7IGN0eCwgaGVpZ2h0LCB3aWR0aCwgem9vbSB9ID0gdGhpcy5lZGl0b3I7XG5cdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLnN0eWxlO1xuXHRcdFx0Y3R4LmJlZ2luUGF0aCgpO1xuXHRcdFx0Y3R4Lm1vdmVUbygwLCBoZWlnaHQgKiB6b29tIC8gMik7XG5cdFx0XHRjdHgubGluZVRvKHdpZHRoICogem9vbSwgaGVpZ2h0ICogem9vbSAvIDIpO1xuXHRcdFx0Y3R4LnN0cm9rZSgpO1xuXG5cdFx0XHRjdHguYmVnaW5QYXRoKCk7XG5cdFx0XHRjdHgubW92ZVRvKHdpZHRoICogem9vbSAvIDIsIDApO1xuXHRcdFx0Y3R4LmxpbmVUbyh3aWR0aCAqIHpvb20gLyAyLCBoZWlnaHQgKiB6b29tKTtcblx0XHRcdGN0eC5zdHJva2UoKTtcblx0XHR9XG5cdH1cbn1cblxuY2xhc3MgR3JpZCB7XG5cdGNvbnN0cnVjdG9yKGVkaXRvcikge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywge1xuXHRcdFx0c3R5bGU6ICdyZ2JhKDI1NSwyNTUsMjU1LDAuNSknLFxuXHRcdFx0c2hvdzogdHJ1ZSxcblx0XHRcdGVkaXRvclxuXHRcdH0pO1xuXHR9XG5cblx0ZHJhdygpIHtcblx0XHRpZiAodGhpcy5zaG93KSB7XG5cdFx0XHRjb25zdCB7IGN0eCwgaGVpZ2h0LCB3aWR0aCwgem9vbSB9ID0gdGhpcy5lZGl0b3I7XG5cdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLnN0eWxlO1xuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB3aWR0aCArIDE7IGkrKykge1xuXHRcdFx0XHRjdHguYmVnaW5QYXRoKCk7XG5cdFx0XHRcdGN0eC5tb3ZlVG8oaSAqIHpvb20sIDApO1xuXHRcdFx0XHRjdHgubGluZVRvKGkgKiB6b29tLCBoZWlnaHQgKiB6b29tKTtcblx0XHRcdFx0Y3R4LnN0cm9rZSgpO1xuXHRcdFx0fVxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPGhlaWdodCArIDE7IGkrKykge1xuXHRcdFx0XHRjdHguYmVnaW5QYXRoKCk7XG5cdFx0XHRcdGN0eC5tb3ZlVG8oMCwgaSAqIHpvb20pO1xuXHRcdFx0XHRjdHgubGluZVRvKHdpZHRoICogem9vbSwgaSAqIHpvb20pO1xuXHRcdFx0XHRjdHguc3Ryb2tlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yOyIsImNvbnN0IHsgcGFsZXR0ZSB9ID0gcmVxdWlyZSgnLi9kYXRhJyk7XG5cbmNvbnN0IHRlbXBsYXRlID0gYFxuPGRpdiBjbGFzcz1cInBhbGV0dGUtYnV0dG9uXCI+XG5cdDxkaXYgY2xhc3M9XCJwYWxldHRlLWJ1dHRvbi1jb3JuZXJcIj5cblx0XHQ8ZGl2IGNsYXNzPVwicGFsZXR0ZS1idXR0b24taW5kZXhcIj4xPC9kaXY+XG5cdDwvZGl2PlxuPC9kaXY+XG5gO1xuXG5jbGFzcyBQYWxldHRlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0cGFsZXR0ZS5mb3JFYWNoKChwLCBpbmRleCkgPT4ge1xuXHRcdFx0Y29uc3QgYnV0dG9uID0gJCh0ZW1wbGF0ZSk7XG5cdFx0XHRpZiAoaW5kZXggPT09IDApIHtcblx0XHRcdFx0YnV0dG9uLmFkZENsYXNzKCdwYWxldHRlLWJ1dHRvbi1zZWxlY3RlZCcpO1xuXHRcdFx0fVxuXHRcdFx0YnV0dG9uLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICcjJyArIHAuaGV4KTtcblx0XHRcdGJ1dHRvbi5kYXRhKCdwaScsIGluZGV4KTtcblx0XHRcdGJ1dHRvbi5maW5kKCcucGFsZXR0ZS1idXR0b24taW5kZXgnKS50ZXh0KGluZGV4ID09PSAwID8gJ1gnIDogaW5kZXgpO1xuXHRcdFx0JCgnI3BhbGV0dGUtY29udGFpbmVyJykuYXBwZW5kKGJ1dHRvbik7XG5cblx0XHRcdGJ1dHRvbi5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0XHQkKCcucGFsZXR0ZS1idXR0b24nKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmICh0aGlzID09PSBzZWxmKSB7XG5cdFx0XHRcdFx0XHQkKHRoaXMpLmFkZENsYXNzKCdwYWxldHRlLWJ1dHRvbi1zZWxlY3RlZCcpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKHRoaXMpLnJlbW92ZUNsYXNzKCdwYWxldHRlLWJ1dHRvbi1zZWxlY3RlZCcpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhbGV0dGU7IiwiY29uc3QgQ29sb3JQaWNrZXIgPSByZXF1aXJlKCcuL0NvbG9yUGlja2VyJyk7XG5jb25zdCBFZGl0b3IgPSByZXF1aXJlKCcuL0VkaXRvcicpO1xuY29uc3QgUGFsZXR0ZSA9IHJlcXVpcmUoJy4vUGFsZXR0ZScpO1xuY29uc3QgVGlsZXMgPSByZXF1aXJlKCcuL1RpbGVzJyk7XG5jb25zdCBTdGF0ZXMgPSByZXF1aXJlKCcuL1N0YXRlcycpO1xuXG5jbGFzcyBTcHJpdGVNYWtlciB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHRoaXMuZWRpdG9yID0gbmV3IEVkaXRvcigpO1xuXHRcdHRoaXMudGlsZXMgPSBuZXcgVGlsZXMoKTtcblx0XHR0aGlzLnN0YXRlcyA9IG5ldyBTdGF0ZXModGhpcy50aWxlcywgdGhpcy5lZGl0b3IuY2hySW5kZXgpO1xuXHRcdHRoaXMucGFsZXR0ZSA9IG5ldyBQYWxldHRlKCk7XG5cdFx0dGhpcy5jb2xvclBpY2tlciA9IG5ldyBDb2xvclBpY2tlcigpO1xuXG5cdFx0dGhpcy5lZGl0b3Iub24oJ3BpeGVsJywgdGhpcy50aWxlcy51cGRhdGVQaXhlbC5iaW5kKHRoaXMudGlsZXMpKTtcblx0XHR0aGlzLnRpbGVzLm9uKCdjbGljaycsIGNockluZGV4ID0+IHtcblx0XHRcdHRoaXMuZWRpdG9yLnVwZGF0ZUNocih0aGlzLnRpbGVzLCBjaHJJbmRleCk7XG5cdFx0XHR0aGlzLnN0YXRlcy5zaG93QWZmZWN0ZWQoY2hySW5kZXgpO1xuXHRcdH0pO1xuXHRcdHRoaXMuY29sb3JQaWNrZXIub24oJ3VwZGF0ZScsIHRoaXMuZHJhdy5iaW5kKHRoaXMpKTtcblxuXHRcdCQoJyNmcHMnKS5jaGFuZ2UodGhpcy5zdGF0ZXMudXBkYXRlRnBzLmJpbmQodGhpcy5zdGF0ZXMpKTtcblx0fVxuXG5cdGRyYXcoKSB7XG5cdFx0dGhpcy5lZGl0b3IuZHJhdygpO1xuXHRcdHRoaXMudGlsZXMuZHJhdygpO1xuXHRcdHRoaXMuc3RhdGVzLmRyYXcoKTtcblx0fVxufVxuXG53aW5kb3cuU3ByaXRlTWFrZXIgPSBTcHJpdGVNYWtlcjsiLCJjb25zdCB7IENIUiwgcGFsZXR0ZSwgc3RhdGVzIH0gPSByZXF1aXJlKCcuL2RhdGEnKTtcbmNvbnN0IHsgcmVzaXplQ2FudmFzIH0gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbmNsYXNzIFN0YXRlcyB7XG5cdGNvbnN0cnVjdG9yKHRpbGVzLCBjaHJJbmRleCkge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywge1xuXHRcdFx0YW5pbWF0aW9uczogW10sXG5cdFx0XHR6b29tOiAzLFxuXHRcdFx0ZnBzOiAzXG5cdFx0fSk7XG5cblx0XHRzdGF0ZXMuZm9yRWFjaCgoc3RhdGUsIGluZGV4KSA9PiB7XG5cdFx0XHRjb25zdCBjYW52YXMgPSAkKCc8Y2FudmFzPjwvY2FudmFzPicpO1xuXHRcdFx0Y2FudmFzLmFkZENsYXNzKCdzdGF0ZS1jYW52YXMnKTtcblx0XHRcdGNhbnZhcy5hdHRyKCdkYXRhLXNpZCcsIGluZGV4KTtcblx0XHRcdCQoJyNzdGF0ZXMnKS5hcHBlbmQoY2FudmFzKTtcblx0XHRcdHN0YXRlLmNhbnZhcyA9IGNhbnZhcztcblx0XHRcdHN0YXRlLmN0eCA9IGNhbnZhc1swXS5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdFx0c3RhdGUuZnJhbWVDb3VudCA9IDA7XG5cblx0XHRcdHN0YXRlLmZyYW1lcy5mb3JFYWNoKGZyYW1lID0+IHtcblx0XHRcdFx0ZnJhbWUuZm9yRWFjaChwYXJ0ID0+IHtcblx0XHRcdFx0XHRwYXJ0LnBpeGVscyA9IHRpbGVzLnBpeGVscy5maW5kKHBpeGVscyA9PiB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcGl4ZWxzLm5hbWUgPT09IHBhcnQubmFtZTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHRcdHJlc2l6ZUNhbnZhcy5jYWxsKHRoaXMsIGNhbnZhcywgc3RhdGUud2lkdGgsIHN0YXRlLmhlaWdodCwgdGhpcy56b29tKTtcblx0XHR9KTtcblxuXHRcdHRoaXMudXBkYXRlRnBzKHRoaXMuZnBzKTtcblx0XHR0aGlzLnNob3dBZmZlY3RlZChjaHJJbmRleCk7XG5cdH1cblxuXHR1cGRhdGVGcHMoZnBzKSB7XG5cdFx0aWYgKCEkLmlzTnVtZXJpYyhmcHMpKSB7XG5cdFx0XHRmcHMgPSAkKCcjZnBzJykudmFsKCk7XG5cdFx0fVxuXHRcdHRoaXMuZnBzID0gZnBzO1xuXHRcdGlmICh0aGlzLmludGVydmFsKSB7XG5cdFx0XHRjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWwpO1xuXHRcdH1cblx0XHRpZiAoZnBzID4gMCkge1xuXHRcdFx0dGhpcy5pbnRlcnZhbCA9IHNldEludGVydmFsKHRoaXMuZHJhdy5iaW5kKHRoaXMpLCAxMDAwIC8gdGhpcy5mcHMpO1xuXHRcdH1cblx0fVxuXG5cdHNob3dBZmZlY3RlZChjaHJJbmRleCkge1xuXHRcdGNvbnN0IGNock5hbWUgPSBDSFJbY2hySW5kZXhdLm5hbWU7XG5cdFx0c3RhdGVzLmZvckVhY2goKHN0YXRlLCBpbmRleCkgPT4ge1xuXHRcdFx0Y29uc3QgZm91bmQgPSBzdGF0ZS5mcmFtZXMuZmluZChmcmFtZSA9PiBmcmFtZS5maW5kKGYgPT4gZi5uYW1lID09PSBjaHJOYW1lKSk7XG5cdFx0XHRjb25zdCBzdGF0ZUNhbnZhcyA9ICQoJ2NhbnZhc1tkYXRhLXNpZD1cIicgKyBpbmRleCArICdcIl0nKTtcblx0XHRcdGlmIChmb3VuZCkge1xuXHRcdFx0XHRzdGF0ZUNhbnZhcy5jc3MoJ2Rpc3BsYXknLCAnJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzdGF0ZUNhbnZhcy5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0ZHJhdygpIHtcblx0XHRzdGF0ZXMuZm9yRWFjaChzdGF0ZSA9PiB7XG5cdFx0XHRjb25zdCB7IGN0eCB9ID0gc3RhdGU7XG5cdFx0XHRjdHguY2xlYXJSZWN0KDAsIDAsIHN0YXRlLndpZHRoICogdGhpcy56b29tLCBzdGF0ZS5oZWlnaHQgKiB0aGlzLnpvb20pO1xuXG5cdFx0XHRjb25zdCBmcmFtZSA9IHN0YXRlLmZyYW1lc1tzdGF0ZS5mcmFtZUNvdW50XTtcblx0XHRcdGZyYW1lLmZvckVhY2gocGFydCA9PiB7XG5cdFx0XHRcdHBhcnQucGl4ZWxzLmZvckVhY2gocCA9PiB7XG5cdFx0XHRcdFx0Y3R4LmZpbGxTdHlsZSA9ICcjJyArIHBhbGV0dGVbcC5wYWxldHRlSW5kZXhdLmhleDtcblx0XHRcdFx0XHRjdHguZmlsbFJlY3QoXG5cdFx0XHRcdFx0XHRwLnggKyAocGFydC54ID4gMCA/IDQgKiBwYXJ0LnggKiB0aGlzLnpvb20gOiAwKSwgXG5cdFx0XHRcdFx0XHRwLnkgKyAocGFydC55ID4gMCA/IDggKiBwYXJ0LnkgKiB0aGlzLnpvb20gOiAwKSwgXG5cdFx0XHRcdFx0XHR0aGlzLnpvb20sIFxuXHRcdFx0XHRcdFx0dGhpcy56b29tXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHRcdHN0YXRlLmZyYW1lQ291bnQrKztcblx0XHRcdGlmIChzdGF0ZS5mcmFtZUNvdW50ID49IHN0YXRlLmZyYW1lcy5sZW5ndGgpIHtcblx0XHRcdFx0c3RhdGUuZnJhbWVDb3VudCA9IDA7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTdGF0ZXM7IiwiY29uc3QgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJyk7XG5jb25zdCB7IENIUiwgcGFsZXR0ZSB9ID0gcmVxdWlyZSgnLi9kYXRhJyk7XG5jb25zdCB7IGxvYWRDaHIsIHJlc2l6ZUNhbnZhcyB9ID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5jbGFzcyBUaWxlcyBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5waXhlbHMgPSBbXTtcblx0XHR0aGlzLnpvb20gPSAzO1xuXG5cdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdFx0Q0hSLmZvckVhY2goKGNociwgaW5kZXgpID0+IHtcblx0XHRcdGNvbnN0IGNhbnZhcyA9ICQoJzxjYW52YXM+PC9jYW52YXM+Jyk7XG5cdFx0XHRjYW52YXMuYWRkQ2xhc3MoJ3RpbGUtY2FudmFzJyk7XG5cdFx0XHRjYW52YXMuZGF0YSgndGlkJywgaW5kZXgpO1xuXHRcdFx0Y2FudmFzLmNsaWNrKCgpID0+IHtcblx0XHRcdFx0c2VsZi5lbWl0KCdjbGljaycsIGluZGV4KTtcblx0XHRcdH0pO1xuXHRcdFx0JCgnI3RpbGVzJykuYXBwZW5kKGNhbnZhcyk7XG5cblx0XHRcdGNvbnN0IHBpeGVscyA9IFtdO1xuXHRcdFx0cGl4ZWxzLm5hbWUgPSBjaHIubmFtZTtcblx0XHRcdGxvYWRDaHIobnVsbCwgaW5kZXgsIHBpeGVscywgdGhpcy56b29tKTtcblx0XHRcdHRoaXMucGl4ZWxzLnB1c2gocGl4ZWxzKTtcblxuXHRcdFx0cGl4ZWxzLmNhbnZhcyA9IGNhbnZhcztcblx0XHRcdHBpeGVscy5jdHggPSBjYW52YXNbMF0uZ2V0Q29udGV4dCgnMmQnKTtcblx0XHRcdHJlc2l6ZUNhbnZhcy5jYWxsKHRoaXMsIGNhbnZhc1swXSwgY2hyLndpZHRoLCBjaHIuaGVpZ2h0LCB0aGlzLnpvb20pO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5kcmF3KCk7XG5cdH1cblxuXHR1cGRhdGVQaXhlbCh7IGNockluZGV4LCBwYWxldHRlSW5kZXgsIHBpeGVsSW5kZXggfSkge1xuXHRcdHRoaXMucGl4ZWxzW2NockluZGV4XVtwaXhlbEluZGV4XS5wYWxldHRlSW5kZXggPSBwYWxldHRlSW5kZXg7XG5cdFx0dGhpcy5kcmF3KCk7XG5cdH1cblxuXHRkcmF3KCkge1xuXHRcdHRoaXMucGl4ZWxzLmZvckVhY2gocGl4ZWxzID0+IHtcblx0XHRcdHBpeGVscy5mb3JFYWNoKHAgPT4ge1xuXHRcdFx0XHRwaXhlbHMuY3R4LmZpbGxTdHlsZSA9ICcjJyArIHBhbGV0dGVbcC5wYWxldHRlSW5kZXhdLmhleDtcblx0XHRcdFx0cGl4ZWxzLmN0eC5maWxsUmVjdChwLngsIHAueSwgdGhpcy56b29tLCB0aGlzLnpvb20pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUaWxlczsiLCIvLyBETyBOT1QgRURJVCBUSElTIEZJTEUgRElSRUNUTFkhIFRoaXMgZmlsZSBoYXMgYmVlbiBnZW5lcmF0ZWQgdmlhIGEgUk9NIHNwcml0ZVxuLy8gZXh0cmFjdGlvbiB0b29sIGxvY2F0ZWQgYXQgdG9vbHMvc3ByaXRlLWV4dHJhY3QuanNcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdENIUjogW1xuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbklkbGVUb3AnLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM1MjE2LFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwzLDEsMSwxLDAsMCwwLDEsMSwzLDIsMSwwLDAsMCwxLDMsMywyLDEsMCwwLDAsMSwzLDIsMSwxLDAsMCwwLDEsMSwxLDMsMywwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDEsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDIsMSwwLDAsMSwyLDIsMSwxLDEsMCwwLDAsMCwwLDAsMSwzLDIsMiwwLDAsMCwwLDAsMSwxLDEsMCwxLDEsMCwxLDEsMywxLDEsMywzLDEsMSwxLDEsMSwxLDMsMywzLDMsMSwxLDEsMCwxLDMsMywzLDEsMSwxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMCwwLDAsMCwxLDEsMiwxLDIsMSwxLDEsMSwwLDEsMSwyLDIsMSwxLDEsMSwxLDEsMiwyLDEsMSwxLDEsMSwxLDIsMiwxLDMsMSwwLDEsMSwyLDIsMSwxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMSwxLDEsMSwxLDAsMCwwLDIsMSwxLDIsMiwxLDAsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbklkbGVCb3R0b20nLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM1MjgwLFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMiwyLDAsMCwwLDAsMCwwLDEsMSwwLDAsMCwwLDAsMywxLDEsMCwwLDAsMCwzLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMSwxLDEsMSwxLDAsMCwwLDEsMSwxLDEsMCwwLDAsMCwxLDMsMSwxLDAsMCwyLDIsMiwyLDIsMSwwLDAsMSwyLDIsMiwyLDEsMCwwLDEsMSwxLDEsMSwxLDAsMCwxLDMsMSwxLDEsMCwwLDAsMSwzLDEsMSwxLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwwLDEsMSwxLDEsMCwwLDAsMCwwLDEsMSwzLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwwLDEsMywzLDEsMCwwLDAsMCwxLDMsMSwxLDAsMCwxLDEsMywzLDMsMSwwLDAsMSwzLDMsMywzLDEsMCwwLDEsMSwxLDEsMSwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMywzLDEsMSwwLDAsMCwwLDEsMywzLDEsMSwwLDAsMCwwLDEsMywzLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwxLDMsMywzLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDAsMCwwLDAsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbldhbGsxVG9wJyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRvZmZzZXQ6IDEzNTM0NCxcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyLFxuXHRcdFx0XHQxLFxuXHRcdFx0XHQzXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwxLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwxLDAsMCwxLDMsMSwxLDEsMSwxLDAsMSwxLDMsMiwxLDEsMSwwLDEsMywzLDIsMiwxLDEsMCwxLDMsMiwyLDEsMSwxLDAsMSwxLDEsMSwyLDMsMiwwLDAsMCwxLDEsMywyLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMiwxLDAsMCwwLDAsMCwwLDEsMSwwLDAsMCwwLDAsMCwwLDAsMSwyLDEsMSwxLDMsMCwwLDEsMiwyLDEsMSwxLDAsMCwxLDEsMiwyLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwzLDEsMSwzLDAsMCwxLDMsMywzLDMsMywwLDAsMSwzLDMsMywzLDMsMCwwLDAsMSwxLDEsMSwxLDEsMSwxLDAsMCwwLDAsMCwzLDEsMSwwLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwwLDMsMSwxLDEsMCwwLDAsMCwzLDMsMSwxLDAsMCwwLDAsMywzLDEsMCwwLDAsMCwwLDEsMSwxLDAsMCwwLDAsMCwxLDIsMSwwLDAsMCwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25XYWxrMUJvdHRvbScsXG5cdFx0XHRoZWlnaHQ6IDE2LFxuXHRcdFx0d2lkdGg6IDE2LFxuXHRcdFx0b2Zmc2V0OiAxMzU0MDgsXG5cdFx0XHRsYXlvdXQ6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0Mixcblx0XHRcdFx0MSxcblx0XHRcdFx0M1xuXHRcdFx0XSxcblx0XHRcdGRhdGE6IFswLDAsMCwwLDEsMiwyLDIsMCwwLDAsMCwxLDEsMSwxLDAsMCwwLDEsMywxLDMsMSwwLDAsMCwxLDEsMSwzLDEsMCwwLDAsMSwxLDEsMywxLDAsMCwwLDEsMSwxLDMsMSwwLDAsMCwwLDEsMSwxLDEsMCwwLDAsMCwwLDEsMSwxLDIsMiwxLDAsMCwwLDAsMCwxLDEsMSwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMywzLDAsMCwwLDAsMCwwLDEsMywwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwxLDMsMCwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDAsMCwzLDEsMCwwLDAsMCwwLDAsMywxLDEsMCwwLDAsMCwwLDMsMywxLDAsMCwwLDAsMCwzLDMsMSwxLDAsMCwwLDAsMywzLDMsMSwwLDAsMCwwLDMsMywzLDEsMCwwLDAsMCwxLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwXVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3NpbW9uV2FsazJUb3AnLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM1NDcyLFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDEsMSwxLDEsMCwwLDEsMSwxLDEsMSwxLDEsMCwxLDMsMSwxLDEsMSwxLDAsMSwxLDMsMiwxLDEsMSwwLDEsMywzLDIsMiwxLDEsMCwxLDMsMiwyLDIsMSwxLDAsMSwxLDEsMiwxLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDEsMSwxLDEsMCwwLDAsMCwxLDMsMiwyLDEsMCwwLDAsMywyLDIsMSwxLDAsMCwwLDAsMCwwLDEsMSwxLDIsMSwwLDAsMCwyLDEsMiwyLDEsMCwwLDAsMSwyLDIsMiwyLDAsMSwxLDEsMiwyLDIsMiwxLDMsMywxLDEsMiwyLDIsMSwzLDMsMywxLDEsMSwxLDEsMywzLDEsMSwxLDEsMSwwLDEsMSwwLDAsMSwxLDIsMSwxLDEsMSwxLDEsMCwwLDEsMywxLDEsMSwxLDEsMCwxLDEsMywxLDEsMywzLDEsMiwxLDEsMSwzLDMsMywxLDEsMSwxLDEsMSwzLDMsMSwxLDEsMSwzLDMsMywzLDEsMSwyLDEsMywzLDMsMSwwLDIsMiwxLDEsMywzLDEsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbldhbGsyQm90dG9tJyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRvZmZzZXQ6IDEzNTUzNixcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyLFxuXHRcdFx0XHQxLFxuXHRcdFx0XHQzXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDEsMiwwLDAsMCwwLDAsMSwyLDEsMCwwLDAsMCwwLDEsMywxLDAsMCwwLDAsMSwzLDEsMSwwLDAsMCwxLDMsMSwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwzLDMsMSwxLDAsMiwyLDIsMSwxLDEsMCwwLDEsMiwyLDIsMiwxLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMCwwLDMsMSwxLDEsMCwwLDAsMCwzLDEsMSwxLDEsMCwwLDAsMCwxLDEsMywxLDEsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDEsMywzLDMsMSwwLDAsMCwxLDMsMywzLDEsMCwwLDAsMSwzLDMsMSwwLDAsMCwxLDMsMywzLDEsMCwwLDEsMywzLDMsMywxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDMsMywzLDEsMCwwLDAsMCwxLDMsMywxLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDAsMCwxLDMsMywwLDAsMCwwLDEsMywzLDEsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMCwwLDAsMCwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hGcm9udExlZycsXG5cdFx0XHRoZWlnaHQ6IDgsXG5cdFx0XHR3aWR0aDogOCxcblx0XHRcdG9mZnNldDogMTM1NjAwLFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDBcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwxLDEsMSwxLDEsMSwyLDEsMywzLDEsMSwxLDEsMSwxLDMsMywzLDEsMSwxLDEsMSwzLDMsMywxLDEsMSwzLDAsMSwzLDMsMSwxLDMsMSwwLDAsMSwzLDMsMSwxLDEsMCwxLDMsMywzLDEsMSwxLDEsMywzLDMsMywzLDEsMV1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MScsXG5cdFx0XHRoZWlnaHQ6IDgsXG5cdFx0XHR3aWR0aDogOCxcblx0XHRcdG9mZnNldDogMTM1NjE2LFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDBcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEJhY2tMZWcnLFxuXHRcdFx0aGVpZ2h0OiA4LFxuXHRcdFx0d2lkdGg6IDgsXG5cdFx0XHRvZmZzZXQ6IDEzNTYzMixcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzIsMiwyLDIsMiwxLDAsMCwyLDIsMiwyLDIsMSwwLDAsMSwyLDIsMiwyLDEsMSwwLDEsMSwyLDIsMSwzLDMsMSwxLDEsMSwxLDMsMywzLDEsMSwxLDMsMywzLDEsMywxLDEsMywxLDEsMSwxLDMsMSwxLDEsMCwxLDEsMywzLDFdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0aGVpZ2h0OiA4LFxuXHRcdFx0d2lkdGg6IDgsXG5cdFx0XHRvZmZzZXQ6IDEzNTY0OCxcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25TdGFpcnNEYW1hZ2VMZWcnLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiA4LFxuXHRcdFx0b2Zmc2V0OiAxMzU2NjQsXG5cdFx0XHRsYXlvdXQ6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MVxuXHRcdFx0XSxcblx0XHRcdGRhdGE6IFswLDAsMCwwLDAsMSwxLDIsMCwwLDAsMCwxLDMsMSwxLDAsMCwwLDEsMywxLDEsMSwwLDAsMCwxLDMsMSwxLDEsMCwwLDEsMywxLDEsMSwxLDAsMCwxLDEsMSwxLDEsMywwLDAsMSwxLDEsMSwwLDEsMCwxLDEsMSwxLDAsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDEsMywzLDMsMSwwLDAsMCwxLDMsMywzLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwwLDEsMywzLDMsMSwwLDAsMSwzLDMsMywxLDEsMCwxLDMsMywzLDEsMCwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25TdGFpcldhbGtVcExlZ3MnLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM1Njk2LFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMCwxLDMsMywzLDEsMSwxLDAsMCwxLDMsMywxLDAsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDEsMywzLDMsMywxLDAsMSwzLDMsMywzLDMsMSwyLDIsMiwyLDIsMSwwLDAsMiwyLDIsMiwyLDEsMCwwLDEsMSwyLDIsMiwxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMSwzLDEsMSwxLDAsMCwwLDEsMywxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDEsMywxLDEsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDEsMSwzLDMsMSwwLDAsMCwwLDEsMywzLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDAsMSwzLDMsMywxLDAsMCwxLDMsMywzLDEsMSwwLDEsMywzLDMsMSwwLDAsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AxJyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRvZmZzZXQ6IDEzNTc2MCxcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyLFxuXHRcdFx0XHQxLFxuXHRcdFx0XHQzXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwxLDAsMCwxLDMsMywxLDEsMSwwLDAsMSwxLDMsMywxLDEsMCwwLDEsMywzLDIsMSwxLDAsMSwxLDIsMiwxLDEsMSwxLDIsMSwxLDEsMSwxLDMsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwxLDEsMCwwLDAsMCwwLDMsMiwxLDEsMCwxLDEsMCwxLDEsMSwyLDIsMSwxLDEsMSwyLDIsMiwyLDEsMSwxLDEsMiwyLDIsMiwxLDEsMSwxLDIsMiwyLDIsMiwyLDEsMSwxLDEsMSwyLDIsMSwxLDEsMSwxLDEsMSwxLDEsMCwxLDEsMSwxLDEsMSwwLDAsMiwyLDIsMiwyLDEsMCwwLDEsMiwyLDEsMSwzLDMsMSwxLDEsMSwwLDEsMywzLDMsMSwxLDEsMSwxLDEsMywxLDEsMSwxLDMsMywzLDEsMCwxLDEsMSwzLDMsMywxLDAsMCwxLDEsMSwxLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMicsXG5cdFx0XHRoZWlnaHQ6IDE2LFxuXHRcdFx0d2lkdGg6IDE2LFxuXHRcdFx0b2Zmc2V0OiAxMzU4ODgsXG5cdFx0XHRsYXlvdXQ6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0Mixcblx0XHRcdFx0MSxcblx0XHRcdFx0M1xuXHRcdFx0XSxcblx0XHRcdGRhdGE6IFswLDAsMCwwLDAsMCwwLDAsMCwxLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwxLDAsMCwxLDMsMywxLDEsMSwxLDAsMSwxLDMsMywxLDEsMSwwLDEsMywzLDIsMSwzLDMsMSwxLDIsMiwxLDMsMywzLDMsMCwxLDEsMiwxLDMsMywzLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMSwxLDEsMSwxLDAsMCwzLDMsMywzLDMsMywxLDEsMCwxLDIsMSwxLDMsMywyLDEsMiwxLDEsMywzLDIsMSwxLDIsMSwxLDIsMiwyLDEsMSwyLDIsMSwxLDIsMSwxLDAsMSwyLDIsMSwxLDEsMSwwLDEsMSwxLDEsMSwxLDAsMSwxLDEsMSwxLDEsMCwwLDIsMiwyLDIsMiwxLDAsMCwxLDEsMSwxLDEsMSwzLDMsMCwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwXVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDMnLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM1OTg0LFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwzLDEsMSwxLDAsMCwwLDEsMywzLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDEsMywzLDIsMSwxLDAsMSwzLDIsMiwyLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDEsMSwxLDEsMSwxLDAsMCwyLDIsMiwxLDIsMywxLDAsMiwyLDIsMSwxLDEsMSwwLDAsMSwyLDIsMiwxLDEsMiwxLDEsMSwxLDEsMSwxLDIsMywxLDEsMSwxLDEsMSwyLDMsMSwxLDEsMSwxLDIsMiwzLDMsMSwxLDAsMCwxLDIsMywxLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwxLDEsMiwyLDIsMiwxLDEsMSwwLDIsMiwyLDIsMSwxLDEsMSwyLDIsMiwyLDEsMSwzLDEsMiwyLDIsMiwxLDMsMywxLDIsMSwxLDEsMSwxLDEsMCwxLDEsMSwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDIsMiwyLDIsMiwxLDAsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbkhhbmQnLFxuXHRcdFx0aGVpZ2h0OiA4LFxuXHRcdFx0d2lkdGg6IDgsXG5cdFx0XHRvZmZzZXQ6IDEzNjA2NCxcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDEsMSwxLDEsMywwLDAsMSwxLDMsMywzLDMsMCwwLDEsMywzLDMsMywzLDAsMCwxLDEsMywzLDEsMSwwLDAsMCwxLDAsMSwxLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25EYW1hZ2VUb3AnLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM2MTQ0LFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMCwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMywyLDEsMSwxLDEsMSwzLDIsMiwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDEsMSwwLDAsMCwxLDEsMSwzLDIsMSwwLDAsMSwxLDIsMSwxLDIsMSwwLDEsMSwxLDEsMSwzLDIsMiwxLDEsMSwzLDEsMSwyLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDAsMSwxLDEsMSwwLDAsMSwxLDEsMSwxLDEsMCwxLDMsMywxLDEsMSwxLDAsMSwzLDMsMywxLDEsMSwwLDAsMSwxLDEsMSwxLDEsMiwxLDIsMiwxLDEsMSwwLDEsMSwyLDIsMiwxLDEsMSwxLDEsMiwyLDIsMSwxLDEsMSwxLDIsMiwyLDEsMSwxLDEsMiwyLDIsMiwzLDMsMSwxLDIsMiwyLDEsMywxLDAsMiwyLDIsMSwxLDEsMCwwLDEsMSwxLDEsMSwxLDAsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbkRlYWRMZWZ0Jyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRvZmZzZXQ6IDEzNjIwOCxcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyLFxuXHRcdFx0XHQxLFxuXHRcdFx0XHQzXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMSwwLDAsMCwwLDEsMSwxLDEsMCwxLDEsMSwxLDEsMSwyLDEsMywxLDEsMiwyLDEsMiwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwxLDEsMSwxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMSwxLDEsMSwzLDEsMCwxLDEsMSwxLDMsMywzLDAsMSwxLDEsMSwyLDIsMiwxLDEsMSwxLDEsMiwyLDEsMSwxLDEsMSwxLDEsMSwwLDMsMiwyLDEsMSwyLDEsMiwyLDIsMSwxLDEsMSwxLDEsMiwyLDIsMSwxLDEsMSwxLDEsMiwxLDEsMSwxLDEsMSwxLDEsMSwxLDMsMSwxLDEsMSwxLDEsMywzLDMsMSwxLDEsMywzLDMsMywzLDEsMSwwLDMsMywxLDEsMSwxLDFdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25EZWFkUmlnaHQnLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM2MjcyLFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwyLDEsMCwwLDAsMCwwLDAsMSwxLDEsMCwwLDAsMCwwLDEsMSwyLDEsMCwwLDAsMCwyLDIsMSwyLDEsMCwwLDAsMiwyLDIsMSwyLDEsMCwwLDIsMiwyLDEsMSwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDIsMiwxLDEsMSwxLDAsMCwyLDEsMSwxLDEsMSwxLDAsMSwxLDEsMywxLDEsMSwxLDEsMSwxLDEsMywxLDEsMSwxLDMsMSwxLDEsMywxLDEsMSwzLDEsMywxLDEsMywxLDEsMSwxLDMsMywxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDEsMSwxLDEsMSwwLDAsMywzLDMsMSwzLDMsMSwwLDEsMywzLDMsMywzLDEsMCwxLDMsMywxLDMsMywzLDEsMSwxLDEsMSwzLDMsMywxLDMsMywxLDEsMSwzLDMsMV1cblx0XHR9XG5cdF0sXG5cdHN0YXRlczogW1xuXHRcdHtcblx0XHRcdG5hbWU6ICdpZGxlJyxcblx0XHRcdGhlaWdodDogMzIsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRmcmFtZXM6IFtcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVUb3AnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVCb3R0b20nLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdjcm91Y2gnLFxuXHRcdFx0aGVpZ2h0OiAzMixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdGZyYW1lczogW1xuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSWRsZVRvcCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRnJvbnRMZWcnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEJhY2tMZWcnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MScsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogM1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAzXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnd2FsaycsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDE2LFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlVG9wJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2FsazFUb3AnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsxQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2FsazJUb3AnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsyQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2FsazFUb3AnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsxQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnd2FsayAoZG93biBzdGFpcnMpJyxcblx0XHRcdGhlaWdodDogMzIsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRmcmFtZXM6IFtcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVUb3AnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vblN0YWlyc0RhbWFnZUxlZycsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAzXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2FsazFUb3AnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsxQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnd2FsayAodXAgc3RhaXJzKScsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDE2LFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlVG9wJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25TdGFpcldhbGtVcExlZ3MnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XYWxrMVRvcCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2FsazFCb3R0b20nLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdkZWFkJyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMzIsXG5cdFx0XHRmcmFtZXM6IFtcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkRlYWRMZWZ0Jyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25EZWFkUmlnaHQnLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdodXJ0Jyxcblx0XHRcdGhlaWdodDogMzIsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRmcmFtZXM6IFtcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkRhbWFnZVRvcCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICd3aGlwJyxcblx0XHRcdGhlaWdodDogMzIsXG5cdFx0XHR3aWR0aDogMzIsXG5cdFx0XHRmcmFtZXM6IFtcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AxJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVCb3R0b20nLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25IYW5kJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAxXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSWRsZUJvdHRvbScsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3doaXAgKGR1Y2tpbmcpJyxcblx0XHRcdGhlaWdodDogMzIsXG5cdFx0XHR3aWR0aDogMzIsXG5cdFx0XHRmcmFtZXM6IFtcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AxJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hGcm9udExlZycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkxJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAzXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMicsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRnJvbnRMZWcnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEJhY2tMZWcnLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MScsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogM1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAzXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSGFuZCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDMnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEZyb250TGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTEnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MicsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogM1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3doaXAgKGRvd24gc3RhaXJzKScsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDMyLFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMScsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMicsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25IYW5kJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAxXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICd3aGlwICh1cCBzdGFpcnMpJyxcblx0XHRcdGhlaWdodDogMzIsXG5cdFx0XHR3aWR0aDogMzIsXG5cdFx0XHRmcmFtZXM6IFtcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AxJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25TdGFpcldhbGtVcExlZ3MnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMicsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJXYWxrVXBMZWdzJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSGFuZCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDMnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vblN0YWlyV2Fsa1VwTGVncycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3N1YndlYXBvbiB0aHJvdycsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDI0LFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMScsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSWRsZUJvdHRvbScsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XSxcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AyJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSGFuZCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDMnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVCb3R0b20nLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzdWJ3ZWFwb24gdGhyb3cgKGRvd24gc3RhaXJzKScsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDI0LFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMScsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMicsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25IYW5kJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAxXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzdWJ3ZWFwb24gdGhyb3cgKHVwIHN0YWlycyknLFxuXHRcdFx0aGVpZ2h0OiAzMixcblx0XHRcdHdpZHRoOiAyNCxcblx0XHRcdGZyYW1lczogW1xuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDEnLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vblN0YWlyV2Fsa1VwTGVncycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XSxcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AyJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25TdGFpcldhbGtVcExlZ3MnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25IYW5kJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAxXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJXYWxrVXBMZWdzJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHRdXG5cdFx0fVxuXHRdLFxuXHRjb2xvcnM6IFtcblx0XHR7XG5cdFx0XHRoZXg6ICc3QzdDN0MnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDEyNCxcblx0XHRcdFx0MTI0LFxuXHRcdFx0XHQxMjRcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwMDBGQycsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MCxcblx0XHRcdFx0MjUyXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwQkMnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDE4OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnNDQyOEJDJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQ2OCxcblx0XHRcdFx0NDAsXG5cdFx0XHRcdDE4OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnOTQwMDg0Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQxNDgsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDEzMlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnQTgwMDIwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQxNjgsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDMyXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdBODEwMDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDE2OCxcblx0XHRcdFx0MTYsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzg4MTQwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTM2LFxuXHRcdFx0XHQyMCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnNTAzMDAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQ4MCxcblx0XHRcdFx0NDgsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwNzgwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MTIwLFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDY4MDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDEwNCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDA1ODAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQ4OCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDA0MDU4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQ2NCxcblx0XHRcdFx0ODhcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwMDAwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDAwMDAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQwLFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0JDQkNCQycsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTg4LFxuXHRcdFx0XHQxODgsXG5cdFx0XHRcdDE4OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDA3OEY4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQxMjAsXG5cdFx0XHRcdDI0OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDA1OEY4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQ4OCxcblx0XHRcdFx0MjQ4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICc2ODQ0RkMnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDEwNCxcblx0XHRcdFx0NjgsXG5cdFx0XHRcdDI1MlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRDgwMENDJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyMTYsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIwNFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRTQwMDU4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyMjgsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDg4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGODM4MDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0NTYsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0U0NUMxMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjI4LFxuXHRcdFx0XHQ5Mixcblx0XHRcdFx0MTZcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0FDN0MwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTcyLFxuXHRcdFx0XHQxMjQsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwQjgwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MTg0LFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMEE4MDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDE2OCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDBBODQ0Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQxNjgsXG5cdFx0XHRcdDY4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDg4ODgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDEzNixcblx0XHRcdFx0MTM2XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwMDAwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDAwMDAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQwLFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGOEY4RjgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0MjQ4LFxuXHRcdFx0XHQyNDhcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzNDQkNGQycsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0NjAsXG5cdFx0XHRcdDE4OCxcblx0XHRcdFx0MjUyXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICc2ODg4RkMnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDEwNCxcblx0XHRcdFx0MTM2LFxuXHRcdFx0XHQyNTJcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzk4NzhGOCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTUyLFxuXHRcdFx0XHQxMjAsXG5cdFx0XHRcdDI0OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRjg3OEY4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyNDgsXG5cdFx0XHRcdDEyMCxcblx0XHRcdFx0MjQ4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGODU4OTgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0ODgsXG5cdFx0XHRcdDE1MlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRjg3ODU4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyNDgsXG5cdFx0XHRcdDEyMCxcblx0XHRcdFx0ODhcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0ZDQTA0NCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjUyLFxuXHRcdFx0XHQxNjAsXG5cdFx0XHRcdDY4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGOEI4MDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0MTg0LFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdCOEY4MTgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDE4NCxcblx0XHRcdFx0MjQ4LFxuXHRcdFx0XHQyNFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnNThEODU0Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQ4OCxcblx0XHRcdFx0MjE2LFxuXHRcdFx0XHQ4NFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnNThGODk4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQ4OCxcblx0XHRcdFx0MjQ4LFxuXHRcdFx0XHQxNTJcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwRThEOCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MjMyLFxuXHRcdFx0XHQyMTZcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzc4Nzg3OCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTIwLFxuXHRcdFx0XHQxMjAsXG5cdFx0XHRcdDEyMFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDAwMDAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQwLFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0ZDRkNGQycsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjUyLFxuXHRcdFx0XHQyNTIsXG5cdFx0XHRcdDI1MlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnQTRFNEZDJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQxNjQsXG5cdFx0XHRcdDIyOCxcblx0XHRcdFx0MjUyXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdCOEI4RjgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDE4NCxcblx0XHRcdFx0MTg0LFxuXHRcdFx0XHQyNDhcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0Q4QjhGOCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjE2LFxuXHRcdFx0XHQxODQsXG5cdFx0XHRcdDI0OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRjhCOEY4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyNDgsXG5cdFx0XHRcdDE4NCxcblx0XHRcdFx0MjQ4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGOEE0QzAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0MTY0LFxuXHRcdFx0XHQxOTJcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0YwRDBCMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjQwLFxuXHRcdFx0XHQyMDgsXG5cdFx0XHRcdDE3NlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRkNFMEE4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyNTIsXG5cdFx0XHRcdDIyNCxcblx0XHRcdFx0MTY4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGOEQ4NzgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0MjE2LFxuXHRcdFx0XHQxMjBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0Q4Rjg3OCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjE2LFxuXHRcdFx0XHQyNDgsXG5cdFx0XHRcdDEyMFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnQjhGOEI4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQxODQsXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0MTg0XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdCOEY4RDgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDE4NCxcblx0XHRcdFx0MjQ4LFxuXHRcdFx0XHQyMTZcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwRkNGQycsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MjUyLFxuXHRcdFx0XHQyNTJcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0Q4RDhEOCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjE2LFxuXHRcdFx0XHQyMTYsXG5cdFx0XHRcdDIxNlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDAwMDAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQwLFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9XG5cdF0sXG5cdHBhbGV0dGU6IFtcblx0XHR7XG5cdFx0XHRoZXg6ICcwMEE4MDAnLFxuXHRcdFx0aW5kZXg6IDI2XG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxuXHRcdFx0aW5kZXg6IDE1XG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdBODEwMDAnLFxuXHRcdFx0aW5kZXg6IDZcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0ZDRkNGQycsXG5cdFx0XHRpbmRleDogNDhcblx0XHR9XG5cdF1cbn07XG4iLCJjb25zdCB7IENIUiB9ID0gcmVxdWlyZSgnLi9kYXRhJyk7XG5cbmV4cG9ydHMubG9hZENociA9IGZ1bmN0aW9uIGxvYWRDaHIodGlsZXMsIGNockluZGV4LCBwaXhlbHMsIHpvb20pIHtcblx0Y29uc3QgY2hyRGF0YSA9IENIUltjaHJJbmRleF07XG5cdHBpeGVscy5sZW5ndGggPSAwO1xuXHRjaHJEYXRhLmRhdGEuZm9yRWFjaCgocGFsZXR0ZUluZGV4LCBpbmRleCkgPT4ge1xuXHRcdGNvbnN0IGxheW91dEluZGV4ID0gTWF0aC5mbG9vcihpbmRleCAvIDY0KTtcblx0XHRjb25zdCBsYXlvdXQgPSBjaHJEYXRhLmxheW91dFtsYXlvdXRJbmRleF07XG5cdFx0cGl4ZWxzLnB1c2goe1xuXHRcdFx0eDogKChpbmRleCAlIDgpICsgKGxheW91dCA+PSAyID8gOCA6IDApKSAqIHpvb20sXG5cdFx0XHR5OiAoKE1hdGguZmxvb3IoKGluZGV4ICUgNjQpIC8gOCkpICsgKGxheW91dCAlIDIgPT09IDEgPyA4IDogMCkpICogem9vbSxcblx0XHRcdHBhbGV0dGVJbmRleDogdGlsZXMgPyB0aWxlcy5waXhlbHNbY2hySW5kZXhdW2luZGV4XS5wYWxldHRlSW5kZXggOiBwYWxldHRlSW5kZXhcblx0XHR9KTtcblx0fSk7XG5cdHJldHVybiBjaHJEYXRhO1xufTtcblxuZXhwb3J0cy5yZXNpemVDYW52YXMgPSBmdW5jdGlvbiByZXNpemVDYW52YXMoY2FudmFzLCB3aWR0aCwgaGVpZ2h0LCB6b29tKSB7XG5cdGNvbnN0ICRjYW52YXM9ICQoY2FudmFzKTtcblx0dGhpcy56b29tID0gem9vbTtcblx0dGhpcy53aWR0aCA9IHdpZHRoO1xuXHR0aGlzLmhlaWdodCA9IGhlaWdodDtcblx0JGNhbnZhcy5hdHRyKCdoZWlnaHQnLCBoZWlnaHQgKiB6b29tKTtcblx0JGNhbnZhcy5hdHRyKCd3aWR0aCcsIHdpZHRoICogem9vbSk7XG5cdCRjYW52YXMuY3NzKHtcblx0XHR3aWR0aDogd2lkdGggKiB6b29tLFxuXHRcdGhlaWdodDogaGVpZ2h0ICogem9vbVxuXHR9KTtcbn07XG5cbmV4cG9ydHMuZ2V0UGFsZXR0ZUluZGV4ID0gZnVuY3Rpb24gZ2V0UGFsZXR0ZUluZGV4KCkge1xuXHRyZXR1cm4gcGFyc2VJbnQoJCgnLnBhbGV0dGUtYnV0dG9uLXNlbGVjdGVkJykuZmlyc3QoKS5kYXRhKCdwaScpLCAxMCk7XG59O1xuXG5leHBvcnRzLnJnYjJoZXggPSBmdW5jdGlvbiByZ2IyaGV4KHJnYil7XG5cdHJnYiA9IHJnYi5tYXRjaCgvXnJnYlxcKChcXGQrKSxcXHMqKFxcZCspLFxccyooXFxkKylcXCkkLyk7XG5cdHJldHVybiAoJzAnICsgcGFyc2VJbnQocmdiWzFdLDEwKS50b1N0cmluZygxNikpLnNsaWNlKC0yKSArXG5cdFx0KCcwJyArIHBhcnNlSW50KHJnYlsyXSwxMCkudG9TdHJpbmcoMTYpKS5zbGljZSgtMikgK1xuXHRcdCgnMCcgKyBwYXJzZUludChyZ2JbM10sMTApLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTIpO1xufTsiXX0=
