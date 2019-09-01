const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { readFileSync } = require('fs');
const { difficulty, dir, version } = require('cv2r');

const patches = [];
Object.keys(difficulty).forEach(diff => {
  difficulty[diff].patches.forEach(patch => {
    const existing = patches.find(p => p.key === patch);
    if (existing) {
      existing.difficulty.push(diff);
    } else {
      const mod = _.pick(require(`${dir.patch}/${patch}`), [ 'name', 'description' ]);
      patches.push({
        key: patch,
        name: mod.name,
        description: mod.description,
        difficulty: [ diff ]
      });
    }
  });
});
patches.sort((a,b) => a.name > b.name);

const palettes = {};
fs.readdirSync(dir.palette).forEach(file => {
    const mod = require(path.join(dir.palette, file));
    palettes[file.replace(/\.js$/, '')] = _.pick(mod, [ 'name', 'description' ]);
});

module.exports = function(app) {
  app
    .get('/getrom', (req, res) => {
      res.render('pages/getrom', { patches, palettes });
    })
    .post('/genrom', (req, res) => {
      //let { seed, palette, difficulty, patch } = req.body;

			// get platform-specific bin path
      let bin = path.join(__dirname, '..', '..', 'node_modules', 'cv2r', 'bin', 'cv2r');
      if (process.platform === 'win32') {
        bin = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'cv2r');
      }

			// determine whether this is a pre-defined difficulty or custom patch list
			const { difficulty, patch } = req.body;
			const reqArgs = [ 'seed', 'palette' ];
			if (!difficulty) {
				if (patch) {
					reqArgs.push('patch');
				}
			} else {
				reqArgs.push('difficulty');
			}

			// execute cv2r
			const args = reqArgs.reduce((a,c) => a + `--${c} "${req.body[c]}" `, '');
			console.log(`${bin} --json ${args}`);
      exec(`${bin} --json ${args}`, function(err, stdout, stderr) {
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
