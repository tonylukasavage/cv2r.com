var SpriteMaker = {};

(function() {
	var editor = {
		spriteIndex: 0,
		pixels: [],
		zoom: 16,
		mousedown: false,

		divider: {
			style: 'rgba(255,255,255,0.65)',

			draw: function(editor) {
				var ctx = editor.ctx;
				var zoom = editor.zoom;
				var sprite = sprites[editor.spriteIndex];

				ctx.strokeStyle = this.style;
				ctx.beginPath();
				ctx.moveTo(0, sprite.height * zoom / 2);
				ctx.lineTo(sprite.width * zoom, sprite.height * zoom / 2);
				ctx.stroke();

				ctx.beginPath();
				ctx.moveTo(sprite.width * zoom / 2, 0);
				ctx.lineTo(sprite.width * zoom / 2, sprite.height * zoom);
				ctx.stroke();
			}
		},

		grid: {
			lines: [],
			style: 'rgba(255,255,255,0.25)',

			init: function(editor, sprite) {
				this.editor = editor;
				this.lines = [];

				var i;
				for (i = 0; i < sprite.width + 1; i++) {
					this.lines.push({ type: 'x', index: i });
				}
				for (i = 0; i < sprite.height + 1; i++) {
					this.lines.push({ type: 'y', index: i });
				}
			},

			draw: function(editor) {
				var ctx = editor.ctx;
				var zoom = editor.zoom;
				var sprite = sprites[editor.spriteIndex];

				ctx.strokeStyle = this.style;
				this.lines.forEach(line => {
					if (line.type === 'x') {
						ctx.beginPath();
						ctx.moveTo(line.index * zoom, 0);
						ctx.lineTo(line.index * zoom, sprite.height * zoom);
						ctx.stroke();
					} else if (line.type === 'y') {
						ctx.beginPath();
						ctx.moveTo(0, line.index * zoom);
						ctx.lineTo(sprite.width * zoom, line.index * zoom);
						ctx.stroke();
					}
				});
			}
		},

		init: function() {
			var canvas = document.createElement('canvas');
			canvas.className = 'editor-canvas';
			canvas.id = 'editor-canvas';
			$('#editor-container').append(canvas);
			this.canvas = canvas;
			this.ctx = canvas.getContext('2d');

			var sprite = sprites[this.spriteIndex];
			loadSprite(sprite, this.pixels, this.zoom);
			resizeSprite.call(this, canvas, sprite, this.zoom);
			this.grid.init(this, sprite);

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
		},

		drawPixel: function(ev) {
			var sprite = sprites[this.spriteIndex];
			var rect = this.canvas.getBoundingClientRect();
			var x = ev.clientX - rect.left;
			var y = ev.clientY - rect.top;
			var xScale = Math.floor(x / this.zoom);
			var yScale = Math.floor(y / this.zoom);
			var index = (yScale * sprite.width) + xScale;

			if (sprite.width > 8) {
				var offset = 0;
				if (xScale >= sprite.width / 2) { offset++; }
				if (yScale >= sprite.height / 2) { offset++; }
				index = (64 * offset) + (yScale * 8) + (xScale % 8);
			}
			console.log(getPaletteIndex());
			this.pixels[index].paletteIndex = getPaletteIndex();
			tiles.pixels[this.spriteIndex][index].paletteIndex = getPaletteIndex();
			this.draw();
		},

		draw: function() {
			this.pixels.forEach(p => {
				this.ctx.fillStyle = '#' + palette[p.paletteIndex].hex;
				this.ctx.fillRect(p.x, p.y, this.zoom, this.zoom);
			});
			this.grid.draw(this);
			this.divider.draw(this);
			tiles.draw();
		}
	};

	var colorPicker = {
		init: function() {
			colors.forEach(function(color, index) {
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
					var paletteIndex = parseInt(paletteButton.attr('data-pi'), 10);
					paletteButton.css('background-color', '#' + bgc);
					palette[paletteIndex].hex = bgc;
					palette[paletteIndex].index = parseInt($(this).attr('data-pi'), 10);
					SpriteMaker.draw();
				});
			});
		}
	};

	var tiles = {
		pixels: [],
		zoom: 3,

		init: function() {
			sprites.forEach((sprite, index) => {
				var canvas = document.createElement('canvas');
				canvas.className = 'tile-canvas';
				canvas.id = 'tile' + index;
				$(canvas).click(function() {
					
				});
				$('#tiles').append(canvas);

				var pixels = [];
				pixels.id = sprite.name;
				loadSprite(sprite, pixels, this.zoom);
				this.pixels.push(pixels);

				pixels.canvas = canvas;
				pixels.ctx = canvas.getContext('2d');
				resizeSprite.call(this, canvas, sprite, this.zoom);
			});

			this.draw();
		},

		draw: function() {
			this.pixels.forEach(pixels => {
				pixels.forEach(p => {
					pixels.ctx.fillStyle = '#' + palette[p.paletteIndex].hex;
					pixels.ctx.fillRect(p.x, p.y, this.zoom, this.zoom);
				});
			});
		}
	};

	var states = {
		data: [],
		animations: [],
		zoom: 3,
		fps: 3,

		init: function() {
			this.data.forEach((state, index) => {
				var canvas = document.createElement('canvas');
				canvas.className = 'state-canvas';
				canvas.id = 'state' + index;
				$('#states').append(canvas);
				state.canvas = canvas;
				state.ctx = canvas.getContext('2d');
				state.frameCount = 0;

				state.frames.forEach(frame => {
					frame.forEach(part => {
						part.pixels = tiles.pixels.find(pixels => pixels.id === part.id);
					});
				});
				resizeSprite.call(this, canvas, { width: state.width, height: state.height }, this.zoom);
			});

			setInterval(this.draw.bind(this), 1000 / this.fps);
		},

		draw: function() {
			this.data.forEach(state => {
				var ctx = state.ctx;
				ctx.clearRect(0, 0, state.width * this.zoom, state.height * this.zoom);

				var frame = state.frames[state.frameCount];
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
	};

	var sprites;
	var palette;
	var colors;

	SpriteMaker.init = function(_sprites, _states, _palette, _colors) {
		colors = _colors;
		sprites = _sprites;
		palette = _palette;
		states.data = _states;
		editor.init();
		colorPicker.init();
		tiles.init();
		states.init();
	};

	SpriteMaker.draw = function() {
		editor.draw();
	};

	SpriteMaker.drawPixel = function(ev) {
		editor.drawPixel(ev);
	};

	function resizeSprite(canvas, sprite, zoom) {
		var $canvas= $(canvas);
		var width = sprite.width;
		var height = sprite.height;
		this.zoom = zoom;
		$canvas.attr('height', height * zoom);
		$canvas.attr('width', width * zoom);
		$canvas.css({
			width: width * zoom,
			height: height * zoom
		});
	}

	function loadSprite(sprite, pixels, zoom) {
		pixels.length = 0;
		sprite.data.forEach((paletteIndex, index) => {
			const layoutIndex = Math.floor(index / 64);
			const layout = sprite.layout[layoutIndex];
			pixels.push({
				x: ((index % 8) + (layout >= 2 ? 8 : 0)) * zoom,
				y: ((Math.floor((index % 64) / 8)) + (layout % 2 === 1 ? 8 : 0)) * zoom,
				paletteIndex
			});
		});
	}

	function getPaletteIndex() {
		return parseInt($('.palette-button-selected').first().attr('data-pi'), 10);
	}

	function rgb2hex(rgb){
		rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
		return ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
			("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
			("0" + parseInt(rgb[3],10).toString(16)).slice(-2);
	}

})();