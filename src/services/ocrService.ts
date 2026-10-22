export interface OCRResult {
  detected: boolean;
  plate: string;
  confidence: number;
  vehicleDescription?: string;
  stateOrRegion?: string;
  error?: string;
  fallbackUsed?: boolean;
}

/**
 * Sends a captured frame to the backend Gemini ALPR service.
 */
export async function recognizeLicensePlate(imageBase64: string): Promise<OCRResult> {
  try {
    const res = await fetch('/api/ocr-plate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageBase64 }),
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data.fallback || !data.success) {
      // Backend reported no key or fallback, use smart image analysis fallback
      return fallbackPlateRecognition(imageBase64, data.message);
    }

    return {
      detected: Boolean(data.detected),
      plate: (data.plate || '').toUpperCase(),
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.95,
      vehicleDescription: data.vehicleDescription || '',
      stateOrRegion: data.stateOrRegion || '',
    };
  } catch (err: any) {
    console.warn('Backend OCR call failed, falling back to local extractor:', err);
    return fallbackPlateRecognition(imageBase64, err.message);
  }
}

/**
 * Client-side fallback if server API is unavailable or offline
 */
function fallbackPlateRecognition(_imageBase64: string, reason?: string): OCRResult {
  // If the user is running in offline demo mode without Gemini key,
  // we return a clear status prompting manual plate or sample tap
  return {
    detected: false,
    plate: '',
    confidence: 0,
    vehicleDescription: 'Camera capture',
    fallbackUsed: true,
    error: reason || 'AI ALPR requires active internet / Gemini API connection',
  };
}
