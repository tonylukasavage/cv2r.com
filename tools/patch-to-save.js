const { CHR, colors } = require('../src/sprite-maker/data');
const fs = require('fs').promises;
// const vm = require('vm');

const NUM_OF_OFFSETS = 8;
const CHR_SIZE = 8;
// TODO: zoom needs to be dynamic
const ZOOM = 3;
const DEFAULT_TRANS_INDEX = 26;

function getBits(layout, bytes, offset) {
	return bytes[CHR_SIZE * layout + offset]
		.toString(2)
		.padStart(8, '0')
		.split('')
		.map(bit => parseInt(bit, 10));
}

(async () => {
	try {
		const patchFile = process.argv[2];
		if (!patchFile) {
			console.error('ERROR: must specify patch file');
			process.exit(1);
		}

		// extract data from patch module
		const patchJson = JSON.parse(await fs.readFile(patchFile, 'utf8'));
		const { id, name, notes, author, patch } = patchJson;
		const output = {
			tiles: [],
			palette: [],
			id, name, author, notes
		};

		// add the palette
		const paletteBytes = patch.pop().bytes;
		paletteBytes.unshift(DEFAULT_TRANS_INDEX);
		output.palette = paletteBytes.map(pb => {
			return { index: pb, hex: colors[pb].hex };
		});

		// iterate over unique set of CHR data to create Sprite Maker compatible patch data
		// for each tile
		for (let i = 0; i < patch.length / NUM_OF_OFFSETS; i ++) {
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
						const x = (index + (l < 2 ? CHR_SIZE : 0)) * ZOOM;
						const y = (index + (l % 2 === 1 ? CHR_SIZE : 0)) * ZOOM;
						output.tiles.push({ x, y, paletteIndex });
					});
				}
			});
		}

		console.log(output);

	} catch (err) {
		console.error(err.stack);
		process.exit(1);
	}
})();

