package com.astrimgym.cliente.ui.workout

import android.app.Activity
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.WindowManager
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.astrimgym.cliente.audio.Sfx
import com.astrimgym.cliente.audio.rememberSounds
import com.astrimgym.cliente.data.repository.WorkoutRepository
import com.astrimgym.cliente.ui.common.ViewModelFactory
import com.astrimgym.cliente.ui.components.AstrimButton
import com.astrimgym.cliente.ui.components.AstrimCard
import com.astrimgym.cliente.ui.components.AstrimOutlineButton
import com.astrimgym.cliente.ui.components.AstrimPillButton
import com.astrimgym.cliente.ui.components.AstrimSpinner
import com.astrimgym.cliente.ui.components.AstrimStepper
import com.astrimgym.cliente.ui.components.Eyebrow
import com.astrimgym.cliente.ui.components.ProgressRing
import com.astrimgym.cliente.ui.components.rememberHaptics
import com.astrimgym.cliente.ui.exercise.ExerciseAnimation
import com.astrimgym.cliente.ui.exercise.ExercisePose
import com.astrimgym.cliente.ui.exercise.exerciseAnimationKey
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent

@Composable
fun WorkoutModeScreen(
    workoutRepository: WorkoutRepository,
    routineId: String,
    onExit: () -> Unit,
) {
    val viewModel: WorkoutViewModel = viewModel(
        factory = ViewModelFactory { WorkoutViewModel(workoutRepository, routineId) },
    )
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    DisposableEffect(Unit) {
        val window = (context as? Activity)?.window
        window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose { window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
    }

    // Toda la capa de sonido/feedback del entrenamiento vive acá, reusando
    // los eventos y el estado del ViewModel (no hay temporizador nuevo).
    WorkoutSoundEffects(state, viewModel)

    BackHandler(enabled = state.phase != WorkoutPhase.FINISHED) {
        if (!state.paused) viewModel.togglePause()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        when (state.phase) {
            WorkoutPhase.LOADING -> Center { AstrimSpinner() }
            WorkoutPhase.ERROR -> Center {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        state.errorMessage ?: "Error",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(32.dp),
                    )
                    AstrimOutlineButton("Volver", onExit)
                }
            }
            WorkoutPhase.FINISHED -> SummaryContent(state, viewModel, onExit)
            else -> Column(
                Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .navigationBarsPadding(),
            ) {
                WorkoutTopBar(
                    elapsed = state.elapsedSeconds,
                    progress = workoutProgress(state),
                    onPause = viewModel::togglePause,
                    onClose = viewModel::finishNow,
                )
                AnimatedContent(
                    targetState = state.phase,
                    transitionSpec = { fadeIn(tween280()) togetherWith fadeOut(tween280()) },
                    label = "phase",
                    modifier = Modifier.fillMaxSize(),
                ) { phase ->
                    when (phase) {
                        WorkoutPhase.EXERCISE -> ExerciseContent(state, viewModel)
                        WorkoutPhase.REST -> RestContent(state, viewModel)
                        WorkoutPhase.EXERCISE_DONE -> ExerciseDoneContent(state, viewModel)
                        else -> Box(Modifier.fillMaxSize())
                    }
                }
            }
        }

        if (state.paused && state.phase != WorkoutPhase.FINISHED) {
            PausedOverlay(
                elapsed = state.elapsedSeconds,
                onResume = viewModel::togglePause,
                onFinish = viewModel::finishNow,
            )
        }
    }
}

private fun tween280() = androidx.compose.animation.core.tween<Float>(280)

private fun workoutProgress(s: WorkoutUiState): Float {
    if (s.totalExercises == 0) return 0f
    val ex = s.currentExercise
    val setsInEx = (ex?.targetSets ?: 1).coerceAtLeast(1)
    val setFraction = ((s.setNumber - 1).coerceAtLeast(0)).toFloat() / setsInEx
    return ((s.exerciseIndex + setFraction) / s.totalExercises).coerceIn(0f, 1f)
}

@Composable
private fun Center(content: @Composable () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) { content() }
}

/**
 * Capa de sonido + feedback del Modo Entrenamiento. Centraliza TODO el audio
 * de la pantalla y se apoya solo en el estado y los eventos que ya expone el
 * ViewModel — no crea temporizadores ni lógica de conteo.
 *
 *  - START al iniciar la sesión (primer EXERCISE).
 *  - PAUSE / RESUME en las transiciones de `paused`.
 *  - REWARD al terminar un ejercicio, FINISH al terminar el entrenamiento.
 *  - Cuenta regresiva del descanso: aviso a los 10 s, tick 9→4 con el tono
 *    subiendo, tick urgente 3→1, y GO al llegar a 0 (evento del ViewModel).
 *  - Cuenta regresiva del cronómetro de cardio al acercarse a su objetivo.
 */
@Composable
private fun WorkoutSoundEffects(state: WorkoutUiState, vm: WorkoutViewModel) {
    val sounds = rememberSounds()
    val haptics = rememberHaptics()
    val context = LocalContext.current

    var started by remember { mutableStateOf(false) }
    LaunchedEffect(state.phase) {
        if (!started && state.phase == WorkoutPhase.EXERCISE) {
            started = true
            sounds.play(Sfx.START)
        }
        when (state.phase) {
            // Descanso entre series -> serie completada (el cambio de
            // ejercicio no cuenta como "serie").
            WorkoutPhase.REST -> if (started && !state.betweenExercises) sounds.play(Sfx.SET_COMPLETE)
            WorkoutPhase.EXERCISE_DONE -> sounds.play(Sfx.REWARD)
            WorkoutPhase.FINISHED -> sounds.play(Sfx.FINISH)
            else -> {}
        }
    }

    var wasPaused by remember { mutableStateOf(false) }
    LaunchedEffect(state.paused) {
        if (started && state.paused != wasPaused) {
            sounds.play(if (state.paused) Sfx.PAUSE else Sfx.RESUME)
        }
        wasPaused = state.paused
    }

    // Fin del descanso: evento único del ViewModel.
    LaunchedEffect(Unit) {
        vm.events.collect {
            sounds.play(Sfx.GO)
            haptics.confirm()
            runCatching {
                context.getSystemService(Vibrator::class.java)
                    ?.vibrate(VibrationEffect.createOneShot(300, VibrationEffect.DEFAULT_AMPLITUDE))
            }
        }
    }

    // Cuenta regresiva del DESCANSO.
    var lastRestTick by remember { mutableStateOf(-1) }
    LaunchedEffect(state.restRemaining, state.phase, state.paused) {
        if (state.phase != WorkoutPhase.REST || state.paused) {
            lastRestTick = -1
        } else {
            countdownBeep(state.restRemaining, lastRestTick, sounds, haptics)?.let { lastRestTick = it }
        }
    }

    // Cuenta regresiva del CRONÓMETRO DE CARDIO (cuenta hacia arriba hasta el
    // objetivo — acá solo suena, no corta el ejercicio).
    val ex = state.currentExercise
    val cardioLeft = if (
        state.phase == WorkoutPhase.EXERCISE && ex?.isCardio == true && ex.targetTimeSeconds != null
    ) (ex.targetTimeSeconds - state.exerciseElapsedSeconds).toInt() else NO_CARDIO
    var lastCardioTick by remember(ex?.exerciseId) { mutableStateOf(-1) }
    var cardioGoPlayed by remember(ex?.exerciseId) { mutableStateOf(false) }
    LaunchedEffect(cardioLeft, state.paused) {
        if (state.paused || cardioLeft == NO_CARDIO) return@LaunchedEffect
        if (cardioLeft <= 0) {
            if (!cardioGoPlayed) {
                cardioGoPlayed = true
                sounds.play(Sfx.GO)
                haptics.confirm()
            }
        } else {
            countdownBeep(cardioLeft, lastCardioTick, sounds, haptics)?.let { lastCardioTick = it }
        }
    }
}

private const val NO_CARDIO = Int.MIN_VALUE

/**
 * Emite el "beep" de la cuenta regresiva para [remaining] si corresponde
 * (1..10 y distinto del último emitido). El tono sube progresivamente para
 * dar sensación de urgencia; 3..1 usan el tick urgente y háptico más fuerte.
 * Devuelve el segundo emitido (para deduplicar), o null si no sonó.
 */
private fun countdownBeep(
    remaining: Int,
    last: Int,
    sounds: com.astrimgym.cliente.audio.SoundManager,
    haptics: com.astrimgym.cliente.ui.components.Haptics,
): Int? {
    if (remaining !in 1..10 || remaining == last) return null
    when {
        remaining == 10 -> {
            sounds.play(Sfx.COUNTDOWN_ENTER)
            haptics.tick()
        }
        remaining >= 4 -> {
            // 9 → 4: el tono sube de x1.0 a ~x1.18.
            val rate = 1f + (9 - remaining) * 0.036f
            sounds.play(Sfx.TICK, rateOverride = rate)
            haptics.tick()
        }
        else -> {
            // 3 → 1: urgente, sube de ~x1.06 a ~x1.20, háptico marcado.
            val rate = 1.06f + (3 - remaining) * 0.07f
            sounds.play(Sfx.TICK_URGENT, rateOverride = rate)
            haptics.press()
        }
    }
    return remaining
}

private fun mmss(totalSeconds: Long): String {
    val s = totalSeconds.coerceAtLeast(0)
    return "%d:%02d".format(s / 60, s % 60)
}

private fun trimNum(v: Double): String = if (v % 1.0 == 0.0) v.toInt().toString() else "%.1f".format(v)

@Composable
private fun WorkoutTopBar(
    elapsed: Long,
    progress: Float,
    onPause: () -> Unit,
    onClose: () -> Unit,
) {
    val accent = LocalAstrimAccent.current
    val haptics = rememberHaptics()
    val shown by animateFloatAsState(progress, label = "wProg")
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            RoundGlyphButton(Icons.Rounded.Close, "Terminar") { haptics.tick(); onClose() }
            Spacer(Modifier.weight(1f))
            Text(
                mmss(elapsed),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.weight(1f))
            // El sonido de pausa/reanudar lo emite WorkoutSoundEffects.
            RoundGlyphButton(Icons.Rounded.Pause, "Pausar", sound = null) { haptics.tick(); onPause() }
        }
        Box(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .height(4.dp)
                .clip(CircleShape)
                .background(accent.base.copy(alpha = 0.12f)),
        ) {
            Box(
                Modifier
                    .fillMaxWidth(shown)
                    .height(4.dp)
                    .clip(CircleShape)
                    .background(accent.base),
            )
        }
    }
}

@Composable
private fun RoundGlyphButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    cd: String,
    sound: Sfx? = Sfx.TAP,
    onClick: () -> Unit,
) {
    val sounds = rememberSounds()
    Icon(
        icon,
        contentDescription = cd,
        tint = MaterialTheme.colorScheme.onSurface,
        modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.surface)
            .clickable { sound?.let(sounds::play); onClick() }
            .padding(9.dp),
    )
}

@Composable
private fun ExerciseContent(state: WorkoutUiState, vm: WorkoutViewModel) {
    val ex = state.currentExercise ?: return
    val accent = LocalAstrimAccent.current
    val haptics = rememberHaptics()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(4.dp))
        Eyebrow("Ejercicio ${state.exerciseIndex + 1} de ${state.totalExercises}")
        Spacer(Modifier.height(8.dp))
        Text(
            ex.name,
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center,
        )
        ex.notes?.takeIf { it.isNotBlank() }?.let {
            Spacer(Modifier.height(6.dp))
            Text(
                it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }

        Spacer(Modifier.height(8.dp))
        ExerciseAnimation(
            animationKey = remember(ex.exerciseId) {
                exerciseAnimationKey(ex.name, null, null)
            },
            pose = ExercisePose.ACTIVE,
            modifier = Modifier.fillMaxWidth(0.82f),
        )
        Spacer(Modifier.height(8.dp))

        if (ex.isCardio) {
            CardioBlock(ex = ex, elapsed = state.exerciseElapsedSeconds)
            Spacer(Modifier.height(28.dp))
            AstrimButton(
                text = "Terminar ejercicio",
                onClick = { haptics.confirm(); vm.completeSet() },
                modifier = Modifier.fillMaxWidth(),
                height = 58.dp,
                sound = null, // el sonido lo maneja WorkoutSoundEffects
            )
        } else {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(
                    "SERIE ${state.setNumber} / ${ex.targetSets}",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                ex.targetReps?.let {
                    Text(
                        "· objetivo $it reps",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            Spacer(Modifier.height(22.dp))
            AstrimStepper(
                label = "Peso",
                unit = "kg",
                value = state.weight?.let { trimNum(it) } ?: "—",
                onMinus = { vm.changeWeight(-2.5) },
                onPlus = { vm.changeWeight(2.5) },
            )
            Spacer(Modifier.height(18.dp))
            AstrimStepper(
                label = "Repeticiones",
                value = state.reps?.toString() ?: "—",
                onMinus = { vm.changeReps(-1) },
                onPlus = { vm.changeReps(1) },
            )

            Spacer(Modifier.height(28.dp))
            AstrimButton(
                text = "Completar serie",
                onClick = { haptics.confirm(); vm.completeSet() },
                modifier = Modifier.fillMaxWidth(),
                height = 58.dp,
                sound = null, // el sonido lo maneja WorkoutSoundEffects
            )
        }
        Spacer(Modifier.height(24.dp))
    }
}

/** Panel del ejercicio de cardio: cronómetro + objetivos, sin series ni peso. */
@Composable
private fun CardioBlock(
    ex: com.astrimgym.cliente.data.repository.WorkoutExercise,
    elapsed: Long,
) {
    val accent = LocalAstrimAccent.current
    val target = ex.targetTimeSeconds?.toLong()
    val progress = if (target != null && target > 0) (elapsed.toFloat() / target).coerceIn(0f, 1f) else 0f

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        ProgressRing(progress = progress, diameter = 220.dp, stroke = 12.dp) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    mmss(elapsed),
                    style = MaterialTheme.typography.displayMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                target?.let {
                    Text(
                        "objetivo ${mmss(it)}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        ex.cardioTargets?.let {
            Spacer(Modifier.height(18.dp))
            AstrimCard(modifier = Modifier.fillMaxWidth()) {
                Text(
                    "OBJETIVO",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    it,
                    style = MaterialTheme.typography.titleMedium,
                    color = accent.base,
                )
            }
        }
    }
}

@Composable
private fun RestContent(state: WorkoutUiState, vm: WorkoutViewModel) {
    val progress = if (state.restTotal > 0) state.restRemaining.toFloat() / state.restTotal else 0f
    val nextEx = state.exercises.getOrNull(
        if (state.betweenExercises) state.exerciseIndex + 1 else state.exerciseIndex,
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Eyebrow(if (state.betweenExercises) "Cambio de ejercicio" else "Descanso")
        Spacer(Modifier.height(24.dp))

        ProgressRing(progress = progress, diameter = 248.dp, stroke = 12.dp) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    mmss(state.restRemaining.toLong()),
                    style = MaterialTheme.typography.displayLarge,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Text(
                    "restantes",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Spacer(Modifier.height(28.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            AstrimPillButton("− 15 s", onClick = { vm.addRest(-15) })
            AstrimPillButton("+ 15 s", onClick = { vm.addRest(15) })
        }

        if (nextEx != null) {
            Spacer(Modifier.height(24.dp))
            AstrimCard(modifier = Modifier.fillMaxWidth()) {
                Text(
                    "SIGUE",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    nextEx.name,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    if (nextEx.isCardio) {
                        buildString {
                            nextEx.targetTimeSeconds?.let { append(mmss(it.toLong())) }
                            nextEx.cardioTargets?.let {
                                if (isNotEmpty()) append("  ·  ")
                                append(it)
                            }
                        }.ifBlank { "Cardio" }
                    } else {
                        buildString {
                            append("${nextEx.targetSets} series")
                            nextEx.targetReps?.let { append(" × $it reps") }
                        }
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Spacer(Modifier.height(20.dp))
        AstrimOutlineButton(
            "Omitir descanso",
            onClick = vm::skipRest,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun ExerciseDoneContent(state: WorkoutUiState, vm: WorkoutViewModel) {
    val accent = LocalAstrimAccent.current
    val haptics = rememberHaptics()
    LaunchedEffect(Unit) { haptics.confirm() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier
                .size(96.dp)
                .clip(CircleShape)
                .background(accent.soft)
                .border(1.5.dp, accent.border, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Rounded.Check,
                contentDescription = null,
                tint = accent.base,
                modifier = Modifier.size(44.dp),
            )
        }
        Spacer(Modifier.height(16.dp))
        Text(
            "EJERCICIO COMPLETADO",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )
        state.currentExercise?.let {
            Spacer(Modifier.height(4.dp))
            Text(it.name, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.height(36.dp))
        AstrimButton(
            text = if (state.isLastExercise) "Terminar entrenamiento" else "Siguiente ejercicio",
            onClick = vm::nextExerciseFromDone,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun PausedOverlay(elapsed: Long, onResume: () -> Unit, onFinish: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.scrim)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                "Entrenamiento pausado",
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                mmss(elapsed),
                style = MaterialTheme.typography.displayMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(36.dp))
            AstrimButton("Continuar", onResume, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(12.dp))
            AstrimOutlineButton("Finalizar", onFinish, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun SummaryContent(state: WorkoutUiState, vm: WorkoutViewModel, onExit: () -> Unit) {
    LaunchedEffect(Unit) { vm.saveSession(onDone = {}) }
    val accent = LocalAstrimAccent.current
    val completedExercises = state.completedSets.map { it.exerciseId }.distinct().size
    val strengthSets = state.completedSets.count { it.reps != null || it.weight != null }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .navigationBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(48.dp))
        Box(
            modifier = Modifier
                .size(112.dp)
                .clip(CircleShape)
                .background(accent.soft)
                .border(1.5.dp, accent.border, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Rounded.Check, null, tint = accent.base, modifier = Modifier.size(52.dp))
        }
        Spacer(Modifier.height(20.dp))
        Text(
            "ENTRENAMIENTO COMPLETADO",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center,
        )
        Text(
            state.routineName,
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center,
        )

        Spacer(Modifier.height(28.dp))
        AstrimCard(modifier = Modifier.fillMaxWidth()) {
            SummaryRow("Tiempo", mmss(state.elapsedSeconds))
            SummaryRow("Ejercicios", "$completedExercises / ${state.totalExercises}")
            if (strengthSets > 0) {
                SummaryRow("Series", strengthSets.toString())
            }
            if (state.totalVolume > 0) {
                SummaryRow("Volumen total", "${trimNum(state.totalVolume)} kg")
            }
        }

        Spacer(Modifier.height(32.dp))
        if (state.saving) {
            AstrimSpinner()
        } else {
            AstrimButton("Listo", onExit, modifier = Modifier.fillMaxWidth())
        }
        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 11.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            value,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
            fontWeight = FontWeight.SemiBold,
        )
    }
}
