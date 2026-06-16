// PDF.js will be loaded dynamically on the client
import { TrainingDocument, TrainingPage } from "../store/studioStore";
import { OCRWord } from "../types";

export class DocumentNormalizer {
  static async normalize(file: File): Promise<TrainingDocument> {
    const extension = file.name.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "pdf":
        return this.processPDF(file);
      case "png":
      case "jpg":
      case "jpeg":
      case "bmp":
        return this.processImage(file);
      case "tiff":
      case "tif":
        return this.processTIFF(file);
      default:
        throw new Error("Unsupported document type");
    }
  }

  static async getPdfLib() {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    return pdfjsLib;
  }

  static async processPDF(file: File): Promise<TrainingDocument> {
    const buffer = await file.arrayBuffer();
    const pdfjsLib = await this.getPdfLib();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pages: TrainingPage[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Fix: PDF backgrounds are transparent. Fill with white to prevent black-on-black in ML.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport,
        canvas: canvas,
      }).promise;

      const imageUrl = canvas.toDataURL("image/png");

      pages.push({
        pageId: crypto.randomUUID(),
        pageNumber: i,
        imageUrl,
        width: viewport.width,
        height: viewport.height,
        confidence: 0,
        textLayer: [],
        annotations: []
      });
    }

    return {
      documentId: crypto.randomUUID(),
      name: file.name,
      pages,
    };
  }

  static async processImage(file: File): Promise<TrainingDocument> {
    const imageUrl = URL.createObjectURL(file);
    const img = await this.loadImage(imageUrl);

    return {
      documentId: crypto.randomUUID(),
      name: file.name,
      pages: [
        {
          pageId: crypto.randomUUID(),
          pageNumber: 1,
          imageUrl,
          width: img.width,
          height: img.height,
          confidence: 0,
          textLayer: [],
          annotations: []
        },
      ],
    };
  }

  static async processTIFF(file: File): Promise<TrainingDocument> {
    return this.processImage(file);
  }

  private static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
}
