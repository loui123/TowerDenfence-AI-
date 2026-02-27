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

// 1. Ice / Freeze Animation (Water Spell)
// Generate multiple ice crystals gathering onto the target monster
for (let f = 1; f <= 3; f++) {
    createPNG(`water_${f}`, (x, y) => {
        const cx = W / 2;
        const cy = H / 2;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let a = 0, r = 180, g = 230, b = 255;
        if (dist > 31) return [0, 0, 0, 0]; // Do not exceed grid size (64x64)

        // Pseudo-random noise for ice texture
        const noise = (Math.sin(x * 4.3 + y * 2.1) + Math.cos(x * 1.7 - y * 3.4)) * 0.5;

        // Angle for calculating individual shards
        const angle = Math.atan2(dy, dx);

        if (f === 1) {
            // Frame 1: Small outer shards forming (condensing inward)
            const spikePos = Math.abs(Math.sin(angle * 4)); // 8 outer shards
            const bandDist = Math.abs(dist - 22);
            if (bandDist < 6 && spikePos > 0.6 + noise * 0.2) {
                a = 200 + noise * 55;
                r = 160 + noise * 10;
            } else if (bandDist < 8 && spikePos > 0.4) {
                a = 100 + noise * 50;
            }
        } else if (f === 2) {
            // Frame 2: Shards moving much closer, growing larger
            const spikePos = Math.abs(Math.sin(angle * 4));
            const bandDist = Math.abs(dist - 12);
            if (bandDist < 8 && spikePos > 0.3 + noise * 0.2) {
                a = 220 + noise * 35;
                r = 150; g = 240;
            } else if (dist < 8) {
                a = 150 + noise * 50; // Core starting to freeze
            } else if (bandDist < 11) {
                a = 80;
            }
        } else if (f === 3) {
            // Frame 3: Final single large ice crystal forming on the target
            const spikeDist = 12 + 10 * Math.abs(Math.sin((angle + 0.5) * 3)); // 6 main inner spikes
            if (dist < spikeDist + noise * 3) {
                a = 240 + noise * 15;
                r = 140 + noise * 30;
                g = 240 + noise * 10;
            } else if (dist < spikeDist + 4 + noise * 2) {
                a = 140;
            }
        }

        return [
            Math.max(0, Math.min(255, r)),
            Math.max(0, Math.min(255, g)),
            Math.max(0, Math.min(255, b)),
            Math.max(0, Math.min(255, a))
        ];
    });
}

// 2. Green Vortex Animation (Tornado)
// A swirling top-down looking or purely magical spiraling storm
for (let f = 1; f <= 3; f++) {
    createPNG(`tornado_${f}`, (x, y) => {
        const cx = W / 2;
        const cy = H / 2;
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        const angle = Math.atan2(dy, dx) + (dist * 0.15) - (f * 1.5); // Spiral effect

        // Swirling bands of wind
        const spiralForce = Math.sin(angle * 3); // 3 bands

        const maxDist = 28; // Fits in 64x64 cell well
        if (dist < maxDist) {
            const edgeBlend = Math.max(0, (maxDist - dist) / 10);

            if (spiralForce > 0) {
                // The wind stream
                const r = 50 + spiralForce * 50 + Math.random() * 20;
                const g = 180 + spiralForce * 75 + Math.random() * 20;
                const b = 100 + spiralForce * 40 + Math.random() * 20;
                const a = Math.min(255, (100 + spiralForce * 155) * edgeBlend);
                return [r, g, b, a];
            } else if (dist < 15) {
                // Inner eye / ambient dust
                return [40, 120, 70, 80 * edgeBlend];
            }
        }

        return [0, 0, 0, 0];
    });
}

// 3. Arrow Bullet (Thin white projectile)
createPNG('bullet_arrow', (x, y) => {
    // A horizontally aligned thin shape. Game.jsx rotates it.
    // Let's make it look like a glowing white/yellow arrow or needle 
    const cx = W / 2;
    const cy = H / 2;
    // Bullet is long in X, thin in Y
    if (Math.abs(y - cy) < 3 && x > cx - 15 && x < cx + 15) {
        // Tip (right side) is brighter and pointy
        const isTip = x > cx + 10;
        if (isTip && Math.abs(y - cy) > 1) return [0, 0, 0, 0]; // Pointy tip

        const intensity = isTip ? 255 : 200;
        return [255, 255, 255, intensity]; // Pure white body
    }
    // Subtle glow
    if (Math.abs(y - cy) < 6 && x > cx - 16 && x < cx + 16) {
        return [255, 255, 200, 80]; // Faint yellow glow
    }
    return [0, 0, 0, 0];
});

// 4. Slow Tower Bullet (Blue icicle)
createPNG('bullet_slow', (x, y) => {
    const cx = W / 2;
    const cy = H / 2;
    if (Math.abs(y - cy) < 4 && x > cx - 12 && x < cx + 14) {
        const isTip = x > cx + 8;
        if (isTip && Math.abs(y - cy) > 2) return [0, 0, 0, 0];

        return [100, 200, 255, 240]; // Cyan/blue
    }
    if (Math.abs(y - cy) < 8 && x > cx - 14 && x < cx + 16) {
        return [50, 150, 255, 90]; // Blue glow
    }
    return [0, 0, 0, 0];
});

// 5. AOE Tower Bullet (Red/Black cannonball)
createPNG('bullet_aoe', (x, y) => {
    const cx = W / 2;
    const cy = H / 2;
    const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
    if (dist < 8) {
        // Red glowing core
        if (dist < 4) return [255, 80, 50, 255];
        // Darker shell
        return [40, 20, 20, 220];
    }
    // Fiery trail/glow
    if (dist < 14) {
        return [255, 100, 30, Math.max(0, 150 - dist * 10)];
    }
    return [0, 0, 0, 0];
});

// 6. Fire Vortex (fusion_fire_wood)
for (let f = 1; f <= 3; f++) {
    createPNG(`fire_vortex_${f}`, (x, y) => {
        const cx = W / 2;
        const cy = H / 2;
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        const angle = Math.atan2(dy, dx) + (dist * 0.15) - (f * 1.5); // Spiral effect

        // Swirling bands of fire
        const spiralForce = Math.sin(angle * 4); // 4 bands of fire

        const maxDist = 28;
        if (dist < maxDist) {
            const edgeBlend = Math.max(0, (maxDist - dist) / 10);
            const intensity = Math.max(0, spiralForce);

            if (intensity > 0) {
                // Fire colors (Red to Yellow)
                const r = 255;
                const g = 50 + intensity * 150 + Math.random() * 50;
                const b = Math.random() * 50;
                const a = Math.min(255, (100 + intensity * 155) * edgeBlend);
                return [r, g, b, a];
            } else if (dist < 18) {
                // Inner ember / ash
                return [180, 30, 0, 60 * edgeBlend];
            } else if (Math.random() < 0.05) {
                // Sparks
                return [255, 200, 50, 200 * edgeBlend];
            }
        }
        return [0, 0, 0, 0];
    });
}

// 7. Volcanic Eruption (fusion_fire_water -> Steam & Magma)
for (let f = 1; f <= 3; f++) {
    createPNG(`eruption_${f}`, (x, y) => {
        const cx = W / 2;
        const cy = H / 2;
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        const noise = (Math.sin(x * 2.3 + f) + Math.cos(y * 2.3 + f)) * 0.5;
        const maxDist = 28;
        const angle = Math.atan2(dy, dx);

        if (dist < maxDist) {
            const normalizedDist = dist / maxDist;
            const isSteam = (Math.sin(angle * 5 + f + dist * 0.5) > 0);
            const edgeBlend = Math.max(0, 1 - normalizedDist);

            // Random explosion blobs
            const blobSize = Math.abs(Math.sin((Math.atan2(dy, dx) * 6) + f * 2));
            const blobDist = maxDist * (0.4 + blobSize * 0.6);

            if (dist < blobDist) {
                if (dist < 10 + Math.random() * 5) {
                    // Bright magma core
                    return [255, 240, 150, 240];
                } else if (Math.random() > 0.4) {
                    // Lava splashes
                    return [255, 80 + Math.random() * 60, 20, 200 * edgeBlend];
                } else {
                    // Steam / boiling water
                    return [180 + noise * 50, 220 + noise * 30, 255, 120 * edgeBlend];
                }
            } else {
                // Outer steam clouds
                if (Math.random() > 0.5) {
                    return [200 + noise * 20, 220 + noise * 20, 240 + noise * 10, 80 * edgeBlend];
                }
            }
        }
        return [0, 0, 0, 0];
    });
}
