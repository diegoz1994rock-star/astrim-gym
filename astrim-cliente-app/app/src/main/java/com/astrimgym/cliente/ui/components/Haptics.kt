package com.astrimgym.cliente.ui.components

import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.HapticFeedbackConstants
import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalView
import com.astrimgym.cliente.audio.SoundManager

/**
 * Feedback háptico consistente en toda la app. Envuelve
 * View.performHapticFeedback con constantes que degradan bien en equipos
 * viejos (los códigos nuevos existen desde API 30/34). Respeta la
 * preferencia "Vibración" de Perfil (guardada junto a la de sonido).
 */
class Haptics(private val view: View) {
    private val prefs = SoundManager.get(view.context)

    fun tick() = perform(
        if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.CLOCK_TICK
        else HapticFeedbackConstants.KEYBOARD_TAP,
    )

    fun press() = perform(
        if (Build.VERSION.SDK_INT >= 34) HapticFeedbackConstants.CONFIRM
        else HapticFeedbackConstants.VIRTUAL_KEY,
    )

    fun confirm() = perform(
        if (Build.VERSION.SDK_INT >= 34) HapticFeedbackConstants.CONFIRM
        else HapticFeedbackConstants.LONG_PRESS,
    )

    fun reject() = perform(
        if (Build.VERSION.SDK_INT >= 34) HapticFeedbackConstants.REJECT
        else HapticFeedbackConstants.LONG_PRESS,
    )

    /** Vibración larga y notoria (fin de descanso), aunque el teléfono no tenga hápticos finos. */
    fun alert(millis: Long = 300) {
        if (!prefs.hapticsEnabled) return
        runCatching {
            view.context.getSystemService(Vibrator::class.java)
                ?.vibrate(VibrationEffect.createOneShot(millis, VibrationEffect.DEFAULT_AMPLITUDE))
        }
    }

    private fun perform(code: Int) {
        if (!prefs.hapticsEnabled) return
        runCatching { view.performHapticFeedback(code) }
    }
}

@Composable
fun rememberHaptics(): Haptics {
    val view = LocalView.current
    return remember(view) { Haptics(view) }
}
