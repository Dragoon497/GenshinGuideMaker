const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'images');
const outputFile = path.join(dir, 'presets.js');
const extensions = ['svg', 'png', 'jpg', 'jpeg', 'webp'];

function label(name) {
  return name
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([a-z])/gi, '$1 $2')
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

const files = fs.readdirSync(dir).filter((file) => {
  return extensions.some((ext) => file.toLowerCase().endsWith(`.${ext}`));
});

const avatars = files.map((file) => ({
  src: `images/${file.replace(/\\/g, '/')}`,
  label: label(file)
}));

const content = `window.PRESET_BACKGROUNDS = [];
window.AVATAR_PRESETS = ${JSON.stringify(avatars, null, 2)};
`;

fs.writeFileSync(outputFile, content, 'utf8');
console.log(`Generated ${outputFile} with ${avatars.length} avatar presets.`);
