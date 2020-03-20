const EventEmitter = require('events');
const { CHR, palette } = require('./data');
const { getPaletteIndex, loadChr, resizeCanvas } = require('./utils');

class BaseCanvas extends EventEmitter {
	constructor(editor, selector) {
		super();
		this.editor = editor;
		this.canvas = $(selector)[0];
		this.ctx = this.canvas.getContext('2d');
		this.lastPixel = { x: null, y: null };
	}

	getCoord(ev, divisor = 1) {
		const { canvas, editor: { chrIndex, zoom } } = this;
		const chrData = CHR[chrIndex];
		const rect = canvas.getBoundingClientRect();
		let x = ev.clientX - rect.left;
		let y = ev.clientY - rect.top;

		if (x < 0 || x > chrData.width * zoom) { return null; }
		if (y < 0 || y > chrData.height * zoom) { return null; }
		x = (Math.floor(x / zoom) * zoom) / divisor;
		y = (Math.floor(y / zoom) * zoom) / divisor;
		if (this.lastPixel.x === x && this.lastPixel.y === y) { return null; }
		
		const coord = { x, y };
		Object.assign(this.lastPixel, coord); 
		
		return coord;
	}

	drawPixel() {
		throw new Error('drawPixel() not implemented for class ' + this.constructor.name);
	}
}

class EditorCanvas extends BaseCanvas {
	drawPixel(ev) {
		const { chrIndex, pixels, undoBuffer, undoMax, zoom } = this.editor;
		const chrData = CHR[chrIndex];
		const coord = this.getCoord(ev, zoom);
		if (!coord) { return; }

		console.log('editor.drawPixel()');

		// translate canvas coord to sprite pixel
		let { x, y } = coord;
		let pixelIndex = (y * chrData.width) + x;
		if (chrData.width > 8) {
			let offset = 0;
			if (x >= chrData.width / 2) { offset++; }
			if (y >= chrData.height / 2) { offset++; }
			pixelIndex = (64 * offset) + (y * 8) + (x % 8);
		}

		// update the editor pixels and trigger a draw for editor, tiles, and states
		const paletteIndex = getPaletteIndex();
		if (undoBuffer.length < undoMax && pixels[pixelIndex].paletteIndex !== paletteIndex) {
			undoBuffer.push({ pixelIndex, paletteIndex: pixels[pixelIndex].paletteIndex });
		}
		pixels[pixelIndex].paletteIndex = paletteIndex;
		this.editor.draw();
		this.editor.emit('pixel', { chrIndex, paletteIndex, pixelIndex });
	}
}

class OverlayCanvas extends BaseCanvas {
	constructor(editor, selector) {
		super(editor, selector);
		this.mousedown = false;

		const canvas = this.canvas;
		canvas.addEventListener('mousemove', ev => {
			const { layers } = this.editor;
			if (this.mousedown) {
				layers.editor.drawPixel(ev);
			} else {
				this.drawPixel(ev);
			}
		});
		canvas.addEventListener('mouseout', () => {
			const { ctx, editor: { chrIndex, zoom } } = this;
			const chrData = CHR[chrIndex];
			ctx.clearRect(0, 0, chrData.width * zoom, chrData.height * zoom);	
			this.mousedown = false;
		});
		canvas.addEventListener('mouseup', () => this.mousedown = false);
		canvas.addEventListener('mousedown', ev => {
			this.mousedown = true;
			this.editor.layers.editor.drawPixel(ev);
		});
	}

	drawPixel(ev) {
		const { ctx, editor: { chrIndex, zoom } } = this;
		const chrData = CHR[chrIndex];
		const coord = this.getCoord(ev);
		if (!coord) { return; }

		console.log('overlay.drawPixel()');

		// draw cursor pixel
		ctx.clearRect(0, 0, chrData.width * zoom, chrData.height * zoom);
		ctx.fillStyle = '#' + palette[getPaletteIndex()].hex;
		ctx.fillRect(coord.x, coord.y, zoom, zoom);
	}
}

class Editor extends EventEmitter {
	constructor() {
		super();
		this.chrIndex = 0;
		this.zoom = 32;
		this.pixels = [];
		this.undoBuffer = [];
		this.undoMax = 128;

		this.layers = {
			editor: new EditorCanvas(this, '#editor-canvas'),
			overlay: new OverlayCanvas(this, '#editor-canvas-overlay')
		};

		// load default CHR data into editor and draw
		this.updateChr(null, this.chrIndex);
	}

	draw() {
		const { layers: { editor: { ctx } }, zoom } = this;
		this.pixels.forEach(p => {
			ctx.fillStyle = '#' + palette[p.paletteIndex].hex;
			ctx.fillRect(p.x, p.y, zoom, zoom);
		});
		this.grid.draw();
		this.dividers.draw();
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
		resizeCanvas.call(this, this.layers.editor.canvas, width, height, this.zoom);
		resizeCanvas.call(this, this.layers.overlay.canvas, width, height, this.zoom);
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
			const { chrIndex, layers: { editor: { ctx } }, zoom } = this.editor;
			const { height, width } = CHR[chrIndex];
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
			const { chrIndex, layers: { editor: { ctx } }, zoom } = this.editor;
			const { height, width } = CHR[chrIndex];
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