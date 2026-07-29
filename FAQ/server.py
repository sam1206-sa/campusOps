"""
server.py

Local Web Application Server for the Campus FAQ RAG Agent system.
Serves static web files (index.html, styles.css, app.js) and REST API endpoints
on http://127.0.0.1:8080.
"""

import os
import json
import http.server
import socketserver
from pathlib import Path

# Import sample handbook generator
from create_sample_handbook import generate_handbook_pdf

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
CHROMA_DB_DIR = "./chroma_db"
COLLECTION_NAME = "handbook_chunks"


class FAQWebHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP request handler serving web UI and RAG API endpoints."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def _send_json(self, data: dict, status: int = 200) -> None:
        """Sends a JSON response with standard CORS and content-type headers."""
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_OPTIONS(self):
        """Handle CORS pre-flight requests."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        """Handle GET requests for static files and API endpoints."""
        if self.path == "/api/status":
            return self._handle_status()
        elif self.path == "/api/fees":
            return self._send_json({
                "success": True,
                "message": "Tuition fees must be settled by 5:00 PM on the first day of classes. Late fee is $150. Refund schedule: 100% (Week 1), 75% (Week 2), 50% (Week 3), 0% (after Week 3)."
            })
        return super().do_GET()

    def do_POST(self):
        """Handle POST API endpoints."""
        if self.path == "/api/ask":
            return self._handle_ask()
        elif self.path == "/api/build-index":
            return self._handle_build_index()
        elif self.path == "/api/generate-sample-pdf":
            return self._handle_generate_pdf()
        else:
            self._send_json({"error": "Endpoint not found"}, 404)

    def _handle_status(self):
        """Returns vector store chunk count and API key availability."""
        has_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
        try:
            from faq_agent import load_vector_store
            collection = load_vector_store()
            count = collection.count()
            self._send_json({
                "indexed": True,
                "chunk_count": count,
                "has_api_key": has_key,
                "db_dir": CHROMA_DB_DIR
            })
        except Exception:
            self._send_json({
                "indexed": False,
                "chunk_count": 0,
                "has_api_key": has_key,
                "db_dir": CHROMA_DB_DIR
            })

    def _handle_generate_pdf(self):
        """Generates sample handbook PDF."""
        try:
            generate_handbook_pdf("handbook.pdf")
            self._send_json({"success": True, "message": "Sample handbook.pdf created!"})
        except Exception as e:
            self._send_json({"success": False, "message": str(e)}, 500)

    def _handle_build_index(self):
        """Triggers vector database indexing process."""
        try:
            from build_index import build_handbook_index
            from faq_agent import load_vector_store

            if not os.path.exists("handbook.pdf"):
                generate_handbook_pdf("handbook.pdf")

            build_handbook_index()
            collection = load_vector_store()
            self._send_json({
                "success": True,
                "message": "Vector index built successfully!",
                "total_chunks": collection.count()
            })
        except Exception as e:
            self._send_json({"success": False, "message": str(e)}, 500)

    def _handle_ask(self):
        """Processes user RAG query against ChromaDB and Claude API."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            payload = json.loads(body.decode("utf-8"))
            question = payload.get("question", "").strip()

            if not question:
                return self._send_json({"error": "Question parameter is required"}, 400)

            # Lazy import RAG functions
            from build_index import build_handbook_index
            from faq_agent import (
                load_vector_store,
                retrieve_relevant_chunks,
                generate_answer,
                MIN_SIMILARITY_THRESHOLD
            )

            # Ensure vector store exists; if missing, build sample automatically
            try:
                collection = load_vector_store()
            except RuntimeError:
                if not os.path.exists("handbook.pdf"):
                    generate_handbook_pdf("handbook.pdf")
                build_handbook_index()
                collection = load_vector_store()

            # Perform vector retrieval
            chunks = retrieve_relevant_chunks(question, collection, top_k=3)
            passing_chunks = [c for c in chunks if c["similarity_score"] >= MIN_SIMILARITY_THRESHOLD]

            if not passing_chunks:
                return self._send_json({
                    "answer": "I'm sorry, but this question appears to be outside the scope of the college handbook.",
                    "success": True,
                    "source_pages": [],
                    "similarity_score": chunks[0]["similarity_score"] if chunks else 0.0,
                    "chunks": chunks
                })

            top_similarity = passing_chunks[0]["similarity_score"]
            source_pages = sorted(list(set(c["source_page"] for c in passing_chunks)))

            # Synthesize answer
            answer = generate_answer(question, passing_chunks)

            self._send_json({
                "answer": answer,
                "success": True,
                "source_pages": source_pages,
                "similarity_score": top_similarity,
                "chunks": passing_chunks
            })

        except Exception as e:
            self._send_json({"error": f"RAG Processing Error: {str(e)}"}, 500)


def start_server():
    """Launches the HTTP web server on port 8080."""
    handler = FAQWebHandler
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), handler) as httpd:
        print(f"\n==================================================")
        print(f" Campus Operations FAQ Web Server is Live!")
        print(f" Localhost URL: http://127.0.0.1:{PORT}")
        print(f"==================================================\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down web server...")


if __name__ == "__main__":
    start_server()
