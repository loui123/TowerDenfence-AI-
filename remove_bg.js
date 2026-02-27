import { removeBackground } from '@imgly/background-removal-node';
import fs from 'fs';
import path from 'path';

async function processImage(inputPath, outputPath) {
    try {
        console.log(`Processing ${inputPath}...`);

        // Convert local absolute path to a file:// URI to satisfy loadFromURI
        const fileUri = 'file:///' + inputPath.replace(/\\/g, '/');

        const blob = await removeBackground(fileUri);
        const buffer = Buffer.from(await blob.arrayBuffer());
        fs.writeFileSync(outputPath, buffer);
        console.log(`Saved transparent image to ${outputPath}`);
    } catch (e) {
        console.error(e);
    }
}

const input = process.argv[2];
const output = process.argv[3];
if (input && output) {
    processImage(input, output);
}
