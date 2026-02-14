/**
 * Generates placeholder PNG/ICO brand assets for Timeback.
 * TODO: replace brand assets - run this script after updating design.
 * Requires: npm install sharp to-ico --save-dev
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandDir = path.join(__dirname, "..", "public", "brand");

// Minimal T icon; optional label for larger images
const svgPlaceholder = (w, h, label = "Timeback") => {
  const cx = w / 2;
  const cy = h / 2;
  const s = Math.min(w, h) / 180;
  const topY = cy - 24 * s;
  const stemX = cx - 6 * s;
  const stemW = 12 * s;
  const stemH = 36 * s;
  const barW = 30 * s;
  const barH = 6 * s;
  const barX = cx - barW / 2;
  const fontSize = Math.round(24 * s);
  const showText = w >= 120 && h >= 80;
  const textEl = showText
    ? `<text x="${cx}" y="${cy + 50 * s}" text-anchor="middle" fill="#ffffff" font-family="system-ui,sans-serif" font-size="${fontSize}" font-weight="600">${label}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#0f172a"/>
  <g fill="#ffffff">
    <rect x="${barX}" y="${topY}" width="${barW}" height="${barH}" rx="1"/>
    <rect x="${stemX}" y="${topY + barH}" width="${stemW}" height="${stemH}" rx="1"/>
  </g>
  ${textEl}
</svg>`;
};

async function main() {
  let sharp, toIco;
  try {
    sharp = (await import("sharp")).default;
    toIco = (await import("to-ico")).default;
  } catch (e) {
    console.error("Install: npm install sharp to-ico --save-dev");
    process.exit(1);
  }

  fs.mkdirSync(brandDir, { recursive: true });

  // 32x32 for favicon
  const faviconSvg = svgPlaceholder(32, 32, "T");
  const faviconPng = await sharp(Buffer.from(faviconSvg)).png().toBuffer();
  const icoBuf = await toIco([faviconPng], { resize: [32] });
  fs.writeFileSync(path.join(brandDir, "favicon.ico"), icoBuf);
  console.log("Generated favicon.ico");

  // 180x180 for apple-touch-icon
  const appleSvg = svgPlaceholder(180, 180);
  const applePng = await sharp(Buffer.from(appleSvg)).png().toBuffer();
  fs.writeFileSync(path.join(brandDir, "apple-touch-icon.png"), applePng);
  console.log("Generated apple-touch-icon.png");

  // 1200x630 for og.png
  const ogSvg = svgPlaceholder(1200, 630);
  const ogPng = await sharp(Buffer.from(ogSvg)).png().toBuffer();
  fs.writeFileSync(path.join(brandDir, "og.png"), ogPng);
  console.log("Generated og.png");

  console.log("Brand assets generated.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
