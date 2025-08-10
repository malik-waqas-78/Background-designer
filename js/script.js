// ===================================================================
// 00 – PERLIN NOISE GENERATOR (Embedded for simplicity)
// ===================================================================
class PerlinNoise {
    constructor() {
        // Pre-computed permutation table
        this.p = new Uint8Array(512);
        const permutation = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 178, 208, 198, 202, 176, 145, 24, 18, 17, 211, 209, 114, 249, 129, 195, 78, 210, 123, 55, 54, 235, 216, 162, 40, 111, 192, 236, 170, 186, 166, 108, 175, 155, 250, 232, 22, 138, 183, 184, 85, 193, 222, 168, 16, 169, 205, 196, 44, 25, 188, 124, 1, 20, 73, 156, 245, 174, 107, 253, 83, 50, 65, 113, 84, 147, 72, 138, 5, 248, 154, 165, 152, 159, 104, 179, 9, 14, 58, 2, 115, 182, 143, 246, 86, 171, 116, 98, 220, 153, 60, 61, 150, 118, 161, 223, 163, 59, 243, 92, 224, 228, 109, 122, 81, 52, 67, 105, 97, 226, 106, 101, 34, 3, 4, 185, 173, 80, 218, 63, 68, 89, 19, 43, 158, 112, 28, 204, 141, 180, 244, 127, 70, 64, 251, 110, 239, 189, 187, 144, 134, 227, 146, 207, 254, 181, 12, 77, 66, 164, 172, 241, 126, 238, 206, 121, 217, 42, 125, 71, 27, 76, 255];
        for (let i = 0; i < 256; ++i) this.p[256 + i] = this.p[i] = permutation[i];
    }
    noise(x, y, z) {
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
        x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
        const u = this.fade(x), v = this.fade(y), w = this.fade(z);
        const A = this.p[X] + Y, AA = this.p[A] + Z, AB = this.p[A + 1] + Z, B = this.p[X + 1] + Y, BA = this.p[B] + Z, BB = this.p[B + 1] + Z;
        return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.p[AA], x, y, z), this.grad(this.p[BA], x - 1, y, z)), this.lerp(u, this.grad(this.p[AB], x, y - 1, z), this.grad(this.p[BB], x - 1, y - 1, z))), this.lerp(v, this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1), this.grad(this.p[BA + 1], x - 1, y, z - 1)), this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1), this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))));
    }
    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }
    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
}

// ===================================================================
// 01 – GLOBALS & STATE
// ===================================================================
const canvas = document.getElementById('card-canvas');
const ctx = canvas.getContext('2d');
const loadingBox = document.getElementById('loading-box');

// Offscreen canvas for performance
const offscreen = document.createElement('canvas');
const offCtx = offscreen.getContext('2d');

const perlin = new PerlinNoise();

// UI references
const ui = {
    patternSize: document.getElementById('pattern-size'),
    patternThickness: document.getElementById('pattern-thickness'),
    patternSpacing: document.getElementById('pattern-spacing'),
    rotation: document.getElementById('rotation'),
    zoom: document.getElementById('zoom'),
    patternOpacity: document.getElementById('pattern-opacity'),
    blurRadius: document.getElementById('blur-radius'),
    gradientType: document.getElementById('gradient-type'),
    gradientAngle: document.getElementById('gradient-angle'),
    radialCenterX: document.getElementById('radial-center-x'),
    radialCenterY: document.getElementById('radial-center-y'),
    radialRadius: document.getElementById('radial-radius'),
    patternStyleRadios: document.querySelectorAll('input[name="pattern-style"]'),
    gradientPreview: document.getElementById('gradient-preview'),
    patternPreview: document.getElementById('pattern-preview'),
    addColorBtn: document.getElementById('add-color-btn'),
    addPatternColorBtn: document.getElementById('add-pattern-color-btn'),
    randomizeBtn: document.getElementById('randomize-btn'),
    downloadBtn: document.getElementById('download-btn'),
    addTextBtn: document.getElementById('add-text-btn'),
    imageUpload: document.getElementById('image-upload'),
    elementList: document.getElementById('element-list'),
    elementEditorPanel: document.getElementById('element-editor-panel'),
};

// Application state
const state = {
    colors: ['#0A132D', '#1C374D'],
    patternColors: ['#FFFFFF', '#000000'],
    patterns: new Set(),
    patternSize: 20,
    patternThickness: 2,
    patternSpacing: 5,
    rotation: 0,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    gradientType: 'linear',
    gradientAngle: 45,
    radialCenterX: 50,
    radialCenterY: 50,
    radialRadius: 70,
    patternOpacity: 0.2,
    patternStyle: 'solid',
    elements: [], // All text and image objects
    selectedElementId: null,
    interaction: {
        isDragging: false,
        isResizing: false,
        isPanning: false,
        isRotating: false,
        lastMouse: { x: 0, y: 0 },
        dragOffset: { x: 0, y: 0 },
        resizeHandle: null,
    },
};

// ===================================================================
// 02 – PATTERN LIBRARY
// ===================================================================
const Pattern = {
    checkerboard(ctx, size, thickness, color, spacing) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const extendedWidth = width * 2;
        const extendedHeight = height * 2;
        ctx.save();
        ctx.fillStyle = color;
        const step = size + spacing;
        ctx.globalAlpha = state.patternOpacity;

        for (let y = -extendedHeight; y < extendedHeight; y += step) {
            for (let x = -extendedWidth; x < extendedWidth; x += step) {
                const col = Math.floor((x + extendedWidth) / step);
                const row = Math.floor((y + extendedHeight) / step);

                if ((col + row) % 2 === 0) {
                    ctx.fillRect(x, y, size, size);
                }
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    },
    squares(ctx, size, thickness, color, spacing) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const extendedWidth = width * 2;
        const extendedHeight = height * 2;
        ctx.save();
        ctx.globalAlpha = state.patternOpacity;
        ctx.fillStyle = color;
        const step = size + spacing;

        for (let y = -extendedHeight; y < extendedHeight; y += step * 2) {
            for (let x = -extendedWidth; x < extendedWidth; x += step * 2) {
                ctx.fillRect(x + size / 4, y + size / 4, size / 2, size / 2);
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    },
    fractal(ctx, size, thickness, color, spacing) {
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.globalAlpha = state.patternOpacity;

        const drawBranch = (x, y, size, angle, depth) => {
            if (depth === 0) return;

            const newX = x + Math.cos(angle) * size;
            const newY = y + Math.sin(angle) * size;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(newX, newY);
            ctx.stroke();

            // Recursive branches with variations
            const angleVariation = Math.PI / 6 + Math.random() * Math.PI / 12;
            drawBranch(newX, newY, size * 0.75, angle - angleVariation, depth - 1);
            drawBranch(newX, newY, size * 0.75, angle + angleVariation, depth - 1);
        };

        const gridSize = size * 8 + spacing;
        for (let x = gridSize / 2; x < ctx.canvas.width * 1.5; x += gridSize) {
            for (let y = gridSize / 2; y < ctx.canvas.height * 1.5; y += gridSize) {
                drawBranch(x, y, size * 3, -Math.PI / 2, randomInt(5, 8));
            }
        }
        ctx.globalAlpha = 1;
    },
    noise(ctx, color) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = width;
        noiseCanvas.height = height;
        const noiseCtx = noiseCanvas.getContext('2d');
        const imageData = noiseCtx.createImageData(width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            const totalPixels = (width * height);
            const pos = pixelIndex / totalPixels;  // Value from 0 to 1

            const col = getRgb(color, pos);
            if (Math.random() < 0.1) {
                data[i] = col.r;
                data[i + 1] = col.g;
                data[i + 2] = col.b;
                data[i + 3] = 255;
            } else {
                data[i + 3] = 0;
            }
        }
        noiseCtx.putImageData(imageData, 0, 0);
        const pattern = ctx.createPattern(noiseCanvas, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(-width, -height, width * 3, height * 3);
        ctx.globalAlpha = state.patternOpacity;
    },
    smoke(ctx, colors) {
        const imageData = ctx.createImageData(ctx.canvas.width, ctx.canvas.height);
        const data = imageData.data;
        const scale = 0.008 / state.zoom;
        const time = Date.now() / 10000;
        const c1 = hexToRgb(colors[0] || '#FFFFFF');
        const c2 = hexToRgb(colors[colors.length - 1] || '#000000');
        const lerp = (a, b, t) => a + t * (b - a);

        for (let y = 0; y < ctx.canvas.height; y++) {
            for (let x = 0; x < ctx.canvas.width; x++) {
                const n = (perlin.noise(x * scale + state.offsetX, y * scale + state.offsetY, time) + 1) / 2;
                const i = (y * ctx.canvas.width + x) * 4;
                data[i] = lerp(c1.r, c2.r, n);
                data[i + 1] = lerp(c1.g, c2.g, n);
                data[i + 2] = lerp(c1.b, c2.b, n);
                data[i + 3] = n * 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    },
    grid(ctx, size, thickness, color, spacing) {
        const step = size + spacing;
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        for (let x = 0; x <= ctx.canvas.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ctx.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= ctx.canvas.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(ctx.canvas.width, y);
            ctx.stroke();
        }
    },
    dots(ctx, size, thickness, color, spacing) {
        const step = size + spacing;
        ctx.fillStyle = color;
        for (let x = step / 2; x < ctx.canvas.width; x += step) {
            for (let y = step / 2; y < ctx.canvas.height; y += step) {
                ctx.beginPath();
                ctx.arc(x, y, thickness, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },
    lines(ctx, size, thickness, color, spacing) {
        const step = size + spacing;
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        const ext = Math.max(ctx.canvas.width, ctx.canvas.height);
        for (let i = 0; i < ext * 2; i += step) {
            ctx.beginPath();
            ctx.moveTo(i, -ext);
            ctx.lineTo(i - ext, ext);
            ctx.stroke();
        }
    },
    hexagon(ctx, size, thickness, color, spacing) {
        const hexHeight = Math.sqrt(3) * size;
        const hexWidth = 2 * size;
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;

        for (let row = 0; row < ctx.canvas.height / (hexHeight / 2) + 2; row++) {
            for (let col = 0; col < ctx.canvas.width / (hexWidth * 0.75) + 2; col++) {
                const x = col * hexWidth * 0.75;
                const y = row * hexHeight / 2;
                const offsetX = (row % 2 === 1) ? hexWidth * 0.375 : 0;
                drawHexagon(ctx, x - offsetX, y, size / 2);
            }
        }
        function drawHexagon(context, x, y, r) {
            context.beginPath();
            for (let i = 0; i < 6; i++) {
                context.lineTo(x + r * Math.cos(Math.PI / 3 * i), y + r * Math.sin(Math.PI / 3 * i));
            }
            context.closePath();
            context.stroke();
        }
    },
    triangle(ctx, size, thickness, color, spacing) {
        const h = size * Math.sqrt(3) / 2;
        const stepX = size + spacing;
        const stepY = h + spacing;
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;

        for (let y = 0; y < ctx.canvas.height + h; y += stepY) {
            for (let x = 0; x < ctx.canvas.width + size; x += stepX) {
                const row = Math.floor(y / stepY);
                const col = Math.floor(x / stepX);
                ctx.beginPath();
                if ((row + col) % 2 === 0) { // Upward pointing
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + size, y);
                    ctx.lineTo(x + size / 2, y + h);
                } else { // Downward pointing
                    ctx.moveTo(x, y + h);
                    ctx.lineTo(x + size, y + h);
                    ctx.lineTo(x + size / 2, y);
                }
                ctx.closePath();
                ctx.stroke();
            }
        }
    },
    waves(ctx, size, thickness, color, spacing) {
        const step = size + spacing;
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        for (let y = step / 2; y < ctx.canvas.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x < ctx.canvas.width; x++) {
                ctx.lineTo(x, y + Math.sin(x / size) * (size / 2));
            }
            ctx.stroke();
        }
    },
    rings(ctx, size, thickness, color, spacing) {
        const step = size + spacing;
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        const maxR = Math.sqrt(ctx.canvas.width ** 2 + ctx.canvas.height ** 2);
        for (let r = step; r < maxR; r += step) {
            ctx.beginPath();
            ctx.arc(ctx.canvas.width / 2, ctx.canvas.height / 2, r, 0, Math.PI * 2);
            ctx.stroke();
        }
    },
    stripes(ctx, size, thickness, color, spacing) {
        const step = size + spacing;
        ctx.fillStyle = color;
        for (let i = 0; i < ctx.canvas.width * 2; i += step) {
            ctx.fillRect(i, -ctx.canvas.height, thickness, ctx.canvas.height * 3);
        }
    },
    diamonds(ctx, size, thickness, color, spacing) {
        const step = size + spacing;
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        for (let y = 0; y < ctx.canvas.height + size; y += step) {
            for (let x = 0; x < ctx.canvas.width + size; x += step) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(45 * Math.PI / 180);
                ctx.strokeRect(0, 0, size / 1.414, size / 1.414);
                ctx.restore();
            }
        }
    },
    stars(ctx, size, thickness, color, spacing) {
        const step = size + spacing;
        ctx.fillStyle = color;

        function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
            let rot = Math.PI / 2 * 3;
            let x = cx;
            let y = cy;
            let step = Math.PI / spikes;

            ctx.beginPath();
            ctx.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerRadius;
                y = cy + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;

                x = cx + Math.cos(rot) * innerRadius;
                y = cy + Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
            }
            ctx.lineTo(cx, cy - outerRadius);
            ctx.closePath();
            ctx.fill();
        }

        for (let y = 0; y < ctx.canvas.height + size; y += step) {
            for (let x = 0; x < ctx.canvas.width + size; x += step) {
                drawStar(x, y, 5, size / 2, size / 4);
            }
        }
    }
};

// ===================================================================
// 03 – STATE MANAGEMENT & UI SYNC
// ===================================================================
function updateStateFromUI() {
    showLoading();
    // Update colors from the dynamically generated pickers
    state.colors = Array.from(document.querySelectorAll('#color-pickers input[type="color"]')).map(inp => inp.value);
    state.patternColors = Array.from(document.querySelectorAll('#pattern-color-pickers input[type="color"]')).map(inp => inp.value);

    // Update patterns from the dynamically generated grid
    state.patterns.clear();
    document.querySelectorAll('.pattern-option.selected').forEach(el => {
        state.patterns.add(el.dataset.pattern);
    });

    // Update numeric values from sliders
    state.patternSize = Number(ui.patternSize.value);
    state.patternThickness = Number(ui.patternThickness.value);
    state.patternSpacing = Number(ui.patternSpacing.value);
    state.rotation = Number(ui.rotation.value);
    state.zoom = Number(ui.zoom.value);
    state.patternOpacity = Number(ui.patternOpacity.value) / 100;
    state.blurRadius = Number(ui.blurRadius.value);

    // Update gradient settings
    state.gradientType = ui.gradientType.value;
    state.gradientAngle = Number(ui.gradientAngle.value);
    state.radialCenterX = Number(ui.radialCenterX.value);
    state.radialCenterY = Number(ui.radialCenterY.value);
    state.radialRadius = Number(ui.radialRadius.value);

    // Update pattern style
    state.patternStyle = document.querySelector('input[name="pattern-style"]:checked').value;

    // Update UI labels and previews
    updateUILabels();
    toggleGradientControls();
    drawGradientPreview('gradient-preview', state.colors, state.gradientType, state.gradientAngle, state.radialCenterX, state.radialCenterY);
    const patternPreviewColor = state.patternStyle === 'solid' ? [state.patternColors[0] || '#fff'] : state.patternColors;
    drawGradientPreview('pattern-preview', patternPreviewColor, 'linear', 45, 50, 50);

    // Schedule a redraw of the main canvas
    scheduleRender();
}

function updateUILabels() {
    document.getElementById('gradient-angle-value').textContent = `${state.gradientAngle}°`;
    document.getElementById('radial-center-x-value').textContent = `${state.radialCenterX}%`;
    document.getElementById('radial-center-y-value').textContent = `${state.radialCenterY}%`;
    document.getElementById('radial-radius-value').textContent = `${state.radialRadius}%`;
    document.getElementById('pattern-opacity-value').textContent = `${Math.round(state.patternOpacity * 100)}%`;
    document.getElementById('rotation-value').textContent = `${state.rotation}°`;
    document.getElementById('zoom-value').textContent = `${Math.round(state.zoom * 100)}%`;
    document.getElementById('blur-radius-value').textContent = `${state.blurRadius}px`;
    document.getElementById('pattern-size-value').textContent = `${state.patternSize}`;
    document.getElementById('pattern-thickness-value').textContent = `${state.patternThickness}`;
    document.getElementById('pattern-spacing-value').textContent = `${state.patternSpacing}`;
}

function toggleGradientControls() {
    document.getElementById('linear-controls').classList.toggle('hidden', state.gradientType !== 'linear');
    document.getElementById('radial-controls').classList.toggle('hidden', state.gradientType !== 'radial');
}

// ===================================================================
// 04 – PREVIEW & DYNAMIC UI RENDERING
// ===================================================================
function drawGradientPreview(elementId, colors, type, angle, cx, cy) {
    const previewEl = document.getElementById(elementId);
    if (!previewEl) return;

    const w = previewEl.clientWidth;
    const h = previewEl.clientHeight;
    const pCanvas = document.createElement('canvas');
    pCanvas.width = w;
    pCanvas.height = h;
    const pCtx = pCanvas.getContext('2d');

    const grad = createGradient(pCtx, w, h, colors, type, angle, cx, cy);
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, w, h);
    previewEl.style.backgroundImage = `url(${pCanvas.toDataURL()})`;
}

function populatePatternGrid() {
    const grid = document.getElementById('pattern-selection-grid');
    grid.innerHTML = '';
    const patternIcons = {
        grid: 'fa-th', dots: 'fa-circle', lines: 'fa-slash', hexagon: 'fa-hexagon', triangle: 'fa-play', waves: 'fa-wave-square',
        checkerboard: 'fa-chess-board', squares: 'fa-square', rings: 'fa-circle-notch', fractal: 'fa-tree', smoke: 'fa-smog', noise: 'fa-braille',
        stripes: 'fa-grip-lines', diamonds: 'fa-gem', stars: 'fa-star'
    };

    Object.keys(Pattern).forEach(name => {
        const option = document.createElement('div');
        option.className = 'pattern-option';
        option.dataset.pattern = name;
        option.innerHTML = `<span><i class="fas ${patternIcons[name] || 'fa-question'}"></i> ${name.charAt(0).toUpperCase() + name.slice(1)}</span>`;
        option.addEventListener('click', () => {
            option.classList.toggle('selected');
            updateStateFromUI();
        });
        grid.appendChild(option);
    });
}

function createColorPicker(containerId, color, index, type) {
    const container = document.getElementById(containerId);
    const group = document.createElement('div');
    group.className = 'color-group';

    const input = document.createElement('input');
    input.type = 'color';
    input.value = color;
    input.addEventListener('input', updateStateFromUI);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-color-btn';
    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
    deleteBtn.onclick = () => {
        if (type === 'bg' && state.colors.length > 1) {
            state.colors.splice(index, 1);
        } else if (type === 'pattern' && state.patternColors.length > 1) {
            state.patternColors.splice(index, 1);
        }
        renderColorPickers();
        updateStateFromUI();
    };

    group.appendChild(input);
    group.appendChild(deleteBtn);
    container.appendChild(group);
}

function renderColorPickers() {
    const bgContainer = document.getElementById('color-pickers');
    const patternContainer = document.getElementById('pattern-color-pickers');
    bgContainer.innerHTML = '';
    patternContainer.innerHTML = '';
    state.colors.forEach((c, i) => createColorPicker('color-pickers', c, i, 'bg'));
    state.patternColors.forEach((c, i) => createColorPicker('pattern-color-pickers', c, i, 'pattern'));
}

// ===================================================================
// 05 – MAIN RENDERING PIPELINE
// ===================================================================
let renderRequested = false;

function scheduleRender() {
    if (!renderRequested) {
        renderRequested = true;
        requestAnimationFrame(() => {
            drawCard();
            renderRequested = false;
            hideLoading();
        });
    }
}

function drawCard(targetCtx = ctx, targetCanvas = canvas, isDownload = false) {
    const scale = isDownload ? 2 : 1;
    const w = targetCanvas.width;
    const h = targetCanvas.height;

    // 1. Clear canvases
    targetCtx.clearRect(0, 0, w, h);
    offCtx.clearRect(0, 0, offscreen.width, offscreen.height);

    // 2. Draw background gradient onto offscreen canvas
    const bgGrad = createGradient(offCtx, offscreen.width, offscreen.height, state.colors, state.gradientType, state.gradientAngle, state.radialCenterX, state.radialCenterY);
    offCtx.fillStyle = bgGrad;
    offCtx.fillRect(0, 0, offscreen.width, offscreen.height);

    // 3. Draw patterns onto offscreen canvas
    offCtx.save();
    offCtx.globalAlpha = state.patternOpacity;

    // Apply transforms only for patterns
    offCtx.translate(offscreen.width / 2, offscreen.height / 2);
    offCtx.rotate(state.rotation * Math.PI / 180);
    offCtx.scale(state.zoom, state.zoom);
    offCtx.translate(-offscreen.width / 2 + state.offsetX, -offscreen.height / 2 + state.offsetY);

    const patternColor = getPatternColor(offCtx, offscreen.width, offscreen.height);
    state.patterns.forEach(patternName => {
        const fn = Pattern[patternName];
        if (fn) {
            if (['smoke', 'noise'].includes(patternName)) {
                fn(offCtx, state.patternColors);
            } else {
                fn(offCtx, state.patternSize, state.patternThickness, patternColor, state.patternSpacing);
            }
        }
    });
    offCtx.restore();

    // 4. Draw the offscreen canvas (bg + patterns) to the target context
    if (state.blurRadius > 0) {
        targetCtx.filter = `blur(${state.blurRadius * scale}px)`;
    }
    targetCtx.drawImage(offscreen, 0, 0, w, h);
    targetCtx.filter = 'none';

    // 5. Draw elements (text, images) directly onto the target context
    state.elements.forEach(el => {
        drawElement(targetCtx, el, scale);
    });

    // 6. If not downloading, draw selection handles on the main canvas
    if (!isDownload && state.selectedElementId) {
        const selectedEl = state.elements.find(el => el.id === state.selectedElementId);
        if (selectedEl) {
            drawSelectionHandles(ctx, selectedEl);
        }
    }
}

function createGradient(gCtx, w, h, colors, type, angle, cx, cy) {
    let grad;
    if (type === 'linear') {
        const rad = angle * Math.PI / 180;
        const x1 = w / 2 - Math.cos(rad) * w / 2;
        const y1 = h / 2 - Math.sin(rad) * h / 2;
        const x2 = w / 2 + Math.cos(rad) * w / 2;
        const y2 = h / 2 + Math.sin(rad) * h / 2;
        grad = gCtx.createLinearGradient(x1, y1, x2, y2);
    } else { // radial
        const r = state.radialRadius / 100 * Math.min(w, h);
        grad = gCtx.createRadialGradient(cx / 100 * w, cy / 100 * h, 0, cx / 100 * w, cy / 100 * h, r);
    }
    const numColors = colors.length;
    colors.forEach((c, i) => {
        const stop = numColors === 1 ? 0.5 : i / (numColors - 1);
        grad.addColorStop(stop, c);
    });
    return grad;
}

function getPatternColor(pCtx, w, h) {
    if (state.patternStyle === 'solid') {
        return state.patternColors[0] || '#FFFFFF';
    }
    return createGradient(pCtx, w, h, state.patternColors, 'linear', 45, 50, 50);
}



// ===================================================================
// 06 – ELEMENT MANAGEMENT (Add, Select, Delete, Edit)
// ===================================================================
function addElement(type) {
    const newElement = {
        id: `${type}-${Date.now()}`,
        type: type,
        x: offscreen.width / 2,
        y: offscreen.height / 2,
        w: 0, // Will be set on load/render
        h: 0,
        rotation: 0,
        opacity: 1,
    };

    if (type === 'text') {
        newElement.content = 'Hello World';
        newElement.font = 'Inter';
        newElement.size = 50;
        newElement.color = '#FFFFFF';
        newElement.style = 'normal';
        newElement.align = 'center';
    } else if (type === 'image') {
        newElement.img = null; // Will be set on upload
        newElement.scale = 1;
    }

    state.elements.push(newElement);
    return newElement;
}

function deleteSelectedElement() {
    if (!state.selectedElementId) return;
    state.elements = state.elements.filter(el => el.id !== state.selectedElementId);
    state.selectedElementId = null;
    renderElementList();
    renderElementEditor();
    scheduleRender();
}

function selectElement(elementId) {
    state.selectedElementId = elementId;
    renderElementList();
    renderElementEditor();
    scheduleRender();
}

function updateSelectedElement(prop, value) {
    if (!state.selectedElementId) return;
    const element = state.elements.find(el => el.id === state.selectedElementId);
    if (element) {
        element[prop] = value;
        scheduleRender();
        // Also re-render editor to update any dependent values (like slider labels)
        renderElementEditor();
    }
}

// ===================================================================
// 07 – ELEMENT RENDERING & UI
// ===================================================================
function renderElementList() {
    ui.elementList.innerHTML = '';
    if (state.elements.length === 0) {
        ui.elementList.innerHTML = '<p style="text-align: center; color: var(--gray);">No elements added yet.</p>';
        return;
    }

    // Render in reverse so top layer is at the top of the list
    [...state.elements].reverse().forEach(el => {
        const item = document.createElement('div');
        item.className = 'element-item';
        item.classList.toggle('selected', el.id === state.selectedElementId);
        item.onclick = () => selectElement(el.id);

        const icon = el.type === 'text' ? 'fa-font' : 'fa-image';
        const content = el.type === 'text' ? el.content : 'Image';

        item.innerHTML = `
            <span><i class="fas ${icon}"></i> ${content}</span>
            <div class="actions">
                <button onclick="event.stopPropagation(); moveElementUpDown('${el.id}', 'up')"><i class="fas fa-arrow-up"></i></button>
                <button onclick="event.stopPropagation(); moveElementUpDown('${el.id}', 'down')"><i class="fas fa-arrow-down"></i></button>
            </div>
        `;
        ui.elementList.appendChild(item);
    });
}
// Make moveElementUpDown globally accessible
window.moveElementUpDown = (id, direction) => {
    const index = state.elements.findIndex(el => el.id === id);
    if (index === -1) return;

    if (direction === 'up' && index < state.elements.length - 1) {
        [state.elements[index], state.elements[index + 1]] = [state.elements[index + 1], state.elements[index]];
    } else if (direction === 'down' && index > 0) {
        [state.elements[index], state.elements[index - 1]] = [state.elements[index - 1], state.elements[index]];
    }

    renderElementList();
    scheduleRender();
};


function renderElementEditor() {
    ui.elementEditorPanel.innerHTML = '';
    if (!state.selectedElementId) return;

    const el = state.elements.find(e => e.id === state.selectedElementId);
    if (!el) return;

    let editorHTML = `<div class="panel"><h2><i class="fas fa-edit"></i> Edit ${el.type}</h2>`;

    if (el.type === 'text') {
        editorHTML += `
            <div class="form-group">
                <label>Content</label>
                <input type="text" value="${el.content}" oninput="updateSelectedElement('content', this.value)">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Font Family</label>
                    <select onchange="updateSelectedElement('font', this.value)">
                        <option value="Inter" ${el.font === 'Inter' ? 'selected' : ''}>Inter</option>
                        <option value="Arial" ${el.font === 'Arial' ? 'selected' : ''}>Arial</option>
                        <option value="Verdana" ${el.font === 'Verdana' ? 'selected' : ''}>Verdana</option>
                        <option value="Times New Roman" ${el.font === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
                        <option value="Courier New" ${el.font === 'Courier New' ? 'selected' : ''}>Courier New</option>
                        <option value="Georgia" ${el.font === 'Georgia' ? 'selected' : ''}>Georgia</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Font Style</label>
                    <select onchange="updateSelectedElement('style', this.value)">
                        <option value="normal" ${el.style === 'normal' ? 'selected' : ''}>Normal</option>
                        <option value="bold" ${el.style === 'bold' ? 'selected' : ''}>Bold</option>
                        <option value="italic" ${el.style === 'italic' ? 'selected' : ''}>Italic</option>
                        <option value="bold italic" ${el.style === 'bold italic' ? 'selected' : ''}>Bold Italic</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Size: <span>${el.size}px</span></label>
                    <input type="range" min="10" max="300" value="${el.size}" oninput="updateSelectedElement('size', Number(this.value))">
                </div>
                <div class="form-group">
                    <label>Color</label>
                    <input type="color" value="${el.color}" oninput="updateSelectedElement('color', this.value)">
                </div>
            </div>
        `;
    } else if (el.type === 'image') {
        editorHTML += `
            <div class="form-group">
                <label>Scale: <span>${Math.round(el.scale * 100)}%</span></label>
                <input type="range" min="0.1" max="5" step="0.05" value="${el.scale}" oninput="updateSelectedElement('scale', Number(this.value))">
            </div>
        `;
    }

    // Common properties
    editorHTML += `
        <div class="form-group">
            <label>Rotation: <span>${el.rotation}°</span></label>
            <input type="range" min="0" max="360" value="${el.rotation}" oninput="updateSelectedElement('rotation', Number(this.value))">
        </div>
        <div class="form-group">
            <label>Opacity: <span>${Math.round(el.opacity * 100)}%</span></label>
            <input type="range" min="0" max="1" step="0.01" value="${el.opacity}" oninput="updateSelectedElement('opacity', Number(this.value))">
        </div>
        <button class="btn btn-accent" onclick="deleteSelectedElement()"><i class="fas fa-trash"></i> Delete Element</button>
    `;

    editorHTML += `</div>`;
    ui.elementEditorPanel.innerHTML = editorHTML;
}
// Make functions globally accessible for inline event handlers
window.updateSelectedElement = updateSelectedElement;
window.deleteSelectedElement = deleteSelectedElement;

function drawElement(dCtx, el, scale) {
    dCtx.save();
    dCtx.globalAlpha = el.opacity;

    // Apply transform for the element
    dCtx.translate(el.x * scale, el.y * scale);
    dCtx.rotate(el.rotation * Math.PI / 180);

    if (el.type === 'text') {
        dCtx.font = `${el.style || 'normal'} ${el.size * scale}px ${el.font || 'Inter'}`;
        dCtx.fillStyle = el.color;
        dCtx.textAlign = 'center';
        dCtx.textBaseline = 'middle';
        dCtx.fillText(el.content, 0, 0);
        // Update width/height for hit detection
        const metrics = dCtx.measureText(el.content);
        el.w = metrics.width / scale;
        el.h = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) / scale;
    } else if (el.type === 'image' && el.img) {
        const w = el.img.width * el.scale * scale;
        const h = el.img.height * el.scale * scale;
        dCtx.drawImage(el.img, -w / 2, -h / 2, w, h);
        // Update width/height for hit detection
        el.w = w / scale;
        el.h = h / scale;
    }
    dCtx.restore();
}

function drawSelectionHandles(dCtx, el) {
    const handleSize = 10;
    const rotationHandleOffset = 25;
    dCtx.save();
    dCtx.translate(el.x, el.y);
    dCtx.rotate(el.rotation * Math.PI / 180);

    dCtx.strokeStyle = 'rgba(79, 70, 229, 0.9)';
    dCtx.lineWidth = 2;
    dCtx.strokeRect(-el.w / 2, -el.h / 2, el.w, el.h);

    dCtx.fillStyle = 'rgba(79, 70, 229, 1)';
    // Draw resize handle (bottom right)
    dCtx.fillRect(el.w / 2 - handleSize / 2, el.h / 2 - handleSize / 2, handleSize, handleSize);

    // Draw rotation handle (top center)
    dCtx.beginPath();
    dCtx.moveTo(0, -el.h / 2);
    dCtx.lineTo(0, -el.h / 2 - rotationHandleOffset);
    dCtx.stroke();
    dCtx.beginPath();
    dCtx.arc(0, -el.h / 2 - rotationHandleOffset, handleSize / 2, 0, Math.PI * 2);
    dCtx.fill();

    dCtx.restore();
}

// ===================================================================
// 08 – INTERACTIONS (Mouse/Touch)
// ===================================================================
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) / rect.width * canvas.width,
        y: (clientY - rect.top) / rect.height * canvas.height
    };
}

function onPointerDown(e) {
    e.preventDefault();
    const pos = getMousePos(e);
    state.interaction.lastMouse = pos;

    // Hit detection (in reverse order - top layers first)
    for (let i = state.elements.length - 1; i >= 0; i--) {
        const el = state.elements[i];
        const hit = getHitType(pos, el);

        if (hit) {
            state.selectedElementId = el.id;
            state.interaction.isDragging = hit === 'body';
            state.interaction.isResizing = hit === 'resize';
            state.interaction.isRotating = hit === 'rotate';

            renderElementList();
            renderElementEditor();
            scheduleRender();
            return;
        }
    }

    // If no element was hit, start panning
    state.selectedElementId = null;
    state.interaction.isPanning = true;
    canvas.style.cursor = 'grabbing';
    renderElementList();
    renderElementEditor();
    scheduleRender();
}

function onPointerMove(e) {
    e.preventDefault();
    if (!state.interaction.isDragging && !state.interaction.isPanning && !state.interaction.isResizing && !state.interaction.isRotating) return;

    const pos = getMousePos(e);
    const dx = pos.x - state.interaction.lastMouse.x;
    const dy = pos.y - state.interaction.lastMouse.y;

    const el = state.elements.find(e => e.id === state.selectedElementId);

    if (state.interaction.isPanning) {
        state.offsetX += dx / state.zoom;
        state.offsetY += dy / state.zoom;
    } else if (el) {
        if (state.interaction.isDragging) {
            el.x += dx;
            el.y += dy;
        } else if (state.interaction.isResizing) {
            const newWidth = Math.hypot(pos.x - el.x, pos.y - el.y) * Math.sqrt(2);
            if (el.type === 'image' && el.img.width > 0) {
                el.scale = newWidth / el.img.width;
            } else if (el.type === 'text' && el.w > 0) {
                el.size *= (newWidth / el.w);
            }
        } else if (state.interaction.isRotating) {
            const angle = Math.atan2(pos.y - el.y, pos.x - el.x) + Math.PI / 2;
            el.rotation = angle * 180 / Math.PI;
        }
    }

    state.interaction.lastMouse = pos;
    scheduleRender();
}

function onPointerUp(e) {
    state.interaction.isDragging = false;
    state.interaction.isPanning = false;
    state.interaction.isResizing = false;
    state.interaction.isRotating = false;
    canvas.style.cursor = 'grab';
}

function getHitType(point, el) {
    const handleSize = 20;
    const rotationHandleOffset = 25;

    // Transform point to element's local coordinate system
    const cos = Math.cos(-el.rotation * Math.PI / 180);
    const sin = Math.sin(-el.rotation * Math.PI / 180);
    const localX = (point.x - el.x) * cos - (point.y - el.y) * sin;
    const localY = (point.x - el.x) * sin + (point.y - el.y) * cos;

    // Check resize handle
    if (localX > el.w / 2 - handleSize && localX < el.w / 2 + handleSize &&
        localY > el.h / 2 - handleSize && localY < el.h / 2 + handleSize) {
        return 'resize';
    }

    // Check rotation handle
    if (localX > -handleSize && localX < handleSize &&
        localY > -el.h / 2 - rotationHandleOffset - handleSize && localY < -el.h / 2 - rotationHandleOffset + handleSize) {
        return 'rotate';
    }

    // Check body
    if (Math.abs(localX) < el.w / 2 && Math.abs(localY) < el.h / 2) {
        return 'body';
    }

    return null;
}


// ===================================================================
// 09 – UTILITIES & HELPERS
// ===================================================================
function hexToRgb(hex) {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    };
}

function getRgb(color, pos) {
    if (state.patternStyle === 'solid') {
        return hexToRgb(color[0]);
    } else {
        return getGradientColor(color, pos);
    }
}

function interpolateColor(c1, c2, t) {
    return {
        r: Math.round(c1.r + (c2.r - c1.r) * t),
        g: Math.round(c1.g + (c2.g - c1.g) * t),
        b: Math.round(c1.b + (c2.b - c1.b) * t)
    };
}

function getGradientColor(colors, position) {
    if (!Array.isArray(colors) || colors.length === 0) return { r: 255, g: 255, b: 255 };

    if (position <= 0) return hexToRgb(colors[0]);
    if (position >= 1) return hexToRgb(colors[colors.length - 1]);

    let scaledPos = position * (colors.length - 1);
    let index = Math.floor(scaledPos);
    let t = scaledPos - index;

    let color1 = hexToRgb(colors[index]);
    let color2 = hexToRgb(colors[index + 1]);

    return interpolateColor(color1, color2, t);
}
function randomColor() {
    return `#${Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')}`;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function showLoading() {
    loadingBox.classList.add('active');
}

function hideLoading() {
    loadingBox.classList.remove('active');
}

// ===================================================================
// 10 – EVENT LISTENERS & INITIALIZATION
// ===================================================================
function setupEventListeners() {
    // Canvas interactions
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    canvas.addEventListener('touchend', onPointerUp);

    // Control panel inputs
    const controls = ['pattern-size', 'pattern-thickness', 'pattern-spacing', 'rotation', 'zoom', 'pattern-opacity', 'blur-radius', 'gradient-type', 'gradient-angle', 'radial-center-x', 'radial-center-y', 'radial-radius'];
    controls.forEach(id => document.getElementById(id).addEventListener('input', updateStateFromUI));
    ui.patternStyleRadios.forEach(r => r.addEventListener('change', updateStateFromUI));

    // Buttons
    ui.addColorBtn.addEventListener('click', () => {
        if (state.colors.length < 8) {
            state.colors.push(randomColor());
            renderColorPickers();
            updateStateFromUI();
        }
    });
    ui.addPatternColorBtn.addEventListener('click', () => {
        if (state.patternColors.length < 8) {
            state.patternColors.push(randomColor());
            renderColorPickers();
            updateStateFromUI();
        }
    });

    ui.addTextBtn.addEventListener('click', () => {
        const newEl = addElement('text');
        selectElement(newEl.id);
    });

    ui.imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const newEl = addElement('image');
                    newEl.img = img;
                    selectElement(newEl.id);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    ui.downloadBtn.addEventListener('click', () => {
        const downloadCanvas = document.createElement('canvas');
        downloadCanvas.width = 1080;
        downloadCanvas.height = 1080;
        const downloadCtx = downloadCanvas.getContext('2d');
        drawCard(downloadCtx, downloadCanvas, true);

        const link = document.createElement('a');
        link.download = 'card-design.png';
        link.href = downloadCanvas.toDataURL('image/png');
        link.click();
    });

    ui.randomizeBtn.addEventListener('click', () => {
        // Randomize background
        state.colors = Array.from({ length: randomInt(2, 4) }, randomColor);
        state.gradientType = Math.random() > 0.5 ? 'linear' : 'radial';
        state.gradientAngle = randomInt(0, 360);

        // Randomize patterns
        const allPatterns = Object.keys(Pattern);
        state.patterns.clear();
        const numPatterns = randomInt(1, 3);
        for (let i = 0; i < numPatterns; i++) {
            state.patterns.add(allPatterns[randomInt(0, allPatterns.length - 1)]);
        }
        document.querySelectorAll('.pattern-option').forEach(opt => {
            opt.classList.toggle('selected', state.patterns.has(opt.dataset.pattern));
        });

        state.patternColors = Array.from({ length: randomInt(2, 4) }, randomColor);
        state.patternSize = randomInt(10, 50);
        state.patternThickness = randomInt(1, 10);
        state.patternSpacing = randomInt(2, 20);
        state.patternOpacity = randomFloat(0.1, 0.5);
        state.rotation = randomInt(0, 360);
        state.zoom = randomFloat(0.8, 1.5);

        // Sync UI
        renderColorPickers();
        Object.keys(ui).forEach(key => {
            if (ui[key] && state[key] !== undefined && ui[key].nodeName === 'INPUT') {
                ui[key].value = state[key];
            }
        });

        updateStateFromUI();
    });

    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const container = document.querySelector('.canvas-container');
    const size = Math.min(container.clientWidth, container.clientHeight) * 0.9;
    canvas.width = size;
    canvas.height = size;
    offscreen.width = size;
    offscreen.height = size;
    scheduleRender();
}

function init() {
    resizeCanvas();
    populatePatternGrid();
    renderColorPickers();
    renderElementList();
    setupEventListeners();
    updateStateFromUI(); // Initial render
}

// Start the application
init();
