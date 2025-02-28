import { useState } from "react";
import { OCRClient } from "tesseract-wasm";
import { parseOCRText } from "../helper/helper";

export const useTesseract = () => {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number | null>(null);

  const recognizeImage = async (file: File) => {
    setLoading(true);
    setProgress(0);
    const image = await createImageBitmap(file);
    const ocr = new OCRClient({
      workerPath: "/tesseract-wasm/tesseract-worker.js",
      corePath: "/tesseract-wasm/tesseract-core.wasm",
      fallbackPath: "/tesseract-wasm/tesseract-core-fallback.wasm",
    });

    try {
      await ocr.loadModel("/tesseract-wasm/eng.traineddata", {
        tessedit_pageseg_mode: 11,
        oem: 3,
      });

      await ocr.loadImage(image);

      const recognizedText = await ocr.getText(setProgress);
      console.log("OCR Text:", recognizedText);

      const parsedData = parseOCRText(recognizedText);
      console.log("Parsed Data:", parsedData);

      setText(JSON.stringify(parsedData, null, 2));

      return parsedData;
    } finally {
      ocr.destroy();
      setLoading(false);
    }
  };

  return { text, loading, progress, recognizeImage };
};
