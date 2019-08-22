const DiscordBot = require('./server/DiscordBot');
const express = require('express');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 5000;

// setup basic express middleware and view handling
const app = express();
app
  .use(express.static(path.join(__dirname, 'web','public')))
  .set('views', path.join(__dirname, 'web', 'views'))
  .set('view engine', 'ejs')
	.use(express.json()) 
	.use(express.urlencoded({ extended: true }));

// configure discord bot
const discord = new DiscordBot(app);
	
// load all pages
fs.readdirSync(path.join(__dirname, 'server', 'pages')).forEach(pageFile => {
	require(path.join(__dirname, 'server', 'pages', pageFile))(app);
});

app.listen(PORT, async () => {
	console.log(`Listening on ${ PORT }`);
	await discord.login(process.env.CV2R_DISCORD_BOT_TOKEN);
});
