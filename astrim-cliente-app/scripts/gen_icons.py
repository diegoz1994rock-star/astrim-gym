"""Genera el ícono adaptativo de la APK de clientes, el ícono de Play Store
y el logo in-app (login) a partir de un único PNG con transparencia.

Uso:
    python scripts/gen_icons.py "C:/ruta/al/logo.png"

Requiere Pillow (`pip install pillow`). El logo debe venir en PNG con fondo
transparente. Ver README ("Icono y logo de la app").
"""
import os
import sys

from PIL import Image

BG = (13, 13, 13, 255)  # #0D0D0D, igual que res/drawable/ic_launcher_background.xml

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.normpath(os.path.join(HERE, "..", "app"))
RES = os.path.join(APP, "src", "main", "res")

FOREGROUND = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}


def main(src: str) -> None:
    logo = Image.open(src).convert("RGBA")
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)

    def fitted(canvas_px: int, coverage: float) -> Image.Image:
        target = int(canvas_px * coverage)
        w, h = logo.size
        scale = target / max(w, h)
        nl = logo.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
        layer = Image.new("RGBA", (canvas_px, canvas_px), (0, 0, 0, 0))
        layer.alpha_composite(nl, ((canvas_px - nl.width) // 2, (canvas_px - nl.height) // 2))
        return layer

    def save(img: Image.Image, path: str) -> None:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        img.save(path)
        print("  ", os.path.relpath(path, APP))

    # Capa foreground del ícono adaptativo (safe zone 66%; usamos 62%).
    for d, px in FOREGROUND.items():
        save(fitted(px, 0.62), os.path.join(RES, f"mipmap-{d}", "ic_launcher_foreground.png"))

    # Íconos legacy (pre-Android 8): fondo oscuro + logo.
    for d, px in LEGACY.items():
        base = Image.new("RGBA", (px, px), BG)
        base.alpha_composite(fitted(px, 0.78))
        save(base, os.path.join(RES, f"mipmap-{d}", "ic_launcher.png"))
        save(base.copy(), os.path.join(RES, f"mipmap-{d}", "ic_launcher_round.png"))

    # Play Store 512x512.
    ps = Image.new("RGBA", (512, 512), BG)
    ps.alpha_composite(fitted(512, 0.80))
    save(ps.convert("RGB"), os.path.join(APP, "ic_launcher-playstore.png"))

    # Logo in-app (login): PNG transparente a 512px.
    w, h = logo.size
    scale = 512 / max(w, h)
    save(
        logo.resize((int(w * scale), int(h * scale)), Image.LANCZOS),
        os.path.join(RES, "drawable-nodpi", "astrim_logo.png"),
    )
    print("OK")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Uso: python scripts/gen_icons.py <ruta-al-logo.png>")
    main(sys.argv[1])
