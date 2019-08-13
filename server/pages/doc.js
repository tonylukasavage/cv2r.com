const core = require('cv2-rando/lib/core');

const reqOrder = [
  'holy water',
  'white crystal',
  'blue crystal',
  'red crystal',
  'heart',
  'oak stake',
  'laurels',
  'garlic'
];

module.exports = function(app) {
  const checks = [];
  core.filter(c => c.actors && c.actors.length).forEach(loc => {
    loc.actors.filter(a => a.holdsItem).forEach(actor => {
      // deal with the fact that the name "crystal dude" and "secret merchant"
      // are used to represent multiple types of actors in the core lib in cv2-rando
      const location = loc.name;
      let name = actor.name;
      if (name === 'crystal dude') {
        if (/Laruba/.test(location)) { name = 'laurels dude'; } 
        else if (/Debious/.test(location)) { name = 'flame whip dude'; }
        else if (/Vrad/.test(location)) { name = 'diamond dude'; }
      } else if (name === 'secret merchant') {
        if (/Cemetery/.test(location)) { name = 'silver knife dude'; }
        else if (/Storigoi/.test(location)) { name = 'silk bag dude'; }
      }
      const image = `/img/sprites/${name.replace(/\s+/g, '-')}.png`;

      // send back image links for item requirements
      let requirements = [];
      if (actor.requirements && actor.requirements.length) {
        const hasRed = actor.requirements.includes('red crystal');
        const hasBlue = actor.requirements.includes('blue crystal');
        actor.requirements.forEach(req => {
          if (hasRed && [ 'blue crystal', 'white crystal' ].includes(req)) { return; }
          if (hasBlue && 'white crystal' === req) { return; }
          requirements.push({
            name: req,
            image: `/img/sprites/${req.replace(/\s+/, '-')}.png`
          });
        });
      }
      requirements.sort((a,b) => {
        return reqOrder.indexOf(a.name) - reqOrder.indexOf(b.name);
      });

      checks.push({ actor: name, location, image, requirements });
    });
  });
  app.get('/doc', (req, res) => res.render('pages/doc', { checks }));
};