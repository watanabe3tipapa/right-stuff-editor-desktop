#!/usr/bin/env python3
"""Right-Stuff Editor Dash favicon / app icon generator.

Generates apple-touch-icon.png (180x180) and favicon.ico (32x32)
matching the brand monogram (blue gradient square + serif italic R).
"""
from PIL import Image, ImageDraw, ImageFont

FONT_SERIF = "/System/Library/Fonts/Supplemental/Times New Roman Bold Italic.ttf"
SIZE = 512
C1 = (59, 130, 246)
C2 = (79, 70, 229)


def gear():
    pass


def draw(canvas_size=512, corner=24 * 512 // 96):
    img = Image.new("RGB", (canvas_size, canvas_size), (2, 6, 23))
    d = ImageDraw.Draw(img)
    pad = canvas_size * 12 // 512
    box = [pad, pad, canvas_size - pad, canvas_size - pad]
    grad = Image.new("RGB", (canvas_size, canvas_size))
    gd = ImageDraw.Draw(grad)
    for y in range(canvas_size):
        t = y / (canvas_size - 1)
        color = tuple(int(C1[i] + (C2[i] - C1[i]) * t) for i in range(3))
        gd.line([(0, y), (canvas_size, y)], fill=color)
    mask = Image.new("L", (canvas_size, canvas_size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        box, radius=corner, fill=255
    )
    img.paste(grad, (0, 0), mask)
    f = ImageFont.truetype(FONT_SERIF, canvas_size * 55 // 96)
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), "R", font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(
        (canvas_size / 2 - tw / 2 - bbox[0], canvas_size / 2 - th / 2 - bbox[1] + canvas_size * 1 / 96),
        "R", font=f, fill=(255, 255, 255),
    )
    return img


def main():
    base = draw()
    base.resize((180, 180), Image.LANCZOS).save("public/apple-touch-icon.png", optimize=True)
    ico = base.resize((32, 32), Image.LANCZOS)
    ico.save("public/favicon.ico", sizes=[(32, 32)])
    print("saved public/apple-touch-icon.png and public/favicon.ico")


if __name__ == "__main__":
    main()