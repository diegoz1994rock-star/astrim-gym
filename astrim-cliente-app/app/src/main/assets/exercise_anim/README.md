# Demostraciones de ejercicios (recursos locales)

El Modo Entrenamiento y la ficha de ejercicio (`ui/exercise/ExerciseMedia.kt`)
buscan una demostración local para cada ejercicio. No hace falta tocar código:
alcanza con dejar el archivo con el nombre correcto.

## Dónde va cada cosa

| Tipo | Carpeta | Formato |
|---|---|---|
| Animación | `assets/exercise_anim/` | Lottie JSON (`.json`), fondo transparente, cuadrado (512×512) |
| Ilustración / foto | `assets/exercise_img/` | `.webp` (preferido), `.png` o `.jpg`, ≤ 800 px, < 150 KB |

## Cómo se elige el nombre (de más específico a más genérico)

1. **Id del ejercicio** (el mismo de Firestore): no cambia si el gimnasio lo renombra.
2. **Nombre normalizado**: minúsculas, sin tildes, `_` en lugar de espacios y signos.
   - "Press de banca" → `press_de_banca`
   - "Curl de bíceps" → `curl_de_biceps`
3. **Nombre sin conectores** (de, del, con, al, la…): "Press de banca" → `press_banca`.
4. **Nombre sin lo que va entre paréntesis**: "Peso muerto (barra)" → `peso_muerto`.
5. **Grupo muscular** (recurso compartido): "Pecho" → `pecho`.

Para un mismo nivel, la animación gana a la imagen. Un recurso específico del
ejercicio siempre gana a uno del grupo muscular.

Si no hay recurso o falla al cargar, se muestra un respaldo neutro (ícono del
tipo de ejercicio + grupo muscular) sin bloquear el entrenamiento. Si el
gimnasio cargó un video (panel → ejercicio → video), aparece el botón
"Ver demostración".

## Pendiente

Todavía no hay recursos empaquetados. Prioridad sugerida: press de banca,
sentadilla, peso muerto, press militar, curl de bíceps, extensión de tríceps,
jalón al pecho, remo, elevaciones laterales, flexiones, plancha, abdominales,
zancadas, elevación de talones, bicicleta estática, cinta, elíptica.
Usar solo material con licencia que permita redistribuirlo dentro de la APK.
