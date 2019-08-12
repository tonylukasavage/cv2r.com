module.exports = function(app) {
  app.get('/doc', (req, res) => res.render('pages/doc'));
};