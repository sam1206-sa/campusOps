/* ==========================================================================
   Sri Eswar College of Engineering - Complaint Management Portal JavaScript
   Logic: Department Routing, AI Agent Chat Bot State Machine, Form Handling,
          Status Workflow Management & LocalStorage Persistence
   ========================================================================== */

// --- 1. DEPARTMENT ROUTING MAP (26 Categories) ---
const CATEGORY_ROUTING_MAP = {
    "Classroom Change Request": { dept: "Academic Office", sla: "24 Hours" },
    "Faculty/Staff Complaint": { dept: "Academic Office", sla: "48 Hours" },
    "Classroom Cleanliness": { dept: "Maintenance", sla: "12 Hours" },
    "Fan Not Working": { dept: "Electrical", sla: "12 Hours" },
    "Light Not Working": { dept: "Electrical", sla: "12 Hours" },
    "Projector/Smart Board Issue": { dept: "IT Support", sla: "6 Hours" },
    "Wi-Fi/Internet Issue": { dept: "IT Support", sla: "6 Hours" },
    "Computer/Lab Equipment Issue": { dept: "IT Support", sla: "12 Hours" },
    "Bench/Chair Damage": { dept: "Maintenance", sla: "24 Hours" },
    "Drinking Water Issue": { dept: "Maintenance", sla: "4 Hours" },
    "Washroom Issue": { dept: "Maintenance", sla: "4 Hours" },
    "Electrical Issue": { dept: "Electrical", sla: "6 Hours" },
    "Hostel Complaint": { dept: "Hostel Office", sla: "24 Hours" },
    "Bus Transport Complaint": { dept: "Transport", sla: "12 Hours" },
    "Canteen Complaint": { dept: "Administration", sla: "24 Hours" },
    "Library Complaint": { dept: "Library", sla: "24 Hours" },
    "Parking Issue": { dept: "Security", sla: "12 Hours" },
    "Campus Safety/Security": { dept: "Security", sla: "Immediate (2 Hours)" },
    "Ragging/Harassment": { dept: "Security", sla: "Immediate (1 Hour)" },
    "Academic Issue": { dept: "Academic Office", sla: "48 Hours" },
    "Examination Issue": { dept: "Examination Cell", sla: "24 Hours" },
    "ID Card Issue": { dept: "Administration", sla: "24 Hours" },
    "Attendance Issue": { dept: "Academic Office", sla: "24 Hours" },
    "Fee/Accounts Issue": { dept: "Accounts Office", sla: "48 Hours" },
    "General Suggestion": { dept: "Administration", sla: "72 Hours" },
    "Other Complaint": { dept: "Administration", sla: "48 Hours" }
};

const ALL_CATEGORIES = Object.keys(CATEGORY_ROUTING_MAP);

// --- 2. SAMPLE DATA SEEDING ---
const INITIAL_SAMPLE_TICKETS = [
    {
        id: "SECE-2026-0001",
        userName: "Karthik Raja",
        regNo: "713821CS088",
        dept: "CSE",
        yearSec: "III Year - A Sec",
        contact: "+91 9842100011",
        category: "Fan Not Working",
        building: "Main Academic Block",
        floor: "2nd Floor",
        room: "Room 204",
        dateTime: "2026-07-29T08:30",
        description: "Fan #2 near window is humming loudly and stopped spinning completely.",
        urgency: "Medium",
        assignedDept: "Electrical",
        status: "In Progress",
        submissionTime: "2026-07-29 08:30:00",
        estimatedSLA: "12 Hours",
        photo: null
    },
    {
        id: "SECE-2026-0002",
        userName: "Priya Dharshini",
        regNo: "713821AD034",
        dept: "AI-DS",
        yearSec: "II Year - B Sec",
        contact: "+91 9443211223",
        category: "Projector/Smart Board Issue",
        building: "IT & Computing Block",
        floor: "3rd Floor",
        room: "AI Lab 302",
        dateTime: "2026-07-29T09:00",
        description: "Smart board display color is distorted and HDMI port is loose.",
        urgency: "High",
        assignedDept: "IT Support",
        status: "Assigned",
        submissionTime: "2026-07-29 09:00:00",
        estimatedSLA: "6 Hours",
        photo: null
    },
    {
        id: "SECE-2026-0003",
        userName: "Suresh Kumar",
        regNo: "713821EC105",
        dept: "ECE",
        yearSec: "IV Year - C Sec",
        contact: "+91 9123456789",
        category: "Drinking Water Issue",
        building: "Mechanical & Labs Block",
        floor: "Ground Floor",
        room: "Water Cooler Area",
        dateTime: "2026-07-28T16:45",
        description: "Water cooler tap is leaking continuously and low pressure.",
        urgency: "Medium",
        assignedDept: "Maintenance",
        status: "Resolved",
        submissionTime: "2026-07-28 16:45:00",
        estimatedSLA: "4 Hours",
        photo: null
    }
];

// Load tickets from LocalStorage or initialize
function getStoredTickets() {
    const data = localStorage.getItem("sece_complaints");
    if (!data) {
        localStorage.setItem("sece_complaints", JSON.stringify(INITIAL_SAMPLE_TICKETS));
        return INITIAL_SAMPLE_TICKETS;
    }
    return JSON.parse(data);
}

function saveTicket(newTicket) {
    const tickets = getStoredTickets();
    tickets.unshift(newTicket);
    localStorage.setItem("sece_complaints", JSON.stringify(tickets));
    renderAdminTickets();
}

function updateTicketStatus(id, newStatus) {
    const tickets = getStoredTickets();
    const target = tickets.find(t => t.id === id);
    if (target) {
        target.status = newStatus;
        localStorage.setItem("sece_complaints", JSON.stringify(tickets));
        renderAdminTickets();
        if (currentTrackedTicketId === id) {
            searchTicket(id);
        }
    }
}

// Generate Next Ticket ID (e.g., SECE-2026-0004)
function generateNextId() {
    const tickets = getStoredTickets();
    const count = tickets.length + 1;
    const pad = String(count).padStart(4, '0');
    return `SECE-2026-${pad}`;
}

// Check for duplicate submission
function isDuplicateComplaint(category, building, room) {
    const tickets = getStoredTickets();
    return tickets.some(t => 
        t.category.toLowerCase() === category.toLowerCase() &&
        t.building.toLowerCase() === building.toLowerCase() &&
        t.room.toLowerCase() === room.toLowerCase() &&
        (t.status === 'Pending' || t.status === 'Under Review' || t.status === 'In Progress')
    );
}

// --- 3. TAB SWITCHING LOGIC ---
function switchTab(tabId) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`sec-${tabId}`).classList.add('active');

    if (tabId === 'admin') {
        renderAdminTickets();
    }
}

// --- 4. AI AGENT CHATBOT STATE MACHINE ---
let chatStep = 0;
let chatDraftData = {
    userName: "",
    regNo: "",
    dept: "",
    yearSec: "",
    contact: "",
    category: "",
    building: "",
    floor: "",
    room: "",
    dateTime: "",
    description: "",
    urgency: "Medium",
    photo: null
};

let attachedChatPhoto = null;

function initChat() {
    chatStep = 0;
    chatDraftData = {
        userName: "", regNo: "", dept: "", yearSec: "", contact: "",
        category: "", building: "", floor: "", room: "", dateTime: "",
        description: "", urgency: "Medium", photo: null
    };
    attachedChatPhoto = null;

    const chatContainer = document.getElementById("chatMessages");
    chatContainer.innerHTML = "";

    appendBotMessage(
        "👋 Welcome to <strong>Sri Eswar College of Engineering</strong> Complaint Management Portal!<br><br>" +
        "I am your official <strong>SECE Complaint Assistant</strong>. I am here to collect your grievance, automatically route it to the responsible department, and generate an official tracking ticket.<br><br>" +
        "To get started, please tell me your <strong>Full Name</strong> and your <strong>Department / Year</strong> (e.g. <em>Aravind Swamy, CSE III Year</em>)."
    );

    renderChatChips([
        "CSE III Year", "AI-DS II Year", "ECE IV Year", "EEE I Year", "Mech III Year"
    ]);
}

function appendBotMessage(htmlContent) {
    const chatContainer = document.getElementById("chatMessages");
    const msgDiv = document.createElement("div");
    msgDiv.className = "message bot";

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    msgDiv.innerHTML = `
        <div class="agent-avatar">
            <i class="fa-solid fa-user-gear"></i>
        </div>
        <div>
            <div class="msg-bubble">${htmlContent}</div>
            <span class="msg-time">${timeStr}</span>
        </div>
    `;
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function appendUserMessage(text, photoData = null) {
    const chatContainer = document.getElementById("chatMessages");
    const msgDiv = document.createElement("div");
    msgDiv.className = "message user";

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let imgHtml = "";
    if (photoData) {
        imgHtml = `<br><img src="${photoData}" style="max-width:180px; border-radius:8px; margin-top:8px; display:block;">`;
    }

    msgDiv.innerHTML = `
        <div>
            <div class="msg-bubble">${escapeHtml(text)}${imgHtml}</div>
            <span class="msg-time">${timeStr}</span>
        </div>
    `;
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function renderChatChips(chips) {
    const chipsContainer = document.getElementById("chatChips");
    chipsContainer.innerHTML = "";
    chips.forEach(text => {
        const btn = document.createElement("button");
        btn.className = "chip";
        btn.type = "button";
        btn.innerText = text;
        btn.onclick = () => {
            document.getElementById("chatInput").value = text;
            handleChatSubmit(new Event('submit'));
        };
        chipsContainer.appendChild(btn);
    });
}

function handleChatSubmit(e) {
    if (e) e.preventDefault();

    const inputElem = document.getElementById("chatInput");
    const userText = inputElem.value.trim();

    if (!userText && !attachedChatPhoto) return;

    appendUserMessage(userText || "[Photo Attached]", attachedChatPhoto);
    inputElem.value = "";

    const currentPhoto = attachedChatPhoto;
    removeChatFile();

    // Process State Machine
    setTimeout(() => {
        processAgentFlow(userText, currentPhoto);
    }, 400);
}

function processAgentFlow(text, photo) {
    if (photo) {
        chatDraftData.photo = photo;
    }

    switch (chatStep) {
        case 0:
            // Collecting User Details
            chatDraftData.userName = text.split(',')[0] || text;
            chatDraftData.dept = text.includes('CSE') ? 'CSE' : (text.includes('AI') ? 'AI-DS' : 'General');
            chatDraftData.yearSec = text.includes('Year') ? text : 'Selected Year';

            chatStep = 1;
            appendBotMessage(
                `Thank you, <strong>${escapeHtml(chatDraftData.userName)}</strong>.<br><br>` +
                `What category best describes your complaint? Please select one of the popular options below or type your issue.`
            );

            renderChatChips([
                "Fan Not Working", "Light Not Working", "Projector/Smart Board Issue", 
                "Wi-Fi/Internet Issue", "Drinking Water Issue", "Washroom Issue", 
                "Classroom Cleanliness", "Hostel Complaint", "Bus Transport Complaint"
            ]);
            break;

        case 1:
            // Match Category
            const matchedCategory = findBestMatchingCategory(text);
            chatDraftData.category = matchedCategory;

            const routingInfo = CATEGORY_ROUTING_MAP[matchedCategory] || { dept: "Administration", sla: "48 Hours" };

            // Check if Urgent/High priority like Ragging or Safety
            let highPriorityNote = "";
            if (matchedCategory === "Ragging/Harassment" || matchedCategory === "Campus Safety/Security" || matchedCategory === "Electrical Issue") {
                chatDraftData.urgency = "High";
                highPriorityNote = `<br><span style="color:#EF4444; font-weight:bold;">🚨 Priority Alert: This issue is flagged HIGH URGENCY and will be escalated immediately.</span>`;
            }

            chatStep = 2;
            appendBotMessage(
                `Understood. Category set to <strong>${matchedCategory}</strong>.<br>` +
                `📌 Auto-assigned Department: <strong>${routingInfo.dept}</strong>${highPriorityNote}<br><br>` +
                `Please specify the <strong>Building / Block</strong> and <strong>Floor / Room / Lab Number</strong> where this issue is located.`
            );

            renderChatChips([
                "Main Academic Block, Floor 2, Room 204",
                "IT Block, Floor 3, Lab 302",
                "Mech Block, Ground Floor",
                "Boys Hostel Block B, Room 112"
            ]);
            break;

        case 2:
            // Location
            chatDraftData.building = text.includes("Block") || text.includes("Hostel") ? text : "Academic Block";
            chatDraftData.floor = text.includes("Floor") ? "Specified Floor" : "Ground Floor";
            chatDraftData.room = text;

            chatStep = 3;
            appendBotMessage(
                `Got it! Location recorded as <strong>${escapeHtml(text)}</strong>.<br><br>` +
                `Please provide a <strong>detailed description</strong> of the issue. Tell us what is broken, malfunctioning, or requested.`
            );

            renderChatChips([
                "Not working properly since morning",
                "Making loud noise and stopped functioning",
                "Leaking water tap needs immediate repair",
                "Network disconnected and unreachable"
            ]);
            break;

        case 3:
            // Description & Final Confirmation
            chatDraftData.description = text;
            chatDraftData.dateTime = new Date().toISOString().slice(0, 16);

            // Check Duplicate
            if (isDuplicateComplaint(chatDraftData.category, chatDraftData.building, chatDraftData.room)) {
                appendBotMessage(
                    `⚠️ <strong>Duplicate Alert:</strong> A similar active complaint for category <strong>${chatDraftData.category}</strong> at <strong>${escapeHtml(chatDraftData.room)}</strong> is already undergoing review.<br><br>` +
                    `Would you like to register a new detailed ticket anyway? (Type 'Yes' to proceed)`
                );
                chatStep = 3.5;
                renderChatChips(["Yes, submit complaint", "No, cancel"]);
                return;
            }

            finalizeChatTicket();
            break;

        case 3.5:
            if (text.toLowerCase().includes("yes")) {
                finalizeChatTicket();
            } else {
                appendBotMessage("Operation cancelled. Type 'Hello' anytime to start again.");
                chatStep = 0;
            }
            break;

        default:
            initChat();
            break;
    }
}

function finalizeChatTicket() {
    const nextId = generateNextId();
    const routing = CATEGORY_ROUTING_MAP[chatDraftData.category] || { dept: "Administration", sla: "48 Hours" };

    const newTicket = {
        id: nextId,
        userName: chatDraftData.userName || "Student",
        regNo: chatDraftData.regNo || "N/A",
        dept: chatDraftData.dept || "Engineering",
        yearSec: chatDraftData.yearSec || "Current Student",
        contact: chatDraftData.contact || "N/A",
        category: chatDraftData.category,
        building: chatDraftData.building,
        floor: chatDraftData.floor,
        room: chatDraftData.room,
        dateTime: chatDraftData.dateTime,
        description: chatDraftData.description,
        urgency: chatDraftData.urgency || "Medium",
        assignedDept: routing.dept,
        status: "Pending",
        submissionTime: new Date().toLocaleString(),
        estimatedSLA: routing.sla,
        photo: chatDraftData.photo
    };

    saveTicket(newTicket);

    const ticketSummaryHtml = `
        <div class="chat-ticket-box">
            <div class="chat-ticket-header">
                <span><i class="fa-solid fa-circle-check"></i> Complaint Submitted Successfully</span>
                <span>${newTicket.id}</span>
            </div>
            <div class="ticket-kv"><strong>Complaint ID:</strong> <span>${newTicket.id}</span></div>
            <div class="ticket-kv"><strong>Category:</strong> <span>${newTicket.category}</span></div>
            <div class="ticket-kv"><strong>Location:</strong> <span>${newTicket.building} - ${newTicket.room}</span></div>
            <div class="ticket-kv"><strong>Assigned Department:</strong> <span>${newTicket.assignedDept}</span></div>
            <div class="ticket-kv"><strong>Priority:</strong> <span>${newTicket.urgency}</span></div>
            <div class="ticket-kv"><strong>Status:</strong> <span class="badge-status status-pending">Pending</span></div>
            <div class="ticket-kv"><strong>Est. Turnaround:</strong> <span>${newTicket.estimatedSLA}</span></div>
        </div>
        <br>You can track your ticket live under the <strong>Track Status</strong> tab anytime using ID <code>${newTicket.id}</code>.
    `;

    appendBotMessage(ticketSummaryHtml);
    renderChatChips(["File Another Complaint", "Track This Ticket", "Go to Department View"]);
    chatStep = 4;
}

function resetChat() {
    initChat();
}

function findBestMatchingCategory(userInput) {
    const text = userInput.toLowerCase();
    for (let cat of ALL_CATEGORIES) {
        if (text.includes(cat.toLowerCase())) return cat;
    }
    if (text.includes("fan")) return "Fan Not Working";
    if (text.includes("light") || text.includes("bulb")) return "Light Not Working";
    if (text.includes("projector") || text.includes("smart board")) return "Projector/Smart Board Issue";
    if (text.includes("wifi") || text.includes("net") || text.includes("internet")) return "Wi-Fi/Internet Issue";
    if (text.includes("water") || text.includes("cooler")) return "Drinking Water Issue";
    if (text.includes("washroom") || text.includes("toilet")) return "Washroom Issue";
    if (text.includes("clean") || text.includes("dust")) return "Classroom Cleanliness";
    if (text.includes("bus")) return "Bus Transport Complaint";
    if (text.includes("hostel")) return "Hostel Complaint";
    if (text.includes("ragging") || text.includes("harass")) return "Ragging/Harassment";
    if (text.includes("exam")) return "Examination Issue";
    if (text.includes("fee") || text.includes("account")) return "Fee/Accounts Issue";

    return ALL_CATEGORIES[0]; // default
}

function handleChatFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            attachedChatPhoto = evt.target.result;
            document.getElementById("chatFileName").innerText = file.name;
            document.getElementById("chatFilePreview").classList.remove("hidden");
        };
        reader.readAsDataURL(file);
    }
}

function removeChatFile() {
    attachedChatPhoto = null;
    document.getElementById("chatFileAttach").value = "";
    document.getElementById("chatFilePreview").classList.add("hidden");
}

// --- 5. EXPRESS DIRECT FORM LOGIC ---
function populateCategorySelect() {
    const select = document.getElementById("formCategory");
    select.innerHTML = `<option value="">-- Choose Category --</option>`;
    ALL_CATEGORIES.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.innerText = `${cat} → (${CATEGORY_ROUTING_MAP[cat].dept})`;
        select.appendChild(opt);
    });
}

function updateFormDeptPreview() {
    const val = document.getElementById("formCategory").value;
    const badgeElem = document.getElementById("autoRoutedDept");
    if (val && CATEGORY_ROUTING_MAP[val]) {
        badgeElem.innerText = CATEGORY_ROUTING_MAP[val].dept;
    } else {
        badgeElem.innerText = "Select a category";
    }
}

function handleExpressFormSubmit(e) {
    e.preventDefault();

    const category = document.getElementById("formCategory").value;
    const building = document.getElementById("formBuilding").value;
    const room = document.getElementById("formRoom").value;

    if (isDuplicateComplaint(category, building, room)) {
        if (!confirm("⚠️ Duplicate Warning: A complaint with the same category and room is already pending. Do you wish to submit another ticket anyway?")) {
            return;
        }
    }

    const nextId = generateNextId();
    const routing = CATEGORY_ROUTING_MAP[category] || { dept: "Administration", sla: "48 Hours" };

    const fileInput = document.getElementById("formPhoto");
    let photoData = null;

    const processSubmission = (photoUrl) => {
        const newTicket = {
            id: nextId,
            userName: document.getElementById("formName").value,
            regNo: document.getElementById("formRegNo").value || "N/A",
            dept: document.getElementById("formDept").value,
            yearSec: document.getElementById("formYearSec").value,
            contact: document.getElementById("formContact").value || "N/A",
            category: category,
            building: building,
            floor: document.getElementById("formFloor").value,
            room: room,
            dateTime: document.getElementById("formDateTime").value,
            description: document.getElementById("formDesc").value,
            urgency: document.getElementById("formUrgency").value,
            assignedDept: routing.dept,
            status: "Pending",
            submissionTime: new Date().toLocaleString(),
            estimatedSLA: routing.sla,
            photo: photoUrl
        };

        saveTicket(newTicket);
        alert(`🎉 Complaint Submitted Successfully!\n\nComplaint ID: ${newTicket.id}\nAssigned Department: ${newTicket.assignedDept}\nEst. Turnaround: ${newTicket.estimatedSLA}`);

        document.getElementById("expressForm").reset();
        updateFormDeptPreview();

        // Switch to track tab & search
        switchTab("track");
        searchTicket(newTicket.id);
    };

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            processSubmission(evt.target.result);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        processSubmission(null);
    }
}

// --- 6. TICKET TRACKING & TIMELINE LOGIC ---
let currentTrackedTicketId = null;

function searchTicket(ticketIdOverride) {
    const inputVal = ticketIdOverride || document.getElementById("trackInput").value.trim();
    const resultContainer = document.getElementById("ticketResultContainer");

    if (!inputVal) {
        alert("Please enter a Complaint ID.");
        return;
    }

    const tickets = getStoredTickets();
    const target = tickets.find(t => t.id.toLowerCase() === inputVal.toLowerCase());

    if (!target) {
        resultContainer.classList.remove("hidden");
        resultContainer.innerHTML = `
            <div class="card text-center" style="padding:40px;">
                <i class="fa-solid fa-circle-question" style="font-size:48px; color:var(--text-dim); margin-bottom:12px;"></i>
                <h3>Complaint Ticket Not Found</h3>
                <p style="color:var(--text-muted);">No ticket matches ID <code>${escapeHtml(inputVal)}</code>. Please check your Complaint ID and try again.</p>
            </div>
        `;
        return;
    }

    currentTrackedTicketId = target.id;
    resultContainer.classList.remove("hidden");

    // Compute active step index for timeline
    const statuses = ["Pending", "Under Review", "Assigned", "In Progress", "Resolved", "Closed"];
    const activeIdx = statuses.indexOf(target.status);

    let priorityBadge = `priority-low`;
    if (target.urgency === 'High') priorityBadge = `priority-high`;
    if (target.urgency === 'Medium') priorityBadge = `priority-medium`;

    let statusBadgeClass = `status-${target.status.toLowerCase().replace(/\s+/g, '-')}`;

    resultContainer.innerHTML = `
        <div class="ticket-details-card">
            <div class="ticket-header-strip">
                <div>
                    <span class="ticket-id-tag">${target.id}</span>
                    <span class="badge-priority ${priorityBadge}" style="margin-left:12px;">${target.urgency} Priority</span>
                </div>
                <div>
                    <span class="badge-status ${statusBadgeClass}">${target.status}</span>
                </div>
            </div>

            <div class="details-grid">
                <div class="detail-item">
                    <span class="detail-label">Complaint Category</span>
                    <span class="detail-val">${target.category}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Assigned Department</span>
                    <span class="detail-val" style="color:var(--brand-gold);"><i class="fa-solid fa-building-user"></i> ${target.assignedDept}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Campus Location</span>
                    <span class="detail-val">${target.building} (${target.room})</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Submitted By</span>
                    <span class="detail-val">${target.userName} (${target.dept})</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Submission Date & Time</span>
                    <span class="detail-val">${target.submissionTime}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Estimated SLA Turnaround</span>
                    <span class="detail-val">${target.estimatedSLA}</span>
                </div>
            </div>

            <div class="detail-item" style="margin-bottom:20px;">
                <span class="detail-label">Detailed Description</span>
                <p style="font-size:14px; color:#FFF; margin-top:4px;">${escapeHtml(target.description)}</p>
                ${target.photo ? `<div style="margin-top:12px;"><img src="${target.photo}" style="max-width:240px; border-radius:8px; border:1px solid var(--card-border);"></div>` : ''}
            </div>

            <!-- Status Timeline -->
            <h4 style="margin:20px 0 10px 0; font-size:15px; color:var(--text-muted);"><i class="fa-solid fa-route"></i> Live Resolution Workflow Timeline</h4>
            <div class="timeline">
                ${statuses.map((st, idx) => {
                    let stepClass = "";
                    if (idx < activeIdx) stepClass = "completed";
                    if (idx === activeIdx) stepClass = "active";
                    
                    let icon = idx < activeIdx ? '<i class="fa-solid fa-check"></i>' : (idx + 1);
                    return `
                        <div class="step ${stepClass}">
                            <div class="step-icon">${icon}</div>
                            <div class="step-label">${st}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// --- 7. DEPARTMENT ADMIN VIEW LOGIC ---
function renderAdminTickets() {
    const deptFilter = document.getElementById("adminDeptFilter").value;
    const statusFilter = document.getElementById("adminStatusFilter").value;

    const tickets = getStoredTickets();
    const tbody = document.getElementById("adminTableBody");
    tbody.innerHTML = "";

    const filtered = tickets.filter(t => {
        const matchesDept = (deptFilter === "ALL" || t.assignedDept === deptFilter);
        const matchesStatus = (statusFilter === "ALL" || t.status === statusFilter);
        return matchesDept && matchesStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">No complaints match the selected filter criteria.</td></tr>`;
        return;
    }

    const statuses = ["Pending", "Under Review", "Assigned", "In Progress", "Resolved", "Closed"];

    filtered.forEach(ticket => {
        const tr = document.createElement("tr");

        let priorityBadge = `priority-low`;
        if (ticket.urgency === 'High') priorityBadge = `priority-high`;
        if (ticket.urgency === 'Medium') priorityBadge = `priority-medium`;

        let statusBadgeClass = `status-${ticket.status.toLowerCase().replace(/\s+/g, '-')}`;

        tr.innerHTML = `
            <td><strong>${ticket.id}</strong></td>
            <td>${ticket.category}</td>
            <td>${ticket.building}<br><small style="color:var(--text-dim);">${ticket.room}</small></td>
            <td>${escapeHtml(ticket.userName)}<br><small style="color:var(--text-dim);">${ticket.dept}</small></td>
            <td><span class="badge-official">${ticket.assignedDept}</span></td>
            <td><span class="badge-priority ${priorityBadge}">${ticket.urgency}</span></td>
            <td>
                <span class="badge-status ${statusBadgeClass}">${ticket.status}</span>
            </td>
            <td>
                <select class="action-select" onchange="updateTicketStatus('${ticket.id}', this.value)">
                    ${statuses.map(st => `<option value="${st}" ${st === ticket.status ? 'selected' : ''}>Change: ${st}</option>`).join('')}
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Utility: HTML Escaping for security
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}

// --- INIT ON LOAD ---
document.addEventListener("DOMContentLoaded", () => {
    getStoredTickets();
    populateCategorySelect();
    initChat();

    // Default datetime input
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById("formDateTime").value = now.toISOString().slice(0, 16);
});
