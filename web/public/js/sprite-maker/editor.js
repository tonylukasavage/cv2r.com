class Editor {
	constructor(spriteMaker) {
		this.spriteMaker = spriteMaker;
		this.grid = {
			style: 'rgba(255,255,255,0.25)',
			show: true
		};
		this.spriteDivider = {
			style: 'rgba(255,255,255,0.65)',
			show: true
		};
		this.spriteIndex = 0;
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

		// add drawing events for canvas
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

		// load initial sprite into editor
		// const sprite = sprites[this.spriteIndex];
		// loadSprite(sprite, this.pixels, this.zoom);
		// resizeSprite.call(this, canvas, sprite, this.zoom);
		// this.grid.init(this, sprite);
	}

	draw() {
		const { 
			ctx, 
			spriteIndex, 
			zoom, 
			spriteMaker: { 
				sprites,
				palette
			} 
		} = this;
		const sprite = sprites[spriteIndex];

		// draw selected sprite
		this.pixels.forEach(p => {
			ctx.fillStyle = '#' + palette[p.paletteIndex].hex;
			ctx.fillRect(p.x, p.y, zoom, zoom);
		});

		// draw grid
		if (this.grid.show) {
			ctx.strokeStyle = this.grid.style;
			for (let i = 0; i < sprite.width + 1; i++) {
				ctx.beginPath();
				ctx.moveTo(i * zoom, 0);
				ctx.lineTo(i * zoom, sprite.height * zoom);
				ctx.stroke();
			}
			for (let i = 0; i < sprite.height + 1; i++) {
				ctx.beginPath();
				ctx.moveTo(0, i * zoom);
				ctx.lineTo(sprite.width * zoom, i * zoom);
				ctx.stroke();
			}
		}

		// draw tile divider
		if (this.spriteDivider.show) {
			ctx.strokeStyle = this.spriteDivider.style;
			ctx.beginPath();
			ctx.moveTo(0, sprite.height * zoom / 2);
			ctx.lineTo(sprite.width * zoom, sprite.height * zoom / 2);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(sprite.width * zoom / 2, 0);
			ctx.lineTo(sprite.width * zoom / 2, sprite.height * zoom);
			ctx.stroke();
		}
	}

	drawPixel(ev) {
		const { sprites } = this.spriteMaker;
		const sprite = sprites[this.spriteIndex];
		const rect = this.canvas.getBoundingClientRect();
		const x = ev.clientX - rect.left;
		const y = ev.clientY - rect.top;
		const xScale = Math.floor(x / this.zoom);
		const yScale = Math.floor(y / this.zoom);
		let index = (yScale * sprite.width) + xScale;

		if (sprite.width > 8) {
			let offset = 0;
			if (xScale >= sprite.width / 2) { offset++; }
			if (yScale >= sprite.height / 2) { offset++; }
			index = (64 * offset) + (yScale * 8) + (xScale % 8);
		}
		this.pixels[index].paletteIndex = getPaletteIndex();
		tiles.pixels[this.spriteIndex][index].paletteIndex = getPaletteIndex();
		this.draw();
	}
}