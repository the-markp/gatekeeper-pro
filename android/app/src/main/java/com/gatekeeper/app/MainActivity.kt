package com.gatekeeper.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.GestureDetector
import android.view.MotionEvent
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
import java.io.InputStream

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    companion object {
        private const val TAG = "Gatekeeper"
        private const val LOCAL_HOST = "appassets.androidplatform.net"
        private const val LOCAL_ASSET_URL = "https://appassets.androidplatform.net/assets/index.html"
        private const val PREFS_NAME = "GatekeeperPrefs"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_USE_REMOTE = "use_remote_server"
        private const val DEFAULT_REMOTE_URL = "https://ais-dev-ldedzlya2ybk2o4dyiolzx-117264682210.us-east1.run.app"
    }

    private val requestCameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if (isGranted) {
                Log.i(TAG, "Camera permission granted by user")
            } else {
                Toast.makeText(
                    this,
                    "Camera permission required for plate scanning. You can still use manual plate entry.",
                    Toast.LENGTH_LONG
                ).show()
            }
            loadGatekeeper()
        }

    private val filePickerLauncher =
        registerForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
            filePathCallback?.onReceiveValue(uris.toTypedArray())
            filePathCallback = null
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            // Paint window background dark immediately
            window.decorView.setBackgroundColor(Color.parseColor("#09090b"))

            // Initialize fallback WebViewAssetLoader
            assetLoader = WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
                .build()

            webView = WebView(this)
            webView.setBackgroundColor(Color.parseColor("#09090b"))
            setContentView(webView)

            setupWebView()

            // Enable DevTools remote debugging
            WebView.setWebContentsDebuggingEnabled(true)

            // Camera permission check
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                requestCameraPermissionLauncher.launch(Manifest.permission.CAMERA)
            } else {
                loadGatekeeper()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Fatal startup exception in onCreate", e)
            Toast.makeText(this, "Startup error: ${e.message}", Toast.LENGTH_LONG).show()
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
        @Suppress("DEPRECATION")
        settings.allowFileAccessFromFileURLs = true
        @Suppress("DEPRECATION")
        settings.allowUniversalAccessFromFileURLs = true

        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        // Hardware acceleration
        webView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null)

        // Native Android Bridge
        try {
            val bridge = GatekeeperNativeBridge(this)
            webView.addJavascriptInterface(bridge, "GatekeeperNative")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize GatekeeperNativeBridge", e)
        }

        webView.webChromeClient = object : WebChromeClient() {
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
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url ?: return null

                // If requesting from our virtual local origin, serve directly from APK assets with CORS headers
                if (url.host == LOCAL_HOST || url.scheme == "file") {
                    val customResponse = handleAssetRequest(url)
                    if (customResponse != null) {
                        return customResponse
                    }
                    // Fallback to assetLoader
                    val assetResponse = assetLoader.shouldInterceptRequest(url)
                    if (assetResponse != null) {
                        injectCorsHeaders(assetResponse)
                        return assetResponse
                    }
                }
                return null
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.i(TAG, "Gatekeeper page finished loading: $url")
            }

            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                super.onReceivedError(view, errorCode, description, failingUrl)
                Log.w(TAG, "WebView error ($errorCode) loading $failingUrl: $description")

                // If remote server failed, switch to local assets
                if (failingUrl != null && !failingUrl.startsWith("https://$LOCAL_HOST") && !failingUrl.startsWith("file://")) {
                    Log.i(TAG, "Remote connection failed, loading local bundled assets.")
                    loadLocalAssets()
                }
            }
        }

        // Long press gesture on screen to open connection dialog
        val gestureDetector = GestureDetector(this, object : GestureDetector.SimpleOnGestureListener() {
            override fun onLongPress(e: MotionEvent) {
                showConnectionSettingsDialog()
            }
        })

        webView.setOnTouchListener { _, event ->
            gestureDetector.onTouchEvent(event)
            false
        }
    }

    /**
     * Directly serves APK assets with guaranteed MIME types and CORS Access-Control-Allow-Origin: *
     * This prevents any ES Module <script type="module" crossorigin> blocking by Android Chromium WebView!
     */
    private fun handleAssetRequest(url: Uri): WebResourceResponse? {
        val path = url.path?.removePrefix("/") ?: return null

        val candidatePaths = mutableListOf<String>()
        candidatePaths.add(path)
        if (path.startsWith("assets/")) {
            candidatePaths.add(path.removePrefix("assets/"))
            candidatePaths.add("assets/" + path.removePrefix("assets/"))
        } else {
            candidatePaths.add("assets/$path")
        }
        candidatePaths.add("www/$path")

        for (candidate in candidatePaths) {
            try {
                val inputStream: InputStream = assets.open(candidate)
                val mimeType = getMimeType(candidate)
                val headers = mapOf(
                    "Access-Control-Allow-Origin" to "*",
                    "Access-Control-Allow-Methods" to "GET, OPTIONS, HEAD",
                    "Access-Control-Allow-Headers" to "*"
                )
                return WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, inputStream)
            } catch (_: Exception) {
                // Try next candidate
            }
        }
        return null
    }

    private fun injectCorsHeaders(response: WebResourceResponse) {
        val headers = response.responseHeaders?.toMutableMap() ?: mutableMapOf()
        headers["Access-Control-Allow-Origin"] = "*"
        headers["Access-Control-Allow-Methods"] = "GET, OPTIONS, HEAD"
        headers["Access-Control-Allow-Headers"] = "*"
        response.responseHeaders = headers
    }

    private fun getMimeType(fileName: String): String {
        return when {
            fileName.endsWith(".html") -> "text/html"
            fileName.endsWith(".js") -> "application/javascript"
            fileName.endsWith(".css") -> "text/css"
            fileName.endsWith(".json") -> "application/json"
            fileName.endsWith(".svg") -> "image/svg+xml"
            fileName.endsWith(".png") -> "image/png"
            fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") -> "image/jpeg"
            fileName.endsWith(".csv") -> "text/csv"
            else -> "application/octet-stream"
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
        Log.i(TAG, "Loading local APK assets: $LOCAL_ASSET_URL")
        webView.loadUrl(LOCAL_ASSET_URL)
    }

    fun showConnectionSettingsDialog() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val currentRemoteUrl = prefs.getString(KEY_SERVER_URL, DEFAULT_REMOTE_URL) ?: DEFAULT_REMOTE_URL
        val currentUseRemote = prefs.getBoolean(KEY_USE_REMOTE, false)

        val options = arrayOf(
            "⚡ Local Standalone (100% Offline from Device APK)",
            "☁️ Cloud Server ($currentRemoteUrl)",
            "🐳 Local Docker Server (http://10.0.2.2:3000)"
        )
        val checkedItem = if (!currentUseRemote) 0 else if (currentRemoteUrl.contains("10.0.2.2")) 2 else 1

        AlertDialog.Builder(this)
            .setTitle("Gatekeeper Engine Mode")
            .setSingleChoiceItems(options, checkedItem) { dialog, which ->
                when (which) {
                    0 -> {
                        prefs.edit().putBoolean(KEY_USE_REMOTE, false).apply()
                        loadLocalAssets()
                        Toast.makeText(this, "Operating in Standalone Offline Mode", Toast.LENGTH_SHORT).show()
                        dialog.dismiss()
                    }
                    1 -> {
                        prefs.edit()
                            .putBoolean(KEY_USE_REMOTE, true)
                            .putString(KEY_SERVER_URL, DEFAULT_REMOTE_URL)
                            .apply()
                        webView.loadUrl(DEFAULT_REMOTE_URL)
                        Toast.makeText(this, "Connecting to Cloud Server...", Toast.LENGTH_SHORT).show()
                        dialog.dismiss()
                    }
                    2 -> {
                        dialog.dismiss()
                        promptDockerServerUrl()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun promptDockerServerUrl() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val input = EditText(this)
        input.setText(prefs.getString(KEY_SERVER_URL, "http://10.0.2.2:3000"))
        input.setSelection(input.text.length)

        AlertDialog.Builder(this)
            .setTitle("Docker / LAN Server IP")
            .setMessage("Enter the local IP or URL of your Docker host:\n• Emulator: http://10.0.2.2:3000\n• Physical Phone Wi-Fi: http://192.168.x.x:3000")
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
