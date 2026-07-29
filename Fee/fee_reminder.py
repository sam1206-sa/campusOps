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

# Database file location
DB_NAME: str = "fee_reminder.db"

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
                    fee_type TEXT NOT NULL,
                    amount REAL NOT NULL,
                    due_date TEXT NOT NULL,
                    status TEXT NOT NULL CHECK(status IN ('pending', 'paid', 'overdue')),
                    last_reminded TEXT
                )
            """)

            cursor.execute("SELECT COUNT(*) FROM fees")
            count = cursor.fetchone()[0]

            # Seed sample data if table is completely empty
            if count == 0:
                today = datetime.date.today()
                # Dynamically calculate relative dates so seed data stays relevant whenever run
                past_due = (today - datetime.timedelta(days=10)).isoformat()
                due_soon_1 = (today + datetime.timedelta(days=3)).isoformat()
                due_soon_2 = (today + datetime.timedelta(days=5)).isoformat()
                due_later = (today + datetime.timedelta(days=25)).isoformat()

                sample_fees = [
                    ("student_101", "tuition", 1500.00, past_due, "pending", None),
                    ("student_101", "library_fine", 15.50, due_soon_1, "pending", None),
                    ("student_102", "hostel", 800.00, due_soon_2, "pending", None),
                    ("student_102", "exam", 120.00, past_due, "paid", None),
                    ("student_103", "tuition", 1500.00, due_later, "pending", None),
                    ("student_103", "hostel", 850.00, past_due, "overdue", None),
                ]

                # Use parameterized query to insert records safely
                cursor.executemany("""
                    INSERT INTO fees (user_id, fee_type, amount, due_date, status, last_reminded)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, sample_fees)
                conn.commit()
                logger.info(f"Database initialized with {len(sample_fees)} sample records.")
            else:
                logger.info(f"Database initialized. Found {count} existing records.")

    except sqlite3.Error as err:
        logger.error(f"Database initialization failed: {err}")
        raise err


# ==============================================================================
# SECTION 5: CORE LOGIC & HELPER FUNCTIONS
# ==============================================================================
def classify_fee_intent(text: str) -> str:
    """
    Classify user query text into fee intent categories.

    Args:
        text: Query message text.

    Returns:
        Intent label string ('check_due', 'check_status', or 'unknown').
    """
    clean_text = text.lower()

    due_keywords = ["when", "due", "deadline", "how much"]
    status_keywords = ["did i pay", "have i paid", "status", "paid or not"]

    # We evaluate status keywords first to catch explicit payment checks
    if any(kw in clean_text for kw in status_keywords):
        return "check_status"

    # Evaluate due keywords next for deadline and amount queries
    if any(kw in clean_text for kw in due_keywords):
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
    # ISO date string comparison works directly with YYYY-MM-DD format in SQLite
    today_str = datetime.date.today().isoformat()
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            # Transition status from 'pending' to 'overdue' dynamically whenever
            # the current date is strictly after the fee's due_date.
            cursor.execute("""
                UPDATE fees
                SET status = 'overdue'
                WHERE status = 'pending' AND due_date < ?
            """, (today_str,))
            conn.commit()
    except sqlite3.Error as err:
        logger.error(f"Failed to update overdue fee statuses: {err}")


def get_user_dues(user_id: str, db_path: str = DB_NAME) -> List[Dict[str, Any]]:
    """
    Fetch all unpaid fees for a given student ID.

    Args:
        user_id: Student identification string.
        db_path: Path to SQLite database file.

    Returns:
        List of fee detail dictionaries ordered by due date.
    """
    dues: List[Dict[str, Any]] = []
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            # Fetch pending or overdue fees, excluding already paid fees
            cursor.execute("""
                SELECT fee_type, amount, due_date, status
                FROM fees
                WHERE user_id = ? AND status != 'paid'
                ORDER BY due_date ASC
            """, (user_id,))
            for row in cursor.fetchall():
                dues.append({
                    "fee_type": row[0],
                    "amount": row[1],
                    "due_date": row[2],
                    "status": row[3],
                })
    except sqlite3.Error as err:
        logger.error(f"Error fetching dues for user '{user_id}': {err}")

    return dues


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
        # Refresh database statuses so past-due fees are correctly marked 'overdue'
        update_overdue_statuses()

        intent = classify_fee_intent(msg.text)
        ctx.logger.info(
            f"Query from '{msg.user_id}': '{msg.text}' -> Classified: '{intent}'"
        )

        if intent == "unknown":
            reply_text = (
                "I couldn't quite understand your request. Are you asking when a fee is due, "
                "or checking if you've already paid your fees?"
            )
            await ctx.send(sender, FeeReply(text=reply_text, success=True))
            return

        # Fetch dues for student
        dues = get_user_dues(msg.user_id)
        if not dues:
            reply_text = f"Good news! Student '{msg.user_id}' has no pending or overdue fee dues."
        else:
            lines = [f"Fee Summary for '{msg.user_id}':"]
            for d in dues:
                fee_name = d["fee_type"].replace("_", " ").title()
                lines.append(
                    f"• {fee_name}: ${d['amount']:.2f} | Due: {d['due_date']} | Status: {d['status'].upper()}"
                )
            reply_text = "\n".join(lines)

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
