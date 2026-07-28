#!/usr/bin/env python3
"""Build deterministic paper-doll layers from the fixed body template."""

from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets" / "avatar"
CELL_WIDTH = 320
CELL_HEIGHT = 480


def build_shared_body_sheet() -> None:
    """Use one silhouette for both body types; only the eye detail differs."""
    source = Image.open(ASSETS / "body-sheet-v3.png").convert("RGBA")
    result = Image.new("RGBA", (1920, 960), (0, 0, 0, 0))
    for column in range(6):
        male = source.crop((column * CELL_WIDTH, 0, (column + 1) * CELL_WIDTH, CELL_HEIGHT))
        result.alpha_composite(male, (column * CELL_WIDTH, 0))
        result.alpha_composite(male, (column * CELL_WIDTH, CELL_HEIGHT))

        # Small outer lashes make the female eyes distinct without changing
        # the head, face, body size, or baseline.
        draw = ImageDraw.Draw(result)
        ox = column * CELL_WIDTH
        oy = CELL_HEIGHT
        eye = (58, 31, 24, 255)
        draw.rectangle((ox + 118, oy + 149, ox + 125, oy + 154), fill=eye)
        draw.rectangle((ox + 195, oy + 149, ox + 202, oy + 154), fill=eye)

    result.save(ASSETS / "body-sheet-v4.png")


def build_front_skin_layer() -> None:
    body = Image.open(ASSETS / "body-sheet-v4.png").convert("RGBA")
    front = Image.new("RGBA", body.size, (0, 0, 0, 0))

    # Only the hands need to return above long sleeves and held accessories.
    # Coordinates are measured on the shared 320×480 source cell.
    hand_regions = {
        0: ((88, 264, 123, 304), (197, 264, 232, 304)),
        1: ((88, 264, 123, 304), (197, 264, 232, 304)),
    }
    for row in range(2):
        for column in range(6):
            cell_x = column * CELL_WIDTH
            cell_y = row * CELL_HEIGHT
            for left, top, right, bottom in hand_regions[row]:
                box = (cell_x + left, cell_y + top, cell_x + right, cell_y + bottom)
                front.alpha_composite(body.crop(box), (box[0], box[1]))

    front.save(ASSETS / "body-front-skin-sheet-v1.png")


def _draw_top_previous(body_type: str, index: int) -> Image.Image:
    """Draw one native 32×48 top in its final on-body coordinates."""
    image = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    top_y = 20
    waist_y = 30
    left, right = 10, 21

    palettes = [
        ((24, 24, 28, 255), (52, 52, 60, 255), (195, 198, 205, 255)),
        ((42, 43, 48, 255), (75, 77, 84, 255), (215, 216, 219, 255)),
        ((190, 202, 216, 255), (118, 139, 166, 255), (244, 247, 250, 255)),
        ((31, 25, 36, 255), (73, 47, 82, 255), (170, 153, 184, 255)),
        ((226, 216, 198, 255), (181, 166, 145, 255), (91, 77, 64, 255)),
        ((42, 72, 118, 255), (79, 126, 183, 255), (223, 235, 247, 255)),
        ((224, 148, 170, 255), (171, 89, 119, 255), (255, 228, 235, 255)),
        ((116, 18, 37, 255), (57, 14, 26, 255), (215, 183, 150, 255)),
    ]
    base, shadow, accent = palettes[index]

    # A closed shoulder yoke is shared by every top.  It covers the body's
    # shoulder pixels first, so no style can accidentally become off-shoulder.
    draw.rectangle((13, top_y, 18, top_y + 1), fill=base)
    draw.rectangle((10, top_y + 2, 21, waist_y), fill=base)
    draw.rectangle((9, top_y + 3, 22, top_y + 5), fill=base)
    draw.rectangle((8, top_y + 5, 11, waist_y - 1), fill=base)
    draw.rectangle((20, top_y + 5, 23, waist_y - 1), fill=base)
    draw.line((9, top_y + 5, 9, waist_y - 1), fill=shadow)
    draw.line((22, top_y + 5, 22, waist_y - 1), fill=shadow)
    draw.line((10, waist_y, 21, waist_y), fill=shadow)

    if index == 0:  # luxury minimal mock neck
        draw.rectangle((14, top_y - 1, 17, top_y + 2), fill=base)
        draw.line((14, top_y + 2, 17, top_y + 2), fill=shadow)
        draw.point((15, top_y + 4), fill=accent)
        draw.point((16, top_y + 4), fill=accent)
    elif index == 1:  # deconstructed moto
        draw.polygon([(13, top_y), (18, top_y), (16, top_y + 5)], fill=shadow)
        draw.line((13, top_y + 2, 18, waist_y - 1), fill=accent)
        draw.point((12, top_y + 4), fill=accent)
        draw.point((19, top_y + 4), fill=accent)
    elif index == 2:  # Y2K track top
        draw.rectangle((14, top_y - 1, 17, top_y + 2), fill=shadow)
        draw.line((16, top_y + 1, 16, waist_y), fill=shadow)
        draw.line((10, top_y + 3, 10, waist_y - 1), fill=accent)
        draw.line((21, top_y + 3, 21, waist_y - 1), fill=accent)
    elif index == 3:  # gothic lace-up
        draw.polygon([(13, top_y), (18, top_y), (17, top_y + 4), (14, top_y + 4)], fill=shadow)
        for y in range(top_y + 4, waist_y - 1, 2):
            draw.point((15, y), fill=accent)
            draw.point((16, y + 1), fill=accent)
    elif index == 4:  # Korean cardigan
        draw.polygon([(13, top_y), (15, top_y + 4), (16, top_y + 4), (18, top_y)], fill=accent)
        draw.line((16, top_y + 4, 16, waist_y), fill=shadow)
        for y in (top_y + 6, top_y + 8):
            draw.point((15, y), fill=shadow)
    elif index == 5:  # sport varsity
        draw.rectangle((14, top_y - 1, 17, top_y + 3), fill=shadow)
        draw.line((16, top_y + 3, 16, waist_y), fill=accent)
        draw.rectangle((left, waist_y, right, waist_y), fill=accent)
        draw.rectangle((8, waist_y - 1, 11, waist_y - 1), fill=accent)
        draw.rectangle((20, waist_y - 1, 23, waist_y - 1), fill=accent)
    elif index == 6:  # cute heart knit
        draw.rectangle((14, top_y - 1, 17, top_y + 2), fill=accent)
        draw.point((15, top_y + 6), fill=accent)
        draw.point((17, top_y + 6), fill=accent)
        draw.rectangle((15, top_y + 7, 17, top_y + 7), fill=accent)
        draw.point((16, top_y + 8), fill=accent)
    else:  # oxblood tailored jacket
        draw.polygon([(13, top_y), (15, top_y + 5), (16, top_y + 4), (18, top_y)], fill=shadow)
        draw.line((16, top_y + 4, 16, waist_y), fill=accent)
        draw.point((18, top_y + 7), fill=accent)

    return image


def _draw_top_generated_v1(body_type: str, index: int) -> Image.Image:
    """Draw fitted, silhouette-led 32×48 tops for the shared body."""
    image = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    palettes = [
        ((39, 43, 52, 255), (20, 23, 30, 255), (210, 216, 223, 255)),
        ((63, 101, 151, 255), (38, 68, 111, 255), (237, 229, 211, 255)),
        ((185, 199, 211, 255), (101, 127, 151, 255), (245, 239, 217, 255)),
        ((105, 35, 48, 255), (57, 25, 35, 255), (192, 117, 104, 255)),
        ((205, 190, 164, 255), (135, 116, 91, 255), (91, 68, 52, 255)),
        ((48, 91, 148, 255), (28, 55, 96, 255), (230, 235, 224, 255)),
        ((205, 126, 153, 255), (139, 72, 101, 255), (255, 221, 226, 255)),
        ((83, 24, 38, 255), (40, 21, 29, 255), (205, 169, 119, 255)),
    ]
    base, shadow, accent = palettes[index]

    # Fitted torso, complete shoulder line and sleeves ending above the hands.
    draw.rectangle((13, 20, 18, 21), fill=base)
    draw.rectangle((10, 22, 21, 30), fill=base)
    draw.rectangle((9, 23, 22, 25), fill=base)
    draw.rectangle((8, 25, 11, 29), fill=base)
    draw.rectangle((20, 25, 23, 29), fill=base)
    draw.point((8, 29), fill=shadow)
    draw.point((23, 29), fill=shadow)
    draw.line((10, 30, 21, 30), fill=shadow)

    if index == 0:  # crew-neck tee
        draw.rectangle((14, 20, 17, 22), fill=shadow)
        draw.rectangle((8, 28, 11, 29), fill=shadow)
        draw.rectangle((20, 28, 23, 29), fill=shadow)
        draw.point((16, 26), fill=accent)
    elif index == 1:  # farmer overalls and undershirt
        draw.rectangle((8, 25, 11, 29), fill=accent)
        draw.rectangle((20, 25, 23, 29), fill=accent)
        draw.rectangle((13, 20, 18, 24), fill=accent)
        draw.rectangle((12, 23, 19, 30), fill=base)
        draw.line((12, 22, 14, 27), fill=shadow)
        draw.line((19, 22, 17, 27), fill=shadow)
        draw.point((14, 25), fill=accent)
        draw.point((18, 25), fill=accent)
        draw.rectangle((14, 27, 17, 29), fill=shadow)
    elif index == 2:  # striped knit sweater
        draw.rectangle((14, 20, 17, 22), fill=shadow)
        for y in (24, 27):
            draw.rectangle((9, y, 22, y), fill=accent)
        draw.rectangle((8, 28, 11, 29), fill=shadow)
        draw.rectangle((20, 28, 23, 29), fill=shadow)
    elif index == 3:  # plaid overshirt
        draw.rectangle((14, 20, 17, 22), fill=accent)
        draw.line((16, 22, 16, 30), fill=shadow)
        draw.line((11, 25, 21, 25), fill=accent)
        draw.line((11, 28, 21, 28), fill=shadow)
        draw.point((13, 23), fill=accent)
        draw.point((19, 23), fill=accent)
    elif index == 4:  # pullover hoodie
        draw.rectangle((13, 19, 18, 22), fill=shadow)
        draw.rectangle((14, 20, 17, 23), fill=base)
        draw.point((14, 23), fill=accent)
        draw.point((17, 23), fill=accent)
        draw.rectangle((13, 27, 18, 29), fill=shadow)
        draw.line((10, 30, 21, 30), fill=accent)
    elif index == 5:  # varsity jacket
        draw.rectangle((8, 25, 11, 29), fill=accent)
        draw.rectangle((20, 25, 23, 29), fill=accent)
        draw.rectangle((14, 20, 17, 22), fill=shadow)
        draw.line((16, 22, 16, 30), fill=accent)
        draw.point((13, 25), fill=accent)
    elif index == 6:  # collared cardigan
        draw.polygon([(13, 20), (15, 23), (16, 22), (18, 20)], fill=accent)
        draw.line((16, 23, 16, 30), fill=shadow)
        for y in (25, 28):
            draw.point((15, y), fill=accent)
        draw.rectangle((10, 29, 21, 30), fill=shadow)
    else:  # dark vest over oxblood shirt
        draw.rectangle((13, 20, 18, 22), fill=base)
        draw.polygon([(11, 22), (14, 22), (16, 26), (18, 22), (21, 22),
                      (20, 30), (11, 30)], fill=shadow)
        draw.line((16, 25, 16, 30), fill=accent)
        draw.point((18, 27), fill=accent)
    return image


def draw_top(body_type: str, index: int) -> Image.Image:
    """Final eight tops traced from docs/avatar-outfit-reference-v1.png."""
    image = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    black = (24, 25, 29, 255)
    near_black = (12, 13, 16, 255)
    silver = (190, 195, 201, 255)

    if index == 0:  # fitted black turtleneck
        draw.rectangle((14, 19, 17, 22), fill=near_black)
        draw.rectangle((10, 22, 21, 30), fill=black)
        draw.rectangle((9, 23, 22, 25), fill=black)
        draw.rectangle((8, 25, 11, 29), fill=black)
        draw.rectangle((20, 25, 23, 29), fill=black)
        draw.rectangle((8, 29, 11, 29), fill=near_black)
        draw.rectangle((20, 29, 23, 29), fill=near_black)
        draw.point((16, 25), fill=(70, 73, 81, 255))
    elif index == 1:  # Y2K denim jacket over black tee
        denim = (55, 86, 123, 255)
        denim_dark = (31, 53, 80, 255)
        denim_light = (104, 133, 160, 255)
        draw.rectangle((13, 20, 18, 30), fill=black)
        draw.rectangle((9, 22, 13, 30), fill=denim)
        draw.rectangle((18, 22, 22, 30), fill=denim)
        draw.rectangle((8, 24, 11, 29), fill=denim)
        draw.rectangle((20, 24, 23, 29), fill=denim)
        draw.polygon([(11, 21), (14, 22), (14, 26), (12, 24)], fill=denim_light)
        draw.polygon([(20, 21), (17, 22), (17, 26), (19, 24)], fill=denim_light)
        draw.line((9, 29, 13, 29), fill=denim_dark)
        draw.line((18, 29, 22, 29), fill=denim_dark)
        draw.point((15, 24), fill=silver)
        draw.point((17, 25), fill=silver)
    elif index == 2:  # gothic long coat and oxblood shirt
        oxblood = (103, 24, 37, 255)
        red_light = (163, 59, 66, 255)
        draw.rectangle((13, 20, 18, 30), fill=oxblood)
        draw.rectangle((9, 22, 13, 31), fill=black)
        draw.rectangle((18, 22, 22, 31), fill=black)
        draw.rectangle((8, 24, 11, 29), fill=black)
        draw.rectangle((20, 24, 23, 29), fill=black)
        draw.polygon([(11, 21), (15, 25), (13, 29), (10, 24)], fill=(48, 24, 31, 255))
        draw.polygon([(20, 21), (17, 25), (18, 29), (21, 24)], fill=(48, 24, 31, 255))
        draw.rectangle((10, 30, 13, 35), fill=black)
        draw.rectangle((18, 30, 21, 35), fill=black)
        draw.line((16, 21, 16, 30), fill=red_light)
        draw.rectangle((8, 29, 11, 29), fill=oxblood)
        draw.rectangle((20, 29, 23, 29), fill=oxblood)
    elif index == 3:  # Korean neutral trench layering
        beige = (190, 169, 139, 255)
        beige_dark = (112, 92, 69, 255)
        cream = (235, 228, 212, 255)
        draw.rectangle((13, 20, 18, 30), fill=cream)
        draw.rectangle((9, 22, 13, 31), fill=beige)
        draw.rectangle((18, 22, 22, 31), fill=beige)
        draw.rectangle((8, 24, 11, 29), fill=beige)
        draw.rectangle((20, 24, 23, 29), fill=beige)
        draw.polygon([(11, 21), (15, 25), (13, 28), (10, 23)], fill=(218, 202, 180, 255))
        draw.polygon([(20, 21), (17, 25), (18, 28), (21, 23)], fill=(218, 202, 180, 255))
        draw.rectangle((10, 30, 13, 35), fill=beige)
        draw.rectangle((18, 30, 21, 35), fill=beige)
        draw.point((12, 27), fill=beige_dark)
        draw.point((19, 27), fill=beige_dark)
    elif index == 4:  # black track jacket with white piping
        white = (229, 232, 231, 255)
        draw.rectangle((14, 20, 17, 22), fill=near_black)
        draw.rectangle((10, 22, 21, 30), fill=black)
        draw.rectangle((9, 23, 22, 25), fill=black)
        draw.rectangle((8, 25, 11, 29), fill=black)
        draw.rectangle((20, 25, 23, 29), fill=black)
        draw.line((16, 22, 16, 30), fill=(75, 79, 87, 255))
        draw.line((9, 24, 9, 29), fill=white)
        draw.line((22, 24, 22, 29), fill=white)
        draw.line((10, 30, 21, 30), fill=near_black)
        draw.rectangle((18, 24, 19, 24), fill=white)
    elif index == 5:  # dusty-pink blazer over black top
        pink = (188, 112, 129, 255)
        pink_dark = (117, 62, 80, 255)
        blush = (220, 157, 167, 255)
        draw.rectangle((13, 20, 18, 30), fill=black)
        draw.rectangle((9, 22, 13, 30), fill=pink)
        draw.rectangle((18, 22, 22, 30), fill=pink)
        draw.rectangle((8, 24, 11, 29), fill=pink)
        draw.rectangle((20, 24, 23, 29), fill=pink)
        draw.polygon([(11, 21), (15, 25), (13, 28), (10, 23)], fill=blush)
        draw.polygon([(20, 21), (17, 25), (18, 28), (21, 23)], fill=blush)
        draw.line((10, 30, 21, 30), fill=pink_dark)
        draw.point((19, 27), fill=silver)
    elif index == 6:  # asymmetric biker jacket
        leather = (22, 23, 27, 255)
        leather_light = (61, 64, 70, 255)
        draw.rectangle((13, 20, 18, 30), fill=near_black)
        draw.rectangle((9, 22, 22, 30), fill=leather)
        draw.rectangle((8, 24, 11, 29), fill=leather)
        draw.rectangle((20, 24, 23, 29), fill=leather)
        draw.polygon([(11, 21), (16, 25), (13, 28), (10, 23)], fill=leather_light)
        draw.polygon([(20, 21), (17, 24), (18, 27), (21, 23)], fill=leather_light)
        draw.line((13, 22, 19, 29), fill=silver)
        draw.point((12, 27), fill=silver)
        draw.point((20, 26), fill=silver)
        draw.line((10, 30, 21, 30), fill=near_black)
    else:  # dark-academia vest, white shirt and tie
        brown = (70, 48, 35, 255)
        brown_dark = (39, 29, 24, 255)
        white = (232, 225, 211, 255)
        tie = (72, 29, 31, 255)
        draw.rectangle((13, 20, 18, 30), fill=white)
        draw.rectangle((8, 24, 11, 29), fill=white)
        draw.rectangle((20, 24, 23, 29), fill=white)
        draw.polygon([(11, 22), (14, 22), (16, 25), (18, 22), (21, 22),
                      (20, 30), (11, 30)], fill=brown)
        draw.polygon([(14, 20), (16, 23), (17, 20)], fill=(255, 246, 228, 255))
        draw.polygon([(16, 22), (17, 25), (16, 28), (15, 25)], fill=tie)
        draw.line((16, 25, 16, 30), fill=brown_dark)
        draw.point((18, 27), fill=(174, 134, 82, 255))
    return image


def build_top_sheets() -> None:
    for body_type in ("male", "female"):
        sheet = Image.new("RGBA", (1280, 960), (0, 0, 0, 0))
        for index in range(8):
            native = draw_top(body_type, index)
            cell = native.resize((320, 480), Image.Resampling.NEAREST)
            column = index % 4
            row = index // 4
            sheet.alpha_composite(cell, (column * 320, row * 480))
        sheet.save(ASSETS / f"{body_type}-tops-sheet-v4.png")


def _draw_bottom_previous(body_type: str, index: int) -> Image.Image:
    image = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    female = body_type == "female"
    waist = 29
    palettes = [
        ((31, 32, 39, 255), (12, 13, 18, 255), (103, 105, 117, 255)),
        ((61, 91, 132, 255), (35, 57, 89, 255), (115, 151, 194, 255)),
        ((67, 64, 58, 255), (36, 35, 32, 255), (139, 128, 103, 255)),
        ((166, 176, 191, 255), (93, 106, 126, 255), (229, 234, 240, 255)),
        ((35, 25, 42, 255), (14, 10, 19, 255), (111, 77, 127, 255)),
        ((91, 77, 69, 255), (53, 43, 39, 255), (193, 178, 158, 255)),
        ((211, 139, 163, 255), (151, 80, 110, 255), (255, 218, 229, 255)),
        ((37, 52, 72, 255), (19, 28, 40, 255), (121, 155, 191, 255)),
    ]
    base, shadow, accent = palettes[index]
    draw.rectangle((11, waist, 20, waist + 2), fill=base)

    if index == 0:  # slim tailored trousers
        draw.rectangle((11, waist + 2, 14, 39), fill=base)
        draw.rectangle((17, waist + 2, 20, 39), fill=base)
        draw.line((14, waist + 3, 14, 39), fill=shadow)
        draw.line((17, waist + 3, 17, 39), fill=shadow)
    elif index == 1:  # wide denim
        draw.polygon([(10, waist + 1), (15, waist + 1), (14, 39), (10, 39)], fill=base)
        draw.polygon([(16, waist + 1), (21, waist + 1), (21, 39), (17, 39)], fill=base)
        draw.line((12, waist + 3, 12, 38), fill=accent)
        draw.line((19, waist + 3, 19, 38), fill=accent)
    elif index == 2:  # cargo
        draw.rectangle((10, waist + 2, 14, 39), fill=base)
        draw.rectangle((17, waist + 2, 21, 39), fill=base)
        draw.rectangle((9, waist + 5, 12, waist + 7), fill=accent)
        draw.rectangle((19, waist + 5, 22, waist + 7), fill=accent)
    elif index == 3:  # Y2K silver flare
        draw.polygon([(11, waist + 2), (15, waist + 2), (15, 35), (9, 40), (14, 40)], fill=base)
        draw.polygon([(16, waist + 2), (20, waist + 2), (22, 40), (17, 40), (16, 35)], fill=base)
        draw.line((12, waist + 3, 11, 38), fill=accent)
        draw.line((19, waist + 3, 20, 38), fill=accent)
    elif index == 4:  # gothic skirt-over-pants
        draw.rectangle((11, waist + 4, 14, 39), fill=shadow)
        draw.rectangle((17, waist + 4, 20, 39), fill=shadow)
        draw.polygon([(10, waist + 1), (21, waist + 1), (19, waist + 7), (12, waist + 7)], fill=base)
        draw.line((15, waist + 2, 15, waist + 6), fill=accent)
    elif index == 5:  # Korean pleat / clean trouser
        if female:
            draw.polygon([(10, waist + 1), (21, waist + 1), (20, waist + 8), (11, waist + 8)], fill=base)
            for x in (13, 16, 19):
                draw.line((x, waist + 2, x, waist + 7), fill=accent)
        else:
            draw.rectangle((11, waist + 2, 14, 39), fill=base)
            draw.rectangle((17, waist + 2, 20, 39), fill=base)
            draw.line((12, waist + 3, 12, 38), fill=accent)
            draw.line((19, waist + 3, 19, 38), fill=accent)
    elif index == 6:  # cute shorts
        draw.rectangle((10, waist + 1, 21, waist + 6), fill=base)
        draw.line((15, waist + 3, 15, waist + 6), fill=shadow)
        draw.point((12, waist + 2), fill=accent)
        draw.point((19, waist + 2), fill=accent)
    else:  # sport joggers
        draw.polygon([(10, waist + 2), (15, waist + 2), (14, 39), (11, 39)], fill=base)
        draw.polygon([(16, waist + 2), (21, waist + 2), (20, 39), (17, 39)], fill=base)
        draw.line((11, waist + 3, 11, 37), fill=accent)
        draw.line((20, waist + 3, 20, 37), fill=accent)
        draw.rectangle((11, 39, 14, 39), fill=shadow)
        draw.rectangle((17, 39, 20, 39), fill=shadow)
    return image


def _draw_bottom_generated_v1(body_type: str, index: int) -> Image.Image:
    """Draw bottoms locked to the shared waist, crotch, legs and shoe line."""
    image = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    palettes = [
        ((43, 45, 53, 255), (20, 22, 29, 255), (93, 99, 111, 255)),
        ((68, 105, 151, 255), (37, 66, 104, 255), (119, 153, 191, 255)),
        ((83, 77, 62, 255), (46, 43, 36, 255), (150, 132, 94, 255)),
        ((160, 174, 191, 255), (90, 105, 124, 255), (225, 232, 239, 255)),
        ((52, 35, 62, 255), (26, 18, 34, 255), (123, 84, 139, 255)),
        ((104, 85, 73, 255), (59, 48, 42, 255), (191, 167, 141, 255)),
        ((202, 130, 154, 255), (139, 72, 101, 255), (248, 204, 218, 255)),
        ((43, 60, 82, 255), (23, 34, 49, 255), (103, 137, 174, 255)),
    ]
    base, shadow, accent = palettes[index]

    # Every style begins with a continuous fitted rise that fully covers the
    # underwear and meets the shirt hem. Legs split only below the crotch.
    draw.rectangle((10, 29, 21, 32), fill=base)
    draw.line((10, 29, 21, 29), fill=accent)

    if index == 0:  # straight farmer trousers
        draw.rectangle((11, 33, 14, 39), fill=base)
        draw.rectangle((17, 33, 20, 39), fill=base)
        draw.line((14, 33, 14, 39), fill=shadow)
        draw.line((17, 33, 17, 39), fill=shadow)
        draw.point((15, 30), fill=shadow)
    elif index == 1:  # cuffed jeans
        draw.rectangle((10, 33, 14, 39), fill=base)
        draw.rectangle((17, 33, 21, 39), fill=base)
        draw.line((11, 33, 11, 37), fill=accent)
        draw.line((20, 33, 20, 37), fill=accent)
        draw.rectangle((10, 38, 14, 39), fill=shadow)
        draw.rectangle((17, 38, 21, 39), fill=shadow)
        draw.point((12, 30), fill=accent)
        draw.point((19, 30), fill=accent)
    elif index == 2:  # work cargo pants
        draw.rectangle((10, 33, 14, 39), fill=base)
        draw.rectangle((17, 33, 21, 39), fill=base)
        draw.rectangle((9, 34, 11, 36), fill=accent)
        draw.rectangle((20, 34, 22, 36), fill=accent)
        draw.point((10, 35), fill=shadow)
        draw.point((21, 35), fill=shadow)
    elif index == 3:  # relaxed shorts
        draw.rectangle((10, 33, 14, 35), fill=base)
        draw.rectangle((17, 33, 21, 35), fill=base)
        draw.line((10, 35, 14, 35), fill=shadow)
        draw.line((17, 35, 21, 35), fill=shadow)
        draw.point((15, 31), fill=shadow)
    elif index == 4:  # skirt over fitted shorts
        draw.rectangle((12, 32, 14, 35), fill=shadow)
        draw.rectangle((17, 32, 19, 35), fill=shadow)
        draw.polygon([(10, 30), (21, 30), (22, 35), (9, 35)], fill=base)
        draw.line((9, 35, 22, 35), fill=shadow)
        draw.point((13, 32), fill=accent)
        draw.point((18, 32), fill=accent)
    elif index == 5:  # relaxed linen pants
        draw.polygon([(10, 32), (15, 32), (14, 39), (10, 39)], fill=base)
        draw.polygon([(16, 32), (21, 32), (21, 39), (17, 39)], fill=base)
        draw.line((11, 33, 11, 38), fill=accent)
        draw.line((20, 33, 20, 38), fill=accent)
    elif index == 6:  # pleated skirt
        draw.polygon([(10, 30), (21, 30), (22, 36), (9, 36)], fill=base)
        for x in (12, 15, 18):
            draw.line((x, 31, x, 35), fill=accent)
        draw.line((9, 36, 22, 36), fill=shadow)
    else:  # tapered joggers
        draw.polygon([(10, 32), (15, 32), (14, 39), (11, 39)], fill=base)
        draw.polygon([(16, 32), (21, 32), (20, 39), (17, 39)], fill=base)
        draw.line((10, 33, 10, 37), fill=accent)
        draw.line((21, 33, 21, 37), fill=accent)
        draw.rectangle((11, 38, 14, 39), fill=shadow)
        draw.rectangle((17, 38, 20, 39), fill=shadow)
    return image


def draw_bottom(body_type: str, index: int) -> Image.Image:
    """Final eight bottoms paired with the generated outfit reference."""
    image = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    palettes = [
        ((26, 27, 31, 255), (12, 13, 16, 255), (175, 179, 184, 255)),
        ((55, 86, 123, 255), (31, 53, 80, 255), (104, 133, 160, 255)),
        ((30, 30, 34, 255), (13, 14, 17, 255), (109, 31, 43, 255)),
        ((137, 119, 94, 255), (83, 70, 55, 255), (205, 190, 166, 255)),
        ((22, 23, 27, 255), (10, 11, 14, 255), (230, 232, 231, 255)),
        ((47, 49, 55, 255), (24, 26, 31, 255), (190, 195, 201, 255)),
        ((61, 63, 68, 255), (30, 32, 36, 255), (117, 121, 129, 255)),
        ((72, 50, 37, 255), (39, 29, 24, 255), (146, 113, 79, 255)),
    ]
    base, shadow, accent = palettes[index]

    # Full rise always covers the original underwear and locks to the shirt.
    draw.rectangle((10, 29, 21, 32), fill=base)
    draw.point((15, 30), fill=shadow)
    draw.point((16, 30), fill=shadow)

    if index == 0:  # black tailored trousers and belt
        draw.rectangle((11, 33, 14, 39), fill=base)
        draw.rectangle((17, 33, 20, 39), fill=base)
        draw.line((14, 33, 14, 39), fill=shadow)
        draw.line((17, 33, 17, 39), fill=shadow)
        draw.line((10, 29, 21, 29), fill=shadow)
        draw.rectangle((15, 29, 16, 30), fill=accent)
    elif index == 1:  # Y2K straight jeans with cuffs
        draw.rectangle((10, 33, 14, 39), fill=base)
        draw.rectangle((17, 33, 21, 39), fill=base)
        draw.line((11, 33, 11, 37), fill=accent)
        draw.line((20, 33, 20, 37), fill=accent)
        draw.rectangle((10, 38, 14, 39), fill=accent)
        draw.rectangle((17, 38, 21, 39), fill=accent)
        draw.rectangle((15, 29, 16, 30), fill=shadow)
    elif index == 2:  # gothic straight trousers
        draw.rectangle((10, 33, 14, 39), fill=base)
        draw.rectangle((17, 33, 21, 39), fill=base)
        draw.line((10, 32, 10, 38), fill=accent)
        draw.line((21, 32, 21, 38), fill=accent)
        draw.line((10, 29, 21, 29), fill=shadow)
        draw.point((19, 31), fill=(180, 181, 184, 255))
    elif index == 3:  # Korean taupe wide trousers
        draw.polygon([(10, 32), (15, 32), (14, 39), (9, 39)], fill=base)
        draw.polygon([(16, 32), (21, 32), (22, 39), (17, 39)], fill=base)
        draw.line((12, 33, 12, 38), fill=accent)
        draw.line((19, 33, 19, 38), fill=accent)
        draw.line((10, 29, 21, 29), fill=shadow)
    elif index == 4:  # sleek track pants
        draw.polygon([(10, 32), (15, 32), (14, 39), (11, 39)], fill=base)
        draw.polygon([(16, 32), (21, 32), (20, 39), (17, 39)], fill=base)
        draw.line((10, 32, 10, 38), fill=accent)
        draw.line((21, 32, 21, 38), fill=accent)
        draw.rectangle((11, 39, 14, 39), fill=shadow)
        draw.rectangle((17, 39, 20, 39), fill=shadow)
    elif index == 5:  # charcoal wide-leg trousers with chain
        draw.polygon([(10, 32), (15, 32), (15, 39), (9, 39)], fill=base)
        draw.polygon([(16, 32), (21, 32), (22, 39), (16, 39)], fill=base)
        draw.line((12, 33, 12, 38), fill=accent)
        draw.line((19, 33, 19, 38), fill=accent)
        draw.line((20, 30, 22, 34), fill=accent)
        draw.point((21, 35), fill=accent)
    elif index == 6:  # refined charcoal tailored pants
        draw.rectangle((10, 33, 14, 39), fill=base)
        draw.rectangle((17, 33, 21, 39), fill=base)
        draw.line((12, 33, 12, 38), fill=accent)
        draw.line((19, 33, 19, 38), fill=accent)
        draw.line((10, 29, 21, 29), fill=shadow)
    else:  # dark-academia brown trousers
        draw.rectangle((10, 33, 14, 39), fill=base)
        draw.rectangle((17, 33, 21, 39), fill=base)
        draw.line((11, 33, 11, 38), fill=accent)
        draw.line((20, 33, 20, 38), fill=accent)
        draw.line((10, 29, 21, 29), fill=shadow)
        draw.rectangle((15, 29, 16, 30), fill=(168, 132, 83, 255))
    return image


def draw_shoes(body_type: str, index: int) -> Image.Image:
    image = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    palettes = [
        ((28, 29, 34, 255), (9, 10, 13, 255), (203, 205, 211, 255)),
        ((226, 228, 231, 255), (139, 145, 154, 255), (255, 255, 255, 255)),
        ((91, 55, 36, 255), (47, 28, 20, 255), (182, 128, 84, 255)),
        ((35, 34, 42, 255), (11, 10, 15, 255), (129, 105, 151, 255)),
        ((205, 143, 164, 255), (139, 81, 106, 255), (255, 222, 231, 255)),
        ((66, 91, 126, 255), (28, 43, 63, 255), (173, 201, 226, 255)),
    ]
    base, shadow, accent = palettes[index]
    # Stardew-like shoes are tiny clusters attached to each leg, not two
    # striped rectangles. Each style keeps a full two-pixel gap in the middle.
    if index == 0:  # everyday dark shoes
        draw.polygon([(11, 38), (14, 38), (14, 40), (10, 40), (10, 39)], fill=base)
        draw.polygon([(17, 38), (20, 38), (21, 39), (21, 40), (17, 40)], fill=base)
        draw.line((10, 40, 14, 40), fill=shadow)
        draw.line((17, 40, 21, 40), fill=shadow)
        draw.point((11, 38), fill=accent)
        draw.point((20, 38), fill=accent)
    elif index == 1:  # light sneakers
        draw.polygon([(11, 38), (14, 38), (14, 40), (10, 40), (10, 39)], fill=base)
        draw.polygon([(17, 38), (20, 38), (21, 39), (21, 40), (17, 40)], fill=base)
        draw.point((12, 39), fill=accent)
        draw.point((19, 39), fill=accent)
        draw.line((10, 40, 14, 40), fill=shadow)
        draw.line((17, 40, 21, 40), fill=shadow)
    elif index == 2:  # compact work boots
        draw.rectangle((11, 36, 14, 39), fill=base)
        draw.rectangle((17, 36, 20, 39), fill=base)
        draw.rectangle((10, 39, 14, 40), fill=base)
        draw.rectangle((17, 39, 21, 40), fill=base)
        draw.point((11, 37), fill=accent)
        draw.point((20, 37), fill=accent)
        draw.line((10, 40, 14, 40), fill=shadow)
        draw.line((17, 40, 21, 40), fill=shadow)
    elif index == 3:  # low dress shoes
        draw.rectangle((10, 39, 14, 40), fill=base)
        draw.rectangle((17, 39, 21, 40), fill=base)
        draw.point((13, 39), fill=accent)
        draw.point((18, 39), fill=accent)
        draw.point((10, 40), fill=shadow)
        draw.point((21, 40), fill=shadow)
    elif index == 4:  # small flats
        draw.rectangle((11, 39, 14, 40), fill=base)
        draw.rectangle((17, 39, 20, 40), fill=base)
        draw.point((12, 39), fill=accent)
        draw.point((19, 39), fill=accent)
        draw.point((11, 40), fill=shadow)
        draw.point((20, 40), fill=shadow)
    else:  # two-tone trainers
        draw.polygon([(11, 38), (14, 38), (14, 40), (10, 40), (10, 39)], fill=base)
        draw.polygon([(17, 38), (20, 38), (21, 39), (21, 40), (17, 40)], fill=base)
        draw.point((11, 39), fill=accent)
        draw.point((20, 39), fill=accent)
        draw.line((10, 40, 14, 40), fill=shadow)
        draw.line((17, 40, 21, 40), fill=shadow)
    return image


def build_bottom_and_shoe_sheets() -> None:
    for body_type in ("male", "female"):
        bottoms = Image.new("RGBA", (1280, 960), (0, 0, 0, 0))
        for index in range(8):
            cell = draw_bottom(body_type, index).resize((320, 480), Image.Resampling.NEAREST)
            bottoms.alpha_composite(cell, ((index % 4) * 320, (index // 4) * 480))
        bottoms.save(ASSETS / f"{body_type}-bottoms-sheet-v4.png")

        shoes = Image.new("RGBA", (1920, 480), (0, 0, 0, 0))
        for index in range(6):
            cell = draw_shoes(body_type, index).resize((320, 480), Image.Resampling.NEAREST)
            shoes.alpha_composite(cell, (index * 320, 0))
        shoes.save(ASSETS / f"{body_type}-shoes-sheet-v4.png")


def draw_female_hair(index: int, back: bool) -> Image.Image:
    image = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    base = (74, 51, 39, 255)
    dark = (43, 29, 23, 255)
    light = (118, 82, 61, 255)
    top = 6

    if back:
        if index == 0:  # rounded bob
            draw.polygon([(10, top + 3), (21, top + 3), (23, top + 7), (22, top + 17),
                          (20, top + 19), (11, top + 19), (9, top + 17), (8, top + 7)], fill=dark)
            draw.rectangle((10, top + 6, 21, top + 17), fill=base)
        elif index in (1, 2, 3, 5):
            length = {1: 29, 2: 33, 3: 30, 5: 35}[index]
            draw.polygon([(11, top + 2), (20, top + 2), (23, top + 7), (22, length - 2),
                          (20, length), (11, length), (9, length - 2), (8, top + 7)], fill=dark)
            draw.polygon([(11, top + 4), (20, top + 4), (21, top + 8), (20, length - 2),
                          (11, length - 2), (10, top + 8)], fill=base)
        elif index == 4:  # large romantic waves
            draw.polygon([(10, top + 3), (21, top + 3), (24, top + 8), (23, top + 27),
                          (21, top + 30), (19, top + 27), (17, top + 30), (15, top + 27),
                          (13, top + 30), (10, top + 27), (8, top + 9)], fill=dark)
            for x, y in ((9, 13), (8, 18), (9, 23), (20, 13), (21, 18), (20, 23)):
                draw.rectangle((x, y, x + 3, y + 4), fill=base)
                draw.point((x + 1, y + 1), fill=light)
        elif index == 6:  # high-crown twin tails
            draw.rectangle((10, top + 2, 21, top + 13), fill=dark)
            draw.polygon([(9, top + 8), (5, top + 11), (6, top + 25), (9, top + 28),
                          (11, top + 25), (10, top + 11)], fill=base)
            draw.polygon([(22, top + 8), (26, top + 11), (25, top + 25), (22, top + 28),
                          (20, top + 25), (21, top + 11)], fill=base)
        elif index == 7:  # double buns
            draw.rectangle((10, top + 5, 21, top + 15), fill=dark)
            draw.rectangle((6, top + 2, 11, top + 7), fill=base)
            draw.rectangle((20, top + 2, 25, top + 7), fill=base)
        return image

    if index == 0:  # soft bob fringe
        draw.polygon([(11, top), (20, top), (23, top + 4), (22, top + 11),
                      (20, top + 9), (19, top + 6), (17, top + 9), (15, top + 6),
                      (13, top + 9), (10, top + 11), (8, top + 7), (9, top + 3)], fill=base)
    elif index == 1:  # long side bangs
        draw.polygon([(11, top), (20, top), (23, top + 4), (22, top + 10),
                      (19, top + 11), (18, top + 6), (15, top + 9), (12, top + 11),
                      (9, top + 9), (8, top + 4)], fill=base)
        draw.line((17, top + 1, 14, top + 8), fill=light)
    elif index == 2:  # curtain bangs
        draw.rectangle((10, top + 1, 21, top + 5), fill=base)
        draw.polygon([(9, top + 4), (15, top + 4), (14, top + 11), (10, top + 9)], fill=base)
        draw.polygon([(17, top + 4), (22, top + 4), (21, top + 9), (18, top + 11)], fill=base)
        draw.line((16, top + 1, 16, top + 6), fill=light)
    elif index == 3:  # layered wolf cut
        draw.polygon([(11, top), (20, top + 1), (23, top + 5), (21, top + 13),
                      (19, top + 10), (17, top + 12), (15, top + 8), (12, top + 12),
                      (9, top + 10), (8, top + 4)], fill=base)
    elif index == 4:  # large romantic waves, open forehead
        draw.polygon([(11, top), (20, top), (23, top + 4), (22, top + 10),
                      (20, top + 12), (18, top + 8), (16, top + 5), (14, top + 8),
                      (12, top + 12), (9, top + 10), (8, top + 4)], fill=base)
        draw.point((11, top + 2), fill=light)
        draw.point((20, top + 3), fill=light)
    elif index == 5:  # long straight center part
        draw.rectangle((10, top + 1, 21, top + 5), fill=base)
        draw.polygon([(9, top + 4), (15, top + 4), (14, top + 12), (9, top + 10)], fill=base)
        draw.polygon([(17, top + 4), (22, top + 4), (22, top + 10), (18, top + 12)], fill=base)
        draw.line((16, top + 1, 16, top + 6), fill=light)
    elif index == 6:  # high-crown twin-tail fringe
        draw.polygon([(11, top - 2), (20, top - 2), (22, top + 1), (22, top + 7), (19, top + 9),
                      (17, top + 6), (15, top + 9), (12, top + 6), (9, top + 9)], fill=base)
    else:  # bun fringe
        draw.polygon([(10, top + 3), (21, top + 3), (22, top + 8), (19, top + 9),
                      (17, top + 6), (14, top + 9), (9, top + 8)], fill=base)
    draw.point((12, top + 1), fill=light)
    draw.rectangle((12, 14, 19, 19), fill=(0, 0, 0, 0))
    return image


def draw_hair(body_type: str, index: int, back: bool) -> Image.Image:
    if body_type == "female":
        return draw_female_hair(index, back)
    image = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    top = 6
    left, right = 9, 22
    base = (74, 51, 39, 255)
    dark = (43, 29, 23, 255)
    light = (118, 82, 61, 255)

    if back:
        return image

    # Eight compact masculine silhouettes with readable 32px clusters.
    if index == 0:  # classic crop
        draw.polygon([(11, 6), (20, 6), (22, 8), (22, 13), (20, 12),
                      (19, 10), (12, 10), (11, 13), (9, 12), (9, 8)], fill=base)
        draw.line((12, 6, 18, 6), fill=light)
    elif index == 1:  # textured side part
        draw.polygon([(10, 9), (12, 6), (20, 6), (23, 9), (22, 13),
                      (19, 12), (18, 9), (15, 11), (12, 13), (9, 12)], fill=base)
        draw.line((17, 6, 14, 10), fill=light)
    elif index == 2:  # clean middle part
        draw.polygon([(10, 8), (13, 6), (19, 6), (22, 8), (22, 13),
                      (19, 12), (17, 9), (16, 8), (14, 9), (12, 12), (9, 12)], fill=base)
        draw.point((16, 6), fill=light)
    elif index == 3:  # short spiky crop
        draw.polygon([(9, 10), (11, 6), (13, 7), (15, 4), (17, 7), (20, 5),
                      (21, 8), (23, 9), (22, 13), (19, 11), (12, 12)], fill=base)
        draw.point((15, 5), fill=light)
    elif index == 4:  # neat buzz cut
        draw.polygon([(11, 8), (13, 6), (19, 6), (21, 8), (22, 12),
                      (20, 11), (12, 11), (10, 12), (9, 9)], fill=dark)
        draw.rectangle((12, 7, 20, 9), fill=base)
    elif index == 5:  # swept quiff
        draw.polygon([(9, 10), (11, 7), (14, 6), (17, 4), (21, 5), (23, 8),
                      (22, 12), (19, 11), (17, 9), (13, 11), (10, 13)], fill=base)
        draw.line((17, 5, 20, 5), fill=light)
    elif index == 6:  # compact curls
        for x, y in ((10, 8), (12, 6), (15, 5), (18, 5), (20, 7), (21, 10),
                     (17, 8), (13, 9), (10, 11)):
            draw.rectangle((x, y, x + 2, y + 2), fill=base)
        draw.point((16, 5), fill=light)
    else:  # tidy undercut
        draw.polygon([(10, 9), (12, 6), (21, 5), (23, 8), (22, 11),
                      (19, 10), (17, 8), (13, 10), (10, 12)], fill=base)
        draw.line((10, 12, 22, 12), fill=dark)
        draw.line((14, 7, 20, 6), fill=light)
    draw.rectangle((12, 14, 19, 19), fill=(0, 0, 0, 0))
    return image


def build_hair_sheets() -> None:
    for body_type in ("male", "female"):
        for back in (True, False):
            sheet = Image.new("RGBA", (1280, 960), (0, 0, 0, 0))
            for index in range(8):
                cell = draw_hair(body_type, index, back).resize((320, 480), Image.Resampling.NEAREST)
                sheet.alpha_composite(cell, ((index % 4) * 320, (index // 4) * 480))
            suffix = "hair-back" if back else "hair"
            sheet.save(ASSETS / f"{body_type}-{suffix}-sheet-v4.png")


def draw_accessory(body_type: str, index: int) -> Image.Image:
    image = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    female = body_type == "female"
    face_y = 15
    if index == 0:  # slim sunglasses
        draw.rectangle((11, face_y, 14, face_y + 2), fill=(26, 27, 33, 255))
        draw.rectangle((17, face_y, 20, face_y + 2), fill=(26, 27, 33, 255))
        draw.line((14, face_y, 17, face_y), fill=(164, 166, 174, 255))
    elif index == 1:  # silver glasses
        silver = (196, 203, 211, 255)
        draw.rectangle((11, face_y, 14, face_y + 2), outline=silver)
        draw.rectangle((17, face_y, 20, face_y + 2), outline=silver)
        draw.line((14, face_y + 1, 17, face_y + 1), fill=silver)
    elif index == 2:  # earrings
        draw.point((9, face_y + 4), fill=(223, 207, 155, 255))
        draw.point((22, face_y + 4), fill=(223, 207, 155, 255))
    elif index == 3:  # headphones
        draw.arc((8, face_y - 5, 23, face_y + 7), 190, 350, fill=(188, 193, 204, 255), width=1)
        draw.rectangle((8, face_y, 10, face_y + 5), fill=(51, 54, 64, 255))
        draw.rectangle((21, face_y, 23, face_y + 5), fill=(51, 54, 64, 255))
    elif index == 4:  # beanie
        draw.rectangle((10, 7, 21, 12), fill=(45, 46, 54, 255))
        draw.rectangle((9, 11, 22, 14), fill=(78, 79, 89, 255))
    elif index == 5:  # fine chain
        y = 23
        draw.line((13, y, 15, y + 2, 16, y + 2, 18, y), fill=(205, 207, 214, 255))
        draw.point((16, y + 3), fill=(226, 202, 128, 255))
    elif index == 6:  # gothic choker
        y = 22
        draw.line((14, y, 17, y), fill=(35, 21, 38, 255))
        draw.point((16, y + 1), fill=(156, 123, 167, 255))
    elif index == 7:  # cute hair bow
        y = 9
        draw.polygon([(20, y), (23, y - 2), (23, y + 2)], fill=(222, 127, 160, 255))
        draw.polygon([(20, y), (18, y - 2), (18, y + 2)], fill=(245, 175, 197, 255))
        draw.point((20, y), fill=(255, 224, 231, 255))
    elif index == 8:  # small gothic horns
        y = 7
        draw.polygon([(11, y + 3), (10, y - 1), (14, y + 2)], fill=(48, 37, 55, 255))
        draw.polygon([(20, y + 3), (21, y - 1), (17, y + 2)], fill=(48, 37, 55, 255))
    else:  # sport cap
        y = 7
        draw.rectangle((10, y, 21, y + 4), fill=(44, 74, 119, 255))
        draw.rectangle((8, y + 4, 18, y + 5), fill=(78, 123, 177, 255))
    return image


def build_accessory_sheets() -> None:
    for body_type in ("male", "female"):
        sheet = Image.new("RGBA", (1600, 960), (0, 0, 0, 0))
        for index in range(10):
            cell = draw_accessory(body_type, index).resize((320, 480), Image.Resampling.NEAREST)
            sheet.alpha_composite(cell, ((index % 5) * 320, (index // 5) * 480))
        sheet.save(ASSETS / f"{body_type}-accessories-sheet-v4.png")


if __name__ == "__main__":
    build_shared_body_sheet()
    build_front_skin_layer()
    build_top_sheets()
    build_bottom_and_shoe_sheets()
    build_hair_sheets()
    build_accessory_sheets()
