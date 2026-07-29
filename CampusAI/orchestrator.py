"""
Campus AI - Orchestrator Agent
Built with the uagents library (Fetch.ai / Agentverse framework).

The Orchestrator agent serves as the front-facing agent in a multi-agent system.
It receives queries from users, classifies their intent using keyword matching,
routes the query to the appropriate specialist agent, and relays the specialist's reply back to the user.
"""

from uagents import Agent, Context, Model


# ==============================================================================
# 1. AGENT INITIALIZATION
# ==============================================================================
# Create the Orchestrator agent with a fixed name, seed phrase, port, and HTTP endpoint.
# Using a fixed seed ensures the agent maintains a consistent address across restarts.
orchestrator = Agent(
    name="orchestrator",
    seed="campus_ai_orchestrator_secret_seed_2026",
    port=8000,
    endpoint=["http://127.0.0.1:8000/submit"],
)


# ==============================================================================
# 2. MESSAGE MODELS
# ==============================================================================
# Pydantic Model classes define the structure of messages sent between agents.

class UserQuery(Model):
    """Incoming user query containing user identifier and message text."""
    user_id: str
    text: str


class AgentReply(Model):
    """Outgoing response sent back to the user or from a specialist agent."""
    text: str


# ==============================================================================
# 3. ROUTING TABLE & STATE MANAGEMENT
# ==============================================================================
# Placeholder addresses for specialist agents in the network.
# Replace these with actual agent addresses when running specialist agents.
SCHEDULER_ADDRESS = "agent1q_placeholder_scheduler_address"
COMPLAINT_ADDRESS = "agent1q_placeholder_complaint_address"
DOCUMENT_ADDRESS = "agent1q_placeholder_document_address"
FAQ_ADDRESS = "agent1q_placeholder_faq_address"

# Routing table mapping intent names to specialist agent addresses.
INTENT_ROUTING_TABLE = {
    "scheduler": SCHEDULER_ADDRESS,
    "complaint": COMPLAINT_ADDRESS,
    "document": DOCUMENT_ADDRESS,
    "faq": FAQ_ADDRESS,
}

# State dictionary to track pending user requests.
# Maps specialist agent address -> original user sender address.
# This enables relaying responses back to the original caller asynchronously.
pending_requests = {}


# ==============================================================================
# 4. INTENT CLASSIFICATION
# ==============================================================================
def classify_intent(text: str) -> str:
    """
    Classifies intent of input text using simple keyword matching.
    
    Returns one of: "scheduler", "complaint", "document", "faq", or "unknown".
    """
    clean_text = text.lower()

    # Keyword lists for each domain
    scheduler_keywords = ["exam", "timetable", "schedule", "class", "date", "slot"]
    complaint_keywords = ["wifi", "broken", "repair", "complaint", "issue", "plumbing", "water", "electricity"]
    document_keywords = ["certificate", "transcript", "bonafide", "document", "degree", "marksheet"]
    faq_keywords = ["policy", "rule", "handbook", "faq", "guideline", "timing", "fee"]
    notifier_keywords = ["announcement", "alert", "notification", "notifier", "news", "notice"]

    # Check matches in sequence
    if any(keyword in clean_text for keyword in scheduler_keywords):
        return "scheduler"
    elif any(keyword in clean_text for keyword in complaint_keywords):
        return "complaint"
    elif any(keyword in clean_text for keyword in document_keywords):
        return "document"
    elif any(keyword in clean_text for keyword in faq_keywords):
        return "faq"
    elif any(keyword in clean_text for keyword in notifier_keywords):
        return "notifier"
    else:
        return "unknown"


# ==============================================================================
# 5. AGENT EVENT & MESSAGE HANDLERS
# ==============================================================================

@orchestrator.on_event("startup")
async def handle_startup(ctx: Context):
    """Logs the orchestrator agent's address on startup."""
    ctx.logger.info(f"Orchestrator Agent started successfully!")
    ctx.logger.info(f"Orchestrator Agent Address: {orchestrator.address}")


@orchestrator.on_message(model=UserQuery)
async def handle_user_query(ctx: Context, sender: str, msg: UserQuery):
    """
    Handles incoming UserQuery messages.
    Classifies the intent and forwards to the corresponding specialist agent.
    If intent is unknown, replies directly to the user.
    """
    ctx.logger.info(f"Received query from {sender} (User ID: {msg.user_id}): '{msg.text}'")

    # Step 1: Classify intent
    intent = classify_intent(msg.text)
    ctx.logger.info(f"Classified intent: '{intent}'")

    # Step 2: Handle unknown intent
    if intent == "unknown":
        reply_msg = AgentReply(
            text="Sorry, I could not understand your request. Please ask about exams, complaints, documents, or policies."
        )
        ctx.logger.info(f"Replying directly to {sender} due to unknown intent.")
        await ctx.send(sender, reply_msg)
        return

    # Step 3: Lookup specialist agent address
    target_address = INTENT_ROUTING_TABLE.get(intent)
    if not target_address:
        ctx.logger.error(f"No target address configured for intent: '{intent}'")
        await ctx.send(sender, AgentReply(text="Service temporarily unavailable for this request category."))
        return

    # Step 4: Save context in pending_requests mapping for relaying back later
    pending_requests[target_address] = sender

    # Step 5: Forward user query to the target specialist agent
    ctx.logger.info(f"Forwarding query to {intent.upper()} specialist at address: {target_address}")
    await ctx.send(target_address, msg)


@orchestrator.on_message(model=AgentReply)
async def handle_agent_reply(ctx: Context, sender: str, msg: AgentReply):
    """
    Handles incoming AgentReply messages from specialist agents.
    Relays the reply back to the original user using the pending_requests lookup.
    """
    ctx.logger.info(f"Received reply from specialist agent ({sender}): '{msg.text}'")

    # Step 1: Lookup original user address
    original_user_address = pending_requests.get(sender)

    if original_user_address:
        # Step 2: Forward reply to original user
        ctx.logger.info(f"Relaying specialist reply back to original user: {original_user_address}")
        await ctx.send(original_user_address, msg)

        # Step 3: Clean up pending request entry
        del pending_requests[sender]
    else:
        ctx.logger.warning(f"Received reply from {sender}, but no pending request entry was found.")


# ==============================================================================
# 6. RUN AGENT
# ==============================================================================
if __name__ == "__main__":
    orchestrator.run()
