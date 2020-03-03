const EventEmitter = require('events');
const { palette } = require('./data');

const template = `
<div class="palette-button-selection">
	<div class="palette-button">
		<div class="palette-button-corner">
			<div class="palette-button-index">1</div>
		</div>
	</div>
</div>
`;

const undoButtonTemplate = '<button id="undo-button">UNDO</button>';

const clearButtonTemplate = '<button id="clear-button">CLEAR</button>';

class Palette extends EventEmitter {
	constructor() {
		super();
		palette.forEach((p, index) => {
			const fullButton = $(template);
			const button = fullButton.find('.palette-button');

			if (index === 0) {
				fullButton.addClass('palette-button-selected');
			}
			button.css('background-color', '#' + p.hex);
			button.data('pi', index);
			button.find('.palette-button-index').text(index === 0 ? 'X' : index);
			$('#palette-container').append(fullButton);

			button.click(function() {
				const pi = $(this).data('pi');
				$('.palette-button-selection').each(function() {
					const pb = $(this).find('.palette-button');
					if (pi === pb.data('pi')) {
						$(this).addClass('palette-button-selected');
					} else {
						$(this).removeClass('palette-button-selected');
					}
				});
			});
		});

		const undoButton = $(undoButtonTemplate);
		$('#palette-container').append(undoButton);
		undoButton.click(() => {
			this.emit('undo');
		});

		const clearButton = $(clearButtonTemplate);
		$('#palette-container').append(clearButton);
		clearButton.click(() => {
			this.emit('clear');
		});
	}

	load(loadPalette) {
		loadPalette.forEach((p, i) => Object.assign(palette[i], p));
		this.draw();
	}

	draw() {
		$('.palette-button').each(function(index, value) {
			$(value).css('background-color', '#' + palette[index].hex);
		});
	}
}

module.exports = Palette;