"""
Fee/Payment Reminder Agent for Campus Operations System.

Tracks student fee dues, answers fee status & due-date queries, and provides
due-soon/overdue payment data for external polling (e.g., Notifier agent).
"""

# ==============================================================================
# SECTION 1: IMPORTS
# ==============================================================================
import datetime
import logging
import sqlite3
from typing import Any, Dict, List

from uagents import Agent, Context, Model

# ==============================================================================
# SECTION 2: CONSTANTS & AGENT CONFIGURATION
# ==============================================================================
# Seed phrase for deterministic key & address generation.
# IMPORTANT: Change this seed phrase before deploying to production!
FEE_REMINDER_SEED: str = "fee_reminder_specialist_agent_secret_seed_phrase_2026"

# Agent network settings
AGENT_PORT: int = 8005
AGENT_ENDPOINT: List[str] = ["http://127.0.0.1:8005/submit"]

import os

# Database file location
DB_NAME: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fee_reminder.db")

# Placeholder address for Notifier agent (for future integration)
NOTIFIER_ADDRESS: str = "agent1q_notifier_placeholder_address_for_campus_system"

# Module logger for fallback outside agent context
logger = logging.getLogger(__name__)

# Initialize Fee Reminder Agent
fee_reminder = Agent(
    name="fee_reminder",
    seed=FEE_REMINDER_SEED,
    port=AGENT_PORT,
    endpoint=AGENT_ENDPOINT,
)


# ==============================================================================
# SECTION 3: MESSAGE MODELS (Pydantic Models)
# ==============================================================================
class FeeQuery(Model):
    """
    Incoming query from the Orchestrator regarding student fees.

    Args:
        user_id: Unique student identifier.
        text: Natural language query text.
    """
    user_id: str
    text: str


class FeeReply(Model):
    """
    Reply sent back to Orchestrator or student.

    Args:
        text: Formatted answer or clarification request.
        success: Flag indicating if processing succeeded.
    """
    text: str
    success: bool


class DueFeesRequest(Model):
    """
    Polling request from Notifier agent for upcoming/overdue fees.

    Args:
        requester: Name or address of the requesting agent.
    """
    requester: str


class DueFeesResponse(Model):
    """
    Response containing due or overdue fee items.

    Args:
        dues: List of fee records matching polling criteria.
    """
    dues: List[Dict[str, Any]]


# ==============================================================================
# SECTION 4: DATABASE SETUP & SEEDING
# ==============================================================================
def init_db(db_path: str = DB_NAME) -> None:
    """
    Initialize SQLite table schema and seed sample data on first run.

    Args:
        db_path: Path to the SQLite database file.

    Returns:
        None
    """
    try:
        # Use context manager so connection commits and closes automatically
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS fees (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    student_name TEXT,
                    register_no TEXT,
                    fee_type TEXT NOT NULL,
                    amount REAL NOT NULL,
                    due_date TEXT NOT NULL,
                    status TEXT NOT NULL CHECK(status IN ('pending', 'paid', 'overdue')),
                    last_reminded TEXT
                )
            """)

            # Migration: Ensure student_name & register_no columns exist
            cursor.execute("PRAGMA table_info(fees)")
            cols = [c[1] for c in cursor.fetchall()]
            if "student_name" not in cols:
                cursor.execute("ALTER TABLE fees ADD COLUMN student_name TEXT")
            if "register_no" not in cols:
                cursor.execute("ALTER TABLE fees ADD COLUMN register_no TEXT")

            cursor.execute("SELECT COUNT(*) FROM fees")
            count = cursor.fetchone()[0]

            # Seed sample data if table is empty
            if count == 0:
                today = datetime.date.today()
                past_due = (today - datetime.timedelta(days=10)).isoformat()
                due_soon_1 = (today + datetime.timedelta(days=3)).isoformat()
                due_soon_2 = (today + datetime.timedelta(days=5)).isoformat()
                due_later = (today + datetime.timedelta(days=25)).isoformat()

                sample_fees = [
                    ("student_101", "Alex Johnson", "7376241CS101", "tuition", 1500.00, past_due, "pending", None),
                    ("student_101", "Alex Johnson", "7376241CS101", "library_fine", 15.50, due_soon_1, "pending", None),
                    ("student_102", "Sarah Miller", "7376241CS102", "hostel", 800.00, due_soon_2, "pending", None),
                    ("student_102", "Sarah Miller", "7376241CS102", "exam", 120.00, past_due, "paid", None),
                    ("student_103", "David Kumar", "7376241CS103", "tuition", 1500.00, due_later, "pending", None),
                    ("student_103", "David Kumar", "7376241CS103", "hostel", 850.00, past_due, "overdue", None),
                ]

                cursor.executemany("""
                    INSERT INTO fees (user_id, student_name, register_no, fee_type, amount, due_date, status, last_reminded)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, sample_fees)
                conn.commit()
                logger.info(f"Database initialized with {len(sample_fees)} sample records.")
            else:
                # Update existing null student_name / register_no values for sample records
                cursor.execute("UPDATE fees SET student_name='Alex Johnson', register_no='7376241CS101' WHERE user_id='student_101' AND (student_name IS NULL OR register_no IS NULL)")
                cursor.execute("UPDATE fees SET student_name='Sarah Miller', register_no='7376241CS102' WHERE user_id='student_102' AND (student_name IS NULL OR register_no IS NULL)")
                cursor.execute("UPDATE fees SET student_name='David Kumar', register_no='7376241CS103' WHERE user_id='student_103' AND (student_name IS NULL OR register_no IS NULL)")
                conn.commit()
                logger.info(f"Database initialized. Found {count} existing records.")

    except sqlite3.Error as err:
        logger.error(f"Database initialization failed: {err}")
        raise err


# ==============================================================================
# SECTION 5: CORE LOGIC & HELPER FUNCTIONS
# ==============================================================================
import re

def extract_student_id(text: str, default_user_id: str) -> str:
    """
    Extracts student ID from query text if present (e.g. student_101, student 102, 103),
    otherwise returns default_user_id.
    """
    clean = text.strip()

    # Match pattern like student_101, student 101, student101
    match = re.search(r"student[_\s]?(\d+)", clean, re.IGNORECASE)
    if match:
        return f"student_{match.group(1)}"

    # Match direct numbers like 101, 102, 103
    match_num = re.search(r"\b(10[1-9])\b", clean)
    if match_num:
        return f"student_{match_num.group(1)}"

    # Match words starting with student_
    for word in clean.split():
        w = word.strip(",.!?\"'").lower()
        if w.startswith("student_"):
            return w

    return default_user_id


def classify_fee_intent(text: str) -> str:
    """
    Classify user query text into fee intent categories.

    Args:
        text: Query message text.

    Returns:
        Intent label string ('check_due', 'check_status', or 'unknown').
    """
    clean_text = text.lower()

    due_keywords = ["when", "due", "deadline", "how much", "pending", "fee", "student", "pay", "balance", "list"]
    status_keywords = ["did i pay", "have i paid", "status", "paid or not"]

    if any(kw in clean_text for kw in status_keywords):
        return "check_status"

    if any(kw in clean_text for kw in due_keywords):
        return "check_due"

    # Also match student ID format like student_101 or 101 directly
    if re.search(r"student|10[1-9]", clean_text):
        return "check_due"

    return "unknown"


def update_overdue_statuses(db_path: str = DB_NAME) -> None:
    """
    Update pending fees to overdue if their due_date has passed today.

    Args:
        db_path: Path to the SQLite database file.

    Returns:
        None
    """
    today_str = datetime.date.today().isoformat()
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE fees
                SET status = 'overdue'
                WHERE status = 'pending' AND due_date < ?
            """, (today_str,))
            conn.commit()
    except sqlite3.Error as err:
        logger.error(f"Failed to update overdue fee statuses: {err}")


def get_student_fee_summary(user_id: str, student_name: str = None, register_no: str = None, db_path: str = DB_NAME) -> Dict[str, Any]:
    """
    Fetch all fees for student matching user_id, student_name, or register_no.
    Calculates total pending and paid fees.
    """
    update_overdue_statuses(db_path)
    fees: List[Dict[str, Any]] = []
    total_pending = 0.0
    total_paid = 0.0
    actual_user_id = user_id
    actual_name = student_name or ""
    actual_reg = register_no or ""

    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            
            # Query by user_id, register_no, or student_name
            cursor.execute("""
                SELECT fee_type, amount, due_date, status, user_id, student_name, register_no
                FROM fees
                WHERE LOWER(user_id) = LOWER(?)
                   OR (register_no IS NOT NULL AND LOWER(register_no) = LOWER(?))
                   OR (student_name IS NOT NULL AND LOWER(student_name) LIKE LOWER(?))
                ORDER BY due_date ASC
            """, (user_id, register_no or user_id, f"%{student_name or user_id}%"))
            rows = cursor.fetchall()

            # Fallback search if exact match empty
            if not rows:
                cursor.execute("""
                    SELECT fee_type, amount, due_date, status, user_id, student_name, register_no
                    FROM fees
                    WHERE LOWER(user_id) LIKE LOWER(?) OR (register_no IS NOT NULL AND LOWER(register_no) LIKE LOWER(?))
                    ORDER BY due_date ASC
                """, (f"%{user_id}%", f"%{user_id}%"))
                rows = cursor.fetchall()

            if rows:
                actual_user_id = rows[0][4]
                actual_name = rows[0][5] or actual_name or actual_user_id
                actual_reg = rows[0][6] or actual_reg or "N/A"

            for row in rows:
                amt = float(row[1])
                st = row[3]
                if st in ('pending', 'overdue'):
                    total_pending += amt
                elif st == 'paid':
                    total_paid += amt

                fees.append({
                    "fee_type": row[0],
                    "amount": amt,
                    "due_date": row[2],
                    "status": st
                })
    except sqlite3.Error as err:
        logger.error(f"Error fetching fee summary: {err}")

    if not actual_name:
        actual_name = actual_user_id.replace("_", " ").title()

    return {
        "user_id": actual_user_id,
        "student_name": actual_name,
        "register_no": actual_reg,
        "fees": fees,
        "total_pending": total_pending,
        "total_paid": total_paid
    }


def format_fee_response(user_id: str, student_name: str = None, register_no: str = None, db_path: str = DB_NAME) -> str:
    """Format full fee summary with Student Name, Register Number, pending totals, and itemized breakdown."""
    summary = get_student_fee_summary(user_id, student_name, register_no, db_path)
    s_name = summary["student_name"]
    s_reg = summary["register_no"]
    u_id = summary["user_id"]
    fees = summary["fees"]
    total_pending = summary["total_pending"]

    if not fees:
        reg_str = f" (Reg No: {s_reg})" if s_reg else ""
        return f"No fee records found for student '{s_name}'{reg_str}. Current Pending Balance: $0.00"

    reg_display = f" | Reg No: {s_reg}" if s_reg and s_reg != "N/A" else ""
    lines = [
        f"Fee Summary & Statement for Student: {s_name}{reg_display} ({u_id})",
        f"- Total Pending Balance: ${total_pending:,.2f}",
        "",
        "Detailed Fee Breakdown:"
    ]

    for f in fees:
        fee_name = f["fee_type"].replace("_", " ").title()
        status_symbol = "[OVERDUE]" if f["status"] == "overdue" else ("[PENDING]" if f["status"] == "pending" else "[PAID]")
        lines.append(
            f"  - {fee_name}: ${f['amount']:,.2f} | Due: {f['due_date']} | Status: {status_symbol}"
        )

    return "\n".join(lines)


def get_user_dues(user_id: str, db_path: str = DB_NAME) -> List[Dict[str, Any]]:
    """
    Fetch all unpaid fees for a given student ID.
    """
    summary = get_student_fee_summary(user_id, db_path)
    return [f for f in summary["fees"] if f["status"] != "paid"]



def get_all_due_soon(days_ahead: int = 7, db_path: str = DB_NAME) -> List[Dict[str, Any]]:
    """
    Fetch all pending/overdue fees due within days_ahead from today.

    Args:
        days_ahead: Maximum number of days in the future to include.
        db_path: Path to SQLite database file.

    Returns:
        List of dictionaries containing user and fee details.
    """
    results: List[Dict[str, Any]] = []
    today = datetime.date.today()
    # Calculate cutoff boundary ISO date (e.g., today + 7 days)
    cutoff_date = (today + datetime.timedelta(days=days_ahead)).isoformat()

    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            # Select all unpaid/overdue fees where due_date <= cutoff_date
            cursor.execute("""
                SELECT user_id, fee_type, amount, due_date, status
                FROM fees
                WHERE status IN ('pending', 'overdue') AND due_date <= ?
                ORDER BY due_date ASC
            """, (cutoff_date,))
            for row in cursor.fetchall():
                results.append({
                    "user_id": row[0],
                    "fee_type": row[1],
                    "amount": row[2],
                    "due_date": row[3],
                    "status": row[4],
                })
    except sqlite3.Error as err:
        logger.error(f"Error fetching due soon fees: {err}")

    return results


# ==============================================================================
# SECTION 6: MESSAGE HANDLERS
# ==============================================================================
@fee_reminder.on_message(model=FeeQuery)
async def handle_fee_query(ctx: Context, sender: str, msg: FeeQuery) -> None:
    """
    Handle incoming FeeQuery messages from Orchestrator.

    Args:
        ctx: Handler execution context.
        sender: Sender agent address.
        msg: FeeQuery payload.

    Returns:
        None
    """
    try:
        update_overdue_statuses()

        target_user_id = extract_student_id(msg.text, msg.user_id)
        reply_text = format_fee_response(target_user_id)

        await ctx.send(sender, FeeReply(text=reply_text, success=True))

    except Exception as err:
        ctx.logger.error(f"Unexpected error in handle_fee_query: {err}", exc_info=True)
        error_msg = "Something went wrong while processing your fee request. Please try again."
        await ctx.send(sender, FeeReply(text=error_msg, success=False))


@fee_reminder.on_message(model=DueFeesRequest)
async def handle_due_fees_request(ctx: Context, sender: str, msg: DueFeesRequest) -> None:
    """
    Handle polling requests from Notifier agent for due/overdue fees.

    Args:
        ctx: Handler execution context.
        sender: Sender agent address.
        msg: DueFeesRequest payload.

    Returns:
        None
    """
    try:
        # Refresh database statuses before building notification batch
        update_overdue_statuses()

        ctx.logger.info(f"Received DueFeesRequest polling from: {msg.requester}")
        dues_list = get_all_due_soon(days_ahead=7)

        await ctx.send(sender, DueFeesResponse(dues=dues_list))
    except Exception as err:
        ctx.logger.error(f"Error in handle_due_fees_request: {err}", exc_info=True)
        # Always return empty list on exception to keep agent responsive
        await ctx.send(sender, DueFeesResponse(dues=[]))


# ==============================================================================
# SECTION 7: STARTUP & RUN LOGIC
# ==============================================================================
@fee_reminder.on_event("startup")
async def startup_handler(ctx: Context) -> None:
    """
    Perform startup database initialization and log agent metadata.

    Args:
        ctx: Handler execution context.

    Returns:
        None
    """
    init_db()
    ctx.logger.info("Fee Reminder Agent starting up...")
    ctx.logger.info(f"Agent Address: {fee_reminder.address}")

    try:
        with sqlite3.connect(DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM fees")
            count = cursor.fetchone()[0]
            ctx.logger.info(f"Total fee records in database: {count}")
    except sqlite3.Error as err:
        ctx.logger.error(f"Error retrieving record count at startup: {err}")


if __name__ == "__main__":
    fee_reminder.run()
