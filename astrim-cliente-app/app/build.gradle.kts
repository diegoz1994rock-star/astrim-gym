plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.astrimgym.cliente"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.astrimgym.cliente"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.10.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.navigation:navigation-compose:2.8.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-process:2.8.7")

    // Animaciones profesionales de ejercicios. La arquitectura (ui/exercise/
    // ExerciseAnimation.kt) reproduce un .lottie/.json por ejercicio cuando
    // exista y, mientras tanto, un fallback animado dibujado en Compose.
    implementation("com.airbnb.android:lottie-compose:6.5.2")

    // Reproductor de YouTube embebido con controles propios (sin abrir la app
    // de YouTube). Usa la IFrame API dentro de un WebView, pero la UI la
    // dibujamos nosotros en Compose. Ver ui/routine/VideoSection.kt.
    implementation("com.pierfrancescosoffritti.androidyoutubeplayer:core:12.1.2")

    // Firebase: Auth (login de clientes) + Firestore (datos). Sin Storage.
    // La sesión la persiste el SDK; sin manejo manual de tokens.
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-auth")
    implementation("com.google.firebase:firebase-firestore")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.8.1")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
