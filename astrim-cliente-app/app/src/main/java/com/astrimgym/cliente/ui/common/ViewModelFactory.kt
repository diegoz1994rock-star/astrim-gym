package com.astrimgym.cliente.ui.common

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider

/**
 * Factory genérica para inyectar dependencias en un ViewModel sin Hilt (ver
 * nota en AstrimApplication.kt sobre por qué la Fase 0 usa DI manual).
 */
class ViewModelFactory<T : ViewModel>(private val create: () -> T) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <U : ViewModel> create(modelClass: Class<U>): U = create() as U
}
