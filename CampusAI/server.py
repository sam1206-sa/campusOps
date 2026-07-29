"""
campusOps Web Server
Runs on http://localhost:5050 and serves the Web Interface + API.
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import os
import uvicorn

# Import intent classification logic from orchestrator.py
from orchestrator import classify_intent

app = FastAPI(title="CampusOps Portal")

# Mount static files directory
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")


class ChatQueryRequest(BaseModel):
    user_id: str = "web_user"
    text: str


# Category response dictionary
CATEGORY_RESPONSES = {
    "scheduler": (
        "Your exam timetable for Spring Semester starts on May 10th. "
        "Detailed course slots and room allocations are published on the student portal."
    ),
    "complaint": (
        "Complaint Ticket #8492 registered for WiFi and maintenance repair. "
        "A technician has been notified and will inspect the issue within 24 hours."
    ),
    "document": (
        "Certificate request submitted. "
        "Your official Transcript / Bonafide certificate is currently processing and will be issued within 2 business days."
    ),
    "faq": (
        "According to the Campus Policy Handbook (Section 4.2): "
        "A minimum of 75% attendance is required for exam eligibility. Late fee waivers close on the 15th."
    ),
    "notifier": (
        "Latest Announcements: Spring semester exam schedule released. Degree and transcript application portal is now active."
    ),
}


@app.get("/")
async def serve_index():
    """Serves the main web portal."""
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "campusOps Web Server Running"}


@app.post("/api/query")
async def process_user_query(query: ChatQueryRequest):
    """
    API Endpoint used by the Web UI search bar.
    Classifies intent and returns the category response.
    """
    text = query.text
    user_id = query.user_id

    # 1. Classify intent
    intent = classify_intent(text)

    # 2. Handle Unknown Intent
    if intent == "unknown":
        return JSONResponse({
            "intent": "unknown",
            "reply": "I'm sorry, I could not understand your request. Please ask about exams, WiFi repairs, certificates, or campus rules."
        })

    # 3. Handle Category Response
    reply_text = CATEGORY_RESPONSES.get(intent, "")

    return JSONResponse({
        "intent": intent,
        "reply": reply_text
    })


if __name__ == "__main__":
    print("============================================================")
    print("campusOps Web Server starting!")
    print("Access Website at: http://localhost:5050")
    print("Alternative Link:   http://127.0.0.1:5050")
    print("============================================================")
    uvicorn.run(app, host="127.0.0.1", port=5050)
