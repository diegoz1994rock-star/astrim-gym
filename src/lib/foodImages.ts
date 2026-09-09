/**
 * Las fotos del catálogo de alimentos vienen empaquetadas con la app (no en
 * la base ni en Firestore): `public/food-images/<slug>.webp`, servidas como
 * assets estáticos. Se resuelven por el NOMBRE del alimento — el mismo slug
 * lo calcula la app de clientes (astrim-cliente-app, `FoodImages.kt`) para
 * leer de sus assets. Si un alimento no tiene foto empaquetada (los propios
 * de un gimnasio, o alguno nuevo del catálogo), el `<img>` dispara `onError`
 * y la UI muestra el placeholder.
 *
 * IMPORTANTE: este slug tiene que coincidir carácter por carácter con el de
 * `FoodImages.kt`. Cambiarlo acá obliga a cambiarlo allá y a renombrar los
 * 90 archivos en ambas apps.
 */

const COMBINING_MARKS = /[̀-ͯ]/g;

/** "Plátano verde (cocido)" -> "platano_verde_cocido". */
export function foodImageSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** URL del asset empaquetado para el alimento (existan o no los bytes). */
export function foodImageUrl(name: string): string {
  return `/food-images/${foodImageSlug(name)}.webp`;
}
