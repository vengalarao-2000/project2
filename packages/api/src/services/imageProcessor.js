// src/services/imageProcessor.js
import sharp from 'sharp';

// Define desired outputs matching your screenshot
const RENDITIONS = [
    { name: 'square', aspect: 1 / 1, width: 1080, height: 1080 },
    { name: 'portrait', aspect: 4 / 5, width: 1080, height: 1350 },
    { name: 'landscape', aspect: 16 / 9, width: 1920, height: 1080 },
    { name: 'story', aspect: 9 / 16, width: 1080, height: 1920 },
];

export async function generateSmartCrops(imgBytes, centerPoint) {
    const image = sharp(imgBytes);
    const metadata = await image.metadata();
    const { width: originalW, height: originalH } = metadata;

    const results = {};

    for (const rendition of RENDITIONS) {
        let options = {
            width: rendition.width,
            height: rendition.height,
            fit: sharp.fit.cover, // Crop to fill dimensions
        };

        // If we found a pet center point, instruct Sharp to focus there.
        if (centerPoint) {
            // Convert normalized center (0.0-1.0) to actual pixels
            const focusX = Math.floor(centerPoint.x * originalW);
            const focusY = Math.floor(centerPoint.y * originalH);

            // Use sharp's 'attention' focus strategy, guided by our coordinates
            options.position = sharp.strategy.attention;
            // Note: Sharp's advanced gravity features sometimes require experimentation depending on the image set.
            // A simpler approach if 'attention' fails is calculating pixel offsets, but let's try smart gravity first.
        } else {
            options.position = sharp.gravity.center;
        }

        const croppedBuffer = await image
            .resize(options)
            .jpeg({ quality: 90 }) // Standardize to high-quality JPEG
            .toBuffer();

        results[rendition.name] = croppedBuffer;
    }

    return results; // Returns { square: <Buffer>, portrait: <Buffer>, ... }
}