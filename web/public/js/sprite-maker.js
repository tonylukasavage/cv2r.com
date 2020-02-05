var SpriteMaker = {};

(function() {
	var $canvas, ctx, pixels, zoom, sprite, palette, grid;

	function getPaletteIndex() {
		return parseInt($('.palette-button-selected').first().attr('data-pi'), 10);
	}

	SpriteMaker.init = function(canvas, _sprite, _palette, _zoom) {
		$canvas = canvas;
		ctx = $canvas[0].getContext('2d');
		zoom = _zoom;
		sprite = _sprite;
		palette = _palette;

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
				//x2: ((index % 8)  ),
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
		var xScale = Math.floor(x / zoom);
		var yScale = Math.floor(y / zoom);
		var index = (yScale * sprite.width) + xScale;

		if (sprite.width > 8) {
			var offset = 0;
			if (xScale >= sprite.width / 2) { offset++; }
			if (yScale >= sprite.height / 2) { offset++; }
			index = (64 * offset) + (yScale * 8) + (xScale % 8);
		}
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

		ctx.beginPath();
		ctx.moveTo(sprite.width * zoom / 2, 0);
		ctx.lineTo(sprite.width * zoom / 2, sprite.height * zoom);
		ctx.stroke();
	}

})();