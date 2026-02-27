import fs from 'fs';
import { PNG } from 'pngjs';

const artifactDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\7e5ce315-e5e6-44cf-aabf-7615f5e28d98';
const publicDir = 'C:\\Souce\\TowerDenfence\\public';

const fileMap = {
    'aoe_tower': 'aoe_tower_1772137272446.png',
    'melee_tower': 'melee_tower_1772137225562.png',
    'magic_tower': 'pixel_single_1772132253866.png',
    'projectile_tower': 'projectile_tower_1772137244313.png',
    'slow_tower': 'slow_tower_1772137258716.png',
    'support_tower': 'support_tower_1772137292322.png'
};

const processImage = (inName, outName) => new Promise((resolve) => {
    const inPath = `${artifactDir}\\${inName}`;
    const outPath = `${publicDir}\\${outName}.png`;

    fs.createReadStream(inPath)
        .pipe(new PNG({ filterType: 4 }))
        .on('parsed', function () {
            // Flood fill from borders
            const visited = new Uint8Array(this.width * this.height);
            const stack = [];
            for (let x = 0; x < this.width; x++) { stack.push([x, 0]); stack.push([x, this.height - 1]); }
            for (let y = 0; y < this.height; y++) { stack.push([0, y]); stack.push([this.width - 1, y]); }

            let bgR = 0, bgG = 0, bgB = 0;
            const tol = 30; // Very strict tolerance to prevent bleeding into dark tower pixels

            while (stack.length > 0) {
                const [x, y] = stack.pop();
                if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
                const i = y * this.width + x;
                if (visited[i]) continue;

                const idx = i << 2;
                const r = this.data[idx];
                const g = this.data[idx + 1];
                const b = this.data[idx + 2];

                // Check for black border backgrounds
                const isDarkBg = r < 40 && g < 40 && b < 40;
                // Also remove the weird greenish/blueish borders seen in the screenshot around the tower bounding box
                const isWeirdBorder = (r < 75 && g > 70 && g < 130 && b > 80 && b < 140) || (g > 150 && b > 180 && r < 120);
                const d = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

                if (isDarkBg || isWeirdBorder || d < tol) {
                    visited[i] = 1;
                    this.data[idx + 3] = 0; // Alpha = 0
                    stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
                } else {
                    visited[i] = 2; // Hit a boundary
                }
            }

            // Clean up any stray light coloured pixels on the very outermost edge that form those weird borders
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const i = y * this.width + x;
                    const idx = i << 2;
                    if (this.data[idx + 3] !== 0) {
                        // Check if it's an isolated low-contrast border pixel by taking local neighborhood
                        let adjTransparent = 0;
                        if (x > 0 && this.data[((y) * this.width + (x - 1)) << 2 + 3] === 0) adjTransparent++;
                        if (x < this.width - 1 && this.data[((y) * this.width + (x + 1)) << 2 + 3] === 0) adjTransparent++;
                        if (y > 0 && this.data[((y - 1) * this.width + x) << 2 + 3] === 0) adjTransparent++;
                        if (y < this.height - 1 && this.data[((y + 1) * this.width + x) << 2 + 3] === 0) adjTransparent++;

                        if (adjTransparent >= 3) {
                            // Stray pixel, kill it
                            this.data[idx + 3] = 0;
                        }
                    }
                }
            }

            // Auto crop
            let minX = this.width, minY = this.height, maxX = 0, maxY = 0;
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    let idx = (this.width * y + x) << 2;
                    if (this.data[idx + 3] > 0) { // Not transparent
                        // Ensure it's fully opaque inside
                        this.data[idx + 3] = 255;

                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (minX <= maxX && minY <= maxY) {
                // Cut deeper into padding to remove those outer boxes completely
                let shrink = 2;
                let px = Math.min(this.width - 1, Math.max(0, minX + shrink));
                let py = Math.min(this.height - 1, Math.max(0, minY + shrink));
                let pw = Math.max(1, Math.min(this.width - px, (maxX - minX) + 1 - (shrink * 2)));
                let ph = Math.max(1, Math.min(this.height - py, (maxY - minY) + 1 - (shrink * 2)));

                // Keep the final image square and add tight padding again
                let finalS = Math.max(pw, ph) + 2;

                const dst = new PNG({ width: finalS, height: finalS });
                const offsetX = Math.floor((finalS - pw) / 2);
                const offsetY = Math.floor((finalS - ph) / 2);

                // Pre-fill transparent
                for (let i = 0; i < dst.data.length; i++) dst.data[i] = 0;

                this.bitblt(dst, px, py, pw, ph, offsetX, offsetY);
                dst.pack().pipe(fs.createWriteStream(outPath)).on('finish', () => {
                    console.log(`Saved (cropped) ${outName}.png`);
                    resolve();
                });
            } else {
                this.pack().pipe(fs.createWriteStream(outPath)).on('finish', () => {
                    console.log(`Saved (full) ${outName}.png`);
                    resolve();
                });
            }
        })
        .on('error', resolve);
});

(async () => {
    for (const [outName, inName] of Object.entries(fileMap)) {
        await processImage(inName, outName);
    }
})();
