"""
build_index.py

One-time ingestion script for the Campus FAQ Agent RAG pipeline.
Reads 'handbook.pdf', extracts text page by page, splits text into overlapping
chunks, generates dense vector embeddings using sentence-transformers, and stores
the data into a persistent local ChromaDB vector database.

Run this script once before starting faq_agent.py (or whenever handbook.pdf updates).
"""

import sys
from pathlib import Path
import chromadb
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

# =====================================================================
# CONSTANTS
# =====================================================================
PDF_PATH = "handbook.pdf"
CHROMA_DB_DIR = "./chroma_db"
COLLECTION_NAME = "handbook_chunks"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
CHUNK_SIZE = 500   # Character count per chunk
CHUNK_OVERLAP = 50 # Overlapping characters between consecutive chunks


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    Splits text into overlapping character chunks.

    Args:
        text (str): The raw text extracted from a PDF page.
        chunk_size (int): Max number of characters per chunk. Default 500.
        overlap (int): Number of overlapping characters between chunks. Default 50.

    Returns:
        list[str]: A list of text chunk strings.

    WHY CHUNKING & OVERLAP?
    - Chunking keeps text blocks focused so vector search finds precise relevant sections,
      rather than matching against an entire broad page.
    - Overlap ensures sentences or phrases that span across a chunk boundary are not split
      in half, preserving context across adjacent chunks.
    """
    if not text or not text.strip():
        return []

    chunks = []
    # Step size between chunk starting points
    stride = max(1, chunk_size - overlap)
    
    for start_idx in range(0, len(text), stride):
        end_idx = start_idx + chunk_size
        chunk = text[start_idx:end_idx].strip()
        if chunk:
            chunks.append(chunk)
            
    return chunks


def build_handbook_index() -> None:
    """
    Loads handbook.pdf, chunks pages, generates embeddings, and saves to ChromaDB.

    Raises:
        FileNotFoundError: If handbook.pdf is missing from the project directory.
    """
    pdf_file = Path(PDF_PATH)
    if not pdf_file.exists():
        print(f"ERROR: File '{PDF_PATH}' not found in current directory.")
        print("Please place 'handbook.pdf' in the project root before running build_index.py.")
        sys.exit(1)

    print(f"--> Step 1/4: Reading '{PDF_PATH}'...")
    reader = PdfReader(PDF_PATH)
    total_pages = len(reader.pages)
    print(f"    Found {total_pages} page(s).")

    print("--> Step 2/4: Extracting text & chunking...")
    all_chunks: list[str] = []
    all_metadatas: list[dict] = []
    all_ids: list[str] = []

    global_chunk_count = 0
    for page_num, page in enumerate(reader.pages, start=1):
        raw_text = page.extract_text() or ""
        page_chunks = chunk_text(raw_text)

        for chunk_idx, chunk in enumerate(page_chunks):
            global_chunk_count += 1
            chunk_id = f"page_{page_num}_chunk_{chunk_idx}_{global_chunk_count}"
            
            all_chunks.append(chunk)
            all_ids.append(chunk_id)
            all_metadatas.append({
                "source_page": page_num,
                "chunk_index": chunk_idx,
            })

    print(f"    Created {len(all_chunks)} total chunks across {total_pages} pages.")

    if not all_chunks:
        print("WARNING: No text could be extracted from the PDF. Is it empty or scanned as images?")
        sys.exit(1)

    print(f"--> Step 3/4: Loading embedding model '{EMBEDDING_MODEL_NAME}'...")
    # sentence-transformers runs locally on CPU/GPU without needing an external API key
    embedder = SentenceTransformer(EMBEDDING_MODEL_NAME)
    
    print("--> Generating embeddings for chunks...")
    embeddings = embedder.encode(all_chunks, show_progress_bar=True).tolist()

    print(f"--> Step 4/4: Saving to persistent ChromaDB at '{CHROMA_DB_DIR}'...")
    # PersistentClient automatically creates/saves SQLite database on disk
    client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
    
    # Configure collection with cosine distance space
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )

    # If re-running, clear existing collection items first to prevent duplicate entries
    existing_count = collection.count()
    if existing_count > 0:
        print(f"    Clearing {existing_count} pre-existing entries from collection...")
        existing_ids = collection.get()["ids"]
        if existing_ids:
            collection.delete(ids=existing_ids)

    # Batch insert documents into ChromaDB
    collection.add(
        ids=all_ids,
        documents=all_chunks,
        embeddings=embeddings,
        metadatas=all_metadatas,
    )

    print("\n==================================================")
    print("          INGESTION SUMMARY & STATUS")
    print("==================================================")
    print(f" Total PDF Pages Processed : {total_pages}")
    print(f" Total Chunks Created      : {len(all_chunks)}")
    print(f" Vector DB Storage Path    : {CHROMA_DB_DIR}")
    print(f" Chroma Collection Name    : {COLLECTION_NAME}")
    print(" Index status              : SUCCESSFULLY BUILT & SAVED")
    print("==================================================\n")


if __name__ == "__main__":
    build_handbook_index()
