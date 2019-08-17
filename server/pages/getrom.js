const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { readFileSync } = require('fs');
const difficulty = require('cv2r/config/difficulty.json');
const { version } = require('cv2r/package.json');

const patches = [];
Object.keys(difficulty).forEach(diff => {
  difficulty[diff].patches.forEach(patch => {
    const existing = patches.find(p => p.key === patch);
    if (existing) {
      existing.difficulty.push(diff);
    } else {
      const mod = _.pick(require(`cv2r/lib/patch/${patch}`), [ 'name', 'description' ]);
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
const paletteDir = path.join(__dirname, '..', '..', 'node_modules', 'cv2r', 'lib', 'palette');
fs.readdirSync(paletteDir).forEach(file => {
    const mod = require(path.join(paletteDir, file));
    palettes[file.replace(/\.js$/, '')] = _.pick(mod, [ 'name', 'description' ]);
});

module.exports = function(app) {
  app
    .get('/getrom', (req, res) => {
      res.render('pages/getrom', { patches, palettes });
    })
    .post('/genrom', (req, res) => {
      let { seed, palette, difficulty } = req.body; 
      
      let bin = path.join(__dirname, '..', '..', 'node_modules', 'cv2r', 'bin', 'cv2r');
      if (process.platform === 'win32') {
        bin = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'cv2r');
      }
      exec(`${bin} --json --seed ${seed} --palette ${palette} --difficulty ${difficulty}`, function(err, stdout, stderr) {
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