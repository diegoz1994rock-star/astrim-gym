package com.astrimgym.cliente.audio

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

/**
 * Acceso al servicio de sonido desde Compose. Espeja `rememberHaptics()`:
 * un único `SoundManager` para toda la app (ver su `get()`).
 */
@Composable
fun rememberSounds(): SoundManager {
    val context = LocalContext.current
    return remember { SoundManager.get(context) }
}
