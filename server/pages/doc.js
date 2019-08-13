const core = require('cv2-rando/lib/core');

module.exports = function(app) {
  const itemLocations = [];
  core.filter(c => c.actors && c.actors.length).forEach(loc => {
    loc.actors.filter(a => a.holdsItem).forEach(actor => {
      const location = loc.name;
      let name = actor.name;
      let image = `/img/sprites/${name.replace(/\s+/g, '-')}.png`;
      if (name === 'crystal dude') {
        if (/Laruba/.test(location)) { 
          name = 'laurels dude'; 
          image = `/img/sprites/merchant.png`; 
        } // normal merchant
        else if (/Debious/.test(location)) { 
          name = 'flame whip dude';
          image = `/img/sprites/flame-whip-dude.png`; 
        }
        else if (/Vrad/.test(location)) { 
          name = 'diamond dude'; 
          image = `/img/sprites/diamond-dude.png`;
        }
      } else if (name === 'secret merchant') {
        if (/Cemetery/.test(location)) {
          name = 'silver knife dude';
          image = `/img/sprites/silver-knife-dude.png`;
        }
        else if (/Storigoi/.test(location)) {
          name = 'silk bag dude';
          image = `/img/sprites/silk-bag-dude.png`;
        }
      }
      itemLocations.push({ actor: name, location, image });
    });
  });
  app.get('/doc', (req, res) => res.render('pages/doc', { itemLocations }));
};