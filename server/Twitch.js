const request = require('request-promise');

class Twitch {
	constructor() {}

	async login() {
		const opts = {
			method: 'post',
			uri: 'https://id.twitch.tv/oauth2/token',
			qs: {
				client_id: process.env.CV2R_TWITCH_CLIENT_ID,
				client_secret: process.env.CV2R_TWITCH_CLIENT_SECRET,
				grant_type: 'client_credentials'
			}
		};
		this.accessToken = JSON.parse(await request(opts)).access_token;
	}
}

module.exports = Twitch;