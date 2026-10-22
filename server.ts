import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '20mb' }));

// Initialize Gemini SDK with User-Agent telemetry
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Plate Recognition API
app.post('/api/ocr-plate', async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Extract base64 and mime type
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (image.includes(';base64,')) {
      const parts = image.split(';base64,');
      const mimeMatch = parts[0].match(/:(.*?);/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
      base64Data = parts[1];
    }

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'No GEMINI_API_KEY configured. Please use manual entry or check secrets.',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: `You are an automated gate access license plate recognition (ALPR) system.
Analyze this vehicle image and extract the vehicle's license plate registration characters.
Instructions:
1. Identify the license plate number clearly.
2. Normalize it: uppercase alphanumeric characters only (remove dashes, spaces, bullets, state headers, or stickers). For example, "ABC-1234" becomes "ABC1234", "6XYZ890" becomes "6XYZ890", "ND 4521" becomes "ND4521".
3. Identify vehicle type/color if visible (e.g., 'Yellow School Bus', 'Silver Sedan', 'Black SUV', 'White Van').
4. Determine your confidence (0.0 to 1.0).
5. If no license plate is visible, set detected to false.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detected: {
              type: Type.BOOLEAN,
              description: 'Whether a vehicle license plate was detected',
            },
            plate: {
              type: Type.STRING,
              description: 'Clean uppercase alphanumeric plate number',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Recognition confidence between 0 and 1',
            },
            vehicleDescription: {
              type: Type.STRING,
              description: 'Detected vehicle color, make/model or type',
            },
            stateOrRegion: {
              type: Type.STRING,
              description: 'State, province, or issuing jurisdiction if visible',
            },
          },
          required: ['detected', 'plate'],
        },
      },
    });

    const text = response.text || '{}';
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { detected: false, plate: '', confidence: 0 };
    }

    // Clean plate further: uppercase, strip non-alphanumeric
    if (result.plate) {
      result.plate = result.plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    }

    return res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('OCR Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to scan license plate',
    });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    appName: 'Gatekeeper',
    hasApiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

// Setup Vite or static serving
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Gatekeeper server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
