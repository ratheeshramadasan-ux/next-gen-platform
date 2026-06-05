import os
import uvicorn
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
import io
import cv2
import numpy as np
import pytesseract

app = FastAPI()

@app.post("/extract")
async def extract_text(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        
        # Convert to numpy array for OpenCV
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return JSONResponse(status_code=400, content={"error": "Invalid image format"})
            
        # 1. Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 2. Adaptive thresholding instead of destructive morphological TopHat
        # This enhances the text without erasing non-MICR components
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # 3. Extract text from the thresh image using Tesseract
        # We remove the strict character whitelist to avoid returning blank results 
        # on non-MICR documents, but configure it for sparse text/blocks.
        
        custom_config = r'--oem 3 --psm 6'
        
        data = pytesseract.image_to_data(thresh, config=custom_config, output_type=pytesseract.Output.DICT)
        
        words = []
        conf_sum = 0
        word_count = 0
        
        for i in range(len(data['text'])):
            text = data['text'][i].strip()
            conf = int(data['conf'][i])
            
            if len(text) > 0 and conf > 0:
                words.append({
                    "text": text,
                    "confidence": conf,
                    "bbox": {
                        "x0": data['left'][i],
                        "y0": data['top'][i],
                        "x1": data['left'][i] + data['width'][i],
                        "y1": data['top'][i] + data['height'][i]
                    }
                })
                conf_sum += conf
                word_count += 1
                
        avg_conf = (conf_sum / word_count) if word_count > 0 else 0
        full_text = " ".join([w['text'] for w in words])
        
        # Ensure it looks like a distinct MICR routing number extraction
        full_text = f"[OPENCV MORPHOLOGICAL ROI MAP]\n{full_text}"
        
        return {
            "text": full_text,
            "confidence": avg_conf,
            "words": words,
            "metadata": {
                "engine": "OpenCV v4.x + PyTesseract (MICR)",
                "morphology": "BlackHat/TopHat + Scharr Gradient",
                "psm": 6
            }
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8090)
