var SpriteMaker = {};

(function() {
	var $canvas, ctx, pixels, zoom, sprite, grid;

	function getPaletteIndex() {
		return parseInt($('.palette-button-selected').first().attr('data-pi'), 10);
	}

	SpriteMaker.init = function(canvas, _sprite, _zoom) {
		$canvas = canvas;
		ctx = $canvas[0].getContext('2d');
		zoom = _zoom;
		sprite = _sprite;

		// set default palette (Simon default)
		palette = [
			{ hex: '0000FF', index: 0x0F },
			{ hex: '000000', index: 0x0F },
			{ hex: 'A81000', index: 0x16 },
			{ hex: 'FCFCFC', index: 0x20 }
		];

		// create pixel grid
		var i;
		grid = [];
		grid.style = 'rgba(255,255,255,0.25)';
		for (i = 0; i < sprite.width + 1; i++) {
			grid.push({ type: 'x', index: i });
		}
		for (i = 0; i < sprite.height + 1; i++) {
			grid.push({ type: 'y', index: i });
		}

		this.resize(sprite.width, sprite.height, zoom);
	};

	SpriteMaker.resize = function(width, height, _zoom) {
		zoom = _zoom;
		$canvas.attr('height', height * zoom);
		$canvas.attr('width', width * zoom);
		$canvas.css({
			width: width * zoom,
			height: height * zoom
		});
		this.loadSprite();
	};

	SpriteMaker.loadSprite = function() {
		pixels = [];
		sprite.data.forEach((paletteIndex, index) => {
			const layoutIndex = Math.floor(index / 64);
			const layout = sprite.layout[layoutIndex];
			pixels.push({
				x: ((index % 8) + (layout >= 2 ? 8 : 0)) * zoom,
				y: ((Math.floor((index % 64) / 8)) + (layout % 2 === 1 ? 8 : 0)) * zoom,
				paletteIndex
			});
			// pixels.push({
			// 	x: (index % sprite.width) * zoom,
			// 	y: (Math.floor(index / sprite.height)) * zoom,
			// 	paletteIndex
			// });
		});
	};

	SpriteMaker.draw = function() {
		this.drawSprite();
		this.drawGrid();
		this.drawDivider();
	};

	SpriteMaker.drawPixel = function(ev) {
		var rect = $canvas[0].getBoundingClientRect();
		var x = ev.clientX - rect.left;
		var y = ev.clientY - rect.top;
		var index = (Math.floor(y / zoom) * 16) + Math.floor(x / zoom);
		pixels[index].paletteIndex = getPaletteIndex();
		this.draw();
	};

	SpriteMaker.drawSprite = function() {
		pixels.forEach(function(p) {
			ctx.fillStyle = '#' + palette[p.paletteIndex].hex;
			ctx.fillRect(p.x, p.y, zoom, zoom);
		});
	};

	SpriteMaker.drawGrid = function() {
		ctx.strokeStyle = grid.style;
		grid.forEach(line => {
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

	SpriteMaker.drawDivider = function() {
		ctx.strokeStyle = 'rgba(255,255,255,0.65)';
		ctx.beginPath();
		ctx.moveTo(0, sprite.height * zoom / 2);
		ctx.lineTo(sprite.width * zoom, sprite.height * zoom / 2);
		ctx.stroke();
	}

})();