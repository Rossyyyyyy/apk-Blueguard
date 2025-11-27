from pathlib import Path
from fastapi import FastAPI, UploadFile, File
import uvicorn
import settings
import cv2
import numpy as np
import os
from ultralytics import YOLO
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()


# Load YOLO Model
model_path = Path(settings.DETECTION_MODEL)
output_folder = "images"
os.makedirs(output_folder, exist_ok=True)

app.mount("/images", StaticFiles(directory="images"), name="images")


def load_model(model_path):
    return YOLO(model_path)

try:
    model = load_model(model_path)
except Exception as ex:
    raise RuntimeError(f"Unable to load model. Check the specified path: {model_path}\nError: {ex}")

# Waste Classification Function
def classify_waste_type(detected_items):
    recyclable_items = set(detected_items) & set(settings.RECYCLABLE)
    non_recyclable_items = set(detected_items) & set(settings.NON_RECYCLABLE)
    hazardous_items = set(detected_items) & set(settings.HAZARDOUS)
    return recyclable_items, non_recyclable_items, hazardous_items

# ✅ Process Uploaded Image (Now Saves Processed Image)
def process_uploaded_image(model, uploaded_image):
    try:
        # Read image as numpy array
        image_bytes = uploaded_image.file.read()  # Read file correctly
        image = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image, cv2.IMREAD_COLOR)

        if image is None:
            return {"error": "Invalid image file."}

        # Run YOLO model prediction
        res = model.predict(image, conf=0.6)
        names = model.names
        detected_items = set()

        for result in res:
            detected_items.update([names[int(c)] for c in result.boxes.cls])

        # Save result image
        result_image = res[0].plot()
        output_path = os.path.join(output_folder, f"result_{uploaded_image.filename}")
        cv2.imwrite(output_path, result_image)

        return {
            "detected_items": list(detected_items),
            "message": "Image processed successfully",
            "saved_image": output_path
        }

    except Exception as e:
        return {"error": str(e)}

# ✅ Endpoint for Waste Detection
@app.post("/detect/")
async def detect_waste(file: UploadFile = File(...)):
    try:
        result = process_uploaded_image(model, file)
        
        if "error" in result:
            return JSONResponse(status_code=400, content=result)
        
        return JSONResponse(status_code=200, content=result)

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# ✅ Start FastAPI Server
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
