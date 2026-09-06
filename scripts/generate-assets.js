/**
 * Generates the app's PNG assets (icon, splash icon, adaptive icons, favicon)
 * from a shared vector description, so the visual identity stays consistent.
 *
 * Run with: node scripts/generate-assets.js
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'images');

const PAPER = [251, 246, 236, 255];
const INK = [62, 51, 35, 255];
const GLASS_STROKE = [92, 78, 58, 255];

/** Rounded-rect signed distance helper (returns coverage 0..1 with AA via supersampling). */
function makeCanvas(size) {
  return { size, data: new Float32Array(size * size * 4) };
}

function toPng(canvas) {
  const { size, data } = canvas;
  const png = new PNG({ width: size, height: size });
  for (let i = 0; i < size * size; i += 1) {
    png.data[i * 4 + 0] = Math.round(Math.max(0, Math.min(255, data[i * 4 + 0])));
    png.data[i * 4 + 1] = Math.round(Math.max(0, Math.min(255, data[i * 4 + 1])));
    png.data[i * 4 + 2] = Math.round(Math.max(0, Math.min(255, data[i * 4 + 2])));
    png.data[i * 4 + 3] = Math.round(Math.max(0, Math.min(255, data[i * 4 + 3])));
  }
  return png;
}

function blend(canvas, x, y, rgba, coverage) {
  if (coverage <= 0) return;
  const { size, data } = canvas;
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  const a = (rgba[3] / 255) * coverage;
  const dstA = data[i + 3] / 255;
  const outA = a + dstA * (1 - a);
  if (outA <= 0) {
    data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
    return;
  }
  for (let c = 0; c < 3; c += 1) {
    data[i + c] = (rgba[c] * a + data[i + c] * dstA * (1 - a)) / outA;
  }
  data[i + 3] = outA * 255;
}

/** Fill every pixel where `sdf(x, y) <= 0`, anti-aliased by 4x4 supersampling. */
function fillShape(canvas, sdf, colorAt) {
  const { size } = canvas;
  const SS = 4;
  const step = 1 / SS;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      let rAcc = 0;
      let gAcc = 0;
      let bAcc = 0;
      let aAcc = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const px = x + (sx + 0.5) * step;
          const py = y + (sy + 0.5) * step;
          if (sdf(px, py) <= 0) {
            const col = colorAt(px, py);
            if (col) {
              hits += 1;
              rAcc += col[0];
              gAcc += col[1];
              bAcc += col[2];
              aAcc += col[3];
            }
          }
        }
      }
      if (hits > 0) {
        const n = hits;
        blend(canvas, x, y, [rAcc / n, gAcc / n, bAcc / n, aAcc / n], hits / (SS * SS));
      }
    }
  }
}

function roundedRectSdf(cx, cy, halfW, halfH, radius) {
  return (x, y) => {
    const qx = Math.abs(x - cx) - (halfW - radius);
    const qy = Math.abs(y - cy) - (halfH - radius);
    const ax = Math.max(qx, 0);
    const ay = Math.max(qy, 0);
    return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - radius;
  };
}

function circleSdf(cx, cy, r) {
  return (x, y) => Math.hypot(x - cx, y - cy) - r;
}

const solid = (rgba) => () => rgba;

function verticalGradient(y0, y1, top, bottom) {
  return (_x, y) => {
    const t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
    return [
      top[0] + (bottom[0] - top[0]) * t,
      top[1] + (bottom[1] - top[1]) * t,
      top[2] + (bottom[2] - top[2]) * t,
      top[3] + (bottom[3] - top[3]) * t,
    ];
  };
}

/**
 * Draws the shared logo mark: a cartoon glass tube holding three liquid bands.
 * Coordinates are expressed in a 1024x1024 design space and scaled to `size`.
 */
/**
 * Signed distance for the tube silhouette: nearly square shoulders at the top
 * and a generously rounded bottom, which reads as a cartoon glass tube.
 */
function tubeSdf(cx, cy, halfW, halfH, topRadius, bottomRadius) {
  const topPart = roundedRectSdf(cx, cy, halfW, halfH, topRadius);
  const bottomPart = roundedRectSdf(cx, cy, halfW, halfH, bottomRadius);
  return (x, y) => (y < cy ? topPart(x, y) : bottomPart(x, y));
}

/**
 * Draws the shared logo mark: a cartoon glass tube holding three liquid bands,
 * with an open top and a falling droplet above it.
 */
function drawLogo(canvas, { withBackground, scale = 1 }) {
  const S = canvas.size / 1024;
  const u = (v) => v * S;
  const center = canvas.size / 2;

  if (withBackground) {
    fillShape(canvas, () => -1, solid(PAPER));
  }

  const cx = center;
  const cy = center + u(40 * scale);
  const halfW = u(150 * scale);
  const halfH = u(320 * scale);
  const stroke = u(26 * scale);
  const topRadius = u(40 * scale);
  const bottomRadius = u(140 * scale);

  const outer = tubeSdf(cx, cy, halfW, halfH, topRadius, bottomRadius);
  const innerHalfW = halfW - stroke;
  const innerHalfH = halfH - stroke;
  const inner = tubeSdf(
    cx,
    cy,
    innerHalfW,
    innerHalfH,
    Math.max(u(6), topRadius - stroke),
    bottomRadius - stroke,
  );
  const mouthY = cy - innerHalfH;

  // Soft drop shadow beneath the tube.
  const shadow = tubeSdf(cx, cy + u(24 * scale), halfW, halfH, topRadius, bottomRadius);
  fillShape(canvas, shadow, (x, y) => {
    const depth = -shadow(x, y);
    const fade = Math.max(0, Math.min(1, depth / u(46)));
    return [40, 30, 18, 30 * (1 - fade * 0.35)];
  });

  // Glass body fill (very light, so the liquids read clearly).
  fillShape(canvas, inner, solid([255, 253, 247, 238]));

  // Liquid bands filling the lower ~70% of the tube interior.
  const bands = [
    { top: [255, 178, 96, 255], bottom: [243, 133, 46, 255] },
    { top: [124, 206, 240, 255], bottom: [70, 168, 214, 255] },
    { top: [126, 214, 140, 255], bottom: [80, 178, 100, 255] },
  ];
  const liquidBottomY = cy + innerHalfH;
  const liquidTopY = liquidBottomY - innerHalfH * 2 * 0.7;
  const bandH = (liquidBottomY - liquidTopY) / bands.length;

  bands.forEach((band, index) => {
    const y0 = liquidTopY + bandH * index;
    const y1 = y0 + bandH;
    fillShape(
      canvas,
      (x, y) => Math.max(inner(x, y), y0 - y, y - y1),
      verticalGradient(y0, y1, band.top, band.bottom),
    );
  });

  // Rounded meniscus crowning the topmost liquid surface.
  const meniscusH = u(30 * scale);
  fillShape(
    canvas,
    (x, y) => {
      const ellipse =
        ((x - cx) / (innerHalfW * 0.99)) ** 2 + ((y - liquidTopY) / meniscusH) ** 2 - 1;
      return Math.max(ellipse, y - liquidTopY, inner(x, y));
    },
    solid([255, 197, 133, 255]),
  );

  // Inner glass highlight running down the left side.
  const highlight = roundedRectSdf(
    cx - innerHalfW * 0.55,
    cy - u(30 * scale),
    u(20 * scale),
    innerHalfH * 0.55,
    u(20 * scale),
  );
  fillShape(canvas, (x, y) => Math.max(inner(x, y), highlight(x, y)), solid([255, 255, 255, 155]));

  // Glass outline, stopping at the mouth so the tube looks open at the top.
  fillShape(
    canvas,
    (x, y) => Math.max(outer(x, y), -inner(x, y), mouthY - y),
    solid(GLASS_STROKE),
  );

  // Thin elliptical rim suggesting the opening.
  const rimRy = u(20 * scale);
  const rimT = u(11 * scale);
  fillShape(
    canvas,
    (x, y) => {
      const outerEll = ((x - cx) / halfW) ** 2 + ((y - mouthY) / rimRy) ** 2 - 1;
      const innerEll =
        ((x - cx) / (halfW - rimT)) ** 2 + ((y - mouthY) / Math.max(1, rimRy - rimT * 0.7)) ** 2 - 1;
      return Math.max(outerEll, -innerEll);
    },
    solid(GLASS_STROKE),
  );

  // Falling droplet above the tube.
  const dropR = u(34 * scale);
  const dropCy = mouthY - u(96 * scale);
  const tipY = dropCy - dropR * 2.1;
  fillShape(
    canvas,
    (x, y) => {
      const ball = circleSdf(cx, dropCy, dropR)(x, y);
      const t = Math.max(0, Math.min(1, (y - tipY) / (dropCy - tipY)));
      const halfWidth = dropR * t * t;
      const cone = Math.max(Math.abs(x - cx) - halfWidth, tipY - y, y - dropCy);
      return Math.min(ball, cone);
    },
    verticalGradient(tipY, dropCy + dropR, [255, 194, 128, 255], [239, 126, 58, 255]),
  );
}

function write(name, png) {
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, PNG.sync.write(png));
  console.log('wrote', path.relative(process.cwd(), file));
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // App icon: 1024x1024 with paper background.
  const icon = makeCanvas(1024);
  drawLogo(icon, { withBackground: true, scale: 1 });
  write('icon.png', toPng(icon));

  // Splash icon: transparent background, drawn slightly smaller.
  const splash = makeCanvas(512);
  drawLogo(splash, { withBackground: false, scale: 0.92 });
  write('splash-icon.png', toPng(splash));

  // Android adaptive foreground: safe zone is the middle 66%, so shrink the mark.
  const adaptive = makeCanvas(1024);
  drawLogo(adaptive, { withBackground: false, scale: 0.62 });
  write('adaptive-icon-foreground.png', toPng(adaptive));

  // Monochrome variant for themed Android icons.
  const mono = makeCanvas(1024);
  drawLogo(mono, { withBackground: false, scale: 0.62 });
  const monoPng = toPng(mono);
  for (let i = 0; i < monoPng.data.length; i += 4) {
    if (monoPng.data[i + 3] > 0) {
      monoPng.data[i] = INK[0];
      monoPng.data[i + 1] = INK[1];
      monoPng.data[i + 2] = INK[2];
    }
  }
  write('adaptive-icon-monochrome.png', monoPng);

  // Favicon for the web build.
  const favicon = makeCanvas(96);
  drawLogo(favicon, { withBackground: true, scale: 0.95 });
  write('favicon.png', toPng(favicon));
}

main();
