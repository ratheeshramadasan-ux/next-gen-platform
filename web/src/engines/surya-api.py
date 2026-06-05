import os
import uvicorn
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from PIL import Image
import io

try:
    import transformers
    from transformers.modeling_rope_utils import ROPE_INIT_FUNCTIONS
    import torch
    
    def default_rope_init(config, device, seq_len=None):
        head_dim = getattr(config, "head_dim", config.hidden_size // config.num_attention_heads)
        inv_freq = 1.0 / (config.rope_theta ** (torch.arange(0, head_dim, 2, device=device).float() / head_dim))
        return inv_freq, 1.0
        
    ROPE_INIT_FUNCTIONS["default"] = default_rope_init

    def get_tied_keys(self):
        keys = getattr(self, "_tied_weights_keys", [])
        return {k: None for k in keys} if isinstance(keys, list) else keys
    def set_tied_keys(self, value):
        self._tied_weights_keys = value
    transformers.PreTrainedModel.all_tied_weights_keys = property(get_tied_keys, set_tied_keys)
except ImportError:
    pass

try:
    import surya.common.surya.encoder
    original_forward = surya.common.surya.encoder.Qwen2_5_VisionRotaryEmbedding.forward
    def patched_forward(self, seqlen: int) -> torch.Tensor:
        if self.inv_freq.device.type == "meta":
            self.inv_freq = self.inv_freq.to("cpu")
        return original_forward(self, seqlen)
    surya.common.surya.encoder.Qwen2_5_VisionRotaryEmbedding.forward = patched_forward
except ImportError:
    pass

try:
    from surya.common.surya.schema import TaskNames
    from surya.detection import DetectionPredictor
    from surya.foundation import FoundationPredictor
    from surya.recognition import RecognitionPredictor
    
    print("Loading Surya models (v0.17)... This may take a moment.")
    foundation_predictor = FoundationPredictor()
    det_predictor = DetectionPredictor()
    rec_predictor = RecognitionPredictor(foundation_predictor)
    print("Surya models loaded successfully.")
    MODELS_AVAILABLE = True
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"Surya failed to import models: {e}")
    MODELS_AVAILABLE = False
    STARTUP_ERROR = str(e)

app = FastAPI()

@app.post("/extract")
async def extract_text(
    file: UploadFile = File(...),
    bboxes: str = Form(None)
):
    if not MODELS_AVAILABLE:
        return JSONResponse(status_code=500, content={"error": f"Surya OCR models failed to load on backend. Reason: {STARTUP_ERROR}"})
    
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        parsed_bboxes = None
        if bboxes:
            import json
            try:
                parsed_bboxes = json.loads(bboxes)
                if len(parsed_bboxes) > 0:
                    parsed_bboxes = [parsed_bboxes] # Wrap in list for the batch of 1 image
            except Exception as e:
                print("Failed to parse bboxes:", e)
                parsed_bboxes = None

        if parsed_bboxes and len(parsed_bboxes[0]) > 0:
            predictions = rec_predictor(
                [image],
                task_names=[TaskNames.ocr_with_boxes],
                highres_images=[image],
                math_mode=False,
                bboxes=parsed_bboxes
            )
        else:
            predictions = rec_predictor(
                [image],
                task_names=[TaskNames.ocr_with_boxes],
                det_predictor=det_predictor,
                highres_images=[image],
                math_mode=False
            )
        
        res = predictions[0]
        
        words = []
        for line in res.text_lines:
            words.append({
                "text": line.text,
                "confidence": line.confidence * 100,
                "bbox": {"x0": line.bbox[0], "y0": line.bbox[1], "x1": line.bbox[2], "y1": line.bbox[3]}
            })
            
        full_text = "\n".join([line.text for line in res.text_lines])
        
        avg_conf = sum([line.confidence for line in res.text_lines]) / len(res.text_lines) if res.text_lines else 0
        
        return {
            "text": full_text,
            "confidence": avg_conf * 100,
            "words": words
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8089)
