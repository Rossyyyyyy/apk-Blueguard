from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import os
import shutil
from ultralytics import YOLO
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Create folders if they don't exist
UPLOAD_FOLDER = "images"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (for testing)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLO model
model = YOLO("weights/best.pt")

# Serve images statically
app.mount("/images", StaticFiles(directory="images"), name="images")


@app.post("/detect/")
async def detect_trash(file: UploadFile = File(...)):
    try:
        # Save uploaded file
        file_location = os.path.join(UPLOAD_FOLDER, file.filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Read the image using OpenCV
        image = cv2.imread(file_location)
        if image is None:
            return JSONResponse(status_code=400, content={"error": "Invalid image file"})

        # Run YOLO model prediction
        res = model.predict(image, conf=0.6)
        names = model.names

        # Extract detected items
        detected_items = {names[int(c)] for result in res for c in result.boxes.cls}

        # Classify detected waste
        recyclable = []
        non_recyclable = []
        hazardous = []

        for item in detected_items:
            if item in ["Plastic Bottle", "Can", "Cardboard"]:
                recyclable.append(item)
            elif item in ["Plastic Bag", "Food Wrapper"]:
                non_recyclable.append(item)
            else:
                hazardous.append(item)

        # Save result image with bounding boxes
        result_image = res[0].plot()
        output_filename = f"result_{file.filename}"
        output_path = os.path.join(UPLOAD_FOLDER, output_filename)
        cv2.imwrite(output_path, result_image)

        # Return JSON response
        return JSONResponse(status_code=200, content={
            "detected_items": list(detected_items),
            "recyclable": recyclable,
            "non_recyclable": non_recyclable,
            "hazardous": hazardous,
            "message": "Image processed successfully",
            "saved_image": f"/images/{output_filename}"
        })

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)