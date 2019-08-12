module.exports = function(app) {
  app.get('/dev', (req, res) => res.render('pages/dev'));
};