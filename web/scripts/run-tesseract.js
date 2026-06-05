const Tesseract = require('tesseract.js');

const imagePath = process.argv[2];

Tesseract.recognize(imagePath, 'eng')
  .then(result => {
    console.log(JSON.stringify({
      text: result.data.text,
      confidence: result.data.confidence,
      words: (result.data.words || []).map(w => ({ text: w.text, bbox: w.bbox, confidence: w.confidence }))
    }));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
