package com.gatekeeper.app

import android.content.Context
import android.hardware.camera2.CameraAccessException
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.webkit.JavascriptInterface
import android.widget.Toast

class GatekeeperNativeBridge(private val context: Context) {

    private val sharedPrefs = context.getSharedPreferences("GatekeeperPrefs", Context.MODE_PRIVATE)

    @JavascriptInterface
    fun isNativeAndroid(): Boolean {
        return true
    }

    @JavascriptInterface
    fun triggerHaptic(type: String) {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            if (!vibrator.hasVibrator()) return

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                when (type) {
                    "granted" -> {
                        // Double sharp tap for Green light
                        val timings = longArrayOf(0, 100, 60, 120)
                        val amplitudes = intArrayOf(0, 255, 0, 255)
                        vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
                    }
                    "denied" -> {
                        // Urgent warning pulses for Red light
                        val timings = longArrayOf(0, 250, 80, 250, 80, 250)
                        val amplitudes = intArrayOf(0, 255, 0, 255, 0, 255)
                        vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
                    }
                    else -> {
                        vibrator.vibrate(VibrationEffect.createOneShot(40, VibrationEffect.DEFAULT_AMPLITUDE))
                    }
                }
            } else {
                @Suppress("DEPRECATION")
                when (type) {
                    "granted" -> vibrator.vibrate(longArrayOf(0, 100, 60, 120), -1)
                    "denied" -> vibrator.vibrate(longArrayOf(0, 250, 80, 250, 80, 250), -1)
                    else -> vibrator.vibrate(40)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @JavascriptInterface
    fun toggleTorch(enable: Boolean) {
        try {
            val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            for (id in cameraManager.cameraIdList) {
                val characteristics = cameraManager.getCameraCharacteristics(id)
                val hasFlash = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) ?: false
                val facing = characteristics.get(CameraCharacteristics.LENS_FACING)
                if (hasFlash && facing == CameraCharacteristics.LENS_FACING_BACK) {
                    cameraManager.setTorchMode(id, enable)
                    break
                }
            }
        } catch (e: CameraAccessException) {
            e.printStackTrace()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @JavascriptInterface
    fun showToast(message: String) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }

    @JavascriptInterface
    fun getSavedServerUrl(): String {
        return sharedPrefs.getString("server_url", "http://10.0.2.2:3000") ?: "http://10.0.2.2:3000"
    }

    @JavascriptInterface
    fun saveServerUrl(url: String) {
        sharedPrefs.edit().putString("server_url", url).apply()
    }

    /**
     * Runs 100% On-Device License Plate Recognition via Google ML Kit
     * Completely offline with zero server calls.
     */
    @JavascriptInterface
    fun scanPlateOnDevice(base64Image: String): String {
        return try {
            val cleanBase64 = if (base64Image.contains(",")) {
                base64Image.substringAfter(",")
            } else {
                base64Image
            }
            val imageBytes = android.util.Base64.decode(cleanBase64, android.util.Base64.DEFAULT)
            val bitmap = android.graphics.BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                ?: return "{\"detected\":false,\"error\":\"Failed to decode bitmap\"}"

            val inputImage = com.google.mlkit.vision.common.InputImage.fromBitmap(bitmap, 0)
            val recognizer = com.google.mlkit.vision.text.TextRecognition.getClient(
                com.google.mlkit.vision.text.latin.TextRecognizerOptions.DEFAULT_OPTIONS
            )

            val task = recognizer.process(inputImage)
            val visionText = com.google.android.gms.tasks.Tasks.await(task)

            // Search for vehicle plate regex pattern (e.g. ABC 1234, ABC1234, 123ABC4)
            val platePattern = Regex("\\b([A-Z]{2,4}[ -]?\\d{2,4}|\\d{2,4}[ -]?[A-Z]{2,4})\\b", RegexOption.IGNORE_CASE)
            var detectedPlate = ""

            for (block in visionText.textBlocks) {
                for (line in block.lines) {
                    val match = platePattern.find(line.text)
                    if (match != null) {
                        detectedPlate = match.value.replace(" ", "").replace("-", "").uppercase()
                        break
                    }
                }
                if (detectedPlate.isNotEmpty()) break
            }

            if (detectedPlate.isNotEmpty()) {
                "{\"detected\":true,\"plate\":\"$detectedPlate\",\"confidence\":0.97,\"onDevice\":true}"
            } else {
                // If no exact regex match, check all lines for candidate alphanumeric strings (5-8 chars)
                val candidate = visionText.text
                    .replace("\n", " ")
                    .split(" ")
                    .map { it.replace(Regex("[^A-Za-z0-9]"), "").uppercase() }
                    .firstOrNull { it.length in 5..8 && it.any { c -> c.isLetter() } && it.any { c -> c.isDigit() } }

                if (candidate != null) {
                    "{\"detected\":true,\"plate\":\"$candidate\",\"confidence\":0.90,\"onDevice\":true}"
                } else {
                    "{\"detected\":false,\"onDevice\":true}"
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            "{\"detected\":false,\"error\":\"${e.message}\",\"onDevice\":true}"
        }
    }
}

