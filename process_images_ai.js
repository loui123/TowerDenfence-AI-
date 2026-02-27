import { removeBackground } from '@imgly/background-removal-node';
import fs from 'fs';

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

async function processAll() {
    for (const [outName, inName] of Object.entries(fileMap)) {
        const inPath = `${artifactDir}\\${inName}`;
        const outPath = `${publicDir}\\${outName}.png`;
        console.log(`Processing ${inPath}...`);
        try {
            const buffer = fs.readFileSync(inPath);
            const blob = new Blob([buffer], { type: 'image/png' });

            const imageBlob = await removeBackground(blob);
            const outBuffer = Buffer.from(await imageBlob.arrayBuffer());
            fs.writeFileSync(outPath, outBuffer);
            console.log(`Saved ${outName}.png successfully using AI background removal.`);
        } catch (e) {
            console.error(`Failed to process ${outName}:`, e);
        }
    }
}

processAll();
