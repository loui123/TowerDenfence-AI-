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

// Epic Tornado Effect
for (let f = 1; f <= 3; f++) {
    createPNG(`tornado_${f}`, (x, y) => {
        // Base coordinate with sinusoidal offsets to create wave motion
        const centerWave = Math.sin((y * 0.15) + (f * 1.5)) * (y / 6);
        const cx = W / 2 + centerWave;

        // Width gets larger at the top (smaller y) and tapers to a point at bottom (larger y)
        // Add bulging effect around the middle-top
        const bulge = Math.sin((y / H) * Math.PI) * 5;
        const width = ((H - y) / H) * 22 + 4 + bulge;

        const dist = Math.abs(x - cx);

        // Swirling dust particles floating outside main funnel
        const isDust = Math.random() < 0.04 && dist < width + 12 && dist > width - 2 && (y + f * 5) % 8 < 3;
        if (isDust) {
            return [150 + Math.random() * 50, 220 + Math.random() * 35, 170 + Math.random() * 30, 180 + Math.random() * 70]; // Flying debris
        }

        if (dist < width) {
            // Complex texture generation
            const textureNoise = Math.sin(x * 0.4 + f * 2) * Math.cos(y * 0.3 - f) * 10;
            const normalizedDist = dist / width;

            // Edge highlight/shadow based on rotation
            const isHighlight = (x < cx) && normalizedDist > 0.6; // Light from left
            const isCore = normalizedDist < 0.3; // Inner fast spinning core

            // Spinning bands (striations)
            const angleVal = (Math.atan2(y - H, x - cx) * 10 + f * 3) % (Math.PI * 2);
            const isBand = angleVal > 0 && angleVal < 2;

            let r = 0, g = 0, b = 0, a = 255;

            if (isCore) {
                // Bright pale green core
                r = 180 + textureNoise;
                g = 240 + textureNoise;
                b = 200 + textureNoise;
            } else if (isBand) {
                // Darker sweeping wind bands
                r = 40 + textureNoise;
                g = 120 + textureNoise;
                b = 60 + textureNoise;
                a = 230;
            } else if (isHighlight) {
                // Edge rim lighting
                r = 140 + textureNoise;
                g = 210 + textureNoise;
                b = 160 + textureNoise;
                a = 240;
            } else {
                // Base shadowy funnel color
                r = 60 + textureNoise;
                g = 150 + textureNoise;
                b = 85 + textureNoise;
                a = 220;
            }

            return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b)), a];
        }

        return [0, 0, 0, 0];
    });
}

// Epic Water Splash / Geyser Effect
// We'll create a bursting splash starting small and growing
for (let f = 1; f <= 3; f++) {
    createPNG(`water_${f}`, (x, y) => {
        const cx = W / 2;
        const cy = H / 2;
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        const maxRadius = f * 15 + 5;

        // Expanding ring of water with varying thickness
        const thickness = 4 + Math.sin(Math.atan2(dy, dx) * 4 + f * 2) * 3;
        const isMainRing = Math.abs(dist - maxRadius) < thickness;

        // Inner core bubbles and chaotic water surface
        const isInnerBubble = dist < maxRadius - 2 && (Math.sin(x * 1.4) * Math.cos(y * 1.4) + Math.random() * 0.5 > 0.8);

        // Flying droplets further out
        const isDroplet = dist > maxRadius + 2 && dist < maxRadius + 12 && Math.random() < (0.05 * f);

        let r = 0, g = 0, b = 0, a = 255;

        // Foam color (White/Cyan)
        const foamR = 220, foamG = 245, foamB = 255;
        // Deep water color (Blue)
        const deepR = 30, deepG = 120, deepB = 240;

        if (isMainRing) {
            // Ring gradient: inner edge is darker, outer edge is foamy
            const gradientPhase = (dist - (maxRadius - thickness)) / (thickness * 2);
            r = deepR + (foamR - deepR) * gradientPhase + Math.random() * 20;
            g = deepG + (foamG - deepG) * gradientPhase + Math.random() * 20;
            b = deepB + (foamB - deepB) * gradientPhase + Math.random() * 20;
            a = 230 - (gradientPhase * 50); // Fades slightly at outermost edge
            return [r, g, b, Math.max(0, Math.min(255, a))];
        }
        else if (isInnerBubble) {
            // Cyan/White glowing bubbles inside the splash
            return [150 + Math.random() * 50, 220 + Math.random() * 35, 255, 180 + Math.random() * 75];
        }
        else if (isDroplet) {
            // Bright white/cyan flying droplets
            return [200 + Math.random() * 55, 240 + Math.random() * 15, 255, 200];
        }

        // Ambient background watery haze inside the ring
        if (dist < maxRadius) {
            const alpha = 80 - (dist / maxRadius) * 60; // Fades out towards the ring
            return [40, 140, 255, Math.max(0, alpha)];
        }

        return [0, 0, 0, 0];
    });
}
