const _ = require('lodash');
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

		//const patch = 'const spritePatches = ' + JSON.stringify(spritePatches, null, 2) + patchTemplate;

		const patch = _.template(patchTemplate)({
			spritePatches: JSON.stringify(spritePatches, null, 2),
			palette: palette.slice(1).map(p => p.index).join(',')
		});
		console.log(patch);
		console.log(palette);
	}
}

module.exports = Tiles;

const patchTemplate = `const spritePatches = <%= spritePatches %>;

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
	bytes: [<%= palette %>]
});

module.exports = {
	id: 'test-sprite',
	name: 'Test Sprite',
	description: 'cv2r.com Sprite Maker test sprite',
	patch: finalSpritePatch
};
`;