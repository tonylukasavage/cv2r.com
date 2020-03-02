const _ = require('lodash');
const data = require('./data');
const ColorPicker = require('./ColorPicker');
const Editor = require('./Editor');
const Palette = require('./Palette');
const Tiles = require('./Tiles');
const States = require('./States');

class SpriteMaker {
	constructor() {
		const self = this;
		const editor = this.editor = new Editor();
		const tiles = this.tiles = new Tiles();
		const states = this.states = new States(this.tiles, this.editor.chrIndex);
		this.palette = new Palette();
		this.colorPicker = new ColorPicker();

		editor.on('pixel', tiles.updatePixel.bind(tiles));
		tiles.on('click', chrIndex => {
			editor.updateChr(tiles, chrIndex);
			states.showAffected(chrIndex);
			editor.undoBuffer.length = 0;
		});
		this.colorPicker.on('update', this.draw.bind(this));
		this.palette.on('undo', editor.undo.bind(editor));

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

		$('#sprite-save').click(function() {
			const content = {
				tiles: tiles.pixels,
				palette: data.palette
			};
			downloadFile(JSON.stringify(content, null, 2), 'sprite-maker.json');
		});

		$('#sprite-load').click(function() {
			$('#sprite-load-file').trigger('click');
		});

		$('#sprite-load-file').change(function() {
			const file = this.files[0];
			var reader = new FileReader();
			reader.onload = function() {
				const json = JSON.parse(this.result);
				json.tiles.forEach((t, i) => {
					tiles.pixels[i].forEach((pixel, j) => {
						pixel.x = json.tiles[i][j].x;
						pixel.y = json.tiles[i][j].y;
						pixel.paletteIndex = json.tiles[i][j].paletteIndex;
					});
				});
				json.palette.forEach((p, i) => {
					data.palette[i].hex = p.hex;
					data.palette[i].index = p.hex;
				});
				self.draw();
				editor.updateChr(tiles, 0);
			};
			reader.readAsText(file);
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

			console.log(data.palette);
			const patch = _.template(patchTemplate)({
				spritePatches: JSON.stringify(spritePatches, null, 2),
				palette: data.palette.slice(1).map(p => p.index).join(',')
			});

			downloadFile(patch, 'test-sprite.js');
		});
	}

	draw() {
		this.editor.draw();
		this.tiles.draw();
		this.states.draw();
	}
}

window.SpriteMaker = SpriteMaker;

function downloadFile(content, filename) {
	const blob = new Blob([content]);
	const link = document.createElement('a');
	const url = URL.createObjectURL(blob);
	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

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