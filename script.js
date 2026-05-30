let noteTextValue = '';
const textColor = document.getElementById('textColor');
const downloadButton = document.getElementById('downloadButton');
const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');
const backgroundPresetsContainer = document.getElementById('backgroundPresets');
const backgroundFileInput = document.getElementById('backgroundFile');
const avatarPresetsContainer = document.getElementById('avatarPresets');
const avatarSearchInput = document.getElementById('avatarSearch');
const avatarPickerHint = document.getElementById('avatarPickerHint');

const presetBackgrounds = [];
const avatarPresets = [];
let avatarSearchQuery = '';
let selectedBackgroundIndex = null;
const PRESET_MAX_COUNT = 40;
const PRESET_EXTENSIONS = ['svg', 'png', 'jpg', 'jpeg', 'webp'];

function loadPresetsFromGlobal() {
  if (Array.isArray(window.PRESET_BACKGROUNDS)) {
    presetBackgrounds.length = 0;
    presetBackgrounds.push(...window.PRESET_BACKGROUNDS);
  }
  if (Array.isArray(window.AVATAR_PRESETS)) {
    avatarPresets.length = 0;
    avatarPresets.push(...window.AVATAR_PRESETS);
  }
}

async function loadPresetsFromJson() {
  try {
    const response = await fetch('images/presets.json');
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data.backgrounds)) {
      presetBackgrounds.length = 0;
      presetBackgrounds.push(...data.backgrounds);
    }
    if (Array.isArray(data.avatars)) {
      avatarPresets.length = 0;
      avatarPresets.push(...data.avatars);
    }
  } catch (error) {
    // Manifest not available or failed to load.
  }
}

async function loadPresets() {
  loadPresetsFromGlobal();
  if (presetBackgrounds.length || avatarPresets.length) return;
  await loadPresetsFromJson();
}

const avatarSlots = [
  { x: 173, y: 187, r: 40 },
  { x: 307, y: 187, r: 40 },
  { x: 440, y: 187, r: 40 },
  { x: 573, y: 187, r: 40 },
  { x: 173, y: 320, r: 40 },
  { x: 307, y: 320, r: 40 },
  { x: 440, y: 320, r: 40 },
  { x: 573, y: 320, r: 40 },
  { x: 173, y: 453, r: 40 },
  { x: 307, y: 453, r: 40 },
  { x: 440, y: 453, r: 40 },
  { x: 573, y: 453, r: 40 },
  { x: 173, y: 587, r: 40 },
  { x: 307, y: 587, r: 40 },
  { x: 440, y: 587, r: 40 },
  { x: 573, y: 587, r: 40 },
  { x: 880, y: 187, r: 40 },
  { x: 987, y: 187, r: 40 },
  { x: 1093, y: 187, r: 40 },
  { x: 1200, y: 187, r: 40 }
];

const avatarImages = Array(avatarSlots.length).fill(null);
let backgroundImage = null;
let activeAvatarIndex = null;
let hoveredAvatarIndex = null;
let labelEditZones = [];
const labelPlaceholders = {
  mainTitle: 'ABYSS 6.1 (LUNA II)',
  sectionTitle: 'FLOOR 12 HALF 1',
  rowLabel1: 'Label below row 1',
  rowLabel2: 'Label below row 2',
  rowLabel3: 'Label below row 3',
  rowLabel4: 'Label below row 4',
  rowLabelF2P: 'Label below F2P row',
  labelNajlepsze: 'NAJLEPSZE',
  labelF2P: 'F2P',
  noteText: 'Click the note card to edit this text'
};
const textValues = {
  mainTitle: '',
  sectionTitle: '',
  rowLabel1: '',
  rowLabel2: '',
  rowLabel3: '',
  rowLabel4: '',
  rowLabelF2P: '',
  labelNajlepsze: '',
  labelF2P: ''
};

function openLabelEditor(labelKey) {
  if (labelKey === 'noteText') {
    const current = noteTextValue.trim() || labelPlaceholders.noteText;
    const next = prompt('Edit note text:', current);
    if (next !== null) {
      noteTextValue = next.trim();
      renderCanvas();
    }
    return;
  }

  const current = textValues[labelKey] || labelPlaceholders[labelKey];
  const next = prompt('Edit text:', current);
  if (next !== null) {
    textValues[labelKey] = next.trim();
    renderCanvas();
  }
}

function getCanvasPointer(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function findLabelAt(x, y) {
  return labelEditZones.find((zone) => {
    return x >= zone.x && x <= zone.x + zone.width && y >= zone.y - zone.height / 2 && y <= zone.y + zone.height / 2;
  });
}

function setLabelZone(labelKey, x, y, width, height) {
  labelEditZones = labelEditZones.filter((zone) => zone.key !== labelKey);
  labelEditZones.push({ key: labelKey, x, y, width, height });
}

function getLabelText(labelKey) {
  return textValues[labelKey] || labelPlaceholders[labelKey];
}

function hexToRgba(hex, alpha = 1) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawLabel(labelKey, x, y, align = 'center', baseline = 'middle', fixedText = '', editable = true) {
  const text = fixedText || getLabelText(labelKey);
  const isPlaceholder = !textValues[labelKey] && labelKey !== 'noteText';
  ctx.fillStyle = isPlaceholder ? hexToRgba(textColor.value, 0.85) : textColor.value;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 4;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);

  const metrics = ctx.measureText(text);
  const width = metrics.width + 20;
  const height = parseInt(ctx.font.match(/(\d+)px/)?.[1] || 16, 10) + 10;
  const boxX = align === 'center' ? x - width / 2 : x;
  if (editable) {
    setLabelZone(labelKey, boxX, y, width, height);
  }
}

function openAvatarPicker(index) {
  activeAvatarIndex = index;
  updateAvatarPickerHint(`Slot ${index + 1} selected. Choose a website avatar below.`);
  renderCanvas();
}

function getFilteredAvatarPresets() {
  const query = avatarSearchQuery.trim().toLowerCase();
  const filtered = avatarPresets.map((preset, index) => ({ preset, index }));
  if (!query) return filtered;
  return filtered.filter(({ preset }) => preset.label.toLowerCase().includes(query));
}

function renderAvatarPresets() {
  if (!avatarPresetsContainer) return;
  avatarPresetsContainer.innerHTML = '';
  const filtered = getFilteredAvatarPresets();

  if (filtered.length === 0) {
    const message = document.createElement('div');
    message.className = 'preset-empty';
    message.textContent = 'No avatars match your search.';
    avatarPresetsContainer.appendChild(message);
    return;
  }

  filtered.forEach(({ preset, index }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-item';
    button.title = preset.label;
    button.innerHTML = `
      <img src="${preset.src}" alt="${preset.label}">
      <span>${preset.label}</span>
    `;
    button.addEventListener('click', () => selectAvatarPreset(index));
    avatarPresetsContainer.appendChild(button);
  });
}

function selectAvatarPreset(index) {
  const preset = avatarPresets[index];
  if (!preset) return;
  if (activeAvatarIndex === null) {
    updateAvatarPickerHint('Click a slot on the canvas first, then choose a stored avatar.');
    return;
  }
  const img = new Image();
  img.onload = () => {
    avatarImages[activeAvatarIndex] = img;
    updateAvatarPickerHint(`Avatar placed in slot ${activeAvatarIndex + 1}. Click another slot to change it.`);
    activeAvatarIndex = null;
    renderCanvas();
  };
  img.src = preset.src;
}

function loadImageIfExists(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function friendlyLabelFromFile(path) {
  const name = path.split('/').pop().replace(/\.[^/.]+$/, '');
  return name
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([a-z])/gi, '$1 $2')
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

async function buildPresets(folder, prefix, count) {
  const presets = [];
  for (let i = 1; i <= count; i += 1) {
    for (const ext of PRESET_EXTENSIONS) {
      const src = `${folder}/${prefix}${i}.${ext}`;
      const exists = await loadImageIfExists(src);
      if (exists) {
        presets.push({ src: exists, label: friendlyLabelFromFile(exists) });
        break;
      }
    }
  }
  return presets;
}

async function initPresets() {
  if (presetBackgrounds.length === 0) {
    const backgrounds = await buildPresets('images', 'bg', PRESET_MAX_COUNT);
    presetBackgrounds.push(...backgrounds);
  }
  if (avatarPresets.length === 0) {
    const avatars = await buildPresets('images', 'avatar', PRESET_MAX_COUNT);
    avatarPresets.push(...avatars);
  }

  if (presetBackgrounds.length > 0 && selectedBackgroundIndex === null) {
    selectBackground(0);
  }
}

function updateAvatarPickerHint(text) {
  if (!avatarPickerHint) return;
  avatarPickerHint.textContent = text;
}

function createBackgroundPresets() {
  if (!backgroundPresetsContainer) return;
  presetBackgrounds.forEach((preset, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-item';
    button.title = preset.label;
    button.innerHTML = `
      <img src="${preset.src}" alt="${preset.label}">
      <span>${preset.label}</span>
    `;
    button.addEventListener('click', () => selectBackground(index));
    backgroundPresetsContainer.appendChild(button);
  });
}

function setSelectedPresetClass() {
  if (!backgroundPresetsContainer) return;
  const items = backgroundPresetsContainer.querySelectorAll('.preset-item');
  items.forEach((item, index) => {
    item.classList.toggle('selected', index === selectedBackgroundIndex);
  });
}

function selectBackground(index) {
  const preset = presetBackgrounds[index];
  if (!preset) return;
  selectedBackgroundIndex = index;
  const img = new Image();
  img.onload = () => {
    backgroundImage = img;
    setSelectedPresetClass();
    renderCanvas();
  };
  img.src = preset.src;
}

function loadBackgroundFile(file) {
  if (!(file instanceof File)) return;
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    backgroundImage = img;
    selectedBackgroundIndex = null;
    setSelectedPresetClass();
    updateAvatarPickerHint(`Loaded background from ${file.name}`);
    renderCanvas();
    URL.revokeObjectURL(objectUrl);
  };
  img.onerror = () => {
    updateAvatarPickerHint('That file could not be loaded as a background image.');
    URL.revokeObjectURL(objectUrl);
  };
  img.src = objectUrl;
}

function getCanvasPointer(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function findAvatarIndexAt(x, y) {
  return avatarSlots.findIndex((slot) => {
    const dx = x - slot.x;
    const dy = y - slot.y;
    return Math.sqrt(dx * dx + dy * dy) <= slot.r;
  });
}

canvas.addEventListener('click', (event) => {
  const pointer = getCanvasPointer(event);
  const avatarIndex = findAvatarIndexAt(pointer.x, pointer.y);
  if (avatarIndex !== -1) {
    openAvatarPicker(avatarIndex);
    return;
  }

  const labelZone = findLabelAt(pointer.x, pointer.y);
  if (labelZone) {
    openLabelEditor(labelZone.key);
    return;
  }
});

canvas.addEventListener('mousemove', (event) => {
  const pointer = getCanvasPointer(event);
  const avatarIndex = findAvatarIndexAt(pointer.x, pointer.y);
  const labelZone = findLabelAt(pointer.x, pointer.y);
  canvas.style.cursor = avatarIndex !== -1 || labelZone ? 'pointer' : 'default';
  const newHovered = avatarIndex !== -1 ? avatarIndex : null;
  if (newHovered !== hoveredAvatarIndex) {
    hoveredAvatarIndex = newHovered;
    renderCanvas();
  }
});

canvas.addEventListener('mouseleave', () => {
  if (hoveredAvatarIndex !== null) {
    hoveredAvatarIndex = null;
    renderCanvas();
  }
});

function resetCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawBackground() {
  if (!backgroundImage) return;

  const canvasRatio = canvas.width / canvas.height;
  const imageRatio = backgroundImage.width / backgroundImage.height;
  let drawWidth = canvas.width;
  let drawHeight = canvas.height;
  let offsetX = 0;
  let offsetY = 0;

  if (imageRatio > canvasRatio) {
    drawHeight = canvas.height;
    drawWidth = backgroundImage.width * (canvas.height / backgroundImage.height);
    offsetX = (canvas.width - drawWidth) / 2;
  } else {
    drawWidth = canvas.width;
    drawHeight = backgroundImage.height * (canvas.width / backgroundImage.width);
    offsetY = (canvas.height - drawHeight) / 2;
  }

  ctx.drawImage(backgroundImage, offsetX, offsetY, drawWidth, drawHeight);
}

function drawAvatar(img, x, y, radius, index) {
  // hover glow behind avatar
  if (hoveredAvatarIndex === index) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius + 12, 0, Math.PI * 2);
    ctx.closePath();
    ctx.shadowColor = hexToRgba(textColor.value, 0.5);
    ctx.shadowBlur = 28;
    ctx.fillStyle = hexToRgba(textColor.value, 0.06);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (img) {
    const aspect = img.width / img.height;
    const targetSize = radius * 2;
    let srcX = 0;
    let srcY = 0;
    let srcWidth = img.width;
    let srcHeight = img.height;

    if (aspect > 1) {
      // landscape: crop left/right to square
      srcWidth = img.height;
      srcX = (img.width - img.height) / 2;
    } else {
      // portrait or square: crop top/bottom to square
      srcHeight = img.width;
      srcY = (img.height - img.width) / 2;
    }

    ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, x - radius, y - radius, targetSize, targetSize);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function renderCanvas() {
  resetCanvas();
  drawBackground();

  avatarSlots.forEach((slot, index) => {
    drawAvatar(avatarImages[index], slot.x, slot.y, slot.r, index);
  });

  const color = textColor.value;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowColor = 'transparent';

  ctx.font = '800 34px Poppins, sans-serif';
  drawLabel('mainTitle', canvas.width / 2 + 30, 60, 'center', 'middle');

  ctx.font = '300 24px Poppins, sans-serif';
  drawLabel('sectionTitle', canvas.width / 2 + 30, 95, 'center', 'middle');

  ctx.font = '800 30px Poppins, sans-serif';
  drawLabel('labelNajlepsze', 373, 130, 'center', 'middle', 'NAJLEPSZE', false);
  drawLabel('labelF2P', 1040, 130, 'center', 'middle', 'F2P', false);

  ctx.font = '600 20px Poppins, sans-serif';
  drawLabel('rowLabel1', 373, 253, 'center', 'middle');
  drawLabel('rowLabel2', 373, 387, 'center', 'middle');
  drawLabel('rowLabel3', 373, 520, 'center', 'middle');
  drawLabel('rowLabel4', 373, 650, 'center', 'middle');
  drawLabel('rowLabelF2P', 1040, 253, 'center', 'middle');

  drawNoteCard();
}

function drawNoteCard() {
  const boxWidth = 533;
  const boxHeight = 533;
  const boxX = canvas.width / 2 + 120;
  const boxY = 280;

  const rawText = noteTextValue.trim();
  const text = rawText || labelPlaceholders.noteText;
  const isPlaceholder = !rawText;

  ctx.save();
  ctx.fillStyle = 'rgba(10, 16, 38, 0.79)';
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 22, true, true);
  ctx.restore();

  ctx.fillStyle = isPlaceholder ? hexToRgba(textColor.value, 0.85) : textColor.value;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 3;
  ctx.font = '500 20px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const lines = wrapText(text, boxWidth - 40, ctx);
  const lineHeight = 30;
  let lineY = boxY + 18;
  lines.forEach((line) => {
    if (lineY + lineHeight > boxY + boxHeight - 18) return;
    ctx.strokeText(line, boxX + boxWidth / 2, lineY);
    ctx.fillText(line, boxX + boxWidth / 2, lineY);
    lineY += lineHeight;
  });

  setLabelZone('noteText', boxX, boxY + boxHeight / 2, boxWidth, boxHeight);
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
    for (const side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function wrapText(text, maxWidth, context) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i += 1) {
    const word = words[i];
    const width = context.measureText(`${currentLine} ${word}`).width;
    if (width < maxWidth) {
      currentLine += ` ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function downloadImage() {
  const link = document.createElement('a');
  link.download = 'template-composition.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

textColor.addEventListener('input', renderCanvas);
downloadButton.addEventListener('click', () => {
  renderCanvas();
  downloadImage();
});

window.addEventListener('load', async () => {
  resetCanvas();
  await loadPresets();
  await initPresets();
  createBackgroundPresets();
  renderAvatarPresets();
  if (backgroundFileInput) {
    backgroundFileInput.addEventListener('change', (event) => {
      const file = event.target.files ? event.target.files[0] : null;
      if (file) {
        loadBackgroundFile(file);
      }
    });
  }

  if (avatarSearchInput) {
    avatarSearchInput.addEventListener('input', (event) => {
      avatarSearchQuery = event.target.value || '';
      renderAvatarPresets();
    });
  }

  if (presetBackgrounds.length === 0 && avatarPresets.length === 0) {
    updateAvatarPickerHint('No stored presets were found. Add bgN.* or avatarN.* files, or provide images/presets.js with a preset list.');
  } else {
    updateAvatarPickerHint('Click a slot on the canvas first, then pick a stored avatar here.');
  }
  renderCanvas();
});
