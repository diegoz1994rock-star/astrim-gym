# Animaciones de ejercicios (Lottie)

La zona central del Modo Entrenamiento (`ui/exercise/ExerciseAnimation.kt`)
busca acá un archivo por ejercicio y lo reproduce en loop, con la velocidad
atada al estado del entrenamiento (READY / ACTIVE / REST / DONE).

## Cómo agregar una animación

1. Exportá la animación como **Lottie JSON** (After Effects + Bodymovin, o
   LottieFiles). Fondo transparente, cuadrado (p. ej. 512×512).
2. Nombrala con el *slug* del **grupo muscular** del ejercicio (preferido,
   se reutiliza entre ejercicios) o, si no, del **nombre del ejercicio**.
   El slug es minúsculas, sin acentos, con `_` en vez de espacios:
   - "Pecho" → `pecho.json`
   - "Sentadilla con barra" → `sentadilla_con_barra.json`
3. Dejala en esta carpeta. No hay que tocar código.

Mientras un ejercicio no tenga `.json`, se muestra un fallback animado
premium dibujado en Compose (anillos + núcleo que responden al estado).
Nunca una imagen estática ni un GIF.

## Rive

Si más adelante se prefiere Rive (animaciones por máquina de estados), el
punto de enganche es el mismo `ExerciseAnimation`: se agrega la dependencia
`app.rive.runtime.kotlin:rive-android` y una rama que cargue `<slug>.riv`
antes del fallback.
