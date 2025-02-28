import React, { useRef, useState, useEffect } from "react";
import { useTesseract } from "../hooks/useTesseract";
import FileDropZone from "./file-drop-zone";
import ProgressBar from "./progressbar";
import { preprocessImage } from "../helper/helper";

const OCRDemoApp: React.FC = () => {
  const {
    text: documentText,
    progress: ocrProgress,
    recognizeImage,
  } = useTesseract();
  const [documentImage, setDocumentImage] = useState<ImageBitmap | null>(null);
  const [ocrTime, setOCRTime] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (documentImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (context) {
        canvas.width = documentImage.width;
        canvas.height = documentImage.height;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(documentImage, 0, 0);
      }
    }
  }, [documentImage]);

  const loadImage = async (file: File) => {
    try {
      console.log("File received:", file.name);
      const startTime = performance.now();

      // Preprocess the uploaded image
      console.log("Starting image preprocessing...");
      const preprocessedImageBlob = await preprocessImage(file);
      console.log("Image preprocessing completed.");

      // Display processed image
      const preprocessedImage = await createImageBitmap(preprocessedImageBlob);
      setDocumentImage(preprocessedImage);

      // Display original image
      // const originalImage = await createImageBitmap(file);
      // setDocumentImage(originalImage);

      console.log("Running OCR on preprocessed image...");

      // Run OCR on preprocessed image and get parsed data
      const parsedData = await recognizeImage(
        new File([preprocessedImageBlob], file.name, { type: "image/png" })
      );

      // If ID is detected from the preprocessed image, stop
      if (parsedData?.id_no) {
        console.log("ID detected in preprocessed image:", parsedData.id_no);
      } else {
        console.log(
          "No ID detected in preprocessed image. Trying original image..."
        );

        // Try OCR on the original image
        await recognizeImage(file);

        // Parse OCR result from the original image
        const parsedDataOriginal = await recognizeImage(file);

        if (!parsedDataOriginal?.id_no) {
          alert("No valid ID number detected. Please upload a clearer image.");
        }
      }

      const endTime = performance.now();
      setOCRTime(Math.round(endTime - startTime));
      console.log("OCR completed in", Math.round(endTime - startTime), "ms");
    } catch (error) {
      console.error("Error processing image:", error);
    }
  };

  return (
    <div className="OCRDemoApp">
      <h1>tesseract-wasm OCR Demo</h1>
      <FileDropZone onDrop={loadImage} />
      {ocrProgress !== null && <ProgressBar value={ocrProgress * 100} />}
      {ocrTime !== null && <div>OCR completed in {ocrTime}ms</div>}
      <canvas
        ref={canvasRef}
        style={{
          border: "1px solid black",
          marginTop: "10px",
          maxWidth: "100%",
        }}
      />
      {documentText && <pre className="OCRDemoApp__text">{documentText}</pre>}
    </div>
  );
};

export default OCRDemoApp;
