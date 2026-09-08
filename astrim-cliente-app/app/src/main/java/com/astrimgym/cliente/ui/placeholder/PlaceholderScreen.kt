package com.astrimgym.cliente.ui.placeholder

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.astrimgym.cliente.ui.components.EmptyState
import com.astrimgym.cliente.ui.components.ScreenHeader

/**
 * Estado "próximamente" honesto para las tabs cuyo backend todavía no
 * existe — nunca datos de ejemplo.
 */
@Composable
fun PlaceholderScreen(title: String, message: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding(),
    ) {
        ScreenHeader(title = title)
        EmptyState(
            title = "En camino",
            message = message,
            glyph = "◇",
            modifier = Modifier.padding(bottom = 48.dp),
        )
    }
}
