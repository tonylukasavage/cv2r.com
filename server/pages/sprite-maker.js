const { colors } = require('../NES.js');
const sprites = require('../sprites.js');

module.exports = function(app) {
  app.get('/sprite-maker', (req, res) => {
  	res.render('pages/sprite-maker', { colors, sprites });
  });
};