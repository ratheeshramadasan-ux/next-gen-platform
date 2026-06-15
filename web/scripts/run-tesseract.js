const { createWorker } = require('tesseract.js');

const imagePath = process.argv[2];

(async () => {
  const worker = await createWorker('eng');
  try {
    const result = await worker.recognize(imagePath, {}, { blocks: true });

    const words = [];
    for (const block of result.data.blocks || []) {
      for (const paragraph of block.paragraphs || []) {
        for (const line of paragraph.lines || []) {
          for (const word of line.words || []) {
            words.push({ text: word.text, bbox: word.bbox, confidence: word.confidence });
          }
        }
      }
    }

    console.log(JSON.stringify({
      text: result.data.text,
      confidence: result.data.confidence,
      words,
    }));
  } finally {
    await worker.terminate();
  }
})().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
