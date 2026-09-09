package com.astrimgym.cliente.ui.mealplan

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.RestaurantMenu
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import java.text.Normalizer
import java.util.concurrent.ConcurrentHashMap

/**
 * Las fotos del catálogo de alimentos vienen EMPAQUETADAS con la app
 * (`app/src/main/assets/food_images/<slug>.webp`), nunca de Firestore:
 * funcionan sin internet y no ocupan cuota de Firebase. Firestore solo trae
 * los datos del alimento (nombre, macros, categoría); la foto se resuelve
 * acá por el NOMBRE. El panel (`astrim`, `src/lib/foodImages.ts`) calcula el
 * mismo slug y empaqueta exactamente los mismos 90 archivos.
 *
 * IMPORTANTE: `foodImageSlug` tiene que coincidir carácter por carácter con
 * el de `src/lib/foodImages.ts`. Cambiarlo obliga a renombrar los archivos
 * en las dos apps.
 */

private val COMBINING_MARKS = Regex("\\p{Mn}+")
private val NON_ALNUM = Regex("[^a-z0-9]+")

/** "Plátano verde (cocido)" -> "platano_verde_cocido". */
fun foodImageSlug(name: String): String =
    Normalizer.normalize(name, Normalizer.Form.NFD)
        .replace(COMBINING_MARKS, "")
        .lowercase()
        .replace(NON_ALNUM, "_")
        .trim('_')

// Los 90 webp (~4 MB en total) se reusan entre pantallas: se cachean ya
// decodificados. `missing` recuerda los slugs sin archivo para no reintentar
// (alimentos propios de un gimnasio, o alguno nuevo del catálogo sin foto).
private val bitmapCache = ConcurrentHashMap<String, Bitmap>()
private val missingSlugs = ConcurrentHashMap.newKeySet<String>()

private fun loadFoodBitmap(context: Context, slug: String): Bitmap? {
    bitmapCache[slug]?.let { return it }
    if (slug in missingSlugs) return null
    val bitmap = runCatching {
        context.assets.open("food_images/$slug.webp").use { BitmapFactory.decodeStream(it) }
    }.getOrNull()
    return if (bitmap != null) bitmap.also { bitmapCache[slug] = it }
    else { missingSlugs += slug; null }
}

/** Foto del alimento por su nombre, o un ícono de fallback si no hay una empaquetada. */
@Composable
fun FoodImage(foodName: String?, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val bitmap = remember(foodName) {
        foodName?.takeIf { it.isNotBlank() }?.let { loadFoodBitmap(context, foodImageSlug(it)) }
    }
    if (bitmap != null) {
        Image(
            bitmap = bitmap.asImageBitmap(),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = modifier.background(MaterialTheme.colorScheme.surfaceContainerHigh),
        )
    } else {
        Box(
            modifier = modifier.background(MaterialTheme.colorScheme.surfaceContainerHigh),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Rounded.RestaurantMenu,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
