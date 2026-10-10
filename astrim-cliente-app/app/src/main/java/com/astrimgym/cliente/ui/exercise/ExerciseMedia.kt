package com.astrimgym.cliente.ui.exercise

import android.content.Context
import android.graphics.BitmapFactory
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.FitnessCenter
import androidx.compose.material.icons.rounded.PlayCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.airbnb.lottie.compose.LottieAnimation
import com.airbnb.lottie.compose.LottieCompositionSpec
import com.airbnb.lottie.compose.animateLottieCompositionAsState
import com.airbnb.lottie.compose.rememberLottieComposition
import com.astrimgym.cliente.ui.components.AstrimPillButton
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent
import com.astrimgym.cliente.ui.theme.LocalReducedMotion
import com.astrimgym.cliente.ui.theme.Radii
import com.astrimgym.cliente.ui.theme.TextSecondary
import com.astrimgym.cliente.ui.theme.TextTertiary
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Inventario de recursos locales de ejercicios empaquetados en la APK.
 * Se lista una sola vez por proceso (AssetManager.list es barato pero no
 * gratis) y se cachea.
 *
 *   assets/exercise_anim/<clave>.json      → animación Lottie
 *   assets/exercise_img/<clave>.webp|png|jpg → ilustración/foto
 *
 * Ver `ExerciseAssetKeys` para cómo se arma <clave>.
 */
object ExerciseAssetIndex {
    @Volatile private var animations: Set<String>? = null
    @Volatile private var images: Set<String>? = null

    private fun load(context: Context) {
        if (animations != null) return
        val am = context.applicationContext.assets
        animations = runCatching { am.list(ExerciseAssetKeys.ANIM_DIR)?.toSet() }.getOrNull().orEmpty()
        images = runCatching { am.list(ExerciseAssetKeys.IMG_DIR)?.toSet() }.getOrNull().orEmpty()
    }

    fun resolve(context: Context, exerciseId: String?, name: String?, muscleGroup: String?): ExerciseVisual {
        load(context)
        return ExerciseAssetKeys.resolve(exerciseId, name, muscleGroup, animations.orEmpty(), images.orEmpty())
    }
}

/**
 * Zona visual de un ejercicio. Prioridad:
 *   1. Animación local (Lottie) del ejercicio o de su grupo muscular.
 *   2. Ilustración/imagen local.
 *   3. Video del gimnasio (URL): se ofrece con el botón "Ver demostración";
 *      se reproduce bajo demanda, nunca se descarga solo.
 *   4. Respaldo gráfico neutro: ícono del tipo de ejercicio + grupo
 *      muscular. No simula un movimiento humano.
 *
 * Si un recurso falla al cargar, cae al respaldo sin bloquear nada.
 */
@Composable
fun ExerciseMedia(
    exerciseId: String?,
    name: String?,
    muscleGroup: String?,
    isCardio: Boolean,
    modifier: Modifier = Modifier,
    /** true mientras el cliente ejecuta: la animación corre a velocidad normal. */
    active: Boolean = true,
    /** Si hay video del gimnasio, muestra el botón para verlo. */
    onPlayVideo: (() -> Unit)? = null,
    /** Miniatura (tarjeta "Sigue"): sin retícula ni textos en el respaldo. */
    compact: Boolean = false,
) {
    val context = LocalContext.current
    val visual = remember(exerciseId, name, muscleGroup) {
        ExerciseAssetIndex.resolve(context, exerciseId, name, muscleGroup)
    }

    Box(
        modifier = modifier
            .clip(if (compact) Radii.tile else Radii.card)
            .background(if (compact) MaterialTheme.colorScheme.surfaceContainerHigh else MaterialTheme.colorScheme.surface)
            .then(
                if (compact) Modifier
                else Modifier.border(BorderStroke(1.dp, MaterialTheme.colorScheme.outline), Radii.card),
            ),
        contentAlignment = Alignment.Center,
    ) {
        when (visual) {
            is ExerciseVisual.Animation -> LottieOrFallback(visual.assetPath, active, isCardio, muscleGroup)
            is ExerciseVisual.Picture -> PictureOrFallback(visual.assetPath, isCardio, muscleGroup)
            ExerciseVisual.None -> if (compact) CompactFallback(isCardio) else MediaFallback(
                isCardio, muscleGroup, active,
                caption = if (onPlayVideo != null) null else "Sin demostración cargada",
                reserveBottom = if (onPlayVideo != null) 64.dp else 0.dp,
            )
        }
        if (onPlayVideo != null) {
            AstrimPillButton(
                text = "Ver demostración",
                onClick = onPlayVideo,
                icon = Icons.Rounded.PlayCircle,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 12.dp),
            )
        }
    }
}

@Composable
private fun LottieOrFallback(path: String, active: Boolean, isCardio: Boolean, muscleGroup: String?) {
    val result = rememberLottieComposition(LottieCompositionSpec.Asset(path))
    val composition = result.value
    Crossfade(targetState = composition != null && !result.isFailure, label = "lottie") { ok ->
        if (ok && composition != null) {
            val progress by animateLottieCompositionAsState(
                composition = composition,
                iterations = Int.MAX_VALUE,
                speed = if (active) 1f else 0.5f,
            )
            LottieAnimation(
                composition = composition,
                progress = { progress },
                modifier = Modifier.fillMaxSize().padding(12.dp),
            )
        } else {
            MediaFallback(isCardio, muscleGroup, active = false)
        }
    }
}

@Composable
private fun PictureOrFallback(path: String, isCardio: Boolean, muscleGroup: String?) {
    val context = LocalContext.current
    val bitmap by produceState<ImageBitmap?>(initialValue = null, path) {
        value = withContext(Dispatchers.IO) {
            runCatching {
                context.assets.open(path).use { BitmapFactory.decodeStream(it)?.asImageBitmap() }
            }.getOrNull()
        }
    }
    Crossfade(targetState = bitmap, label = "picture") { bmp ->
        if (bmp != null) {
            Image(bmp, contentDescription = null, contentScale = ContentScale.Fit, modifier = Modifier.fillMaxSize().padding(12.dp))
        } else {
            MediaFallback(isCardio, muscleGroup, active = false)
        }
    }
}

/**
 * Respaldo neutro: retícula tenue + ícono del tipo de ejercicio en un aro y
 * el grupo muscular. Una única animación discreta (el aro "respira") solo
 * mientras se ejecuta; se apaga con "reducir movimiento".
 */
@Composable
fun MediaFallback(
    isCardio: Boolean,
    muscleGroup: String?,
    active: Boolean,
    caption: String? = "Sin demostración cargada",
    /** Espacio libre abajo (p. ej. para el botón "Ver demostración"). */
    reserveBottom: androidx.compose.ui.unit.Dp = 0.dp,
) {
    val accent = LocalAstrimAccent.current
    val reduced = LocalReducedMotion.current
    val grid = MaterialTheme.colorScheme.outlineVariant
    val breathe = if (active && !reduced) {
        val t = rememberInfiniteTransition(label = "fallback")
        t.animateFloat(
            initialValue = 1f, targetValue = 1.06f,
            animationSpec = infiniteRepeatable(tween(1600), RepeatMode.Reverse),
            label = "breathe",
        ).value
    } else 1f

    androidx.compose.foundation.layout.BoxWithConstraints(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        // El aro se adapta al alto disponible; los textos solo si hay lugar.
        val available = maxHeight - reserveBottom
        val ring = minOf(88.dp, available * 0.5f)
        val showText = available > 170.dp
        Canvas(Modifier.fillMaxSize()) {
            val step = 28.dp.toPx()
            var x = step
            while (x < size.width) {
                drawLine(grid, Offset(x, 0f), Offset(x, size.height), strokeWidth = 1f)
                x += step
            }
            var y = step
            while (y < size.height) {
                drawLine(grid, Offset(0f, y), Offset(size.width, y), strokeWidth = 1f)
                y += step
            }
        }
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(bottom = reserveBottom),
        ) {
            Box(
                modifier = Modifier
                    .size(ring)
                    .scale(breathe)
                    .clip(CircleShape)
                    .background(accent.soft)
                    .border(1.5.dp, accent.border, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    if (isCardio) Icons.Outlined.DirectionsRun else Icons.Outlined.FitnessCenter,
                    contentDescription = null,
                    tint = accent.base,
                    modifier = Modifier.size(ring * 0.45f),
                )
            }
            if (!showText) return@Column
            Spacer(Modifier.height(12.dp))
            Text(
                muscleGroup?.takeIf { it.isNotBlank() }?.uppercase() ?: if (isCardio) "CARDIO" else "FUERZA",
                style = MaterialTheme.typography.labelMedium,
                color = TextSecondary,
                textAlign = TextAlign.Center,
            )
            caption?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = TextTertiary)
            }
        }
    }
}

@Composable
private fun CompactFallback(isCardio: Boolean) {
    Icon(
        if (isCardio) Icons.Outlined.DirectionsRun else Icons.Outlined.FitnessCenter,
        contentDescription = null,
        tint = LocalAstrimAccent.current.base,
        modifier = Modifier.size(28.dp),
    )
}
