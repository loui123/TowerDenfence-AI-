import fs from 'fs';
import { PNG } from 'pngjs';

const W = 64;
const H = 64;

function createPNG(filename, renderFn) {
    const png = new PNG({ width: W, height: H });
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const idx = (W * y + x) << 2;
            const [r, g, b, a] = renderFn(x, y);
            png.data[idx] = r;
            png.data[idx + 1] = g;
            png.data[idx + 2] = b;
            png.data[idx + 3] = a;
        }
    }
    png.pack().pipe(fs.createWriteStream(`public/${filename}.png`));
    console.log(`Generated ${filename}.png`);
}

// Frame 1: Small scattered chunks flying inwards from the edges
createPNG(`water_1`, (x, y) => {
    const cx = W / 2;
    const cy = H / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Scattered small chunks at radius 18~28
    if (dist > 18 && dist < 28) {
        const chunkGridX = Math.floor(x / 4);
        const chunkGridY = Math.floor(y / 4);
        const hash = Math.sin(chunkGridX * 12.9898 + chunkGridY * 78.233) * 43758.5453;
        if (hash - Math.floor(hash) > 0.8) { // Few sparse chunks
            const noise = (Math.sin(x * 5) * Math.cos(y * 5)) * 30;
            return [140 + noise, 210 + noise, 255, 230];
        }
    }
    return [0, 0, 0, 0];
});

// Frame 2: Chunks are closer, medium sized, starting to freeze together
createPNG(`water_2`, (x, y) => {
    const cx = W / 2;
    const cy = H / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 8 && dist < 20) {
        const chunkGridX = Math.floor(x / 6);
        const chunkGridY = Math.floor(y / 6);
        const hash = Math.sin(chunkGridX * 12.9898 + chunkGridY * 78.233) * 43758.5453;
        if (hash - Math.floor(hash) > 0.6) { // More condensed
            const noise = (Math.sin(x * 4) * Math.cos(y * 4)) * 30;
            return [150 + noise, 220 + noise, 255, 240];
        }
    }
    // Translucent freezing core
    if (dist <= 10) {
        return [120, 200, 255, 120];
    }
    return [0, 0, 0, 0];
});

// Frame 3: A large solid ice block/crystal at the center
createPNG(`water_3`, (x, y) => {
    const cx = W / 2;
    const cy = H / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Jagged crystal shape
    const jagged = Math.sin(angle * 7) * 4 + Math.cos(angle * 11) * 2;
    const maxR = 20 + jagged;

    if (dist < maxR) {
        const noise = (Math.sin(x * 3) * Math.cos(y * 3)) * 30;
        // Inner icy core
        if (dist < maxR * 0.6) {
            return [210 + noise, 245 + noise, 255, 230]; // Core
        } else {
            // Outer crystal edge with thick opacity
            const alpha = 180 + (Math.random() * 75);
            return [140 + noise, 210 + noise, 255, alpha];
        }
    }

    // Small frost dust escaping
    if (dist >= maxR && dist < maxR + 4) {
        if (Math.random() > 0.8) return [200, 240, 255, 150];
    }

    return [0, 0, 0, 0];
});
