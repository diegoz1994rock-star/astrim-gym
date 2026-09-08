package com.astrimgym.cliente.ui.home

import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astrimgym.cliente.data.repository.HomeData
import com.astrimgym.cliente.data.repository.HomeRepository
import com.astrimgym.cliente.ui.theme.DefaultAccent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface HomeUiState {
    data object Loading : HomeUiState
    data class Success(val data: HomeData) : HomeUiState
    data class Error(val message: String) : HomeUiState
}

class HomeViewModel(private val homeRepository: HomeRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading
            homeRepository.loadHome()
                .onSuccess { _uiState.value = HomeUiState.Success(it) }
                .onFailure {
                    _uiState.value = HomeUiState.Error(
                        it.message ?: "No se pudo cargar tu información. Desliza para reintentar.",
                    )
                }
        }
    }
}

/** gyms.brandColor llega como "#RRGGBB"; si falta o es inválido, se usa el acento por defecto. */
fun parseBrandColor(hex: String?): Color {
    if (hex.isNullOrBlank()) return DefaultAccent
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (_: IllegalArgumentException) {
        DefaultAccent
    }
}
