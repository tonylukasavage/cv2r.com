var SpriteMaker = {
	height: 32,
	width: 16,
	scale: 8
};

(function() {
	var height = SpriteMaker.height;
	var width = SpriteMaker.width;
	var scale = SpriteMaker.scale;
	var pixels = SpriteMaker.pixels = new Array(width * height);

	// set default value for all pixels in editor
	pixels.fill({});
  pixels = pixels.map((p, index) => {
    return {
      x: (index % width) * scale,
      y: (Math.floor(index / height)) * scale,
      pi: 0
    };
  });
});