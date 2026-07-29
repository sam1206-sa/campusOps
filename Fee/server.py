"""
Web Server Bridge for Fee Reminder Agent.

Serves the webpage frontend on http://127.0.0.1:8080 and provides REST API
endpoints that interface directly with fee_reminder.py logic and fee_reminder.db.
"""

import json
import logging
import os
import sqlite3
from http.server import HTTPServer, SimpleHTTPRequestHandler
from typing import Any, Dict

# Import core business logic functions and constants from fee_reminder.py
from fee_reminder import (
    DB_NAME,
    classify_fee_intent,
    get_all_due_soon,
    get_user_dues,
    init_db,
    update_overdue_statuses,
)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("FeeReminderWebServer")

PORT = 8080


class FeeReminderAPIHandler(SimpleHTTPRequestHandler):
    """
    HTTP Handler serving static files (index.html, styles.css, app.js)
    and processing REST API calls for the Fee Reminder Agent portal.
    """

    def end_headers(self) -> None:
        """Add CORS headers for client requests."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.end_headers()

    def do_GET(self) -> None:
        """Route GET requests to API handlers or static files."""
        if self.path == "/api/fees":
            self.handle_get_fees()
        else:
            # Serve index.html by default or requested static files
            super().do_GET()

    def do_POST(self) -> None:
        """Route POST requests to corresponding API logic."""
        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            payload = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            payload = {}

        if self.path == "/api/query":
            self.handle_query(payload)
        elif self.path == "/api/due-fees":
            self.handle_due_fees(payload)
        elif self.path == "/api/fees/pay":
            self.handle_pay_fee(payload)
        elif self.path == "/api/fees/add":
            self.handle_add_fee(payload)
        else:
            self.send_json_response({"error": "Endpoint not found"}, status_code=404)

    def handle_query(self, payload: Dict[str, Any]) -> None:
        """
        Process FeeQuery API call matching handle_fee_query logic.
        """
        user_id = payload.get("user_id", "student_101")
        text = payload.get("text", "")

        update_overdue_statuses()
        intent = classify_fee_intent(text)

        if intent == "unknown":
            reply_text = (
                "I couldn't quite understand your request. Are you asking when a fee is due, "
                "or checking if you've already paid your fees?"
            )
            self.send_json_response({"text": reply_text, "success": True})
            return

        dues = get_user_dues(user_id)
        if not dues:
            reply_text = f"Good news! Student '{user_id}' has no pending or overdue fee dues."
        else:
            lines = [f"Fee Summary for '{user_id}':"]
            for d in dues:
                fee_name = d["fee_type"].replace("_", " ").title()
                lines.append(
                    f"• {fee_name}: ${d['amount']:.2f} | Due: {d['due_date']} | Status: {d['status'].upper()}"
                )
            reply_text = "\n".join(lines)

        self.send_json_response({"text": reply_text, "success": True})

    def handle_get_fees(self) -> None:
        """Fetch all fee records from SQLite DB for dashboard view."""
        update_overdue_statuses()
        fees_list = []
        try:
            with sqlite3.connect(DB_NAME) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id, user_id, fee_type, amount, due_date, status FROM fees ORDER BY id ASC")
                for row in cursor.fetchall():
                    fees_list.append({
                        "id": row[0],
                        "user_id": row[1],
                        "fee_type": row[2],
                        "amount": row[3],
                        "due_date": row[4],
                        "status": row[5]
                    })
        except sqlite3.Error as err:
            logger.error(f"DB Error reading fees: {err}")

        self.send_json_response({"fees": fees_list})

    def handle_due_fees(self, payload: Dict[str, Any]) -> None:
        """Process DueFeesRequest polling from Notifier agent."""
        days_ahead = int(payload.get("days_ahead", 7))
        update_overdue_statuses()
        dues = get_all_due_soon(days_ahead=days_ahead)
        self.send_json_response({"dues": dues})

    def handle_pay_fee(self, payload: Dict[str, Any]) -> None:
        """Mark a fee record as PAID."""
        fee_id = payload.get("id")
        if not fee_id:
            self.send_json_response({"error": "Missing fee ID"}, status_code=400)
            return

        try:
            with sqlite3.connect(DB_NAME) as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE fees SET status = 'paid' WHERE id = ?", (fee_id,))
                conn.commit()
            self.send_json_response({"success": True, "message": f"Fee #{fee_id} marked as PAID"})
        except sqlite3.Error as err:
            self.send_json_response({"error": str(err)}, status_code=500)

    def handle_add_fee(self, payload: Dict[str, Any]) -> None:
        """Add a new fee record to SQLite database."""
        user_id = payload.get("user_id")
        fee_type = payload.get("fee_type")
        amount = payload.get("amount")
        due_date = payload.get("due_date")
        status = payload.get("status", "pending")

        if not (user_id and fee_type and amount and due_date):
            self.send_json_response({"error": "Missing required fields"}, status_code=400)
            return

        try:
            with sqlite3.connect(DB_NAME) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO fees (user_id, fee_type, amount, due_date, status)
                    VALUES (?, ?, ?, ?, ?)
                """, (user_id, fee_type, float(amount), due_date, status))
                conn.commit()
            self.send_json_response({"success": True, "message": "Fee record added successfully"})
        except sqlite3.Error as err:
            self.send_json_response({"error": str(err)}, status_code=500)

    def send_json_response(self, data: Dict[str, Any], status_code: int = 200) -> None:
        """Helper to send JSON response back to client."""
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run_web_server() -> None:
    """Initialize DB and run web server HTTP loop."""
    init_db()
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, FeeReminderAPIHandler)
    logger.info(f"Webpage server running on http://127.0.0.1:{PORT}")
    logger.info(f"Open http://127.0.0.1:{PORT} in your web browser to test the agent webpage!")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Web server stopped.")
        httpd.server_close()


if __name__ == "__main__":
    run_web_server()
