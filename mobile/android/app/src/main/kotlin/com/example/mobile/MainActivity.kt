package com.example.mobile

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.Locale
import kotlin.concurrent.thread
import kotlin.math.PI
import kotlin.math.sin

class MainActivity : FlutterActivity(), TextToSpeech.OnInitListener {
    private val channelName = "et.ethioalert/alarm"
    private val criticalChannelId = "ethioalert_critical"
    private val standardChannelId = "ethioalert_standard"
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var pendingSpeech: String? = null

    @Volatile
    private var isSirenPlaying = false
    private var activeTrack: AudioTrack? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        tts = TextToSpeech(this, this)
        ensureNotificationChannels()
        requestNotificationPermissionIfNeeded()

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "playAmbulanceAlarm" -> {
                        val title = call.argument<String>("title") ?: "EthioAlert Emergency"
                        val body = call.argument<String>("body") ?: "Emergency broadcast active."
                        val text = call.argument<String>("text") ?: "Emergency Alert! Please check EthioAlert immediately."
                        val durationMs = call.argument<Int>("durationMs") ?: 3600
                        val isCritical = call.argument<Boolean>("isCritical") ?: true
                        showEmergencyNotification(title, body, isCritical)
                        if (isCritical) {
                            playLoudAmbulanceAndVoice(text, durationMs)
                        } else {
                            speakLoudly(text)
                        }
                        result.success(true)
                    }
                    "showNotification" -> {
                        val title = call.argument<String>("title") ?: "EthioAlert"
                        val body = call.argument<String>("body") ?: ""
                        val isCritical = call.argument<Boolean>("isCritical") ?: false
                        showEmergencyNotification(title, body, isCritical)
                        result.success(true)
                    }
                    "stopAlarm" -> {
                        stopAllAlarms()
                        result.success(true)
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
            }
        }
    }

    private fun ensureNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val criticalChannel = NotificationChannel(
                criticalChannelId,
                "Critical Emergency Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "High-priority critical alerts with ambulance alarm and voice warning"
                enableLights(true)
                lightColor = Color.RED
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 400, 200, 400, 200, 600)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            manager.createNotificationChannel(criticalChannel)

            val standardChannel = NotificationChannel(
                standardChannelId,
                "Regional Safety Advisories",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Regional emergency notifications and advisories"
                enableVibration(true)
            }
            manager.createNotificationChannel(standardChannel)
        }
    }

    private fun showEmergencyNotification(title: String, body: String, isCritical: Boolean) {
        try {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val pendingIntent = PendingIntent.getActivity(this, 0, intent, pendingFlags)

            val channelId = if (isCritical) criticalChannelId else standardChannelId
            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, channelId)
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(this)
            }

            builder
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(Notification.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)

            if (isCritical) {
                builder.setColor(Color.RED)
            }

            manager.notify(if (isCritical) 9001 else 9002, builder.build())
        } catch (_: Exception) {
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale.US
            ttsReady = true
            pendingSpeech?.let {
                speakLoudly(it)
                pendingSpeech = null
            }
        }
    }

    private fun boostVolume() {
        try {
            val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val maxMusic = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val currentMusic = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
            if (currentMusic < (maxMusic * 0.85).toInt()) {
                audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, maxMusic, 0)
            }
        } catch (_: Exception) {
        }
    }

    private fun playLoudAmbulanceAndVoice(text: String, durationMs: Int) {
        stopAllAlarms()
        boostVolume()
        isSirenPlaying = true

        thread(start = true) {
            val sampleRate = 22050
            val totalSamples = (sampleRate * (durationMs / 1000.0)).toInt()
            val buffer = ShortArray(totalSamples)

            // Realistic Ambulance Hi-Lo / Wail Siren (660 Hz <-> 960 Hz) at high amplitude
            var phase = 0.0
            for (i in 0 until totalSamples) {
                val t = i.toDouble() / sampleRate
                val cycle = (t % 0.8) / 0.8
                val freq = if (cycle < 0.5) {
                    660.0 + (960.0 - 660.0) * (cycle * 2.0)
                } else {
                    960.0 - (960.0 - 660.0) * ((cycle - 0.5) * 2.0)
                }
                phase += 2.0 * PI * freq / sampleRate
                val sample = (0.82 * sin(phase) + 0.15 * sin(2.0 * phase))
                buffer[i] = (sample * Short.MAX_VALUE).toInt().coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
            }

            try {
                val minBuf = AudioTrack.getMinBufferSize(
                    sampleRate,
                    AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT
                )
                val track = AudioTrack.Builder()
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setSampleRate(sampleRate)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build()
                    )
                    .setBufferSizeInBytes(maxOf(minBuf, buffer.size * 2))
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()

                activeTrack = track
                track.write(buffer, 0, buffer.size)
                track.play()

                Thread.sleep(durationMs.toLong())
                if (isSirenPlaying) {
                    runOnUiThread { speakLoudly(text) }
                }
            } catch (_: Exception) {
                runOnUiThread { speakLoudly(text) }
            }
        }
    }

    private fun speakLoudly(text: String) {
        if (!ttsReady) {
            pendingSpeech = text
            return
        }
        try {
            val params = Bundle()
            params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f)
            tts?.setSpeechRate(0.98f)
            tts?.setPitch(1.05f)
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, params, "ETHIO_ALERT_ALARM")
        } catch (_: Exception) {
        }
    }

    private fun stopAllAlarms() {
        isSirenPlaying = false
        try {
            activeTrack?.stop()
            activeTrack?.release()
            activeTrack = null
        } catch (_: Exception) {
        }
        try {
            tts?.stop()
        } catch (_: Exception) {
        }
    }

    override fun onDestroy() {
        stopAllAlarms()
        tts?.shutdown()
        super.onDestroy()
    }
}
