const { colors } = require('../NES.js');
const { sprites, states } = require('../sprites.js');

module.exports = function(app) {
  app.get('/sprite-maker', (req, res) => {
  	res.render('pages/sprite-maker', {
  		colors,
  		sprites,
      states,
  		palette: [
  			{ hex: '00FF00', index: 0x0F },
  			{ hex: '000000', index: 0x0F },
				{ hex: 'A81000', index: 0x06 },
				{ hex: 'FCFCFC', index: 0x30 }
  		]
  	});
  });
};