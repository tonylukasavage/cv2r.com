const data = require('./data');
const ColorPicker = require('./ColorPicker');
const Editor = require('./Editor');
const Palette = require('./Palette');
const Tiles = require('./Tiles');
const States = require('./States');
const { loadPatch } = require('./utils');
const JSZip = require('jszip');

class SpriteMaker {
	constructor() {
		const editor = this.editor = new Editor();
		const tiles = this.tiles = new Tiles();
		const states = this.states = new States(this.tiles, this.editor.chrIndex);
		const palette = this.palette = new Palette();
		this.colorPicker = new ColorPicker();

		editor.on('pixel', ev => {
			tiles.updatePixel(ev);
			states.draw(true);
		});
		tiles.on('click', chrIndex => {
			editor.updateChr(tiles, chrIndex);
			states.showAffected(chrIndex);
			editor.undoBuffer.length = 0;
		});
		this.colorPicker.on('update', this.draw.bind(this));
		palette.on('undo', editor.undo.bind(editor));
		palette.on('clear', () => {
			editor.clear();
			tiles.clear(editor.chrIndex);
		});

		$('#patch-name').keyup(function() {
			const idVal = $(this).val()
				.toLowerCase()
				.replace(/\s+/g, '-')
				.replace(/[^a-z0-9\-]/g, '');
			$('#patch-id').val(idVal);	
		});

		$('#fps').change(this.states.updateFps.bind(this.states));
		$('#animateToggle').change(function() {
			states.updateAnimate($(this).prop('checked'));
			states.updateFps(states.fps);
		});
		$('#affectedToggle').change(function() {
			states.onlyShowAffected = $(this).prop('checked');
			states.showAffected(editor.chrIndex);
		});
		$('#transparentToggle').change(function() {
			states.backgroundTransparency = $(this).prop('checked');
			states.draw();
		});

		$('#sprite-load').click(function() {
			$('#sprite-load-file').trigger('click');
		});

		$('#sprite-load-file').change(function() {
			const file = this.files[0];
			var reader = new FileReader();
			reader.onload = function() {
				const { 
					author = '',
					id = '',
					name = '',
					description = '',
					tiles: patchTiles, 
					palette,
					spriteMaker
				} = loadPatch(this.result);

				// make sure this is a Sprite Maker generated patch
				if (!spriteMaker) {
					return alert('Invalid patch file. Are you sure this patch was generated with Sprite Maker?');
				}	

				// load palette, tiles, and editor
				data.palette.forEach((p, index) => Object.assign(p, palette[index]));
				tiles.load(patchTiles);
				editor.load(tiles);

				// load the patch meta data
				$('#patch-name').val(name);
				$('#patch-id').val(id);
				$('#patch-author').val(author);
				$('#patch-description').val(description);
			};
			reader.readAsText(file);
		});

		$('#sprite-patch').click(async function() {
			const result = validateDownload();
			if (result.errors && result.errors.length) {
				return alert(result.errors.join('\n'));
			}
			delete result.errors;
			result.name = result.name.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
			result.author = result.author.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
			result.description = result.description.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');

			const chrPixelLength = 64;
			const spritePatches = [];

			// convert all tile pixels into sprite bytes that cv2 can understand
			tiles.pixels.forEach(pixels => {
				const bytes = [];
				const { offset } = pixels;
				let pixelCount = 0;

				pixels.layout.forEach(layout => {
					const pixelOffset = layout * 16;
					let byte1 = '', byte2 = '';
					let byteIndex = 0;

					for (let i = 0; i < chrPixelLength; i++) {
						const { paletteIndex } = pixels[pixelCount++];
						byte1 += paletteIndex % 2;
						byte2 += paletteIndex > 1 ? 1 : 0;
						if (i % 8 === 7) {
							bytes[byteIndex + pixelOffset] = parseInt(byte1, 2);
							bytes[byteIndex + pixelOffset + 8] = parseInt(byte2, 2);
							byteIndex++;
							if (byteIndex % 8 === 0) {
								byteIndex += 8;
							}
							byte1 = '';
							byte2 = '';
						}
					}
				});
				spritePatches.push({ offset, bytes });
			});

			// update simon sprite on all sprite tables
			const offsets = [ 0, 0x2000, 0x4000, 0x6000, 0x8000, 0x9000, 0xB000, 0x17000 ];
			const finalSpritePatch = [];
			for (let i = 0; i < offsets.length; i++) {
				spritePatches.forEach(sp => {
					finalSpritePatch.push({
						offset: sp.offset + offsets[i],
						bytes: sp.bytes.slice(0)
					});
				});
			}

			// update simon's palette
			finalSpritePatch.push({
				offset: 117439,
				bytes: data.palette.slice(1).map(p => p.index)
			});

			// create preview image
			const width = 64;
			const previewZoom = 4;
			const zoom = previewZoom / tiles.zoom;
			const tempCanvas = $(`<canvas id="tempCanvas" width="${width}px" height="128px" style="width:${width}px;height:128px;">`);
			const tempCtx = tempCanvas[0].getContext('2d');

			// flip tiles horizontally, to face right
			tempCtx.translate(width, 0);
			tempCtx.scale(-1, 1);

			// draw idle sprite on temp canvas
			for (let i = 0; i < 2; i++) {
				tiles.pixels[i].forEach(p => {
					const pi = p.paletteIndex;
					if (pi === 0) { return; }
					tempCtx.fillStyle = '#' + data.palette[pi].hex;
					tempCtx.fillRect(p.x * zoom, p.y * zoom + (width * i), previewZoom, previewZoom);
				});
			}
			
			// export temp canvas as png and convert to blob
			const pngUrl = tempCanvas[0].toDataURL('image/png');
			const pngData = (await fetch(pngUrl)).blob();

			// write the patch file
			const patch = JSON.stringify(Object.assign(result, {
				spriteMaker: true,
				patch: finalSpritePatch	
			}), null, '\t');
			
			// create a zip file containing the patch file and preview sprite. For example,
			// if the id of the sprite was "bsac", then the contents of the zip file would 
			// look like this:
			//
			// bsac (folder)
			// |-> index.js (patch file)
			// |-> preview.png (preview image for cv2r.com)
			const zip = new JSZip();
			const folder = zip.folder(result.id);
			folder.file('index.js', patch);
			folder.file('preview.png', pngData, { base64: true });
			zip.generateAsync({ type: 'blob' }).then(content => {
				downloadFile(content, result.id + '.zip');
				tempCanvas.remove();
			});
		});
	}
	
	draw() {
		this.editor.draw();
		this.tiles.draw();
		this.states.draw();
	}
}

window.SpriteMaker = SpriteMaker;

function validateDownload() {
	const errors = [];

	const name = $('#patch-name').val();
	if (!name) { errors.push('must provide patch name'); }
	else if (name.length > 64) { errors.push('patch name must be 64 characters or less'); }
	
	const id = $('#patch-id').val();
	if (!id) { errors.push('must provide a patch id (via providing a name)'); }
	else if (!/^[a-z0-9\-]+$/.test(id)) { errors.push('patch id can consist of only lowercase letters, numbers, and dashes');  }

	const author = $('#patch-author').val();
	if (author && author.length > 64) {
		errors.push('patch author must be 64 characters or less');
	}

	const description = $('#patch-description').val();
	if (description && description.length > 1024) {
		errors.push('patch description must be 1024 characters or less');
	}

	return { name, id, author, description, errors };
}

function downloadFile(content, filename) {
	const blob = new Blob([content]);
	const link = document.createElement('a');
	const url = URL.createObjectURL(blob);
	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}