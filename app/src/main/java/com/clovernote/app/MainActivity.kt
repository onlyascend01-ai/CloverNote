package com.clovernote.app

import android.annotation.SuppressLint
import android.graphics.Color
import android.net.http.SslError
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        
        // SOFTWARE mode is more stable on emulators and prevents the black screen
        webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null)
        webView.setBackgroundColor(Color.WHITE)
        
        setContentView(webView)

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.databaseEnabled = true
        
        // Cache settings to help with WiFi lag
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                Log.d("CloverNoteJS", "${consoleMessage?.message()}")
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                handler?.proceed() 
            }
        }
        
        webView.loadUrl("file:///android_asset/index.html")
    }
}
