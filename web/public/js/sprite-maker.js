var SpriteMaker = {};

(function() {
	var editor = {
		$canvas: null,
		ctx: null,
		spriteIndex: 0,
		pixels: [],
		zoom: 8,

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

		init: function($canvas, zoom) {
			this.$canvas = $canvas;
			this.ctx = $canvas[0].getContext('2d');
			this.zoom = zoom;

			var sprite = sprites[this.spriteIndex];
			this.resize(sprite, zoom);
			this.grid.init(this, sprite)
		},

		resize: function(sprite, zoom) {
			var width = sprite.width;
			var height = sprite.height;
			this.zoom = zoom;
			this.$canvas.attr('height', height * zoom);
			this.$canvas.attr('width', width * zoom);
			this.$canvas.css({
				width: width * zoom,
				height: height * zoom
			});
			this.loadSprite(sprite);
		},

		loadSprite: function(sprite) {
			this.pixels = [];
			sprite.data.forEach((paletteIndex, index) => {
				const layoutIndex = Math.floor(index / 64);
				const layout = sprite.layout[layoutIndex];
				this.pixels.push({
					x: ((index % 8) + (layout >= 2 ? 8 : 0)) * this.zoom,
					y: ((Math.floor((index % 64) / 8)) + (layout % 2 === 1 ? 8 : 0)) * this.zoom,
					paletteIndex
				});
			});
		},

		drawPixel: function(ev) {
			var sprite = sprites[this.spriteIndex];
			var rect = this.$canvas[0].getBoundingClientRect();
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
			this.pixels[index].paletteIndex = getPaletteIndex();
			this.draw();
		},

		draw: function() {
			this.pixels.forEach(p => {
				this.ctx.fillStyle = '#' + palette[p.paletteIndex].hex;
				this.ctx.fillRect(p.x, p.y, this.zoom, this.zoom);
			});
			this.grid.draw(this);
			this.divider.draw(this);
		}
	};
	var sprites;
	var palette;

	SpriteMaker.init = function($canvas, _sprites, _palette, zoom) {
		sprites = _sprites;
		palette = _palette;
		editor.init($canvas, zoom);
	};

	SpriteMaker.draw = function() {
		editor.draw();
	};

	SpriteMaker.drawPixel = function(ev) {
		editor.drawPixel(ev);
	};

	function getPaletteIndex() {
		return parseInt($('.palette-button-selected').first().attr('data-pi'), 10);
	}

})();