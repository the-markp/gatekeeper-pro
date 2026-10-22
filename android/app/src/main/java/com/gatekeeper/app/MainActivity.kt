package com.gatekeeper.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val requestCameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if (isGranted) {
                loadGatekeeper()
            } else {
                Toast.makeText(this, "Camera permission is required for vehicle plate scanning", Toast.LENGTH_LONG).show()
            }
        }

    private val filePickerLauncher =
        registerForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
            filePathCallback?.onReceiveValue(uris.toTypedArray())
            filePathCallback = null
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        setupWebView()

        // Check camera permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestCameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        } else {
            loadGatekeeper()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        // High performance & WebGL support for camera canvas
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        // Inject Native Bridge
        val bridge = GatekeeperNativeBridge(this)
        webView.addJavascriptInterface(bridge, "GatekeeperNative")

        webView.webChromeClient = object : WebChromeClient() {
            // Automatically grant WebRTC camera permission to web client
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.let {
                    val requestedResources = it.resources
                    val grantedResources = mutableListOf<String>()
                    for (resource in requestedResources) {
                        if (resource == PermissionRequest.RESOURCE_VIDEO_CAPTURE) {
                            grantedResources.add(resource)
                        }
                    }
                    if (grantedResources.isNotEmpty()) {
                        it.grant(grantedResources.toTypedArray())
                    } else {
                        it.deny()
                    }
                }
            }

            // File chooser for gallery upload
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback
                filePickerLauncher.launch("image/*")
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                super.onReceivedError(view, errorCode, description, failingUrl)
                showServerConfigDialog("Failed to connect to Gatekeeper server at $failingUrl.")
            }
        }
    }

    private fun loadGatekeeper() {
        val prefs = getSharedPreferences("GatekeeperPrefs", Context.MODE_PRIVATE)
        // 10.0.2.2 is the standard loopback IP to host machine from Android Emulator
        val serverUrl = prefs.getString("server_url", "http://10.0.2.2:3000") ?: "http://10.0.2.2:3000"
        webView.loadUrl(serverUrl)
    }

    private fun showServerConfigDialog(errorMessage: String? = null) {
        val prefs = getSharedPreferences("GatekeeperPrefs", Context.MODE_PRIVATE)
        val currentUrl = prefs.getString("server_url", "http://10.0.2.2:3000")

        val input = EditText(this)
        input.setText(currentUrl)
        input.setSelection(input.text.length)

        val builder = AlertDialog.Builder(this)
            .setTitle(getString(R.string.dialog_server_title))
            .setMessage((if (errorMessage != null) "$errorMessage\n\n" else "") + getString(R.string.dialog_server_message))
            .setView(input)
            .setPositiveButton(getString(R.string.btn_connect)) { _, _ ->
                val newUrl = input.text.toString().trim()
                if (newUrl.isNotEmpty()) {
                    prefs.edit().putString("server_url", newUrl).apply()
                    webView.loadUrl(newUrl)
                }
            }
            .setNegativeButton(getString(R.string.btn_cancel), null)

        builder.show()
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
