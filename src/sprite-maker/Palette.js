const { palette } = require('./data');

class Palette {
	constructor() {
		palette.forEach((p, index) => {
			const button = $('<button></button>');
			button.addClass('palette-button');
			if (index === 0) {
				button.addClass('palette-button-selected');
			}
			button.css('background-color', '#' + p.hex);
			button.data('pi', index);
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