package com.astrimgym.cliente.ui.workout

import com.astrimgym.cliente.data.repository.CompletedSet
import com.astrimgym.cliente.data.repository.ExerciseMeta
import com.astrimgym.cliente.data.repository.SaveOutcome
import com.astrimgym.cliente.data.repository.WorkoutDataSource
import com.astrimgym.cliente.data.repository.WorkoutExercise
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Reglas del Modo Entrenamiento que el rediseño no debe romper. El reloj y
 * el dispatcher son virtuales: el ticker (cada 250 ms) avanza solo cuando el
 * test lo pide.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class WorkoutViewModelTest {

    private val dispatcher = StandardTestDispatcher()
    private var clock = 1_000_000L

    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    private class FakeSource(
        val exercises: List<WorkoutExercise>,
        var saveResult: Result<SaveOutcome> = Result.success(SaveOutcome.SYNCED),
    ) : WorkoutDataSource {
        val saves = mutableListOf<List<CompletedSet>>()
        override suspend fun loadExercises(routineId: String) = Result.success("Rutina A" to exercises)
        override suspend fun loadExerciseMeta(exerciseId: String) = Result.success(ExerciseMeta("Pecho", null))
        override suspend fun saveSession(
            routineId: String,
            routineName: String,
            startedAtMillis: Long,
            endedAtMillis: Long,
            sets: List<CompletedSet>,
        ): Result<SaveOutcome> {
            saves += sets
            return saveResult
        }
    }

    private fun strength(id: String, sets: Int = 2, reps: Int? = 10, weight: Double? = 40.0, rest: Int = 60) =
        WorkoutExercise(id, "Ejercicio $id", false, sets, reps, weight, null, null, rest, null)

    private fun cardio(id: String, seconds: Int = 600) =
        WorkoutExercise(id, "Cardio $id", true, 1, null, null, seconds, "8 km/h", 60, null)

    private fun vm(source: FakeSource): WorkoutViewModel {
        val vm = WorkoutViewModel(source, "r1", now = { clock })
        dispatcher.scheduler.runCurrent()
        return vm
    }

    /** Avanza reloj y ticker. */
    private fun advance(ms: Long) {
        clock += ms
        dispatcher.scheduler.advanceTimeBy(ms)
        dispatcher.scheduler.runCurrent()
    }

    @Test fun `carga respetando el orden y los valores del entrenador`() {
        val vm = vm(FakeSource(listOf(strength("a", weight = 50.0, reps = 8), strength("b"))))
        val s = vm.uiState.value
        assertEquals(WorkoutPhase.EXERCISE, s.phase)
        assertEquals(listOf("a", "b"), s.exercises.map { it.exerciseId })
        assertEquals(50.0, s.weight)
        assertEquals(8, s.reps)
    }

    @Test fun `doble toque en completar serie registra una sola serie`() {
        val vm = vm(FakeSource(listOf(strength("a", sets = 3))))
        vm.completeSet()
        vm.completeSet() // segundo toque durante la transición al descanso
        val s = vm.uiState.value
        assertEquals(1, s.completedSets.size)
        assertEquals(WorkoutPhase.REST, s.phase)
    }

    @Test fun `peso y repeticiones ajustados se registran sin tocar el objetivo`() {
        val vm = vm(FakeSource(listOf(strength("a", sets = 2, reps = 10, weight = 40.0))))
        vm.changeWeight(2.5)
        vm.changeWeight(2.5)
        vm.changeReps(-2)
        vm.completeSet()
        val set = vm.uiState.value.completedSets.single()
        assertEquals(45.0, set.weight)
        assertEquals(8, set.reps)
        assertEquals(40.0, vm.uiState.value.currentExercise!!.targetWeight)
        assertEquals(10, vm.uiState.value.currentExercise!!.targetReps)
    }

    @Test fun `el descanso termina solo y pasa a la siguiente serie`() {
        val vm = vm(FakeSource(listOf(strength("a", sets = 2, rest = 30))))
        vm.completeSet()
        assertEquals(30, vm.uiState.value.restRemaining)
        advance(10_000)
        assertEquals(20, vm.uiState.value.restRemaining)
        advance(20_250)
        val s = vm.uiState.value
        assertEquals(WorkoutPhase.EXERCISE, s.phase)
        assertEquals(2, s.setNumber)
    }

    @Test fun `ajustar descanso responde al instante y nunca queda negativo`() {
        val vm = vm(FakeSource(listOf(strength("a", sets = 2, rest = 30))))
        vm.completeSet()
        vm.addRest(15)
        assertEquals(45, vm.uiState.value.restRemaining)
        vm.addRest(-15)
        vm.addRest(-15)
        vm.addRest(-15)
        vm.addRest(-15)
        assertEquals(1, vm.uiState.value.restRemaining)
        assertEquals(WorkoutPhase.REST, vm.uiState.value.phase)
    }

    @Test fun `omitir descanso continua el entrenamiento`() {
        val vm = vm(FakeSource(listOf(strength("a", sets = 2))))
        vm.completeSet()
        vm.skipRest()
        assertEquals(WorkoutPhase.EXERCISE, vm.uiState.value.phase)
        assertEquals(2, vm.uiState.value.setNumber)
    }

    @Test fun `la pausa congela cronometro y descanso y reanudar no reinicia`() {
        val vm = vm(FakeSource(listOf(strength("a", sets = 2, rest = 60))))
        advance(5_000)
        vm.completeSet()
        advance(10_000)
        val before = vm.uiState.value
        assertEquals(50, before.restRemaining)

        vm.togglePause()
        advance(120_000) // dos minutos en pausa
        assertEquals(before.restRemaining, vm.uiState.value.restRemaining)
        assertEquals(before.elapsedSeconds, vm.uiState.value.elapsedSeconds)
        vm.completeSet() // ignorado mientras está en pausa
        vm.skipRest()
        assertEquals(1, vm.uiState.value.completedSets.size)
        assertEquals(WorkoutPhase.REST, vm.uiState.value.phase)

        vm.togglePause()
        advance(1_000)
        val after = vm.uiState.value
        assertEquals(WorkoutPhase.REST, after.phase)
        assertEquals(49, after.restRemaining)
        assertEquals(16L, after.elapsedSeconds)
    }

    @Test fun `flujo completo guarda una sola vez con volumen correcto`() {
        val source = FakeSource(listOf(strength("a", sets = 2, reps = 10, weight = 40.0), cardio("b")))
        val vm = vm(source)

        vm.completeSet(); vm.skipRest(); vm.completeSet()
        assertEquals(WorkoutPhase.EXERCISE_DONE, vm.uiState.value.phase)
        vm.nextExerciseFromDone()
        assertTrue(vm.uiState.value.betweenExercises)
        assertEquals(120, vm.uiState.value.restTotal) // cambio de ejercicio: 2 min
        vm.skipRest()
        assertEquals(1, vm.uiState.value.exerciseIndex)

        vm.completeSet() // cardio: "Terminar ejercicio"
        vm.nextExerciseFromDone()
        vm.nextExerciseFromDone() // toque repetido en "Terminar entrenamiento"
        dispatcher.scheduler.runCurrent()

        val s = vm.uiState.value
        assertEquals(WorkoutPhase.FINISHED, s.phase)
        assertEquals(800.0, s.totalVolume, 0.001)
        assertEquals(1, source.saves.size)
        assertEquals(3, source.saves.single().size)
        val cardioSet = source.saves.single().last()
        assertNull(cardioSet.weight)
        assertNull(cardioSet.reps)
        assertEquals(SaveStatus.SAVED, s.saveStatus)

        vm.finishNow() // ya terminado: no vuelve a guardar
        dispatcher.scheduler.runCurrent()
        assertEquals(1, source.saves.size)
    }

    @Test fun `sesion sin series no se guarda`() {
        val source = FakeSource(listOf(strength("a")))
        val vm = vm(source)
        vm.finishNow()
        dispatcher.scheduler.runCurrent()
        assertEquals(WorkoutPhase.FINISHED, vm.uiState.value.phase)
        assertEquals(SaveStatus.SKIPPED, vm.uiState.value.saveStatus)
        assertTrue(source.saves.isEmpty())
    }

    @Test fun `sin conexion queda en cola y un error permite reintentar`() {
        val source = FakeSource(listOf(strength("a", sets = 1)), Result.success(SaveOutcome.QUEUED))
        val vm = vm(source)
        vm.completeSet()
        vm.nextExerciseFromDone()
        dispatcher.scheduler.runCurrent()
        assertEquals(SaveStatus.QUEUED, vm.uiState.value.saveStatus)

        val failing = FakeSource(listOf(strength("a", sets = 1)), Result.failure(IllegalStateException("x")))
        val vm2 = vm(failing)
        vm2.completeSet()
        vm2.nextExerciseFromDone()
        dispatcher.scheduler.runCurrent()
        assertEquals(SaveStatus.ERROR, vm2.uiState.value.saveStatus)
        failing.saveResult = Result.success(SaveOutcome.SYNCED)
        vm2.retrySave()
        dispatcher.scheduler.runCurrent()
        assertEquals(SaveStatus.SAVED, vm2.uiState.value.saveStatus)
        assertEquals(2, failing.saves.size)
    }

    @Test fun `el progreso avanza por serie y no salta entre fuerza y cardio`() {
        val vm = vm(FakeSource(listOf(strength("a", sets = 2), cardio("b"))))
        assertEquals(0f, vm.uiState.value.sessionProgress, 0.001f)
        vm.completeSet() // 1 de 2 series del ejercicio 1
        assertEquals(0.25f, vm.uiState.value.sessionProgress, 0.001f)
        vm.skipRest()
        assertEquals(0.25f, vm.uiState.value.sessionProgress, 0.001f)
        vm.completeSet()
        assertEquals(0.5f, vm.uiState.value.sessionProgress, 0.001f)
        vm.nextExerciseFromDone()
        assertEquals(0.5f, vm.uiState.value.sessionProgress, 0.001f)
        vm.skipRest()
        assertEquals(0.5f, vm.uiState.value.sessionProgress, 0.001f)
        vm.completeSet()
        assertEquals(1f, vm.uiState.value.sessionProgress, 0.001f)
    }

    @Test fun `el cronometro de cardio cuenta desde el inicio del ejercicio`() {
        val vm = vm(FakeSource(listOf(strength("a", sets = 1), cardio("b"))))
        advance(30_000)
        vm.completeSet()
        vm.nextExerciseFromDone()
        vm.skipRest()
        advance(12_000)
        assertEquals(12L, vm.uiState.value.exerciseElapsedSeconds)
    }
}
