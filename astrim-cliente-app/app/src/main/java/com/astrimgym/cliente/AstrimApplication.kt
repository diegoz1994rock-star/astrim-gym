package com.astrimgym.cliente

import android.app.Application
import com.astrimgym.cliente.audio.SoundManager
import com.astrimgym.cliente.data.AppContainer
import com.astrimgym.cliente.data.DefaultAppContainer
import com.google.firebase.FirebaseApp

/**
 * DI manual (sin Hilt por ahora): un solo contenedor con las dependencias
 * compartidas (Firebase Auth/Firestore, repositorios). Se mantiene simple a
 * propósito — cambiar a Hilt más adelante es un refactor localizado.
 */
class AstrimApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
        container = DefaultAppContainer()
        // Precarga los efectos de sonido y registra el observador de ciclo
        // de vida del proceso.
        SoundManager.get(this)
    }
}
