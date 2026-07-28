#!/usr/bin/env python3
"""Normalize generated avatar layers onto the game's fixed 32x48 anchor grid."""

from pathlib import Path
import sys
from collections import deque
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets" / "avatar"
CELL = (320, 480)


def visible_bbox(image: Image.Image):
    alpha = image.getchannel("A").point(lambda value: 255 if value > 24 else 0)
    return alpha.getbbox()


def remove_generated_checkerboard(image: Image.Image) -> Image.Image:
    """Turn Image2's edge-connected neutral checkerboard into transparency."""
    if image.mode == "RGBA" and image.getchannel("A").getextrema()[0] < 255:
        return image
    rgb = image.convert("RGB")
    pixels = rgb.load()
    width, height = rgb.size
    seen = bytearray(width * height)
    queue = deque()

    def is_background(x, y):
        r, g, b = pixels[x, y]
        return min(r, g, b) >= 222 and max(r, g, b) - min(r, g, b) <= 14

    for x in range(width):
        for y in (0, height - 1):
            if is_background(x, y):
                seen[y * width + x] = 1
                queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if is_background(x, y):
                seen[y * width + x] = 1
                queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x-1,y-1),(x,y-1),(x+1,y-1),(x-1,y),(x+1,y),(x-1,y+1),(x,y+1),(x+1,y+1)):
            if 0 <= nx < width and 0 <= ny < height:
                index = ny * width + nx
                if not seen[index] and is_background(nx, ny):
                    seen[index] = 1
                    queue.append((nx, ny))
    rgba = rgb.convert("RGBA")
    alpha = Image.new("L", (width, height), 255)
    alpha.putdata([0 if value else 255 for value in seen])
    rgba.putalpha(alpha)
    return rgba


def normalize_sheet(name, columns, rows, targets):
    path = ASSETS / name
    source = remove_generated_checkerboard(Image.open(path))
    result = Image.new("RGBA", (CELL[0] * columns, CELL[1] * rows), (0, 0, 0, 0))

    for index in range(columns * rows):
        row, column = divmod(index, columns)
        left = round(column * source.width / columns)
        right = round((column + 1) * source.width / columns)
        top = round(row * source.height / rows)
        bottom = round((row + 1) * source.height / rows)
        item = source.crop((left, top, right, bottom))
        bbox = visible_bbox(item)
        if not bbox:
            continue
        item = item.crop(bbox)

        tx0, ty0, tx1, ty1 = targets[index] if isinstance(targets, list) else targets
        target_width, target_height = tx1 - tx0, ty1 - ty0
        ratio = min(target_width / item.width, target_height / item.height)
        fitted = item.resize(
            (max(1, round(item.width * ratio)), max(1, round(item.height * ratio))),
            Image.Resampling.NEAREST,
        )
        x = column * CELL[0] + tx0 + (target_width - fitted.width) // 2
        y = row * CELL[1] + ty0 + (target_height - fitted.height) // 2
        result.alpha_composite(fitted, (x, y))


    result.save(path)


male_accessories = [
    (70, 98, 250, 165), (70, 98, 250, 165), (70, 100, 250, 165),
    (58, 25, 262, 150), (60, 25, 260, 145), (65, 165, 255, 260),
    (105, 180, 215, 235), (52, 55, 268, 215), (55, 145, 265, 370),
    (105, 165, 215, 255),
]
female_accessories = [
    (70, 98, 250, 165), (70, 98, 250, 165), (70, 100, 250, 165),
    (75, 28, 245, 145), (55, 22, 265, 145), (65, 165, 255, 260),
    (78, 130, 242, 175), (52, 55, 268, 215), (55, 145, 265, 370),
    (105, 165, 215, 255),
]

SHEETS = {
    # Targets are measured from the actual alpha bounds and landmarks of the
    # body sheet, not from the generated item's original size. Wearables must
    # stay close to the 142 px-wide body instead of filling the whole cell.
    "male-hair-sheet-v3.png": (4, 2, (76, 58, 244, 215)),
    "female-hair-sheet-v3.png": (4, 2, (70, 32, 250, 218)),
    "male-tops-sheet-v3.png": (4, 2, (94, 207, 226, 310)),
    "female-tops-sheet-v3.png": (4, 2, (96, 188, 224, 294)),
    "male-bottoms-sheet-v3.png": (4, 2, (103, 286, 217, 397)),
    "female-bottoms-sheet-v3.png": (4, 2, (104, 278, 216, 388)),
    "male-shoes-sheet-v3.png": (6, 1, (96, 360, 224, 407)),
    "female-shoes-sheet-v3.png": (6, 1, (96, 350, 224, 398)),
    "male-accessories-sheet-v3.png": (5, 2, male_accessories),
    "female-accessories-sheet-v3.png": (5, 2, female_accessories),
}

selected = sys.argv[1:] or list(SHEETS)
for filename in selected:
    columns, rows, targets = SHEETS[filename]
    normalize_sheet(filename, columns, rows, targets)
