/* eslint-disable linebreak-style */
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { readFileSync } = require('fs');
const { difficulty, dir, logic, version } = require('cv2r');

const patches = [];
fs.readdirSync(dir.patch).forEach(file => {
	const mod = require(path.join(dir.patch, file));
	const modObj = _.pick(mod, ['id', 'name', 'description']);
	modObj.key = modObj.id;
	modObj.difficulty = [];
	patches.push(modObj);
});
patches.sort((a, b) => a.name > b.name);

Object.keys(difficulty).forEach(diff => {
	difficulty[diff].patches.forEach(patch => {
		const existing = patches.find(p => p.key === patch);
		existing.difficulty.push(diff);
	});
});

const palettes = {};
fs.readdirSync(dir.palette).forEach(file => {
	const mod = require(path.join(dir.palette, file));
	palettes[file.replace(/\.js$/, '')] = _.pick(mod, ['name', 'description']);
});

const simon = {};
fs.readdirSync(dir.simon).forEach(file => {
	const name = file.replace(/\.js$/, '');
	const patchPath = path.join(dir.simon, file);

	// copy preview images from cv2r to cv2r.com
	if (fs.lstatSync(patchPath).isDirectory()) {
		const preview = path.join(patchPath, name + '.png');
		const public = path.join(__dirname, '..', '..', 'web', 'public', 'img', 'simon', name + '.png');
		fs.copyFileSync(preview, public);
	}

	const mod = require(patchPath);
	simon[name] = _.pick(mod, ['name', 'description']);
});

module.exports = function (app) {
	app
		.get('/getrom', (req, res) => {
			const logicText = {
				standard: 'Standard Logic requires no glitches or tricks to progress. Progression is driven entirely from the order of items you acquire. See the <a href="http://cv2r.herokuapp.com/doc?logic=standard">Checks section</a> for a full list of all requirements for every item location.',
				glitch: 'Glitch Logic requires all the CV2 knowledge you can muster. The Camilla Cemetery 3 block jump and blob boost are in logic, so no more waiting for red crystal before diving into Laruba, Bodley, and Doina. Stock up on those laurels! See the <a href="http://cv2r.herokuapp.com/doc?logic=glitch">Checks section</a> for a full list of all requirements for every item location.',
				diamondWarp: '<b>IMPORTANT:</b> This logic can be used with any difficulty, but may require glitches if not used with Diamond Warp difficulty.<br><br>Diamond Warp Logic is the same as standard logic, with one exception. If you acquire the magic cross and diamond, Doina is considered in logic, and Bodley is as well if you have the other items necessary to traverse it. See the <a href="http://cv2r.herokuapp.com/doc?logic=diamondWarp">Checks section</a> for a full list of all requirements for every item location.'
			};
			res.render('pages/getrom', { logic, logicText, patches, palettes, simon });
		})
		.post('/genrom', (req, res) => {
			// get platform-specific bin path
			let bin = path.join(__dirname, '..', '..', 'node_modules', 'cv2r', 'bin', 'cv2r');
			if (process.platform === 'win32') {
				bin = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'cv2r');
			}

			// determine whether this is a pre-defined difficulty or custom patch list
			const { difficulty, patch } = req.body;
			const reqArgs = ['seed', 'logic', 'palette', 'simon'];
			if (!difficulty) {
				if (patch) {
					reqArgs.push('patch');
				}
			} else {
				reqArgs.push('difficulty');
			}

			// execute cv2r
			const args = reqArgs.reduce((a, c) => a + `--${c} "${req.body[c]}" `, '');
			console.log(`${bin} --json ${args}`);
			exec(`${bin} --json ${args}`, function (err, stdout, stderr) {
				if (err) {
					console.error(err, stdout, stderr);
					res.status(500).send(err.stack);
				} else {
					const result = JSON.parse(stdout);
					result.version = version;
					res.send(JSON.stringify(result));
				}
			});
		})
		.get('/seed', (req, res) => {
			let seed = '';
			for (var i = 0; i < 4; i++) {
				seed += words[randomInt(0, words.length)];
			}
			res.send(seed);
		});
};

const words = readFileSync(path.resolve(__dirname, '..', 'data', 'words.txt'), 'utf8')
	.split(/[\r\n]+/)
	.filter(w => /^[a-zA-Z]+$/.test(w) && w.length > 2)
	.map(w => w.charAt(0).toUpperCase() + w.slice(1));

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};
