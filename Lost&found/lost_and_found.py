"""
===============================================================================
Campus Operations System - Lost & Found Specialist Agent
===============================================================================
Framework: Fetch.ai uagents (Agentverse compatible)
Port: 8004
Endpoint: http://127.0.0.1:8004/submit

Description:
  This specialist agent handles lost and found item reports routed from the campus
  Orchestrator agent. It stores item reports in a local SQLite database and
  automatically performs keyword-based matching between lost and found items.
===============================================================================
"""

# ==============================================================================
# SECTION 1: IMPORTS
# ==============================================================================

import sqlite3
import re
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple

from uagents import Agent, Context, Model


# ==============================================================================
# SECTION 2: CONFIGURATION & CONSTANTS
# ==============================================================================

# Seed phrase used to generate deterministic cryptographic keys & agent address.
# WARNING: Change this seed phrase before production deployment!
AGENT_SEED: str = "lost_and_found_specialist_agent_secret_seed_campus_2026"

# Agent Network Parameters
AGENT_NAME: str = "lost_and_found"
AGENT_PORT: int = 8004
AGENT_ENDPOINT: List[str] = ["http://127.0.0.1:8004/submit"]

# Placeholder for Orchestrator Agent address (update once Orchestrator is deployed)
ORCHESTRATOR_ADDRESS: str = "PASTE_ORCHESTRATOR_ADDRESS_HERE"

# Local SQLite database file path
DB_FILE: str = "lost_and_found.db"


# ==============================================================================
# SECTION 3: AGENT INITIALIZATION
# ==============================================================================

lost_and_found = Agent(
    name=AGENT_NAME,
    seed=AGENT_SEED,
    port=AGENT_PORT,
    endpoint=AGENT_ENDPOINT
)


# ==============================================================================
# SECTION 4: PYDANTIC MESSAGE MODELS
# ==============================================================================

class LostFoundQuery(Model):
    """
    Incoming request message received from Orchestrator or testing client.
    
    Attributes:
        user_id: Unique identifier or handle of the campus user.
        text: Raw natural language user message (e.g. 'I lost my keys in the library').
    """
    user_id: str
    text: str


class LostFoundReply(Model):
    """
    Response message sent back to Orchestrator or testing client.
    
    Attributes:
        text: Natural language reply message explaining status or matches found.
    """
    text: str


# ==============================================================================
# SECTION 5: DATABASE SETUP & MANAGEMENT
# ==============================================================================

def init_db() -> None:
    """
    Initializes the SQLite database schema.
    Creates the 'items' table if it does not exist and ensures required columns exist.
    """
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        
        # Create items table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                item_description TEXT NOT NULL,
                status TEXT NOT NULL,
                location TEXT,
                category TEXT DEFAULT 'General',
                date_reported TEXT NOT NULL,
                matched_id INTEGER,
                FOREIGN KEY (matched_id) REFERENCES items (id)
            )
        """)
        
        # Schema migration check: Ensure 'category' column exists if DB was created earlier
        cursor.execute("PRAGMA table_info(items)")
        columns = [column_info[1] for column_info in cursor.fetchall()]
        if "category" not in columns:
            cursor.execute("ALTER TABLE items ADD COLUMN category TEXT DEFAULT 'General'")
            
        conn.commit()


# ==============================================================================
# SECTION 6: HELPER FUNCTIONS (NLP & MATCHING ENGINE)
# ==============================================================================

def classify_report_type(text: str) -> str:
    """
    Classifies the user message into 'lost', 'found', or 'unknown'.
    
    Args:
        text: The raw user message.
        
    Returns:
        'lost', 'found', or 'unknown'
    """
    lowered = text.lower()
    
    lost_keywords = ["lost", "missing", "can't find", "cant find", "left behind", "misplaced"]
    found_keywords = ["found", "picked up", "saw a", "turned in", "located", "retrieved"]
    
    for kw in lost_keywords:
        if kw in lowered:
            return "lost"
            
    for kw in found_keywords:
        if kw in lowered:
            return "found"
            
    return "unknown"


def extract_description(text: str) -> str:
    """
    Extracts and cleans up item description from user text.
    Placeholder for advanced NLP entity extraction.
    """
    return text.strip()


def find_matches(description: str, opposite_status: str) -> List[Dict]:
    """
    Queries unmatched items of the opposite status from SQLite and calculates
    keyword overlap scores. Returns matches with 2 or more overlapping words,
    sorted in descending order of overlap count.
    
    Args:
        description: The description of the item being reported.
        opposite_status: 'found' if reporting lost, or 'lost' if reporting found.
        
    Returns:
        List of matching candidate dicts with overlap score.
    """
    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute(
            """
            SELECT id, user_id, item_description, status, location, category, date_reported, matched_id
            FROM items
            WHERE status = ? AND matched_id IS NULL
            """,
            (opposite_status,)
        )
        rows = [dict(row) for row in cursor.fetchall()]

    # Split input description into unique lowercased words
    query_words = set(re.findall(r'\w+', description.lower()))
    
    # Filter common noisy stop words for better precision
    stopwords = {"a", "an", "the", "in", "on", "at", "near", "my", "i", "is", "was", "it", "to", "for", "with", "of", "and"}
    meaningful_query = query_words - stopwords

    candidate_matches = []
    for item in rows:
        item_words = set(re.findall(r'\w+', item["item_description"].lower())) - stopwords
        overlap_count = len(meaningful_query.intersection(item_words))
        
        # Match threshold: 2 or more overlapping meaningful words
        if overlap_count >= 2:
            item_copy = dict(item)
            item_copy["score"] = overlap_count
            candidate_matches.append(item_copy)

    # Sort matches highest score first
    candidate_matches.sort(key=lambda x: x["score"], reverse=True)
    return candidate_matches


# ==============================================================================
# SECTION 7: AGENT EVENT & MESSAGE HANDLERS
# ==============================================================================

@lost_and_found.on_event("startup")
async def startup_handler(ctx: Context):
    """
    Triggered when the agent starts up.
    Initializes database and logs agent identity and address.
    """
    init_db()
    ctx.logger.info("==================================================")
    ctx.logger.info(f"  Lost & Found Specialist Agent Started")
    ctx.logger.info(f"  Agent Name   : {AGENT_NAME}")
    ctx.logger.info(f"  Agent Address: {lost_and_found.address}")
    ctx.logger.info(f"  Endpoint     : {AGENT_ENDPOINT[0]}")
    ctx.logger.info(f"  Database     : {DB_FILE}")
    ctx.logger.info("==================================================")


@lost_and_found.on_message(model=LostFoundQuery)
async def handle_lost_found_query(ctx: Context, sender: str, msg: LostFoundQuery):
    """
    Core message handler for LostFoundQuery messages.
    1. Classifies intent ('lost', 'found', 'unknown').
    2. Replies asking for clarification if unknown.
    3. Saves report into SQLite database.
    4. Runs keyword overlap matching against opposite items.
    5. Links matched items and responds with result message.
    """
    ctx.logger.info(f"Incoming message from {sender} [User: {msg.user_id}]: '{msg.text}'")

    report_type = classify_report_type(msg.text)

    # 1. Handle Unknown Intent
    if report_type == "unknown":
        reply_text = (
            "Could you please clarify whether you lost or found an item? "
            "For example: 'I lost my blue Hydroflask near library' or "
            "'I found a set of keys in the cafeteria'."
        )
        await ctx.send(sender, LostFoundReply(text=reply_text))
        return

    description = extract_description(msg.text)
    current_time = datetime.now(timezone.utc).isoformat()

    # 2. Insert new item into SQLite database
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO items (user_id, item_description, status, location, category, date_reported, matched_id)
            VALUES (?, ?, ?, ?, 'General', ?, NULL)
            """,
            (msg.user_id, description, report_type, None, current_time)
        )
        conn.commit()
        new_item_id = cursor.lastrowid

    ctx.logger.info(f"Saved new {report_type} item report (ID #{new_item_id}) to DB.")

    # 3. Search for potential matches with opposite status
    opposite_status = "found" if report_type == "lost" else "lost"
    candidate_matches = find_matches(description, opposite_status)

    # 4. Process Match Results
    if candidate_matches:
        top_match = candidate_matches[0]
        matched_item_id = top_match["id"]

        # Link both items in DB
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE items SET matched_id = ? WHERE id = ?", (matched_item_id, new_item_id))
            cursor.execute("UPDATE items SET matched_id = ? WHERE id = ?", (new_item_id, matched_item_id))
            conn.commit()

        ctx.logger.info(f"MATCH CONNECTED: Item #{new_item_id} linked with Item #{matched_item_id}")

        matches_summary = ", ".join([f"'{m['item_description']}' (ID #{m['id']})" for m in candidate_matches])
        reply_text = (
            f"We found {len(candidate_matches)} possible match(es) for your report! "
            f"Candidate match(es): [{matches_summary}]. We'll help connect you."
        )
        await ctx.send(sender, LostFoundReply(text=reply_text))

    else:
        # No matches found yet
        reply_text = (
            f"Your {report_type} item report has been recorded (ID #{new_item_id}). "
            f"We'll notify you if a match comes up!"
        )
        await ctx.send(sender, LostFoundReply(text=reply_text))


# ==============================================================================
# SECTION 8: MAIN EXECUTION ENTRYPOINT
# ==============================================================================

if __name__ == "__main__":
    lost_and_found.run()
