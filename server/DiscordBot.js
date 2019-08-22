const Discord = require('discord.js');
const request = require('request-promise');
const Twitch = require('./Twitch');

class DiscordBot {
	constructor(app) {
		this.client = new Discord.Client();
		this.client.on('ready', this.ready.bind(this));
		app.get('/discord', this.homeRoute.bind(this));
		this.twitch = new Twitch();
	}

	homeRoute(req, res) {
		res.send(this.twitch.accessToken);
	}

	async login(token) {
		await this.client.login(token);
	}

	// TODO: deal with access token expiration
	async ready() {
		console.log(`Logged in as ${this.client.user.tag}`);
		await this.twitch.login();
	}
}

module.exports = DiscordBot;