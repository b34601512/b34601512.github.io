"""用客户端的手绘绘制代码导出站点图片（小精灵 logo、favicon、演示区话术类型角标），和客户端里是同一套笔迹。

用法（在项目根目录执行）：
    python scripts/optimize-images.py brand <客户端仓库目录，例如 D:\\SoftTalk>
    python scripts/optimize-images.py type-icons <客户端仓库目录>

每张图都按「页面上的显示尺寸 × 2」出物理像素：手绘画师按每个设计单位占几个物理像素决定线条粗细、
要不要画排线，所以不能出一张大图让浏览器去缩（缩到 24px 会细成灰边）。

输出：
    assets/logo.png        112×126（首屏 56px）
    assets/logo-small.png  52×58（导航 24px、演示区底栏 26px）
    assets/favicon.png     64×64（浏览器标签 32px）
    assets/type-*.png      28×28（演示区话术行 14px）

依赖：PySide6（仅本地生成图片时使用，站点运行不依赖 Python）。改完 logo 后记得重跑 build-og-image.py。
"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
SCALE = 2
SPRITE_OUTPUTS = {
    "logo.png": (56, 63),
    "logo-small.png": (26, 29),
    "favicon.png": (32, 32),
}
TYPE_ICON_CSS_PX = 14
TYPE_ICON_NAMES = {
    "type-text.png": "text",
    "type-image.png": "image",
    "type-pdf.png": "pdf",
}


def _load_client(client_root: Path):
    """把客户端仓库放进导入路径，并起一个离屏 Qt 应用供绘制。"""
    package = client_root / "softtalk_knowledge_client" / "ui"
    if not (package / "sprite_art_pkg").is_dir() or not (package / "hand_icons_pkg").is_dir():
        raise FileNotFoundError(f"没找到客户端手绘绘制代码：{package}")
    sys.path.insert(0, str(client_root))
    from PySide6.QtGui import QGuiApplication

    return QGuiApplication.instance() or QGuiApplication([sys.argv[0], "-platform", "offscreen"])


def _save_png(image, name: str) -> None:
    from PySide6.QtCore import QBuffer, QIODevice

    buffer = QBuffer()
    buffer.open(QIODevice.WriteOnly)
    image.save(buffer, "PNG")
    (ROOT / "assets" / name).write_bytes(bytes(buffer.data()))


def build_brand(client_root: Path) -> None:
    """待机姿态第 0 秒的小精灵，透明底、不画地面阴影（黑夜主题下阴影看不见，白天又显脏）。"""
    app = _load_client(client_root)
    from PySide6.QtCore import QSize
    from softtalk_knowledge_client.ui.sprite_art_pkg import pose_at, render_sprite_pixmap

    for name, (w, h) in SPRITE_OUTPUTS.items():
        pixmap = render_sprite_pixmap(pose_at("idle", 0.0), QSize(w * SCALE, h * SCALE), shadow=False)
        _save_png(pixmap.toImage(), name)
    del app


def build_type_icons(client_root: Path) -> None:
    """用客户端 hand_icons_pkg 按演示区显示尺寸现画角标。"""
    app = _load_client(client_root)
    from softtalk_knowledge_client.ui.hand_icons_pkg import render_hand_icon_pixmap

    for name, icon_name in TYPE_ICON_NAMES.items():
        _save_png(render_hand_icon_pixmap(icon_name, TYPE_ICON_CSS_PX, float(SCALE)).toImage(), name)
    del app


def report(names) -> None:
    for name in names:
        path = ROOT / "assets" / name
        print(f"{name}: {path.stat().st_size / 1024:.1f} KB")


def main() -> int:
    if len(sys.argv) != 3 or sys.argv[1] not in ("brand", "type-icons"):
        print(__doc__)
        return 1
    client_root = Path(sys.argv[2])
    if sys.argv[1] == "brand":
        build_brand(client_root)
        report(SPRITE_OUTPUTS)
    else:
        build_type_icons(client_root)
        report(TYPE_ICON_NAMES)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
