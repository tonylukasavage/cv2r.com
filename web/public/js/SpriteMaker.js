(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const { CHR, palette } = require('./data');
const { getPaletteIndex, loadChr, resizeCanvas } = require('./utils');

class Editor {
	constructor() {
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

		// load chr data into editor canvas
		const { width, height } = loadChr(this.chrIndex, this.pixels, this.zoom);
		resizeCanvas.call(this, canvas, width, height, this.zoom);

		// add grid and divider lines to editor
		this.grid = new Grid(this);
		this.dividers = new Dividers(this);
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
		const chrData = CHR[this.chrIndex];
		const rect = this.canvas.getBoundingClientRect();
		const x = ev.clientX - rect.left;
		const y = ev.clientY - rect.top;
		const xScale = Math.floor(x / this.zoom);
		const yScale = Math.floor(y / this.zoom);
		let index = (yScale * chrData.width) + xScale;

		if (chrData.width > 8) {
			let offset = 0;
			if (xScale >= chrData.width / 2) { offset++; }
			if (yScale >= chrData.height / 2) { offset++; }
			index = (64 * offset) + (yScale * 8) + (xScale % 8);
		}
		this.pixels[index].paletteIndex = getPaletteIndex();
		this.tiles.pixels[this.chrIndex][index].paletteIndex = getPaletteIndex();
		this.draw();
		this.tiles.draw();
	}
}

class Dividers {
	constructor(editor) {
		Object.assign(this, {
			style: 'rgba(255,255,255,0.65)',
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
			style: 'rgba(255,255,255,0.25)',
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
},{"./data":6,"./utils":7}],2:[function(require,module,exports){
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
},{"./data":6}],3:[function(require,module,exports){
const Editor = require('./Editor');
const Palette = require('./Palette');
const Tiles = require('./Tiles');
const States = require('./States');

class SpriteMaker {
	constructor() {
		this.editor = new Editor();
		this.tiles = new Tiles(this);
		this.editor.tiles = this.tiles;
		this.states = new States(this.tiles);
		this.palette = new Palette();
	}

	draw() {
		this.editor.draw();
		this.tiles.draw();
		this.states.draw();
	}
}

window.SpriteMaker = SpriteMaker;
},{"./Editor":1,"./Palette":2,"./States":4,"./Tiles":5}],4:[function(require,module,exports){
const { palette, states } = require('./data');
const { resizeCanvas } = require('./utils');

class States {
	constructor(tiles) {
		Object.assign(this, {
			animations: [],
			zoom: 3,
			fps: 3,
			tiles
		});

		states.forEach((state, index) => {
			const canvas = $('<canvas></canvas>');
			canvas.addClass('state-canvas');
			canvas.data('sid', index);
			$('#states').append(canvas);
			state.canvas = canvas;
			state.ctx = canvas[0].getContext('2d');
			state.frameCount = 0;

			state.frames.forEach(frame => {
				frame.forEach(part => {
					part.pixels = this.tiles.pixels.find(pixels => {
						return pixels.name === part.name;
					});
				});
			});
			resizeCanvas.call(this, canvas, state.width, state.height, this.zoom);
		});

		setInterval(this.draw.bind(this), 1000 / this.fps);
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
},{"./data":6,"./utils":7}],5:[function(require,module,exports){
const { CHR, palette } = require('./data');
const { loadChr, resizeCanvas } = require('./utils');

class Tiles {
	constructor(editor) {
		this.editor = editor;
		this.pixels = [];
		this.zoom = 3;

		CHR.forEach((chr, index) => {
			const canvas = $('<canvas></canvas>');
			canvas.addClass('tile-canvas');
			canvas.data('tid', index);
			canvas.click(() => {
				// load into editor
			});
			$('#tiles').append(canvas);

			const pixels = [];
			pixels.name = chr.name;
			loadChr(index, pixels, this.zoom);
			this.pixels.push(pixels);

			pixels.canvas = canvas;
			pixels.ctx = canvas[0].getContext('2d');
			resizeCanvas.call(this, canvas[0], chr.width, chr.height, this.zoom);
		});

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
},{"./data":6,"./utils":7}],6:[function(require,module,exports){
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
			hex: '00FF00',
			index: 15
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

},{}],7:[function(require,module,exports){
const { CHR } = require('./data');

exports.loadChr = function loadChr(chrIndex, pixels, zoom) {
	const chrData = CHR[chrIndex];
	pixels.length = 0;
	chrData.data.forEach((paletteIndex, index) => {
		const layoutIndex = Math.floor(index / 64);
		const layout = chrData.layout[layoutIndex];
		pixels.push({
			x: ((index % 8) + (layout >= 2 ? 8 : 0)) * zoom,
			y: ((Math.floor((index % 64) / 8)) + (layout % 2 === 1 ? 8 : 0)) * zoom,
			paletteIndex
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
},{"./data":6}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc3ByaXRlLW1ha2VyL0VkaXRvci5qcyIsInNyYy9zcHJpdGUtbWFrZXIvUGFsZXR0ZS5qcyIsInNyYy9zcHJpdGUtbWFrZXIvU3ByaXRlTWFrZXIuanMiLCJzcmMvc3ByaXRlLW1ha2VyL1N0YXRlcy5qcyIsInNyYy9zcHJpdGUtbWFrZXIvVGlsZXMuanMiLCJzcmMvc3ByaXRlLW1ha2VyL2RhdGEuanMiLCJzcmMvc3ByaXRlLW1ha2VyL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiY29uc3QgeyBDSFIsIHBhbGV0dGUgfSA9IHJlcXVpcmUoJy4vZGF0YScpO1xuY29uc3QgeyBnZXRQYWxldHRlSW5kZXgsIGxvYWRDaHIsIHJlc2l6ZUNhbnZhcyB9ID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5jbGFzcyBFZGl0b3Ige1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHR0aGlzLmNockluZGV4ID0gMDtcblx0XHR0aGlzLnpvb20gPSAxNjtcblx0XHR0aGlzLm1vdXNlZG93biA9IGZhbHNlO1xuXHRcdHRoaXMucGl4ZWxzID0gW107XG5cblx0XHQvLyBjcmVhdGUgY2FudmFzIGZvciBlZGl0b3Jcblx0XHRjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHRjYW52YXMuY2xhc3NOYW1lID0gJ2VkaXRvci1jYW52YXMnO1xuXHRcdGNhbnZhcy5pZCA9ICdlZGl0b3ItY2FudmFzJztcblx0XHQkKCcjZWRpdG9yLWNvbnRhaW5lcicpLmFwcGVuZChjYW52YXMpO1xuXHRcdHRoaXMuY2FudmFzID0gY2FudmFzO1xuXHRcdHRoaXMuY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cblx0XHQvLyBhZGQgZHJhd2luZyBldmVudHMgZm9yIGVkaXRvciBjYW52YXNcblx0XHRjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmRyYXdQaXhlbC5iaW5kKHRoaXMpLCBmYWxzZSk7XG5cdFx0Y2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCAoKSA9PiB0aGlzLm1vdXNlZG93biA9IGZhbHNlKTtcblx0XHRjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZXYgPT4ge1xuXHRcdFx0dGhpcy5tb3VzZWRvd24gPSB0cnVlO1xuXHRcdFx0dGhpcy5kcmF3UGl4ZWwoZXYpO1xuXHRcdH0pO1xuXHRcdGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBldiA9PiB7XG5cdFx0XHRpZiAodGhpcy5tb3VzZWRvd24pIHtcblx0XHRcdFx0dGhpcy5kcmF3UGl4ZWwoZXYpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ly8gbG9hZCBjaHIgZGF0YSBpbnRvIGVkaXRvciBjYW52YXNcblx0XHRjb25zdCB7IHdpZHRoLCBoZWlnaHQgfSA9IGxvYWRDaHIodGhpcy5jaHJJbmRleCwgdGhpcy5waXhlbHMsIHRoaXMuem9vbSk7XG5cdFx0cmVzaXplQ2FudmFzLmNhbGwodGhpcywgY2FudmFzLCB3aWR0aCwgaGVpZ2h0LCB0aGlzLnpvb20pO1xuXG5cdFx0Ly8gYWRkIGdyaWQgYW5kIGRpdmlkZXIgbGluZXMgdG8gZWRpdG9yXG5cdFx0dGhpcy5ncmlkID0gbmV3IEdyaWQodGhpcyk7XG5cdFx0dGhpcy5kaXZpZGVycyA9IG5ldyBEaXZpZGVycyh0aGlzKTtcblx0fVxuXG5cdGRyYXcoKSB7XG5cdFx0Y29uc3QgeyBjdHgsIHpvb20gfSA9IHRoaXM7XG5cdFx0dGhpcy5waXhlbHMuZm9yRWFjaChwID0+IHtcblx0XHRcdGN0eC5maWxsU3R5bGUgPSAnIycgKyBwYWxldHRlW3AucGFsZXR0ZUluZGV4XS5oZXg7XG5cdFx0XHRjdHguZmlsbFJlY3QocC54LCBwLnksIHpvb20sIHpvb20pO1xuXHRcdH0pO1xuXHRcdHRoaXMuZ3JpZC5kcmF3KCk7XG5cdFx0dGhpcy5kaXZpZGVycy5kcmF3KCk7XG5cdH1cblxuXHRkcmF3UGl4ZWwoZXYpIHtcblx0XHRjb25zdCBjaHJEYXRhID0gQ0hSW3RoaXMuY2hySW5kZXhdO1xuXHRcdGNvbnN0IHJlY3QgPSB0aGlzLmNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblx0XHRjb25zdCB4ID0gZXYuY2xpZW50WCAtIHJlY3QubGVmdDtcblx0XHRjb25zdCB5ID0gZXYuY2xpZW50WSAtIHJlY3QudG9wO1xuXHRcdGNvbnN0IHhTY2FsZSA9IE1hdGguZmxvb3IoeCAvIHRoaXMuem9vbSk7XG5cdFx0Y29uc3QgeVNjYWxlID0gTWF0aC5mbG9vcih5IC8gdGhpcy56b29tKTtcblx0XHRsZXQgaW5kZXggPSAoeVNjYWxlICogY2hyRGF0YS53aWR0aCkgKyB4U2NhbGU7XG5cblx0XHRpZiAoY2hyRGF0YS53aWR0aCA+IDgpIHtcblx0XHRcdGxldCBvZmZzZXQgPSAwO1xuXHRcdFx0aWYgKHhTY2FsZSA+PSBjaHJEYXRhLndpZHRoIC8gMikgeyBvZmZzZXQrKzsgfVxuXHRcdFx0aWYgKHlTY2FsZSA+PSBjaHJEYXRhLmhlaWdodCAvIDIpIHsgb2Zmc2V0Kys7IH1cblx0XHRcdGluZGV4ID0gKDY0ICogb2Zmc2V0KSArICh5U2NhbGUgKiA4KSArICh4U2NhbGUgJSA4KTtcblx0XHR9XG5cdFx0dGhpcy5waXhlbHNbaW5kZXhdLnBhbGV0dGVJbmRleCA9IGdldFBhbGV0dGVJbmRleCgpO1xuXHRcdHRoaXMudGlsZXMucGl4ZWxzW3RoaXMuY2hySW5kZXhdW2luZGV4XS5wYWxldHRlSW5kZXggPSBnZXRQYWxldHRlSW5kZXgoKTtcblx0XHR0aGlzLmRyYXcoKTtcblx0XHR0aGlzLnRpbGVzLmRyYXcoKTtcblx0fVxufVxuXG5jbGFzcyBEaXZpZGVycyB7XG5cdGNvbnN0cnVjdG9yKGVkaXRvcikge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywge1xuXHRcdFx0c3R5bGU6ICdyZ2JhKDI1NSwyNTUsMjU1LDAuNjUpJyxcblx0XHRcdHNob3c6IHRydWUsXG5cdFx0XHRlZGl0b3Jcblx0XHR9KTtcblx0fVxuXG5cdGRyYXcoKSB7XG5cdFx0aWYgKHRoaXMuc2hvdykge1xuXHRcdFx0Y29uc3QgeyBjdHgsIGhlaWdodCwgd2lkdGgsIHpvb20gfSA9IHRoaXMuZWRpdG9yO1xuXHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gdGhpcy5zdHlsZTtcblx0XHRcdGN0eC5iZWdpblBhdGgoKTtcblx0XHRcdGN0eC5tb3ZlVG8oMCwgaGVpZ2h0ICogem9vbSAvIDIpO1xuXHRcdFx0Y3R4LmxpbmVUbyh3aWR0aCAqIHpvb20sIGhlaWdodCAqIHpvb20gLyAyKTtcblx0XHRcdGN0eC5zdHJva2UoKTtcblxuXHRcdFx0Y3R4LmJlZ2luUGF0aCgpO1xuXHRcdFx0Y3R4Lm1vdmVUbyh3aWR0aCAqIHpvb20gLyAyLCAwKTtcblx0XHRcdGN0eC5saW5lVG8od2lkdGggKiB6b29tIC8gMiwgaGVpZ2h0ICogem9vbSk7XG5cdFx0XHRjdHguc3Ryb2tlKCk7XG5cdFx0fVxuXHR9XG59XG5cbmNsYXNzIEdyaWQge1xuXHRjb25zdHJ1Y3RvcihlZGl0b3IpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHtcblx0XHRcdHN0eWxlOiAncmdiYSgyNTUsMjU1LDI1NSwwLjI1KScsXG5cdFx0XHRzaG93OiB0cnVlLFxuXHRcdFx0ZWRpdG9yXG5cdFx0fSk7XG5cdH1cblxuXHRkcmF3KCkge1xuXHRcdGlmICh0aGlzLnNob3cpIHtcblx0XHRcdGNvbnN0IHsgY3R4LCBoZWlnaHQsIHdpZHRoLCB6b29tIH0gPSB0aGlzLmVkaXRvcjtcblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuc3R5bGU7XG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHdpZHRoICsgMTsgaSsrKSB7XG5cdFx0XHRcdGN0eC5iZWdpblBhdGgoKTtcblx0XHRcdFx0Y3R4Lm1vdmVUbyhpICogem9vbSwgMCk7XG5cdFx0XHRcdGN0eC5saW5lVG8oaSAqIHpvb20sIGhlaWdodCAqIHpvb20pO1xuXHRcdFx0XHRjdHguc3Ryb2tlKCk7XG5cdFx0XHR9XG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8aGVpZ2h0ICsgMTsgaSsrKSB7XG5cdFx0XHRcdGN0eC5iZWdpblBhdGgoKTtcblx0XHRcdFx0Y3R4Lm1vdmVUbygwLCBpICogem9vbSk7XG5cdFx0XHRcdGN0eC5saW5lVG8od2lkdGggKiB6b29tLCBpICogem9vbSk7XG5cdFx0XHRcdGN0eC5zdHJva2UoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3I7IiwiY29uc3QgeyBwYWxldHRlIH0gPSByZXF1aXJlKCcuL2RhdGEnKTtcblxuY2xhc3MgUGFsZXR0ZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHBhbGV0dGUuZm9yRWFjaCgocCwgaW5kZXgpID0+IHtcblx0XHRcdGNvbnN0IGJ1dHRvbiA9ICQoJzxidXR0b24+PC9idXR0b24+Jyk7XG5cdFx0XHRidXR0b24uYWRkQ2xhc3MoJ3BhbGV0dGUtYnV0dG9uJyk7XG5cdFx0XHRpZiAoaW5kZXggPT09IDApIHtcblx0XHRcdFx0YnV0dG9uLmFkZENsYXNzKCdwYWxldHRlLWJ1dHRvbi1zZWxlY3RlZCcpO1xuXHRcdFx0fVxuXHRcdFx0YnV0dG9uLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICcjJyArIHAuaGV4KTtcblx0XHRcdGJ1dHRvbi5kYXRhKCdwaScsIGluZGV4KTtcblx0XHRcdCQoJyNwYWxldHRlLWNvbnRhaW5lcicpLmFwcGVuZChidXR0b24pO1xuXG5cdFx0XHRidXR0b24uY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdFx0JCgnLnBhbGV0dGUtYnV0dG9uJykuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpZiAodGhpcyA9PT0gc2VsZikge1xuXHRcdFx0XHRcdFx0JCh0aGlzKS5hZGRDbGFzcygncGFsZXR0ZS1idXR0b24tc2VsZWN0ZWQnKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCh0aGlzKS5yZW1vdmVDbGFzcygncGFsZXR0ZS1idXR0b24tc2VsZWN0ZWQnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQYWxldHRlOyIsImNvbnN0IEVkaXRvciA9IHJlcXVpcmUoJy4vRWRpdG9yJyk7XG5jb25zdCBQYWxldHRlID0gcmVxdWlyZSgnLi9QYWxldHRlJyk7XG5jb25zdCBUaWxlcyA9IHJlcXVpcmUoJy4vVGlsZXMnKTtcbmNvbnN0IFN0YXRlcyA9IHJlcXVpcmUoJy4vU3RhdGVzJyk7XG5cbmNsYXNzIFNwcml0ZU1ha2VyIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dGhpcy5lZGl0b3IgPSBuZXcgRWRpdG9yKCk7XG5cdFx0dGhpcy50aWxlcyA9IG5ldyBUaWxlcyh0aGlzKTtcblx0XHR0aGlzLmVkaXRvci50aWxlcyA9IHRoaXMudGlsZXM7XG5cdFx0dGhpcy5zdGF0ZXMgPSBuZXcgU3RhdGVzKHRoaXMudGlsZXMpO1xuXHRcdHRoaXMucGFsZXR0ZSA9IG5ldyBQYWxldHRlKCk7XG5cdH1cblxuXHRkcmF3KCkge1xuXHRcdHRoaXMuZWRpdG9yLmRyYXcoKTtcblx0XHR0aGlzLnRpbGVzLmRyYXcoKTtcblx0XHR0aGlzLnN0YXRlcy5kcmF3KCk7XG5cdH1cbn1cblxud2luZG93LlNwcml0ZU1ha2VyID0gU3ByaXRlTWFrZXI7IiwiY29uc3QgeyBwYWxldHRlLCBzdGF0ZXMgfSA9IHJlcXVpcmUoJy4vZGF0YScpO1xuY29uc3QgeyByZXNpemVDYW52YXMgfSA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuY2xhc3MgU3RhdGVzIHtcblx0Y29uc3RydWN0b3IodGlsZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHtcblx0XHRcdGFuaW1hdGlvbnM6IFtdLFxuXHRcdFx0em9vbTogMyxcblx0XHRcdGZwczogMyxcblx0XHRcdHRpbGVzXG5cdFx0fSk7XG5cblx0XHRzdGF0ZXMuZm9yRWFjaCgoc3RhdGUsIGluZGV4KSA9PiB7XG5cdFx0XHRjb25zdCBjYW52YXMgPSAkKCc8Y2FudmFzPjwvY2FudmFzPicpO1xuXHRcdFx0Y2FudmFzLmFkZENsYXNzKCdzdGF0ZS1jYW52YXMnKTtcblx0XHRcdGNhbnZhcy5kYXRhKCdzaWQnLCBpbmRleCk7XG5cdFx0XHQkKCcjc3RhdGVzJykuYXBwZW5kKGNhbnZhcyk7XG5cdFx0XHRzdGF0ZS5jYW52YXMgPSBjYW52YXM7XG5cdFx0XHRzdGF0ZS5jdHggPSBjYW52YXNbMF0uZ2V0Q29udGV4dCgnMmQnKTtcblx0XHRcdHN0YXRlLmZyYW1lQ291bnQgPSAwO1xuXG5cdFx0XHRzdGF0ZS5mcmFtZXMuZm9yRWFjaChmcmFtZSA9PiB7XG5cdFx0XHRcdGZyYW1lLmZvckVhY2gocGFydCA9PiB7XG5cdFx0XHRcdFx0cGFydC5waXhlbHMgPSB0aGlzLnRpbGVzLnBpeGVscy5maW5kKHBpeGVscyA9PiB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcGl4ZWxzLm5hbWUgPT09IHBhcnQubmFtZTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHRcdHJlc2l6ZUNhbnZhcy5jYWxsKHRoaXMsIGNhbnZhcywgc3RhdGUud2lkdGgsIHN0YXRlLmhlaWdodCwgdGhpcy56b29tKTtcblx0XHR9KTtcblxuXHRcdHNldEludGVydmFsKHRoaXMuZHJhdy5iaW5kKHRoaXMpLCAxMDAwIC8gdGhpcy5mcHMpO1xuXHR9XG5cblx0ZHJhdygpIHtcblx0XHRzdGF0ZXMuZm9yRWFjaChzdGF0ZSA9PiB7XG5cdFx0XHRjb25zdCB7IGN0eCB9ID0gc3RhdGU7XG5cdFx0XHRjdHguY2xlYXJSZWN0KDAsIDAsIHN0YXRlLndpZHRoICogdGhpcy56b29tLCBzdGF0ZS5oZWlnaHQgKiB0aGlzLnpvb20pO1xuXG5cdFx0XHRjb25zdCBmcmFtZSA9IHN0YXRlLmZyYW1lc1tzdGF0ZS5mcmFtZUNvdW50XTtcblx0XHRcdGZyYW1lLmZvckVhY2gocGFydCA9PiB7XG5cdFx0XHRcdHBhcnQucGl4ZWxzLmZvckVhY2gocCA9PiB7XG5cdFx0XHRcdFx0Y3R4LmZpbGxTdHlsZSA9ICcjJyArIHBhbGV0dGVbcC5wYWxldHRlSW5kZXhdLmhleDtcblx0XHRcdFx0XHRjdHguZmlsbFJlY3QoXG5cdFx0XHRcdFx0XHRwLnggKyAocGFydC54ID4gMCA/IDQgKiBwYXJ0LnggKiB0aGlzLnpvb20gOiAwKSwgXG5cdFx0XHRcdFx0XHRwLnkgKyAocGFydC55ID4gMCA/IDggKiBwYXJ0LnkgKiB0aGlzLnpvb20gOiAwKSwgXG5cdFx0XHRcdFx0XHR0aGlzLnpvb20sIFxuXHRcdFx0XHRcdFx0dGhpcy56b29tXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHRcdHN0YXRlLmZyYW1lQ291bnQrKztcblx0XHRcdGlmIChzdGF0ZS5mcmFtZUNvdW50ID49IHN0YXRlLmZyYW1lcy5sZW5ndGgpIHtcblx0XHRcdFx0c3RhdGUuZnJhbWVDb3VudCA9IDA7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTdGF0ZXM7IiwiY29uc3QgeyBDSFIsIHBhbGV0dGUgfSA9IHJlcXVpcmUoJy4vZGF0YScpO1xuY29uc3QgeyBsb2FkQ2hyLCByZXNpemVDYW52YXMgfSA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuY2xhc3MgVGlsZXMge1xuXHRjb25zdHJ1Y3RvcihlZGl0b3IpIHtcblx0XHR0aGlzLmVkaXRvciA9IGVkaXRvcjtcblx0XHR0aGlzLnBpeGVscyA9IFtdO1xuXHRcdHRoaXMuem9vbSA9IDM7XG5cblx0XHRDSFIuZm9yRWFjaCgoY2hyLCBpbmRleCkgPT4ge1xuXHRcdFx0Y29uc3QgY2FudmFzID0gJCgnPGNhbnZhcz48L2NhbnZhcz4nKTtcblx0XHRcdGNhbnZhcy5hZGRDbGFzcygndGlsZS1jYW52YXMnKTtcblx0XHRcdGNhbnZhcy5kYXRhKCd0aWQnLCBpbmRleCk7XG5cdFx0XHRjYW52YXMuY2xpY2soKCkgPT4ge1xuXHRcdFx0XHQvLyBsb2FkIGludG8gZWRpdG9yXG5cdFx0XHR9KTtcblx0XHRcdCQoJyN0aWxlcycpLmFwcGVuZChjYW52YXMpO1xuXG5cdFx0XHRjb25zdCBwaXhlbHMgPSBbXTtcblx0XHRcdHBpeGVscy5uYW1lID0gY2hyLm5hbWU7XG5cdFx0XHRsb2FkQ2hyKGluZGV4LCBwaXhlbHMsIHRoaXMuem9vbSk7XG5cdFx0XHR0aGlzLnBpeGVscy5wdXNoKHBpeGVscyk7XG5cblx0XHRcdHBpeGVscy5jYW52YXMgPSBjYW52YXM7XG5cdFx0XHRwaXhlbHMuY3R4ID0gY2FudmFzWzBdLmdldENvbnRleHQoJzJkJyk7XG5cdFx0XHRyZXNpemVDYW52YXMuY2FsbCh0aGlzLCBjYW52YXNbMF0sIGNoci53aWR0aCwgY2hyLmhlaWdodCwgdGhpcy56b29tKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuZHJhdygpO1xuXHR9XG5cblx0ZHJhdygpIHtcblx0XHR0aGlzLnBpeGVscy5mb3JFYWNoKHBpeGVscyA9PiB7XG5cdFx0XHRwaXhlbHMuZm9yRWFjaChwID0+IHtcblx0XHRcdFx0cGl4ZWxzLmN0eC5maWxsU3R5bGUgPSAnIycgKyBwYWxldHRlW3AucGFsZXR0ZUluZGV4XS5oZXg7XG5cdFx0XHRcdHBpeGVscy5jdHguZmlsbFJlY3QocC54LCBwLnksIHRoaXMuem9vbSwgdGhpcy56b29tKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVGlsZXM7IiwiLy8gRE8gTk9UIEVESVQgVEhJUyBGSUxFIERJUkVDVExZISBUaGlzIGZpbGUgaGFzIGJlZW4gZ2VuZXJhdGVkIHZpYSBhIFJPTSBzcHJpdGVcbi8vIGV4dHJhY3Rpb24gdG9vbCBsb2NhdGVkIGF0IHRvb2xzL3Nwcml0ZS1leHRyYWN0LmpzXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRDSFI6IFtcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25JZGxlVG9wJyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRvZmZzZXQ6IDEzNTIxNixcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyLFxuXHRcdFx0XHQxLFxuXHRcdFx0XHQzXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMSwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDEsMywxLDEsMSwwLDAsMCwxLDEsMywyLDEsMCwwLDAsMSwzLDMsMiwxLDAsMCwwLDEsMywyLDEsMSwwLDAsMCwxLDEsMSwzLDMsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDEsMSwwLDAsMCwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMSwxLDEsMSwyLDEsMCwwLDEsMiwyLDEsMSwxLDAsMCwwLDAsMCwwLDEsMywyLDIsMCwwLDAsMCwwLDEsMSwxLDAsMSwxLDAsMSwxLDMsMSwxLDMsMywxLDEsMSwxLDEsMSwzLDMsMywzLDEsMSwxLDAsMSwzLDMsMywxLDEsMSwwLDAsMSwxLDEsMSwxLDEsMCwwLDAsMCwwLDAsMSwxLDIsMSwyLDEsMSwxLDEsMCwxLDEsMiwyLDEsMSwxLDEsMSwxLDIsMiwxLDEsMSwxLDEsMSwyLDIsMSwzLDEsMCwxLDEsMiwyLDEsMSwwLDAsMSwxLDEsMSwxLDEsMCwwLDEsMSwxLDEsMSwwLDAsMCwyLDEsMSwyLDIsMSwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25JZGxlQm90dG9tJyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRvZmZzZXQ6IDEzNTI4MCxcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyLFxuXHRcdFx0XHQxLFxuXHRcdFx0XHQzXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDIsMiwwLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwwLDMsMSwxLDAsMCwwLDAsMywxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDEsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDAsMCwwLDAsMSwzLDEsMSwwLDAsMiwyLDIsMiwyLDEsMCwwLDEsMiwyLDIsMiwxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMSwzLDEsMSwxLDAsMCwwLDEsMywxLDEsMSwwLDAsMCwwLDEsMSwxLDEsMCwwLDAsMCwxLDEsMSwxLDAsMCwwLDAsMCwxLDEsMywxLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwwLDEsMywzLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDAsMSwzLDEsMSwwLDAsMSwxLDMsMywzLDEsMCwwLDEsMywzLDMsMywxLDAsMCwxLDEsMSwxLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDMsMywxLDEsMCwwLDAsMCwxLDMsMywxLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwwLDEsMywzLDEsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMCwwLDAsMCwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25XYWxrMVRvcCcsXG5cdFx0XHRoZWlnaHQ6IDE2LFxuXHRcdFx0d2lkdGg6IDE2LFxuXHRcdFx0b2Zmc2V0OiAxMzUzNDQsXG5cdFx0XHRsYXlvdXQ6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0Mixcblx0XHRcdFx0MSxcblx0XHRcdFx0M1xuXHRcdFx0XSxcblx0XHRcdGRhdGE6IFswLDAsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMSwwLDAsMSwzLDEsMSwxLDEsMSwwLDEsMSwzLDIsMSwxLDEsMCwxLDMsMywyLDIsMSwxLDAsMSwzLDIsMiwxLDEsMSwwLDEsMSwxLDEsMiwzLDIsMCwwLDAsMSwxLDMsMiwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDIsMSwwLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwwLDAsMCwwLDEsMiwxLDEsMSwzLDAsMCwxLDIsMiwxLDEsMSwwLDAsMSwxLDIsMiwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDEsMywxLDEsMywwLDAsMSwzLDMsMywzLDMsMCwwLDEsMywzLDMsMywzLDAsMCwwLDEsMSwxLDEsMSwxLDEsMSwwLDAsMCwwLDAsMywxLDEsMCwwLDAsMCwwLDEsMSwxLDEsMCwwLDAsMCwzLDEsMSwxLDAsMCwwLDAsMywzLDEsMSwwLDAsMCwwLDMsMywxLDAsMCwwLDAsMCwxLDEsMSwwLDAsMCwwLDAsMSwyLDEsMCwwLDAsMCwwXVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3NpbW9uV2FsazFCb3R0b20nLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM1NDA4LFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwxLDIsMiwyLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwxLDMsMSwzLDEsMCwwLDAsMSwxLDEsMywxLDAsMCwwLDEsMSwxLDMsMSwwLDAsMCwxLDEsMSwzLDEsMCwwLDAsMCwxLDEsMSwxLDAsMCwwLDAsMCwxLDEsMSwyLDIsMSwwLDAsMCwwLDAsMSwxLDEsMCwwLDAsMCwwLDEsMSwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDMsMywwLDAsMCwwLDAsMCwxLDMsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMSwzLDAsMCwwLDAsMCwwLDEsMSwwLDAsMCwwLDAsMCwwLDAsMywxLDAsMCwwLDAsMCwwLDMsMSwxLDAsMCwwLDAsMCwzLDMsMSwwLDAsMCwwLDAsMywzLDEsMSwwLDAsMCwwLDMsMywzLDEsMCwwLDAsMCwzLDMsMywxLDAsMCwwLDAsMSwxLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbldhbGsyVG9wJyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRvZmZzZXQ6IDEzNTQ3Mixcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyLFxuXHRcdFx0XHQxLFxuXHRcdFx0XHQzXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwxLDAsMCwxLDEsMSwxLDEsMSwxLDAsMSwzLDEsMSwxLDEsMSwwLDEsMSwzLDIsMSwxLDEsMCwxLDMsMywyLDIsMSwxLDAsMSwzLDIsMiwyLDEsMSwwLDEsMSwxLDIsMSwxLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDEsMSwxLDAsMCwwLDAsMSwzLDIsMiwxLDAsMCwwLDMsMiwyLDEsMSwwLDAsMCwwLDAsMCwxLDEsMSwyLDEsMCwwLDAsMiwxLDIsMiwxLDAsMCwwLDEsMiwyLDIsMiwwLDEsMSwxLDIsMiwyLDIsMSwzLDMsMSwxLDIsMiwyLDEsMywzLDMsMSwxLDEsMSwxLDMsMywxLDEsMSwxLDEsMCwxLDEsMCwwLDEsMSwyLDEsMSwxLDEsMSwxLDAsMCwxLDMsMSwxLDEsMSwxLDAsMSwxLDMsMSwxLDMsMywxLDIsMSwxLDEsMywzLDMsMSwxLDEsMSwxLDEsMywzLDEsMSwxLDEsMywzLDMsMywxLDEsMiwxLDMsMywzLDEsMCwyLDIsMSwxLDMsMywxLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25XYWxrMkJvdHRvbScsXG5cdFx0XHRoZWlnaHQ6IDE2LFxuXHRcdFx0d2lkdGg6IDE2LFxuXHRcdFx0b2Zmc2V0OiAxMzU1MzYsXG5cdFx0XHRsYXlvdXQ6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0Mixcblx0XHRcdFx0MSxcblx0XHRcdFx0M1xuXHRcdFx0XSxcblx0XHRcdGRhdGE6IFswLDAsMCwwLDAsMCwxLDIsMCwwLDAsMCwwLDEsMiwxLDAsMCwwLDAsMCwxLDMsMSwwLDAsMCwwLDEsMywxLDEsMCwwLDAsMSwzLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMSwxLDEsMSwxLDAsMCwwLDEsMywzLDEsMSwwLDIsMiwyLDEsMSwxLDAsMCwxLDIsMiwyLDIsMSwwLDAsMSwxLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMCwzLDEsMSwxLDAsMCwwLDAsMywxLDEsMSwxLDAsMCwwLDAsMSwxLDMsMSwxLDAsMCwwLDEsMywzLDMsMSwwLDAsMCwxLDMsMywzLDEsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDEsMywzLDEsMCwwLDAsMSwzLDMsMywxLDAsMCwxLDMsMywzLDMsMSwwLDAsMSwxLDEsMSwxLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDAsMSwzLDMsMSwxLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwwLDAsMSwzLDMsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDEsMywzLDMsMSwwLDAsMCwxLDEsMSwxLDEsMCwwLDAsMCwwLDAsMCwwXVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRnJvbnRMZWcnLFxuXHRcdFx0aGVpZ2h0OiA4LFxuXHRcdFx0d2lkdGg6IDgsXG5cdFx0XHRvZmZzZXQ6IDEzNTYwMCxcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMSwxLDEsMSwxLDEsMiwxLDMsMywxLDEsMSwxLDEsMSwzLDMsMywxLDEsMSwxLDEsMywzLDMsMSwxLDEsMywwLDEsMywzLDEsMSwzLDEsMCwwLDEsMywzLDEsMSwxLDAsMSwzLDMsMywxLDEsMSwxLDMsMywzLDMsMywxLDFdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTEnLFxuXHRcdFx0aGVpZ2h0OiA4LFxuXHRcdFx0d2lkdGg6IDgsXG5cdFx0XHRvZmZzZXQ6IDEzNTYxNixcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdGhlaWdodDogOCxcblx0XHRcdHdpZHRoOiA4LFxuXHRcdFx0b2Zmc2V0OiAxMzU2MzIsXG5cdFx0XHRsYXlvdXQ6IFtcblx0XHRcdFx0MFxuXHRcdFx0XSxcblx0XHRcdGRhdGE6IFsyLDIsMiwyLDIsMSwwLDAsMiwyLDIsMiwyLDEsMCwwLDEsMiwyLDIsMiwxLDEsMCwxLDEsMiwyLDEsMywzLDEsMSwxLDEsMSwzLDMsMywxLDEsMSwzLDMsMywxLDMsMSwxLDMsMSwxLDEsMSwzLDEsMSwxLDAsMSwxLDMsMywxXVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcblx0XHRcdGhlaWdodDogOCxcblx0XHRcdHdpZHRoOiA4LFxuXHRcdFx0b2Zmc2V0OiAxMzU2NDgsXG5cdFx0XHRsYXlvdXQ6IFtcblx0XHRcdFx0MFxuXHRcdFx0XSxcblx0XHRcdGRhdGE6IFswLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwXVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJzRGFtYWdlTGVnJyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogOCxcblx0XHRcdG9mZnNldDogMTM1NjY0LFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDFcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDEsMSwyLDAsMCwwLDAsMSwzLDEsMSwwLDAsMCwxLDMsMSwxLDEsMCwwLDAsMSwzLDEsMSwxLDAsMCwxLDMsMSwxLDEsMSwwLDAsMSwxLDEsMSwxLDMsMCwwLDEsMSwxLDEsMCwxLDAsMSwxLDEsMSwwLDAsMCwwLDEsMywzLDMsMSwwLDAsMCwxLDMsMywzLDEsMCwwLDAsMSwzLDMsMywxLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwwLDEsMywzLDEsMCwwLDAsMCwxLDMsMywzLDEsMCwwLDEsMywzLDMsMSwxLDAsMSwzLDMsMywxLDAsMCwwXVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJXYWxrVXBMZWdzJyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRvZmZzZXQ6IDEzNTY5Nixcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyLFxuXHRcdFx0XHQxLFxuXHRcdFx0XHQzXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDAsMSwzLDMsMywxLDEsMSwwLDAsMSwzLDMsMSwwLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwxLDMsMywzLDMsMSwwLDEsMywzLDMsMywzLDEsMiwyLDIsMiwyLDEsMCwwLDIsMiwyLDIsMiwxLDAsMCwxLDEsMiwyLDIsMSwwLDAsMSwxLDEsMSwxLDEsMCwwLDEsMywxLDEsMSwwLDAsMCwxLDMsMSwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwxLDMsMSwxLDAsMCwwLDEsMywzLDMsMSwwLDAsMCwxLDEsMywzLDEsMCwwLDAsMCwxLDMsMywxLDAsMCwwLDAsMSwzLDMsMSwwLDAsMCwwLDEsMywzLDMsMSwwLDAsMSwzLDMsMywxLDEsMCwxLDMsMywzLDEsMCwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMScsXG5cdFx0XHRoZWlnaHQ6IDE2LFxuXHRcdFx0d2lkdGg6IDE2LFxuXHRcdFx0b2Zmc2V0OiAxMzU3NjAsXG5cdFx0XHRsYXlvdXQ6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0Mixcblx0XHRcdFx0MSxcblx0XHRcdFx0M1xuXHRcdFx0XSxcblx0XHRcdGRhdGE6IFswLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMSwwLDAsMSwzLDMsMSwxLDEsMCwwLDEsMSwzLDMsMSwxLDAsMCwxLDMsMywyLDEsMSwwLDEsMSwyLDIsMSwxLDEsMSwyLDEsMSwxLDEsMSwzLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwwLDAsMCwwLDEsMSwxLDAsMCwwLDAsMCwzLDIsMSwxLDAsMSwxLDAsMSwxLDEsMiwyLDEsMSwxLDEsMiwyLDIsMiwxLDEsMSwxLDIsMiwyLDIsMSwxLDEsMSwyLDIsMiwyLDIsMiwxLDEsMSwxLDEsMiwyLDEsMSwxLDEsMSwxLDEsMSwxLDAsMSwxLDEsMSwxLDEsMCwwLDIsMiwyLDIsMiwxLDAsMCwxLDIsMiwxLDEsMywzLDEsMSwxLDEsMCwxLDMsMywzLDEsMSwxLDEsMSwxLDMsMSwxLDEsMSwzLDMsMywxLDAsMSwxLDEsMywzLDMsMSwwLDAsMSwxLDEsMSwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwXVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDInLFxuXHRcdFx0aGVpZ2h0OiAxNixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdG9mZnNldDogMTM1ODg4LFxuXHRcdFx0bGF5b3V0OiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDIsXG5cdFx0XHRcdDEsXG5cdFx0XHRcdDNcblx0XHRcdF0sXG5cdFx0XHRkYXRhOiBbMCwwLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwwLDAsMCwxLDEsMSwxLDEsMSwwLDAsMSwzLDMsMSwxLDEsMSwwLDEsMSwzLDMsMSwxLDEsMCwxLDMsMywyLDEsMywzLDEsMSwyLDIsMSwzLDMsMywzLDAsMSwxLDIsMSwzLDMsMywwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDEsMSwxLDEsMSwwLDAsMywzLDMsMywzLDMsMSwxLDAsMSwyLDEsMSwzLDMsMiwxLDIsMSwxLDMsMywyLDEsMSwyLDEsMSwyLDIsMiwxLDEsMiwyLDEsMSwyLDEsMSwwLDEsMiwyLDEsMSwxLDEsMCwxLDEsMSwxLDEsMSwwLDEsMSwxLDEsMSwxLDAsMCwyLDIsMiwyLDIsMSwwLDAsMSwxLDEsMSwxLDEsMywzLDAsMCwwLDAsMCwwLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AzJyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRvZmZzZXQ6IDEzNTk4NCxcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyLFxuXHRcdFx0XHQxLFxuXHRcdFx0XHQzXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMSwxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwwLDEsMywxLDEsMSwwLDAsMCwxLDMsMywxLDEsMCwwLDAsMSwxLDEsMSwxLDAsMCwxLDMsMywyLDEsMSwwLDEsMywyLDIsMiwxLDEsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDEsMSwwLDAsMCwwLDAsMCwxLDEsMSwxLDEsMSwwLDAsMiwyLDIsMSwyLDMsMSwwLDIsMiwyLDEsMSwxLDEsMCwwLDEsMiwyLDIsMSwxLDIsMSwxLDEsMSwxLDEsMSwyLDMsMSwxLDEsMSwxLDEsMiwzLDEsMSwxLDEsMSwyLDIsMywzLDEsMSwwLDAsMSwyLDMsMSwwLDAsMCwwLDAsMSwxLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMSwxLDIsMiwyLDIsMSwxLDEsMCwyLDIsMiwyLDEsMSwxLDEsMiwyLDIsMiwxLDEsMywxLDIsMiwyLDIsMSwzLDMsMSwyLDEsMSwxLDEsMSwxLDAsMSwxLDEsMSwxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMCwyLDIsMiwyLDIsMSwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25IYW5kJyxcblx0XHRcdGhlaWdodDogOCxcblx0XHRcdHdpZHRoOiA4LFxuXHRcdFx0b2Zmc2V0OiAxMzYwNjQsXG5cdFx0XHRsYXlvdXQ6IFtcblx0XHRcdFx0MFxuXHRcdFx0XSxcblx0XHRcdGRhdGE6IFswLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwwLDAsMCwxLDEsMSwxLDMsMCwwLDEsMSwzLDMsMywzLDAsMCwxLDMsMywzLDMsMywwLDAsMSwxLDMsMywxLDEsMCwwLDAsMSwwLDEsMSwwXVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3NpbW9uRGFtYWdlVG9wJyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRvZmZzZXQ6IDEzNjE0NCxcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyLFxuXHRcdFx0XHQxLFxuXHRcdFx0XHQzXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDAsMSwxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDMsMiwxLDEsMSwxLDEsMywyLDIsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwxLDEsMCwwLDAsMSwxLDEsMywyLDEsMCwwLDEsMSwyLDEsMSwyLDEsMCwxLDEsMSwxLDEsMywyLDIsMSwxLDEsMywxLDEsMiwxLDAsMCwwLDEsMSwxLDEsMSwwLDAsMCwwLDEsMSwxLDEsMCwwLDEsMSwxLDEsMSwxLDAsMSwzLDMsMSwxLDEsMSwwLDEsMywzLDMsMSwxLDEsMCwwLDEsMSwxLDEsMSwxLDIsMSwyLDIsMSwxLDEsMCwxLDEsMiwyLDIsMSwxLDEsMSwxLDIsMiwyLDEsMSwxLDEsMSwyLDIsMiwxLDEsMSwxLDIsMiwyLDIsMywzLDEsMSwyLDIsMiwxLDMsMSwwLDIsMiwyLDEsMSwxLDAsMCwxLDEsMSwxLDEsMSwwLDBdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2ltb25EZWFkTGVmdCcsXG5cdFx0XHRoZWlnaHQ6IDE2LFxuXHRcdFx0d2lkdGg6IDE2LFxuXHRcdFx0b2Zmc2V0OiAxMzYyMDgsXG5cdFx0XHRsYXlvdXQ6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0Mixcblx0XHRcdFx0MSxcblx0XHRcdFx0M1xuXHRcdFx0XSxcblx0XHRcdGRhdGE6IFswLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDEsMCwwLDAsMCwxLDEsMSwxLDAsMSwxLDEsMSwxLDEsMiwxLDMsMSwxLDIsMiwxLDIsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMSwxLDEsMSwwLDAsMSwxLDEsMSwxLDEsMCwwLDEsMSwxLDEsMywxLDAsMSwxLDEsMSwzLDMsMywwLDEsMSwxLDEsMiwyLDIsMSwxLDEsMSwxLDIsMiwxLDEsMSwxLDEsMSwxLDEsMCwzLDIsMiwxLDEsMiwxLDIsMiwyLDEsMSwxLDEsMSwxLDIsMiwyLDEsMSwxLDEsMSwxLDIsMSwxLDEsMSwxLDEsMSwxLDEsMSwzLDEsMSwxLDEsMSwxLDMsMywzLDEsMSwxLDMsMywzLDMsMywxLDEsMCwzLDMsMSwxLDEsMSwxXVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3NpbW9uRGVhZFJpZ2h0Jyxcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRvZmZzZXQ6IDEzNjI3Mixcblx0XHRcdGxheW91dDogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyLFxuXHRcdFx0XHQxLFxuXHRcdFx0XHQzXG5cdFx0XHRdLFxuXHRcdFx0ZGF0YTogWzAsMCwwLDAsMCwwLDAsMCwxLDAsMCwwLDAsMCwwLDAsMiwxLDAsMCwwLDAsMCwwLDEsMSwxLDAsMCwwLDAsMCwxLDEsMiwxLDAsMCwwLDAsMiwyLDEsMiwxLDAsMCwwLDIsMiwyLDEsMiwxLDAsMCwyLDIsMiwxLDEsMSwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwyLDIsMSwxLDEsMSwwLDAsMiwxLDEsMSwxLDEsMSwwLDEsMSwxLDMsMSwxLDEsMSwxLDEsMSwxLDMsMSwxLDEsMSwzLDEsMSwxLDMsMSwxLDEsMywxLDMsMSwxLDMsMSwxLDEsMSwzLDMsMSwxLDEsMSwxLDEsMSwxLDEsMSwxLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwxLDEsMCwwLDMsMywzLDEsMywzLDEsMCwxLDMsMywzLDMsMywxLDAsMSwzLDMsMSwzLDMsMywxLDEsMSwxLDEsMywzLDMsMSwzLDMsMSwxLDEsMywzLDFdXG5cdFx0fVxuXHRdLFxuXHRzdGF0ZXM6IFtcblx0XHR7XG5cdFx0XHRuYW1lOiAnaWRsZScsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDE2LFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlVG9wJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnY3JvdWNoJyxcblx0XHRcdGhlaWdodDogMzIsXG5cdFx0XHR3aWR0aDogMTYsXG5cdFx0XHRmcmFtZXM6IFtcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVUb3AnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEZyb250TGVnJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTEnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MicsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogM1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3dhbGsnLFxuXHRcdFx0aGVpZ2h0OiAzMixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdGZyYW1lczogW1xuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSWRsZVRvcCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSWRsZUJvdHRvbScsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XSxcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsxVG9wJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XYWxrMUJvdHRvbScsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XSxcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsyVG9wJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XYWxrMkJvdHRvbScsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XSxcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsxVG9wJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XYWxrMUJvdHRvbScsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3dhbGsgKGRvd24gc3RhaXJzKScsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDE2LFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlVG9wJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25TdGFpcnNEYW1hZ2VMZWcnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEJhY2tMZWcnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MicsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogM1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XSxcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsxVG9wJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XYWxrMUJvdHRvbScsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0bmFtZTogJ3dhbGsgKHVwIHN0YWlycyknLFxuXHRcdFx0aGVpZ2h0OiAzMixcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdGZyYW1lczogW1xuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSWRsZVRvcCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJXYWxrVXBMZWdzJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2FsazFUb3AnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldhbGsxQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnZGVhZCcsXG5cdFx0XHRoZWlnaHQ6IDE2LFxuXHRcdFx0d2lkdGg6IDMyLFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25EZWFkTGVmdCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uRGVhZFJpZ2h0Jyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnaHVydCcsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDE2LFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25EYW1hZ2VUb3AnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vblN0YWlyc0RhbWFnZUxlZycsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAzXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnd2hpcCcsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDMyLFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMScsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSWRsZUJvdHRvbScsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XSxcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AyJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25JZGxlQm90dG9tJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSGFuZCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDMnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbklkbGVCb3R0b20nLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICd3aGlwIChkdWNraW5nKScsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDMyLFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMScsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRnJvbnRMZWcnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEJhY2tMZWcnLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MScsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogM1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAzXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEZyb250TGVnJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hCYWNrTGVnJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTEnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkNyb3VjaEVtcHR5MicsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogM1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XSxcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkhhbmQnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDFcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AzJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hGcm9udExlZycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkxJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAzXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25Dcm91Y2hFbXB0eTInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDNcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICd3aGlwIChkb3duIHN0YWlycyknLFxuXHRcdFx0aGVpZ2h0OiAzMixcblx0XHRcdHdpZHRoOiAzMixcblx0XHRcdGZyYW1lczogW1xuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDEnLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vblN0YWlyc0RhbWFnZUxlZycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAzXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vblN0YWlyc0RhbWFnZUxlZycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAzXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uSGFuZCcsXG5cdFx0XHRcdFx0XHR4OiAwLFxuXHRcdFx0XHRcdFx0eTogMVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDMnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vblN0YWlyc0RhbWFnZUxlZycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoQmFja0xlZycsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uQ3JvdWNoRW1wdHkyJyxcblx0XHRcdFx0XHRcdHg6IDQsXG5cdFx0XHRcdFx0XHR5OiAzXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnd2hpcCAodXAgc3RhaXJzKScsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdFx0d2lkdGg6IDMyLFxuXHRcdFx0ZnJhbWVzOiBbXG5cdFx0XHRcdFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25XaGlwVG9wMScsXG5cdFx0XHRcdFx0XHR4OiA0LFxuXHRcdFx0XHRcdFx0eTogMFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uU3RhaXJXYWxrVXBMZWdzJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAyXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3NpbW9uV2hpcFRvcDInLFxuXHRcdFx0XHRcdFx0eDogNCxcblx0XHRcdFx0XHRcdHk6IDBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vblN0YWlyV2Fsa1VwTGVncycsXG5cdFx0XHRcdFx0XHR4OiAyLFxuXHRcdFx0XHRcdFx0eTogMlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XSxcblx0XHRcdFx0W1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbkhhbmQnLFxuXHRcdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHRcdHk6IDFcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICdzaW1vbldoaXBUb3AzJyxcblx0XHRcdFx0XHRcdHg6IDIsXG5cdFx0XHRcdFx0XHR5OiAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2ltb25TdGFpcldhbGtVcExlZ3MnLFxuXHRcdFx0XHRcdFx0eDogMixcblx0XHRcdFx0XHRcdHk6IDJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdF1cblx0XHR9XG5cdF0sXG5cdGNvbG9yczogW1xuXHRcdHtcblx0XHRcdGhleDogJzdDN0M3QycsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTI0LFxuXHRcdFx0XHQxMjQsXG5cdFx0XHRcdDEyNFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDAwMEZDJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQwLFxuXHRcdFx0XHQyNTJcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwMDBCQycsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MCxcblx0XHRcdFx0MTg4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICc0NDI4QkMnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDY4LFxuXHRcdFx0XHQ0MCxcblx0XHRcdFx0MTg4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICc5NDAwODQnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDE0OCxcblx0XHRcdFx0MCxcblx0XHRcdFx0MTMyXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdBODAwMjAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDE2OCxcblx0XHRcdFx0MCxcblx0XHRcdFx0MzJcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0E4MTAwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTY4LFxuXHRcdFx0XHQxNixcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnODgxNDAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQxMzYsXG5cdFx0XHRcdDIwLFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICc1MDMwMDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDgwLFxuXHRcdFx0XHQ0OCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDA3ODAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQxMjAsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwNjgwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MTA0LFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDU4MDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDg4LFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDQwNTgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDY0LFxuXHRcdFx0XHQ4OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDAwMDAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQwLFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwMDAwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnQkNCQ0JDJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQxODgsXG5cdFx0XHRcdDE4OCxcblx0XHRcdFx0MTg4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDc4RjgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDEyMCxcblx0XHRcdFx0MjQ4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDU4RjgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDg4LFxuXHRcdFx0XHQyNDhcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzY4NDRGQycsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTA0LFxuXHRcdFx0XHQ2OCxcblx0XHRcdFx0MjUyXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdEODAwQ0MnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDIxNixcblx0XHRcdFx0MCxcblx0XHRcdFx0MjA0XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdFNDAwNTgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDIyOCxcblx0XHRcdFx0MCxcblx0XHRcdFx0ODhcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0Y4MzgwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjQ4LFxuXHRcdFx0XHQ1Nixcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRTQ1QzEwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyMjgsXG5cdFx0XHRcdDkyLFxuXHRcdFx0XHQxNlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnQUM3QzAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQxNzIsXG5cdFx0XHRcdDEyNCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDBCODAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQxODQsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwQTgwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MTY4LFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMEE4NDQnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDE2OCxcblx0XHRcdFx0Njhcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwODg4OCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MTM2LFxuXHRcdFx0XHQxMzZcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwMDAwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDAwMDAwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQwLFxuXHRcdFx0XHQwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0Y4RjhGOCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjQ4LFxuXHRcdFx0XHQyNDgsXG5cdFx0XHRcdDI0OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnM0NCQ0ZDJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQ2MCxcblx0XHRcdFx0MTg4LFxuXHRcdFx0XHQyNTJcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzY4ODhGQycsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTA0LFxuXHRcdFx0XHQxMzYsXG5cdFx0XHRcdDI1MlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnOTg3OEY4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQxNTIsXG5cdFx0XHRcdDEyMCxcblx0XHRcdFx0MjQ4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGODc4RjgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0MTIwLFxuXHRcdFx0XHQyNDhcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0Y4NTg5OCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjQ4LFxuXHRcdFx0XHQ4OCxcblx0XHRcdFx0MTUyXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGODc4NTgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0MTIwLFxuXHRcdFx0XHQ4OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRkNBMDQ0Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyNTIsXG5cdFx0XHRcdDE2MCxcblx0XHRcdFx0Njhcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0Y4QjgwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjQ4LFxuXHRcdFx0XHQxODQsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0I4RjgxOCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTg0LFxuXHRcdFx0XHQyNDgsXG5cdFx0XHRcdDI0XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICc1OEQ4NTQnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDg4LFxuXHRcdFx0XHQyMTYsXG5cdFx0XHRcdDg0XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICc1OEY4OTgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDg4LFxuXHRcdFx0XHQyNDgsXG5cdFx0XHRcdDE1MlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDBFOEQ4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyMzIsXG5cdFx0XHRcdDIxNlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnNzg3ODc4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQxMjAsXG5cdFx0XHRcdDEyMCxcblx0XHRcdFx0MTIwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwMDAwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRkNGQ0ZDJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyNTIsXG5cdFx0XHRcdDI1Mixcblx0XHRcdFx0MjUyXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdBNEU0RkMnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDE2NCxcblx0XHRcdFx0MjI4LFxuXHRcdFx0XHQyNTJcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0I4QjhGOCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTg0LFxuXHRcdFx0XHQxODQsXG5cdFx0XHRcdDI0OFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRDhCOEY4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyMTYsXG5cdFx0XHRcdDE4NCxcblx0XHRcdFx0MjQ4XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGOEI4RjgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0MTg0LFxuXHRcdFx0XHQyNDhcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0Y4QTRDMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjQ4LFxuXHRcdFx0XHQxNjQsXG5cdFx0XHRcdDE5MlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRjBEMEIwJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyNDAsXG5cdFx0XHRcdDIwOCxcblx0XHRcdFx0MTc2XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdGQ0UwQTgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDI1Mixcblx0XHRcdFx0MjI0LFxuXHRcdFx0XHQxNjhcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0Y4RDg3OCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MjQ4LFxuXHRcdFx0XHQyMTYsXG5cdFx0XHRcdDEyMFxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRDhGODc4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyMTYsXG5cdFx0XHRcdDI0OCxcblx0XHRcdFx0MTIwXG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICdCOEY4QjgnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDE4NCxcblx0XHRcdFx0MjQ4LFxuXHRcdFx0XHQxODRcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0I4RjhEOCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MTg0LFxuXHRcdFx0XHQyNDgsXG5cdFx0XHRcdDIxNlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnMDBGQ0ZDJyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQwLFxuXHRcdFx0XHQyNTIsXG5cdFx0XHRcdDI1MlxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRDhEOEQ4Jyxcblx0XHRcdHJnYjogW1xuXHRcdFx0XHQyMTYsXG5cdFx0XHRcdDIxNixcblx0XHRcdFx0MjE2XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRoZXg6ICcwMDAwMDAnLFxuXHRcdFx0cmdiOiBbXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDAsXG5cdFx0XHRcdDBcblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwMDAwMCcsXG5cdFx0XHRyZ2I6IFtcblx0XHRcdFx0MCxcblx0XHRcdFx0MCxcblx0XHRcdFx0MFxuXHRcdFx0XVxuXHRcdH1cblx0XSxcblx0cGFsZXR0ZTogW1xuXHRcdHtcblx0XHRcdGhleDogJzAwRkYwMCcsXG5cdFx0XHRpbmRleDogMTVcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJzAwMDAwMCcsXG5cdFx0XHRpbmRleDogMTVcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhleDogJ0E4MTAwMCcsXG5cdFx0XHRpbmRleDogNlxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aGV4OiAnRkNGQ0ZDJyxcblx0XHRcdGluZGV4OiA0OFxuXHRcdH1cblx0XVxufTtcbiIsImNvbnN0IHsgQ0hSIH0gPSByZXF1aXJlKCcuL2RhdGEnKTtcblxuZXhwb3J0cy5sb2FkQ2hyID0gZnVuY3Rpb24gbG9hZENocihjaHJJbmRleCwgcGl4ZWxzLCB6b29tKSB7XG5cdGNvbnN0IGNockRhdGEgPSBDSFJbY2hySW5kZXhdO1xuXHRwaXhlbHMubGVuZ3RoID0gMDtcblx0Y2hyRGF0YS5kYXRhLmZvckVhY2goKHBhbGV0dGVJbmRleCwgaW5kZXgpID0+IHtcblx0XHRjb25zdCBsYXlvdXRJbmRleCA9IE1hdGguZmxvb3IoaW5kZXggLyA2NCk7XG5cdFx0Y29uc3QgbGF5b3V0ID0gY2hyRGF0YS5sYXlvdXRbbGF5b3V0SW5kZXhdO1xuXHRcdHBpeGVscy5wdXNoKHtcblx0XHRcdHg6ICgoaW5kZXggJSA4KSArIChsYXlvdXQgPj0gMiA/IDggOiAwKSkgKiB6b29tLFxuXHRcdFx0eTogKChNYXRoLmZsb29yKChpbmRleCAlIDY0KSAvIDgpKSArIChsYXlvdXQgJSAyID09PSAxID8gOCA6IDApKSAqIHpvb20sXG5cdFx0XHRwYWxldHRlSW5kZXhcblx0XHR9KTtcblx0fSk7XG5cdHJldHVybiBjaHJEYXRhO1xufTtcblxuZXhwb3J0cy5yZXNpemVDYW52YXMgPSBmdW5jdGlvbiByZXNpemVDYW52YXMoY2FudmFzLCB3aWR0aCwgaGVpZ2h0LCB6b29tKSB7XG5cdGNvbnN0ICRjYW52YXM9ICQoY2FudmFzKTtcblx0dGhpcy56b29tID0gem9vbTtcblx0dGhpcy53aWR0aCA9IHdpZHRoO1xuXHR0aGlzLmhlaWdodCA9IGhlaWdodDtcblx0JGNhbnZhcy5hdHRyKCdoZWlnaHQnLCBoZWlnaHQgKiB6b29tKTtcblx0JGNhbnZhcy5hdHRyKCd3aWR0aCcsIHdpZHRoICogem9vbSk7XG5cdCRjYW52YXMuY3NzKHtcblx0XHR3aWR0aDogd2lkdGggKiB6b29tLFxuXHRcdGhlaWdodDogaGVpZ2h0ICogem9vbVxuXHR9KTtcbn07XG5cbmV4cG9ydHMuZ2V0UGFsZXR0ZUluZGV4ID0gZnVuY3Rpb24gZ2V0UGFsZXR0ZUluZGV4KCkge1xuXHRyZXR1cm4gcGFyc2VJbnQoJCgnLnBhbGV0dGUtYnV0dG9uLXNlbGVjdGVkJykuZmlyc3QoKS5kYXRhKCdwaScpLCAxMCk7XG59O1xuXG5leHBvcnRzLnJnYjJoZXggPSBmdW5jdGlvbiByZ2IyaGV4KHJnYil7XG5cdHJnYiA9IHJnYi5tYXRjaCgvXnJnYlxcKChcXGQrKSxcXHMqKFxcZCspLFxccyooXFxkKylcXCkkLyk7XG5cdHJldHVybiAoJzAnICsgcGFyc2VJbnQocmdiWzFdLDEwKS50b1N0cmluZygxNikpLnNsaWNlKC0yKSArXG5cdFx0KCcwJyArIHBhcnNlSW50KHJnYlsyXSwxMCkudG9TdHJpbmcoMTYpKS5zbGljZSgtMikgK1xuXHRcdCgnMCcgKyBwYXJzZUludChyZ2JbM10sMTApLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTIpO1xufTsiXX0=
