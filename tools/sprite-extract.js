const fs = require('fs');
const SPRITE_SIZE = 8;
const SPRITE_BYTES = 16;
const JS_PATH = './src/sprite-maker/data.js';

const states = [
	{
		name: 'idle',
		height: 32,
		width: 16,
		frames: [
			[
				{ name: 'simonIdleTop', x: 0, y: 0 },
				{ name: 'simonIdleBottom', x: 0, y: 2 }
			]
		]
	},
	{
		name: 'crouch',
		height: 32,
		width: 16,
		frames: [
			[
				{ name: 'simonIdleTop', x: 0, y: 0 },
				{ name: 'simonCrouchFrontLeg', x: 0, y: 2 },
				{ name: 'simonCrouchBackLeg', x: 2, y: 2 },
				{ name: 'simonCrouchEmpty1', x: 0, y: 3 },
				{ name: 'simonCrouchEmpty2', x: 2, y: 3 } 
			]
		]
	},
	{
		name: 'walk',
		height: 32,
		width: 16,
		frames: [
			[
				{ name: 'simonIdleTop', x: 0, y: 0 },
				{ name: 'simonIdleBottom', x: 0, y: 2 }
			],
			[
				{ name: 'simonWalk1Top', x: 0, y: 0 },
				{ name: 'simonWalk1Bottom', x: 0, y: 2 }
			],
			[
				{ name: 'simonWalk2Top', x: 0, y: 0 },
				{ name: 'simonWalk2Bottom', x: 0, y: 2 }
			],
			[
				{ name: 'simonWalk1Top', x: 0, y: 0 },
				{ name: 'simonWalk1Bottom', x: 0, y: 2 }
			]
		]
	},
	{
		name: 'walk (down stairs)',
		height: 32,
		width: 16,
		frames: [
			[
				{ name: 'simonIdleTop', x: 0, y: 0 },
				{ name: 'simonStairsDamageLeg', x: 0, y: 2 },
				{ name: 'simonCrouchBackLeg', x: 2, y: 2 },
				{ name: 'simonCrouchEmpty2', x: 2, y: 3 } 
			],
			[
				{ name: 'simonWalk1Top', x: 0, y: 0 },
				{ name: 'simonWalk1Bottom', x: 0, y: 2 }
			]
		]
	},
	{
		name: 'walk (up stairs)',
		height: 32,
		width: 16,
		frames: [
			[
				{ name: 'simonIdleTop', x: 0, y: 0 },
				{ name: 'simonStairWalkUpLegs', x: 0, y: 2 }
			],
			[
				{ name: 'simonWalk1Top', x: 0, y: 0 },
				{ name: 'simonWalk1Bottom', x: 0, y: 2 }
			]
		]
	},
	{
		name: 'dead',
		height: 16,
		width: 32,
		frames: [
			[
				{ name: 'simonDeadLeft', x: 0, y: 0 },
				{ name: 'simonDeadRight', x: 4, y: 0 }
			]
		]
	},
	{
		name: 'hurt',
		height: 32,
		width: 16,
		frames: [
			[
				{ name: 'simonDamageTop', x: 0, y: 0 },
				{ name: 'simonStairsDamageLeg', x: 0, y: 2 },
				{ name: 'simonCrouchBackLeg', x: 2, y: 2 },
				{ name: 'simonCrouchEmpty2', x: 2, y: 3 } 
			]
		]
	},
	{
		name: 'whip',
		height: 32,
		width: 32,
		frames: [
			[
				{ name: 'simonWhipTop1', x: 4, y: 0 },
				{ name: 'simonIdleBottom', x: 2, y: 2 }
			],
			[
				{ name: 'simonWhipTop2', x: 4, y: 0 },
				{ name: 'simonIdleBottom', x: 2, y: 2 }
			],
			[
				{ name: 'simonHand', x: 0, y: 1 },
				{ name: 'simonWhipTop3', x: 2, y: 0 },
				{ name: 'simonIdleBottom', x: 2, y: 2 }
			]
		]
	},
	{
		name: 'whip (ducking)',
		height: 32,
		width: 32,
		frames: [
			[
				{ name: 'simonWhipTop1', x: 4, y: 0 },
				{ name: 'simonCrouchFrontLeg', x: 2, y: 2 },
				{ name: 'simonCrouchBackLeg', x: 4, y: 2 },
				{ name: 'simonCrouchEmpty1', x: 2, y: 3 },
				{ name: 'simonCrouchEmpty2', x: 4, y: 3 } 
			],
			[
				{ name: 'simonWhipTop2', x: 4, y: 0 },
				{ name: 'simonCrouchFrontLeg', x: 2, y: 2 },
				{ name: 'simonCrouchBackLeg', x: 4, y: 2 },
				{ name: 'simonCrouchEmpty1', x: 2, y: 3 },
				{ name: 'simonCrouchEmpty2', x: 4, y: 3 } 
			],
			[
				{ name: 'simonHand', x: 0, y: 1 },
				{ name: 'simonWhipTop3', x: 2, y: 0 },
				{ name: 'simonCrouchFrontLeg', x: 2, y: 2 },
				{ name: 'simonCrouchBackLeg', x: 4, y: 2 },
				{ name: 'simonCrouchEmpty1', x: 2, y: 3 },
				{ name: 'simonCrouchEmpty2', x: 4, y: 3 } 
			]
		]
	},
	{
		name: 'whip (down stairs)',
		height: 32,
		width: 32,
		frames: [
			[
				{ name: 'simonWhipTop1', x: 4, y: 0 },
				{ name: 'simonStairsDamageLeg', x: 2, y: 2 },
				{ name: 'simonCrouchBackLeg', x: 4, y: 2 },
				{ name: 'simonCrouchEmpty2', x: 4, y: 3 } 
			],
			[
				{ name: 'simonWhipTop2', x: 4, y: 0 },
				{ name: 'simonStairsDamageLeg', x: 2, y: 2 },
				{ name: 'simonCrouchBackLeg', x: 4, y: 2 },
				{ name: 'simonCrouchEmpty2', x: 4, y: 3 } 
			],
			[
				{ name: 'simonHand', x: 0, y: 1 },
				{ name: 'simonWhipTop3', x: 2, y: 0 },
				{ name: 'simonStairsDamageLeg', x: 2, y: 2 },
				{ name: 'simonCrouchBackLeg', x: 4, y: 2 },
				{ name: 'simonCrouchEmpty2', x: 4, y: 3 } 
			]
		]
	},
	{
		name: 'whip (up stairs)',
		height: 32,
		width: 32,
		frames: [
			[
				{ name: 'simonWhipTop1', x: 4, y: 0 },
				{ name: 'simonStairWalkUpLegs', x: 2, y: 2 }
			],
			[
				{ name: 'simonWhipTop2', x: 4, y: 0 },
				{ name: 'simonStairWalkUpLegs', x: 2, y: 2 }
			],
			[
				{ name: 'simonHand', x: 0, y: 1 },
				{ name: 'simonWhipTop3', x: 2, y: 0 },
				{ name: 'simonStairWalkUpLegs', x: 2, y: 2 }
			]
		]
	},
	{
		name: 'subweapon throw',
		height: 32,
		width: 24,
		frames: [
			[
				{ name: 'simonWhipTop1', x: 4, y: 0 },
				{ name: 'simonIdleBottom', x: 2, y: 2 }
			],
			[
				{ name: 'simonWhipTop2', x: 4, y: 0 },
				{ name: 'simonIdleBottom', x: 2, y: 2 }
			],
			[
				{ name: 'simonHand', x: 0, y: 1 },
				{ name: 'simonWhipTop3', x: 2, y: 0 },
				{ name: 'simonIdleBottom', x: 2, y: 2 }
			]
		]
	},
	{
		name: 'subweapon throw (down stairs)',
		height: 32,
		width: 24,
		frames: [
			[
				{ name: 'simonWhipTop1', x: 4, y: 0 },
				{ name: 'simonStairsDamageLeg', x: 2, y: 2 },
				{ name: 'simonCrouchBackLeg', x: 4, y: 2 },
				{ name: 'simonCrouchEmpty2', x: 4, y: 3 } 
			],
			[
				{ name: 'simonWhipTop2', x: 4, y: 0 },
				{ name: 'simonStairsDamageLeg', x: 2, y: 2 },
				{ name: 'simonCrouchBackLeg', x: 4, y: 2 },
				{ name: 'simonCrouchEmpty2', x: 4, y: 3 } 
			],
			[
				{ name: 'simonHand', x: 0, y: 1 },
				{ name: 'simonWhipTop3', x: 2, y: 0 },
				{ name: 'simonStairsDamageLeg', x: 2, y: 2 },
				{ name: 'simonCrouchBackLeg', x: 4, y: 2 },
				{ name: 'simonCrouchEmpty2', x: 4, y: 3 } 
			]
		]
	},
	{
		name: 'subweapon throw (up stairs)',
		height: 32,
		width: 24,
		frames: [
			[
				{ name: 'simonWhipTop1', x: 4, y: 0 },
				{ name: 'simonStairWalkUpLegs', x: 2, y: 2 }
			],
			[
				{ name: 'simonWhipTop2', x: 4, y: 0 },
				{ name: 'simonStairWalkUpLegs', x: 2, y: 2 }
			],
			[
				{ name: 'simonHand', x: 0, y: 1 },
				{ name: 'simonWhipTop3', x: 2, y: 0 },
				{ name: 'simonStairWalkUpLegs', x: 2, y: 2 }
			]
		]
	}
];

const CHR = [
	{
		name: 'simonIdleTop',
		height: 16,
		width: 16,
		offset: 0x21030,
		layout: [ 0, 2, 1, 3 ]
	},
	{
		name: 'simonIdleBottom',
		height: 16,
		width: 16,
		offset: 0x21070,
		layout: [ 0, 2, 1, 3 ]
	},
	{
		name: 'simonWalk1Top',
		height: 16,
		width: 16,
		offset: 0x210B0,
		layout: [ 0, 2, 1, 3 ]
	},
	{
		name: 'simonWalk1Bottom',
		height: 16,
		width: 16,
		offset: 0x210F0,
		layout: [ 0, 2, 1, 3 ]
	},
	{
		name: 'simonWalk2Top',
		height: 16,
		width: 16,
		offset: 0x21130,
		layout: [ 0, 2, 1, 3 ]
	},
	{
		name: 'simonWalk2Bottom',
		height: 16,
		width: 16,
		offset: 0x21170,
		layout: [ 0, 2, 1, 3 ]
	},
	{
		name: 'simonCrouchFrontLeg',
		height: 8,
		width: 8,
		offset: 0x211B0,
		layout: [ 0 ]
	},
	{
		name: 'simonCrouchEmpty1',
		height: 8,
		width: 8,
		offset: 0x211C0,
		layout: [ 0 ]
	},
	{
		name: 'simonCrouchBackLeg',
		height: 8,
		width: 8,
		offset: 0x211D0,
		layout: [ 0 ]
	},
	{
		name: 'simonCrouchEmpty2',
		height: 8,
		width: 8,
		offset: 0x211E0,
		layout: [ 0 ]
	},
	{
		name: 'simonStairsDamageLeg',
		height: 16,
		width: 8,
		offset: 0x211F0,
		layout: [ 0, 1 ]
	},
	{
		name: 'simonStairWalkUpLegs',
		height: 16,
		width: 16,
		offset: 0x21210,
		layout: [ 0, 2, 1, 3 ]
	},
	{
		name: 'simonWhipTop1',
		height: 16,
		width: 16,
		offset: 0x21250,
		layout: [ 0, 2, 1, 3 ]
	},
	{
		name: 'simonWhipTop2',
		height: 16,
		width: 16,
		offset: 0x212D0,
		layout: [ 0, 2, 1, 3 ]
	},
	{
		name: 'simonWhipTop3',
		height: 16,
		width: 16,
		offset: 0x21330,
		layout: [ 0, 2, 1, 3 ]
	},
	{
		name: 'simonHand',
		height: 8,
		width: 8,
		offset: 0x21380,
		layout: [ 0 ]
	},
	{
		name: 'simonDamageTop',
		height: 16,
		width: 16,
		offset: 0x213D0,
		layout: [ 0, 2, 1, 3 ]
	},
	{
		name: 'simonDeadLeft',
		height: 16,
		width: 16,
		offset: 0x21410,
		layout: [ 0, 2, 1, 3 ]
	},
	{
		name: 'simonDeadRight',
		height: 16,
		width: 16,
		offset: 0x21450,
		layout: [ 0, 2, 1, 3 ]
	},
];

const colors = [
	{ hex: '7C7C7C', rgb: [ 124, 124, 124 ] },
	{ hex: '0000FC', rgb: [ 0, 0, 252 ] },
	{ hex: '0000BC', rgb: [ 0, 0, 188 ] },
	{ hex: '4428BC', rgb: [ 68, 40, 188 ] },
	{ hex: '940084', rgb: [ 148, 0, 132 ] },
	{ hex: 'A80020', rgb: [ 168, 0, 32 ] },
	{ hex: 'A81000', rgb: [ 168, 16, 0 ] },
	{ hex: '881400', rgb: [ 136, 20, 0 ] },
	{ hex: '503000', rgb: [ 80, 48, 0 ] },
	{ hex: '007800', rgb: [ 0, 120, 0 ] },
	{ hex: '006800', rgb: [ 0, 104, 0 ] },
	{ hex: '005800', rgb: [ 0, 88, 0 ] },
	{ hex: '004058', rgb: [ 0, 64, 88 ] },
	{ hex: '000000', rgb: [ 0, 0, 0 ] },
	{ hex: '000000', rgb: [ 0, 0, 0 ] },
	{ hex: '000000', rgb: [ 0, 0, 0 ] },
	{ hex: 'BCBCBC', rgb: [ 188, 188, 188 ] },
	{ hex: '0078F8', rgb: [ 0, 120, 248 ] },
	{ hex: '0058F8', rgb: [ 0, 88, 248 ] },
	{ hex: '6844FC', rgb: [ 104, 68, 252 ] },
	{ hex: 'D800CC', rgb: [ 216, 0, 204 ] },
	{ hex: 'E40058', rgb: [ 228, 0, 88 ] },
	{ hex: 'F83800', rgb: [ 248, 56, 0 ] },
	{ hex: 'E45C10', rgb: [ 228, 92, 16 ] },
	{ hex: 'AC7C00', rgb: [ 172, 124, 0 ] },
	{ hex: '00B800', rgb: [ 0, 184, 0 ] },
	{ hex: '00A800', rgb: [ 0, 168, 0 ] },
	{ hex: '00A844', rgb: [ 0, 168, 68 ] },
	{ hex: '008888', rgb: [ 0, 136, 136 ] },
	{ hex: '000000', rgb: [ 0, 0, 0 ] },
	{ hex: '000000', rgb: [ 0, 0, 0 ] },
	{ hex: '000000', rgb: [ 0, 0, 0 ] },
	{ hex: 'F8F8F8', rgb: [ 248, 248, 248 ] },
	{ hex: '3CBCFC', rgb: [ 60, 188, 252 ] },
	{ hex: '6888FC', rgb: [ 104, 136, 252 ] },
	{ hex: '9878F8', rgb: [ 152, 120, 248 ] },
	{ hex: 'F878F8', rgb: [ 248, 120, 248 ] },
	{ hex: 'F85898', rgb: [ 248, 88, 152 ] },
	{ hex: 'F87858', rgb: [ 248, 120, 88 ] },
	{ hex: 'FCA044', rgb: [ 252, 160, 68 ] },
	{ hex: 'F8B800', rgb: [ 248, 184, 0 ] },
	{ hex: 'B8F818', rgb: [ 184, 248, 24 ] },
	{ hex: '58D854', rgb: [ 88, 216, 84 ] },
	{ hex: '58F898', rgb: [ 88, 248, 152 ] },
	{ hex: '00E8D8', rgb: [ 0, 232, 216 ] },
	{ hex: '787878', rgb: [ 120, 120, 120 ] },
	{ hex: '000000', rgb: [ 0, 0, 0 ] },
	{ hex: '000000', rgb: [ 0, 0, 0 ] },
	{ hex: 'FCFCFC', rgb: [ 252, 252, 252 ] },
	{ hex: 'A4E4FC', rgb: [ 164, 228, 252 ] },
	{ hex: 'B8B8F8', rgb: [ 184, 184, 248 ] },
	{ hex: 'D8B8F8', rgb: [ 216, 184, 248 ] },
	{ hex: 'F8B8F8', rgb: [ 248, 184, 248 ] },
	{ hex: 'F8A4C0', rgb: [ 248, 164, 192 ] },
	{ hex: 'F0D0B0', rgb: [ 240, 208, 176 ] },
	{ hex: 'FCE0A8', rgb: [ 252, 224, 168 ] },
	{ hex: 'F8D878', rgb: [ 248, 216, 120 ] },
	{ hex: 'D8F878', rgb: [ 216, 248, 120 ] },
	{ hex: 'B8F8B8', rgb: [ 184, 248, 184 ] },
	{ hex: 'B8F8D8', rgb: [ 184, 248, 216 ] },
	{ hex: '00FCFC', rgb: [ 0, 252, 252 ] },
	{ hex: 'D8D8D8', rgb: [ 216, 216, 216 ] },
	{ hex: '000000', rgb: [ 0, 0, 0 ] },
	{ hex: '000000', rgb: [ 0, 0, 0 ] }
];

const palette = [
	{ hex: '00A800', index: 0x1A },
	{ hex: '000000', index: 0x0F },
	{ hex: 'A81000', index: 0x06 },
	{ hex: 'FCFCFC', index: 0x30 }
];

const rom = process.argv[2];
if (!rom) {
	console.error('must provide a rom file');
	process.exit(1);
}
const buf = fs.readFileSync(rom);

function toBinaryArray(uint) {
	let bin = uint.toString(2);
	while (bin.length < 8) {
		bin = '0' + bin;
	}
	return bin.split('').map(b => parseInt(b, 10));
}

CHR.forEach(chr => {
	const chr8x8 = [];
	chr.layout.forEach((offset) => {
		for (let i = 0; i < SPRITE_SIZE; i++) {
			const bin1 = toBinaryArray(buf.readUInt8(chr.offset + (offset * SPRITE_BYTES) + i));
			const bin2 = toBinaryArray(buf.readUInt8(chr.offset + (offset * SPRITE_BYTES) + i + SPRITE_SIZE));
			for (let j = 0; j < SPRITE_SIZE; j++) {
				chr8x8.push(bin1[j] + (bin2[j] * 2));
			}
		}
	});
	chr.data = JSON.stringify(chr8x8);
});

let output = JSON.stringify({ CHR, states, colors, palette }, null, '\t')
	.replace(/"(.+?)"/g, '$1')
	.replace(/name:\s+([^,]+)/g, 'name: \'$1\'')
	.replace(/hex:\s+([^,]+)/g, 'hex: \'$1\'');
output = `// DO NOT EDIT THIS FILE DIRECTLY! This file has been generated via a ROM sprite
// extraction tool located at tools/sprite-extract.js

module.exports = ${output};
`;

fs.writeFileSync(JS_PATH, output);

console.log(`sprite data successfully written to ${JS_PATH}`);
