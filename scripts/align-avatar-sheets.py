#!/usr/bin/env python3
"""Normalize generated avatar item sheets onto one shared full-body canvas."""

from pathlib import Path
from typing import Iterable

from PIL import Image


ROOT = Path(__file__).resolve().parents[1] / "public" / "assets" / "avatar"
CELL_W = 320
CELL_H = 480


def cells(image: Image.Image, columns: int, rows: int) -> Iterable[Image.Image]:
    width, height = image.size
    for index in range(columns * rows):
        column = index % columns
        row = index // columns
        left = round(column * width / columns)
        right = round((column + 1) * width / columns)
        top = round(row * height / rows)
        bottom = round((row + 1) * height / rows)
        yield image.crop((left, top, right, bottom))


def fit_into(source: Image.Image, target: tuple[int, int, int, int]) -> Image.Image:
    alpha_box = source.getchannel("A").getbbox()
    layer = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    if alpha_box is None:
        return layer
    trimmed = source.crop(alpha_box)
    left, top, right, bottom = target
    target_width = max(1, right - left)
    target_height = max(1, bottom - top)
    resized = trimmed.resize((target_width, target_height), Image.Resampling.NEAREST)
    layer.alpha_composite(resized, (left, top))
    return layer


def align_sheet(
    source_name: str,
    output_name: str,
    columns: int,
    rows: int,
    targets: list[tuple[int, int, int, int]],
) -> None:
    source = Image.open(ROOT / source_name).convert("RGBA")
    source_cells = list(cells(source, columns, rows))
    if len(source_cells) != len(targets):
        raise ValueError(f"{source_name}: {len(source_cells)} cells but {len(targets)} targets")
    output = Image.new("RGBA", (columns * CELL_W, rows * CELL_H), (0, 0, 0, 0))
    for index, (source_cell, target) in enumerate(zip(source_cells, targets)):
        output.alpha_composite(
            fit_into(source_cell, target),
            ((index % columns) * CELL_W, (index // columns) * CELL_H),
        )
    output.save(ROOT / output_name, optimize=True)


def repeated(target: tuple[int, int, int, int], count: int) -> list[tuple[int, int, int, int]]:
    return [target for _ in range(count)]


def main() -> None:
    align_sheet(
        "male-hair-sheet.png",
        "male-hair-sheet-v2.png",
        4,
        2,
        repeated((65, 20, 255, 190), 8),
    )
    align_sheet(
        "female-hair-sheet.png",
        "female-hair-sheet-v2.png",
        4,
        2,
        [
            (55, 20, 265, 220),
            (55, 20, 265, 330),
            (50, 15, 270, 300),
            (55, 20, 265, 330),
            (50, 15, 270, 310),
            (60, 20, 260, 225),
            (55, 20, 265, 245),
            (60, 20, 260, 220),
        ],
    )
    align_sheet("male-tops-sheet.png", "male-tops-sheet-v2.png", 4, 2, repeated((48, 155, 272, 340), 8))
    align_sheet("female-tops-sheet.png", "female-tops-sheet-v2.png", 4, 2, repeated((48, 155, 272, 340), 8))
    align_sheet("male-bottoms-sheet.png", "male-bottoms-sheet-v2.png", 4, 2, repeated((82, 250, 238, 415), 8))
    align_sheet(
        "female-bottoms-sheet.png",
        "female-bottoms-sheet-v2.png",
        4,
        2,
        [
            (72, 235, 248, 420),
            (65, 245, 255, 350),
            (82, 245, 238, 415),
            (82, 245, 238, 415),
            (75, 245, 245, 355),
            (82, 245, 238, 415),
            (82, 245, 238, 415),
            (72, 240, 248, 410),
        ],
    )
    align_sheet("male-shoes-sheet.png", "male-shoes-sheet-v2.png", 6, 1, repeated((88, 392, 232, 438), 6))
    align_sheet("female-shoes-sheet.png", "female-shoes-sheet-v2.png", 6, 1, repeated((88, 392, 232, 438), 6))
    align_sheet(
        "male-accessories-sheet.png",
        "male-accessories-sheet-v2.png",
        5,
        2,
        [
            (55, 28, 265, 145),
            (48, 25, 272, 145),
            (82, 105, 238, 160),
            (82, 105, 238, 160),
            (78, 215, 242, 305),
            (90, 165, 230, 335),
            (70, 145, 250, 205),
            (122, 130, 198, 185),
            (102, 195, 218, 270),
            (65, 250, 255, 345),
        ],
    )
    align_sheet(
        "female-accessories-sheet.png",
        "female-accessories-sheet-v2.png",
        5,
        2,
        [
            (190, 58, 265, 125),
            (55, 65, 135, 130),
            (82, 105, 238, 160),
            (82, 105, 238, 160),
            (78, 215, 242, 305),
            (102, 195, 218, 270),
            (70, 145, 250, 205),
            (62, 45, 258, 125),
            (70, 240, 250, 350),
            (205, 100, 270, 155),
        ],
    )


if __name__ == "__main__":
    main()
