import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from uagents.query import send_sync_message
from uagents.resolver import RulesBasedResolver
from uagents import Agent

# Import message models and constants from our agent module
from document_request import DocumentQuery, DocumentReply, SEED_PHRASE, DB_FILE

app = FastAPI(title="Campus Operations Document Request Gateway")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request schema for frontend input
class UserQuery(BaseModel):
    user_id: str
    text: str

# Determine agent address locally using the agent's seed phrase
dummy_agent = Agent(name="document_request", seed=SEED_PHRASE)
AGENT_ADDRESS = dummy_agent.address

# Map the local agent address to its HTTP endpoint
resolver = RulesBasedResolver(rules={AGENT_ADDRESS: "http://127.0.0.1:8006/submit"})

@app.get("/api/requests/{user_id}")
async def get_user_requests(user_id: str):
    """
    Fetch requests directly from SQLite database for dashboard rendering.
    Supporting staff administration view to load all student requests.
    """
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            if user_id.startswith("staff"):
                cursor.execute(
                    """
                    SELECT id, document_type, status, reason, date_requested, date_updated, user_id
                    FROM requests
                    ORDER BY date_requested DESC
                    """
                )
            else:
                cursor.execute(
                    """
                    SELECT id, document_type, status, reason, date_requested, date_updated, user_id
                    FROM requests
                    WHERE user_id = ?
                    ORDER BY date_requested DESC
                    """,
                    (user_id,)
                )
            rows = cursor.fetchall()
            return [
                {
                    "id": r[0],
                    "document_type": r[1],
                    "status": r[2],
                    "reason": r[3],
                    "date_requested": r[4],
                    "date_updated": r[5],
                    "user_id": r[6]
                }
                for r in rows
            ]
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

@app.post("/api/query")
async def query_agent(query_data: UserQuery):
    """
    FastAPI gateway endpoint translating REST HTTP calls into uagents synchronous interactions.
    """
    try:
        # Synchronously query the running agent and expect a DocumentReply type
        response = await send_sync_message(
            destination=AGENT_ADDRESS,
            message=DocumentQuery(user_id=query_data.user_id, text=query_data.text),
            response_type=DocumentReply,
            resolver=resolver,
            timeout=15
        )
        
        if isinstance(response, DocumentReply):
            return {
                "success": response.success,
                "text": response.text
            }
        else:
            raise HTTPException(
                status_code=502,
                detail=f"Invalid response response from agent: {response}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to communicate with agent: {str(e)}"
        )

# Serve static frontend web files
app.mount("/", StaticFiles(directory="static", html=True), name="static")
