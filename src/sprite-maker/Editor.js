const EventEmitter = require('events');
const { CHR, palette } = require('./data');
const { getPaletteIndex, loadChr, resizeCanvas } = require('./utils');

class Editor extends EventEmitter {
	constructor() {
		super();
		this.chrIndex = 0;
		this.zoom = 32;
		this.mousedown = false;
		this.pixels = [];
		this.undoBuffer = [];
		this.undoMax = 128;

		// create canvas for editor
		const canvas = this.canvas = $('#editor-canvas')[0];
		this.ctx = canvas.getContext('2d');
		const overlay = this.overlay = $('#editor-canvas-overlay')[0];
		this.overlayCtx = overlay.getContext('2d');

		// add drawing events for overlay canvas
		overlay.addEventListener('mousemove', ev => {
			this.drawOverlayPixel(ev);
			if (this.mousedown) {
				this.drawPixel(ev);
			}
		});
		overlay.addEventListener('mouseout', () => {
			const chrData = CHR[this.chrIndex];
			this.overlayCtx.clearRect(0, 0, chrData.width * this.zoom, chrData.height * this.zoom);	
			this.mousedown = false;
		});

		// add drawing events for editor canvas
		overlay.addEventListener('mouseup', () => this.mousedown = false);
		overlay.addEventListener('mousedown', ev => {
			this.mousedown = true;
			this.drawPixel(ev);
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

	drawOverlayPixel(ev) {
		const { chrIndex, zoom, overlay, overlayCtx } = this;
		const chrData = CHR[chrIndex];
		const rect = overlay.getBoundingClientRect();
		const x = ev.clientX - rect.left;
		const y = ev.clientY - rect.top;
		if (x < 0 || x > chrData.width * zoom) { return; }
		if (y < 0 || y > chrData.height * zoom) { return; }
		const xAdj = Math.floor(x / zoom) * zoom;
		const yAdj = Math.floor(y / zoom) * zoom;
		overlayCtx.clearRect(0, 0, chrData.width * zoom, chrData.height * zoom);
		overlayCtx.fillStyle = '#' + palette[getPaletteIndex()].hex;
		overlayCtx.fillRect(xAdj, yAdj, zoom, zoom);
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
		if (this.undoBuffer.length < this.undoMax && this.pixels[pixelIndex].paletteIndex !== paletteIndex) {
			this.undoBuffer.push({ pixelIndex, paletteIndex: this.pixels[pixelIndex].paletteIndex });
		}
		this.pixels[pixelIndex].paletteIndex = paletteIndex;
		this.draw();
		this.emit('pixel', { chrIndex, paletteIndex, pixelIndex });
	}

	undo() {
		if (this.undoBuffer.length < 1) { return; }
		const { pixelIndex, paletteIndex } = this.undoBuffer.pop();
		this.pixels[pixelIndex].paletteIndex = paletteIndex;
		this.draw();
		this.emit('pixel', { chrIndex: this.chrIndex, paletteIndex, pixelIndex });
	}

	clear() {
		this.pixels.forEach(pixel => {
			pixel.paletteIndex = 0;
			pixel.hex = palette[0].hex;
		});
		this.draw();
	}

	load(tiles) {
		this.updateChr(tiles, 0);
		this.draw();
	}

	updateChr(tiles, chrIndex) {
		this.chrIndex = chrIndex;
		const { width, height } = loadChr(tiles, chrIndex, this.pixels, this.zoom);
		resizeCanvas.call(this, this.canvas, width, height, this.zoom);
		resizeCanvas.call(this, this.overlay, width, height, this.zoom);
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