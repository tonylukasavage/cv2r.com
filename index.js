const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;
const { exec } = require('child_process');
const { readFileSync } = require('fs'); 

const words = readFileSync('words.txt', 'utf8')
	.split(/[\r\n]+/)
	.filter(w => /^[a-zA-Z]+$/.test(w) && w.length > 2)
	.map(w => w.charAt(0).toUpperCase() + w.slice(1));
function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
	.get('/start', (req, res) => res.render('pages/start'))
	.get('/dev', (req, res) => res.render('pages/dev'))
	.get('/doc', (req, res) => res.render('pages/doc'))
	.get('/credits', (req, res) => res.render('pages/credits'))
  .post('/patch', (req, res) => {
  	exec('./node_modules/.bin/cv2-rando --json', function(err, stdout, stderr) {
  		if (err) {
  			console.error(err, stdout, stderr);
  			res.status(500).send(err.stack);
  		} else {
  			res.send(stdout);
  		}
  	});
  })
  .get('/seed', (req, res) => {
  	let seed = '';
  	for (var i = 0; i < 4; i++) {
  		seed += words[randomInt(0, words.length)];
  	}
  	console.log(seed);
  	res.send(seed);
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
