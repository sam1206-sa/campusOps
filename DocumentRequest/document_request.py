# =====================================================================
# IMPORTS
# =====================================================================
import datetime
import logging
import re
import sqlite3
from typing import Any, Dict, List, Optional
from uagents import Agent, Context, Model, Field

# =====================================================================
# CONSTANTS
# =====================================================================
# WARNING: Change this seed phrase before deploying to production!
SEED_PHRASE = "document_request_agent_seed_phrase"
AGENT_NAME = "document_request"
PORT = 8006
ENDPOINT = ["http://127.0.0.1:8006/submit"]
DB_FILE = "document_request.db"

# Instantiate our standalone agent
document_request = Agent(
    name=AGENT_NAME,
    port=PORT,
    seed=SEED_PHRASE,
    endpoint=ENDPOINT
)

# =====================================================================
# DATABASE SETUP
# =====================================================================
def init_db() -> None:
    """
    Initialize SQLite database and create the requests table if missing.
    
    Args:
        None
    Returns:
        None
    """
    try:
        # Context-managed connection ensures the DB connection is closed cleanly
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            # Enforce foreign key constraints inside SQLite
            cursor.execute("PRAGMA foreign_keys = ON;")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    document_type TEXT NOT NULL CHECK(
                        document_type IN ('bonafide', 'transcript', 'fee_receipt', 'course_completion')
                    ),
                    status TEXT NOT NULL CHECK(
                        status IN ('pending', 'approved', 'rejected', 'ready_for_pickup')
                    ) DEFAULT 'pending',
                    reason TEXT,
                    date_requested TEXT NOT NULL,
                    date_updated TEXT
                )
            """)
            conn.commit()
    except sqlite3.Error as e:
        # Log the specific database error to avoid silent failures
        document_request.logger.error(f"Database initialization failed: {e}")
        # Re-raise so that startup logic detects DB initialization issues immediately
        raise e

# =====================================================================
# MESSAGE MODELS
# =====================================================================
class DocumentQuery(Model):
    """Incoming request model representing a user query from Orchestrator."""
    user_id: str = Field(description="The unique user identifier for the student or staff.")
    text: str = Field(description="Message details (e.g. 'I need a transcript').")

class DocumentReply(Model):
    """Outgoing message containing result and success status."""
    text: str = Field(description="Feedback message responding to user request.")
    success: bool = Field(description="Boolean status indicating overall success of request.")

# =====================================================================
# HELPER FUNCTIONS
# =====================================================================
def classify_document_type(text: str) -> Optional[str]:
    """
    Map user text keywords to a supported document type check constraint.
    
    Args:
        text (str): Incoming message text.
    Returns:
        str | None: Matched document type or None if no keywords match.
    """
    text_lower = text.lower()
    if "bonafide" in text_lower:
        return "bonafide"
    if "transcript" in text_lower or "marksheet" in text_lower:
        return "transcript"
    # Matches 'fee receipt', 'payment receipt', or 'fee_receipt'
    if "fee receipt" in text_lower or "payment receipt" in text_lower or "fee_receipt" in text_lower:
        return "fee_receipt"
    # Matches 'course completion' or 'completion letter'
    if "course completion" in text_lower or "completion letter" in text_lower or "course_completion" in text_lower:
        return "course_completion"
    return None

def extract_request_id(text: str) -> Optional[int]:
    """
    Regex parse request ID if prefixed by id, request, #, or trailing digits.
    
    Args:
        text (str): Incoming query text containing a request ID pattern.
    Returns:
        int | None: Extracted integer ID or None if not found.
    """
    match = re.search(r'(?:id|request|#)\s*:?\s*(\d+)', text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    
    # Fallback to any standalone number
    match_any = re.search(r'\b(\d+)\b', text)
    return int(match_any.group(1)) if match_any else None

def classify_document_intent(text: str) -> str:
    """
    Determine if user wants a new request, status check, admin command, or campus operations queries.
    
    Args:
        text (str): Incoming message text.
    Returns:
        str: Intent classification string.
    """
    text_lower = text.lower()
    doc_type = classify_document_type(text_lower)
    has_id = extract_request_id(text_lower) is not None
    
    # Priority 1: Admin commands (requires admin keywords and request ID)
    admin_keywords = ["approve", "reject", "deny", "ready", "pickup", "delete", "cancel", "remove"]
    if any(kw in text_lower for kw in admin_keywords) and has_id:
        return "admin_command"

    # Priority 2: Check status requests (requires status keywords and a doc or ID reference)
    status_keywords = ["status", "did i get", "is it ready", "where is my", "check status"]
    if any(kw in text_lower for kw in status_keywords) and (doc_type or has_id):
        return "check_status"
        
    # Priority 3: New requests (requires creation action verbs and a specific doc type)
    new_keywords = ["need", "want", "apply for", "request", "apply"]
    if any(kw in text_lower for kw in new_keywords) and doc_type:
        return "new_request"
        
    # General Campus Operations Categories
    if any(kw in text_lower for kw in ["exam", "timetable", "schedule", "semester"]):
        return "exams"
    if any(kw in text_lower for kw in ["wifi", "repair", "plumbing", "maintenance", "broken"]):
        return "repairs"
    if any(kw in text_lower for kw in ["rule", "policy", "gate", "timing", "out-pass", "permission"]):
        return "rules"
    if any(kw in text_lower for kw in ["announcement", "notice", "alert"]):
        return "announcements"
        
    return "unknown"

def create_request(user_id: str, document_type: str, reason: Optional[str]) -> int:
    """
    Insert a standard new document request into DB and return its row ID.
    
    Args:
        user_id (str): Unique request owner ID.
        document_type (str): Requested document type key.
        reason (str | None): Optional purpose field stated by user.
    Returns:
        int: The auto-incremented database primary ID of the request.
    """
    date_now = datetime.datetime.now().isoformat()
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            # Parameterized queries prevent SQL injection attacks
            cursor.execute(
                """
                INSERT INTO requests (user_id, document_type, status, reason, date_requested)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, document_type, "pending", reason, date_now)
            )
            conn.commit()
            return cursor.lastrowid
    except sqlite3.Error as e:
        document_request.logger.error(f"SQLITE query insertion failed: {e}")
        raise e

def simulate_auto_approval(request_id: str) -> str:
    """
    Simulate workflow approval statuses depending on administrative complexity.
    
    Args:
        request_id (str): The primary key ID of request to simulate.
    Returns:
        str: The updated status string representing the current stage.
    """
    req_numeric_id = int(request_id)
    date_now = datetime.datetime.now().isoformat()
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT document_type FROM requests WHERE id = ?", (req_numeric_id,))
            row = cursor.fetchone()
            if not row:
                raise ValueError(f"Request ID {request_id} not found in database.")
            
            doc_type = row[0]
            # Simple certificates are instant; transcripts/completions require short manual-delay mocks
            # WHY: Bonafide and Receipts are templated and fetch-ready instantly.
            # Transcripts and letters demand manual evaluation simulation.
            new_status = "ready_for_pickup" if doc_type in ("bonafide", "fee_receipt") else "approved"
            
            cursor.execute(
                "UPDATE requests SET status = ?, date_updated = ? WHERE id = ?",
                (new_status, date_now, req_numeric_id)
            )
            conn.commit()
            return new_status
    except (sqlite3.Error, ValueError) as e:
        document_request.logger.error(f"Approval simulation error: {e}")
        raise e

def get_request_status(request_id: int, user_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve single database record verifying user credentials ownership.
    
    Args:
        request_id (int): Request row index ID.
        user_id (str): Fetch client asserting ownership.
    Returns:
        dict | None: Dictionary of request details if authorized, or None.
    """
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            # WHY: Standard ownership checks stop malicious users from seeing other students' requests
            cursor.execute(
                """
                SELECT id, user_id, document_type, status, reason, date_requested, date_updated
                FROM requests
                WHERE id = ? AND user_id = ?
                """,
                (request_id, user_id)
            )
            row = cursor.fetchone()
            if row:
                return {
                    "id": row[0], "user_id": row[1], "document_type": row[2],
                    "status": row[3], "reason": row[4], "date_requested": row[5],
                    "date_updated": row[6]
                }
            return None
    except sqlite3.Error as e:
        document_request.logger.error(f"SQLITE query fetching status failed: {e}")
        raise e

def get_user_requests(user_id: str) -> List[Dict[str, Any]]:
    """
    Fetch all requests for this specific user ordered by request date descending.
    
    Args:
        user_id (str): Filter user identifier.
    Returns:
        list[dict]: Collection of relevant request dictionaries.
    """
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, user_id, document_type, status, reason, date_requested, date_updated
                FROM requests
                WHERE user_id = ?
                ORDER BY date_requested DESC
                """,
                (user_id,)
            )
            rows = cursor.fetchall()
            return [
                {
                    "id": r[0], "user_id": r[1], "document_type": r[2],
                    "status": r[3], "reason": r[4], "date_requested": r[5],
                    "date_updated": r[6]
                }
                for r in rows
            ]
    except sqlite3.Error as e:
        document_request.logger.error(f"SQLITE query fetching all items failed: {e}")
        raise e

def admin_update_status(request_id: int, status: str, reason: Optional[str] = None) -> bool:
    """
    Allows operations staff to update status and optionally reason of a request.
    """
    date_now = datetime.datetime.now().isoformat()
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            if status == "rejected" and reason:
                cursor.execute(
                    "UPDATE requests SET status = ?, reason = ?, date_updated = ? WHERE id = ?",
                    (status, reason, date_now, request_id)
                )
            else:
                cursor.execute(
                    "UPDATE requests SET status = ?, date_updated = ? WHERE id = ?",
                    (status, date_now, request_id)
                )
            conn.commit()
            return cursor.rowcount > 0
    except sqlite3.Error as e:
        document_request.logger.error(f"SQLITE admin status update failed: {e}")
        return False

def admin_delete_request(request_id: int) -> bool:
    """
    Allows operations staff to delete a request from DB.
    """
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM requests WHERE id = ?", (request_id,))
            conn.commit()
            return cursor.rowcount > 0
    except sqlite3.Error as e:
        document_request.logger.error(f"SQLITE admin delete request failed: {e}")
        return False

# =====================================================================
# MESSAGE HANDLERS
# =====================================================================
@document_request.on_message(model=DocumentQuery, replies={DocumentReply})
async def handle_document_query(ctx: Context, sender: str, msg: DocumentQuery) -> None:
    """
    Process incoming queries classifying intents to generate responses.
    
    Args:
        ctx (Context): The agent contextual session environment.
        sender (str): Message sender agent address string.
        msg (DocumentQuery): Pydantic input message validated container.
    Returns:
        None
    """
    try:
        intent = classify_document_intent(msg.text)
        
        if intent == "unknown":
            reply_text = (
                "Understood. If you need a document, please state what type you require "
                "(bonafide certificate, transcript, fee receipt, course completion letter). "
                "If searching for an existing request, specify the request ID or type 'status'."
            )
            await ctx.send(sender, DocumentReply(text=reply_text, success=True))
            return

        if intent == "exams":
            reply_text = (
                "**Semester Exam Schedule & Timetable**:\n"
                "- The Anna University CBCS Semester Exams are scheduled to begin on **November 10th**.\n"
                "- Detailed department timetables and room allocations are posted on academic notice boards.\n"
                "- Please ensure all semester tuition dues are cleared to download your digital hall ticket."
            )
            await ctx.send(sender, DocumentReply(text=reply_text, success=True))
            return

        if intent == "repairs":
            reply_text = (
                "**WiFi & Campus Maintenance Desk**:\n"
                "- **WiFi Latency/Range Problems**: Report at the Warden Office or mail `hostel-net@college.edu`.\n"
                "- **Plumbing/Electrical issues**: Call extensions 401 (Plumbing) or 402 (Electrical).\n"
                "- Maintenance tickets are resolved within **24 hours** from submission."
            )
            await ctx.send(sender, DocumentReply(text=reply_text, success=True))
            return

        if intent == "rules":
            reply_text = (
                "**Hostel Gate Timings & Regulations**:\n"
                "- **Gate Deadline**: Entry scanners close at **8:30 PM** sharp daily.\n"
                "- **Out-Pass requests**: Weekly outing pass requests require counselor approval by **Wednesday** noon.\n"
                "- **Emergency passes**: Contact the Head Warden directly for emergency leave."
            )
            await ctx.send(sender, DocumentReply(text=reply_text, success=True))
            return

        if intent == "announcements":
            reply_text = (
                "**Current Announcements & Alerts Noticeboard**:\n"
                "1. **Continuous Assessment Test II** (CAT-2) schedules are sent to student profiles.\n"
                "2. **Zoho Recruitments**: Campus hiring interview cycles begin Friday in the main auditorium.\n"
                "3. **Mess Feedback**: Special feedback forms for weekly menu recommendations are live."
            )
            await ctx.send(sender, DocumentReply(text=reply_text, success=True))
            return

        if intent == "admin_command":
            if not msg.user_id.startswith("staff"):
                reply_text = "Access Denied: Only administrative staff are authorized to perform this operation."
                await ctx.send(sender, DocumentReply(text=reply_text, success=False))
                return

            req_id = extract_request_id(msg.text)
            if req_id is None:
                reply_text = "Operational Error: Please specify a valid numeric Request ID."
                await ctx.send(sender, DocumentReply(text=reply_text, success=False))
                return

            text_lower = msg.text.lower()
            success = False
            action_performed = ""

            if "approve" in text_lower:
                success = admin_update_status(req_id, "approved")
                action_performed = "Approved"
            elif "ready" in text_lower or "pickup" in text_lower:
                success = admin_update_status(req_id, "ready_for_pickup")
                action_performed = "Marked Ready for Pickup"
            elif "reject" in text_lower or "deny" in text_lower:
                reason = "Rejected by administrator"
                reason_patterns = [
                    r'(?:because of|reason is|reason:?)\s*(.+)$',
                    r'(?:reject|deny)\s+request\s+#?\d+\s+(?:for|due to:?|because)?\s*(.+)$',
                    r':\s*(.+)$'
                ]
                for pattern in reason_patterns:
                    reason_match = re.search(pattern, msg.text, re.IGNORECASE)
                    if reason_match:
                        extracted = reason_match.group(1).strip().lstrip(":").strip()
                        if extracted and len(extracted) > 2:
                            reason = extracted
                            break
                success = admin_update_status(req_id, "rejected", reason)
                action_performed = f"Rejected (Reason: {reason})"
            elif "delete" in text_lower or "cancel" in text_lower or "remove" in text_lower:
                success = admin_delete_request(req_id)
                action_performed = "Deleted"

            if success:
                reply_text = f"Administrative Action Success: Request #{req_id} has been successfully {action_performed}."
            else:
                reply_text = f"Operational Failure: Request #{req_id} could not be updated. Ensure it exists in the system."

            await ctx.send(sender, DocumentReply(text=reply_text, success=success))
            return

        if intent == "new_request":
            doc_type = classify_document_type(msg.text)
            if not doc_type:
                reply_text = (
                    "I see you want to request a document, but I couldn't identify the type. "
                    "Available options: bonafide, transcript, fee_receipt, course_completion. "
                    "Please reply specifying one of these."
                )
                await ctx.send(sender, DocumentReply(text=reply_text, success=True))
                return

            # Extract reason if stated (e.g., "... for internship application" -> "internship application")
            reason = None
            reason_match = re.search(r'\bfor\s+(.+)$', msg.text, re.IGNORECASE)
            if reason_match:
                reason = reason_match.group(1).strip()

            req_id = create_request(msg.user_id, doc_type, reason)
            resulting_status = simulate_auto_approval(str(req_id))
            
            # Formulate user status labels
            status_desc = "ready for pickup" if resulting_status == "ready_for_pickup" else "approved (processing)"
            reply_text = (
                f"Your request for a {doc_type} has been successfully submitted "
                f"(Request ID: {req_id}). Current status: {status_desc}."
            )
            await ctx.send(sender, DocumentReply(text=reply_text, success=True))
            return

        if intent == "check_status":
            req_id = extract_request_id(msg.text)
            
            # Scenario: User provided a numeric identifier to match
            if req_id is not None:
                record = get_request_status(req_id, msg.user_id)
                if not record:
                    reply_text = f"No document request with ID #{req_id} was found under your account."
                else:
                    reply_text = (
                        f"Request #{record['id']} ({record['document_type']}) status is: "
                        f"'{record['status']}'. It was submitted on {record['date_requested']}."
                    )
                await ctx.send(sender, DocumentReply(text=reply_text, success=True))
                return

            # Scenario: Broad status request (list all requests under the user account)
            records = get_user_requests(msg.user_id)
            if not records:
                reply_text = "You do not have any active document requests on file."
            else:
                lines = [f"- ID #{r['id']} ({r['document_type']}): '{r['status']}'" for r in records]
                reply_text = "Here are your current requests on file:\n" + "\n".join(lines)
                
            await ctx.send(sender, DocumentReply(text=reply_text, success=True))
            return

    except Exception as e:
        # Catch-all exception block guarantees the Agent event loop survives runtime faults
        ctx.logger.exception(f"Unexpected error handling query: {e}")
        await ctx.send(
            sender,
            DocumentReply(
                text="Something went wrong, please try again",
                success=False
            )
        )

# =====================================================================
# STARTUP LOGIC
# =====================================================================
def seed_initial_data() -> None:
    """
    Seed initial Tamil Nadu student records and clear outdated mock records.
    """
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            
            # Clear old Western static names from DB to ensure only Tamil Nadu name profiles run
            cursor.execute(
                "DELETE FROM requests WHERE user_id IN ('student_alice_123', 'student_bob_999', 'student_gateway_test')"
            )
            conn.commit()
            
            # Seed Tamil Nadu name data if the DB is empty
            cursor.execute("SELECT COUNT(*) FROM requests")
            count = cursor.fetchone()[0]
            if count == 0:
                date_now = datetime.datetime.now().isoformat()
                seeds = [
                    ("student_priya_123", "bonafide", "ready_for_pickup", "Internship application at Zoho Chennai", date_now, date_now),
                    ("student_priya_123", "transcript", "approved", "Higher education application to Anna University", date_now, date_now),
                    ("student_karthik_999", "fee_receipt", "pending", "Education loan statement submission to SBI", date_now, None),
                    ("student_karthik_999", "course_completion", "pending", "Course completion proof for TCS onboarding", date_now, None),
                ]
                cursor.executemany(
                    """
                    INSERT INTO requests (user_id, document_type, status, reason, date_requested, date_updated)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    seeds
                )
                conn.commit()
                print("Database successfully seeded with Initial Tamil Nadu student requests.")
    except sqlite3.Error as e:
        print(f"Seeding database failed: {e}")

@document_request.on_event("startup")
async def startup(ctx: Context) -> None:
    """
    Perform agent bootstrap sequence including DB setup and statistics logging.
    
    Args:
        ctx (Context): The agent contextual session environment.
    Returns:
        None
    """
    # Prepare SQLite table
    init_db()
    seed_initial_data()
    
    # Assert public address representation string
    ctx.logger.info(f"Document Request agent registered with address: {document_request.address}")
    
    # Retrieve and log current database size/stats
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM requests")
            total_requests = cursor.fetchone()[0]
            ctx.logger.info(f"Bootstrap count: {total_requests} request(s) exist in database.")
    except sqlite3.Error as e:
        ctx.logger.error(f"Failed to fetch bootstrap statistics: {e}")

# Call execution block
if __name__ == "__main__":
    document_request.run()
