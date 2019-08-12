const path = require('path');
const { exec } = require('child_process');
const { readFileSync } = require('fs');
const { version } = require('cv2-rando/package.json');

module.exports = function(app) {
  app
    .get('/getrom', (req, res) => res.render('pages/getrom'))
    .post('/genrom', (req, res) => {
      let { seed, palette, difficulty } = req.body; 
      
      let bin = path.join(__dirname, '..', '..', 'node_modules', 'cv2-rando', 'bin', 'cv2rando');
      if (process.platform === 'win32') {
        bin = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'cv2rando');
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