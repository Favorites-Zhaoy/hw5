"""Static local preview; public model/vendor files use the same CORS as Pages.

No prediction endpoint, training endpoint, or business backend.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse


class StaticFiles(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs':'text/javascript', '.js':'text/javascript', '.wasm':'application/wasm'}
    def end_headers(self):
        # Lesson iframes deliberately have opaque origins. No credentials allowed.
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    handler = lambda *a, **kw: StaticFiles(*a, directory=str(root), **kw)
    print(f'Static preview: http://127.0.0.1:{args.port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), handler).serve_forever()
