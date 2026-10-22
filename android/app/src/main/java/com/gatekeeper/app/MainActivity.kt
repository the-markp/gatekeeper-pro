package com.gatekeeper.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    companion object {
        private const val TAG = "Gatekeeper"
        private const val LOCAL_ASSET_URL = "https://appassets.androidplatform.net/assets/index.html"
        private const val PREFS_NAME = "GatekeeperPrefs"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_USE_REMOTE = "use_remote_server"
        // Default Cloud Run dev server URL for this project
        private const val DEFAULT_REMOTE_URL = "https://ais-dev-ldedzlya2ybk2o4dyiolzx-117264682210.us-east1.run.app"
    }

    private val requestCameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if (isGranted) {
                loadGatekeeper()
            } else {
                Toast.makeText(
                    this,
                    "Camera permission is required to scan license plates.",
                    Toast.LENGTH_LONG
                ).show()
                loadGatekeeper()
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

        // Initialize WebViewAssetLoader to safely serve bundled assets from APK
        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this)
        setContentView(webView)

        setupWebView()

        // Check camera permission, then load
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
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        // Hardware acceleration for video canvas
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        // Inject Native Android Bridge
        val bridge = GatekeeperNativeBridge(this)
        webView.addJavascriptInterface(bridge, "GatekeeperNative")

        webView.webChromeClient = object : WebChromeClient() {
            // Automatically grant WebRTC camera video capture permission
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

            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                consoleMessage?.let {
                    Log.d(TAG, "[WebView Console] ${it.message()} (${it.sourceId()}:${it.lineNumber()})")
                }
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            // Intercept local asset requests through WebViewAssetLoader
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url ?: return null
                return assetLoader.shouldInterceptRequest(url)
            }

            // If remote server fails to connect, fallback to bundled offline app
            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                super.onReceivedError(view, errorCode, description, failingUrl)
                Log.w(TAG, "Failed to load URL $failingUrl: $description")

                // Only fallback if the failed URL was a remote server
                if (failingUrl != null && !failingUrl.startsWith("https://appassets.androidplatform.net")) {
                    Toast.makeText(
                        this@MainActivity,
                        "Server unreachable. Loaded on-device Gatekeeper (Offline Mode).",
                        Toast.LENGTH_LONG
                    ).show()
                    loadLocalAssets()
                }
            }
        }
    }

    private fun loadGatekeeper() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val useRemote = prefs.getBoolean(KEY_USE_REMOTE, false)

        if (useRemote) {
            val remoteUrl = prefs.getString(KEY_SERVER_URL, DEFAULT_REMOTE_URL) ?: DEFAULT_REMOTE_URL
            Log.i(TAG, "Loading remote server URL: $remoteUrl")
            webView.loadUrl(remoteUrl)
        } else {
            loadLocalAssets()
        }
    }

    private fun loadLocalAssets() {
        Log.i(TAG, "Loading local bundled assets: $LOCAL_ASSET_URL")
        webView.loadUrl(LOCAL_ASSET_URL)
    }

    /**
     * Dialog allowing guard to toggle between bundled 100% offline app and connected Docker/Cloud server
     */
    fun showConnectionSettingsDialog() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val currentRemoteUrl = prefs.getString(KEY_SERVER_URL, DEFAULT_REMOTE_URL) ?: DEFAULT_REMOTE_URL
        val currentUseRemote = prefs.getBoolean(KEY_USE_REMOTE, false)

        val options = arrayOf(
            "⚡ On-Device Standalone (100% Offline, Bundled)",
            "☁️ Connected Server / Docker ($currentRemoteUrl)"
        )
        val checkedItem = if (currentUseRemote) 1 else 0

        AlertDialog.Builder(this)
            .setTitle("Gatekeeper Engine Mode")
            .setSingleChoiceItems(options, checkedItem) { dialog, which ->
                when (which) {
                    0 -> {
                        // Switch to offline bundled app
                        prefs.edit().putBoolean(KEY_USE_REMOTE, false).apply()
                        loadLocalAssets()
                        Toast.makeText(this, "Switched to Standalone Offline Mode", Toast.LENGTH_SHORT).show()
                        dialog.dismiss()
                    }
                    1 -> {
                        dialog.dismiss()
                        promptRemoteServerUrl()
                    }
                }
            }
            .setNegativeButton("Close", null)
            .show()
    }

    private fun promptRemoteServerUrl() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val currentRemoteUrl = prefs.getString(KEY_SERVER_URL, DEFAULT_REMOTE_URL) ?: DEFAULT_REMOTE_URL

        val input = EditText(this)
        input.setText(currentRemoteUrl)
        input.setSelection(input.text.length)

        AlertDialog.Builder(this)
            .setTitle("Configure Server Endpoint")
            .setMessage("Enter the Docker server or Cloud Run URL:\n• Android Emulator: http://10.0.2.2:3000\n• Local Wi-Fi: http://192.168.x.x:3000\n• Cloud: $DEFAULT_REMOTE_URL")
            .setView(input)
            .setPositiveButton("Connect") { _, _ ->
                val newUrl = input.text.toString().trim()
                if (newUrl.isNotEmpty()) {
                    prefs.edit()
                        .putString(KEY_SERVER_URL, newUrl)
                        .putBoolean(KEY_USE_REMOTE, true)
                        .apply()
                    webView.loadUrl(newUrl)
                }
            }
            .setNegativeButton("Cancel") { _, _ ->
                loadLocalAssets()
            }
            .show()
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
