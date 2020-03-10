module.exports = function(app) {
	app.get('/resources', (req, res) => res.render('pages/resources'));
};