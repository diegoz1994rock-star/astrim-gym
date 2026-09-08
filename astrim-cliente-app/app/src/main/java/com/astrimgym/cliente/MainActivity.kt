package com.astrimgym.cliente

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.astrimgym.cliente.ui.login.LoginScreen
import com.astrimgym.cliente.ui.nav.AppNavigation
import com.astrimgym.cliente.ui.theme.AstrimTheme
import com.astrimgym.cliente.ui.theme.DefaultAccent
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val container = (application as AstrimApplication).container

        setContent {
            var accentColor by remember { mutableStateOf(DefaultAccent) }
            var loggedIn by remember { mutableStateOf(Firebase.auth.currentUser != null) }

            // La sesión de Firebase es la fuente de verdad: si se cierra
            // (logout, token revocado) la app vuelve al login sola.
            DisposableEffect(Unit) {
                val listener = FirebaseAuth.AuthStateListener { auth ->
                    val isLogged = auth.currentUser != null
                    if (!isLogged) container.clientSession.clear()
                    loggedIn = isLogged
                }
                Firebase.auth.addAuthStateListener(listener)
                onDispose { Firebase.auth.removeAuthStateListener(listener) }
            }

            AstrimTheme(accentColor = accentColor) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = androidx.compose.material3.MaterialTheme.colorScheme.background,
                ) {
                    if (loggedIn) {
                        AppNavigation(container = container, onAccentColorResolved = { accentColor = it })
                    } else {
                        LoginScreen(
                            authRepository = container.authRepository,
                            onLoggedIn = { loggedIn = true },
                        )
                    }
                }
            }
        }
    }
}
