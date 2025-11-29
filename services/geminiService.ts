import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini API client
// The API key is guaranteed to be in process.env.API_KEY by the runtime environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Resizes and compresses the image.
 * Now accepts customization for maxDimension and quality to support 4K.
 */
const compressAndResizeImage = async (file: File, maxDim: number = 1536, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;
      
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    
    img.src = url;
  });
};

/**
 * Upscales a base64 string image to 4K dimensions.
 */
export const upscaleBase64 = async (base64Str: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            // Target 4K resolution (approx 3840 on long side)
            const maxDim = 3840;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
            } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if(!ctx) {
                reject(new Error("No context"));
                return;
            }
            
            // Use better smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.92));
        };
        img.onerror = reject;
        img.src = base64Str;
    });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const colorizeImage = async (file: File): Promise<string> => {
  const resizedBase64 = await compressAndResizeImage(file, 1536, 0.85);
  const cleanBase64 = resizedBase64.split(',')[1];
  const mimeType = 'image/jpeg';

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', // Optimized for speed and quality
    contents: {
      parts: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType
          }
        },
        {
          text: "Colorize this black and white image. Make the colors vibrant, realistic, and high definition. Maintain all details."
        }
      ]
    }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No content generated");

  for (const part of parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated in response");
};

export const upscaleImage = async (file: File): Promise<string> => {
  // For upscale, we try to keep more original data but still limit to avoid timeouts
  // We will ask the model to generate a high-res version
  const resizedBase64 = await compressAndResizeImage(file, 1536, 0.9);
  const cleanBase64 = resizedBase64.split(',')[1];
  const mimeType = 'image/jpeg';

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', 
    contents: {
      parts: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType
          }
        },
        {
          text: "Upscale this image to high resolution 4K quality. Sharpen details, remove blur, remove noise, and enhance texture clarity significantly. Output a highly detailed, crisp image."
        }
      ]
    }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No content generated");

  for (const part of parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
};

export const beautifyImage = async (file: File): Promise<string> => {
  const resizedBase64 = await compressAndResizeImage(file, 1536, 0.85);
  const cleanBase64 = resizedBase64.split(',')[1];
  const mimeType = 'image/jpeg';

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType
          }
        },
        {
          text: "Professional beauty retouching. Smooth skin texture while keeping pores visible, brighten eyes, remove blemishes, enhance facial lighting for a studio look. Keep it natural but polished."
        }
      ]
    }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No content generated");

  for (const part of parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
};

export const customProcessImage = async (file: File, prompt: string): Promise<string> => {
    const resizedBase64 = await compressAndResizeImage(file, 1536, 0.85);
    const cleanBase64 = resizedBase64.split(',')[1];
    const mimeType = 'image/jpeg';
  
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType
            }
          },
          {
            text: `Modify this image based on this instruction: ${prompt}. Maintain high quality and realism.`
          }
        ]
      }
    });
  
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error("No content generated");
  
    for (const part of parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  
    throw new Error("No image generated");
};
