package com.astrimgym.cliente.ui.exercise

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import com.airbnb.lottie.compose.LottieAnimation
import com.airbnb.lottie.compose.LottieClipSpec
import com.airbnb.lottie.compose.LottieCompositionSpec
import com.airbnb.lottie.compose.animateLottieCompositionAsState
import com.airbnb.lottie.compose.rememberLottieComposition
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent
import java.util.Locale

/**
 * Estado del entrenamiento que la animación del ejercicio refleja.
 * La zona central del Modo Entrenamiento cambia según esto.
 */
enum class ExercisePose { READY, ACTIVE, REST, DONE }

/**
 * Zona central de animación del ejercicio.
 *
 * ARQUITECTURA — se prioriza una animación profesional Lottie por ejercicio:
 *
 *   1. Si existe `assets/exercise_anim/<key>.json` (key = slug del grupo
 *      muscular o del nombre del ejercicio), se reproduce en loop, con
 *      transiciones suaves entre poses (READY/ACTIVE/REST/DONE mapean a
 *      segmentos o velocidad de la composición).
 *   2. Mientras no haya .json cargado, se dibuja un fallback premium en
 *      Compose: anillos concéntricos + núcleo que "respira", cuya velocidad
 *      y escala responden a la pose. Nunca una imagen estática ni un GIF.
 *
 * Para sumar animaciones: dejar los `.json` (o `.lottie`) exportados en
 * `app/src/main/assets/exercise_anim/` con el nombre del slug. No hace
 * falta tocar código. Ver el README de esa carpeta.
 */
@Composable
fun ExerciseAnimation(
    animationKey: String?,
    pose: ExercisePose,
    modifier: Modifier = Modifier,
) {
    val composition by rememberLottieComposition(
        LottieCompositionSpec.Asset("exercise_anim/${animationKey ?: "__none__"}.json"),
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(1f),
        contentAlignment = Alignment.Center,
    ) {
        Crossfade(targetState = composition != null, label = "exAnim") { hasLottie ->
            if (hasLottie && composition != null) {
                val speed = when (pose) {
                    ExercisePose.ACTIVE -> 1f
                    ExercisePose.READY -> 0.55f
                    ExercisePose.REST -> 0.3f
                    ExercisePose.DONE -> 0f
                }
                val progress by animateLottieCompositionAsState(
                    composition = composition,
                    iterations = Int.MAX_VALUE,
                    speed = speed.coerceAtLeast(0.01f),
                    clipSpec = LottieClipSpec.Progress(0f, 1f),
                )
                LottieAnimation(composition = composition, progress = { progress })
            } else {
                FallbackPulse(pose)
            }
        }
    }
}

/** Fallback dibujado en Compose — anillos + núcleo que reaccionan a la pose. */
@Composable
private fun FallbackPulse(pose: ExercisePose) {
    val accent = LocalAstrimAccent.current
    val transition = rememberInfiniteTransition(label = "pulse")

    val spin by transition.animateFloat(
        initialValue = 0f, targetValue = 360f,
        animationSpec = infiniteRepeatable(
            tween(
                durationMillis = when (pose) {
                    ExercisePose.ACTIVE -> 3200
                    ExercisePose.READY -> 6000
                    ExercisePose.REST -> 9000
                    ExercisePose.DONE -> 14000
                },
                easing = LinearEasing,
            ),
            RepeatMode.Restart,
        ),
        label = "spin",
    )
    val breath by transition.animateFloat(
        initialValue = 0f, targetValue = 1f,
        animationSpec = infiniteRepeatable(
            tween(if (pose == ExercisePose.ACTIVE) 1400 else 2600, easing = LinearEasing),
            RepeatMode.Reverse,
        ),
        label = "breath",
    )
    val intensity by animateFloatAsState(
        targetValue = when (pose) {
            ExercisePose.ACTIVE -> 1f
            ExercisePose.READY -> 0.7f
            ExercisePose.REST -> 0.4f
            ExercisePose.DONE -> 0.55f
        },
        animationSpec = tween(600),
        label = "intensity",
    )

    Canvas(Modifier.fillMaxWidth().aspectRatio(1f)) {
        val c = Offset(size.width / 2f, size.height / 2f)
        val unit = size.minDimension / 2f

        // Halo
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    accent.base.copy(alpha = 0.22f * intensity),
                    accent.base.copy(alpha = 0f),
                ),
                center = c,
                radius = unit * (0.85f + 0.15f * breath),
            ),
            radius = unit,
            center = c,
        )

        // Anillos concéntricos
        val rings = 3
        for (i in 0 until rings) {
            val r = unit * (0.42f + i * 0.20f) * (1f + 0.03f * breath)
            rotate(degrees = spin * (if (i % 2 == 0) 1f else -1f) * (1f + i * 0.3f), pivot = c) {
                drawArc(
                    brush = Brush.sweepGradient(
                        listOf(
                            accent.base.copy(alpha = 0f),
                            accent.base.copy(alpha = 0.15f + 0.35f * intensity),
                            accent.base.copy(alpha = 0f),
                        ),
                        center = c,
                    ),
                    startAngle = 0f,
                    sweepAngle = 210f - i * 30f,
                    useCenter = false,
                    topLeft = Offset(c.x - r, c.y - r),
                    size = androidx.compose.ui.geometry.Size(r * 2, r * 2),
                    style = Stroke(width = (3.5f - i * 0.7f).coerceAtLeast(1.2f) * density, cap = StrokeCap.Round),
                )
            }
        }

        // Núcleo
        drawCircle(
            brush = Brush.radialGradient(
                listOf(accent.base, accent.base.copy(alpha = 0.35f)),
                center = c.copy(y = c.y - unit * 0.05f),
                radius = unit * 0.30f,
            ),
            radius = unit * (0.16f + 0.03f * breath) * (0.7f + 0.3f * intensity),
            center = c,
        )
    }
}

/**
 * Deriva la clave de animación de un ejercicio. Preferimos el grupo
 * muscular (menos archivos, más reutilización); si no hay, el nombre.
 */
fun exerciseAnimationKey(exerciseName: String?, muscleGroup: String?, equipment: String?): String? {
    val source = muscleGroup?.takeIf { it.isNotBlank() }
        ?: exerciseName?.takeIf { it.isNotBlank() }
        ?: return null
    return slugify(source)
}

private fun slugify(raw: String): String = raw
    .trim()
    .lowercase(Locale.ROOT)
    .replace(Regex("[áàä]"), "a")
    .replace(Regex("[éèë]"), "e")
    .replace(Regex("[íìï]"), "i")
    .replace(Regex("[óòö]"), "o")
    .replace(Regex("[úùü]"), "u")
    .replace(Regex("[^a-z0-9]+"), "_")
    .trim('_')
