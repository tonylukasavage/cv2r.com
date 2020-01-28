var spriteMaker = {};

(function() {
	var MAX_HEIGHT = 32;
	var MAX_WIDTH = 16;
	var $canvas, sprite, pixels;

	SpriteMaker.init = function(_canvas, _sprite, _zoom) {
		$canvas = _canvas;
		zoom = _zoom;
		this.resize(sprite.width, sprite.height);
		this.loadSprite(sprite);
	};

	SpriteMaker.resize = function(width, height, zoom) {
		$canvas.attr('height', height * zoom);
		$canvas.attr('width', width * zoom);
		$canvas.css({
			width: width * zoom,
			height: height * zoom
		});
	};

	SpriteMaker.loadSprite = function(name) {
		sprite = _sprite;
		pixels = new Array(sprite.width * sprite.height);
		pixels = pixels.map((p, index) => {
	    return {
	      x: (index % width) * scale,
	      y: (Math.floor(index / height)) * scale,
	      pi: 0
	    };
	  });
	};
});