"""Entry-point wrapper forwarding to backend/scripts/seed_demo.py."""

from __future__ import annotations

import asyncio
from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from scripts.seed_demo import seed_demo  # noqa: E402

if __name__ == "__main__":
    asyncio.run(seed_demo())
