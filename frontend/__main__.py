"""Serve the Derma-Safe AI frontend on its own port.

    python -m frontend

Expects the API at http://127.0.0.1:8000 (python -m backend).
"""

from __future__ import annotations

import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("FRONTEND_PORT", "5173"))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        print(f"[frontend] {self.address_string()} {fmt % args}")


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Derma-Safe AI frontend → http://127.0.0.1:{PORT}")
    print("Start the API with:  python -m backend")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
