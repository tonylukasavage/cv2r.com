const { CHR, colors } = require('./data');

const NUM_OF_OFFSETS = 8;
const CHR_SIZE = 8;
// TODO: zoom needs to be dynamic
const ZOOM = 3;
const DEFAULT_TRANS_INDEX = 26;

exports.loadChr = function loadChr(tiles, chrIndex, pixels, zoom) {
	const chrData = CHR[chrIndex];
	pixels.length = 0;
	chrData.data.forEach((paletteIndex, index) => {
		const layoutIndex = Math.floor(index / 64);
		const layout = chrData.layout[layoutIndex];
		pixels.push({
			x: ((index % 8) + (layout >= 2 ? 8 : 0)) * zoom,
			y: ((Math.floor((index % 64) / 8)) + (layout % 2 === 1 ? 8 : 0)) * zoom,
			paletteIndex: tiles ? tiles.pixels[chrIndex][index].paletteIndex : paletteIndex
		});
	});
	return chrData;
};

exports.loadPatch = function loadPatch(patchContent) {
	const tiles = [];
	const palette = [];

	// parse simon sprite patch file
	const patchJson = JSON.parse(patchContent);
	const { id, name, description, author, patch, spriteMaker } = patchJson;
	const output = { tiles, palette, id, name, author, description, spriteMaker };

	// add the palette
	const paletteBytes = patch.pop().bytes;
	paletteBytes.unshift(DEFAULT_TRANS_INDEX);
	output.palette = paletteBytes.map(pb => {
		return { index: pb, hex: colors[pb].hex };
	});

	// Get the bits for a specific sprite byte within a given layout section
	const getBits = function(layout, bytes, offset) {
		return bytes[CHR_SIZE * layout + offset]
			.toString(2)
			.padStart(8, '0')
			.split('')
			.map(bit => parseInt(bit, 10));
	};

	// iterate over unique set of CHR data to create Sprite Maker compatible patch data
	// for each tile
	for (let i = 0; i < patch.length / NUM_OF_OFFSETS; i++) {
		const tile = [];
		const { layout } = CHR[i];
		const bytes = [ [], [] ];
		patch[i].bytes.forEach((b, index) => bytes[index % 16 < 8 ? 0 : 1 ].push(b));

		layout.forEach(l => {
			for (let b = 0; b < CHR_SIZE; b++) {
				const bits1 = getBits(l, bytes[0], b);
				const bits2 = getBits(l, bytes[1], b);
				bits1.forEach((bit1, index) => {
					const bit2 = bits2[index];
					const paletteIndex = bit1 + (2 * bit2);
					const x = (index + (l < 2 ? 0 : CHR_SIZE)) * ZOOM;
					const y = (b + (l % 2 === 1 ? CHR_SIZE : 0)) * ZOOM;
					tile.push({ x, y, paletteIndex });
				});
			}
		});
		output.tiles.push(tile);
	}

	return output;
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
	return parseInt($('.palette-button-selected').first().find('.palette-button').data('pi'), 10);
};

exports.rgb2hex = function rgb2hex(rgb){
	rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	return ('0' + parseInt(rgb[1],10).toString(16)).slice(-2) +
		('0' + parseInt(rgb[2],10).toString(16)).slice(-2) +
		('0' + parseInt(rgb[3],10).toString(16)).slice(-2);
};