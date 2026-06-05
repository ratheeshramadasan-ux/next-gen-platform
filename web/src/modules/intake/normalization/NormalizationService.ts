import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export class NormalizationService {
    static async normalize(inputPath: string, outputDir: string): Promise<string> {
        const fileName = path.basename(inputPath);
        const outputPath = path.join(outputDir, `normalized_${fileName}`);
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        await sharp(inputPath)
            .rotate() // Auto-rotate based on EXIF
            .normalize() // Enhance contrast
            .sharpen()
            .grayscale()
            .toFile(outputPath);

        return outputPath;
    }

    static async getReadinessMetrics(filePath: string) {
        const metadata = await sharp(filePath).metadata();
        
        // Simplified readiness logic
        const dpi = metadata.density || 72;
        const isLowRes = dpi < 200;
        const score = isLowRes ? 70 : 95;

        return {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            dpi,
            ocrReadiness: score
        };
    }
}
