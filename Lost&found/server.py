"""
Campus Lost & Found Operations Server
-------------------------------------
FastAPI server serving the Lost & Found web interface, API endpoints,
and managing the SQLite database with intelligent keyword matching.
"""

import sqlite3
import re
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os

DB_FILE = "lost_and_found.db"

app = FastAPI(title="Campus Lost & Found Operations")

# Ensure static directory exists
os.makedirs("static", exist_ok=True)


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class ReportRequest(Model if 'Model' in globals() else BaseModel):
    user_id: str
    text: str
    location: Optional[str] = None
    category: Optional[str] = "General"


class ReportResponse(BaseModel):
    id: int
    status: str
    message: str
    matches_found: int
    matched_item: Optional[dict] = None


# ==============================================================================
# DATABASE INITIALIZATION
# ==============================================================================

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
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
    # Check if category column exists in existing DB
    cursor.execute("PRAGMA table_info(items)")
    columns = [row[1] for row in cursor.fetchall()]
    if "category" not in columns:
        cursor.execute("ALTER TABLE items ADD COLUMN category TEXT DEFAULT 'General'")
        
    conn.commit()
    conn.close()

# Initialize DB at startup
init_db()


# ==============================================================================
# NLP & MATCHING LOGIC
# ==============================================================================

def classify_report_type(text: str) -> str:
    """Classifies text into 'lost', 'found', or 'unknown'."""
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


def find_matches(description: str, opposite_status: str) -> List[dict]:
    """Queries unmatched opposite items and performs keyword overlap matching."""
    conn = sqlite3.connect(DB_FILE)
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
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    # Split into clean words
    query_words = set(re.findall(r'\w+', description.lower()))
    # Exclude common noisy stop words for better precision
    stopwords = {"a", "an", "the", "in", "on", "at", "near", "my", "i", "is", "was", "it", "to", "for", "with", "of", "and"}
    meaningful_query = query_words - stopwords

    matches = []
    for item in rows:
        item_words = set(re.findall(r'\w+', item["item_description"].lower())) - stopwords
        overlap = len(meaningful_query.intersection(item_words))
        
        if overlap >= 2:
            item_copy = dict(item)
            item_copy["score"] = overlap
            matches.append(item_copy)

    matches.sort(key=lambda x: x["score"], reverse=True)
    return matches


# ==============================================================================
# API ENDPOINTS
# ==============================================================================

@app.get("/api/items")
def get_items():
    """Retrieve all items from the database."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM items ORDER BY id DESC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


@app.get("/api/stats")
def get_stats():
    """Get database statistics."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM items")
    total = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM items WHERE status = 'lost'")
    lost = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM items WHERE status = 'found'")
    found = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM items WHERE matched_id IS NOT NULL")
    matched = cursor.fetchone()[0] // 2  # Each match links 2 items
    
    conn.close()
    return {"total": total, "lost": lost, "found": found, "matched": matched}


@app.post("/api/report", response_model=ReportResponse)
def submit_report(req: ReportRequest):
    """Submit a lost or found report, insert to DB, and run keyword matching."""
    status = classify_report_type(req.text)
    
    if status == "unknown":
        raise HTTPException(
            status_code=400,
            detail="Could not determine if item was lost or found. Please specify clearly (e.g. 'I lost my keys' or 'I found a laptop')."
        )

    current_time = datetime.now(timezone.utc).isoformat()
    location_str = req.location.strip() if req.location else None

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO items (user_id, item_description, status, location, category, date_reported, matched_id)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
        """,
        (req.user_id, req.text.strip(), status, location_str, req.category, current_time)
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    # Search for matches
    opposite_status = "found" if status == "lost" else "lost"
    candidate_matches = find_matches(req.text, opposite_status)

    matched_item_data = None
    if candidate_matches:
        top_match = candidate_matches[0]
        matched_id = top_match["id"]

        # Update matched_id link in DB
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("UPDATE items SET matched_id = ? WHERE id = ?", (matched_id, new_id))
        cursor.execute("UPDATE items SET matched_id = ? WHERE id = ?", (new_id, matched_id))
        conn.commit()
        conn.close()

        matched_item_data = top_match
        msg = f"🎉 Great news! We found {len(candidate_matches)} match(es) for your report. Linked with Item #{matched_id}."
    else:
        msg = f"Your {status} report has been recorded (ID #{new_id}). We'll notify you if a match comes up!"

    return ReportResponse(
        id=new_id,
        status=status,
        message=msg,
        matches_found=len(candidate_matches),
        matched_item=matched_item_data
    )


@app.post("/api/seed")
def seed_sample_data():
    """Seeds sample lost and found items into database for instant testing."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    samples = [
        ("alex_s", "I lost my blue Hydroflask water bottle with a NASA sticker", "lost", "Library 2nd Floor", "Personal Items"),
        ("sarah_m", "Lost silver Apple MacBook Air M2 in leather sleeve", "lost", "Engineering Building Room 204", "Electronics"),
        ("david_k", "I lost my black leather wallet containing student ID card", "lost", "Student Union Cafeteria", "ID & Cards"),
        ("security_dept", "Found a blue Hydroflask water bottle with space stickers", "found", "Library Information Desk", "Personal Items"),
        ("campus_janitor", "Picked up silver Apple MacBook Air near Room 204", "found", "Facilities Management Office", "Electronics"),
        ("emily_w", "Found set of brass keys on red lanyard", "found", "North Quad Lawn", "Keys")
    ]
    
    now = datetime.now(timezone.utc).isoformat()
    for user_id, desc, status, loc, cat in samples:
        cursor.execute(
            """
            INSERT INTO items (user_id, item_description, status, location, category, date_reported, matched_id)
            VALUES (?, ?, ?, ?, ?, ?, NULL)
            """,
            (user_id, desc, status, loc, cat, now)
        )
    
    conn.commit()
    conn.close()
    
    # Run auto-match scan over database
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM items WHERE status = 'lost' AND matched_id IS NULL")
    lost_items = [dict(r) for r in cursor.fetchall()]
    
    for lost in lost_items:
        matches = find_matches(lost["item_description"], "found")
        if matches:
            top_found = matches[0]
            cursor.execute("UPDATE items SET matched_id = ? WHERE id = ?", (top_found["id"], lost["id"]))
            cursor.execute("UPDATE items SET matched_id = ? WHERE id = ?", (lost["id"], top_found["id"]))
    
    conn.commit()
    conn.close()
    
    return {"message": "Sample data seeded and matching engine executed!"}


@app.post("/api/reset")
def reset_db():
    """Resets the SQLite items table."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM items")
    cursor.execute("DELETE FROM sqlite_sequence WHERE name='items'")
    conn.commit()
    conn.close()
    return {"message": "Database reset successfully."}


# Serve static web frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_frontend():
    return FileResponse("static/index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
