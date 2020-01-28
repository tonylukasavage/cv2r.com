const _ = require('lodash');
const fs = require('fs');

const BASE = 135216;
const SPRITE_SIZE = 8;
const SPRITE_BYTES = 16;

const buf = fs.readFileSync('../cv2r/cv2.nes');

function toBinaryArray(uint) {
	let bin = uint.toString(2);
	while (bin.length < 8) {
		bin = '0' + bin;
	}
	return bin.split('').map(b => parseInt(b, 10));
}

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
		name: 'simonCrouch',
		height: 16,
		width: 16,
		offset: 0x211B0,
		layout: [ 0, 2, 1, 3 ]
	},
	{
		name: 'simonStairsDamageLeg',
		height: 16,
		width: 8,
		offset: 0x211F0,
		layout: [ 0, 1 ]
	},
	{
		name: 'simonJumpWhipBottom',
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
	sprite.data = sprite8x8;
});

console.log(JSON.stringify(sprites, null, 2));
