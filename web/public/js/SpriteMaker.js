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
				var paletteButton = $('.palette-button-selected').first().find('.palette-button');
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
<div class="palette-button-selection">
	<div class="palette-button">
		<div class="palette-button-corner">
			<div class="palette-button-index">1</div>
		</div>
	</div>
</div>
`;

class Palette {
	constructor() {
		palette.forEach((p, index) => {
			const fullButton = $(template);
			const button = fullButton.find('.palette-button');

			if (index === 0) {
				fullButton.addClass('palette-button-selected');
			}
			button.css('background-color', '#' + p.hex);
			button.data('pi', index);
			button.find('.palette-button-index').text(index === 0 ? 'X' : index);
			$('#palette-container').append(fullButton);

			button.click(function() {
				const pi = $(this).data('pi');
				$('.palette-button-selection').each(function() {
					const pb = $(this).find('.palette-button');
					if (pi === pb.data('pi')) {
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
		const editor = this.editor = new Editor();
		const tiles = this.tiles = new Tiles();
		const states = this.states = new States(this.tiles, this.editor.chrIndex);
		this.palette = new Palette();
		this.colorPicker = new ColorPicker();

		editor.on('pixel', tiles.updatePixel.bind(tiles));
		tiles.on('click', chrIndex => {
			editor.updateChr(tiles, chrIndex);
			states.showAffected(chrIndex);
		});
		this.colorPicker.on('update', this.draw.bind(this));

		$('#fps').change(this.states.updateFps.bind(this.states));
		$('#animateToggle').change(function() {
			states.animate = $(this).prop('checked');
			states.updateFps(states.fps);
		});
		$('#affectedToggle').change(function() {
			states.onlyShowAffected = $(this).prop('checked');
			states.showAffected(editor.chrIndex);
		});
		$('#transparentToggle').change(function() {
			states.backgroundTransparency = $(this).prop('checked');
			states.draw();
		});

		$('#sprite-patch').click(function() {
			tiles.export();
		});
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
			fps: 3,
			animate: true,
			onlyShowAffected: true,
			backgroundTransparency: false
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
		if (this.animate && fps > 0) {
			this.interval = setInterval(this.draw.bind(this), 1000 / this.fps);
		}
	}

	showAffected(chrIndex) {
		const chrName = CHR[chrIndex].name;
		states.forEach((state, index) => {
			const found = !this.onlyShowAffected || state.frames.find(frame => frame.find(f => f.name === chrName));
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
					ctx.fillStyle = p.paletteIndex === 0 && this.backgroundTransparency ? 'rgba(0,0,0,0)' : '#' + palette[p.paletteIndex].hex;
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
			pixels.offset = chr.offset;
			pixels.layout = chr.layout;
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

	export() {
		const chrPixelLength = 8 * 8;
		const spritePatches = [];

		this.pixels.forEach(pixels => {
			const bytes = [];
			const { offset } = pixels;
			let pixelCount = 0;

			pixels.layout.forEach(layout => {
				const pixelOffset = layout * 16;
				let byte1 = '', byte2 = '';
				let byteIndex = 0;

				for (let i = 0; i < chrPixelLength; i++) {
					const { paletteIndex } = pixels[pixelCount++];
					byte1 += paletteIndex % 2;
					byte2 += paletteIndex > 1 ? 1 : 0;
					if (i % 8 === 7) {
						bytes[byteIndex + pixelOffset] = parseInt(byte1, 2);
						bytes[byteIndex + pixelOffset + 8] = parseInt(byte2, 2);
						byteIndex++;
						if (byteIndex % 8 === 0) {
							byteIndex += 8;
						}
						byte1 = '';
						byte2 = '';
					}
				}
			});
			spritePatches.push({ offset, bytes });
		});

		const patch = 'const spritePatches = ' + JSON.stringify(spritePatches, null, 2) + patchTemplate;
		console.log(patch);
	}
}

module.exports = Tiles;

const patchTemplate = `;

const offsets = [ 0, 0x2000, 0x4000, 0x6000, 0x8000, 0x9000, 0xB000, 0x17000 ];
const finalSpritePatch = [];
for (let i = 0; i < offsets.length; i++) {
	spritePatches.forEach(sp => {
		finalSpritePatch.push({
			offset: sp.offset + offsets[i],
			bytes: sp.bytes.slice(0)
		});
	});
}

// palette
finalSpritePatch.push({
	offset: 117439,
	bytes: [
		15,
		6,
		48
	]
});

module.exports = {
	id: 'test-sprite',
	name: 'Test Sprite',
	description: 'cv2r.com Sprite Maker test sprite',
	patch: finalSpritePatch
};
`;
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
	return parseInt($('.palette-button-selected').first().find('.palette-button').data('pi'), 10);
};

exports.rgb2hex = function rgb2hex(rgb){
	rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	return ('0' + parseInt(rgb[1],10).toString(16)).slice(-2) +
		('0' + parseInt(rgb[2],10).toString(16)).slice(-2) +
		('0' + parseInt(rgb[3],10).toString(16)).slice(-2);
};
},{"./data":8}]},{},[5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsInNyYy9zcHJpdGUtbWFrZXIvQ29sb3JQaWNrZXIuanMiLCJzcmMvc3ByaXRlLW1ha2VyL0VkaXRvci5qcyIsInNyYy9zcHJpdGUtbWFrZXIvUGFsZXR0ZS5qcyIsInNyYy9zcHJpdGUtbWFrZXIvU3ByaXRlTWFrZXIuanMiLCJzcmMvc3ByaXRlLW1ha2VyL1N0YXRlcy5qcyIsInNyYy9zcHJpdGUtbWFrZXIvVGlsZXMuanMiLCJzcmMvc3ByaXRlLW1ha2VyL2RhdGEuanMiLCJzcmMvc3ByaXRlLW1ha2VyL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzZ0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoNkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBvYmplY3RDcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IG9iamVjdENyZWF0ZVBvbHlmaWxsXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IG9iamVjdEtleXNQb2x5ZmlsbFxudmFyIGJpbmQgPSBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCB8fCBmdW5jdGlvbkJpbmRQb2x5ZmlsbFxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGhpcywgJ19ldmVudHMnKSkge1xuICAgIHRoaXMuX2V2ZW50cyA9IG9iamVjdENyZWF0ZShudWxsKTtcbiAgICB0aGlzLl9ldmVudHNDb3VudCA9IDA7XG4gIH1cblxuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG52YXIgZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG52YXIgaGFzRGVmaW5lUHJvcGVydHk7XG50cnkge1xuICB2YXIgbyA9IHt9O1xuICBpZiAoT2JqZWN0LmRlZmluZVByb3BlcnR5KSBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgJ3gnLCB7IHZhbHVlOiAwIH0pO1xuICBoYXNEZWZpbmVQcm9wZXJ0eSA9IG8ueCA9PT0gMDtcbn0gY2F0Y2ggKGVycikgeyBoYXNEZWZpbmVQcm9wZXJ0eSA9IGZhbHNlIH1cbmlmIChoYXNEZWZpbmVQcm9wZXJ0eSkge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRXZlbnRFbWl0dGVyLCAnZGVmYXVsdE1heExpc3RlbmVycycsIHtcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24oYXJnKSB7XG4gICAgICAvLyBjaGVjayB3aGV0aGVyIHRoZSBpbnB1dCBpcyBhIHBvc2l0aXZlIG51bWJlciAod2hvc2UgdmFsdWUgaXMgemVybyBvclxuICAgICAgLy8gZ3JlYXRlciBhbmQgbm90IGEgTmFOKS5cbiAgICAgIGlmICh0eXBlb2YgYXJnICE9PSAnbnVtYmVyJyB8fCBhcmcgPCAwIHx8IGFyZyAhPT0gYXJnKVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImRlZmF1bHRNYXhMaXN0ZW5lcnNcIiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gICAgICBkZWZhdWx0TWF4TGlzdGVuZXJzID0gYXJnO1xuICAgIH1cbiAgfSk7XG59IGVsc2Uge1xuICBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG59XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uIHNldE1heExpc3RlbmVycyhuKSB7XG4gIGlmICh0eXBlb2YgbiAhPT0gJ251bWJlcicgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJuXCIgYXJndW1lbnQgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbmZ1bmN0aW9uICRnZXRNYXhMaXN0ZW5lcnModGhhdCkge1xuICBpZiAodGhhdC5fbWF4TGlzdGVuZXJzID09PSB1bmRlZmluZWQpXG4gICAgcmV0dXJuIEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICByZXR1cm4gdGhhdC5fbWF4TGlzdGVuZXJzO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmdldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uIGdldE1heExpc3RlbmVycygpIHtcbiAgcmV0dXJuICRnZXRNYXhMaXN0ZW5lcnModGhpcyk7XG59O1xuXG4vLyBUaGVzZSBzdGFuZGFsb25lIGVtaXQqIGZ1bmN0aW9ucyBhcmUgdXNlZCB0byBvcHRpbWl6ZSBjYWxsaW5nIG9mIGV2ZW50XG4vLyBoYW5kbGVycyBmb3IgZmFzdCBjYXNlcyBiZWNhdXNlIGVtaXQoKSBpdHNlbGYgb2Z0ZW4gaGFzIGEgdmFyaWFibGUgbnVtYmVyIG9mXG4vLyBhcmd1bWVudHMgYW5kIGNhbiBiZSBkZW9wdGltaXplZCBiZWNhdXNlIG9mIHRoYXQuIFRoZXNlIGZ1bmN0aW9ucyBhbHdheXMgaGF2ZVxuLy8gdGhlIHNhbWUgbnVtYmVyIG9mIGFyZ3VtZW50cyBhbmQgdGh1cyBkbyBub3QgZ2V0IGRlb3B0aW1pemVkLCBzbyB0aGUgY29kZVxuLy8gaW5zaWRlIHRoZW0gY2FuIGV4ZWN1dGUgZmFzdGVyLlxuZnVuY3Rpb24gZW1pdE5vbmUoaGFuZGxlciwgaXNGbiwgc2VsZikge1xuICBpZiAoaXNGbilcbiAgICBoYW5kbGVyLmNhbGwoc2VsZik7XG4gIGVsc2Uge1xuICAgIHZhciBsZW4gPSBoYW5kbGVyLmxlbmd0aDtcbiAgICB2YXIgbGlzdGVuZXJzID0gYXJyYXlDbG9uZShoYW5kbGVyLCBsZW4pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpXG4gICAgICBsaXN0ZW5lcnNbaV0uY2FsbChzZWxmKTtcbiAgfVxufVxuZnVuY3Rpb24gZW1pdE9uZShoYW5kbGVyLCBpc0ZuLCBzZWxmLCBhcmcxKSB7XG4gIGlmIChpc0ZuKVxuICAgIGhhbmRsZXIuY2FsbChzZWxmLCBhcmcxKTtcbiAgZWxzZSB7XG4gICAgdmFyIGxlbiA9IGhhbmRsZXIubGVuZ3RoO1xuICAgIHZhciBsaXN0ZW5lcnMgPSBhcnJheUNsb25lKGhhbmRsZXIsIGxlbik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSlcbiAgICAgIGxpc3RlbmVyc1tpXS5jYWxsKHNlbGYsIGFyZzEpO1xuICB9XG59XG5mdW5jdGlvbiBlbWl0VHdvKGhhbmRsZXIsIGlzRm4sIHNlbGYsIGFyZzEsIGFyZzIpIHtcbiAgaWYgKGlzRm4pXG4gICAgaGFuZGxlci5jYWxsKHNlbGYsIGFyZzEsIGFyZzIpO1xuICBlbHNlIHtcbiAgICB2YXIgbGVuID0gaGFuZGxlci5sZW5ndGg7XG4gICAgdmFyIGxpc3RlbmVycyA9IGFycmF5Q2xvbmUoaGFuZGxlciwgbGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgbGlzdGVuZXJzW2ldLmNhbGwoc2VsZiwgYXJnMSwgYXJnMik7XG4gIH1cbn1cbmZ1bmN0aW9uIGVtaXRUaHJlZShoYW5kbGVyLCBpc0ZuLCBzZWxmLCBhcmcxLCBhcmcyLCBhcmczKSB7XG4gIGlmIChpc0ZuKVxuICAgIGhhbmRsZXIuY2FsbChzZWxmLCBhcmcxLCBhcmcyLCBhcmczKTtcbiAgZWxzZSB7XG4gICAgdmFyIGxlbiA9IGhhbmRsZXIubGVuZ3RoO1xuICAgIHZhciBsaXN0ZW5lcnMgPSBhcnJheUNsb25lKGhhbmRsZXIsIGxlbik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSlcbiAgICAgIGxpc3RlbmVyc1tpXS5jYWxsKHNlbGYsIGFyZzEsIGFyZzIsIGFyZzMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVtaXRNYW55KGhhbmRsZXIsIGlzRm4sIHNlbGYsIGFyZ3MpIHtcbiAgaWYgKGlzRm4pXG4gICAgaGFuZGxlci5hcHBseShzZWxmLCBhcmdzKTtcbiAgZWxzZSB7XG4gICAgdmFyIGxlbiA9IGhhbmRsZXIubGVuZ3RoO1xuICAgIHZhciBsaXN0ZW5lcnMgPSBhcnJheUNsb25lKGhhbmRsZXIsIGxlbik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSlcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseShzZWxmLCBhcmdzKTtcbiAgfVxufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGV2ZW50cztcbiAgdmFyIGRvRXJyb3IgPSAodHlwZSA9PT0gJ2Vycm9yJyk7XG5cbiAgZXZlbnRzID0gdGhpcy5fZXZlbnRzO1xuICBpZiAoZXZlbnRzKVxuICAgIGRvRXJyb3IgPSAoZG9FcnJvciAmJiBldmVudHMuZXJyb3IgPT0gbnVsbCk7XG4gIGVsc2UgaWYgKCFkb0Vycm9yKVxuICAgIHJldHVybiBmYWxzZTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmIChkb0Vycm9yKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKVxuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBBdCBsZWFzdCBnaXZlIHNvbWUga2luZCBvZiBjb250ZXh0IHRvIHRoZSB1c2VyXG4gICAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdVbmhhbmRsZWQgXCJlcnJvclwiIGV2ZW50LiAoJyArIGVyICsgJyknKTtcbiAgICAgIGVyci5jb250ZXh0ID0gZXI7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGhhbmRsZXIgPSBldmVudHNbdHlwZV07XG5cbiAgaWYgKCFoYW5kbGVyKVxuICAgIHJldHVybiBmYWxzZTtcblxuICB2YXIgaXNGbiA9IHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nO1xuICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICBzd2l0Y2ggKGxlbikge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgIGNhc2UgMTpcbiAgICAgIGVtaXROb25lKGhhbmRsZXIsIGlzRm4sIHRoaXMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAyOlxuICAgICAgZW1pdE9uZShoYW5kbGVyLCBpc0ZuLCB0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAzOlxuICAgICAgZW1pdFR3byhoYW5kbGVyLCBpc0ZuLCB0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDQ6XG4gICAgICBlbWl0VGhyZWUoaGFuZGxlciwgaXNGbiwgdGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0sIGFyZ3VtZW50c1szXSk7XG4gICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgIGRlZmF1bHQ6XG4gICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgIGVtaXRNYW55KGhhbmRsZXIsIGlzRm4sIHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5mdW5jdGlvbiBfYWRkTGlzdGVuZXIodGFyZ2V0LCB0eXBlLCBsaXN0ZW5lciwgcHJlcGVuZCkge1xuICB2YXIgbTtcbiAgdmFyIGV2ZW50cztcbiAgdmFyIGV4aXN0aW5nO1xuXG4gIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGV2ZW50cyA9IHRhcmdldC5fZXZlbnRzO1xuICBpZiAoIWV2ZW50cykge1xuICAgIGV2ZW50cyA9IHRhcmdldC5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgIHRhcmdldC5fZXZlbnRzQ291bnQgPSAwO1xuICB9IGVsc2Uge1xuICAgIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gICAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICAgIGlmIChldmVudHMubmV3TGlzdGVuZXIpIHtcbiAgICAgIHRhcmdldC5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgPyBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICAgICAgLy8gUmUtYXNzaWduIGBldmVudHNgIGJlY2F1c2UgYSBuZXdMaXN0ZW5lciBoYW5kbGVyIGNvdWxkIGhhdmUgY2F1c2VkIHRoZVxuICAgICAgLy8gdGhpcy5fZXZlbnRzIHRvIGJlIGFzc2lnbmVkIHRvIGEgbmV3IG9iamVjdFxuICAgICAgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHM7XG4gICAgfVxuICAgIGV4aXN0aW5nID0gZXZlbnRzW3R5cGVdO1xuICB9XG5cbiAgaWYgKCFleGlzdGluZykge1xuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIGV4aXN0aW5nID0gZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gICAgKyt0YXJnZXQuX2V2ZW50c0NvdW50O1xuICB9IGVsc2Uge1xuICAgIGlmICh0eXBlb2YgZXhpc3RpbmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgICAgZXhpc3RpbmcgPSBldmVudHNbdHlwZV0gPVxuICAgICAgICAgIHByZXBlbmQgPyBbbGlzdGVuZXIsIGV4aXN0aW5nXSA6IFtleGlzdGluZywgbGlzdGVuZXJdO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgICBpZiAocHJlcGVuZCkge1xuICAgICAgICBleGlzdGluZy51bnNoaWZ0KGxpc3RlbmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGV4aXN0aW5nLnB1c2gobGlzdGVuZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gICAgaWYgKCFleGlzdGluZy53YXJuZWQpIHtcbiAgICAgIG0gPSAkZ2V0TWF4TGlzdGVuZXJzKHRhcmdldCk7XG4gICAgICBpZiAobSAmJiBtID4gMCAmJiBleGlzdGluZy5sZW5ndGggPiBtKSB7XG4gICAgICAgIGV4aXN0aW5nLndhcm5lZCA9IHRydWU7XG4gICAgICAgIHZhciB3ID0gbmV3IEVycm9yKCdQb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5IGxlYWsgZGV0ZWN0ZWQuICcgK1xuICAgICAgICAgICAgZXhpc3RpbmcubGVuZ3RoICsgJyBcIicgKyBTdHJpbmcodHlwZSkgKyAnXCIgbGlzdGVuZXJzICcgK1xuICAgICAgICAgICAgJ2FkZGVkLiBVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byAnICtcbiAgICAgICAgICAgICdpbmNyZWFzZSBsaW1pdC4nKTtcbiAgICAgICAgdy5uYW1lID0gJ01heExpc3RlbmVyc0V4Y2VlZGVkV2FybmluZyc7XG4gICAgICAgIHcuZW1pdHRlciA9IHRhcmdldDtcbiAgICAgICAgdy50eXBlID0gdHlwZTtcbiAgICAgICAgdy5jb3VudCA9IGV4aXN0aW5nLmxlbmd0aDtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlID09PSAnb2JqZWN0JyAmJiBjb25zb2xlLndhcm4pIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJyVzOiAlcycsIHcubmFtZSwgdy5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0YXJnZXQ7XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbiBhZGRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICByZXR1cm4gX2FkZExpc3RlbmVyKHRoaXMsIHR5cGUsIGxpc3RlbmVyLCBmYWxzZSk7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kTGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIHByZXBlbmRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgICAgcmV0dXJuIF9hZGRMaXN0ZW5lcih0aGlzLCB0eXBlLCBsaXN0ZW5lciwgdHJ1ZSk7XG4gICAgfTtcblxuZnVuY3Rpb24gb25jZVdyYXBwZXIoKSB7XG4gIGlmICghdGhpcy5maXJlZCkge1xuICAgIHRoaXMudGFyZ2V0LnJlbW92ZUxpc3RlbmVyKHRoaXMudHlwZSwgdGhpcy53cmFwRm4pO1xuICAgIHRoaXMuZmlyZWQgPSB0cnVlO1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgY2FzZSAwOlxuICAgICAgICByZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0KTtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcmV0dXJuIHRoaXMubGlzdGVuZXIuY2FsbCh0aGlzLnRhcmdldCwgYXJndW1lbnRzWzBdKTtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcmV0dXJuIHRoaXMubGlzdGVuZXIuY2FsbCh0aGlzLnRhcmdldCwgYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0pO1xuICAgICAgY2FzZSAzOlxuICAgICAgICByZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0LCBhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSxcbiAgICAgICAgICAgIGFyZ3VtZW50c1syXSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgKytpKVxuICAgICAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIHRoaXMubGlzdGVuZXIuYXBwbHkodGhpcy50YXJnZXQsIGFyZ3MpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBfb25jZVdyYXAodGFyZ2V0LCB0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgc3RhdGUgPSB7IGZpcmVkOiBmYWxzZSwgd3JhcEZuOiB1bmRlZmluZWQsIHRhcmdldDogdGFyZ2V0LCB0eXBlOiB0eXBlLCBsaXN0ZW5lcjogbGlzdGVuZXIgfTtcbiAgdmFyIHdyYXBwZWQgPSBiaW5kLmNhbGwob25jZVdyYXBwZXIsIHN0YXRlKTtcbiAgd3JhcHBlZC5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICBzdGF0ZS53cmFwRm4gPSB3cmFwcGVkO1xuICByZXR1cm4gd3JhcHBlZDtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gb25jZSh0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgdGhpcy5vbih0eXBlLCBfb25jZVdyYXAodGhpcywgdHlwZSwgbGlzdGVuZXIpKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRPbmNlTGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIHByZXBlbmRPbmNlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpIHtcbiAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgIHRoaXMucHJlcGVuZExpc3RlbmVyKHR5cGUsIF9vbmNlV3JhcCh0aGlzLCB0eXBlLCBsaXN0ZW5lcikpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuLy8gRW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmIGFuZCBvbmx5IGlmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgICB2YXIgbGlzdCwgZXZlbnRzLCBwb3NpdGlvbiwgaSwgb3JpZ2luYWxMaXN0ZW5lcjtcblxuICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gICAgICBldmVudHMgPSB0aGlzLl9ldmVudHM7XG4gICAgICBpZiAoIWV2ZW50cylcbiAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgIGxpc3QgPSBldmVudHNbdHlwZV07XG4gICAgICBpZiAoIWxpc3QpXG4gICAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHwgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKC0tdGhpcy5fZXZlbnRzQ291bnQgPT09IDApXG4gICAgICAgICAgdGhpcy5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgZXZlbnRzW3R5cGVdO1xuICAgICAgICAgIGlmIChldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdC5saXN0ZW5lciB8fCBsaXN0ZW5lcik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGxpc3QgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcG9zaXRpb24gPSAtMTtcblxuICAgICAgICBmb3IgKGkgPSBsaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8IGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB7XG4gICAgICAgICAgICBvcmlnaW5hbExpc3RlbmVyID0gbGlzdFtpXS5saXN0ZW5lcjtcbiAgICAgICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgICAgaWYgKHBvc2l0aW9uID09PSAwKVxuICAgICAgICAgIGxpc3Quc2hpZnQoKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNwbGljZU9uZShsaXN0LCBwb3NpdGlvbik7XG5cbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKVxuICAgICAgICAgIGV2ZW50c1t0eXBlXSA9IGxpc3RbMF07XG5cbiAgICAgICAgaWYgKGV2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgb3JpZ2luYWxMaXN0ZW5lciB8fCBsaXN0ZW5lcik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID1cbiAgICBmdW5jdGlvbiByZW1vdmVBbGxMaXN0ZW5lcnModHlwZSkge1xuICAgICAgdmFyIGxpc3RlbmVycywgZXZlbnRzLCBpO1xuXG4gICAgICBldmVudHMgPSB0aGlzLl9ldmVudHM7XG4gICAgICBpZiAoIWV2ZW50cylcbiAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgICAgIGlmICghZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgICAgICAgIHRoaXMuX2V2ZW50c0NvdW50ID0gMDtcbiAgICAgICAgfSBlbHNlIGlmIChldmVudHNbdHlwZV0pIHtcbiAgICAgICAgICBpZiAoLS10aGlzLl9ldmVudHNDb3VudCA9PT0gMClcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50cyA9IG9iamVjdENyZWF0ZShudWxsKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBkZWxldGUgZXZlbnRzW3R5cGVdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBrZXlzID0gb2JqZWN0S2V5cyhldmVudHMpO1xuICAgICAgICB2YXIga2V5O1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICAgICAgdGhpcy5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgICAgICB0aGlzLl9ldmVudHNDb3VudCA9IDA7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICBsaXN0ZW5lcnMgPSBldmVudHNbdHlwZV07XG5cbiAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgICAgIH0gZWxzZSBpZiAobGlzdGVuZXJzKSB7XG4gICAgICAgIC8vIExJRk8gb3JkZXJcbiAgICAgICAgZm9yIChpID0gbGlzdGVuZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbmZ1bmN0aW9uIF9saXN0ZW5lcnModGFyZ2V0LCB0eXBlLCB1bndyYXApIHtcbiAgdmFyIGV2ZW50cyA9IHRhcmdldC5fZXZlbnRzO1xuXG4gIGlmICghZXZlbnRzKVxuICAgIHJldHVybiBbXTtcblxuICB2YXIgZXZsaXN0ZW5lciA9IGV2ZW50c1t0eXBlXTtcbiAgaWYgKCFldmxpc3RlbmVyKVxuICAgIHJldHVybiBbXTtcblxuICBpZiAodHlwZW9mIGV2bGlzdGVuZXIgPT09ICdmdW5jdGlvbicpXG4gICAgcmV0dXJuIHVud3JhcCA/IFtldmxpc3RlbmVyLmxpc3RlbmVyIHx8IGV2bGlzdGVuZXJdIDogW2V2bGlzdGVuZXJdO1xuXG4gIHJldHVybiB1bndyYXAgPyB1bndyYXBMaXN0ZW5lcnMoZXZsaXN0ZW5lcikgOiBhcnJheUNsb25lKGV2bGlzdGVuZXIsIGV2bGlzdGVuZXIubGVuZ3RoKTtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiBsaXN0ZW5lcnModHlwZSkge1xuICByZXR1cm4gX2xpc3RlbmVycyh0aGlzLCB0eXBlLCB0cnVlKTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmF3TGlzdGVuZXJzID0gZnVuY3Rpb24gcmF3TGlzdGVuZXJzKHR5cGUpIHtcbiAgcmV0dXJuIF9saXN0ZW5lcnModGhpcywgdHlwZSwgZmFsc2UpO1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIGlmICh0eXBlb2YgZW1pdHRlci5saXN0ZW5lckNvdW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGVtaXR0ZXIubGlzdGVuZXJDb3VudCh0eXBlKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbGlzdGVuZXJDb3VudC5jYWxsKGVtaXR0ZXIsIHR5cGUpO1xuICB9XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyQ291bnQgPSBsaXN0ZW5lckNvdW50O1xuZnVuY3Rpb24gbGlzdGVuZXJDb3VudCh0eXBlKSB7XG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHM7XG5cbiAgaWYgKGV2ZW50cykge1xuICAgIHZhciBldmxpc3RlbmVyID0gZXZlbnRzW3R5cGVdO1xuXG4gICAgaWYgKHR5cGVvZiBldmxpc3RlbmVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2UgaWYgKGV2bGlzdGVuZXIpIHtcbiAgICAgIHJldHVybiBldmxpc3RlbmVyLmxlbmd0aDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gMDtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudE5hbWVzID0gZnVuY3Rpb24gZXZlbnROYW1lcygpIHtcbiAgcmV0dXJuIHRoaXMuX2V2ZW50c0NvdW50ID4gMCA/IFJlZmxlY3Qub3duS2V5cyh0aGlzLl9ldmVudHMpIDogW107XG59O1xuXG4vLyBBYm91dCAxLjV4IGZhc3RlciB0aGFuIHRoZSB0d28tYXJnIHZlcnNpb24gb2YgQXJyYXkjc3BsaWNlKCkuXG5mdW5jdGlvbiBzcGxpY2VPbmUobGlzdCwgaW5kZXgpIHtcbiAgZm9yICh2YXIgaSA9IGluZGV4LCBrID0gaSArIDEsIG4gPSBsaXN0Lmxlbmd0aDsgayA8IG47IGkgKz0gMSwgayArPSAxKVxuICAgIGxpc3RbaV0gPSBsaXN0W2tdO1xuICBsaXN0LnBvcCgpO1xufVxuXG5mdW5jdGlvbiBhcnJheUNsb25lKGFyciwgbikge1xuICB2YXIgY29weSA9IG5ldyBBcnJheShuKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyArK2kpXG4gICAgY29weVtpXSA9IGFycltpXTtcbiAgcmV0dXJuIGNvcHk7XG59XG5cbmZ1bmN0aW9uIHVud3JhcExpc3RlbmVycyhhcnIpIHtcbiAgdmFyIHJldCA9IG5ldyBBcnJheShhcnIubGVuZ3RoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXQubGVuZ3RoOyArK2kpIHtcbiAgICByZXRbaV0gPSBhcnJbaV0ubGlzdGVuZXIgfHwgYXJyW2ldO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIG9iamVjdENyZWF0ZVBvbHlmaWxsKHByb3RvKSB7XG4gIHZhciBGID0gZnVuY3Rpb24oKSB7fTtcbiAgRi5wcm90b3R5cGUgPSBwcm90bztcbiAgcmV0dXJuIG5ldyBGO1xufVxuZnVuY3Rpb24gb2JqZWN0S2V5c1BvbHlmaWxsKG9iaikge1xuICB2YXIga2V5cyA9IFtdO1xuICBmb3IgKHZhciBrIGluIG9iaikgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGspKSB7XG4gICAga2V5cy5wdXNoKGspO1xuICB9XG4gIHJldHVybiBrO1xufVxuZnVuY3Rpb24gZnVuY3Rpb25CaW5kUG9seWZpbGwoY29udGV4dCkge1xuICB2YXIgZm4gPSB0aGlzO1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmbi5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpO1xuICB9O1xufVxuIiwiY29uc3QgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJyk7XHJcbmNvbnN0IHsgY29sb3JzLCBwYWxldHRlIH0gPSByZXF1aXJlKCcuL2RhdGEnKTtcclxuY29uc3QgeyByZ2IyaGV4IH0gPSByZXF1aXJlKCcuL3V0aWxzJyk7XHJcblxyXG5jbGFzcyBDb2xvclBpY2tlciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XHJcblx0XHRjb2xvcnMuZm9yRWFjaCgoY29sb3IsIGluZGV4KSA9PiB7XHJcblx0XHRcdHZhciByb3dJbmRleCA9IE1hdGguZmxvb3IoaW5kZXggLyAxNik7XHJcblx0XHRcdHZhciBidXR0b24gPSAkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpKTtcclxuXHRcdFx0YnV0dG9uLmRhdGEoJ3BpJywgaW5kZXgpO1xyXG5cdFx0XHRidXR0b24uYWRkQ2xhc3MoJ3BpY2tlci1idXR0b24nKTtcclxuXHRcdFx0YnV0dG9uLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICcjJyArIGNvbG9yLmhleCk7XHJcblx0XHRcdCQoJyNjcC1yb3ctJyArIChyb3dJbmRleCArIDEpKS5hcHBlbmQoYnV0dG9uKTtcclxuXHJcblx0XHRcdGJ1dHRvbi5jbGljayhmdW5jdGlvbigpIHtcclxuXHRcdFx0XHR2YXIgcGFsZXR0ZUJ1dHRvbiA9ICQoJy5wYWxldHRlLWJ1dHRvbi1zZWxlY3RlZCcpLmZpcnN0KCkuZmluZCgnLnBhbGV0dGUtYnV0dG9uJyk7XHJcblx0XHRcdFx0dmFyIGJnYyA9ICQodGhpcykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJyk7XHJcblx0XHRcdFx0aWYgKGJnYy5pbmRleE9mKCdyZ2InKSA9PT0gMCkge1xyXG5cdFx0XHRcdFx0YmdjID0gcmdiMmhleChiZ2MpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR2YXIgcGFsZXR0ZUluZGV4ID0gcGFyc2VJbnQocGFsZXR0ZUJ1dHRvbi5kYXRhKCdwaScpLCAxMCk7XHJcblx0XHRcdFx0cGFsZXR0ZUJ1dHRvbi5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAnIycgKyBiZ2MpO1xyXG5cdFx0XHRcdHBhbGV0dGVbcGFsZXR0ZUluZGV4XS5oZXggPSBiZ2M7XHJcblx0XHRcdFx0cGFsZXR0ZVtwYWxldHRlSW5kZXhdLmluZGV4ID0gcGFyc2VJbnQoJCh0aGlzKS5hdHRyKCdkYXRhLXBpJyksIDEwKTtcclxuXHJcblx0XHRcdFx0c2VsZi5lbWl0KCd1cGRhdGUnKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29sb3JQaWNrZXI7IiwiY29uc3QgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJyk7XHJcbmNvbnN0IHsgQ0hSLCBwYWxldHRlIH0gPSByZXF1aXJlKCcuL2RhdGEnKTtcclxuY29uc3QgeyBnZXRQYWxldHRlSW5kZXgsIGxvYWRDaHIsIHJlc2l6ZUNhbnZhcyB9ID0gcmVxdWlyZSgnLi91dGlscycpO1xyXG5cclxuY2xhc3MgRWRpdG9yIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmNockluZGV4ID0gMDtcclxuXHRcdHRoaXMuem9vbSA9IDE2O1xyXG5cdFx0dGhpcy5tb3VzZWRvd24gPSBmYWxzZTtcclxuXHRcdHRoaXMucGl4ZWxzID0gW107XHJcblxyXG5cdFx0Ly8gY3JlYXRlIGNhbnZhcyBmb3IgZWRpdG9yXHJcblx0XHRjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuXHRcdGNhbnZhcy5jbGFzc05hbWUgPSAnZWRpdG9yLWNhbnZhcyc7XHJcblx0XHRjYW52YXMuaWQgPSAnZWRpdG9yLWNhbnZhcyc7XHJcblx0XHQkKCcjZWRpdG9yLWNvbnRhaW5lcicpLmFwcGVuZChjYW52YXMpO1xyXG5cdFx0dGhpcy5jYW52YXMgPSBjYW52YXM7XHJcblx0XHR0aGlzLmN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuXHRcdC8vIGFkZCBkcmF3aW5nIGV2ZW50cyBmb3IgZWRpdG9yIGNhbnZhc1xyXG5cdFx0Y2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5kcmF3UGl4ZWwuYmluZCh0aGlzKSwgZmFsc2UpO1xyXG5cdFx0Y2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCAoKSA9PiB0aGlzLm1vdXNlZG93biA9IGZhbHNlKTtcclxuXHRcdGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsICgpID0+IHRoaXMubW91c2Vkb3duID0gZmFsc2UpO1xyXG5cdFx0Y2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGV2ID0+IHtcclxuXHRcdFx0dGhpcy5tb3VzZWRvd24gPSB0cnVlO1xyXG5cdFx0XHR0aGlzLmRyYXdQaXhlbChldik7XHJcblx0XHR9KTtcclxuXHRcdGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBldiA9PiB7XHJcblx0XHRcdGlmICh0aGlzLm1vdXNlZG93bikge1xyXG5cdFx0XHRcdHRoaXMuZHJhd1BpeGVsKGV2KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gbG9hZCBkZWZhdWx0IENIUiBkYXRhIGludG8gZWRpdG9yIGFuZCBkcmF3XHJcblx0XHR0aGlzLnVwZGF0ZUNocihudWxsLCB0aGlzLmNockluZGV4KTtcclxuXHR9XHJcblxyXG5cdGRyYXcoKSB7XHJcblx0XHRjb25zdCB7IGN0eCwgem9vbSB9ID0gdGhpcztcclxuXHRcdHRoaXMucGl4ZWxzLmZvckVhY2gocCA9PiB7XHJcblx0XHRcdGN0eC5maWxsU3R5bGUgPSAnIycgKyBwYWxldHRlW3AucGFsZXR0ZUluZGV4XS5oZXg7XHJcblx0XHRcdGN0eC5maWxsUmVjdChwLngsIHAueSwgem9vbSwgem9vbSk7XHJcblx0XHR9KTtcclxuXHRcdHRoaXMuZ3JpZC5kcmF3KCk7XHJcblx0XHR0aGlzLmRpdmlkZXJzLmRyYXcoKTtcclxuXHR9XHJcblxyXG5cdGRyYXdQaXhlbChldikge1xyXG5cdFx0Y29uc3QgeyBjaHJJbmRleCB9ID0gdGhpcztcclxuXHRcdGNvbnN0IGNockRhdGEgPSBDSFJbdGhpcy5jaHJJbmRleF07XHJcblx0XHRjb25zdCByZWN0ID0gdGhpcy5jYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblx0XHRjb25zdCB4ID0gZXYuY2xpZW50WCAtIHJlY3QubGVmdDtcclxuXHRcdGNvbnN0IHkgPSBldi5jbGllbnRZIC0gcmVjdC50b3A7XHJcblx0XHRpZiAoeCA8IDAgfHwgeCA+IGNockRhdGEud2lkdGggKiB0aGlzLnpvb20pIHsgcmV0dXJuOyB9XHJcblx0XHRpZiAoeSA8IDAgfHwgeSA+IGNockRhdGEuaGVpZ2h0ICogdGhpcy56b29tKSB7IHJldHVybjsgfVxyXG5cdFx0XHJcblx0XHRjb25zdCB4U2NhbGUgPSBNYXRoLmZsb29yKHggLyB0aGlzLnpvb20pO1xyXG5cdFx0Y29uc3QgeVNjYWxlID0gTWF0aC5mbG9vcih5IC8gdGhpcy56b29tKTtcclxuXHRcdGxldCBwaXhlbEluZGV4ID0gKHlTY2FsZSAqIGNockRhdGEud2lkdGgpICsgeFNjYWxlO1xyXG5cclxuXHRcdGlmIChjaHJEYXRhLndpZHRoID4gOCkge1xyXG5cdFx0XHRsZXQgb2Zmc2V0ID0gMDtcclxuXHRcdFx0aWYgKHhTY2FsZSA+PSBjaHJEYXRhLndpZHRoIC8gMikgeyBvZmZzZXQrKzsgfVxyXG5cdFx0XHRpZiAoeVNjYWxlID49IGNockRhdGEuaGVpZ2h0IC8gMikgeyBvZmZzZXQrKzsgfVxyXG5cdFx0XHRwaXhlbEluZGV4ID0gKDY0ICogb2Zmc2V0KSArICh5U2NhbGUgKiA4KSArICh4U2NhbGUgJSA4KTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBwYWxldHRlSW5kZXggPSBnZXRQYWxldHRlSW5kZXgoKTtcclxuXHRcdGNvbnNvbGUubG9nKHt4LCB5LCBwaXhlbEluZGV4IH0pO1xyXG5cdFx0dGhpcy5waXhlbHNbcGl4ZWxJbmRleF0ucGFsZXR0ZUluZGV4ID0gcGFsZXR0ZUluZGV4O1xyXG5cdFx0dGhpcy5kcmF3KCk7XHJcblx0XHR0aGlzLmVtaXQoJ3BpeGVsJywgeyBjaHJJbmRleCwgcGFsZXR0ZUluZGV4LCBwaXhlbEluZGV4IH0pO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlQ2hyKHRpbGVzLCBjaHJJbmRleCkge1xyXG5cdFx0dGhpcy5jaHJJbmRleCA9IGNockluZGV4O1xyXG5cdFx0Y29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBsb2FkQ2hyKHRpbGVzLCBjaHJJbmRleCwgdGhpcy5waXhlbHMsIHRoaXMuem9vbSk7XHJcblx0XHRyZXNpemVDYW52YXMuY2FsbCh0aGlzLCB0aGlzLmNhbnZhcywgd2lkdGgsIGhlaWdodCwgdGhpcy56b29tKTtcclxuXHRcdHRoaXMuZ3JpZCA9IG5ldyBHcmlkKHRoaXMpO1xyXG5cdFx0dGhpcy5kaXZpZGVycyA9IG5ldyBEaXZpZGVycyh0aGlzKTtcclxuXHRcdHRoaXMuZHJhdygpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgRGl2aWRlcnMge1xyXG5cdGNvbnN0cnVjdG9yKGVkaXRvcikge1xyXG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCB7XHJcblx0XHRcdHN0eWxlOiAncmdiYSgyNTUsMjU1LDI1NSwwLjgpJyxcclxuXHRcdFx0c2hvdzogdHJ1ZSxcclxuXHRcdFx0ZWRpdG9yXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGRyYXcoKSB7XHJcblx0XHRpZiAodGhpcy5zaG93KSB7XHJcblx0XHRcdGNvbnN0IHsgY3R4LCBoZWlnaHQsIHdpZHRoLCB6b29tIH0gPSB0aGlzLmVkaXRvcjtcclxuXHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gdGhpcy5zdHlsZTtcclxuXHRcdFx0Y3R4LmJlZ2luUGF0aCgpO1xyXG5cdFx0XHRjdHgubW92ZVRvKDAsIGhlaWdodCAqIHpvb20gLyAyKTtcclxuXHRcdFx0Y3R4LmxpbmVUbyh3aWR0aCAqIHpvb20sIGhlaWdodCAqIHpvb20gLyAyKTtcclxuXHRcdFx0Y3R4LnN0cm9rZSgpO1xyXG5cclxuXHRcdFx0Y3R4LmJlZ2luUGF0aCgpO1xyXG5cdFx0XHRjdHgubW92ZVRvKHdpZHRoICogem9vbSAvIDIsIDApO1xyXG5cdFx0XHRjdHgubGluZVRvKHdpZHRoICogem9vbSAvIDIsIGhlaWdodCAqIHpvb20pO1xyXG5cdFx0XHRjdHguc3Ryb2tlKCk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBHcmlkIHtcclxuXHRjb25zdHJ1Y3RvcihlZGl0b3IpIHtcclxuXHRcdE9iamVjdC5hc3NpZ24odGhpcywge1xyXG5cdFx0XHRzdHlsZTogJ3JnYmEoMjU1LDI1NSwyNTUsMC41KScsXHJcblx0XHRcdHNob3c6IHRydWUsXHJcblx0XHRcdGVkaXRvclxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRkcmF3KCkge1xyXG5cdFx0aWYgKHRoaXMuc2hvdykge1xyXG5cdFx0XHRjb25zdCB7IGN0eCwgaGVpZ2h0LCB3aWR0aCwgem9vbSB9ID0gdGhpcy5lZGl0b3I7XHJcblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuc3R5bGU7XHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgd2lkdGggKyAxOyBpKyspIHtcclxuXHRcdFx0XHRjdHguYmVnaW5QYXRoKCk7XHJcblx0XHRcdFx0Y3R4Lm1vdmVUbyhpICogem9vbSwgMCk7XHJcblx0XHRcdFx0Y3R4LmxpbmVUbyhpICogem9vbSwgaGVpZ2h0ICogem9vbSk7XHJcblx0XHRcdFx0Y3R4LnN0cm9rZSgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDxoZWlnaHQgKyAxOyBpKyspIHtcclxuXHRcdFx0XHRjdHguYmVnaW5QYXRoKCk7XHJcblx0XHRcdFx0Y3R4Lm1vdmVUbygwLCBpICogem9vbSk7XHJcblx0XHRcdFx0Y3R4LmxpbmVUbyh3aWR0aCAqIHpvb20sIGkgKiB6b29tKTtcclxuXHRcdFx0XHRjdHguc3Ryb2tlKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yOyIsImNvbnN0IHsgcGFsZXR0ZSB9ID0gcmVxdWlyZSgnLi9kYXRhJyk7XHJcblxyXG5jb25zdCB0ZW1wbGF0ZSA9IGBcclxuPGRpdiBjbGFzcz1cInBhbGV0dGUtYnV0dG9uLXNlbGVjdGlvblwiPlxyXG5cdDxkaXYgY2xhc3M9XCJwYWxldHRlLWJ1dHRvblwiPlxyXG5cdFx0PGRpdiBjbGFzcz1cInBhbGV0dGUtYnV0dG9uLWNvcm5lclwiPlxyXG5cdFx0XHQ8ZGl2IGNsYXNzPVwicGFsZXR0ZS1idXR0b24taW5kZXhcIj4xPC9kaXY+XHJcblx0XHQ8L2Rpdj5cclxuXHQ8L2Rpdj5cclxuPC9kaXY+XHJcbmA7XHJcblxyXG5jbGFzcyBQYWxldHRlIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHBhbGV0dGUuZm9yRWFjaCgocCwgaW5kZXgpID0+IHtcclxuXHRcdFx0Y29uc3QgZnVsbEJ1dHRvbiA9ICQodGVtcGxhdGUpO1xyXG5cdFx0XHRjb25zdCBidXR0b24gPSBmdWxsQnV0dG9uLmZpbmQoJy5wYWxldHRlLWJ1dHRvbicpO1xyXG5cclxuXHRcdFx0aWYgKGluZGV4ID09PSAwKSB7XHJcblx0XHRcdFx0ZnVsbEJ1dHRvbi5hZGRDbGFzcygncGFsZXR0ZS1idXR0b24tc2VsZWN0ZWQnKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRidXR0b24uY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJyMnICsgcC5oZXgpO1xyXG5cdFx0XHRidXR0b24uZGF0YSgncGknLCBpbmRleCk7XHJcblx0XHRcdGJ1dHRvbi5maW5kKCcucGFsZXR0ZS1idXR0b24taW5kZXgnKS50ZXh0KGluZGV4ID09PSAwID8gJ1gnIDogaW5kZXgpO1xyXG5cdFx0XHQkKCcjcGFsZXR0ZS1jb250YWluZXInKS5hcHBlbmQoZnVsbEJ1dHRvbik7XHJcblxyXG5cdFx0XHRidXR0b24uY2xpY2soZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0Y29uc3QgcGkgPSAkKHRoaXMpLmRhdGEoJ3BpJyk7XHJcblx0XHRcdFx0JCgnLnBhbGV0dGUtYnV0dG9uLXNlbGVjdGlvbicpLmVhY2goZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRjb25zdCBwYiA9ICQodGhpcykuZmluZCgnLnBhbGV0dGUtYnV0dG9uJyk7XHJcblx0XHRcdFx0XHRpZiAocGkgPT09IHBiLmRhdGEoJ3BpJykpIHtcclxuXHRcdFx0XHRcdFx0JCh0aGlzKS5hZGRDbGFzcygncGFsZXR0ZS1idXR0b24tc2VsZWN0ZWQnKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdCQodGhpcykucmVtb3ZlQ2xhc3MoJ3BhbGV0dGUtYnV0dG9uLXNlbGVjdGVkJyk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBhbGV0dGU7IiwiY29uc3QgQ29sb3JQaWNrZXIgPSByZXF1aXJlKCcuL0NvbG9yUGlja2VyJyk7XHJcbmNvbnN0IEVkaXRvciA9IHJlcXVpcmUoJy4vRWRpdG9yJyk7XHJcbmNvbnN0IFBhbGV0dGUgPSByZXF1aXJlKCcuL1BhbGV0dGUnKTtcclxuY29uc3QgVGlsZXMgPSByZXF1aXJlKCcuL1RpbGVzJyk7XHJcbmNvbnN0IFN0YXRlcyA9IHJlcXVpcmUoJy4vU3RhdGVzJyk7XHJcblxyXG5jbGFzcyBTcHJpdGVNYWtlciB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHRjb25zdCBlZGl0b3IgPSB0aGlzLmVkaXRvciA9IG5ldyBFZGl0b3IoKTtcclxuXHRcdGNvbnN0IHRpbGVzID0gdGhpcy50aWxlcyA9IG5ldyBUaWxlcygpO1xyXG5cdFx0Y29uc3Qgc3RhdGVzID0gdGhpcy5zdGF0ZXMgPSBuZXcgU3RhdGVzKHRoaXMudGlsZXMsIHRoaXMuZWRpdG9yLmNockluZGV4KTtcclxuXHRcdHRoaXMucGFsZXR0ZSA9IG5ldyBQYWxldHRlKCk7XHJcblx0XHR0aGlzLmNvbG9yUGlja2VyID0gbmV3IENvbG9yUGlja2VyKCk7XHJcblxyXG5cdFx0ZWRpdG9yLm9uKCdwaXhlbCcsIHRpbGVzLnVwZGF0ZVBpeGVsLmJpbmQodGlsZXMpKTtcclxuXHRcdHRpbGVzLm9uKCdjbGljaycsIGNockluZGV4ID0+IHtcclxuXHRcdFx0ZWRpdG9yLnVwZGF0ZUNocih0aWxlcywgY2hySW5kZXgpO1xyXG5cdFx0XHRzdGF0ZXMuc2hvd0FmZmVjdGVkKGNockluZGV4KTtcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5jb2xvclBpY2tlci5vbigndXBkYXRlJywgdGhpcy5kcmF3LmJpbmQodGhpcykpO1xyXG5cclxuXHRcdCQoJyNmcHMnKS5jaGFuZ2UodGhpcy5zdGF0ZXMudXBkYXRlRnBzLmJpbmQodGhpcy5zdGF0ZXMpKTtcclxuXHRcdCQoJyNhbmltYXRlVG9nZ2xlJykuY2hhbmdlKGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRzdGF0ZXMuYW5pbWF0ZSA9ICQodGhpcykucHJvcCgnY2hlY2tlZCcpO1xyXG5cdFx0XHRzdGF0ZXMudXBkYXRlRnBzKHN0YXRlcy5mcHMpO1xyXG5cdFx0fSk7XHJcblx0XHQkKCcjYWZmZWN0ZWRUb2dnbGUnKS5jaGFuZ2UoZnVuY3Rpb24oKSB7XHJcblx0XHRcdHN0YXRlcy5vbmx5U2hvd0FmZmVjdGVkID0gJCh0aGlzKS5wcm9wKCdjaGVja2VkJyk7XHJcblx0XHRcdHN0YXRlcy5zaG93QWZmZWN0ZWQoZWRpdG9yLmNockluZGV4KTtcclxuXHRcdH0pO1xyXG5cdFx0JCgnI3RyYW5zcGFyZW50VG9nZ2xlJykuY2hhbmdlKGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRzdGF0ZXMuYmFja2dyb3VuZFRyYW5zcGFyZW5jeSA9ICQodGhpcykucHJvcCgnY2hlY2tlZCcpO1xyXG5cdFx0XHRzdGF0ZXMuZHJhdygpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0JCgnI3Nwcml0ZS1wYXRjaCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0aWxlcy5leHBvcnQoKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0ZHJhdygpIHtcclxuXHRcdHRoaXMuZWRpdG9yLmRyYXcoKTtcclxuXHRcdHRoaXMudGlsZXMuZHJhdygpO1xyXG5cdFx0dGhpcy5zdGF0ZXMuZHJhdygpO1xyXG5cdH1cclxufVxyXG5cclxud2luZG93LlNwcml0ZU1ha2VyID0gU3ByaXRlTWFrZXI7IiwiY29uc3QgeyBDSFIsIHBhbGV0dGUsIHN0YXRlcyB9ID0gcmVxdWlyZSgnLi9kYXRhJyk7XHJcbmNvbnN0IHsgcmVzaXplQ2FudmFzIH0gPSByZXF1aXJlKCcuL3V0aWxzJyk7XHJcblxyXG5jbGFzcyBTdGF0ZXMge1xyXG5cdGNvbnN0cnVjdG9yKHRpbGVzLCBjaHJJbmRleCkge1xyXG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCB7XHJcblx0XHRcdGFuaW1hdGlvbnM6IFtdLFxyXG5cdFx0XHR6b29tOiAzLFxyXG5cdFx0XHRmcHM6IDMsXHJcblx0XHRcdGFuaW1hdGU6IHRydWUsXHJcblx0XHRcdG9ubHlTaG93QWZmZWN0ZWQ6IHRydWUsXHJcblx0XHRcdGJhY2tncm91bmRUcmFuc3BhcmVuY3k6IGZhbHNlXHJcblx0XHR9KTtcclxuXHJcblx0XHRzdGF0ZXMuZm9yRWFjaCgoc3RhdGUsIGluZGV4KSA9PiB7XHJcblx0XHRcdGNvbnN0IGNhbnZhcyA9ICQoJzxjYW52YXM+PC9jYW52YXM+Jyk7XHJcblx0XHRcdGNhbnZhcy5hZGRDbGFzcygnc3RhdGUtY2FudmFzJyk7XHJcblx0XHRcdGNhbnZhcy5hdHRyKCdkYXRhLXNpZCcsIGluZGV4KTtcclxuXHRcdFx0JCgnI3N0YXRlcycpLmFwcGVuZChjYW52YXMpO1xyXG5cdFx0XHRzdGF0ZS5jYW52YXMgPSBjYW52YXM7XHJcblx0XHRcdHN0YXRlLmN0eCA9IGNhbnZhc1swXS5nZXRDb250ZXh0KCcyZCcpO1xyXG5cdFx0XHRzdGF0ZS5mcmFtZUNvdW50ID0gMDtcclxuXHJcblx0XHRcdHN0YXRlLmZyYW1lcy5mb3JFYWNoKGZyYW1lID0+IHtcclxuXHRcdFx0XHRmcmFtZS5mb3JFYWNoKHBhcnQgPT4ge1xyXG5cdFx0XHRcdFx0cGFydC5waXhlbHMgPSB0aWxlcy5waXhlbHMuZmluZChwaXhlbHMgPT4ge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gcGl4ZWxzLm5hbWUgPT09IHBhcnQubmFtZTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmVzaXplQ2FudmFzLmNhbGwodGhpcywgY2FudmFzLCBzdGF0ZS53aWR0aCwgc3RhdGUuaGVpZ2h0LCB0aGlzLnpvb20pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy51cGRhdGVGcHModGhpcy5mcHMpO1xyXG5cdFx0dGhpcy5zaG93QWZmZWN0ZWQoY2hySW5kZXgpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlRnBzKGZwcykge1xyXG5cdFx0aWYgKCEkLmlzTnVtZXJpYyhmcHMpKSB7XHJcblx0XHRcdGZwcyA9ICQoJyNmcHMnKS52YWwoKTtcclxuXHRcdH1cclxuXHRcdHRoaXMuZnBzID0gZnBzO1xyXG5cdFx0aWYgKHRoaXMuaW50ZXJ2YWwpIHtcclxuXHRcdFx0Y2xlYXJJbnRlcnZhbCh0aGlzLmludGVydmFsKTtcclxuXHRcdH1cclxuXHRcdGlmICh0aGlzLmFuaW1hdGUgJiYgZnBzID4gMCkge1xyXG5cdFx0XHR0aGlzLmludGVydmFsID0gc2V0SW50ZXJ2YWwodGhpcy5kcmF3LmJpbmQodGhpcyksIDEwMDAgLyB0aGlzLmZwcyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRzaG93QWZmZWN0ZWQoY2hySW5kZXgpIHtcclxuXHRcdGNvbnN0IGNock5hbWUgPSBDSFJbY2hySW5kZXhdLm5hbWU7XHJcblx0XHRzdGF0ZXMuZm9yRWFjaCgoc3RhdGUsIGluZGV4KSA9PiB7XHJcblx0XHRcdGNvbnN0IGZvdW5kID0gIXRoaXMub25seVNob3dBZmZlY3RlZCB8fCBzdGF0ZS5mcmFtZXMuZmluZChmcmFtZSA9PiBmcmFtZS5maW5kKGYgPT4gZi5uYW1lID09PSBjaHJOYW1lKSk7XHJcblx0XHRcdGNvbnN0IHN0YXRlQ2FudmFzID0gJCgnY2FudmFzW2RhdGEtc2lkPVwiJyArIGluZGV4ICsgJ1wiXScpO1xyXG5cdFx0XHRpZiAoZm91bmQpIHtcclxuXHRcdFx0XHRzdGF0ZUNhbnZhcy5jc3MoJ2Rpc3BsYXknLCAnJyk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0c3RhdGVDYW52YXMuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRkcmF3KCkge1xyXG5cdFx0c3RhdGVzLmZvckVhY2goc3RhdGUgPT4ge1xyXG5cdFx0XHRjb25zdCB7IGN0eCB9ID0gc3RhdGU7XHJcblx0XHRcdGN0eC5jbGVhclJlY3QoMCwgMCwgc3RhdGUud2lkdGggKiB0aGlzLnpvb20sIHN0YXRlLmhlaWdodCAqIHRoaXMuem9vbSk7XHJcblxyXG5cdFx0XHRjb25zdCBmcmFtZSA9IHN0YXRlLmZyYW1lc1tzdGF0ZS5mcmFtZUNvdW50XTtcclxuXHRcdFx0ZnJhbWUuZm9yRWFjaChwYXJ0ID0+IHtcclxuXHRcdFx0XHRwYXJ0LnBpeGVscy5mb3JFYWNoKHAgPT4ge1xyXG5cdFx0XHRcdFx0Y3R4LmZpbGxTdHlsZSA9IHAucGFsZXR0ZUluZGV4ID09PSAwICYmIHRoaXMuYmFja2dyb3VuZFRyYW5zcGFyZW5jeSA/ICdyZ2JhKDAsMCwwLDApJyA6ICcjJyArIHBhbGV0dGVbcC5wYWxldHRlSW5kZXhdLmhleDtcclxuXHRcdFx0XHRcdGN0eC5maWxsUmVjdChcclxuXHRcdFx0XHRcdFx0cC54ICsgKHBhcnQueCA+IDAgPyA0ICogcGFydC54ICogdGhpcy56b29tIDogMCksIFxyXG5cdFx0XHRcdFx0XHRwLnkgKyAocGFydC55ID4gMCA/IDggKiBwYXJ0LnkgKiB0aGlzLnpvb20gOiAwKSwgXHJcblx0XHRcdFx0XHRcdHRoaXMuem9vbSwgXHJcblx0XHRcdFx0XHRcdHRoaXMuem9vbVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdHN0YXRlLmZyYW1lQ291bnQrKztcclxuXHRcdFx0aWYgKHN0YXRlLmZyYW1lQ291bnQgPj0gc3RhdGUuZnJhbWVzLmxlbmd0aCkge1xyXG5cdFx0XHRcdHN0YXRlLmZyYW1lQ291bnQgPSAwO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU3RhdGVzOyIsImNvbnN0IEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpO1xuY29uc3QgeyBDSFIsIHBhbGV0dGUgfSA9IHJlcXVpcmUoJy4vZGF0YScpO1xuY29uc3QgeyBsb2FkQ2hyLCByZXNpemVDYW52YXMgfSA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuY2xhc3MgVGlsZXMgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMucGl4ZWxzID0gW107XG5cdFx0dGhpcy56b29tID0gMztcblxuXHRcdGNvbnN0IHNlbGYgPSB0aGlzO1xuXHRcdENIUi5mb3JFYWNoKChjaHIsIGluZGV4KSA9PiB7XG5cdFx0XHRjb25zdCBjYW52YXMgPSAkKCc8Y2FudmFzPjwvY2FudmFzPicpO1xuXHRcdFx0Y2FudmFzLmFkZENsYXNzKCd0aWxlLWNhbnZhcycpO1xuXHRcdFx0Y2FudmFzLmRhdGEoJ3RpZCcsIGluZGV4KTtcblx0XHRcdGNhbnZhcy5jbGljaygoKSA9PiB7XG5cdFx0XHRcdHNlbGYuZW1pdCgnY2xpY2snLCBpbmRleCk7XG5cdFx0XHR9KTtcblx0XHRcdCQoJyN0aWxlcycpLmFwcGVuZChjYW52YXMpO1xuXG5cdFx0XHRjb25zdCBwaXhlbHMgPSBbXTtcblx0XHRcdHBpeGVscy5uYW1lID0gY2hyLm5hbWU7XG5cdFx0XHRwaXhlbHMub2Zmc2V0ID0gY2hyLm9mZnNldDtcblx0XHRcdHBpeGVscy5sYXlvdXQgPSBjaHIubGF5b3V0O1xuXHRcdFx0bG9hZENocihudWxsLCBpbmRleCwgcGl4ZWxzLCB0aGlzLnpvb20pO1xuXHRcdFx0dGhpcy5waXhlbHMucHVzaChwaXhlbHMpO1xuXG5cdFx0XHRwaXhlbHMuY2FudmFzID0gY2FudmFzO1xuXHRcdFx0cGl4ZWxzLmN0eCA9IGNhbnZhc1swXS5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdFx0cmVzaXplQ2FudmFzLmNhbGwodGhpcywgY2FudmFzWzBdLCBjaHIud2lkdGgsIGNoci5oZWlnaHQsIHRoaXMuem9vbSk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmRyYXcoKTtcblx0fVxuXG5cdHVwZGF0ZVBpeGVsKHsgY2hySW5kZXgsIHBhbGV0dGVJbmRleCwgcGl4ZWxJbmRleCB9KSB7XG5cdFx0dGhpcy5waXhlbHNbY2hySW5kZXhdW3BpeGVsSW5kZXhdLnBhbGV0dGVJbmRleCA9IHBhbGV0dGVJbmRleDtcblx0XHR0aGlzLmRyYXcoKTtcblx0fVxuXG5cdGRyYXcoKSB7XG5cdFx0dGhpcy5waXhlbHMuZm9yRWFjaChwaXhlbHMgPT4ge1xuXHRcdFx0cGl4ZWxzLmZvckVhY2gocCA9PiB7XG5cdFx0XHRcdHBpeGVscy5jdHguZmlsbFN0eWxlID0gJyMnICsgcGFsZXR0ZVtwLnBhbGV0dGVJbmRleF0uaGV4O1xuXHRcdFx0XHRwaXhlbHMuY3R4LmZpbGxSZWN0KHAueCwgcC55LCB0aGlzLnpvb20sIHRoaXMuem9vbSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdGV4cG9ydCgpIHtcblx0XHRjb25zdCBjaHJQaXhlbExlbmd0aCA9IDggKiA4O1xuXHRcdGNvbnN0IHNwcml0ZVBhdGNoZXMgPSBbXTtcblxuXHRcdHRoaXMucGl4ZWxzLmZvckVhY2gocGl4ZWxzID0+IHtcblx0XHRcdGNvbnN0IGJ5dGVzID0gW107XG5cdFx0XHRjb25zdCB7IG9mZnNldCB9ID0gcGl4ZWxzO1xuXHRcdFx0bGV0IHBpeGVsQ291bnQgPSAwO1xuXG5cdFx0XHRwaXhlbHMubGF5b3V0LmZvckVhY2gobGF5b3V0ID0+IHtcblx0XHRcdFx0Y29uc3QgcGl4ZWxPZmZzZXQgPSBsYXlvdXQgKiAxNjtcblx0XHRcdFx0bGV0IGJ5dGUxID0gJycsIGJ5dGUyID0gJyc7XG5cdFx0XHRcdGxldCBieXRlSW5kZXggPSAwO1xuXG5cdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgY2hyUGl4ZWxMZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdGNvbnN0IHsgcGFsZXR0ZUluZGV4IH0gPSBwaXhlbHNbcGl4ZWxDb3VudCsrXTtcblx0XHRcdFx0XHRieXRlMSArPSBwYWxldHRlSW5kZXggJSAyO1xuXHRcdFx0XHRcdGJ5dGUyICs9IHBhbGV0dGVJbmRleCA+IDEgPyAxIDogMDtcblx0XHRcdFx0XHRpZiAoaSAlIDggPT09IDcpIHtcblx0XHRcdFx0XHRcdGJ5dGVzW2J5dGVJbmRleCArIHBpeGVsT2Zmc2V0XSA9IHBhcnNlSW50KGJ5dGUxLCAyKTtcblx0XHRcdFx0XHRcdGJ5dGVzW2J5dGVJbmRleCArIHBpeGVsT2Zmc2V0ICsgOF0gPSBwYXJzZUludChieXRlMiwgMik7XG5cdFx0XHRcdFx0XHRieXRlSW5kZXgrKztcblx0XHRcdFx0XHRcdGlmIChieXRlSW5kZXggJSA4ID09PSAwKSB7XG5cdFx0XHRcdFx0XHRcdGJ5dGVJbmRleCArPSA4O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ynl0ZTEgPSAnJztcblx0XHRcdFx0XHRcdGJ5dGUyID0gJyc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHNwcml0ZVBhdGNoZXMucHVzaCh7IG9mZnNldCwgYnl0ZXMgfSk7XG5cdFx0fSk7XG5cblx0XHRjb25zdCBwYXRjaCA9ICdjb25zdCBzcHJpdGVQYXRjaGVzID0gJyArIEpTT04uc3RyaW5naWZ5KHNwcml0ZVBhdGNoZXMsIG51bGwsIDIpICsgcGF0Y2hUZW1wbGF0ZTtcblx0XHRjb25zb2xlLmxvZyhwYXRjaCk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUaWxlcztcblxuY29uc3QgcGF0Y2hUZW1wbGF0ZSA9IGA7XG5cbmNvbnN0IG9mZnNldHMgPSBbIDAsIDB4MjAwMCwgMHg0MDAwLCAweDYwMDAsIDB4ODAwMCwgMHg5MDAwLCAweEIwMDAsIDB4MTcwMDAgXTtcbmNvbnN0IGZpbmFsU3ByaXRlUGF0Y2ggPSBbXTtcbmZvciAobGV0IGkgPSAwOyBpIDwgb2Zmc2V0cy5sZW5ndGg7IGkrKykge1xuXHRzcHJpdGVQYXRjaGVzLmZvckVhY2goc3AgPT4ge1xuXHRcdGZpbmFsU3ByaXRlUGF0Y2gucHVzaCh7XG5cdFx0XHRvZmZzZXQ6IHNwLm9mZnNldCArIG9mZnNldHNbaV0sXG5cdFx0XHRieXRlczogc3AuYnl0ZXMuc2xpY2UoMClcblx0XHR9KTtcblx0fSk7XG59XG5cbi8vIHBhbGV0dGVcbmZpbmFsU3ByaXRlUGF0Y2gucHVzaCh7XG5cdG9mZnNldDogMTE3NDM5LFxuXHRieXRlczogW1xuXHRcdDE1LFxuXHRcdDYsXG5cdFx0NDhcblx0XVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRpZDogJ3Rlc3Qtc3ByaXRlJyxcblx0bmFtZTogJ1Rlc3QgU3ByaXRlJyxcblx0ZGVzY3JpcHRpb246ICdjdjJyLmNvbSBTcHJpdGUgTWFrZXIgdGVzdCBzcHJpdGUnLFxuXHRwYXRjaDogZmluYWxTcHJpdGVQYXRjaFxufTtcbmA7IiwiLy8gRE8gTk9UIEVESVQgVEhJUyBGSUxFIERJUkVDVExZISBUaGlzIGZpbGUgaGFzIGJlZW4gZ2VuZXJhdGVkIHZpYSBhIFJPTSBzcHJpdGVcclxuLy8gZXh0cmFjdGlvbiB0b29sIGxvY2F0ZWQgYXQgdG9vbHMvc3ByaXRlLWV4dHJhY3QuanNcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdENIUjogW1xyXG5cdFx0e1xyXG5cdFx0XHRuYW1lOiAnc2ltb25JZGxlVG9wJyxcclxuXHRcdFx0aGVpZ2h0OiAxNixcclxuXHRcdFx0d2lkdGg6IDE2LFxyXG5cdFx0XHRvZmZzZXQ6IDEzNTIxNixcclxuXHRcdFx0bGF5b3V0OiBbXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQyLFxyXG5cdFx0XHRcdDEsXHJcblx0XHRcdFx0M1xyXG5cdFx0XHRdLFxyXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwzLDEsMSwxLDAsMCwwLDEsMSwzLDIsMSwwLDAsMCwxLDMsMywyLDEsMCwwLDAsMSwzLDIsMSwxLDAsMCwwLDEsMSwxLDMsMywwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDEsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDIsMSwwLDAsMSwyLDIsMSwxLDEsMCwwLDAsMCwwLDAsMSwzLDIsMiwwLDAsMCwwLDAsMSwxLDEsMCwxLDEsMCwxLDEsMywxLDEsMywzLDEsMSwxLDEsMSwxLDMsMywzLDMsMSwxLDEsMCwxLDMsMywzLDEsMSwxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMCwwLDAsMCwxLDEsMiwxLDIsMSwxLDEsMSwwLDEsMSwyLDIsMSwxLDEsMSwxLDEsMiwyLDEsMSwxLDEsMSwxLDIsMiwxLDMsMSwwLDEsMSwyLDIsMSwxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMSwxLDEsMSwxLDAsMCwwLDIsMSwxLDIsMiwxLDAsMF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6ICdzaW1vbklkbGVCb3R0b20nLFxyXG5cdFx0XHRoZWlnaHQ6IDE2LFxyXG5cdFx0XHR3aWR0aDogMTYsXHJcblx0XHRcdG9mZnNldDogMTM1MjgwLFxyXG5cdFx0XHRsYXlvdXQ6IFtcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDIsXHJcblx0XHRcdFx0MSxcclxuXHRcdFx0XHQzXHJcblx0XHRcdF0sXHJcblx0XHRcdGRhdGE6IFswLDAsMCwwLDAsMCwyLDIsMCwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwzLDEsMSwwLDAsMCwwLDMsMSwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwxLDEsMSwwLDAsMCwwLDEsMywxLDEsMCwwLDIsMiwyLDIsMiwxLDAsMCwxLDIsMiwyLDIsMSwwLDAsMSwxLDEsMSwxLDEsMCwwLDEsMywxLDEsMSwwLDAsMCwxLDMsMSwxLDEsMCwwLDAsMCwxLDEsMSwxLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwwLDAsMSwxLDMsMSwwLDAsMCwwLDEsMywzLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwwLDEsMywxLDEsMCwwLDEsMSwzLDMsMywxLDAsMCwxLDMsMywzLDMsMSwwLDAsMSwxLDEsMSwxLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwzLDMsMSwxLDAsMCwwLDAsMSwzLDMsMSwxLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwwLDEsMywzLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDEsMywzLDMsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMCwwLDAsMCwwXVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ3NpbW9uV2FsazFUb3AnLFxyXG5cdFx0XHRoZWlnaHQ6IDE2LFxyXG5cdFx0XHR3aWR0aDogMTYsXHJcblx0XHRcdG9mZnNldDogMTM1MzQ0LFxyXG5cdFx0XHRsYXlvdXQ6IFtcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDIsXHJcblx0XHRcdFx0MSxcclxuXHRcdFx0XHQzXHJcblx0XHRcdF0sXHJcblx0XHRcdGRhdGE6IFswLDAsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMSwwLDAsMSwzLDEsMSwxLDEsMSwwLDEsMSwzLDIsMSwxLDEsMCwxLDMsMywyLDIsMSwxLDAsMSwzLDIsMiwxLDEsMSwwLDEsMSwxLDEsMiwzLDIsMCwwLDAsMSwxLDMsMiwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDIsMSwwLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwwLDAsMCwwLDEsMiwxLDEsMSwzLDAsMCwxLDIsMiwxLDEsMSwwLDAsMSwxLDIsMiwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDEsMywxLDEsMywwLDAsMSwzLDMsMywzLDMsMCwwLDEsMywzLDMsMywzLDAsMCwwLDEsMSwxLDEsMSwxLDEsMSwwLDAsMCwwLDAsMywxLDEsMCwwLDAsMCwwLDEsMSwxLDEsMCwwLDAsMCwzLDEsMSwxLDAsMCwwLDAsMywzLDEsMSwwLDAsMCwwLDMsMywxLDAsMCwwLDAsMCwxLDEsMSwwLDAsMCwwLDAsMSwyLDEsMCwwLDAsMCwwXVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ3NpbW9uV2FsazFCb3R0b20nLFxyXG5cdFx0XHRoZWlnaHQ6IDE2LFxyXG5cdFx0XHR3aWR0aDogMTYsXHJcblx0XHRcdG9mZnNldDogMTM1NDA4LFxyXG5cdFx0XHRsYXlvdXQ6IFtcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDIsXHJcblx0XHRcdFx0MSxcclxuXHRcdFx0XHQzXHJcblx0XHRcdF0sXHJcblx0XHRcdGRhdGE6IFswLDAsMCwwLDEsMiwyLDIsMCwwLDAsMCwxLDEsMSwxLDAsMCwwLDEsMywxLDMsMSwwLDAsMCwxLDEsMSwzLDEsMCwwLDAsMSwxLDEsMywxLDAsMCwwLDEsMSwxLDMsMSwwLDAsMCwwLDEsMSwxLDEsMCwwLDAsMCwwLDEsMSwxLDIsMiwxLDAsMCwwLDAsMCwxLDEsMSwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMywzLDAsMCwwLDAsMCwwLDEsMywwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwxLDMsMCwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDAsMCwzLDEsMCwwLDAsMCwwLDAsMywxLDEsMCwwLDAsMCwwLDMsMywxLDAsMCwwLDAsMCwzLDMsMSwxLDAsMCwwLDAsMywzLDMsMSwwLDAsMCwwLDMsMywzLDEsMCwwLDAsMCwxLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwXVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ3NpbW9uV2FsazJUb3AnLFxyXG5cdFx0XHRoZWlnaHQ6IDE2LFxyXG5cdFx0XHR3aWR0aDogMTYsXHJcblx0XHRcdG9mZnNldDogMTM1NDcyLFxyXG5cdFx0XHRsYXlvdXQ6IFtcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDIsXHJcblx0XHRcdFx0MSxcclxuXHRcdFx0XHQzXHJcblx0XHRcdF0sXHJcblx0XHRcdGRhdGE6IFswLDAsMCwwLDAsMCwwLDAsMCwwLDEsMSwxLDEsMSwwLDAsMSwxLDEsMSwxLDEsMSwwLDEsMywxLDEsMSwxLDEsMCwxLDEsMywyLDEsMSwxLDAsMSwzLDMsMiwyLDEsMSwwLDEsMywyLDIsMiwxLDEsMCwxLDEsMSwyLDEsMSwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwwLDEsMywyLDIsMSwwLDAsMCwzLDIsMiwxLDEsMCwwLDAsMCwwLDAsMSwxLDEsMiwxLDAsMCwwLDIsMSwyLDIsMSwwLDAsMCwxLDIsMiwyLDIsMCwxLDEsMSwyLDIsMiwyLDEsMywzLDEsMSwyLDIsMiwxLDMsMywzLDEsMSwxLDEsMSwzLDMsMSwxLDEsMSwxLDAsMSwxLDAsMCwxLDEsMiwxLDEsMSwxLDEsMSwwLDAsMSwzLDEsMSwxLDEsMSwwLDEsMSwzLDEsMSwzLDMsMSwyLDEsMSwxLDMsMywzLDEsMSwxLDEsMSwxLDMsMywxLDEsMSwxLDMsMywzLDMsMSwxLDIsMSwzLDMsMywxLDAsMiwyLDEsMSwzLDMsMSwwXVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ3NpbW9uV2FsazJCb3R0b20nLFxyXG5cdFx0XHRoZWlnaHQ6IDE2LFxyXG5cdFx0XHR3aWR0aDogMTYsXHJcblx0XHRcdG9mZnNldDogMTM1NTM2LFxyXG5cdFx0XHRsYXlvdXQ6IFtcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDIsXHJcblx0XHRcdFx0MSxcclxuXHRcdFx0XHQzXHJcblx0XHRcdF0sXHJcblx0XHRcdGRhdGE6IFswLDAsMCwwLDAsMCwxLDIsMCwwLDAsMCwwLDEsMiwxLDAsMCwwLDAsMCwxLDMsMSwwLDAsMCwwLDEsMywxLDEsMCwwLDAsMSwzLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMSwxLDEsMSwxLDAsMCwwLDEsMywzLDEsMSwwLDIsMiwyLDEsMSwxLDAsMCwxLDIsMiwyLDIsMSwwLDAsMSwxLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMCwzLDEsMSwxLDAsMCwwLDAsMywxLDEsMSwxLDAsMCwwLDAsMSwxLDMsMSwxLDAsMCwwLDEsMywzLDMsMSwwLDAsMCwxLDMsMywzLDEsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDEsMywzLDEsMCwwLDAsMSwzLDMsMywxLDAsMCwxLDMsMywzLDMsMSwwLDAsMSwxLDEsMSwxLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDAsMSwzLDMsMSwxLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwwLDAsMSwzLDMsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDEsMywzLDMsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMCwwLDAsMCwwXVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRnJvbnRMZWcnLFxyXG5cdFx0XHRoZWlnaHQ6IDgsXHJcblx0XHRcdHdpZHRoOiA4LFxyXG5cdFx0XHRvZmZzZXQ6IDEzNTYwMCxcclxuXHRcdFx0bGF5b3V0OiBbXHJcblx0XHRcdFx0MFxyXG5cdFx0XHRdLFxyXG5cdFx0XHRkYXRhOiBbMCwxLDEsMSwxLDEsMSwyLDEsMywzLDEsMSwxLDEsMSwxLDMsMywzLDEsMSwxLDEsMSwzLDMsMywxLDEsMSwzLDAsMSwzLDMsMSwxLDMsMSwwLDAsMSwzLDMsMSwxLDEsMCwxLDMsMywzLDEsMSwxLDEsMywzLDMsMywzLDEsMV1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MScsXHJcblx0XHRcdGhlaWdodDogOCxcclxuXHRcdFx0d2lkdGg6IDgsXHJcblx0XHRcdG9mZnNldDogMTM1NjE2LFxyXG5cdFx0XHRsYXlvdXQ6IFtcclxuXHRcdFx0XHQwXHJcblx0XHRcdF0sXHJcblx0XHRcdGRhdGE6IFswLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwXVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXHJcblx0XHRcdGhlaWdodDogOCxcclxuXHRcdFx0d2lkdGg6IDgsXHJcblx0XHRcdG9mZnNldDogMTM1NjMyLFxyXG5cdFx0XHRsYXlvdXQ6IFtcclxuXHRcdFx0XHQwXHJcblx0XHRcdF0sXHJcblx0XHRcdGRhdGE6IFsyLDIsMiwyLDIsMSwwLDAsMiwyLDIsMiwyLDEsMCwwLDEsMiwyLDIsMiwxLDEsMCwxLDEsMiwyLDEsMywzLDEsMSwxLDEsMSwzLDMsMywxLDEsMSwzLDMsMywxLDMsMSwxLDMsMSwxLDEsMSwzLDEsMSwxLDAsMSwxLDMsMywxXVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcclxuXHRcdFx0aGVpZ2h0OiA4LFxyXG5cdFx0XHR3aWR0aDogOCxcclxuXHRcdFx0b2Zmc2V0OiAxMzU2NDgsXHJcblx0XHRcdGxheW91dDogW1xyXG5cdFx0XHRcdDBcclxuXHRcdFx0XSxcclxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDBdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRuYW1lOiAnc2ltb25TdGFpcnNEYW1hZ2VMZWcnLFxyXG5cdFx0XHRoZWlnaHQ6IDE2LFxyXG5cdFx0XHR3aWR0aDogOCxcclxuXHRcdFx0b2Zmc2V0OiAxMzU2NjQsXHJcblx0XHRcdGxheW91dDogW1xyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MVxyXG5cdFx0XHRdLFxyXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDEsMSwyLDAsMCwwLDAsMSwzLDEsMSwwLDAsMCwxLDMsMSwxLDEsMCwwLDAsMSwzLDEsMSwxLDAsMCwxLDMsMSwxLDEsMSwwLDAsMSwxLDEsMSwxLDMsMCwwLDEsMSwxLDEsMCwxLDAsMSwxLDEsMSwwLDAsMCwwLDEsMywzLDMsMSwwLDAsMCwxLDMsMywzLDEsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwwLDEsMywzLDEsMCwwLDAsMCwxLDMsMywzLDEsMCwwLDEsMywzLDMsMSwxLDAsMSwzLDMsMywxLDAsMCwwXVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJXYWxrVXBMZWdzJyxcclxuXHRcdFx0aGVpZ2h0OiAxNixcclxuXHRcdFx0d2lkdGg6IDE2LFxyXG5cdFx0XHRvZmZzZXQ6IDEzNTY5NixcclxuXHRcdFx0bGF5b3V0OiBbXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQyLFxyXG5cdFx0XHRcdDEsXHJcblx0XHRcdFx0M1xyXG5cdFx0XHRdLFxyXG5cdFx0XHRkYXRhOiBbMCwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMCwxLDMsMywzLDEsMSwxLDAsMCwxLDMsMywxLDAsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDEsMywzLDMsMywxLDAsMSwzLDMsMywzLDMsMSwyLDIsMiwyLDIsMSwwLDAsMiwyLDIsMiwyLDEsMCwwLDEsMSwyLDIsMiwxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMSwzLDEsMSwxLDAsMCwwLDEsMywxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDEsMywxLDEsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDEsMSwzLDMsMSwwLDAsMCwwLDEsMywzLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDAsMSwzLDMsMywxLDAsMCwxLDMsMywzLDEsMSwwLDEsMywzLDMsMSwwLDAsMF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AxJyxcclxuXHRcdFx0aGVpZ2h0OiAxNixcclxuXHRcdFx0d2lkdGg6IDE2LFxyXG5cdFx0XHRvZmZzZXQ6IDEzNTc2MCxcclxuXHRcdFx0bGF5b3V0OiBbXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQyLFxyXG5cdFx0XHRcdDEsXHJcblx0XHRcdFx0M1xyXG5cdFx0XHRdLFxyXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMSwxLDEsMCwwLDAsMSwxLDEsMSwxLDEsMCwwLDEsMywzLDEsMSwxLDAsMCwxLDEsMywzLDEsMSwwLDAsMSwzLDMsMiwxLDEsMCwxLDEsMiwyLDEsMSwxLDEsMiwxLDEsMSwxLDEsMywwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDEsMSwwLDAsMCwwLDAsMywyLDEsMSwwLDEsMSwwLDEsMSwxLDIsMiwxLDEsMSwxLDIsMiwyLDIsMSwxLDEsMSwyLDIsMiwyLDEsMSwxLDEsMiwyLDIsMiwyLDIsMSwxLDEsMSwxLDIsMiwxLDEsMSwxLDEsMSwxLDEsMSwwLDEsMSwxLDEsMSwxLDAsMCwyLDIsMiwyLDIsMSwwLDAsMSwyLDIsMSwxLDMsMywxLDEsMSwxLDAsMSwzLDMsMywxLDEsMSwxLDEsMSwzLDEsMSwxLDEsMywzLDMsMSwwLDEsMSwxLDMsMywzLDEsMCwwLDEsMSwxLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AyJyxcclxuXHRcdFx0aGVpZ2h0OiAxNixcclxuXHRcdFx0d2lkdGg6IDE2LFxyXG5cdFx0XHRvZmZzZXQ6IDEzNTg4OCxcclxuXHRcdFx0bGF5b3V0OiBbXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQyLFxyXG5cdFx0XHRcdDEsXHJcblx0XHRcdFx0M1xyXG5cdFx0XHRdLFxyXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMSwwLDAsMSwzLDMsMSwxLDEsMSwwLDEsMSwzLDMsMSwxLDEsMCwxLDMsMywyLDEsMywzLDEsMSwyLDIsMSwzLDMsMywzLDAsMSwxLDIsMSwzLDMsMywwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDEsMSwxLDEsMSwwLDAsMywzLDMsMywzLDMsMSwxLDAsMSwyLDEsMSwzLDMsMiwxLDIsMSwxLDMsMywyLDEsMSwyLDEsMSwyLDIsMiwxLDEsMiwyLDEsMSwyLDEsMSwwLDEsMiwyLDEsMSwxLDEsMCwxLDEsMSwxLDEsMSwwLDEsMSwxLDEsMSwxLDAsMCwyLDIsMiwyLDIsMSwwLDAsMSwxLDEsMSwxLDEsMywzLDAsMCwwLDAsMCwwLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AzJyxcclxuXHRcdFx0aGVpZ2h0OiAxNixcclxuXHRcdFx0d2lkdGg6IDE2LFxyXG5cdFx0XHRvZmZzZXQ6IDEzNTk4NCxcclxuXHRcdFx0bGF5b3V0OiBbXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQyLFxyXG5cdFx0XHRcdDEsXHJcblx0XHRcdFx0M1xyXG5cdFx0XHRdLFxyXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwzLDEsMSwxLDAsMCwwLDEsMywzLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDEsMywzLDIsMSwxLDAsMSwzLDIsMiwyLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDEsMSwxLDEsMSwxLDAsMCwyLDIsMiwxLDIsMywxLDAsMiwyLDIsMSwxLDEsMSwwLDAsMSwyLDIsMiwxLDEsMiwxLDEsMSwxLDEsMSwxLDIsMywxLDEsMSwxLDEsMSwyLDMsMSwxLDEsMSwxLDIsMiwzLDMsMSwxLDAsMCwxLDIsMywxLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwxLDEsMiwyLDIsMiwxLDEsMSwwLDIsMiwyLDIsMSwxLDEsMSwyLDIsMiwyLDEsMSwzLDEsMiwyLDIsMiwxLDMsMywxLDIsMSwxLDEsMSwxLDEsMCwxLDEsMSwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDIsMiwyLDIsMiwxLDAsMF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6ICdzaW1vbkhhbmQnLFxyXG5cdFx0XHRoZWlnaHQ6IDgsXHJcblx0XHRcdHdpZHRoOiA4LFxyXG5cdFx0XHRvZmZzZXQ6IDEzNjA2NCxcclxuXHRcdFx0bGF5b3V0OiBbXHJcblx0XHRcdFx0MFxyXG5cdFx0XHRdLFxyXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMSwxLDEsMSwzLDAsMCwxLDEsMywzLDMsMywwLDAsMSwzLDMsMywzLDMsMCwwLDEsMSwzLDMsMSwxLDAsMCwwLDEsMCwxLDEsMF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6ICdzaW1vbkRhbWFnZVRvcCcsXHJcblx0XHRcdGhlaWdodDogMTYsXHJcblx0XHRcdHdpZHRoOiAxNixcclxuXHRcdFx0b2Zmc2V0OiAxMzYxNDQsXHJcblx0XHRcdGxheW91dDogW1xyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MixcclxuXHRcdFx0XHQxLFxyXG5cdFx0XHRcdDNcclxuXHRcdFx0XSxcclxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDAsMSwxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDMsMiwxLDEsMSwxLDEsMywyLDIsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwxLDEsMCwwLDAsMSwxLDEsMywyLDEsMCwwLDEsMSwyLDEsMSwyLDEsMCwxLDEsMSwxLDEsMywyLDIsMSwxLDEsMywxLDEsMiwxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMCwwLDEsMSwxLDEsMCwwLDEsMSwxLDEsMSwxLDAsMSwzLDMsMSwxLDEsMSwwLDEsMywzLDMsMSwxLDEsMCwwLDEsMSwxLDEsMSwxLDIsMSwyLDIsMSwxLDEsMCwxLDEsMiwyLDIsMSwxLDEsMSwxLDIsMiwyLDEsMSwxLDEsMSwyLDIsMiwxLDEsMSwxLDIsMiwyLDIsMywzLDEsMSwyLDIsMiwxLDMsMSwwLDIsMiwyLDEsMSwxLDAsMCwxLDEsMSwxLDEsMSwwLDBdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRuYW1lOiAnc2ltb25EZWFkTGVmdCcsXHJcblx0XHRcdGhlaWdodDogMTYsXHJcblx0XHRcdHdpZHRoOiAxNixcclxuXHRcdFx0b2Zmc2V0OiAxMzYyMDgsXHJcblx0XHRcdGxheW91dDogW1xyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MixcclxuXHRcdFx0XHQxLFxyXG5cdFx0XHRcdDNcclxuXHRcdFx0XSxcclxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMSwwLDAsMCwwLDEsMSwxLDEsMCwxLDEsMSwxLDEsMSwyLDEsMywxLDEsMiwyLDEsMiwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwxLDEsMSwxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMSwxLDEsMSwzLDEsMCwxLDEsMSwxLDMsMywzLDAsMSwxLDEsMSwyLDIsMiwxLDEsMSwxLDEsMiwyLDEsMSwxLDEsMSwxLDEsMSwwLDMsMiwyLDEsMSwyLDEsMiwyLDIsMSwxLDEsMSwxLDEsMiwyLDIsMSwxLDEsMSwxLDEsMiwxLDEsMSwxLDEsMSwxLDEsMSwxLDMsMSwxLDEsMSwxLDEsMywzLDMsMSwxLDEsMywzLDMsMywzLDEsMSwwLDMsMywxLDEsMSwxLDFdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRuYW1lOiAnc2ltb25EZWFkUmlnaHQnLFxyXG5cdFx0XHRoZWlnaHQ6IDE2LFxyXG5cdFx0XHR3aWR0aDogMTYsXHJcblx0XHRcdG9mZnNldDogMTM2MjcyLFxyXG5cdFx0XHRsYXlvdXQ6IFtcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDIsXHJcblx0XHRcdFx0MSxcclxuXHRcdFx0XHQzXHJcblx0XHRcdF0sXHJcblx0XHRcdGRhdGE6IFswLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDIsMSwwLDAsMCwwLDAsMCwxLDEsMSwwLDAsMCwwLDAsMSwxLDIsMSwwLDAsMCwwLDIsMiwxLDIsMSwwLDAsMCwyLDIsMiwxLDIsMSwwLDAsMiwyLDIsMSwxLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMiwyLDEsMSwxLDEsMCwwLDIsMSwxLDEsMSwxLDEsMCwxLDEsMSwzLDEsMSwxLDEsMSwxLDEsMSwzLDEsMSwxLDEsMywxLDEsMSwzLDEsMSwxLDMsMSwzLDEsMSwzLDEsMSwxLDEsMywzLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMSwxLDEsMSwxLDAsMCwzLDMsMywxLDMsMywxLDAsMSwzLDMsMywzLDMsMSwwLDEsMywzLDEsMywzLDMsMSwxLDEsMSwxLDMsMywzLDEsMywzLDEsMSwxLDMsMywxXVxyXG5cdFx0fVxyXG5cdF0sXHJcblx0c3RhdGVzOiBbXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6ICdpZGxlJyxcclxuXHRcdFx0aGVpZ2h0OiAzMixcclxuXHRcdFx0d2lkdGg6IDE2LFxyXG5cdFx0XHRmcmFtZXM6IFtcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVUb3AnLFxyXG5cdFx0XHRcdFx0XHR4OiAwLFxyXG5cdFx0XHRcdFx0XHR5OiAwXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlQm90dG9tJyxcclxuXHRcdFx0XHRcdFx0eDogMCxcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ2Nyb3VjaCcsXHJcblx0XHRcdGhlaWdodDogMzIsXHJcblx0XHRcdHdpZHRoOiAxNixcclxuXHRcdFx0ZnJhbWVzOiBbXHJcblx0XHRcdFx0W1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlVG9wJyxcclxuXHRcdFx0XHRcdFx0eDogMCxcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRnJvbnRMZWcnLFxyXG5cdFx0XHRcdFx0XHR4OiAwLFxyXG5cdFx0XHRcdFx0XHR5OiAyXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkxJyxcclxuXHRcdFx0XHRcdFx0eDogMCxcclxuXHRcdFx0XHRcdFx0eTogM1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogM1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ3dhbGsnLFxyXG5cdFx0XHRoZWlnaHQ6IDMyLFxyXG5cdFx0XHR3aWR0aDogMTYsXHJcblx0XHRcdGZyYW1lczogW1xyXG5cdFx0XHRcdFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSWRsZVRvcCcsXHJcblx0XHRcdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0XHRcdHk6IDBcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVCb3R0b20nLFxyXG5cdFx0XHRcdFx0XHR4OiAwLFxyXG5cdFx0XHRcdFx0XHR5OiAyXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsxVG9wJyxcclxuXHRcdFx0XHRcdFx0eDogMCxcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2FsazFCb3R0b20nLFxyXG5cdFx0XHRcdFx0XHR4OiAwLFxyXG5cdFx0XHRcdFx0XHR5OiAyXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsyVG9wJyxcclxuXHRcdFx0XHRcdFx0eDogMCxcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2FsazJCb3R0b20nLFxyXG5cdFx0XHRcdFx0XHR4OiAwLFxyXG5cdFx0XHRcdFx0XHR5OiAyXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsxVG9wJyxcclxuXHRcdFx0XHRcdFx0eDogMCxcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2FsazFCb3R0b20nLFxyXG5cdFx0XHRcdFx0XHR4OiAwLFxyXG5cdFx0XHRcdFx0XHR5OiAyXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRuYW1lOiAnd2FsayAoZG93biBzdGFpcnMpJyxcclxuXHRcdFx0aGVpZ2h0OiAzMixcclxuXHRcdFx0d2lkdGg6IDE2LFxyXG5cdFx0XHRmcmFtZXM6IFtcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVUb3AnLFxyXG5cdFx0XHRcdFx0XHR4OiAwLFxyXG5cdFx0XHRcdFx0XHR5OiAwXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25TdGFpcnNEYW1hZ2VMZWcnLFxyXG5cdFx0XHRcdFx0XHR4OiAwLFxyXG5cdFx0XHRcdFx0XHR5OiAyXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogM1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdFx0W1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XYWxrMVRvcCcsXHJcblx0XHRcdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0XHRcdHk6IDBcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsxQm90dG9tJyxcclxuXHRcdFx0XHRcdFx0eDogMCxcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ3dhbGsgKHVwIHN0YWlycyknLFxyXG5cdFx0XHRoZWlnaHQ6IDMyLFxyXG5cdFx0XHR3aWR0aDogMTYsXHJcblx0XHRcdGZyYW1lczogW1xyXG5cdFx0XHRcdFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSWRsZVRvcCcsXHJcblx0XHRcdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0XHRcdHk6IDBcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vblN0YWlyV2Fsa1VwTGVncycsXHJcblx0XHRcdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0XHRcdHk6IDJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2FsazFUb3AnLFxyXG5cdFx0XHRcdFx0XHR4OiAwLFxyXG5cdFx0XHRcdFx0XHR5OiAwXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XYWxrMUJvdHRvbScsXHJcblx0XHRcdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0XHRcdHk6IDJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6ICdkZWFkJyxcclxuXHRcdFx0aGVpZ2h0OiAxNixcclxuXHRcdFx0d2lkdGg6IDMyLFxyXG5cdFx0XHRmcmFtZXM6IFtcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkRlYWRMZWZ0JyxcclxuXHRcdFx0XHRcdFx0eDogMCxcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uRGVhZFJpZ2h0JyxcclxuXHRcdFx0XHRcdFx0eDogNCxcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ2h1cnQnLFxyXG5cdFx0XHRoZWlnaHQ6IDMyLFxyXG5cdFx0XHR3aWR0aDogMTYsXHJcblx0XHRcdGZyYW1lczogW1xyXG5cdFx0XHRcdFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uRGFtYWdlVG9wJyxcclxuXHRcdFx0XHRcdFx0eDogMCxcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcclxuXHRcdFx0XHRcdFx0eDogMCxcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXHJcblx0XHRcdFx0XHRcdHg6IDIsXHJcblx0XHRcdFx0XHRcdHk6IDJcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MicsXHJcblx0XHRcdFx0XHRcdHg6IDIsXHJcblx0XHRcdFx0XHRcdHk6IDNcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6ICd3aGlwJyxcclxuXHRcdFx0aGVpZ2h0OiAzMixcclxuXHRcdFx0d2lkdGg6IDMyLFxyXG5cdFx0XHRmcmFtZXM6IFtcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AxJyxcclxuXHRcdFx0XHRcdFx0eDogNCxcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSWRsZUJvdHRvbScsXHJcblx0XHRcdFx0XHRcdHg6IDIsXHJcblx0XHRcdFx0XHRcdHk6IDJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDInLFxyXG5cdFx0XHRcdFx0XHR4OiA0LFxyXG5cdFx0XHRcdFx0XHR5OiAwXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlQm90dG9tJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdFx0W1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25IYW5kJyxcclxuXHRcdFx0XHRcdFx0eDogMCxcclxuXHRcdFx0XHRcdFx0eTogMVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDMnLFxyXG5cdFx0XHRcdFx0XHR4OiAyLFxyXG5cdFx0XHRcdFx0XHR5OiAwXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlQm90dG9tJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ3doaXAgKGR1Y2tpbmcpJyxcclxuXHRcdFx0aGVpZ2h0OiAzMixcclxuXHRcdFx0d2lkdGg6IDMyLFxyXG5cdFx0XHRmcmFtZXM6IFtcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AxJyxcclxuXHRcdFx0XHRcdFx0eDogNCxcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRnJvbnRMZWcnLFxyXG5cdFx0XHRcdFx0XHR4OiAyLFxyXG5cdFx0XHRcdFx0XHR5OiAyXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcclxuXHRcdFx0XHRcdFx0eDogNCxcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkxJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogM1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcclxuXHRcdFx0XHRcdFx0eDogNCxcclxuXHRcdFx0XHRcdFx0eTogM1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdFx0W1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMicsXHJcblx0XHRcdFx0XHRcdHg6IDQsXHJcblx0XHRcdFx0XHRcdHk6IDBcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEZyb250TGVnJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXHJcblx0XHRcdFx0XHRcdHg6IDQsXHJcblx0XHRcdFx0XHRcdHk6IDJcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MScsXHJcblx0XHRcdFx0XHRcdHg6IDIsXHJcblx0XHRcdFx0XHRcdHk6IDNcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MicsXHJcblx0XHRcdFx0XHRcdHg6IDQsXHJcblx0XHRcdFx0XHRcdHk6IDNcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSGFuZCcsXHJcblx0XHRcdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0XHRcdHk6IDFcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AzJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRnJvbnRMZWcnLFxyXG5cdFx0XHRcdFx0XHR4OiAyLFxyXG5cdFx0XHRcdFx0XHR5OiAyXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcclxuXHRcdFx0XHRcdFx0eDogNCxcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkxJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogM1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcclxuXHRcdFx0XHRcdFx0eDogNCxcclxuXHRcdFx0XHRcdFx0eTogM1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ3doaXAgKGRvd24gc3RhaXJzKScsXHJcblx0XHRcdGhlaWdodDogMzIsXHJcblx0XHRcdHdpZHRoOiAzMixcclxuXHRcdFx0ZnJhbWVzOiBbXHJcblx0XHRcdFx0W1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMScsXHJcblx0XHRcdFx0XHRcdHg6IDQsXHJcblx0XHRcdFx0XHRcdHk6IDBcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vblN0YWlyc0RhbWFnZUxlZycsXHJcblx0XHRcdFx0XHRcdHg6IDIsXHJcblx0XHRcdFx0XHRcdHk6IDJcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEJhY2tMZWcnLFxyXG5cdFx0XHRcdFx0XHR4OiA0LFxyXG5cdFx0XHRcdFx0XHR5OiAyXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxyXG5cdFx0XHRcdFx0XHR4OiA0LFxyXG5cdFx0XHRcdFx0XHR5OiAzXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AyJyxcclxuXHRcdFx0XHRcdFx0eDogNCxcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXHJcblx0XHRcdFx0XHRcdHg6IDQsXHJcblx0XHRcdFx0XHRcdHk6IDJcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MicsXHJcblx0XHRcdFx0XHRcdHg6IDQsXHJcblx0XHRcdFx0XHRcdHk6IDNcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSGFuZCcsXHJcblx0XHRcdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0XHRcdHk6IDFcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AzJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXHJcblx0XHRcdFx0XHRcdHg6IDQsXHJcblx0XHRcdFx0XHRcdHk6IDJcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MicsXHJcblx0XHRcdFx0XHRcdHg6IDQsXHJcblx0XHRcdFx0XHRcdHk6IDNcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6ICd3aGlwICh1cCBzdGFpcnMpJyxcclxuXHRcdFx0aGVpZ2h0OiAzMixcclxuXHRcdFx0d2lkdGg6IDMyLFxyXG5cdFx0XHRmcmFtZXM6IFtcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AxJyxcclxuXHRcdFx0XHRcdFx0eDogNCxcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJXYWxrVXBMZWdzJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdFx0W1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMicsXHJcblx0XHRcdFx0XHRcdHg6IDQsXHJcblx0XHRcdFx0XHRcdHk6IDBcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vblN0YWlyV2Fsa1VwTGVncycsXHJcblx0XHRcdFx0XHRcdHg6IDIsXHJcblx0XHRcdFx0XHRcdHk6IDJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSGFuZCcsXHJcblx0XHRcdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0XHRcdHk6IDFcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AzJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJXYWxrVXBMZWdzJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ3N1YndlYXBvbiB0aHJvdycsXHJcblx0XHRcdGhlaWdodDogMzIsXHJcblx0XHRcdHdpZHRoOiAyNCxcclxuXHRcdFx0ZnJhbWVzOiBbXHJcblx0XHRcdFx0W1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMScsXHJcblx0XHRcdFx0XHRcdHg6IDQsXHJcblx0XHRcdFx0XHRcdHk6IDBcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVCb3R0b20nLFxyXG5cdFx0XHRcdFx0XHR4OiAyLFxyXG5cdFx0XHRcdFx0XHR5OiAyXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AyJyxcclxuXHRcdFx0XHRcdFx0eDogNCxcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSWRsZUJvdHRvbScsXHJcblx0XHRcdFx0XHRcdHg6IDIsXHJcblx0XHRcdFx0XHRcdHk6IDJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSGFuZCcsXHJcblx0XHRcdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0XHRcdHk6IDFcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AzJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSWRsZUJvdHRvbScsXHJcblx0XHRcdFx0XHRcdHg6IDIsXHJcblx0XHRcdFx0XHRcdHk6IDJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6ICdzdWJ3ZWFwb24gdGhyb3cgKGRvd24gc3RhaXJzKScsXHJcblx0XHRcdGhlaWdodDogMzIsXHJcblx0XHRcdHdpZHRoOiAyNCxcclxuXHRcdFx0ZnJhbWVzOiBbXHJcblx0XHRcdFx0W1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMScsXHJcblx0XHRcdFx0XHRcdHg6IDQsXHJcblx0XHRcdFx0XHRcdHk6IDBcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vblN0YWlyc0RhbWFnZUxlZycsXHJcblx0XHRcdFx0XHRcdHg6IDIsXHJcblx0XHRcdFx0XHRcdHk6IDJcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEJhY2tMZWcnLFxyXG5cdFx0XHRcdFx0XHR4OiA0LFxyXG5cdFx0XHRcdFx0XHR5OiAyXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxyXG5cdFx0XHRcdFx0XHR4OiA0LFxyXG5cdFx0XHRcdFx0XHR5OiAzXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AyJyxcclxuXHRcdFx0XHRcdFx0eDogNCxcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXHJcblx0XHRcdFx0XHRcdHg6IDQsXHJcblx0XHRcdFx0XHRcdHk6IDJcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MicsXHJcblx0XHRcdFx0XHRcdHg6IDQsXHJcblx0XHRcdFx0XHRcdHk6IDNcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSGFuZCcsXHJcblx0XHRcdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0XHRcdHk6IDFcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AzJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXHJcblx0XHRcdFx0XHRcdHg6IDQsXHJcblx0XHRcdFx0XHRcdHk6IDJcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MicsXHJcblx0XHRcdFx0XHRcdHg6IDQsXHJcblx0XHRcdFx0XHRcdHk6IDNcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6ICdzdWJ3ZWFwb24gdGhyb3cgKHVwIHN0YWlycyknLFxyXG5cdFx0XHRoZWlnaHQ6IDMyLFxyXG5cdFx0XHR3aWR0aDogMjQsXHJcblx0XHRcdGZyYW1lczogW1xyXG5cdFx0XHRcdFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDEnLFxyXG5cdFx0XHRcdFx0XHR4OiA0LFxyXG5cdFx0XHRcdFx0XHR5OiAwXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25TdGFpcldhbGtVcExlZ3MnLFxyXG5cdFx0XHRcdFx0XHR4OiAyLFxyXG5cdFx0XHRcdFx0XHR5OiAyXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AyJyxcclxuXHRcdFx0XHRcdFx0eDogNCxcclxuXHRcdFx0XHRcdFx0eTogMFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJXYWxrVXBMZWdzJyxcclxuXHRcdFx0XHRcdFx0eDogMixcclxuXHRcdFx0XHRcdFx0eTogMlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdFx0W1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25IYW5kJyxcclxuXHRcdFx0XHRcdFx0eDogMCxcclxuXHRcdFx0XHRcdFx0eTogMVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDMnLFxyXG5cdFx0XHRcdFx0XHR4OiAyLFxyXG5cdFx0XHRcdFx0XHR5OiAwXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25TdGFpcldhbGtVcExlZ3MnLFxyXG5cdFx0XHRcdFx0XHR4OiAyLFxyXG5cdFx0XHRcdFx0XHR5OiAyXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHRdXHJcblx0XHR9XHJcblx0XSxcclxuXHRjb2xvcnM6IFtcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnN0M3QzdDJyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MTI0LFxyXG5cdFx0XHRcdDEyNCxcclxuXHRcdFx0XHQxMjRcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnMDAwMEZDJyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDI1MlxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICcwMDAwQkMnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MTg4XHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJzQ0MjhCQycsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDY4LFxyXG5cdFx0XHRcdDQwLFxyXG5cdFx0XHRcdDE4OFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICc5NDAwODQnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQxNDgsXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQxMzJcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnQTgwMDIwJyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MTY4LFxyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MzJcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnQTgxMDAwJyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MTY4LFxyXG5cdFx0XHRcdDE2LFxyXG5cdFx0XHRcdDBcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnODgxNDAwJyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MTM2LFxyXG5cdFx0XHRcdDIwLFxyXG5cdFx0XHRcdDBcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnNTAzMDAwJyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0ODAsXHJcblx0XHRcdFx0NDgsXHJcblx0XHRcdFx0MFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICcwMDc4MDAnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDEyMCxcclxuXHRcdFx0XHQwXHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJzAwNjgwMCcsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MTA0LFxyXG5cdFx0XHRcdDBcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnMDA1ODAwJyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQ4OCxcclxuXHRcdFx0XHQwXHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJzAwNDA1OCcsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0NjQsXHJcblx0XHRcdFx0ODhcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnMDAwMDAwJyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDBcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnMDAwMDAwJyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDBcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnMDAwMDAwJyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDBcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnQkNCQ0JDJyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MTg4LFxyXG5cdFx0XHRcdDE4OCxcclxuXHRcdFx0XHQxODhcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnMDA3OEY4JyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQxMjAsXHJcblx0XHRcdFx0MjQ4XHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJzAwNThGOCcsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0ODgsXHJcblx0XHRcdFx0MjQ4XHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJzY4NDRGQycsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDEwNCxcclxuXHRcdFx0XHQ2OCxcclxuXHRcdFx0XHQyNTJcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnRDgwMENDJyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MjE2LFxyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MjA0XHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJ0U0MDA1OCcsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDIyOCxcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDg4XHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJ0Y4MzgwMCcsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDI0OCxcclxuXHRcdFx0XHQ1NixcclxuXHRcdFx0XHQwXHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJ0U0NUMxMCcsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDIyOCxcclxuXHRcdFx0XHQ5MixcclxuXHRcdFx0XHQxNlxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdBQzdDMDAnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQxNzIsXHJcblx0XHRcdFx0MTI0LFxyXG5cdFx0XHRcdDBcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnMDBCODAwJyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQxODQsXHJcblx0XHRcdFx0MFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICcwMEE4MDAnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDE2OCxcclxuXHRcdFx0XHQwXHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJzAwQTg0NCcsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MTY4LFxyXG5cdFx0XHRcdDY4XHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJzAwODg4OCcsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MTM2LFxyXG5cdFx0XHRcdDEzNlxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdGOEY4RjgnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQyNDgsXHJcblx0XHRcdFx0MjQ4LFxyXG5cdFx0XHRcdDI0OFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICczQ0JDRkMnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQ2MCxcclxuXHRcdFx0XHQxODgsXHJcblx0XHRcdFx0MjUyXHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJzY4ODhGQycsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDEwNCxcclxuXHRcdFx0XHQxMzYsXHJcblx0XHRcdFx0MjUyXHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJzk4NzhGOCcsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDE1MixcclxuXHRcdFx0XHQxMjAsXHJcblx0XHRcdFx0MjQ4XHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJ0Y4NzhGOCcsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDI0OCxcclxuXHRcdFx0XHQxMjAsXHJcblx0XHRcdFx0MjQ4XHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJ0Y4NTg5OCcsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDI0OCxcclxuXHRcdFx0XHQ4OCxcclxuXHRcdFx0XHQxNTJcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnRjg3ODU4JyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MjQ4LFxyXG5cdFx0XHRcdDEyMCxcclxuXHRcdFx0XHQ4OFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdGQ0EwNDQnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQyNTIsXHJcblx0XHRcdFx0MTYwLFxyXG5cdFx0XHRcdDY4XHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJ0Y4QjgwMCcsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDI0OCxcclxuXHRcdFx0XHQxODQsXHJcblx0XHRcdFx0MFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdCOEY4MTgnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQxODQsXHJcblx0XHRcdFx0MjQ4LFxyXG5cdFx0XHRcdDI0XHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJzU4RDg1NCcsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDg4LFxyXG5cdFx0XHRcdDIxNixcclxuXHRcdFx0XHQ4NFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICc1OEY4OTgnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQ4OCxcclxuXHRcdFx0XHQyNDgsXHJcblx0XHRcdFx0MTUyXHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJzAwRThEOCcsXHJcblx0XHRcdHJnYjogW1xyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MjMyLFxyXG5cdFx0XHRcdDIxNlxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICc3ODc4NzgnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQxMjAsXHJcblx0XHRcdFx0MTIwLFxyXG5cdFx0XHRcdDEyMFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdGQ0ZDRkMnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQyNTIsXHJcblx0XHRcdFx0MjUyLFxyXG5cdFx0XHRcdDI1MlxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdBNEU0RkMnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQxNjQsXHJcblx0XHRcdFx0MjI4LFxyXG5cdFx0XHRcdDI1MlxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdCOEI4RjgnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQxODQsXHJcblx0XHRcdFx0MTg0LFxyXG5cdFx0XHRcdDI0OFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdEOEI4RjgnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQyMTYsXHJcblx0XHRcdFx0MTg0LFxyXG5cdFx0XHRcdDI0OFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdGOEI4RjgnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQyNDgsXHJcblx0XHRcdFx0MTg0LFxyXG5cdFx0XHRcdDI0OFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdGOEE0QzAnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQyNDgsXHJcblx0XHRcdFx0MTY0LFxyXG5cdFx0XHRcdDE5MlxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdGMEQwQjAnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQyNDAsXHJcblx0XHRcdFx0MjA4LFxyXG5cdFx0XHRcdDE3NlxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdGQ0UwQTgnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQyNTIsXHJcblx0XHRcdFx0MjI0LFxyXG5cdFx0XHRcdDE2OFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdGOEQ4NzgnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQyNDgsXHJcblx0XHRcdFx0MjE2LFxyXG5cdFx0XHRcdDEyMFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdEOEY4NzgnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQyMTYsXHJcblx0XHRcdFx0MjQ4LFxyXG5cdFx0XHRcdDEyMFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdCOEY4QjgnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQxODQsXHJcblx0XHRcdFx0MjQ4LFxyXG5cdFx0XHRcdDE4NFxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICdCOEY4RDgnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQxODQsXHJcblx0XHRcdFx0MjQ4LFxyXG5cdFx0XHRcdDIxNlxyXG5cdFx0XHRdXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICcwMEZDRkMnLFxyXG5cdFx0XHRyZ2I6IFtcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDI1MixcclxuXHRcdFx0XHQyNTJcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnRDhEOEQ4JyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MjE2LFxyXG5cdFx0XHRcdDIxNixcclxuXHRcdFx0XHQyMTZcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnMDAwMDAwJyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDBcclxuXHRcdFx0XVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnMDAwMDAwJyxcclxuXHRcdFx0cmdiOiBbXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDBcclxuXHRcdFx0XVxyXG5cdFx0fVxyXG5cdF0sXHJcblx0cGFsZXR0ZTogW1xyXG5cdFx0e1xyXG5cdFx0XHRoZXg6ICcwMEE4MDAnLFxyXG5cdFx0XHRpbmRleDogMjZcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJzAwMDAwMCcsXHJcblx0XHRcdGluZGV4OiAxNVxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aGV4OiAnQTgxMDAwJyxcclxuXHRcdFx0aW5kZXg6IDZcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhleDogJ0ZDRkNGQycsXHJcblx0XHRcdGluZGV4OiA0OFxyXG5cdFx0fVxyXG5cdF1cclxufTtcclxuIiwiY29uc3QgeyBDSFIgfSA9IHJlcXVpcmUoJy4vZGF0YScpO1xyXG5cclxuZXhwb3J0cy5sb2FkQ2hyID0gZnVuY3Rpb24gbG9hZENocih0aWxlcywgY2hySW5kZXgsIHBpeGVscywgem9vbSkge1xyXG5cdGNvbnN0IGNockRhdGEgPSBDSFJbY2hySW5kZXhdO1xyXG5cdHBpeGVscy5sZW5ndGggPSAwO1xyXG5cdGNockRhdGEuZGF0YS5mb3JFYWNoKChwYWxldHRlSW5kZXgsIGluZGV4KSA9PiB7XHJcblx0XHRjb25zdCBsYXlvdXRJbmRleCA9IE1hdGguZmxvb3IoaW5kZXggLyA2NCk7XHJcblx0XHRjb25zdCBsYXlvdXQgPSBjaHJEYXRhLmxheW91dFtsYXlvdXRJbmRleF07XHJcblx0XHRwaXhlbHMucHVzaCh7XHJcblx0XHRcdHg6ICgoaW5kZXggJSA4KSArIChsYXlvdXQgPj0gMiA/IDggOiAwKSkgKiB6b29tLFxyXG5cdFx0XHR5OiAoKE1hdGguZmxvb3IoKGluZGV4ICUgNjQpIC8gOCkpICsgKGxheW91dCAlIDIgPT09IDEgPyA4IDogMCkpICogem9vbSxcclxuXHRcdFx0cGFsZXR0ZUluZGV4OiB0aWxlcyA/IHRpbGVzLnBpeGVsc1tjaHJJbmRleF1baW5kZXhdLnBhbGV0dGVJbmRleCA6IHBhbGV0dGVJbmRleFxyXG5cdFx0fSk7XHJcblx0fSk7XHJcblx0cmV0dXJuIGNockRhdGE7XHJcbn07XHJcblxyXG5leHBvcnRzLnJlc2l6ZUNhbnZhcyA9IGZ1bmN0aW9uIHJlc2l6ZUNhbnZhcyhjYW52YXMsIHdpZHRoLCBoZWlnaHQsIHpvb20pIHtcclxuXHRjb25zdCAkY2FudmFzPSAkKGNhbnZhcyk7XHJcblx0dGhpcy56b29tID0gem9vbTtcclxuXHR0aGlzLndpZHRoID0gd2lkdGg7XHJcblx0dGhpcy5oZWlnaHQgPSBoZWlnaHQ7XHJcblx0JGNhbnZhcy5hdHRyKCdoZWlnaHQnLCBoZWlnaHQgKiB6b29tKTtcclxuXHQkY2FudmFzLmF0dHIoJ3dpZHRoJywgd2lkdGggKiB6b29tKTtcclxuXHQkY2FudmFzLmNzcyh7XHJcblx0XHR3aWR0aDogd2lkdGggKiB6b29tLFxyXG5cdFx0aGVpZ2h0OiBoZWlnaHQgKiB6b29tXHJcblx0fSk7XHJcbn07XHJcblxyXG5leHBvcnRzLmdldFBhbGV0dGVJbmRleCA9IGZ1bmN0aW9uIGdldFBhbGV0dGVJbmRleCgpIHtcclxuXHRyZXR1cm4gcGFyc2VJbnQoJCgnLnBhbGV0dGUtYnV0dG9uLXNlbGVjdGVkJykuZmlyc3QoKS5maW5kKCcucGFsZXR0ZS1idXR0b24nKS5kYXRhKCdwaScpLCAxMCk7XHJcbn07XHJcblxyXG5leHBvcnRzLnJnYjJoZXggPSBmdW5jdGlvbiByZ2IyaGV4KHJnYil7XHJcblx0cmdiID0gcmdiLm1hdGNoKC9ecmdiXFwoKFxcZCspLFxccyooXFxkKyksXFxzKihcXGQrKVxcKSQvKTtcclxuXHRyZXR1cm4gKCcwJyArIHBhcnNlSW50KHJnYlsxXSwxMCkudG9TdHJpbmcoMTYpKS5zbGljZSgtMikgK1xyXG5cdFx0KCcwJyArIHBhcnNlSW50KHJnYlsyXSwxMCkudG9TdHJpbmcoMTYpKS5zbGljZSgtMikgK1xyXG5cdFx0KCcwJyArIHBhcnNlSW50KHJnYlszXSwxMCkudG9TdHJpbmcoMTYpKS5zbGljZSgtMik7XHJcbn07Il19
