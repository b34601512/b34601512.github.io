"""生成压缩后的站点图片，平衡清晰度与加载速度。

用法（在项目根目录执行）：
    python scripts/optimize-images.py <logo源文件> [<客户端platform_images目录>]

原始素材可以从 git 历史取回，例如：
    git show HEAD~1:assets/logo.png > logo-src.png

输出：
    assets/logo.png        168×187 调色板 PNG（展示最大 56px，约 3 倍图）
    assets/favicon.png     128×128 调色板 PNG
    assets/type-*.png      28×28 调色板 PNG（演示区话术类型角标，取自客户端 platform_images）

依赖：Pillow（仅本地处理图片时使用，站点运行不依赖 Python）。
"""

from pathlib import Path
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LOGO_SIZE = (168, 187)
ICON_SIZE = (128, 128)
LOGO_COLORS = 32
TYPE_ICON_SIZE = (28, 28)
TYPE_ICON_SOURCES = {
    "type-text.png": "script-text-only.png",
    "type-image.png": "script-with-image.png",
    "type-pdf.png": "script-with-pdf.png",
}


def quantize(image, colors=LOGO_COLORS):
    """把近似纯色的图压成调色板 PNG，保留透明背景。"""
    return image.quantize(colors=colors, method=Image.FASTOCTREE, dither=Image.NONE)


def build_logo(source: Path) -> None:
    original = Image.open(source).convert("RGBA")
    logo = quantize(original.resize(LOGO_SIZE, Image.LANCZOS))
    logo.save(ROOT / "assets" / "logo.png", optimize=True)

    icon = Image.new("RGBA", ICON_SIZE, (0, 0, 0, 0))
    fitted = original.copy()
    fitted.thumbnail(ICON_SIZE, Image.LANCZOS)
    icon.paste(fitted, ((ICON_SIZE[0] - fitted.width) // 2, (ICON_SIZE[1] - fitted.height) // 2), fitted)
    quantize(icon).save(ROOT / "assets" / "favicon.png", optimize=True)


def build_type_icons(platform_dir: Path) -> None:
    """把客户端的话术类型图标缩成演示区角标，保留透明边。"""
    for output_name, source_name in TYPE_ICON_SOURCES.items():
        source = platform_dir / source_name
        if not source.exists():
            raise FileNotFoundError(f"缺少客户端图标：{source}")
        icon = Image.open(source).convert("RGBA")
        icon.thumbnail(TYPE_ICON_SIZE, Image.LANCZOS)
        canvas = Image.new("RGBA", TYPE_ICON_SIZE, (0, 0, 0, 0))
        canvas.paste(icon, ((TYPE_ICON_SIZE[0] - icon.width) // 2, (TYPE_ICON_SIZE[1] - icon.height) // 2), icon)
        quantize(canvas, colors=64).save(ROOT / "assets" / output_name, optimize=True)


def report() -> None:
    for name in ("logo.png", "favicon.png", *TYPE_ICON_SOURCES):
        path = ROOT / "assets" / name
        print(f"{name}: {path.stat().st_size / 1024:.1f} KB")


def main() -> int:
    if len(sys.argv) not in (2, 3):
        print(__doc__)
        return 1

    build_logo(Path(sys.argv[1]))
    if len(sys.argv) == 3:
        build_type_icons(Path(sys.argv[2]))
    report()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
