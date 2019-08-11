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

const crew = [
	{
		name: 'BloodSweatAndCode',
		role: 'Creator',
		social: [
			{ name: 'twitch', 'link': 'https://www.twitch.tv/bloodsweatandcode' },
			{ name: 'speedrun.com', 'link': 'https://www.speedrun.com/user/BloodSweatAndCode' },
			{ name: 'SRL', 'link': 'http://www.speedrunslive.com/profiles/#!/BloodSweatAndCode/1' },
			{ name: 'youtube', 'link': 'https://www.youtube.com/channel/UCaqBNgyY6bL7yZwSSiIHRkQ' },
			{ name: 'twitter', 'link': 'https://twitter.com/tonylukasavage' }
		]
	},
	{
		name: 'Burb',
		role: 'Contributor, Tester',
		social: [
			{ name: 'twitch', 'link': 'https://www.twitch.tv/burb__' },
			{ name: 'speedrun.com', 'link': 'https://www.speedrun.com/user/Burb' },
			{ name: 'SRL', 'link': 'http://www.speedrunslive.com/profiles/#!/Burb/1' },
			{ name: 'youtube', 'link': 'https://www.youtube.com/user/burbruee' },
			{ name: 'twitter', 'link': 'https://www.twitter.com/burbruee' }
		]
	},
	{
		name: 'Sathdresh',
		role: 'Tester',
		social: [
			{ name: 'twitch', 'link': 'https://www.twitch.tv/sathdresh' },
			{ name: 'speedrun.com', 'link': 'https://www.speedrun.com/user/Sathdresh' },
			{ name: 'SRL', 'link': 'http://www.speedrunslive.com/profiles/#!/sathdresh/1' },
			{ name: 'youtube', 'link': 'https://www.youtube.com/channel/UCz9a0Yk4-omxav26_CIIeQw' },
			{ name: 'twitter', 'link': 'https://www.twitter.com/sathdresh' }
		]
	},
	{
		name: '2snek',
		role: 'Tester',
		social: [
			{ name: 'twitch', 'link': 'https://www.twitch.tv/2snek' },
			{ name: 'speedrun.com', 'link': 'https://www.speedrun.com/user/2_snek' },
			{ name: 'youtube', 'link': 'https://www.youtube.com/user/2+snek' },
			{ name: 'twitter', 'link': 'https://www.twitter.com/2_snek' }
		]
	},
	{
		name: 'Retrogaming2084',
		role: 'Tester',
		social: [
			{ name: 'twitch', 'link': 'https://www.twitch.tv/Retrogaming2084' },
			{ name: 'speedrun.com', 'link': 'https://www.speedrun.com/user/Retrogaming2084' },
			{ name: 'SRL', 'link': 'http://www.speedrunslive.com/profiles/#!/Retrogaming2084' },
			{ name: 'twitter', 'link': 'https://www.twitter.com/Retrogaming2084' }
		]
	},
	{
		name: 'drcossack',
		role: 'Tester',
		social: [
			{ name: 'twitch', 'link': 'https://www.twitch.tv/drcossack' },
			{ name: 'speedrun.com', 'link': 'https://www.speedrun.com/user/drcossack' },
			{ name: 'SRL', 'link': 'http://www.speedrunslive.com/profiles/#!/drcossack/1' }
		]
	}


];
crew.forEach(c => c.image = `/img/people/${c.name}.png`);

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
	.get('/start', (req, res) => res.render('pages/start'))
	.get('/dev', (req, res) => res.render('pages/dev'))
	.get('/doc', (req, res) => res.render('pages/doc'))
	.get('/credits', (req, res) => res.render('pages/credits', { crew }))
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
