import fs from 'fs';
import { PNG } from 'pngjs';

const publicDir = 'C:\\Souce\\TowerDenfence\\public';
const files = [
    'aoe_tower.png',
    'melee_tower.png',
    'magic_tower.png',
    'projectile_tower.png',
    'slow_tower.png',
    'support_tower.png'
];

const cropImage = (filename) => new Promise((resolve) => {
    const path = `${publicDir}\\${filename}`;
    fs.createReadStream(path)
        .pipe(new PNG())
        .on('parsed', function () {
            // Find bounds
            let minX = this.width, minY = this.height, maxX = 0, maxY = 0;
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    let idx = (this.width * y + x) << 2;
                    if (this.data[idx + 3] > 0) { // Not fully transparent
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (minX <= maxX && minY <= maxY) {
                // Apply a tiny bit of padding
                let shrink = 0;
                let px = Math.min(this.width - 1, Math.max(0, minX + shrink));
                let py = Math.min(this.height - 1, Math.max(0, minY + shrink));
                let pw = Math.max(1, Math.min(this.width - px, (maxX - minX) + 1 - (shrink * 2)));
                let ph = Math.max(1, Math.min(this.height - py, (maxY - minY) + 1 - (shrink * 2)));

                let finalS = Math.max(pw, ph) + 2;

                const dst = new PNG({ width: finalS, height: finalS });
                const offsetX = Math.floor((finalS - pw) / 2);
                const offsetY = Math.floor((finalS - ph) / 2);

                for (let i = 0; i < dst.data.length; i++) dst.data[i] = 0; // Ensure transparency

                this.bitblt(dst, px, py, pw, ph, offsetX, offsetY);
                dst.pack().pipe(fs.createWriteStream(path)).on('finish', () => {
                    console.log(`Cropped ${filename}`);
                    resolve();
                });
            } else {
                console.log(`Skipped ${filename} (empty)`);
                resolve();
            }
        })
        .on('error', resolve);
});

(async () => {
    for (const file of files) {
        await cropImage(file);
    }
})();
