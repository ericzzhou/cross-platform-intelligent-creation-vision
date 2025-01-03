const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
const iconDir = path.join(__dirname, '../build/icons');

async function generateIcons() {
  // 确保目录存在
  await fs.mkdir(iconDir, { recursive: true });
  
  // 读取 SVG 源文件
  const svgBuffer = await fs.readFile(path.join(iconDir, 'icon.svg'));
  
  // 生成各种尺寸的 PNG
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconDir, `${size}x${size}.png`));
    
    console.log(`Generated ${size}x${size}.png`);
  }
  
  // 生成 ICO 文件
  const images = await Promise.all(
    [16, 32, 48, 256].map(size =>
      sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );
  
  // 使用 png-to-ico 包生成 ICO 文件
  const toIco = require('png-to-ico');
  const icoBuffer = await toIco(images);
  await fs.writeFile(path.join(__dirname, '../build/icon.ico'), icoBuffer);
  console.log('Generated icon.ico');
}

generateIcons().catch(console.error); 