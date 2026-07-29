"""
faq_agent.py

Campus Operations FAQ Specialist Agent built with the uagents framework.
Answers general college policy and handbook queries using Retrieval Augmented
Generation (RAG) backed by a local persistent ChromaDB vector index and the
Anthropic Claude API for grounded, anti-hallucinated response generation.
"""

# =====================================================================
# 1. IMPORTS
# =====================================================================
import os
import sys
from typing import Any, List, Dict
import chromadb
import anthropic
from sentence_transformers import SentenceTransformer
from uagents import Agent, Context, Model

# =====================================================================
# 2. CONSTANTS
# =====================================================================
# Fixed seed phrase for agent address persistence across restarts
SEED_PHRASE = "campus_faq_agent_fixed_seed_phrase_change_in_production_2026"

# Port and endpoint for local uagents communication within campus system
AGENT_PORT = 8007
AGENT_ENDPOINT = ["http://127.0.0.1:8007/submit"]

# RAG & DB Configurations
CHROMA_DB_DIR = "./chroma_db"
COLLECTION_NAME = "handbook_chunks"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

# Anthropic Claude API model for grounded answer generation
CLAUDE_MODEL = "claude-3-5-sonnet-20241022"

# Minimum Cosine Similarity Threshold (0.0 to 1.0)
MIN_SIMILARITY_THRESHOLD = 0.3

# Default Top-K chunks to retrieve for RAG context
TOP_K_CHUNKS = 3

# Global embedding model instance placeholder (cached lazily)
_EMBEDDER_INSTANCE = None


def get_embedder() -> SentenceTransformer:
    """
    Lazy singleton loader for the sentence-transformer model.
    Prevents slow module import times and thread locks on startup.
    """
    global _EMBEDDER_INSTANCE
    if _EMBEDDER_INSTANCE is None:
        _EMBEDDER_INSTANCE = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _EMBEDDER_INSTANCE


# =====================================================================
# 3. VECTOR STORE SETUP & AGENT INITIALIZATION
# =====================================================================
faq_agent = Agent(
    name="faq_agent",
    seed=SEED_PHRASE,
    port=AGENT_PORT,
    endpoint=AGENT_ENDPOINT,
)


# =====================================================================
# 4. MESSAGE MODELS (PYDANTIC MODEL CLASSES)
# =====================================================================
class FaqQuery(Model):
    """Incoming query message sent by Orchestrator or user."""
    user_id: str
    text: str


class FaqReply(Model):
    """Outgoing response message with answer and source transparency."""
    text: str
    success: bool
    source_pages: List[int]


# =====================================================================
# 5. HELPER / CORE LOGIC FUNCTIONS
# =====================================================================
def load_vector_store() -> Any:
    """
    Loads the persistent ChromaDB collection created by build_index.py.

    Returns:
        Any: The handbook chunks collection instance.

    Raises:
        RuntimeError: If collection or DB folder does not exist or is empty.
    """
    if not os.path.exists(CHROMA_DB_DIR):
        raise RuntimeError(
            f"ChromaDB directory '{CHROMA_DB_DIR}' not found. "
            "Please run 'python build_index.py' first to build the handbook vector index."
        )

    try:
        client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
        collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )
        if collection.count() == 0:
            raise RuntimeError(
                f"Collection '{COLLECTION_NAME}' is empty. "
                "Please run 'python build_index.py' to ingest 'handbook.pdf'."
            )
        return collection
    except Exception as err:
        if isinstance(err, RuntimeError):
            raise err
        raise RuntimeError(
            f"Failed to access collection '{COLLECTION_NAME}': {str(err)}. "
            "Please run 'python build_index.py' to populate the vector index."
        ) from err


def retrieve_relevant_chunks(
    question: str, collection: Any, top_k: int = TOP_K_CHUNKS
) -> List[Dict[str, Any]]:
    """
    Embeds the user question and retrieves top_k similar handbook chunks.

    Args:
        question (str): User's natural language question.
        collection (Any): Loaded ChromaDB collection.
        top_k (int): Number of top matches to return. Default 3.

    Returns:
        List[Dict[str, Any]]: List of dicts containing chunk_text, source_page, and similarity_score.
    """
    embedder = get_embedder()
    query_vector = embedder.encode([question]).tolist()[0]
    results = collection.query(
        query_embeddings=[query_vector],
        n_results=top_k,
    )

    retrieved = []
    if not results or not results.get("documents") or not results["documents"][0]:
        return retrieved

    docs = results["documents"][0]
    metas = results["metadatas"][0]
    distances = results["distances"][0]

    for doc, meta, dist in zip(docs, metas, distances):
        # ChromaDB cosine distance range [0, 2]. Cosine Similarity = 1 - distance
        similarity_score = round(max(0.0, 1.0 - float(dist)), 4)
        retrieved.append({
            "chunk_text": doc,
            "source_page": meta.get("source_page", 0),
            "similarity_score": similarity_score,
        })

    return retrieved


def _build_rag_prompt(question: str, chunks: List[Dict[str, Any]]) -> str:
    """Helper function to format retrieved context chunks into an anti-hallucination prompt."""
    context_blocks = []
    for idx, c in enumerate(chunks, start=1):
        context_blocks.append(
            f"[Excerpt {idx} - Page {c['source_page']}]\n{c['chunk_text']}"
        )
    formatted_context = "\n\n".join(context_blocks)

    return (
        "You are an official College Handbook FAQ assistant.\n"
        "Instructions:\n"
        "1. Answer the question ONLY using the context excerpts provided below.\n"
        "2. If the context excerpts do NOT contain the answer, reply EXACTLY with:\n"
        "   'I don't have that information in the handbook.'\n"
        "3. Do NOT use outside knowledge, speculate, or infer policies not stated.\n"
        "4. Be clear, concise, and professional.\n\n"
        f"--- CONTEXT EXCERPTS ---\n{formatted_context}\n\n"
        f"--- USER QUESTION ---\n{question}"
    )


def generate_answer(question: str, chunks: List[Dict[str, Any]]) -> str:
    """
    Calls Anthropic API to synthesize a grounded answer based on retrieved context.
    If ANTHROPIC_API_KEY is not set, returns a grounded text summary directly from
    the retrieved handbook excerpts so the UI works out-of-the-box.

    Args:
        question (str): User's natural language question.
        chunks (List[Dict[str, Any]]): Retrieved context chunks from vector DB.

    Returns:
        str: Grounded answer text.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    
    # Grounded fallback when API key is not yet set
    if not api_key:
        extracted = []
        for c in chunks:
            extracted.append(f"• (Page {c['source_page']}): {c['chunk_text']}")
        return (
            "**Official Handbook Excerpt(s):**\n\n" + "\n\n".join(extracted) +
            "\n\n*(Note: Set the `ANTHROPIC_API_KEY` environment variable to enable AI synthesis via Claude.)*"
        )

    prompt = _build_rag_prompt(question, chunks)

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        # Safe block text extraction
        first_block = response.content[0]
        answer_text = getattr(first_block, "text", str(first_block))
        return answer_text.strip()
    except anthropic.APIError as api_err:
        return f"Anthropic API Error: {api_err.message}"
    except Exception as err:
        return f"Service Error: Unable to generate answer at this time. ({str(err)})"


# =====================================================================
# 6. MESSAGE HANDLERS
# =====================================================================
@faq_agent.on_message(model=FaqQuery)
async def handle_faq_query(ctx: Context, sender: str, msg: FaqQuery) -> None:
    """Handles incoming FaqQuery messages with RAG pipeline."""
    ctx.logger.info(f"Received query from '{msg.user_id}': '{msg.text}'")

    try:
        collection = load_vector_store()
        chunks = retrieve_relevant_chunks(msg.text, collection, top_k=TOP_K_CHUNKS)

        passing_chunks = [
            c for c in chunks if c["similarity_score"] >= MIN_SIMILARITY_THRESHOLD
        ]

        if not passing_chunks:
            reply = FaqReply(
                text="I'm sorry, but this question appears to be outside the scope of the college handbook.",
                success=True,
                source_pages=[],
            )
        else:
            answer = generate_answer(msg.text, passing_chunks)
            pages = sorted(list(set(c["source_page"] for c in passing_chunks)))
            reply = FaqReply(
                text=answer,
                success=True,
                source_pages=pages,
            )

        await ctx.send(sender, reply)
        ctx.logger.info(f"Successfully replied to {sender}.")

    except Exception as exc:
        ctx.logger.error(f"Error handling FaqQuery: {exc}")
        error_reply = FaqReply(
            text="Something went wrong while processing your request. Please try again.",
            success=False,
            source_pages=[],
        )
        await ctx.send(sender, error_reply)


# =====================================================================
# 7. AGENT STARTUP LOGIC & MAIN
# =====================================================================
@faq_agent.on_event("startup")
async def startup_handler(ctx: Context) -> None:
    """Startup lifecycle event."""
    try:
        collection = load_vector_store()
        count = collection.count()
        ctx.logger.info(f"=== FAQ Agent Started Successfully ===")
        ctx.logger.info(f"Agent Address : {faq_agent.address}")
        ctx.logger.info(f"Local Endpoint: {AGENT_ENDPOINT[0]}")
        ctx.logger.info(f"Indexed Chunks: {count} chunk(s) ready in vector DB.")
    except RuntimeError as err:
        ctx.logger.error(f"STARTUP ERROR: {err}")
        ctx.logger.error("Please run 'python build_index.py' to generate the vector index before starting the agent.")
        sys.exit(1)


if __name__ == "__main__":
    faq_agent.run()
