class Divider {
  constructor(editor) {
    this.editor = editor;
    this.style = 'rgba(255,255,255,0.65)';
  }

  draw() {
    const { ctx, spriteIndex, sprites, zoom } = this.editor;
    const sprite = sprites[spriteIndex];

    ctx.strokeStyle = this.style;
    ctx.beginPath();
    ctx.moveTo(0, sprite.height * zoom / 2);
    ctx.lineTo(sprite.width * zoom, sprite.height * zoom / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(sprite.width * zoom / 2, 0);
    ctx.lineTo(sprite.width * zoom / 2, sprite.height * zoom);
    ctx.stroke();
  }
}

class Grid {
  constructor(editor) {
    this.editor = editor;
    this.style = 'rgba(255,255,255,0.25)';
    this.lines = [];

    const sprite = sprites[spriteIndex];
    for (let i = 0; i < sprite.width + 1; i++) {
      this.lines.push({ type: 'x', index: i });
    }
    for (let i = 0; i < sprite.height + 1; i++) {
      this.lines.push({ type: 'y', index: i });
    }
  }

  draw() {
    const { ctx, spriteIndex, sprites, zoom } = this.editor;
    var sprite = sprites[spriteIndex];

    ctx.strokeStyle = this.style;
    this.lines.forEach(line => {
      if (line.type === 'x') {
        ctx.beginPath();
        ctx.moveTo(line.index * zoom, 0);
        ctx.lineTo(line.index * zoom, sprite.height * zoom);
        ctx.stroke();
      } else if (line.type === 'y') {
        ctx.beginPath();
        ctx.moveTo(0, line.index * zoom);
        ctx.lineTo(sprite.width * zoom, line.index * zoom);
        ctx.stroke();
      }
    });
  }
}

class Editor {
  constructor() {
    this.spriteIndex = 0;
    this.zoom = 16;
    this.mousedown = false;
    this.pixels = [];

    // create canvas for editor
    const canvas = document.createElement('canvas');
    canvas.className = 'editor-canvas';
    canvas.id = 'editor-canvas';
    $('#editor-container').append(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // add drawing events for canvas
    canvas.addEventListener('click', this.drawPixel.bind(this), false);
    canvas.addEventListener('mouseup', () => this.mousedown = false);
    canvas.addEventListener('mousedown', ev => {
      this.mousedown = true;
      this.drawPixel(ev);
    });
    canvas.addEventListener('mousemove', ev => {
      if (this.mousedown) {
        this.drawPixel(ev);
      }
    });

    // load initial sprite into editor
    const sprite = sprites[this.spriteIndex];
    loadSprite(sprite, this.pixels, this.zoom);
    resizeSprite.call(this, canvas, sprite, this.zoom);
    this.grid.init(this, sprite);
  }

  drawPixel(ev) {
    const sprite = sprites[this.spriteIndex];
    const rect = this.canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const xScale = Math.floor(x / this.zoom);
    const yScale = Math.floor(y / this.zoom);
    const index = (yScale * sprite.width) + xScale;

    if (sprite.width > 8) {
      let offset = 0;
      if (xScale >= sprite.width / 2) { offset++; }
      if (yScale >= sprite.height / 2) { offset++; }
      index = (64 * offset) + (yScale * 8) + (xScale % 8);
    }
    this.pixels[index].paletteIndex = getPaletteIndex();
    tiles.pixels[this.spriteIndex][index].paletteIndex = getPaletteIndex();
    this.draw();
  }
}

var editor = {
  spriteIndex: 0,
  pixels: [],
  zoom: 16,
  mousedown: false,




  drawPixel: function(ev) {
    var sprite = sprites[this.spriteIndex];
    var rect = this.canvas.getBoundingClientRect();
    var x = ev.clientX - rect.left;
    var y = ev.clientY - rect.top;
    var xScale = Math.floor(x / this.zoom);
    var yScale = Math.floor(y / this.zoom);
    var index = (yScale * sprite.width) + xScale;

    if (sprite.width > 8) {
      var offset = 0;
      if (xScale >= sprite.width / 2) { offset++; }
      if (yScale >= sprite.height / 2) { offset++; }
      index = (64 * offset) + (yScale * 8) + (xScale % 8);
    }
    console.log(getPaletteIndex());
    this.pixels[index].paletteIndex = getPaletteIndex();
    tiles.pixels[this.spriteIndex][index].paletteIndex = getPaletteIndex();
    this.draw();
  },

  draw: function() {
    this.pixels.forEach(p => {
      this.ctx.fillStyle = '#' + palette[p.paletteIndex].hex;
      this.ctx.fillRect(p.x, p.y, this.zoom, this.zoom);
    });
    this.grid.draw(this);
    this.divider.draw(this);
    tiles.draw();
  }
};