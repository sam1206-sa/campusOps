// State tracking
let currentUserId = "student_priya_123";
let selectedDocType = "bonafide";

// DOM Elements
const userIdSelect = document.getElementById("userIdSelect");
const customUserId = document.getElementById("customUserId");
const setCustomUserBtn = document.getElementById("setCustomUserBtn");
const docBtns = document.querySelectorAll(".doc-btn");
const requestReason = document.getElementById("requestReason");
const requestForm = document.getElementById("requestForm");
const chatContainer = document.getElementById("chatContainer");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const refreshDbBtn = document.getElementById("refreshDbBtn");
const requestsTableBody = document.getElementById("requestsTableBody");

const headerSearchInput = document.getElementById("headerSearchInput");
const headerSearchBtn = document.getElementById("headerSearchBtn");

// Dynamic Stats Elements
const statTotal = document.getElementById("statTotal");
const statPending = document.getElementById("statPending");
const statApproved = document.getElementById("statApproved");
const statReady = document.getElementById("statReady");

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
    // Set active select
    currentUserId = userIdSelect.value;
    loadRequestsTable();
    
    // Register categories clicking -> IMMEDIATE action
    docBtns.forEach(btn => {
        btn.addEventListener("click", async () => {
            docBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedDocType = btn.dataset.value;

            // Prevent staff from submitting requests
            if (currentUserId.startsWith("staff")) {
                alert("Administrative staff accounts cannot submit document requests. Please switch to a student profile.");
                return;
            }

            const reasonVal = requestReason.value.trim();
            
            // Build prompt
            let promptText = `I need a ${selectedDocType} certificate`;
            if (reasonVal) {
                promptText += ` for ${reasonVal}`;
            }
            
            addUserMessage(promptText);
            requestReason.value = ""; // Clear reason
            
            await sendQueryToAgent(promptText);
        });
    });

    // Profile selector listeners
    userIdSelect.addEventListener("change", () => {
        currentUserId = userIdSelect.value;
        customUserId.value = ""; // Clear custom text
        addSystemMessage(`Switched simulated user environment to ${currentUserId}`);
        loadRequestsTable();
    });

    setCustomUserBtn.addEventListener("click", () => {
        const val = customUserId.value.trim();
        if (val) {
            currentUserId = val;
            // Sync with dropdown selection
            let optionExists = false;
            for (let i = 0; i < userIdSelect.options.length; i++) {
                if (userIdSelect.options[i].value === currentUserId) {
                    userIdSelect.selectedIndex = i;
                    optionExists = true;
                    break;
                }
            }
            if (!optionExists) {
                const opt = document.createElement("option");
                opt.value = val;
                opt.textContent = `${val} (Custom)`;
                userIdSelect.appendChild(opt);
                userIdSelect.value = val;
            }
            customUserId.value = ""; // Clear custom text
            addSystemMessage(`Switched simulated user environment to custom ID: ${currentUserId}`);
            loadRequestsTable();
        }
    });

    // Handle Form Submit (Fallback if button clicked natively)
    requestForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        if (currentUserId.startsWith("staff")) {
            alert("Administrative staff accounts cannot submit document requests. Please switch to a student profile.");
            return;
        }

        const reasonVal = requestReason.value.trim();
        let promptText = `I need a ${selectedDocType} certificate`;
        if (reasonVal) {
            promptText += ` for ${reasonVal}`;
        }
        
        addUserMessage(promptText);
        requestReason.value = ""; // Clear form
        
        await sendQueryToAgent(promptText);
    });

    // Talk to Agent NLP chat input area
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;
        
        addUserMessage(text);
        chatInput.value = "";
        
        await sendQueryToAgent(text);
    });

    // Header Search Input queries
    if (headerSearchBtn && headerSearchInput) {
        headerSearchBtn.addEventListener("click", () => {
            const query = headerSearchInput.value.trim();
            if (query) {
                addUserMessage(query);
                headerSearchInput.value = "";
                sendQueryToAgent(query);
            }
        });

        headerSearchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const query = headerSearchInput.value.trim();
                if (query) {
                    addUserMessage(query);
                    headerSearchInput.value = "";
                    sendQueryToAgent(query);
                }
            }
        });
    }

    // Manual refresh
    refreshDbBtn.addEventListener("click", loadRequestsTable);
});

// Category Side Navigation switch actions
window.switchCategory = function(cat) {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => item.classList.remove("active"));
    
    // Highlight the clicked category element
    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active");
    }
    
    if (cat === "all") {
        addSystemMessage("Displaying all student/staff request history records.");
        loadRequestsTable();
    } else if (cat === "exams") {
        const query = "What is the exams and timetable schedule?";
        addUserMessage(query);
        sendQueryToAgent(query);
    } else if (cat === "repairs") {
        const query = "Who is the agent in-charge of WiFi and repairs?";
        addUserMessage(query);
        sendQueryToAgent(query);
    } else if (cat === "certificates") {
        addSystemMessage("Use the 'Quick Apply Document' panel on the left to request a certificate.");
    } else if (cat === "rules") {
        const query = "What are the hostel policies and gate timing regulations?";
        addUserMessage(query);
        sendQueryToAgent(query);
    } else if (cat === "announcements") {
        const query = "Are there any recent campus operations notices?";
        addUserMessage(query);
        sendQueryToAgent(query);
    }
};

// Helper: Load Dashboard Requests Table
async function loadRequestsTable() {
    const isStaff = currentUserId.startsWith("staff");
    const colspan = isStaff ? 8 : 7;
    
    // Toggle the "Requested By" header visibility
    const staffCols = document.querySelectorAll(".staff-only-col");
    staffCols.forEach(col => {
        col.style.display = isStaff ? "table-cell" : "none";
    });

    requestsTableBody.innerHTML = `<tr><td colspan="${colspan}" class="loading-placeholder">Syncing records...</td></tr>`;
    try {
        const res = await fetch(`/api/requests/${currentUserId}`);
        if (!res.ok) throw new Error("Failed to fetch database");
        const list = await res.json();
        
        // Calculate and update metrics
        updateMetrics(list);
        
        if (list.length === 0) {
            requestsTableBody.innerHTML = `<tr><td colspan="${colspan}" class="loading-placeholder">No requests on file. Click a Quick Apply button or search to submit a request.</td></tr>`;
            return;
        }
        
        requestsTableBody.innerHTML = "";
        list.forEach(req => {
            const tr = document.createElement("tr");
            
            // Format timestamps nicely
            const dateReq = formatDate(req.date_requested);
            const dateUp = req.date_updated ? formatDate(req.date_updated) : "—";
            
            // Badge style mapping
            const cleanStatus = req.status.replace(/_/g, " ");
            
            // Generate actions column content dynamically based on role
            let actionsHtml = "";
            if (isStaff) {
                actionsHtml = `
                    <div class="admin-actions-cell">
                        <button class="action-sub-btn approve-btn" onclick="approveRequestQuick(${req.id})" title="Approve Request">Approve</button>
                        <button class="action-sub-btn ready-btn" onclick="readyRequestQuick(${req.id})" title="Mark Ready for Pickup">Ready</button>
                        <button class="action-sub-btn reject-btn" onclick="rejectRequestQuick(${req.id})" title="Reject Request">Reject</button>
                        <button class="action-sub-btn delete-btn" onclick="deleteRequestQuick(${req.id})" title="Delete Request">Delete</button>
                    </div>
                `;
            } else {
                actionsHtml = `
                    <button class="action-sub-btn" onclick="checkStatusQuick(${req.id})">
                        Check Status
                    </button>
                `;
            }

            const requestedByCell = isStaff ? `<td style="font-weight: 600; color: var(--primary); font-family: monospace;">${req.user_id}</td>` : "";
            
            tr.innerHTML = `
                <td><strong>#${req.id}</strong></td>
                ${requestedByCell}
                <td style="text-transform: capitalize;">${req.document_type.replace(/_/g, " ")}</td>
                <td><span class="badge ${req.status}">${cleanStatus}</span></td>
                <td><span style="color: var(--text-muted); font-style: italic;">${req.reason || "Not Stated"}</span></td>
                <td>${dateReq}</td>
                <td>${dateUp}</td>
                <td>${actionsHtml}</td>
            `;
            requestsTableBody.appendChild(tr);
        });
    } catch (err) {
        requestsTableBody.innerHTML = `<tr><td colspan="${colspan}" class="loading-placeholder" style="color: var(--danger)">⚠️ Error loading database: ${err.message}</td></tr>`;
    }
}

// Compute dashboard statistics and update values
function updateMetrics(list) {
    let total = list.length;
    let pending = 0;
    let approved = 0;
    let ready = 0;

    list.forEach(req => {
        if (req.status === "pending") pending++;
        else if (req.status === "approved") approved++;
        else if (req.status === "ready_for_pickup") ready++;
    });

    statTotal.textContent = total;
    statPending.textContent = pending;
    statApproved.textContent = approved;
    statReady.textContent = ready;
}

// Quick action button triggers agent NLP check-status flow
async function checkStatusQuick(reqId) {
    const textQuery = `What is the status of request #${reqId}?`;
    addUserMessage(textQuery);
    await sendQueryToAgent(textQuery);
}

// Admin action buttons trigger agent NLP administrative flows
async function approveRequestQuick(reqId) {
    const textQuery = `Approve request #${reqId}`;
    addUserMessage(`System call: Approve request #${reqId}`);
    await sendQueryToAgent(textQuery);
}

async function readyRequestQuick(reqId) {
    const textQuery = `Mark request #${reqId} as ready for pickup`;
    addUserMessage(`System call: Mark request #${reqId} as ready`);
    await sendQueryToAgent(textQuery);
}

async function rejectRequestQuick(reqId) {
    const reason = prompt("Please provide a reason for rejecting this document request:");
    if (reason === null) return; // cancelled
    const textQuery = `Reject request #${reqId} because of: ${reason.trim() || 'Missing credentials'}`;
    addUserMessage(`System call: Reject request #${reqId}`);
    await sendQueryToAgent(textQuery);
}

async function deleteRequestQuick(reqId) {
    if (!confirm(`Are you sure you want to permanently delete Request #${reqId}? This action is irreversible.`)) return;
    const textQuery = `Delete request #${reqId}`;
    addUserMessage(`System call: Delete request #${reqId}`);
    await sendQueryToAgent(textQuery);
}

// Communicate with FastAPI -> Agentverse agent
async function sendQueryToAgent(inputText) {
    const loaderId = appendTypingIndicator();
    scrollToBottom();
    
    try {
        const response = await fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: currentUserId, text: inputText })
        });
        
        removeTypingIndicator(loaderId);
        
        if (!response.ok) {
            const errBody = await response.json();
            throw new Error(errBody.detail || "API error");
        }
        
        const data = await response.json();
        addAgentMessage(data.text);
        
        // Reload dashboard table records automatically
        await loadRequestsTable();
        
    } catch (err) {
        removeTypingIndicator(loaderId);
        addAgentMessage(`Error communicating with gateway agent: ${err.message}`);
    }
    
    scrollToBottom();
}

// UI Bubbles Adders
function addUserMessage(text) {
    const msg = document.createElement("div");
    msg.className = "message user";
    msg.innerHTML = `
        <div class="message-bubble">${escapeHtml(text)}</div>
        <div class="message-time">Student (${currentUserId})</div>
    `;
    chatContainer.appendChild(msg);
    scrollToBottom();
}

function addAgentMessage(text) {
    const msg = document.createElement("div");
    msg.className = "message agent";
    msg.innerHTML = `
        <div class="message-bubble">${markdownFormat(text)}</div>
        <div class="message-time">Agent Response</div>
    `;
    chatContainer.appendChild(msg);
    scrollToBottom();
}

function addSystemMessage(text) {
    const msg = document.createElement("div");
    msg.className = "message agent";
    msg.innerHTML = `
        <div class="message-bubble" style="border-left: 3px solid var(--warning); background-color: #fffbeb; color: var(--warning-hover); font-style: italic;">
            ✈️ [System Log]: ${escapeHtml(text)}
        </div>
        <div class="message-time">Client Config</div>
    `;
    chatContainer.appendChild(msg);
    scrollToBottom();
}

// Typing indicators
function appendTypingIndicator() {
    const id = "typ_" + Date.now();
    const bubble = document.createElement("div");
    bubble.className = "message agent";
    bubble.id = id;
    bubble.innerHTML = `
        <div class="message-bubble">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    chatContainer.appendChild(bubble);
    return id;
}

// Remove Indicator
function removeTypingIndicator(id) {
    const indicator = document.getElementById(id);
    if (indicator) indicator.remove();
}

// Scroll layout helper
// Smooth scroll container to bottom
function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Escape html helper
function escapeHtml(text) {
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// Markdown parser helper
function markdownFormat(text) {
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

// Date formatter helper
function formatDate(isoString) {
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch(e) {
        return isoString;
    }
}
