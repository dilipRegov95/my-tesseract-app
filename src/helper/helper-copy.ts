// Define regex patterns for different country ID formats.
const idPatterns = [
  { country: "Malaysia", regex: /\d{6}-\d{2}-\d{4}/ },
  // For Singapore, allow for a common OCR error where 'O' is used instead of '0'.
  { country: "Singapore", regex: /[STFGM](?:0|O)\d{6}[A-Z]/i },
  // For China, allow 15 to 18 digits, remove spaces before matching.
  { country: "China", regex: /\d{15,18}/ },
];

// Levenshtein distance helper
const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// remove whitespace and convert to lowercase.
const normalize = (str: string): string =>
  str.replace(/\s+/g, "").toLowerCase();

// Detect an ID number and its country from the OCR lines.
const detectIDNumber = (
  lines: string[]
): { id_no: string; country: string } | null => {
  for (const line of lines) {
    for (const pattern of idPatterns) {
      let textToMatch = line;
      if (pattern.country === "China") {
        textToMatch = line.replace(/\s+/g, "");
      } else if (pattern.country === "Singapore") {
        // common OCR error: 'O' vs '0'
        textToMatch = line.replace(/O/g, "0");
      }
      const match = textToMatch.match(pattern.regex);
      if (match) {
        console.log(`Detected ID for ${pattern.country}:`, match[0]);
        return { id_no: match[0], country: pattern.country };
      }
    }
  }
  return null;
};

// Fallback: scan all lines for a country name
const findCountryInLines = (lines: string[]): string | null => {
  const countries = [
    "Malaysia",
    "United States",
    "United Kingdom",
    "Japan",
    "China",
    "India",
    "Singapore",
  ];
  let bestCountry: string | null = null;
  let bestDistance = Infinity;
  for (const line of lines) {
    for (const country of countries) {
      const distance = levenshteinDistance(normalize(line), normalize(country));
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCountry = country;
      }
    }
  }
  if (bestCountry && bestDistance <= bestCountry.length / 2) {
    console.log("Detected country from lines:", bestCountry);
    return bestCountry;
  } else {
    console.log("No country detected from lines.");
    return null;
  }
};

// Parse the OCR text and extract fields based on the detected country.
export const parseOCRText = (ocrText: string) => {
  // Remove unwanted words.
  const cleanedText = ocrText
    .replace(/warganegara/gi, "")
    .replace(/islam/gi, "")
    .replace(/lelaki/gi, "")
    .replace(/perempuan/gi, "");

  const lines = cleanedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  // Detect ID number and associated country.
  const idDetection = detectIDNumber(lines);
  const id_no = idDetection ? idDetection.id_no : "";
  const detectedCountryFromID = idDetection ? idDetection.country : "";

  let name = "";
  let address = "";
  let gender = "";
  let idIndex = -1;

  if (detectedCountryFromID === "Malaysia") {
    idIndex = id_no ? lines.findIndex((line) => line.includes(id_no)) : -1;
    if (idIndex !== -1 && idIndex + 1 < lines.length) {
      name = lines[idIndex + 1];
      if (name.startsWith("+")) {
        name = name.replace("+", "").trim();
      }
    }
    if (idIndex !== -1 && idIndex + 2 < lines.length) {
      address = lines.slice(idIndex + 2).join(" ");
    }

    // gender check
    const digitsOnly = id_no.replace(/\D/g, "");
    if (digitsOnly.length > 0) {
      const lastDigit = digitsOnly[digitsOnly.length - 1];
      gender = parseInt(lastDigit) % 2 === 0 ? "female" : "male";
    }
  } else if (detectedCountryFromID === "Singapore") {
    // For Singapore, assume the line containing the ID is one line;
    // then the next non-empty line is the name.
    idIndex = id_no ? lines.findIndex((line) => line.includes(id_no)) : -1;
    if (idIndex !== -1 && idIndex + 1 < lines.length) {
      name = lines[idIndex + 1];
    } else {
      name = lines[2] || "";
    }
    address = lines.slice(idIndex + 2).join(" ");
    gender = "";
  } else if (detectedCountryFromID === "China") {
    // For China
    idIndex = id_no ? lines.findIndex((line) => line.includes(id_no)) : -1;
    name = lines[1] || "";
    address = lines.slice(2).join(" ");
    gender = "";
  } else {
    // If no ID is detected, fallback to a generic extraction.
    name = lines[1] || "";
    address = lines.slice(2).join(" ");
  }

  // Use the detected country from the ID if available;
  // otherwise, try a fuzzy match from the lines.
  const fallbackCountry = findCountryInLines(lines);
  const country = idDetection ? idDetection.country : fallbackCountry;

  return {
    id_no,
    name,
    address,
    gender,
    country,
  };
};

export const preprocessImage = async (file: File): Promise<Blob> => {
  return new Promise<Blob>((resolve, reject) => {
    console.log("Preprocessing started for:", file.name);

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      console.log("Image loaded:", img.width, "x", img.height);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("Canvas context is null!");
        return reject("Canvas context not available");
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      console.log("Checking OpenCV...");

      if (typeof cv === "undefined") {
        console.error("OpenCV.js is NOT loaded!");
        return reject("OpenCV is not available");
      }

      console.log("OpenCV.js is loaded. Running processing...");

      // check if OpenCV is ready
      if (!cv.getBuildInformation) {
        console.error("OpenCV runtime is not initialized!");
        return reject("OpenCV runtime not initialized");
      }

      try {
        console.log("Creating OpenCV matrix...");
        const src = cv.imread(canvas);
        console.log("OpenCV matrix created:", src);

        // Denoising
        console.log("Applying Gaussian blur for noise reduction...");
        cv.GaussianBlur(src, src, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
        console.log("Noise reduction complete.");

        // Sharpening (-1: darken, 5: increase intensity)
        console.log("Applying sharpening...");
        const kernel = cv.matFromArray(
          3,
          3,
          cv.CV_32F,
          [0, -1, 0, -1, 5, -1, 0, -1, 0]
        );
        cv.filter2D(src, src, cv.CV_8U, kernel);
        console.log("Sharpening complete.");

        // Contrast
        console.log("Adjusting contrast & brightness...");
        // 1.5: contrast, 15: brightness
        src.convertTo(src, -1, 1.5, 15);
        console.log("Contrast adjustment complete.");

        console.log("Image preprocessing completed. Converting to Blob...");

        cv.imshow(canvas, src);
        src.delete();
        kernel.delete();

        canvas.toBlob((blob) => {
          if (blob) {
            console.log("Blob created successfully.");
            resolve(blob);
          } else {
            console.error("Failed to create blob!");
            reject("Blob conversion failed");
          }
        }, "image/png");
      } catch (error) {
        console.error("OpenCV processing error:", error);
        reject("Error during OpenCV processing");
      }
    };

    img.onerror = (error) => {
      console.error("Image failed to load!", error);
      reject("Image loading failed");
    };
  });
};
