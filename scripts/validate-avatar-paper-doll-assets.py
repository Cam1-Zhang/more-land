#!/usr/bin/env python3
"""Validate fixed-origin avatar sheets before they are shipped."""

from pathlib import Path
from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets" / "avatar"

SHEETS = {
    "body-sheet-v4.png": (1920, 960),
    "body-front-skin-sheet-v1.png": (1920, 960),
    "male-hair-sheet-v4.png": (1280, 960),
    "female-hair-sheet-v4.png": (1280, 960),
    "male-hair-back-sheet-v4.png": (1280, 960),
    "female-hair-back-sheet-v4.png": (1280, 960),
    "male-tops-sheet-v4.png": (1280, 960),
    "female-tops-sheet-v4.png": (1280, 960),
    "male-bottoms-sheet-v4.png": (1280, 960),
    "female-bottoms-sheet-v4.png": (1280, 960),
    "male-shoes-sheet-v4.png": (1920, 480),
    "female-shoes-sheet-v4.png": (1920, 480),
    "male-accessories-sheet-v4.png": (1600, 960),
    "female-accessories-sheet-v4.png": (1600, 960),
}


def main() -> None:
    failures = []
    for filename, expected_size in SHEETS.items():
        path = ASSETS / filename
        if not path.exists():
            failures.append(f"missing: {filename}")
            continue
        image = Image.open(path)
        if image.size != expected_size:
            failures.append(f"{filename}: expected {expected_size}, got {image.size}")
        if image.mode != "RGBA":
            failures.append(f"{filename}: expected RGBA, got {image.mode}")

    body = Image.open(ASSETS / "body-sheet-v4.png").convert("RGBA").getchannel("A")
    front = Image.open(ASSETS / "body-front-skin-sheet-v1.png").convert("RGBA").getchannel("A")
    outside_body = ImageChops.subtract(front, body)
    if outside_body.getbbox():
        failures.append("body front layer contains pixels outside the body template")

    # Male and female bodies must share the exact same silhouette and baseline.
    for skin_index in range(6):
        left = skin_index * 320
        male_alpha = body.crop((left, 0, left + 320, 480))
        female_alpha = body.crop((left, 480, left + 320, 960))
        if ImageChops.difference(male_alpha, female_alpha).getbbox():
            failures.append(f"skin {skin_index + 1}: male/female body silhouettes differ")

    # Every front hairstyle reserves the central eye area.
    for filename in ("male-hair-sheet-v4.png", "female-hair-sheet-v4.png"):
        hair_alpha = Image.open(ASSETS / filename).convert("RGBA").getchannel("A")
        for style_index in range(8):
            column = style_index % 4
            row = style_index // 4
            eye_area = hair_alpha.crop(
                (column * 320 + 120, row * 480 + 140, column * 320 + 200, row * 480 + 200)
            )
            if eye_area.getbbox():
                failures.append(f"{filename} style {style_index + 1}: hair covers the eye area")

    if failures:
        raise SystemExit("\n".join(failures))
    print("avatar paper-doll assets: OK")


if __name__ == "__main__":
    main()
