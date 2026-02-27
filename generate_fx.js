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

// Tornado (Greenish funnel)
for (let f = 1; f <= 3; f++) {
    createPNG(`tornado_${f}`, (x, y) => {
        // Funnel shape
        const cx = W / 2 + Math.sin(y * 0.2 + f * 2) * 5;
        const width = ((H - y) / H) * 20 + 5;
        const dist = Math.abs(x - cx);

        if (dist < width) {
            // Noise & stripes
            const noise = Math.random() * 40;
            const isStripe = (x + y * 2 + f * 5) % 10 < 4;
            if (isStripe) {
                return [100 + noise, 200 + noise, 120 + noise, 230]; // Light green
            } else {
                return [50 + noise, 130 + noise, 70 + noise, 200]; // Dark green
            }
        }
        return [0, 0, 0, 0];
    });
}

// Water Spell (Expanding blue rings)
for (let f = 1; f <= 3; f++) {
    createPNG(`water_${f}`, (x, y) => {
        const dx = x - W / 2;
        const dy = y - H / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Rings based on frame
        const r1 = f * 8;
        const r2 = f * 12;

        if (Math.abs(dist - r1) < 4 || Math.abs(dist - r2) < 3) {
            const noise = Math.random() * 50;
            return [100 + noise, 200 + noise, 255, 220]; // Cyan/Blue
        }

        // Splash particles
        if (dist < r2 && Math.random() < 0.05 * f) {
            return [180, 220, 255, 200];
        }

        return [0, 0, 0, 0];
    });
}

// Lightning Strike (Vertical zig zag)
for (let f = 1; f <= 3; f++) {
    createPNG(`lightning_${f}`, (x, y) => {
        // Main bolt
        const cx = W / 2 + (Math.sin(y * 0.5) * 8 * (f % 2 === 0 ? 1 : -1));
        const dist = Math.abs(x - cx);

        if (dist < 3) {
            return [255, 255, 200, 255]; // White-yellow core
        } else if (dist < 7) {
            return [150, 220, 255, 150]; // Cyan glow
        }

        // Branches
        if (y % 15 === 0 && Math.abs(x - W / 2) < 20 && Math.random() < 0.5) {
            return [200, 240, 255, 180];
        }

        return [0, 0, 0, 0];
    });
}
