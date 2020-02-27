const ColorPicker = require('./ColorPicker');
const Editor = require('./Editor');
const Palette = require('./Palette');
const Tiles = require('./Tiles');
const States = require('./States');

class SpriteMaker {
	constructor() {
		this.editor = new Editor();
		this.tiles = new Tiles();
		this.states = new States(this.tiles, this.editor.chrIndex);
		this.palette = new Palette();
		this.colorPicker = new ColorPicker();

		this.editor.on('pixel', this.tiles.updatePixel.bind(this.tiles));
		this.tiles.on('click', chrIndex => {
			this.editor.updateChr(this.tiles, chrIndex);
			this.states.showAffected(chrIndex);
		});
		this.colorPicker.on('update', this.draw.bind(this));

		$('#fps').change(this.states.updateFps.bind(this.states));

		const states = this.states;
		$('#animateToggle').change(function() {
			states.animate = $(this).prop('checked');
			states.updateFps(states.fps);
		});
	}

	draw() {
		this.editor.draw();
		this.tiles.draw();
		this.states.draw();
	}
}

window.SpriteMaker = SpriteMaker;