function loadFont(scene, fontName, fontData) {
  const texture = scene.textures.get(fontName);
  const image = texture.source[0];
  const imageWidth = image.width;
  const imageHeight = image.height;
  const fontConfig = {
    font: fontName,
    size: 0,
    lineHeight: 0,
    chars: {}
  };
  const kerningPairs = [];
  for (const line of fontData.split("\n")) {
    const lineParts = line.trim().split(/\s+/);
    if (!lineParts.length) continue;
    const lineType = lineParts[0];
    const properties = {};
    for (let i = 1; i < lineParts.length; i++) {
      const equalIndex = lineParts[i].indexOf("=");
      if (equalIndex >= 0) {
        properties[lineParts[i].slice(0, equalIndex)] = lineParts[i].slice(equalIndex + 1).replace(/^"|"$/g, "");
      }
    }
    if (lineType === "info") {
      fontConfig.size = parseInt(properties.size, 10);
    } else if (lineType === "common") {
      fontConfig.lineHeight = parseInt(properties.lineHeight, 10);
    } else if (lineType === "char") {
      const charId = parseInt(properties.id, 10);
      const charX = parseInt(properties.x, 10);
      const charY = parseInt(properties.y, 10);
      const charWidth = parseInt(properties.width, 10);
      const charHeight = parseInt(properties.height, 10);
      const u0 = charX / imageWidth;
      const v0 = charY / imageHeight;
      const u1 = (charX + charWidth) / imageWidth;
      const v1 = (charY + charHeight) / imageHeight;
      fontConfig.chars[charId] = {
        x: charX, y: charY, width: charWidth, height: charHeight,
        centerX: Math.floor(charWidth / 2), centerY: Math.floor(charHeight / 2),
        xOffset: parseInt(properties.xoffset, 10),
        yOffset: parseInt(properties.yoffset, 10),
        xAdvance: parseInt(properties.xadvance, 10),
        data: {}, kerning: {},
        u0, v0, u1, v1
      };
      if (charWidth !== 0 && charHeight !== 0) {
        const charCode = String.fromCharCode(charId);
        const frame = texture.add(charCode, 0, charX, charY, charWidth, charHeight);
        if (frame) frame.setUVs(charWidth, charHeight, u0, v0, u1, v1);
      }
    } else if (lineType === "kerning") {
      kerningPairs.push({
        first: parseInt(properties.first, 10),
        second: parseInt(properties.second, 10),
        amount: parseInt(properties.amount, 10)
      });
    }
  }
  for (const kerningPair of kerningPairs) {
    if (fontConfig.chars[kerningPair.second]) {
      fontConfig.chars[kerningPair.second].kerning[kerningPair.first] = kerningPair.amount;
    }
  }
  scene.cache.bitmapFont.add(fontName, { data: fontConfig, texture: fontName, frame: null });
}

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    if (window.gameCache) window.gameCache.init();
    (function (game) {
      if (game.renderer.type === Phaser.WEBGL) {
        try {
          let gl = game.renderer.gl;
          if (gl && gl.isContextLost()) {
            console.warn('WebGL context lost now using blend modes');
            window.S = Phaser.BlendModes.ADD;
            window.E = Phaser.BlendModes.MULTIPLY;
          } else {
            window.S = game.renderer.addBlendMode([gl.SRC_ALPHA, gl.ONE], gl.FUNC_ADD);
            window.E = game.renderer.addBlendMode([gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA], gl.FUNC_ADD);
          }
        } catch (e) {
          window.S = Phaser.BlendModes.ADD;
          window.E = Phaser.BlendModes.MULTIPLY;
        }
      } else {
        console.log('using Canvas renderer setting blend modes');
        window.S = Phaser.BlendModes.ADD;
        window.E = Phaser.BlendModes.MULTIPLY;
      }
      if (game.canvas) {
        game.canvas.addEventListener('webglcontextlost', (e) => {
          console.warn('WebGL context lost');
          e.preventDefault();
          window.S = Phaser.BlendModes.ADD;
          window.E = Phaser.BlendModes.MULTIPLY;
        });
        
        game.canvas.addEventListener('webglcontextrestored', (e) => {
          console.log('WebGL context is back');
          if (game.renderer.type === Phaser.WEBGL && game.renderer.gl) {
            try {
              let gl = game.renderer.gl;
              window.S = game.renderer.addBlendMode([gl.SRC_ALPHA, gl.ONE], gl.FUNC_ADD);
              window.E = game.renderer.addBlendMode([gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA], gl.
