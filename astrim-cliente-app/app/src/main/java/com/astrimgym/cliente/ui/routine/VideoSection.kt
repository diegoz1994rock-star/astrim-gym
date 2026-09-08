package com.astrimgym.cliente.ui.routine

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.PlayerConstants
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.YouTubePlayer
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.listeners.AbstractYouTubePlayerListener
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.options.IFramePlayerOptions
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.views.YouTubePlayerView
import kotlinx.coroutines.delay

enum class VideoKind { YOUTUBE, OTHER, NONE }

data class VideoInfo(val kind: VideoKind, val url: String, val youtubeId: String?)

/**
 * Acepta la URL tal cual la carga el entrenador en el panel. Si no trae
 * esquema, le antepone https://. Reconoce YouTube (watch, youtu.be, shorts,
 * embed) para reproducirlo embebido; cualquier otra URL http(s) se abre
 * afuera.
 */
fun parseVideo(raw: String?): VideoInfo {
    val trimmed = raw?.trim().orEmpty()
    if (trimmed.isEmpty()) return VideoInfo(VideoKind.NONE, "", null)

    val withScheme = if (trimmed.contains("://")) trimmed else "https://$trimmed"
    val uri = runCatching { Uri.parse(withScheme) }.getOrNull()
        ?: return VideoInfo(VideoKind.NONE, "", null)
    val scheme = uri.scheme?.lowercase()
    if (scheme != "http" && scheme != "https") return VideoInfo(VideoKind.NONE, "", null)

    val host = uri.host?.removePrefix("www.")?.lowercase().orEmpty()
    val ytId: String? = when {
        host == "youtu.be" -> uri.lastPathSegment
        host == "youtube.com" || host == "m.youtube.com" -> {
            uri.getQueryParameter("v")
                ?: uri.pathSegments?.let { seg ->
                    val i = seg.indexOfFirst { it == "shorts" || it == "embed" }
                    if (i >= 0 && i + 1 < seg.size) seg[i + 1] else null
                }
        }
        else -> null
    }

    return when {
        !ytId.isNullOrBlank() -> VideoInfo(VideoKind.YOUTUBE, withScheme, ytId)
        else -> VideoInfo(VideoKind.OTHER, withScheme, null)
    }
}

@Composable
fun VideoSection(rawUrl: String?, modifier: Modifier = Modifier) {
    val info = parseVideo(rawUrl)
    val context = LocalContext.current
    if (info.kind == VideoKind.NONE) return

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        when (info.kind) {
            VideoKind.YOUTUBE -> {
                AstrimVideoPlayer(
                    youtubeId = info.youtubeId.orEmpty(),
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(
                    "Reproducido desde YouTube",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            VideoKind.OTHER -> {
                com.astrimgym.cliente.ui.components.AstrimButton(
                    text = "Ver ejercicio en video",
                    onClick = {
                        runCatching {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(info.url)))
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    icon = { Icon(Icons.Filled.PlayArrow, contentDescription = null) },
                )
            }
            VideoKind.NONE -> Unit
        }
    }
}

/**
 * Reproductor propio: el video de YouTube se ve embebido dentro de la app,
 * con controles dibujados por nosotros (play/pausa, barra de progreso,
 * repetir). Nunca abre la app de YouTube. El iframe de YouTube va sin
 * controles (`controls(0)`) y el video queda "en cola": no descarga nada
 * hasta que el usuario toca reproducir.
 */
@Composable
private fun AstrimVideoPlayer(youtubeId: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var player by remember { mutableStateOf<YouTubePlayer?>(null) }
    var playerState by remember { mutableStateOf(PlayerConstants.PlayerState.UNKNOWN) }
    var position by remember { mutableFloatStateOf(0f) }
    var duration by remember { mutableFloatStateOf(0f) }
    var scrubbing by remember { mutableStateOf(false) }
    var scrubValue by remember { mutableFloatStateOf(0f) }
    var controlsVisible by remember { mutableStateOf(true) }

    val playerView = remember {
        YouTubePlayerView(context).apply { enableAutomaticInitialization = false }
    }

    DisposableEffect(lifecycleOwner, playerView) {
        lifecycleOwner.lifecycle.addObserver(playerView)
        val listener = object : AbstractYouTubePlayerListener() {
            override fun onReady(youTubePlayer: YouTubePlayer) {
                player = youTubePlayer
                youTubePlayer.cueVideo(youtubeId, 0f)
            }

            override fun onStateChange(
                youTubePlayer: YouTubePlayer,
                state: PlayerConstants.PlayerState,
            ) {
                playerState = state
                controlsVisible = state != PlayerConstants.PlayerState.PLAYING
            }

            override fun onCurrentSecond(youTubePlayer: YouTubePlayer, second: Float) {
                if (!scrubbing) position = second
            }

            override fun onVideoDuration(youTubePlayer: YouTubePlayer, duration_: Float) {
                duration = duration_
            }
        }
        playerView.initialize(
            listener,
            IFramePlayerOptions.Builder()
                .controls(0)
                .rel(0)
                .ivLoadPolicy(3)
                // `origin` fija la baseURL del WebView del reproductor. Con el
                // default `https://www.youtube.com`, la IFrame API de YouTube
                // (endurecida en 2024/25) rechaza el embed de varios videos con
                // "Error 152/153 · video no disponible" aunque sí permitan
                // insertarse. Usar el paquete de la app como origin
                // (com.astrimgym.cliente) es un origen válido y distinto que la
                // API acepta — es exactamente lo que hace la lib en la v13.
                .origin("https://${context.packageName}")
                .build(),
        )
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(playerView)
            playerView.release()
        }
    }

    // Oculta los controles solos mientras se reproduce.
    LaunchedEffect(controlsVisible, playerState) {
        if (controlsVisible && playerState == PlayerConstants.PlayerState.PLAYING) {
            delay(2600)
            controlsVisible = false
        }
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(16f / 9f)
            .clip(RoundedCornerShape(16.dp))
            .background(Color.Black),
    ) {
        AndroidView(modifier = Modifier.fillMaxSize(), factory = { playerView })

        // Capa para mostrar/ocultar controles al tocar el video.
        Box(
            Modifier
                .matchParentSize()
                .pointerInput(Unit) {
                    detectTapGestures { controlsVisible = !controlsVisible }
                },
        )

        AnimatedVisibility(
            visible = controlsVisible,
            modifier = Modifier.matchParentSize(),
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.32f)),
            ) {
                when (playerState) {
                    PlayerConstants.PlayerState.BUFFERING -> CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.align(Alignment.Center),
                    )

                    else -> {
                        val ended = playerState == PlayerConstants.PlayerState.ENDED
                        val playing = playerState == PlayerConstants.PlayerState.PLAYING
                        Box(
                            Modifier
                                .align(Alignment.Center)
                                .size(58.dp)
                                .clip(CircleShape)
                                .background(Color.Black.copy(alpha = 0.45f))
                                .pointerInput(playerState) {
                                    detectTapGestures {
                                        val p = player ?: return@detectTapGestures
                                        when {
                                            ended -> {
                                                p.seekTo(0f)
                                                p.play()
                                            }

                                            playing -> p.pause()
                                            else -> p.play()
                                        }
                                    }
                                },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = when {
                                    ended -> Icons.Filled.Replay
                                    playing -> Icons.Filled.Pause
                                    else -> Icons.Filled.PlayArrow
                                },
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(30.dp),
                            )
                        }
                    }
                }

                Row(
                    Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        formatClock(if (scrubbing) scrubValue else position),
                        color = Color.White,
                        style = MaterialTheme.typography.labelSmall,
                    )
                    Slider(
                        value = (if (scrubbing) scrubValue else position)
                            .coerceIn(0f, duration.coerceAtLeast(0f)),
                        onValueChange = {
                            scrubbing = true
                            scrubValue = it
                        },
                        onValueChangeFinished = {
                            player?.seekTo(scrubValue)
                            position = scrubValue
                            scrubbing = false
                        },
                        valueRange = 0f..duration.coerceAtLeast(1f),
                        modifier = Modifier
                            .weight(1f)
                            .padding(horizontal = 8.dp),
                        colors = SliderDefaults.colors(
                            thumbColor = Color.White,
                            activeTrackColor = Color.White,
                            inactiveTrackColor = Color.White.copy(alpha = 0.30f),
                        ),
                    )
                    Text(
                        formatClock(duration),
                        color = Color.White,
                        style = MaterialTheme.typography.labelSmall,
                    )
                }
            }
        }
    }
}

private fun formatClock(seconds: Float): String {
    val total = seconds.toInt().coerceAtLeast(0)
    return "%d:%02d".format(total / 60, total % 60)
}
