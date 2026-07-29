/**
 * app.js — Frontend interactive logic for Campus FAQ RAG Web Interface
 */

document.addEventListener("DOMContentLoaded", () => {
    fetchSystemStatus();
});

// System log console helper
function appendLog(message, type = "info") {
    const consoleBody = document.getElementById("consoleBody");
    if (!consoleBody) return;

    const time = new Date().toLocaleTimeString();
    const logElem = document.createElement("p");
    logElem.className = `log-line ${type}`;
    logElem.textContent = `[${time}] ${message}`;

    consoleBody.appendChild(logElem);
    consoleBody.scrollTop = consoleBody.scrollHeight;
}

// Fetch vector DB status and API key status from local server
async function fetchSystemStatus() {
    try {
        const res = await fetch("/api/status");
        const data = await res.json();

        // Update DB status text and chunk counts
        const dbStatusText = document.getElementById("dbStatusText");
        const metricChunkCount = document.getElementById("metricChunkCount");

        if (data.indexed && data.chunk_count > 0) {
            dbStatusText.textContent = `DB Active (${data.chunk_count} Chunks)`;
            metricChunkCount.textContent = data.chunk_count;
            appendLog(`Vector database loaded: ${data.chunk_count} chunk(s) ready.`, "success");
        } else {
            dbStatusText.textContent = "No Index Found";
            metricChunkCount.textContent = "0";
            appendLog("No vector index found. Click 'Generate Sample Handbook PDF' or 'Rebuild Vector Index'.", "warn");
        }

        // Update API status
        const apiStatusText = document.getElementById("apiStatusText");
        if (data.has_api_key) {
            apiStatusText.textContent = "Claude API Ready";
            appendLog("Anthropic API key detected.", "info");
        } else {
            apiStatusText.textContent = "API Key Missing";
            appendLog("ANTHROPIC_API_KEY env var not set. (Answers will use grounded fallback generator)", "warn");
        }
    } catch (err) {
        appendLog(`Failed to connect to backend server: ${err.message}`, "error");
    }
}

// Keypress listener for ENTER key in search input
function handleKeyPress(event) {
    if (event.key === "Enter") {
        submitQuery();
    }
}

// Set question from quick-prompt pills
function askQuestion(text) {
    const input = document.getElementById("queryInput");
    input.value = text;
    submitQuery();
}

// Submit query to /api/ask
async function submitQuery() {
    const input = document.getElementById("queryInput");
    const question = input.value.trim();

    if (!question) {
        alert("Please enter a policy question.");
        return;
    }

    const welcomeHero = document.getElementById("welcomeHero");
    const answerSection = document.getElementById("answerSection");
    const loadingSpinner = document.getElementById("loadingSpinner");
    const sendBtn = document.getElementById("sendBtn");

    // UI Loading state
    welcomeHero.classList.add("hidden");
    answerSection.classList.add("hidden");
    loadingSpinner.classList.remove("hidden");
    sendBtn.disabled = true;

    appendLog(`Querying: "${question}"`, "info");

    try {
        const response = await fetch("/api/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question }),
        });

        const data = await response.json();

        loadingSpinner.classList.add("hidden");
        sendBtn.disabled = false;

        if (data.error) {
            appendLog(`Error: ${data.error}`, "error");
            alert(`Error: ${data.error}`);
            welcomeHero.classList.remove("hidden");
            return;
        }

        // Render Answer
        renderAnswer(data);
        appendLog(`Answer received. Match score: ${(data.similarity_score * 100).toFixed(1)}%`, "success");

    } catch (err) {
        loadingSpinner.classList.add("hidden");
        sendBtn.disabled = false;
        appendLog(`Network Error: ${err.message}`, "error");
        alert("Failed to reach the FAQ backend server.");
        welcomeHero.classList.remove("hidden");
    }
}

// Format & Render Answer Card
function renderAnswer(data) {
    const answerSection = document.getElementById("answerSection");
    const answerBody = document.getElementById("answerBody");
    const meterFill = document.getElementById("meterFill");
    const meterValue = document.getElementById("meterValue");
    const citationsContainer = document.getElementById("citationsContainer");
    const citationBadges = document.getElementById("citationBadges");

    // Show answer section
    answerSection.classList.remove("hidden");

    // Format Markdown paragraphs & bullets simple parser
    let formattedText = data.answer
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n- /g, "<br>• ")
        .replace(/\n/g, "<br>");
    
    answerBody.innerHTML = `<p>${formattedText}</p>`;

    // Update Match Score Meter
    const scorePct = Math.min(100, Math.max(0, Math.round(data.similarity_score * 100)));
    meterFill.style.width = `${scorePct}%`;
    meterValue.textContent = `${scorePct}% Match`;

    // Render Page Citations
    citationBadges.innerHTML = "";
    if (data.source_pages && data.source_pages.length > 0) {
        citationsContainer.classList.remove("hidden");
        data.source_pages.forEach(page => {
            const badge = document.createElement("span");
            badge.className = "page-badge";
            badge.textContent = `📄 Page ${page}`;
            citationBadges.appendChild(badge);
        });
    } else {
        citationsContainer.classList.add("hidden");
    }

    // Render Chunks Accordion
    renderChunksAccordion(data.chunks || []);
}

// Render Retrieved Chunks Accordion
function renderChunksAccordion(chunks) {
    const accordion = document.getElementById("chunksAccordion");
    const chunkCount = document.getElementById("chunkCount");
    const accordionContent = document.getElementById("accordionContent");

    if (!chunks || chunks.length === 0) {
        accordion.classList.add("hidden");
        return;
    }

    accordion.classList.remove("hidden");
    chunkCount.textContent = chunks.length;
    accordionContent.innerHTML = "";

    chunks.forEach((chunk, index) => {
        const card = document.createElement("div");
        card.className = "chunk-card";
        card.innerHTML = `
            <div class="chunk-meta">
                <span><i class="fa-solid fa-file-text"></i> Chunk #${index + 1} — Page ${chunk.source_page}</span>
                <span>Similarity: ${(chunk.similarity_score * 100).toFixed(1)}%</span>
            </div>
            <div class="chunk-text">${escapeHtml(chunk.chunk_text)}</div>
        `;
        accordionContent.appendChild(card);
    });
}

// Toggle Accordion Drawer
function toggleAccordion() {
    const content = document.getElementById("accordionContent");
    const arrow = document.getElementById("accordionArrow");
    
    content.classList.toggle("hidden");
    arrow.classList.toggle("rotated");
}

// Trigger Vector Index Rebuild via API
async function triggerBuildIndex() {
    appendLog("Triggering vector index rebuild...", "info");
    try {
        const res = await fetch("/api/build-index", { method: "POST" });
        const data = await res.json();
        if (data.success) {
            appendLog(`Index built successfully! Processed ${data.total_chunks} chunks.`, "success");
            alert(`Vector Index Built!\nProcessed ${data.total_chunks} chunks from handbook.pdf.`);
            fetchSystemStatus();
        } else {
            appendLog(`Build failed: ${data.message}`, "error");
            alert(`Build Index Error: ${data.message}`);
        }
    } catch (err) {
        appendLog(`Failed to trigger index build: ${err.message}`, "error");
    }
}

// Trigger Sample Handbook PDF Generation
async function generateSamplePdf() {
    appendLog("Generating sample handbook PDF...", "info");
    try {
        const res = await fetch("/api/generate-sample-pdf", { method: "POST" });
        const data = await res.json();
        if (data.success) {
            appendLog("Sample handbook.pdf created successfully!", "success");
            alert("Sample 'handbook.pdf' created with realistic college policies!\nNow click 'Rebuild Vector Index' to index it.");
            fetchSystemStatus();
        } else {
            appendLog(`PDF generation error: ${data.message}`, "error");
        }
    } catch (err) {
        appendLog(`Failed to generate sample PDF: ${err.message}`, "error");
    }
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
