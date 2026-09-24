"""生成压缩后的站点图片，平衡清晰度与加载速度。

用法（在项目根目录执行）：
    python scripts/optimize-images.py logo <logo源文件>
    python scripts/optimize-images.py type-icons <客户端仓库目录，例如 D:\\SoftTalk>

原始素材可以从 git 历史取回，例如：
    git show HEAD~1:assets/logo.png > logo-src.png

输出：
    assets/logo.png        168×187 调色板 PNG（展示最大 56px，约 3 倍图）
    assets/favicon.png     128×128 调色板 PNG
    assets/type-*.png      28×28 PNG（演示区话术类型角标，显示 14px 的 2 倍图；
                           用客户端 hand_icons_pkg 现画，和客户端列表里的角标是同一套笔迹）

依赖：Pillow；type-icons 还需要 PySide6（仅本地处理图片时使用，站点运行不依赖 Python）。
"""

from pathlib import Path
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LOGO_SIZE = (168, 187)
ICON_SIZE = (128, 128)
LOGO_COLORS = 32
TYPE_ICON_CSS_PX = 14
TYPE_ICON_SCALE = 2
TYPE_ICON_NAMES = {
    "type-text.png": "text",
    "type-image.png": "image",
    "type-pdf.png": "pdf",
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


def build_type_icons(client_root: Path) -> None:
    """用客户端的手绘图标代码按演示区显示尺寸现画角标；笔触粗细按 14px×2 的物理像素自动调整。"""
    package = client_root / "softtalk_knowledge_client" / "ui" / "hand_icons_pkg"
    if not package.is_dir():
        raise FileNotFoundError(f"没找到客户端手绘图标代码：{package}")
    sys.path.insert(0, str(client_root))
    from PySide6.QtCore import QBuffer, QIODevice
    from PySide6.QtGui import QGuiApplication

    app = QGuiApplication.instance() or QGuiApplication([sys.argv[0], "-platform", "offscreen"])
    from softtalk_knowledge_client.ui.hand_icons_pkg import render_hand_icon_pixmap

    for output_name, icon_name in TYPE_ICON_NAMES.items():
        pixmap = render_hand_icon_pixmap(icon_name, TYPE_ICON_CSS_PX, float(TYPE_ICON_SCALE))
        buffer = QBuffer()
        buffer.open(QIODevice.WriteOnly)
        pixmap.toImage().save(buffer, "PNG")
        (ROOT / "assets" / output_name).write_bytes(bytes(buffer.data()))
    del app


def report(names) -> None:
    for name in names:
        path = ROOT / "assets" / name
        print(f"{name}: {path.stat().st_size / 1024:.1f} KB")


def main() -> int:
    if len(sys.argv) != 3 or sys.argv[1] not in ("logo", "type-icons"):
        print(__doc__)
        return 1
    if sys.argv[1] == "logo":
        build_logo(Path(sys.argv[2]))
        report(("logo.png", "favicon.png"))
    else:
        build_type_icons(Path(sys.argv[2]))
        report(TYPE_ICON_NAMES)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
