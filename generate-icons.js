import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateIcons() {
  const iconsDir = path.join(process.cwd(), 'public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const logoUrl = 'https://raw.githubusercontent.com/Melphyre/Bundeswiega/main/Bundeswiega.png';
  console.log('Downloading logo from:', logoUrl);

  let imageBuffer;
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
    console.log('Downloaded logo successfully, size:', imageBuffer.length);
  } catch (err) {
    console.error('Failed to download logo from GitHub, generating fallback SVG/PNG:', err);
    // Fallback: create brand badge with #238183 and beer mug / "B"
    const svg = `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <rect width="512" height="512" rx="100" fill="#238183"/>
        <text x="256" y="320" font-size="220" font-weight="bold" fill="white" font-family="Arial, sans-serif" text-anchor="middle">B</text>
      </svg>
    `;
    imageBuffer = Buffer.from(svg);
  }

  // Also save the original logo in public/
  fs.writeFileSync(path.join(process.cwd(), 'public', 'Bundeswiega.png'), imageBuffer);

  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

  for (const size of sizes) {
    const outPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(imageBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 0 } })
      .png()
      .toFile(outPath);
    console.log(`Generated: ${outPath}`);
  }

  // Generate mobile screenshot placeholder or preview
  const screenshotPath = path.join(iconsDir, 'screenshot-mobile.png');
  await sharp({
    create: {
      width: 390,
      height: 844,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }
    }
  })
  .composite([
    {
      input: await sharp(imageBuffer).resize(200, 200, { fit: 'contain' }).png().toBuffer(),
      top: 300,
      left: 95
    }
  ])
  .png()
  .toFile(screenshotPath);
  console.log(`Generated: ${screenshotPath}`);

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
