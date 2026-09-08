package com.astrimgym.cliente.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.SoundPool
import android.os.SystemClock
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import com.astrimgym.cliente.R

/**
 * Efecto de sonido. `res` es el .wav en res/raw. `gain` lo atenúa/realza
 * respecto al volumen global; `rate` cambia el tono (1 = original); `minGapMs`
 * evita que el mismo efecto se dispare dos veces demasiado seguido (anti
 * solapamiento accidental).
 */
enum class Sfx(
    val res: Int,
    val gain: Float = 1f,
    val rate: Float = 1f,
    val minGapMs: Long = 40,
) {
    TAP(R.raw.sfx_tap, gain = 0.4f, minGapMs = 35),
    START(R.raw.sfx_start, minGapMs = 400),
    PAUSE(R.raw.sfx_pause, minGapMs = 180),
    RESUME(R.raw.sfx_resume, minGapMs = 180),
    FINISH(R.raw.sfx_finish, minGapMs = 600),
    SET_COMPLETE(R.raw.sfx_complete, gain = 0.9f, minGapMs = 120),
    REWARD(R.raw.sfx_reward, minGapMs = 250),
    COUNTDOWN_ENTER(R.raw.sfx_countdown_enter, gain = 0.75f, minGapMs = 500),
    TICK(R.raw.sfx_tick, gain = 0.6f, minGapMs = 150),
    TICK_URGENT(R.raw.sfx_tick_urgent, gain = 0.8f, minGapMs = 150),
    GO(R.raw.sfx_go, minGapMs = 400),
    WARNING(R.raw.sfx_warning, gain = 0.65f, minGapMs = 200),
}

/**
 * Único punto de reproducción de efectos de sonido de la app.
 *
 * - `SoundPool` con atributos de "sonificación": el sistema lo silencia solo
 *   cuando el teléfono está en silencio/DND, sin pisar la música.
 * - Se puede apagar y regular el volumen desde Configuración (persistido).
 * - Anti-duplicados: cada efecto tiene una ventana mínima entre disparos.
 * - Respeta el ciclo de vida: en segundo plano no suena y libera streams.
 * - Memoria fija y pequeña (~350 KB de PCM); CPU nula en reposo.
 */
class SoundManager private constructor(context: Context) : DefaultLifecycleObserver {

    private val app = context.applicationContext
    private val audioManager = app.getSystemService(AudioManager::class.java)
    private val prefs = app.getSharedPreferences("astrim_sound", Context.MODE_PRIVATE)

    // USAGE_GAME: mezcla con la música del usuario sin abrir el HUD de
    // volumen del sistema en cada efecto. El respeto al modo silencio lo
    // hace `play()` mirando el ringerMode (abajo).
    private val pool = SoundPool.Builder()
        .setMaxStreams(4)
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build(),
        )
        .build()

    private val sampleIds = HashMap<Sfx, Int>()
    private val loaded = HashSet<Int>()
    private val lastPlayed = HashMap<Sfx, Long>()

    @Volatile private var inForeground = true

    /** Estado observable por Compose (Configuración). */
    var enabled by mutableStateOf(prefs.getBoolean(KEY_ENABLED, true))
        private set
    var volume by mutableStateOf(prefs.getFloat(KEY_VOLUME, 0.85f).coerceIn(0f, 1f))
        private set

    init {
        pool.setOnLoadCompleteListener { _, sampleId, status ->
            if (status == 0) loaded += sampleId
        }
        for (sfx in Sfx.entries) {
            sampleIds[sfx] = pool.load(app, sfx.res, 1)
        }
        ProcessLifecycleOwner.get().lifecycle.addObserver(this)
    }

    fun updateEnabled(value: Boolean) {
        enabled = value
        prefs.edit().putBoolean(KEY_ENABLED, value).apply()
        if (value) play(Sfx.TAP) // confirmación audible al reactivar
    }

    fun updateVolume(value: Float) {
        volume = value.coerceIn(0f, 1f)
        prefs.edit().putFloat(KEY_VOLUME, volume).apply()
    }

    /** Vista previa (Configuración): suena aunque se llame muy seguido. */
    fun preview(sfx: Sfx = Sfx.GO) = play(sfx, ignoreGap = true)

    /** `rateOverride` (0.5–2.0) permite subir el tono, p. ej. en la cuenta regresiva. */
    fun play(sfx: Sfx, ignoreGap: Boolean = false, rateOverride: Float? = null) {
        if (!enabled || !inForeground || volume <= 0f) return
        // Silencio total o volumen multimedia en 0 -> nada (el háptico sigue).
        // En "vibración" con música sonando (auriculares, Spotify) sí suena.
        if (audioManager?.ringerMode == AudioManager.RINGER_MODE_SILENT) return
        if ((audioManager?.getStreamVolume(AudioManager.STREAM_MUSIC) ?: 0) == 0) return

        val now = SystemClock.uptimeMillis()
        if (!ignoreGap && now - (lastPlayed[sfx] ?: 0L) < sfx.minGapMs) return
        lastPlayed[sfx] = now

        val id = sampleIds[sfx] ?: return
        if (id !in loaded) return
        val v = (volume * sfx.gain).coerceIn(0f, 1f)
        pool.play(id, v, v, 1, 0, (rateOverride ?: sfx.rate).coerceIn(0.5f, 2f))
    }

    // ---- ciclo de vida del proceso ----
    override fun onStart(owner: LifecycleOwner) {
        inForeground = true
        pool.autoResume()
    }

    override fun onStop(owner: LifecycleOwner) {
        inForeground = false
        pool.autoPause()
    }

    companion object {
        private const val KEY_ENABLED = "enabled"
        private const val KEY_VOLUME = "volume"

        @Volatile private var instance: SoundManager? = null

        fun get(context: Context): SoundManager =
            instance ?: synchronized(this) {
                instance ?: SoundManager(context).also { instance = it }
            }
    }
}
