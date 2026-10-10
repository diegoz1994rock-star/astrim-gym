package com.astrimgym.cliente.ui.workout

import android.app.Activity
import android.view.WindowManager
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.FitnessCenter
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.astrimgym.cliente.audio.Sfx
import com.astrimgym.cliente.audio.rememberSounds
import com.astrimgym.cliente.data.repository.CompletedSet
import com.astrimgym.cliente.data.repository.WorkoutDataSource
import com.astrimgym.cliente.data.repository.WorkoutExercise
import com.astrimgym.cliente.ui.common.ViewModelFactory
import com.astrimgym.cliente.ui.components.AccentEyebrow
import com.astrimgym.cliente.ui.components.AnimatedCheck
import com.astrimgym.cliente.ui.components.AstrimButton
import com.astrimgym.cliente.ui.components.AstrimIconButton
import com.astrimgym.cliente.ui.components.AstrimOutlineButton
import com.astrimgym.cliente.ui.components.AstrimPillButton
import com.astrimgym.cliente.ui.components.AstrimSpinner
import com.astrimgym.cliente.ui.components.AstrimStepper
import com.astrimgym.cliente.ui.components.ChipTone
import com.astrimgym.cliente.ui.components.ErrorState
import com.astrimgym.cliente.ui.components.Eyebrow
import com.astrimgym.cliente.ui.components.InfoChip
import com.astrimgym.cliente.ui.components.LoadingState
import com.astrimgym.cliente.ui.components.ProgressRing
import com.astrimgym.cliente.ui.components.StepperStack
import com.astrimgym.cliente.ui.components.rememberHaptics
import com.astrimgym.cliente.ui.exercise.ExerciseMedia
import com.astrimgym.cliente.ui.routine.VideoSection
import com.astrimgym.cliente.ui.routine.VideoKind
import com.astrimgym.cliente.ui.routine.parseVideo
import com.astrimgym.cliente.ui.theme.Danger
import com.astrimgym.cliente.ui.theme.Info
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent
import com.astrimgym.cliente.ui.theme.LocalReducedMotion
import com.astrimgym.cliente.ui.theme.Motion
import com.astrimgym.cliente.ui.theme.Positive
import com.astrimgym.cliente.ui.theme.Radii
import com.astrimgym.cliente.ui.theme.TextSecondary
import com.astrimgym.cliente.ui.theme.TextTertiary
import com.astrimgym.cliente.ui.theme.Warning

@Composable
fun WorkoutModeScreen(
    workoutRepository: WorkoutDataSource,
    routineId: String,
    onExit: () -> Unit,
) {
    val viewModel: WorkoutViewModel = viewModel(
        factory = ViewModelFactory { WorkoutViewModel(workoutRepository, routineId) },
    )
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // Pantalla encendida solo mientras dura el Modo Entrenamiento.
    DisposableEffect(Unit) {
        val window = (context as? Activity)?.window
        window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose { window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
    }

    // Toda la capa de sonido/feedback vive acá, desacoplada de la UI.
    WorkoutSoundEffects(state, viewModel)

    var confirmExit by rememberSaveable { mutableStateOf(false) }
    var videoUrl by rememberSaveable { mutableStateOf<String?>(null) }

    val training = state.phase == WorkoutPhase.EXERCISE || state.phase == WorkoutPhase.REST ||
        state.phase == WorkoutPhase.EXERCISE_DONE

    // Atrás de Android: cierra capas abiertas; si no hay, pausa (nunca sale sin querer).
    BackHandler(enabled = training || videoUrl != null || confirmExit) {
        when {
            videoUrl != null -> videoUrl = null
            confirmExit -> confirmExit = false
            !state.paused -> viewModel.togglePause()
        }
    }
    // Mientras se guarda la sesión no se puede salir (evita cortar la escritura).
    BackHandler(enabled = state.phase == WorkoutPhase.FINISHED && state.saveStatus == SaveStatus.SAVING) {}

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        when (state.phase) {
            WorkoutPhase.LOADING -> LoadingState(label = "Preparando tu entrenamiento…")
            WorkoutPhase.ERROR -> Column(Modifier.fillMaxSize().statusBarsPadding()) {
                ErrorState(state.errorMessage ?: "No se pudo cargar el entrenamiento.", modifier = Modifier.weight(1f))
                AstrimOutlineButton(
                    "Volver", onExit,
                    modifier = Modifier.fillMaxWidth().navigationBarsPadding().padding(20.dp),
                )
            }
            WorkoutPhase.FINISHED -> SummaryContent(state, viewModel, onExit)
            else -> Column(
                Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .navigationBarsPadding(),
            ) {
                WorkoutHeader(
                    state = state,
                    onPause = viewModel::togglePause,
                    onClose = { confirmExit = true },
                )
                val reduced = LocalReducedMotion.current
                AnimatedContent(
                    targetState = PhaseKey(state.phase, state.exerciseIndex, state.betweenExercises),
                    transitionSpec = {
                        val enter = if (reduced) fadeIn(tween(Motion.PHASE))
                        else fadeIn(tween(Motion.PHASE)) + slideInVertically(tween(Motion.PHASE)) { it / 16 }
                        enter togetherWith fadeOut(tween(Motion.PHASE / 2))
                    },
                    label = "phase",
                    modifier = Modifier.fillMaxSize(),
                ) { key ->
                    when (key.phase) {
                        WorkoutPhase.EXERCISE -> ExerciseContent(state, viewModel, onPlayVideo = { videoUrl = it })
                        WorkoutPhase.REST -> RestContent(state, viewModel)
                        WorkoutPhase.EXERCISE_DONE -> ExerciseDoneContent(state, viewModel)
                        else -> Box(Modifier.fillMaxSize())
                    }
                }
            }
        }

        if (state.paused && training) {
            PausedOverlay(
                state = state,
                onResume = viewModel::togglePause,
                onFinish = viewModel::finishNow,
            )
        }
        if (confirmExit && training) {
            ExitConfirmOverlay(
                setsLogged = state.completedSets.size,
                onKeepGoing = { confirmExit = false },
                onFinish = { confirmExit = false; viewModel.finishNow() },
            )
        }
        videoUrl?.let { url -> VideoOverlay(url, onClose = { videoUrl = null }) }
    }
}

/** Clave de la transición entre fases: cambia también al pasar de ejercicio. */
private data class PhaseKey(val phase: WorkoutPhase, val exerciseIndex: Int, val between: Boolean)

// ============================================================================
// Sonido + feedback háptico
// ============================================================================

/**
 * Capa de sonido + feedback del Modo Entrenamiento. Se apoya solo en el
 * estado y los eventos del ViewModel — no crea temporizadores ni lógica de
 * conteo.
 *
 *  - START al iniciar la sesión (primer EXERCISE).
 *  - SET_COMPLETE al entrar a un descanso entre series.
 *  - REWARD al terminar un ejercicio, FINISH al terminar el entrenamiento.
 *  - PAUSE / RESUME en las transiciones de `paused`.
 *  - Cuenta regresiva del descanso: aviso a los 10 s, tick 9→4 con el tono
 *    subiendo, tick urgente 3→1, y GO + vibración al llegar a 0.
 *  - Cuenta regresiva del cronómetro de cardio al acercarse a su objetivo.
 *
 * Las claves de "ya sonó" se guardan con rememberSaveable: rotar el teléfono
 * o recrear la pantalla no repite sonidos.
 */
@Composable
private fun WorkoutSoundEffects(state: WorkoutUiState, vm: WorkoutViewModel) {
    val sounds = rememberSounds()
    val haptics = rememberHaptics()

    var started by rememberSaveable { mutableStateOf(false) }
    var lastPhaseKey by rememberSaveable { mutableStateOf("") }
    val phaseKey = "${state.phase}-${state.exerciseIndex}-${state.setNumber}-${state.betweenExercises}"
    LaunchedEffect(phaseKey) {
        if (phaseKey == lastPhaseKey) return@LaunchedEffect
        lastPhaseKey = phaseKey
        if (!started && state.phase == WorkoutPhase.EXERCISE) {
            started = true
            sounds.play(Sfx.START)
        }
        when (state.phase) {
            // Descanso entre series -> serie completada (el cambio de
            // ejercicio no cuenta como "serie").
            WorkoutPhase.REST -> if (started && !state.betweenExercises) sounds.play(Sfx.SET_COMPLETE)
            WorkoutPhase.EXERCISE_DONE -> sounds.play(Sfx.REWARD)
            WorkoutPhase.FINISHED -> if (started) sounds.play(Sfx.FINISH)
            else -> {}
        }
    }

    var wasPaused by rememberSaveable { mutableStateOf(false) }
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
            haptics.alert(300)
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
    var lastCardioTick by remember(ex?.exerciseId, state.exerciseIndex) { mutableStateOf(-1) }
    var cardioGoPlayed by rememberSaveable(state.exerciseIndex) { mutableStateOf(false) }
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

// ============================================================================
// Formato
// ============================================================================

internal fun mmss(totalSeconds: Long): String {
    val s = totalSeconds.coerceAtLeast(0)
    val h = s / 3600
    return if (h > 0) "%d:%02d:%02d".format(h, (s % 3600) / 60, s % 60) else "%d:%02d".format(s / 60, s % 60)
}

internal fun trimNum(v: Double): String = if (v % 1.0 == 0.0) v.toInt().toString() else "%.1f".format(v)

private fun setLine(set: CompletedSet): String = buildString {
    set.reps?.let { append("$it reps") }
    set.weight?.takeIf { it > 0 }?.let {
        if (isNotEmpty()) append(" × ")
        append("${trimNum(it)} kg")
    }
}.ifBlank { "Registrada" }

private fun targetLine(ex: WorkoutExercise): String = if (ex.isCardio) {
    listOfNotNull(ex.targetTimeSeconds?.let { mmss(it.toLong()) }, ex.cardioTargets).joinToString("  ·  ").ifBlank { "Cardio" }
} else {
    buildString {
        append(if (ex.targetSets == 1) "1 serie" else "${ex.targetSets} series")
        ex.targetReps?.let { append(" × $it reps") }
        ex.targetWeight?.takeIf { it > 0 }?.let { append(" · ${trimNum(it)} kg") }
    }
}

// ============================================================================
// Cabecera
// ============================================================================

@Composable
private fun WorkoutHeader(state: WorkoutUiState, onPause: () -> Unit, onClose: () -> Unit) {
    Column(Modifier.padding(horizontal = 16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Salir: rojo y a la izquierda, lejos de la acción principal.
            AstrimIconButton(
                Icons.Rounded.Close, "Terminar entrenamiento", onClose,
                tint = Danger, bordered = true, container = MaterialTheme.colorScheme.surface,
            )
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("TIEMPO", style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                Text(
                    mmss(state.elapsedSeconds),
                    style = MaterialTheme.typography.titleLarge.copy(fontFeatureSettings = "tnum"),
                    color = MaterialTheme.colorScheme.onBackground,
                    fontWeight = FontWeight.Bold,
                )
            }
            // El sonido de pausa/reanudar lo emite WorkoutSoundEffects.
            AstrimIconButton(
                Icons.Rounded.Pause, "Pausar entrenamiento", onPause,
                tint = LocalAstrimAccent.current.base, bordered = true, sound = null,
                container = MaterialTheme.colorScheme.surface,
            )
        }
        SegmentedProgress(state)
        Spacer(Modifier.height(4.dp))
    }
}

/**
 * Barra de progreso por segmentos (uno por ejercicio): muestra dónde estás
 * dentro de la rutina y cuánto llevás del ejercicio actual.
 */
@Composable
private fun SegmentedProgress(state: WorkoutUiState) {
    val accent = LocalAstrimAccent.current
    val n = state.totalExercises.coerceAtLeast(1)
    val within = state.currentExercise?.let { state.setsDoneInCurrent.toFloat() / it.targetSets.coerceAtLeast(1) } ?: 0f
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .semantics { liveRegion = LiveRegionMode.Polite },
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        repeat(n) { i ->
            val fill = when {
                i < state.exerciseIndex -> 1f
                i == state.exerciseIndex -> within
                else -> 0f
            }
            com.astrimgym.cliente.ui.components.MacroProgressBar(
                progress = fill,
                height = 5.dp,
                color = if (fill >= 1f && i < state.exerciseIndex) accent.deep else accent.base,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

// ============================================================================
// Ejercicio (fuerza y cardio)
// ============================================================================

@Composable
private fun ExerciseContent(state: WorkoutUiState, vm: WorkoutViewModel, onPlayVideo: (String) -> Unit) {
    val ex = state.currentExercise ?: return
    val haptics = rememberHaptics()
    val meta = state.meta[ex.exerciseId]
    val video = meta?.videoUrl?.takeIf { parseVideo(it).kind != VideoKind.NONE }

    WorkoutPage(
        bottom = {
            AstrimButton(
                text = if (ex.isCardio) "Terminar ejercicio" else "Completar serie",
                onClick = { haptics.confirm(); vm.completeSet() },
                modifier = Modifier.fillMaxWidth(),
                icon = Icons.Rounded.Check,
                height = 60.dp,
                sound = null, // el sonido lo maneja WorkoutSoundEffects
            )
        },
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AccentEyebrow("Ejercicio ${state.exerciseIndex + 1} de ${state.totalExercises}", Modifier.weight(1f))
            if (ex.isCardio) InfoChip("Cardio", tone = ChipTone.INFO, icon = Icons.Outlined.DirectionsRun)
            else meta?.muscleGroup?.takeIf { it.isNotBlank() }?.let { InfoChip(it) }
        }
        Spacer(Modifier.height(6.dp))
        Text(
            ex.name,
            style = MaterialTheme.typography.headlineLarge,
            color = MaterialTheme.colorScheme.onBackground,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        ex.notes?.takeIf { it.isNotBlank() }?.let {
            Spacer(Modifier.height(10.dp))
            com.astrimgym.cliente.ui.routine.TrainerNote(it)
        }
        Spacer(Modifier.height(14.dp))
        ExerciseMedia(
            exerciseId = ex.exerciseId,
            name = ex.name,
            muscleGroup = meta?.muscleGroup,
            isCardio = ex.isCardio,
            active = !state.paused,
            onPlayVideo = video?.let { url -> { onPlayVideo(url) } },
            modifier = Modifier
                .fillMaxWidth()
                // Alto fijo: deja visibles los dos controles de registro sin desplazar.
                .height(if (ex.isCardio) 170.dp else 190.dp),
        )
        Spacer(Modifier.height(18.dp))

        if (ex.isCardio) CardioBlock(ex, state.exerciseElapsedSeconds)
        else StrengthBlock(state, ex, vm)
    }
}

@Composable
private fun StrengthBlock(state: WorkoutUiState, ex: WorkoutExercise, vm: WorkoutViewModel) {
    SetIndicator(current = state.setNumber, total = ex.targetSets)
    Spacer(Modifier.height(14.dp))
    StepperStack {
        AstrimStepper(
            label = "Peso",
            unit = "kg",
            value = state.weight?.let { trimNum(it) } ?: "—",
            target = ex.targetWeight?.takeIf { it > 0 }?.let { "Objetivo ${trimNum(it)} kg" }
                // Sin peso prescrito: ejercicio con el propio cuerpo (se puede sumar lastre con +).
                ?: "Peso corporal".takeIf { state.weight == null },
            onMinus = { vm.changeWeight(-2.5) },
            onPlus = { vm.changeWeight(2.5) },
        )
        AstrimStepper(
            label = "Repeticiones",
            value = state.reps?.toString() ?: "—",
            target = ex.targetReps?.let { "Objetivo $it" },
            onMinus = { vm.changeReps(-1) },
            onPlus = { vm.changeReps(1) },
        )
    }
}

/** "SERIE 2 DE 4" + puntos: hechas (verde), actual (lima), pendientes (contorno). */
@Composable
private fun SetIndicator(current: Int, total: Int) {
    val accent = LocalAstrimAccent.current
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            "SERIE $current DE $total",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(1f),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
            for (i in 1..total.coerceAtMost(10)) {
                val done = i < current
                val now = i == current
                Box(
                    Modifier
                        .size(if (now) 12.dp else 10.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                done -> Positive
                                now -> accent.base
                                else -> MaterialTheme.colorScheme.outline
                            },
                        ),
                ) {
                    if (done) {
                        Icon(Icons.Rounded.Check, null, tint = MaterialTheme.colorScheme.background, modifier = Modifier.fillMaxSize().padding(1.dp))
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CardioBlock(ex: WorkoutExercise, elapsed: Long) {
    val target = ex.targetTimeSeconds?.toLong()?.takeIf { it > 0 }
    val progress = if (target != null) (elapsed.toFloat() / target).coerceIn(0f, 1f) else 0f
    val reached = target != null && elapsed >= target
    val ringColor = if (reached) Positive else LocalAstrimAccent.current.base

    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        BoxWithConstraints(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            val d = minOf(maxWidth * 0.62f, 230.dp)
            ProgressRing(progress = progress, diameter = d, stroke = 12.dp, color = ringColor, linear = true) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("TRANSCURRIDO", style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                    Text(
                        mmss(elapsed),
                        style = MaterialTheme.typography.displayMedium,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    Text(
                        if (target != null) "objetivo ${mmss(target)}" else "sin tiempo objetivo",
                        style = MaterialTheme.typography.labelLarge,
                        color = if (reached) Positive else TextSecondary,
                    )
                }
            }
        }
        if (reached) {
            Spacer(Modifier.height(12.dp))
            InfoChip("Objetivo alcanzado", tone = ChipTone.SUCCESS, icon = Icons.Rounded.CheckCircle)
        }
        val params = ex.cardioTargets?.split("  ·  ")?.filter { it.isNotBlank() }.orEmpty()
        if (params.isNotEmpty()) {
            Spacer(Modifier.height(16.dp))
            Eyebrow("Parámetros del entrenador")
            Spacer(Modifier.height(8.dp))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                params.forEach { InfoChip(it, tone = ChipTone.INFO) }
            }
        }
    }
}

// ============================================================================
// Descanso y cambio de ejercicio
// ============================================================================

@Composable
private fun RestContent(state: WorkoutUiState, vm: WorkoutViewModel) {
    val between = state.betweenExercises
    val tone = if (between) Info else LocalAstrimAccent.current.base
    val progress = if (state.restTotal > 0) state.restRemaining.toFloat() / state.restTotal else 0f
    val current = state.currentExercise ?: return

    WorkoutPage(
        bottom = {
            AstrimOutlineButton(
                if (between) "Empezar ya" else "Omitir descanso",
                onClick = vm::skipRest,
                icon = Icons.Rounded.SkipNext,
                modifier = Modifier.fillMaxWidth(),
                height = 56.dp,
            )
        },
    ) {
        if (!between) {
            // Confirmación breve de la serie recién registrada (no bloquea nada).
            state.completedSets.lastOrNull()?.let { SetLoggedBanner(it, total = current.targetSets) }
            Spacer(Modifier.height(20.dp))
        }

        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Eyebrow(if (between) "Cambio de ejercicio" else "Descanso", color = tone)
            Spacer(Modifier.height(16.dp))
            BoxWithConstraints(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                val d: Dp = minOf(maxWidth * if (between) 0.5f else 0.62f, if (between) 190.dp else 230.dp)
                ProgressRing(progress = progress, diameter = d, stroke = 10.dp, color = tone, linear = true) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            mmss(state.restRemaining.toLong()),
                            style = if (between) MaterialTheme.typography.displayMedium else MaterialTheme.typography.displayLarge,
                            color = MaterialTheme.colorScheme.onBackground,
                            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                        )
                        Text("restantes", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    }
                }
            }
            Spacer(Modifier.height(18.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                AstrimPillButton("− 15 s", onClick = { vm.addRest(-15) })
                AstrimPillButton("+ 15 s", onClick = { vm.addRest(15) })
            }
        }

        Spacer(Modifier.height(22.dp))
        if (between) {
            val next = state.nextExercise
            if (next != null) {
                NextExerciseCard(
                    eyebrow = "Siguiente · ejercicio ${state.exerciseIndex + 2} de ${state.totalExercises}",
                    exercise = next,
                    muscleGroup = state.meta[next.exerciseId]?.muscleGroup,
                    large = true,
                )
            }
        } else {
            NextExerciseCard(
                eyebrow = "Sigue · serie ${state.setNumber + 1} de ${current.targetSets}",
                exercise = current,
                muscleGroup = state.meta[current.exerciseId]?.muscleGroup,
                large = false,
            )
        }
    }
}

@Composable
private fun SetLoggedBanner(set: CompletedSet, total: Int) {
    // Con "reducir movimiento" aparece ya visible, sin animar la entrada.
    val reduced = LocalReducedMotion.current
    var visible by remember { mutableStateOf(reduced) }
    LaunchedEffect(Unit) { visible = true }
    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(tween(Motion.CONFIRM)) + slideInVertically(tween(Motion.CONFIRM)) { -it / 3 },
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(Radii.cardSmall)
                .background(Positive.copy(alpha = 0.10f))
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AnimatedCheck(size = 32.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    "Serie ${set.setNumber} de $total registrada",
                    style = MaterialTheme.typography.titleSmall,
                    color = Positive,
                )
                Text(setLine(set), style = MaterialTheme.typography.bodySmall, color = TextSecondary)
            }
        }
    }
}

@Composable
private fun NextExerciseCard(eyebrow: String, exercise: WorkoutExercise, muscleGroup: String?, large: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(Radii.card)
            .background(MaterialTheme.colorScheme.surface)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ExerciseMedia(
            exerciseId = exercise.exerciseId,
            name = exercise.name,
            muscleGroup = muscleGroup,
            isCardio = exercise.isCardio,
            active = false,
            modifier = Modifier.size(if (large) 96.dp else 64.dp),
            compact = true,
        )
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Eyebrow(eyebrow)
            Spacer(Modifier.height(4.dp))
            Text(
                exercise.name,
                style = if (large) MaterialTheme.typography.headlineSmall else MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (exercise.isCardio) Icons.Outlined.DirectionsRun else Icons.Outlined.FitnessCenter,
                    null, tint = TextSecondary, modifier = Modifier.size(14.dp),
                )
                Spacer(Modifier.width(6.dp))
                Text(targetLine(exercise), style = MaterialTheme.typography.bodySmall, color = TextSecondary)
            }
        }
    }
}

// ============================================================================
// Ejercicio completado
// ============================================================================

@Composable
private fun ExerciseDoneContent(state: WorkoutUiState, vm: WorkoutViewModel) {
    val haptics = rememberHaptics()
    LaunchedEffect(Unit) { haptics.confirm() }
    val ex = state.currentExercise ?: return
    val sets = state.setsOfCurrentExercise

    WorkoutPage(
        bottom = {
            AstrimButton(
                text = if (state.isLastExercise) "Terminar entrenamiento" else "Siguiente ejercicio",
                onClick = vm::nextExerciseFromDone,
                modifier = Modifier.fillMaxWidth(),
                icon = if (state.isLastExercise) Icons.Rounded.Flag else Icons.AutoMirrored.Rounded.ArrowForward,
                height = 60.dp,
            )
        },
        centered = true,
    ) {
        AnimatedCheck(size = 104.dp)
        Spacer(Modifier.height(18.dp))
        Eyebrow("Ejercicio completado", color = Positive)
        Spacer(Modifier.height(6.dp))
        Text(
            ex.name,
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(20.dp))
        Column(
            Modifier
                .fillMaxWidth()
                .widthIn(max = 420.dp)
                .clip(Radii.card)
                .background(MaterialTheme.colorScheme.surface)
                .padding(horizontal = 16.dp, vertical = 8.dp),
        ) {
            if (ex.isCardio) {
                SummaryLine("Tiempo", mmss(state.exerciseElapsedSeconds))
                ex.targetTimeSeconds?.let { SummaryLine("Objetivo", mmss(it.toLong())) }
            } else {
                sets.forEach { SummaryLine("Serie ${it.setNumber}", setLine(it)) }
                val vol = sets.sumOf { (it.weight ?: 0.0) * (it.reps ?: 0) }
                if (vol > 0) SummaryLine("Volumen", "${trimNum(vol)} kg", strong = true)
            }
        }
        state.nextExercise?.let {
            Spacer(Modifier.height(14.dp))
            Text(
                "Después: ${it.name} · descanso de 2 min",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun SummaryLine(label: String, value: String, strong: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = TextSecondary, modifier = Modifier.weight(1f))
        Spacer(Modifier.width(12.dp))
        Text(
            value,
            textAlign = TextAlign.End,
            style = MaterialTheme.typography.titleSmall,
            color = if (strong) LocalAstrimAccent.current.base else MaterialTheme.colorScheme.onSurface,
        )
    }
}

// ============================================================================
// Capas: pausa, confirmación de salida, video
// ============================================================================

@Composable
private fun PausedOverlay(state: WorkoutUiState, onResume: () -> Unit, onFinish: () -> Unit) {
    val ex = state.currentExercise
    OverlayScaffold {
        Box(
            Modifier
                .size(72.dp)
                .clip(CircleShape)
                .background(LocalAstrimAccent.current.soft),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Rounded.Pause, null, tint = LocalAstrimAccent.current.base, modifier = Modifier.size(34.dp))
        }
        Spacer(Modifier.height(18.dp))
        Text("ENTRENAMIENTO PAUSADO", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
        Spacer(Modifier.height(8.dp))
        Text(mmss(state.elapsedSeconds), style = MaterialTheme.typography.displayMedium, color = MaterialTheme.colorScheme.onBackground)
        if (ex != null) {
            Spacer(Modifier.height(6.dp))
            Text(
                "${ex.name} · ejercicio ${state.exerciseIndex + 1} de ${state.totalExercises}",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                textAlign = TextAlign.Center,
            )
        }
        Text("Los cronómetros están detenidos.", style = MaterialTheme.typography.bodySmall, color = TextTertiary)
        Spacer(Modifier.height(32.dp))
        AstrimButton("Continuar", onResume, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.PlayArrow, height = 58.dp, sound = null)
        Spacer(Modifier.height(12.dp))
        AstrimOutlineButton("Finalizar entrenamiento", onFinish, modifier = Modifier.fillMaxWidth(), danger = true, icon = Icons.Rounded.Flag)
    }
}

@Composable
private fun ExitConfirmOverlay(setsLogged: Int, onKeepGoing: () -> Unit, onFinish: () -> Unit) {
    OverlayScaffold(onDismiss = onKeepGoing) {
        Box(
            Modifier.size(72.dp).clip(CircleShape).background(Danger.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Rounded.Flag, null, tint = Danger, modifier = Modifier.size(32.dp))
        }
        Spacer(Modifier.height(18.dp))
        Text(
            "¿Terminar el entrenamiento?",
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            when (setsLogged) {
                0 -> "Todavía no registraste series, así que no se va a guardar nada."
                1 -> "Se va a guardar la serie que registraste y verás el resumen."
                else -> "Se van a guardar las $setsLogged series que registraste y verás el resumen."
            },
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(28.dp))
        AstrimButton("Seguir entrenando", onKeepGoing, modifier = Modifier.fillMaxWidth(), height = 58.dp)
        Spacer(Modifier.height(12.dp))
        AstrimOutlineButton("Terminar y ver resumen", onFinish, modifier = Modifier.fillMaxWidth(), danger = true)
    }
}

@Composable
private fun VideoOverlay(url: String, onClose: () -> Unit) {
    Box(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.scrim)
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {}
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(16.dp),
    ) {
        Column(Modifier.fillMaxWidth().align(Alignment.Center)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Eyebrow("Demostración", Modifier.weight(1f))
                AstrimIconButton(Icons.Rounded.Close, "Cerrar video", onClose)
            }
            Spacer(Modifier.height(12.dp))
            VideoSection(url)
            Spacer(Modifier.height(12.dp))
            Text(
                "El entrenamiento sigue corriendo mientras ves el video.",
                style = MaterialTheme.typography.bodySmall,
                color = TextTertiary,
            )
        }
    }
}

/** Capa modal oscura centrada; consume los toques para no tocar lo de abajo. */
@Composable
private fun OverlayScaffold(onDismiss: (() -> Unit)? = null, content: @Composable ColumnScope.() -> Unit) {
    val reduced = LocalReducedMotion.current
    var shown by remember { mutableStateOf(reduced) }
    LaunchedEffect(Unit) { shown = true }
    AnimatedVisibility(visible = shown, enter = fadeIn(tween(Motion.CARD))) {
        Box(
            Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.scrim)
                .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) { onDismiss?.invoke() }
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(24.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                modifier = Modifier
                    .widthIn(max = 420.dp)
                    .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {},
                horizontalAlignment = Alignment.CenterHorizontally,
                content = content,
            )
        }
    }
}

// ============================================================================
// Resumen final
// ============================================================================

@Composable
private fun SummaryContent(state: WorkoutUiState, vm: WorkoutViewModel, onExit: () -> Unit) {
    val completedExercises = state.completedSets.map { it.exerciseId }.distinct().size
    val strengthSets = state.completedSets.count { it.reps != null || it.weight != null }
    val saving = state.saveStatus == SaveStatus.SAVING

    Column(
        Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding(),
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(36.dp))
            CelebrationCheck(celebrate = state.completedSets.isNotEmpty())
            Spacer(Modifier.height(20.dp))
            Eyebrow(
                if (state.completedSets.isEmpty()) "Entrenamiento finalizado" else "Entrenamiento completado",
                color = if (state.completedSets.isEmpty()) TextSecondary else Positive,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                state.routineName,
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onBackground,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(24.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatTile("Tiempo", mmss(state.elapsedSeconds), Modifier.weight(1f))
                StatTile("Ejercicios", "$completedExercises / ${state.totalExercises}", Modifier.weight(1f))
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatTile("Series", strengthSets.toString(), Modifier.weight(1f))
                StatTile(
                    "Volumen",
                    if (state.totalVolume > 0) "${trimNum(state.totalVolume)} kg" else "—",
                    Modifier.weight(1f),
                    highlight = state.totalVolume > 0,
                )
            }

            val byExercise = state.completedSets.groupBy { it.exerciseName }
            if (byExercise.isNotEmpty()) {
                Spacer(Modifier.height(20.dp))
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(Radii.card)
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                ) {
                    byExercise.forEach { (name, sets) ->
                        val strength = sets.filter { it.reps != null || it.weight != null }
                        SummaryLine(
                            name,
                            if (strength.isEmpty()) "Hecho"
                            else (if (strength.size == 1) "1 serie" else "${strength.size} series") +
                                (strength.maxOfOrNull { it.weight ?: 0.0 }?.takeIf { it > 0 }?.let { " · máx ${trimNum(it)} kg" } ?: ""),
                        )
                    }
                }
            }

            Spacer(Modifier.height(20.dp))
            SaveStatusRow(state.saveStatus, onRetry = vm::retrySave)
            Spacer(Modifier.height(24.dp))
        }
        AstrimButton(
            "Volver al inicio",
            onExit,
            loading = saving,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 16.dp),
            height = 58.dp,
        )
    }
}

/** Check grande con un destello de líneas que se expande una sola vez. */
@Composable
private fun CelebrationCheck(celebrate: Boolean) {
    // Sin series no hay logro que festejar: check neutro y sin destello.
    val reduced = LocalReducedMotion.current || !celebrate
    val burst = remember { androidx.compose.animation.core.Animatable(if (reduced) 1f else 0f) }
    LaunchedEffect(Unit) {
        if (!reduced) {
            kotlinx.coroutines.delay(280)
            burst.animateTo(1f, tween(700))
        }
    }
    val lime = LocalAstrimAccent.current.base
    Box(Modifier.size(170.dp), contentAlignment = Alignment.Center) {
        if (!reduced) {
            androidx.compose.foundation.Canvas(Modifier.fillMaxSize()) {
                val c = center
                val t = burst.value
                val alpha = (1f - t).coerceIn(0f, 1f) * 0.8f
                if (alpha > 0f) {
                    for (i in 0 until 12) {
                        val a = Math.toRadians(i * 30.0 - 90.0)
                        val r0 = size.minDimension * (0.34f + 0.10f * t)
                        val r1 = r0 + size.minDimension * 0.08f
                        drawLine(
                            color = (if (i % 2 == 0) lime else Positive).copy(alpha = alpha),
                            start = androidx.compose.ui.geometry.Offset(c.x + (r0 * kotlin.math.cos(a)).toFloat(), c.y + (r0 * kotlin.math.sin(a)).toFloat()),
                            end = androidx.compose.ui.geometry.Offset(c.x + (r1 * kotlin.math.cos(a)).toFloat(), c.y + (r1 * kotlin.math.sin(a)).toFloat()),
                            strokeWidth = 3.dp.toPx(),
                            cap = androidx.compose.ui.graphics.StrokeCap.Round,
                        )
                    }
                }
            }
        }
        AnimatedCheck(size = 112.dp, color = if (celebrate) Positive else TextSecondary)
    }
}

@Composable
private fun StatTile(label: String, value: String, modifier: Modifier = Modifier, highlight: Boolean = false) {
    Column(
        modifier
            .clip(Radii.card)
            .background(MaterialTheme.colorScheme.surface)
            .padding(16.dp),
    ) {
        Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = TextTertiary)
        Spacer(Modifier.height(6.dp))
        Text(
            value,
            style = MaterialTheme.typography.displaySmall.copy(fontSize = 26.sp, lineHeight = 30.sp),
            color = if (highlight) LocalAstrimAccent.current.base else MaterialTheme.colorScheme.onBackground,
            maxLines = 1,
        )
    }
}

@Composable
private fun SaveStatusRow(status: SaveStatus, onRetry: () -> Unit) {
    val (icon: ImageVector?, color: Color, text: String) = when (status) {
        SaveStatus.IDLE, SaveStatus.SAVING -> Triple(null, TextSecondary, "Guardando tu sesión…")
        SaveStatus.SAVED -> Triple(Icons.Rounded.CheckCircle, Positive, "Sesión guardada en tu historial.")
        SaveStatus.QUEUED -> Triple(
            Icons.Outlined.CloudOff, Warning,
            "Sin conexión: la sesión quedó guardada en este teléfono y se sincroniza sola al volver internet.",
        )
        SaveStatus.ERROR -> Triple(Icons.Rounded.ErrorOutline, Danger, "No se pudo guardar la sesión.")
        SaveStatus.SKIPPED -> Triple(null, TextTertiary, "No registraste series, así que esta sesión no se guardó.")
    }
    Column(
        Modifier
            .fillMaxWidth()
            .clip(Radii.cardSmall)
            .background(color.copy(alpha = 0.08f))
            .padding(14.dp)
            .semantics { liveRegion = LiveRegionMode.Polite },
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            when {
                status == SaveStatus.SAVING || status == SaveStatus.IDLE -> AstrimSpinner(size = 20.dp)
                icon != null -> Icon(icon, null, tint = color, modifier = Modifier.size(20.dp))
            }
            if (icon != null || status == SaveStatus.SAVING || status == SaveStatus.IDLE) Spacer(Modifier.width(10.dp))
            Text(text, style = MaterialTheme.typography.bodyMedium, color = if (status == SaveStatus.SKIPPED) TextSecondary else color)
        }
        if (status == SaveStatus.ERROR) {
            Spacer(Modifier.height(10.dp))
            AstrimOutlineButton("Reintentar", onRetry, icon = Icons.Rounded.Refresh, modifier = Modifier.fillMaxWidth())
        }
    }
}

// ============================================================================
// Estructura común
// ============================================================================

/**
 * Página del Modo Entrenamiento: contenido desplazable arriba y la acción
 * principal fija abajo, siempre al alcance del pulgar.
 */
@Composable
private fun WorkoutPage(
    bottom: @Composable () -> Unit,
    centered: Boolean = false,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(Modifier.fillMaxSize()) {
        // heightIn(min = alto visible) permite centrar verticalmente sin
        // perder el desplazamiento en pantallas chicas.
        BoxWithConstraints(Modifier.weight(1f).fillMaxWidth()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .heightIn(min = maxHeight)
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalAlignment = if (centered) Alignment.CenterHorizontally else Alignment.Start,
                verticalArrangement = if (centered) Arrangement.Center else Arrangement.Top,
                content = content,
            )
        }
        Box(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp)) { bottom() }
    }
}
