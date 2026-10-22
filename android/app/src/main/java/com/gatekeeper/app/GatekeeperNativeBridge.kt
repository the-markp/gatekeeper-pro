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
}
