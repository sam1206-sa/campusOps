"""
Campus AI - Notifier Agent
Built with the uagents library (Fetch.ai / Agentverse framework).

The Notifier agent periodically queries the Scheduler agent for upcoming deadlines.
If it discovers new deadlines that haven't been notified yet, it generates
reminder notifications and sends them to the Orchestrator agent to deliver to users.
"""

from uagents import Agent, Context, Model

# ==============================================================================
# 1. AGENT INITIALIZATION
# ==============================================================================
# Create the Notifier agent with a fixed name, seed phrase, port 8003, and endpoint.
notifier = Agent(
    name="notifier",
    seed="campus_ai_notifier_secret_seed_2026",
    port=8003,
    endpoint=["http://127.0.0.1:8003/submit"],
)

# ==============================================================================
# 2. MESSAGE MODELS
# ==============================================================================
# Define Pydantic models for structured messaging between agents.

class DeadlineRequest(Model):
    """Message sent to the Scheduler agent to request upcoming deadlines."""
    requester: str


class DeadlineResponse(Model):
    """
    Message received from the Scheduler agent containing deadlines.
    Each item in the deadlines list is a dictionary with keys:
    - 'id': unique deadline identifier (str)
    - 'title': description/title of deadline (str)
    - 'due_date': due date string (str)
    """
    deadlines: list[dict]


class ReminderNotification(Model):
    """Message sent to the Orchestrator agent to relay to the user."""
    user_id: str
    text: str


# ==============================================================================
# 3. ROUTING TABLE & STATE TRACKING
# ==============================================================================
# Placeholder addresses for Scheduler and Orchestrator agents.
# Replace these with actual agent addresses when running full multi-agent network.
SCHEDULER_ADDRESS = "PASTE_SCHEDULER_ADDRESS_HERE"
ORCHESTRATOR_ADDRESS = "PASTE_ORCHESTRATOR_ADDRESS_HERE"

# Memory set to track deadline IDs that have already been notified.
# This prevents duplicate notifications from being sent repeatedly.
already_notified = set()


# ==============================================================================
# 4. AGENT HANDLERS & PERIODIC TASKS
# ==============================================================================

@notifier.on_event("startup")
async def handle_startup(ctx: Context):
    """Logs the Notifier agent's address on startup."""
    ctx.logger.info("Notifier Agent started successfully!")
    ctx.logger.info(f"Notifier Agent Address: {notifier.address}")


@notifier.on_interval(period=60.0)
async def check_upcoming_deadlines(ctx: Context):
    """
    Periodic task running every 60 seconds.
    Sends a DeadlineRequest to the Scheduler agent to fetch latest deadlines.
    """
    ctx.logger.info("Periodic Check: Requesting upcoming deadlines from Scheduler agent...")

    # Build request message
    request_msg = DeadlineRequest(requester=ctx.address)

    # Send request to Scheduler agent address
    await ctx.send(SCHEDULER_ADDRESS, request_msg)


@notifier.on_message(model=DeadlineResponse)
async def handle_deadline_response(ctx: Context, sender: str, msg: DeadlineResponse):
    """
    Handles incoming DeadlineResponse messages from the Scheduler agent.
    Checks for new unnotified deadlines and forwards reminders to the Orchestrator.
    """
    ctx.logger.info(f"Received {len(msg.deadlines)} deadline(s) from Scheduler ({sender}).")

    new_notifications_count = 0

    for deadline in msg.deadlines:
        deadline_id = deadline.get("id")
        title = deadline.get("title", "Upcoming Task")
        due_date = deadline.get("due_date", "Soon")

        # Skip if already notified
        if deadline_id in already_notified:
            ctx.logger.debug(f"Skipping deadline ID '{deadline_id}' (already notified).")
            continue

        # Format reminder text
        reminder_text = f"Reminder: {title} is due on {due_date}"

        # Add to memory set
        already_notified.add(deadline_id)
        new_notifications_count += 1

        ctx.logger.info(f"New Deadline Found! [ID: {deadline_id}]: {reminder_text}")

        # Build notification message for Orchestrator
        notification = ReminderNotification(
            user_id="broadcast",
            text=reminder_text
        )

        # Send notification to Orchestrator
        await ctx.send(ORCHESTRATOR_ADDRESS, notification)

    ctx.logger.info(f"Processed deadline check. Sent {new_notifications_count} new notification(s).")


# ==============================================================================
# 5. RUN AGENT
# ==============================================================================
if __name__ == "__main__":
    notifier.run()
