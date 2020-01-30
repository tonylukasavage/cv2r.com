const { colors } = require('../NES.js');

module.exports = function(app) {
  app.get('/sprite-maker', (req, res) => {
  	res.render('pages/sprite-maker', { colors });
  });
};