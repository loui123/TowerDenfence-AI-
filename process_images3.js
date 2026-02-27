import fs from 'fs';
import { PNG } from 'pngjs';

const artifactDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\7e5ce315-e5e6-44cf-aabf-7615f5e28d98';
const publicDir = 'C:\\Souce\\TowerDenfence\\public';

const fileMap = {
    'aoe_tower': 'aoe_tower_1772137272446.png',
    'melee_hit_1': 'melee_hit_1_1772137319152.png',
    'melee_hit_2': 'melee_hit_2_1772137336126.png',
    'melee_hit_3': 'melee_hit_3_1772137352853.png',
    'melee_tower': 'melee_tower_1772137225562.png',
    'magic_tower': 'pixel_single_1772132253866.png',
    'proj_hit_1': 'proj_hit_1_1772137366599.png',
    'proj_hit_2': 'proj_hit_2_1772137380838.png',
    'proj_hit_3': 'proj_hit_3_1772137398589.png',
    'projectile_tower': 'projectile_tower_1772137244313.png',
    'slow_tower': 'slow_tower_1772137258716.png',
    'spell_1': 'spell_1_1772136843938.png',
    'spell_2': 'spell_2_1772136859159.png',
    'spell_3': 'spell_3_1772136886615.png',
    'spell_4': 'spell_4_1772136902073.png',
    'support_tower': 'support_tower_1772137292322.png'
};

const processImage = (inName, outName) => new Promise((resolve) => {
    const inPath = `${artifactDir}\\${inName}`;
    const outPath = `${publicDir}\\${outName}.png`;

    fs.createReadStream(inPath)
        .pipe(new PNG({ filterType: 4 }))
        .on('parsed', function () {
            let bgR = 0, bgG = 0, bgB = 0;
            // Get corner colors to try identifying background color
            const corners = [
                0, // top-left
                (this.width - 1) * 4, // top-right
                this.width * (this.height - 1) * 4, // bottom-left
                ((this.width * this.height) - 1) * 4 // bottom-right
            ];

            // Assume 0,0 is background
            bgR = this.data[0]; bgG = this.data[1]; bgB = this.data[2];

            // Global replace algorithm: replacing all very dark colors and anything close to the background color
            for (let i = 0; i < this.data.length; i += 4) {
                const r = this.data[i];
                const g = this.data[i + 1];
                const b = this.data[i + 2];

                const isVeryDark = (r < 55 && g < 55 && b < 55);
                const isCloseToBg = (Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB)) < 90;

                if (isVeryDark || isCloseToBg) {
                    this.data[i + 3] = 0; // Transparent
                }
            }

            // Auto crop
            let minX = this.width, minY = this.height, maxX = 0, maxY = 0;
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    let idx = (this.width * y + x) << 2;
                    if (this.data[idx + 3] > 0) { // Not transparent
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (minX <= maxX && minY <= maxY) {
                let px = Math.max(0, minX - 4);
                let py = Math.max(0, minY - 4);
                let pw = Math.min(this.width - px, maxX - px + 1 + 8);
                let ph = Math.min(this.height - py, maxY - py + 1 + 8);

                const dst = new PNG({ width: pw, height: ph });
                this.bitblt(dst, px, py, pw, ph, 0, 0);
                dst.pack().pipe(fs.createWriteStream(outPath)).on('finish', resolve);
            } else {
                this.pack().pipe(fs.createWriteStream(outPath)).on('finish', resolve);
            }
        })
        .on('error', resolve);
});

(async () => {
    for (const [outName, inName] of Object.entries(fileMap)) {
        await processImage(inName, outName);
    }
})();
