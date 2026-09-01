"""Create upload-friendly YangRent backend/frontend ZIP files."""
from pathlib import Path
import zipfile

BASE = Path(__file__).resolve().parent
UPLOAD = BASE / "upload"


def zip_dir(src: Path, dst: Path) -> None:
    with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(src.rglob("*")):
            if path.is_file():
                zf.write(path, path.relative_to(src).as_posix())
    print(f"Created {dst.name}")


for name in ("backend", "frontend"):
    src = UPLOAD / name
    if src.is_dir():
        zip_dir(src, UPLOAD / f"yangrent-{name}.zip")
