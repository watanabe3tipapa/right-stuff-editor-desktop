#!/usr/bin/env python3
"""Right-Stuff Editor Dash OG image generator (1200x630).

Usage: python3 scripts/generate_og.py [output.png]
"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
FONT_JA_BOLD = "/System/Library/Fonts/Hiragino Sans GB.ttc"
FONT_JA_MEDIUM = "/System/Library/Fonts/Hiragino Sans GB.ttc"
FONT_SERIF = "/System/Library/Fonts/Supplemental/Times New Roman Bold Italic.ttf"


def font(path, size, index=0):
    return ImageFont.truetype(path, size, index=index)


def lerp(a, b, t):
    return int(a + (b - a) * t)


def vertical_gradient(top, bottom):
    top = np.asarray(top, dtype=np.float32)
    bottom = np.asarray(bottom, dtype=np.float32)
    t = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    arr = top[None, None, :] * (1 - t) + bottom[None, None, :] * t
    return np.tile(arr, (1, W, 1))


def radial_glow(alpha_mask, cx, cy, rx, ry, color, strength=1.0):
    """alpha_mask: HxW float array. Adds a blurred radial glow of `color`."""
    n = 256
    mask = Image.new("L", (n, n), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse([2, 2, n, n], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(n * 0.28))
    mask = mask.resize((int(rx * 2), int(ry * 2)))
    left = int(cx - rx)
    top = int(cy - ry)
    for y in range(max(0, top), min(H, top + mask.height)):
        for x in range(max(0, left), min(W, left + mask.width)):
            a = mask.getpixel((x - left, y - top)) / 255.0 * strength
            if a <= 0.01:
                continue
            alpha_mask[y, x] = max(alpha_mask[y, x], a)
    return color


def rounded_gradient_rect(img, box, radius, c1, c2):
    left, top, right, bottom = box
    w, h = right - left, bottom - top
    grad = np.zeros((h, w, 3), dtype=np.float32)
    for row in range(h):
        t = row / max(h - 1, 1)
        grad[row] = np.asarray(c1, dtype=np.float32) * (1 - t) + np.asarray(
            c2, dtype=np.float32
        ) * t
    rect = Image.fromarray(grad.astype(np.uint8), "RGB")
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=255)
    img.paste(rect, (left, top), mask)
    return img


def draw_rounded_text(img, box, text, fnt, fill, bg, padding=14, radius=999):
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), text, font=fnt)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    left, top = box
    w, h = tw + padding * 2, th + padding
    d.rounded_rectangle(
        [left, top, left + w, top + h], radius=radius, fill=bg
    )
    d.text((left + padding - bbox[0], top + (h - th) // 2 - bbox[1]), text, font=fnt, fill=fill)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "public/og-right-stuff-editor-dash.png"

    base = vertical_gradient((6, 12, 26), (8, 19, 36))
    base = Image.fromarray(base.astype(np.uint8), "RGB")

    alpha = np.zeros((H, W), dtype=np.float32)
    radial_glow(alpha, 190, -40, 520, 420, (59, 130, 246), 0.55)
    radial_glow(alpha, 1050, 60, 380, 300, (99, 102, 241), 0.4)
    radial_glow(alpha, 620, 700, 700, 420, (37, 99, 235), 0.25)
    arr = np.asarray(base).astype(np.float32)
    glow = np.clip(alpha, 0, 1)[..., None]
    arr = arr * (1 - glow)
    arr = arr + np.asarray((14, 30, 70), dtype=np.float32)[None, None, :] * glow
    img = Image.fromarray(arr.astype(np.uint8), "RGB")

    f_serif = font(FONT_SERIF, 64)
    f_word = font(FONT_JA_BOLD, 42, index=2)
    f_tg = font(FONT_JA_MEDIUM, 32, index=0)
    f_sub = font(FONT_JA_MEDIUM, 22, index=0)
    f_chip = font(FONT_JA_MEDIUM, 17, index=0)
    f_mock_big = font(FONT_JA_BOLD, 30, index=2)
    f_mock_small = font(FONT_JA_MEDIUM, 15, index=0)
    f_mock_tiny = font(FONT_JA_MEDIUM, 12, index=0)

    # 左: モノグラム + ワードマーク
    rounded_gradient_rect(img, (90, 118, 90 + 104, 118 + 104), 28, (59, 130, 246), (79, 70, 229))
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), "R", font=f_serif)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(
        (90 + 52 - tw / 2 - bbox[0], 118 + 52 - th / 2 - bbox[1]),
        "R", font=f_serif, fill=(255, 255, 255),
    )

    d.text((90, 262), "Right-Stuff Editor Dash", font=f_word, fill=(248, 250, 252))
    d.text((90, 340), "思考を、途切れさせない。", font=f_tg, fill=(203, 213, 225))
    d.text((94, 400), "リッチテキスト × Markdown × ローカルAI", font=f_sub, fill=(100, 116, 139))

    chips = ["端末内保存", "GitHub Gist 連携", "画像ドラッグ&ドロップ"]
    cx = 90
    for text in chips:
        bbox = d.textbbox((0, 0), text, font=f_chip)
        w = bbox[2] - bbox[0] + 28
        draw_rounded_text(img, (cx, 458), text, f_chip, (226, 232, 240), (30, 41, 59), padding=14)
        cx += w + 10

    # 右: モックエディタ
    px, py, pw, ph = 660, 96, 460, 430
    d.rounded_rectangle([px, py, px + pw, py + ph], radius=20, fill=(15, 23, 42), outline=(38, 52, 79))
    d.ellipse([px + 26, py + 18, px + 34, py + 26], fill=(248, 113, 113))
    d.ellipse([px + 42, py + 18, px + 50, py + 26], fill=(251, 191, 36))
    d.ellipse([px + 58, py + 18, px + 66, py + 26], fill=(52, 211, 153))
    d.text((px + 160, py + 13), "Right-Stuff Editor Dash", font=f_mock_tiny, fill=(100, 116, 139))
    d.line([px, py + 48, px + pw, py + 48], fill=(30, 41, 59), width=1)

    # モックツールバー
    tb = ["H1", "B", "I", "U", "A", "link"]
    tx = px + 24
    for i, label in enumerate(tb):
        d.rounded_rectangle([tx, py + 66, tx + 34, py + 92], radius=6, fill=(30, 41, 59))
        d.text((tx + 11 - d.textlength(label, font=f_mock_tiny) / 2, py + 74), label, font=f_mock_tiny, fill=(203, 213, 225))
        tx += 42
    d.rounded_rectangle([px + pw - 74, py + 66, px + pw - 22, py + 92], radius=6, fill=(30, 41, 59))
    d.text((px + pw - 66, py + 74), "Preview", font=f_mock_tiny, fill=(147, 197, 253))

    d.text((px + 26, py + 108), "PROJECT NOTE", font=f_mock_tiny, fill=(147, 197, 253))
    d.text((px + 26, py + 132), "書くための、静かな場所。", font=f_mock_big, fill=(248, 250, 252))
    for i, wfrac in enumerate([0.62, 0.5, 0.68]):
        line_w = int(pw * wfrac)
        d.rounded_rectangle(
            [px + 26, py + 192 + i * 26, px + 26 + line_w, py + 209 + i * 26],
            radius=6, fill=(51, 65, 85),
        )
    d.line([px, py + ph - 46, px + pw, py + ph - 46], fill=(30, 41, 59), width=1)
    d.text((px + 26, py + ph - 34), "Rich Text     1,024文字    保存済み", font=f_mock_small, fill=(71, 85, 105))

    img.save(out, optimize=True)
    print(f"saved {out} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    main()