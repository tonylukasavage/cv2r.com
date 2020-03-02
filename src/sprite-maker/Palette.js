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
	}
}

module.exports = Palette;