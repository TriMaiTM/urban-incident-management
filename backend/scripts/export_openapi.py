"""Export FastAPI OpenAPI 3.1 schema to docs/openapi.json."""

from __future__ import annotations

import json
from pathlib import Path
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app  # noqa: E402


def export_openapi(output_path: Path | None = None) -> Path:
    """Generate and write the OpenAPI JSON schema to docs/openapi.json."""
    target = output_path or (REPO_ROOT / "docs" / "openapi.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    schema = app.openapi()
    target.write_text(
        json.dumps(schema, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return target


if __name__ == "__main__":
    out_file = export_openapi()
    print(f"Exported OpenAPI schema to: {out_file}")
