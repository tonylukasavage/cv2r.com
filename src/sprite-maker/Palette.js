const { palette } = require('./data');

const template = `
<div class="palette-button">
	<div class="palette-button-corner">
		<div class="palette-button-index">1</div>
	</div>
</div>
`;

class Palette {
	constructor() {
		palette.forEach((p, index) => {
			const button = $(template);
			if (index === 0) {
				button.addClass('palette-button-selected');
			}
			button.css('background-color', '#' + p.hex);
			button.data('pi', index);
			button.find('.palette-button-index').text(index === 0 ? 'X' : index);
			$('#palette-container').append(button);

			button.click(function() {
				var self = this;
				$('.palette-button').each(function() {
					if (this === self) {
						$(this).addClass('palette-button-selected');
					} else {
						$(this).removeClass('palette-button-selected');
					}
				});
			});
		});
	}
}

module.exports = Palette;