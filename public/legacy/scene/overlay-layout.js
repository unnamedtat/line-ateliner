// Overlay synchronization, paper textures, and scene layout helpers.
// Initializes the distortion overlay nodes.
function initDistortionOverlay() {
  distortionOverlay = document.getElementById("distortion-overlay");
  distortionImageNode = document.getElementById("distortion-image");
  distortionTurbulenceNode = document.getElementById("distortion-turbulence");
  distortionDisplacementNode = document.getElementById("distortion-displacement");
  syncDistortionOverlay();
}

// Initializes the texture overlay node.
function initTextureOverlay() {
  textureOverlayNode = document.getElementById("paper-texture-overlay");
  syncTextureOverlay();
}

// Syncs the distortion overlay to the current scene.
function syncDistortionOverlay(frameValue = getRenderAnimationFrame()) {
  if (!distortionOverlay || !distortionImageNode) {
    return;
  }

  if (!isDistortionMode() || !sceneLayout || !sourceImageHref) {
    hideDistortionOverlay();
    return;
  }

  distortionOverlay.style.display = "block";
  distortionOverlay.setAttribute("viewBox", `0 0 ${max(1, width)} ${max(1, height)}`);
  distortionImageNode.setAttribute("href", sourceImageHref);
  distortionImageNode.setAttribute("x", sceneLayout.x.toFixed(2));
  distortionImageNode.setAttribute("y", sceneLayout.y.toFixed(2));
  distortionImageNode.setAttribute("width", sceneLayout.width.toFixed(2));
  distortionImageNode.setAttribute("height", sceneLayout.height.toFixed(2));
  updateDistortionFilter(frameValue);
}

// Hides the distortion overlay.
function hideDistortionOverlay() {
  if (distortionOverlay) {
    distortionOverlay.style.display = "none";
  }
}

// Draws the distortion figure overlay.
function drawDistortionFigure(frameValue = getRenderAnimationFrame()) {
  syncDistortionOverlay(frameValue);
}

// Updates the SVG distortion filter parameters.
function updateDistortionFilter(frameValue) {
  if (!distortionTurbulenceNode || !distortionDisplacementNode) {
    return;
  }

  const speed = settings.distortionSpeed / 100;
  const wobble = frameValue * (0.006 + speed * 0.03);
  const distortionFrequency = getHundredthsSetting("distortionFrequency");
  const baseFrequencyX = max(0.001, distortionFrequency * (1 + sin(wobble) * 0.08));
  const baseFrequencyY = max(0.001, distortionFrequency * (1 + cos(wobble * 1.17 + 0.8) * 0.08));
  distortionTurbulenceNode.setAttribute(
    "baseFrequency",
    `${baseFrequencyX.toFixed(4)} ${baseFrequencyY.toFixed(4)}`
  );
  distortionTurbulenceNode.setAttribute("numOctaves", String(round(settings.distortionOctaves)));
  distortionDisplacementNode.setAttribute("scale", getTenthsSetting("distortionScale").toFixed(2));
}

// Builds the paper texture layer.
function buildPaperLayer() {
  paperLayer = createGraphics(width, height);
  paperLayer.clear();
  paperLayer.pixelDensity(1);
  const colors = getTextureColors();
  const strength = constrain(settings.paperTextureStrength / 100, 0, 1);
  const scale = lerp(0.008, 0.045, settings.paperTextureScale / 100);

  if (settings.paperTexture === "none" || strength <= 0) {
    syncTextureOverlay();
    return;
  }

  if (settings.paperTexture === "grain") {
    drawGrainTexture(colors, strength, scale);
  } else if (settings.paperTexture === "speckle") {
    drawSpeckleTexture(colors, strength);
  } else if (settings.paperTexture === "cloud") {
    drawCloudTexture(colors, strength, scale);
  } else if (settings.paperTexture === "crosshatch") {
    drawCrosshatchTexture(colors, strength, scale);
  } else if (settings.paperTexture === "upload") {
    drawUploadedTexture(colors, strength);
  }

  syncTextureOverlay();
}

// Draws the grain paper texture.
function drawGrainTexture(colors, strength, scale) {
  paperLayer.loadPixels();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const n = noise(x * scale, y * scale, 10);
      const local = noise(x * scale * 3.4 + 40, y * scale * 3.4 + 70, 20);
      const shade = (n - 0.5) * 2 * 22 * strength + (local - 0.5) * 2 * 10 * strength;
      const t = constrain(0.5 + shade / 90, 0, 1);
      const rgb = lerpRgb(colors.base, colors.accent, t);
      const alpha = constrain(abs(shade) * 3.4 + 8 * strength, 0, 42);
      blendPixelIntoLayer(x, y, rgb, alpha);
    }
  }

  paperLayer.updatePixels();
}

// Draws the speckle paper texture.
function drawSpeckleTexture(colors, strength) {
  paperLayer.noStroke();
  const count = floor(width * height * lerp(0.0018, 0.0068, strength));

  for (let i = 0; i < count; i += 1) {
    const t = constrain(noise(i * 0.17, 90) * 1.12 - 0.06, 0, 1);
    const rgb = lerpRgb(colors.base, colors.accent, t);
    paperLayer.fill(rgb[0], rgb[1], rgb[2], random(20, 74) * strength);
    paperLayer.circle(random(width), random(height), random(0.6, 2.4));
  }

  const dustCount = floor(width * height * lerp(0.00018, 0.00075, strength));
  for (let i = 0; i < dustCount; i += 1) {
    const t = constrain(noise(i * 0.11 + 50, 120) * 1.15 - 0.08, 0, 1);
    const rgb = lerpRgb(colors.accent, colors.base, t);
    paperLayer.fill(rgb[0], rgb[1], rgb[2], random(18, 44) * strength);
    paperLayer.circle(random(width), random(height), random(1.8, 4.8));
  }
}

// Draws the cloud paper texture.
function drawCloudTexture(colors, strength, scale) {
  paperLayer.loadPixels();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const broad = noise(x * scale * 0.45 + 120, y * scale * 0.45 + 30, 40);
      const detail = noise(x * scale * 1.9 + 10, y * scale * 1.9 + 160, 50);
      const mixAmount = constrain(broad * 0.72 + detail * 0.28, 0, 1);
      const rgb = lerpRgb(colors.base, colors.accent, mixAmount);
      const alpha = lerp(0, 54, constrain((mixAmount - 0.28) * 1.3, 0, 1)) * strength;
      blendPixelIntoLayer(x, y, rgb, alpha);
    }
  }

  paperLayer.updatePixels();
}

// Draws the crosshatch paper texture.
function drawCrosshatchTexture(colors, strength, scale) {
  paperLayer.strokeCap(ROUND);
  paperLayer.strokeWeight(0.4 + strength * 0.75);

  const diagCount = floor(lerp(220, 680, strength));
  for (let i = 0; i < diagCount; i += 1) {
    const t = constrain(noise(i * 0.07, 220) * 1.15 - 0.08, 0, 1);
    const rgb = lerpRgb(colors.base, colors.accent, t);
    paperLayer.stroke(rgb[0], rgb[1], rgb[2], lerp(14, 42, strength));
    const x = random(-width * 0.15, width);
    const y = random(0, height);
    const dx = random(18, 56) * (0.72 + scale * 18);
    const dy = random(10, 28) * (0.72 + scale * 18);
    paperLayer.line(x, y, x + dx, y + dy);
  }

  for (let i = 0; i < floor(diagCount * 0.84); i += 1) {
    const t = constrain(noise(i * 0.09, 260) * 1.1 - 0.05, 0, 1);
    const rgb = lerpRgb(colors.accent, colors.base, t);
    paperLayer.stroke(rgb[0], rgb[1], rgb[2], lerp(10, 32, strength));
    const x = random(0, width * 1.1);
    const y = random(-height * 0.1, height);
    const dx = random(12, 34) * (0.72 + scale * 18);
    const dy = random(-28, -10) * (0.72 + scale * 18);
    paperLayer.line(x, y, x + dx, y + dy);
  }

  paperLayer.noStroke();
  const knotCount = floor(width * height * lerp(0.00022, 0.00095, strength));
  for (let i = 0; i < knotCount; i += 1) {
    const t = noise(i * 0.13 + 90, 310);
    const rgb = lerpRgb(colors.base, colors.accent, t);
    paperLayer.fill(rgb[0], rgb[1], rgb[2], random(10, 28) * strength);
    paperLayer.ellipse(random(width), random(height), random(0.8, 1.8), random(0.4, 1.1));
  }
}

// Draws the uploaded paper texture.
function drawUploadedTexture(colors, strength) {
  if (!uploadedTextureImage) {
    return;
  }

  const textureLayer = createGraphics(width, height);
  textureLayer.pixelDensity(1);
  textureLayer.clear();
  textureLayer.imageMode(CORNER);
  textureLayer.image(uploadedTextureImage, 0, 0, width, height);
  textureLayer.loadPixels();
  paperLayer.loadPixels();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const r = textureLayer.pixels[idx];
      const g = textureLayer.pixels[idx + 1];
      const b = textureLayer.pixels[idx + 2];
      const a = textureLayer.pixels[idx + 3] / 255;
      const brightnessValue = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const mapped = lerpRgb(colors.base, colors.accent, brightnessValue);
      const alpha = a * lerp(28, 132, strength);
      blendPixelIntoLayer(x, y, mapped, alpha);
    }
  }

  paperLayer.updatePixels();
}

// Blends a pixel into the paper layer.
function blendPixelIntoLayer(x, y, rgb, alpha) {
  const idx = (y * width + x) * 4;
  paperLayer.pixels[idx] = rgb[0];
  paperLayer.pixels[idx + 1] = rgb[1];
  paperLayer.pixels[idx + 2] = rgb[2];
  paperLayer.pixels[idx + 3] = constrain(alpha, 0, 255);
}

// Syncs the texture overlay element.
function syncTextureOverlay() {
  if (!textureOverlayNode) {
    return;
  }

  const textureEnabled =
    settings.paperTexture !== "none" &&
    settings.paperTextureStrength > 0 &&
    settings.paperTextureOpacity > 0 &&
    paperLayer?.canvas;

  if (!textureEnabled) {
    textureOverlayNode.style.display = "none";
    textureOverlayNode.removeAttribute("src");
    return;
  }

  textureOverlayNode.src = paperLayer.canvas.toDataURL("image/png");
  textureOverlayNode.style.display = "block";
  textureOverlayNode.style.opacity = (constrain(settings.paperTextureOpacity, 0, 100) / 100).toFixed(2);
}

// Builds the current scene layout.
function buildSceneLayout() {
  if (!sourceImage || !sourceImage.width || !sourceImage.height) {
    sceneLayout = null;
    return;
  }

  const margin = min(width, height) * 0.07;
  const imageAspect = sourceImage.width / sourceImage.height;
  let drawWidth = width - margin * 2;
  let drawHeight = drawWidth / imageAspect;

  if (drawHeight > height - margin * 2) {
    drawHeight = height - margin * 2;
    drawWidth = drawHeight * imageAspect;
  }

  const scaleFactor = max(0.05, settings.sceneScale / 100);
  drawWidth *= scaleFactor;
  drawHeight *= scaleFactor;
  const offsetX = (settings.sceneOffsetX / 100) * width;
  const offsetY = (settings.sceneOffsetY / 100) * height;

  sceneLayout = {
    x: (width - drawWidth) * 0.5 + offsetX,
    y: (height - drawHeight) * 0.5 + offsetY,
    width: drawWidth,
    height: drawHeight
  };
}
