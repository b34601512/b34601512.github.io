"""生成微信/QQ 分享用的站点缩略图 assets/og.png（1200×630）。

用法（在项目根目录执行）：
    python scripts/build-og-image.py

设计：纯黑底 + 左上角橙色光晕，沿用站点配色（--accent #FF6B2C、正文 #F5F5F5、次要 #B8B8B8）。
文字依赖系统中文字体（Windows 的微软雅黑/黑体），非 Windows 环境请改用本机可用的中文字体。

依赖：Pillow（仅本地生成图片时使用，站点运行不依赖 Python）。
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
WIDTH, HEIGHT = 1200, 630
ACCENT = (255, 107, 44)
FG = (245, 245, 245)
FG_MUTED = (184, 184, 184)
FG_DIM = (140, 140, 140)
PAD = 80

FONT_CANDIDATES = {
    "bold": ["C:/Windows/Fonts/msyhbd.ttc", "C:/Windows/Fonts/simhei.ttf", "/System/Library/Fonts/PingFang.ttc"],
    "regular": ["C:/Windows/Fonts/msyh.ttc", "C:/Windows/Fonts/simhei.ttf", "/System/Library/Fonts/PingFang.ttc"],
}


def load_font(kind, size):
    for path in FONT_CANDIDATES[kind]:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    raise SystemExit("找不到可用的中文字体，请在 FONT_CANDIDATES 里补上本机字体路径")


def draw_glow(image):
    """在右上角铺一层橙色径向光晕，和官网首屏的氛围一致。"""
    mask = Image.new("L", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(mask)
    cx, cy, radius = int(WIDTH * 0.84), int(HEIGHT * 0.16), 460
    for step in range(28, 0, -1):
        ratio = step / 28
        r = int(radius * ratio)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=int(130 * (1 - ratio) ** 1.5) + 6)
    mask = mask.filter(ImageFilter.GaussianBlur(70))
    image.paste(Image.new("RGB", (WIDTH, HEIGHT), ACCENT), (0, 0), mask)


def main():
    canvas = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
    draw_glow(canvas)
    draw = ImageDraw.Draw(canvas)

    logo = Image.open(ROOT / "assets" / "logo.png").convert("RGBA")
    logo.thumbnail((110, 122), Image.LANCZOS)
    canvas.paste(logo, (PAD, PAD - 8), logo)

    title_font = load_font("bold", 64)
    accent_font = load_font("bold", 36)
    body_font = load_font("regular", 29)
    small_font = load_font("regular", 26)

    y = 218
    draw.text((PAD, y), "话术精灵 SoftTalk", font=title_font, fill=FG)
    draw.text((PAD, y + 96), "客服话术软件 · 团队话术管理", font=accent_font, fill=ACCENT)

    lines = [
        "一套话术拆成 0–9 十个独立模块，一键精准定位",
        "双击贴进聊天输入框，回车发送，内容存在本机",
        "本地永久免费 · 云端按工号协作",
    ]
    body_y = y + 160
    for offset, line in enumerate(lines):
        draw.text((PAD, body_y + offset * 46), line, font=body_font, fill=FG_MUTED)

    draw.rectangle((PAD, 560, PAD + 96, 564), fill=ACCENT)
    draw.text((PAD + 116, 545), "luyao2089.cc", font=small_font, fill=FG_DIM)

    output = ROOT / "assets" / "og.png"
    canvas.save(output, optimize=True)
    print(f"og.png: {WIDTH}×{HEIGHT}, {output.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
