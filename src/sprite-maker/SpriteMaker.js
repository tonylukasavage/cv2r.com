const ColorPicker = require('./ColorPicker');
const Editor = require('./Editor');
const Palette = require('./Palette');
const Tiles = require('./Tiles');
const States = require('./States');

class SpriteMaker {
	constructor() {
		const editor = this.editor = new Editor();
		const tiles = this.tiles = new Tiles();
		const states = this.states = new States(this.tiles, this.editor.chrIndex);
		this.palette = new Palette();
		this.colorPicker = new ColorPicker();

		editor.on('pixel', tiles.updatePixel.bind(tiles));
		tiles.on('click', chrIndex => {
			editor.updateChr(tiles, chrIndex);
			states.showAffected(chrIndex);
		});
		this.colorPicker.on('update', this.draw.bind(this));

		$('#fps').change(this.states.updateFps.bind(this.states));
		$('#animateToggle').change(function() {
			states.animate = $(this).prop('checked');
			states.updateFps(states.fps);
		});
		$('#affectedToggle').change(function() {
			states.onlyShowAffected = $(this).prop('checked');
			states.showAffected(editor.chrIndex);
		});
		$('#transparentToggle').change(function() {
			states.backgroundTransparency = $(this).prop('checked');
			states.draw();
		});

		$('#sprite-patch').click(function() {
			tiles.export();
		});
	}

	draw() {
		this.editor.draw();
		this.tiles.draw();
		this.states.draw();
	}
}

window.SpriteMaker = SpriteMaker;