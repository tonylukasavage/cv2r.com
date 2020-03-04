const { CHR, palette, states } = require('./data');
const { resizeCanvas } = require('./utils');

class States {
	constructor(tiles, chrIndex) {
		Object.assign(this, {
			animations: [],
			zoom: 4,
			fps: 3,
			animate: true,
			onlyShowAffected: true,
			backgroundTransparency: false
		});

		states.forEach((state, index) => {
			const canvas = $('<canvas></canvas>');
			canvas.addClass('state-canvas');
			canvas.attr('data-sid', index);
			$('#states').append(canvas);
			state.canvas = canvas;
			state.ctx = canvas[0].getContext('2d');
			state.frameCount = 0;

			state.frames.forEach(frame => {
				frame.forEach(part => {
					part.pixels = tiles.pixels.find(pixels => {
						return pixels.name === part.name;
					});
				});
			});
			resizeCanvas.call(this, canvas, state.width, state.height, this.zoom);
		});

		this.updateFps(this.fps);
		this.showAffected(chrIndex);
	}

	updateFps(fps) {
		if (!$.isNumeric(fps)) {
			fps = $('#fps').val();
		}
		this.fps = fps;
		if (this.interval) {
			clearInterval(this.interval);
		}
		if (this.animate && fps > 0) {
			this.interval = setInterval(this.draw.bind(this), 1000 / this.fps);
		}
	}

	showAffected(chrIndex) {
		const chrName = CHR[chrIndex].name;
		states.forEach((state, index) => {
			const found = !this.onlyShowAffected || state.frames.find(frame => frame.find(f => f.name === chrName));
			const stateCanvas = $('canvas[data-sid="' + index + '"]');
			if (found) {
				stateCanvas.css('display', '');
			} else {
				stateCanvas.css('display', 'none');
			}
		});
	}

	draw() {
		states.forEach(state => {
			const { ctx } = state;
			ctx.clearRect(0, 0, state.width * this.zoom, state.height * this.zoom);

			const frame = state.frames[state.frameCount];
			frame.forEach(part => {
				part.pixels.forEach(p => {
					ctx.fillStyle = p.paletteIndex === 0 && this.backgroundTransparency ? 'rgba(0,0,0,0)' : '#' + palette[p.paletteIndex].hex;
					ctx.fillRect(
						p.x + (part.x > 0 ? 4 * part.x * this.zoom : 0), 
						p.y + (part.y > 0 ? 8 * part.y * this.zoom : 0), 
						this.zoom, 
						this.zoom
					);
				});
			});
			state.frameCount++;
			if (state.frameCount >= state.frames.length) {
				state.frameCount = 0;
			}
		});
	}
}

module.exports = States;