const express = require('express');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 5000;

// setup basic express middleware and view handling
const app = express();
app
  .use(express.static(path.join(__dirname, '..','public')))
  .set('views', path.join(__dirname, '..', 'views'))
  .set('view engine', 'ejs')
	.use(express.json()) 
	.use(express.urlencoded({ extended: true }));
	
// load all pages
fs.readdirSync(path.join(__dirname, 'pages')).forEach(pageFile => {
	require(path.join(__dirname, 'pages', pageFile))(app);
});

app.listen(PORT, () => console.log(`Listening on ${ PORT }`))
