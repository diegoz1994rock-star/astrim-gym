package com.astrimgym.cliente.ui.profile

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.PhotoCamera
import androidx.compose.material.icons.rounded.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.astrimgym.cliente.audio.Sfx
import com.astrimgym.cliente.audio.rememberSounds
import com.astrimgym.cliente.data.LocalProfilePhoto
import com.astrimgym.cliente.data.repository.MembershipState
import com.astrimgym.cliente.data.repository.MembershipView
import com.astrimgym.cliente.data.repository.ProfileData
import com.astrimgym.cliente.data.repository.ProfileRepository
import com.astrimgym.cliente.ui.common.ViewModelFactory
import com.astrimgym.cliente.ui.components.AstrimCard
import com.astrimgym.cliente.ui.components.AstrimOutlineButton
import com.astrimgym.cliente.ui.components.BottomBarSpace
import com.astrimgym.cliente.ui.components.ErrorState
import com.astrimgym.cliente.ui.components.Eyebrow
import com.astrimgym.cliente.ui.components.LoadingState
import com.astrimgym.cliente.ui.components.ScreenHeader
import com.astrimgym.cliente.ui.theme.Danger
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent
import com.astrimgym.cliente.ui.theme.Warning
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase

@Composable
fun ProfileScreen(
    profileRepository: ProfileRepository,
    onLogout: () -> Unit,
) {
    val viewModel: ProfileViewModel =
        viewModel(factory = ViewModelFactory { ProfileViewModel(profileRepository) })
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    // La foto local pertenece a un solo usuario (su uid). Si en este celular
    // entra otra persona, LocalProfilePhoto borra la foto anterior en vez de
    // mostrarla en el perfil equivocado.
    val ownerId = Firebase.auth.currentUser?.uid.orEmpty()

    var photoVersion by remember { mutableIntStateOf(0) }
    val photo = remember(photoVersion, ownerId) { LocalProfilePhoto.load(context, ownerId) }

    val picker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        if (uri != null && LocalProfilePhoto.saveFromUri(context, uri, ownerId)) photoVersion++
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding(),
    ) {
        ScreenHeader(title = "Perfil")
        when (val current = state) {
            is ProfileUiState.Loading -> LoadingState()
            is ProfileUiState.Error -> ErrorState(current.message, onRetry = viewModel::refresh)
            is ProfileUiState.Success -> Content(
                data = current.data,
                photo = photo?.asImageBitmap(),
                hasPhoto = photo != null,
                onPickPhoto = {
                    picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                },
                onRemovePhoto = { LocalProfilePhoto.clear(context); photoVersion++ },
                onLogout = onLogout,
            )
        }
    }
}

@Composable
private fun Content(
    data: ProfileData,
    photo: androidx.compose.ui.graphics.ImageBitmap?,
    hasPhoto: Boolean,
    onPickPhoto: () -> Unit,
    onRemovePhoto: () -> Unit,
    onLogout: () -> Unit,
) {
    val accent = LocalAstrimAccent.current
    val client = data.client
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(8.dp))
        Box(contentAlignment = Alignment.BottomEnd) {
            Box(
                modifier = Modifier
                    .size(104.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                    .border(1.dp, accent.border, CircleShape)
                    .clickable(onClick = onPickPhoto),
                contentAlignment = Alignment.Center,
            ) {
                if (photo != null) {
                    Image(photo, "Foto de perfil", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                } else {
                    Text(
                        initials(client.name),
                        style = MaterialTheme.typography.headlineMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(accent.base)
                    .clickable(onClick = onPickPhoto),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Rounded.PhotoCamera,
                    contentDescription = "Cambiar foto",
                    tint = accent.onAccent,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
        if (hasPhoto) {
            Spacer(Modifier.height(6.dp))
            Text(
                "Quitar foto",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.clickable(onClick = onRemovePhoto).padding(4.dp),
            )
        }

        Spacer(Modifier.height(14.dp))
        Text(
            client.name ?: "—",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
            fontWeight = FontWeight.SemiBold,
        )
        data.gym?.name?.let {
            Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        Spacer(Modifier.height(24.dp))
        MembershipCard(data.membership)

        Spacer(Modifier.height(14.dp))
        InfoCard(
            rows = listOf(
                "Documento" to client.document,
                "Teléfono" to client.phone,
                "Correo" to client.email,
                "Objetivo" to goalLabel(client.goal),
                "Entrenador" to client.trainerName,
                "Ingreso" to client.joinDate,
            ),
        )
        Text(
            "Estos datos los administra tu gimnasio. Si algo está mal, avisá en recepción.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 10.dp),
        )

        if (hasBodyMeasurements(client)) {
            Spacer(Modifier.height(14.dp))
            BodyMeasurementsCard(client)
        }

        Spacer(Modifier.height(24.dp))
        SoundSettingsCard()

        Spacer(Modifier.height(20.dp))
        AstrimOutlineButton("Cerrar sesión", onLogout, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(BottomBarSpace))
    }
}

@Composable
private fun SoundSettingsCard() {
    val sounds = rememberSounds()
    val accent = LocalAstrimAccent.current
    AstrimCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Rounded.VolumeUp,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp),
            )
            Spacer(Modifier.size(10.dp))
            Column(Modifier.weight(1f)) {
                Text("Sonidos", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                Text(
                    "Efectos del modo entrenamiento",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Switch(
                checked = sounds.enabled,
                onCheckedChange = { sounds.updateEnabled(it) },
                colors = SwitchDefaults.colors(
                    checkedThumbColor = accent.onAccent,
                    checkedTrackColor = accent.base,
                ),
            )
        }
        if (sounds.enabled) {
            Spacer(Modifier.height(6.dp))
            Text(
                "Volumen",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Slider(
                value = sounds.volume,
                onValueChange = { sounds.updateVolume(it) },
                onValueChangeFinished = { sounds.preview(Sfx.TICK) },
                colors = SliderDefaults.colors(
                    thumbColor = accent.base,
                    activeTrackColor = accent.base,
                ),
            )
            Text(
                "Se apagan solos si el teléfono está en silencio.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun MembershipCard(m: MembershipView) {
    val accent = LocalAstrimAccent.current
    val stateColor = when (m.state) {
        MembershipState.ACTIVE -> accent.base
        MembershipState.EXPIRING_SOON -> Warning
        MembershipState.NONE -> MaterialTheme.colorScheme.onSurfaceVariant
        else -> Danger
    }
    AstrimCard(modifier = Modifier.fillMaxWidth(), hero = m.state == MembershipState.ACTIVE) {
        Eyebrow("Mi membresía")
        Spacer(Modifier.height(10.dp))
        if (m.state == MembershipState.NONE) {
            Text(
                "No tenés una membresía activa. Consultá en tu gimnasio.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    m.planName ?: "Plan",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(stateColor.copy(alpha = 0.16f))
                        .padding(horizontal = 12.dp, vertical = 5.dp),
                ) {
                    Text(
                        membershipStateLabel(m),
                        style = MaterialTheme.typography.labelMedium,
                        color = stateColor,
                    )
                }
            }
            m.endDate?.let {
                Spacer(Modifier.height(6.dp))
                Text(
                    "Vence el $it" + (m.daysLeft?.takeIf { d -> d >= 0 }?.let { d -> "  ·  $d días" } ?: ""),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

private fun hasBodyMeasurements(client: com.astrimgym.cliente.data.model.ClientDoc): Boolean =
    listOf(
        client.weight, client.height, client.waist, client.chest,
        client.arm, client.leg, client.calf, client.hip, client.muscleMass,
    ).any { it != null }

/** Misma fórmula/categorías que el panel (src/lib/domain/bmi.ts): peso(kg) / altura(m)². */
private fun computeBmi(weightKg: Double?, heightMeters: Double?): Double? {
    if (weightKg == null || heightMeters == null || weightKg <= 0 || heightMeters <= 0) return null
    return weightKg / (heightMeters * heightMeters)
}

private fun bmiCategoryLabel(bmi: Double): String = when {
    bmi < 18.5 -> "Bajo peso"
    bmi < 25.0 -> "Normal"
    bmi < 30.0 -> "Sobrepeso"
    else -> "Obesidad"
}

private fun formatMeasurement(value: Double?, unit: String): String? =
    value?.let { "${if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it)} $unit" }

@Composable
private fun BodyMeasurementsCard(client: com.astrimgym.cliente.data.model.ClientDoc) {
    val bmi = computeBmi(client.weight, client.height)
    val rows = buildList {
        add("Peso" to formatMeasurement(client.weight, "kg"))
        add("Altura" to formatMeasurement(client.height?.times(100), "cm"))
        if (bmi != null) add("IMC" to "${"%.1f".format(bmi)} (${bmiCategoryLabel(bmi)})")
        add("Cintura" to formatMeasurement(client.waist, "cm"))
        add("Pecho" to formatMeasurement(client.chest, "cm"))
        add("Brazo" to formatMeasurement(client.arm, "cm"))
        add("Muslo" to formatMeasurement(client.leg, "cm"))
        add("Pantorrilla" to formatMeasurement(client.calf, "cm"))
        add("Cadera" to formatMeasurement(client.hip, "cm"))
        add("Masa muscular" to formatMeasurement(client.muscleMass, "kg"))
    }.filter { it.second != null }

    AstrimCard(modifier = Modifier.fillMaxWidth()) {
        Eyebrow("Medidas corporales actuales", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(6.dp))
        rows.forEach { (label, value) ->
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(value ?: "—", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}

@Composable
private fun InfoCard(rows: List<Pair<String, String?>>) {
    AstrimCard(modifier = Modifier.fillMaxWidth()) {
        Eyebrow("Mis datos", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(6.dp))
        rows.forEach { (label, value) ->
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    value?.takeIf { it.isNotBlank() } ?: "—",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

private fun initials(name: String?): String {
    val parts = name?.trim()?.split(Regex("\\s+"))?.filter { it.isNotEmpty() }.orEmpty()
    return parts.take(2).joinToString("") { it.first().uppercase() }.ifBlank { "?" }
}

private fun membershipStateLabel(m: MembershipView): String = when (m.state) {
    MembershipState.ACTIVE -> "Activa"
    MembershipState.EXPIRING_SOON -> "Vence pronto"
    MembershipState.EXPIRED -> "Vencida"
    MembershipState.SUSPENDED -> "Suspendida"
    MembershipState.CANCELLED -> "Cancelada"
    MembershipState.NONE -> "—"
}

private fun goalLabel(raw: String?): String? = when (raw?.uppercase()) {
    null -> null
    "FAT_LOSS" -> "Pérdida de grasa"
    "MUSCLE_GAIN" -> "Ganancia muscular"
    "STRENGTH" -> "Fuerza"
    "ENDURANCE" -> "Resistencia"
    "MAINTENANCE" -> "Mantenimiento"
    "OTHER" -> "Otro"
    else -> raw
}
