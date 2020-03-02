const _ = require('lodash');
const data = require('./data');
const ColorPicker = require('./ColorPicker');
const Editor = require('./Editor');
const Palette = require('./Palette');
const Tiles = require('./Tiles');
const States = require('./States');

class SpriteMaker {
	constructor() {
		const editor = this.editor = new Editor();
		const tiles = this.tiles = new Tiles();
		const states = this.states = new States(this.tiles, this.editor.chrIndex);
		this.palette = new Palette();
		this.colorPicker = new ColorPicker();

		editor.on('pixel', tiles.updatePixel.bind(tiles));
		tiles.on('click', chrIndex => {
			editor.updateChr(tiles, chrIndex);
			states.showAffected(chrIndex);
		});
		this.colorPicker.on('update', this.draw.bind(this));

		$('#fps').change(this.states.updateFps.bind(this.states));
		$('#animateToggle').change(function() {
			states.animate = $(this).prop('checked');
			states.updateFps(states.fps);
		});
		$('#affectedToggle').change(function() {
			states.onlyShowAffected = $(this).prop('checked');
			states.showAffected(editor.chrIndex);
		});
		$('#transparentToggle').change(function() {
			states.backgroundTransparency = $(this).prop('checked');
			states.draw();
		});

		$('#sprite-patch').click(function() {
			const chrPixelLength = 64;
			const spritePatches = [];

			tiles.pixels.forEach(pixels => {
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

			const patch = _.template(patchTemplate)({
				spritePatches: JSON.stringify(spritePatches, null, 2),
				palette: data.palette.slice(1).map(p => p.index).join(',')
			});
			console.log(patch);
		});
	}

	draw() {
		this.editor.draw();
		this.tiles.draw();
		this.states.draw();
	}
}

window.SpriteMaker = SpriteMaker;

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