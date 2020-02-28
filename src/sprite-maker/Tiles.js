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
		const spritePatches = [];

		this.pixels.forEach(pixels => {	
			const bytes = [];
			const { offset } = pixels;
			let byte1 = '', byte2 = '';
			
			pixels.forEach((pixel, index) => {
				const { paletteIndex } = pixel;
				byte1 += paletteIndex % 2;
				byte2 += paletteIndex > 1 ? 1 : 0;
				if (index % 8 === 7) {
					bytes.push(parseInt(byte1, 2), parseInt(byte2, 2));
					byte1 = '';
					byte2 = '';
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