const _ = require('lodash');
const fs = require('fs');

const BASE = 135216;
const SPRITE_SIZE = 8;
const SPRITE_BYTES = 16;
const JS_PATH = './server/sprites.js'; //'./web/public/js/sprite-maker/sprites.js';

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

const states = [
	{
		name: 'idle',
		height: 32,
		width: 16,
		frames: [
			[
				{ id: 'simonIdleTop', x: 0, y: 0 },
				{ id: 'simonIdleBottom', x: 0, y: 2 }
			]
		]
	},
	{
		name: 'crouch',
		height: 32,
		width: 16,
		frames: [
			[
				{ id: 'simonIdleTop', x: 0, y: 0 },
				{ id: 'simonCrouchFrontLeg', x: 0, y: 2 },
				{ id: 'simonCrouchBackLeg', x: 2, y: 2 },
				{ id: 'simonCrouchEmpty1', x: 0, y: 3 },
				{ id: 'simonCrouchEmpty2', x: 2, y: 3 } 
			]
		]
	},
	{
		name: 'walk',
		height: 32,
		width: 16,
		frames: [
			[
				{ id: 'simonIdleTop', x: 0, y: 0 },
				{ id: 'simonIdleBottom', x: 0, y: 2 }
			],
			[
				{ id: 'simonWalk1Top', x: 0, y: 0 },
				{ id: 'simonWalk1Bottom', x: 0, y: 2 }
			],
			[
				{ id: 'simonWalk2Top', x: 0, y: 0 },
				{ id: 'simonWalk2Bottom', x: 0, y: 2 }
			]
		]
	},
	{
		name: 'stairs - walk down',
		height: 32,
		width: 16,
		frames: [
			[
				{ id: 'simonIdleTop', x: 0, y: 0 },
				{ id: 'simonStairsDamageLeg', x: 0, y: 2 },
				{ id: 'simonCrouchBackLeg', x: 2, y: 2 },
				{ id: 'simonCrouchEmpty2', x: 2, y: 3 } 
			],
			[
				{ id: 'simonWalk1Top', x: 0, y: 0 },
				{ id: 'simonWalk1Bottom', x: 0, y: 2 }
			]
		]
	},
	{
		name: 'stairs - walk up',
		height: 32,
		width: 16,
		frames: [
			[
				{ id: 'simonIdleTop', x: 0, y: 0 },
				{ id: 'simonStairWalkUpLegs', x: 0, y: 2 }
			],
			[
				{ id: 'simonWalk1Top', x: 0, y: 0 },
				{ id: 'simonWalk1Bottom', x: 0, y: 2 }
			]
		]
	},
	{
		name: 'dead',
		height: 16,
		width: 32,
		frames: [
			[
				{ id: 'simonDeadLeft', x: 0, y: 0 },
				{ id: 'simonDeadRight', x: 4, y: 0 }
			]
		]
	},
	{
		name: 'hurt',
		height: 32,
		width: 16,
		frames: [
			[
				{ id: 'simonDamageTop', x: 0, y: 0 },
				{ id: 'simonStairsDamageLeg', x: 0, y: 2 },
				{ id: 'simonCrouchBackLeg', x: 2, y: 2 },
				{ id: 'simonCrouchEmpty2', x: 2, y: 3 } 
			]
		]
	},
	{
		name: 'whip',
		height: 32,
		width: 32,
		frames: [
			[
				{ id: 'simonWhipTop1', x: 4, y: 0 },
				{ id: 'simonWalk2Bottom', x: 2, y: 2 }
			],
			[
				{ id: 'simonWhipTop2', x: 4, y: 0 },
				{ id: 'simonWalk2Bottom', x: 2, y: 2 }
			],
			[
				{ id: 'simonHand', x: 0, y: 1 },
				{ id: 'simonWhipTop3', x: 2, y: 0 },
				{ id: 'simonWalk2Bottom', x: 2, y: 2 }
			]
		]
	}
];

const sprites = [
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

sprites.forEach(sprite => {
	const sprite8x8 = [];
	sprite.layout.forEach((offset, index) => {
		for (let i = 0; i < SPRITE_SIZE; i++) {
			const bin1 = toBinaryArray(buf.readUInt8(sprite.offset + (offset * SPRITE_BYTES) + i));
			const bin2 = toBinaryArray(buf.readUInt8(sprite.offset + (offset * SPRITE_BYTES) + i + SPRITE_SIZE));
			for (let j = 0; j < SPRITE_SIZE; j++) {
				sprite8x8.push(bin1[j] + (bin2[j] * 2));
			}
		}
	});
	sprite.data = JSON.stringify(sprite8x8);
});

let output = JSON.stringify(sprites, null, 2)
	.replace(/"(.+?)"/g, '$1')
	.replace(/name:\s+([^,]+)/g, 'name: \'$1\'');
output = `// DO NOT EDIT THIS FILE DIRECTLY! This file has been generated via a ROM sprite
// extraction tool located at tools/sprite-extract.js

module.exports = {
	sprites: ${output},
	states: ${JSON.stringify(states, null, 2)}
};`;

fs.writeFileSync(JS_PATH, output);

console.log(`sprite data successfully written to ${JS_PATH}`);
