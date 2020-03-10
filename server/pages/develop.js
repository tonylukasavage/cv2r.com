module.exports = function(app) {
	app.get('/develop', (req, res) => res.render('pages/develop'));
};