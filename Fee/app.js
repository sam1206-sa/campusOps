/**
 * Campus Fee Reminder Agent Portal - Client JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    // API Server endpoint (defaults to local server.py bridge or current origin)
    const API_BASE = window.location.origin.includes('http') 
        ? window.location.origin 
        : 'http://127.0.0.1:8080';

    // State Variables
    let currentUserId = 'student_101';
    let cachedFees = [];

    // DOM Elements
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    // Student Search & Form Elements
    const studentSearchForm = document.getElementById('student-search-form');
    const studentNameInput = document.getElementById('student-name-input');
    const registerNoInput = document.getElementById('register-no-input');
    const presetButtons = document.querySelectorAll('.btn-preset');
    const activeStudentBadge = document.getElementById('active-student-badge');
    const bannerStudentName = document.getElementById('banner-student-name');
    const bannerStudentReg = document.getElementById('banner-student-reg');
    const bannerPendingAmount = document.getElementById('banner-pending-amount');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const chipButtons = document.querySelectorAll('.chip');

    // Dashboard Elements
    const feesTableBody = document.getElementById('fees-table-body');
    const statusFilter = document.getElementById('status-filter');
    const btnRefreshDb = document.getElementById('btn-refresh-db');
    const metricTotalDues = document.getElementById('metric-total-dues');
    const metricPendingCount = document.getElementById('metric-pending-count');
    const metricOverdueCount = document.getElementById('metric-overdue-count');
    const metricPaidCount = document.getElementById('metric-paid-count');

    // Notifier Elements
    const btnTriggerPoll = document.getElementById('btn-trigger-poll');
    const pollingDaysInput = document.getElementById('polling-days');
    const jsonRequestPreview = document.getElementById('json-request-preview');
    const notifierResultsContainer = document.getElementById('notifier-results-container');
    const flaggedCountBadge = document.getElementById('flagged-count-badge');

    // Modal Elements
    const addFeeModal = document.getElementById('add-fee-modal');
    const btnOpenAddModal = document.getElementById('btn-open-add-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const addFeeForm = document.getElementById('add-fee-form');

    // =========================================================================
    // 1. Navigation & Tab Switching
    // =========================================================================
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');

            navTabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const targetPane = document.getElementById(`tab-${targetTab}`);
            if (targetPane) targetPane.classList.add('active');

            if (targetTab === 'dashboard') {
                fetchDatabaseRecords();
            }
        });
    });

    // =========================================================================
    // 2. Preset Student Buttons & Form Handler
    // =========================================================================
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const sName = btn.getAttribute('data-name');
            const sReg = btn.getAttribute('data-reg');
            const sId = btn.getAttribute('data-id');

            studentNameInput.value = sName;
            registerNoInput.value = sReg;
            currentUserId = sId;

            performStudentSearch(`Fetch complete fee statement for ${sName} (${sReg})`);
        });
    });

    studentSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const sName = studentNameInput.value.trim();
        const sReg = registerNoInput.value.trim();
        performStudentSearch(`Check fee statement for ${sName} (${sReg})`);
    });

    chipButtons.forEach(chip => {
        chip.addEventListener('click', () => {
            const queryText = chip.getAttribute('data-query');
            chatInput.value = queryText;
            performStudentSearch(queryText);
        });
    });

    // =========================================================================
    // 3. Interactive Student Search & Query Handler
    // =========================================================================
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;
        chatInput.value = '';
        performStudentSearch(text);
    });

    async function performStudentSearch(customQueryText = '') {
        const studentName = studentNameInput.value.trim() || 'Alex Johnson';
        const registerNo = registerNoInput.value.trim() || '7376241CS101';
        const queryText = customQueryText || `Check fee details for ${studentName} (${registerNo})`;

        // Append User Question to Stream
        appendChatMessage('user', queryText, `${studentName} (${registerNo})`);

        // Show typing indicator
        const typingId = appendTypingIndicator();

        try {
            const response = await fetch(`${API_BASE}/api/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_name: studentName,
                    register_no: registerNo,
                    user_id: currentUserId,
                    text: queryText
                })
            });

            removeTypingIndicator(typingId);

            if (!response.ok) {
                throw new Error(`Server returned HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Update Right Side Output Statement Banner
            if (data.summary) {
                const sum = data.summary;
                bannerStudentName.textContent = sum.student_name || studentName;
                bannerStudentReg.innerHTML = `<i class="fa-solid fa-hashtag"></i> Register No: <strong>${sum.register_no || registerNo}</strong> &bull; ID: <code>${sum.user_id || currentUserId}</code>`;
                bannerPendingAmount.textContent = `$${(sum.total_pending || 0).toFixed(2)}`;
                activeStudentBadge.textContent = `${sum.student_name || studentName} | ${sum.register_no || registerNo}`;
            }

            appendChatMessage('agent', data.text, 'Fee Reminder Agent', data.success);

            // Auto refresh DB dashboard
            fetchDatabaseRecords();

        } catch (err) {
            removeTypingIndicator(typingId);
            console.warn('API connection offline, using client fallback demo handler:', err);
            
            setTimeout(() => {
                const fallbackReply = generateFallbackReply(currentUserId, queryText, studentName, registerNo);
                
                // Update banner fallback
                bannerStudentName.textContent = studentName;
                bannerStudentReg.innerHTML = `<i class="fa-solid fa-hashtag"></i> Register No: <strong>${registerNo}</strong> &bull; ID: <code>${currentUserId}</code>`;
                activeStudentBadge.textContent = `${studentName} | ${registerNo}`;
                
                appendChatMessage('agent', fallbackReply.text, 'Fee Reminder Agent (Local Demo)');
            }, 500);
        }
    }

    function appendChatMessage(senderType, messageText, label = '', isSuccess = true) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${senderType === 'user' ? 'user-msg' : 'agent-msg'}`;

        const avatarIcon = senderType === 'user' ? 'fa-user-graduate' : 'fa-robot';
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        msgDiv.innerHTML = `
            <div class="msg-avatar"><i class="fa-solid ${avatarIcon}"></i></div>
            <div class="msg-content">
                ${senderType === 'user' ? `<strong>${label}</strong><br>` : ''}
                <p>${escapeHtml(messageText)}</p>
                <span class="msg-time">${timeStr}</span>
            </div>
        `;

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function appendTypingIndicator() {
        const id = 'typing-' + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message agent-msg';
        typingDiv.id = id;
        typingDiv.innerHTML = `
            <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="msg-content">
                <p><i class="fa-solid fa-ellipsis fa-bounce"></i> Agent processing query...</p>
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return id;
    }

    function removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // =========================================================================
    // 4. Database Records Dashboard & Metrics
    // =========================================================================
    async function fetchDatabaseRecords() {
        try {
            const response = await fetch(`${API_BASE}/api/fees`);
            if (!response.ok) throw new Error('API fetch failed');
            
            const data = await response.json();
            cachedFees = data.fees || [];
            renderTable(cachedFees);
            updateMetrics(cachedFees);
        } catch (err) {
            console.warn('API error, loading default sample database state:', err);
            // Fallback sample data for offline static demo
            if (cachedFees.length === 0) {
                const today = new Date().toISOString().split('T')[0];
                cachedFees = [
                    { id: 1, user_id: 'student_101', fee_type: 'tuition', amount: 1500.00, due_date: getOffsetDate(-10), status: 'overdue' },
                    { id: 2, user_id: 'student_101', fee_type: 'library_fine', amount: 15.50, due_date: getOffsetDate(3), status: 'pending' },
                    { id: 3, user_id: 'student_102', fee_type: 'hostel', amount: 800.00, due_date: getOffsetDate(5), status: 'pending' },
                    { id: 4, user_id: 'student_102', fee_type: 'exam', amount: 120.00, due_date: getOffsetDate(-10), status: 'paid' },
                    { id: 5, user_id: 'student_103', fee_type: 'tuition', amount: 1500.00, due_date: getOffsetDate(25), status: 'pending' },
                    { id: 6, user_id: 'student_103', fee_type: 'hostel', amount: 850.00, due_date: getOffsetDate(-10), status: 'overdue' }
                ];
            }
            renderTable(cachedFees);
            updateMetrics(cachedFees);
        }
    }

    function renderTable(fees) {
        const filterVal = statusFilter.value;
        const filteredFees = fees.filter(f => filterVal === 'all' || f.status === filterVal);

        if (filteredFees.length === 0) {
            feesTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted" style="padding: 24px;">
                        No fee records match the selected filter.
                    </td>
                </tr>
            `;
            return;
        }

        feesTableBody.innerHTML = filteredFees.map(f => {
            const statusClass = f.status === 'paid' ? 'badge-paid' : (f.status === 'overdue' ? 'badge-overdue' : 'badge-pending');
            const feeTitle = f.fee_type.replace('_', ' ').toUpperCase();
            return `
                <tr>
                    <td><code>#${f.id}</code></td>
                    <td><strong>${escapeHtml(f.user_id)}</strong></td>
                    <td>${feeTitle}</td>
                    <td>$${Number(f.amount).toFixed(2)}</td>
                    <td><code>${f.due_date}</code></td>
                    <td><span class="badge ${statusClass}">${f.status}</span></td>
                    <td>
                        ${f.status !== 'paid' ? `
                            <button class="btn btn-success btn-sm btn-pay" data-id="${f.id}">
                                <i class="fa-solid fa-check"></i> Mark Paid
                            </button>
                        ` : `
                            <span class="text-muted"><i class="fa-solid fa-lock"></i> Settled</span>
                        `}
                    </td>
                </tr>
            `;
        }).join('');

        // Attach action handlers for Mark Paid buttons
        document.querySelectorAll('.btn-pay').forEach(btn => {
            btn.addEventListener('click', async () => {
                const feeId = btn.getAttribute('data-id');
                await markFeeAsPaid(feeId);
            });
        });
    }

    function updateMetrics(fees) {
        let totalDues = 0;
        let pendingCount = 0;
        let overdueCount = 0;
        let paidCount = 0;

        fees.forEach(f => {
            if (f.status === 'pending') {
                pendingCount++;
                totalDues += Number(f.amount);
            } else if (f.status === 'overdue') {
                overdueCount++;
                totalDues += Number(f.amount);
            } else if (f.status === 'paid') {
                paidCount++;
            }
        });

        metricTotalDues.textContent = `$${totalDues.toFixed(2)}`;
        metricPendingCount.textContent = pendingCount;
        metricOverdueCount.textContent = overdueCount;
        metricPaidCount.textContent = paidCount;
    }

    statusFilter.addEventListener('change', () => renderTable(cachedFees));
    btnRefreshDb.addEventListener('click', () => {
        fetchDatabaseRecords();
        showToast('Database records refreshed successfully.');
    });

    async function markFeeAsPaid(id) {
        try {
            const res = await fetch(`${API_BASE}/api/fees/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: Number(id) })
            });

            if (res.ok) {
                showToast(`Fee #${id} marked as PAID.`, 'success');
                fetchDatabaseRecords();
                return;
            }
        } catch (err) {
            console.warn('API error during pay, updating local cache:', err);
        }

        // Local fallback update
        const target = cachedFees.find(f => f.id == id);
        if (target) {
            target.status = 'paid';
            renderTable(cachedFees);
            updateMetrics(cachedFees);
            showToast(`Fee #${id} marked as PAID (Local Mode).`, 'success');
        }
    }

    // =========================================================================
    // 5. Notifier Agent Polling Simulation
    // =========================================================================
    pollingDaysInput.addEventListener('input', () => {
        const days = pollingDaysInput.value || 7;
        jsonRequestPreview.textContent = JSON.stringify({ requester: "notifier_agent", horizon_days: Number(days) }, null, 2);
    });

    btnTriggerPoll.addEventListener('click', async () => {
        const days = Number(pollingDaysInput.value) || 7;
        btnTriggerPoll.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Polling Agent...';

        try {
            const response = await fetch(`${API_BASE}/api/due-fees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requester: "notifier_agent", days_ahead: days })
            });

            const data = await response.json();
            renderNotifierResults(data.dues || []);
            showToast(`Notifier polled ${data.dues ? data.dues.length : 0} due fees from agent.`, 'success');
        } catch (err) {
            console.warn('API error on polling, calculating local due soon fees:', err);
            // Local fallback filter
            const cutoff = getOffsetDate(days);
            const dueSoon = cachedFees.filter(f => f.status !== 'paid' && f.due_date <= cutoff);
            renderNotifierResults(dueSoon);
            showToast(`Notifier polled ${dueSoon.length} due fees (Local Mode).`, 'success');
        } finally {
            btnTriggerPoll.innerHTML = '<i class="fa-solid fa-bell"></i> Send `DueFeesRequest`';
        }
    });

    function renderNotifierResults(dues) {
        flaggedCountBadge.textContent = `${dues.length} Flagged Dues`;

        if (dues.length === 0) {
            notifierResultsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-circle-check" style="color: var(--color-success);"></i>
                    <p>No fees are overdue or due within the selected horizon!</p>
                </div>
            `;
            return;
        }

        notifierResultsContainer.innerHTML = dues.map(d => {
            const isOverdue = d.status === 'overdue';
            const feeTitle = d.fee_type.replace('_', ' ').toUpperCase();
            return `
                <div class="due-item-card ${isOverdue ? 'overdue' : ''}">
                    <div class="due-item-info">
                        <h4><strong>${escapeHtml(d.user_id)}</strong> - ${feeTitle} ($${Number(d.amount).toFixed(2)})</h4>
                        <p>Due Date: <code>${d.due_date}</code> | Status: <strong style="color: ${isOverdue ? 'var(--color-danger)' : 'var(--color-warning)'}">${d.status.toUpperCase()}</strong></p>
                    </div>
                    <div>
                        <span class="badge ${isOverdue ? 'badge-overdue' : 'badge-pending'}">
                            ${isOverdue ? 'OVERDUE' : 'DUE SOON'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // =========================================================================
    // 6. Modal & Toast Helpers
    // =========================================================================
    btnOpenAddModal.addEventListener('click', () => addFeeModal.classList.add('active'));
    btnCloseModal.addEventListener('click', () => addFeeModal.classList.remove('active'));
    btnCancelModal.addEventListener('click', () => addFeeModal.classList.remove('active'));

    addFeeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newRecord = {
            user_id: document.getElementById('new-student-id').value.trim(),
            fee_type: document.getElementById('new-fee-type').value,
            amount: parseFloat(document.getElementById('new-amount').value),
            due_date: document.getElementById('new-due-date').value,
            status: document.getElementById('new-status').value
        };

        try {
            const res = await fetch(`${API_BASE}/api/fees/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRecord)
            });

            if (res.ok) {
                showToast('New fee record created successfully.', 'success');
                addFeeModal.classList.remove('active');
                addFeeForm.reset();
                fetchDatabaseRecords();
                return;
            }
        } catch (err) {
            console.warn('API error during add, saving locally:', err);
        }

        // Local fallback insertion
        newRecord.id = cachedFees.length + 1;
        cachedFees.push(newRecord);
        renderTable(cachedFees);
        updateMetrics(cachedFees);
        addFeeModal.classList.remove('active');
        addFeeForm.reset();
        showToast('New fee record added (Local Mode).', 'success');
    });

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${escapeHtml(message)}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getOffsetDate(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    }

    function generateFallbackReply(userId, text, studentName = 'Alex Johnson', registerNo = '7376241CS101') {
        const clean = text.toLowerCase();
        let targetId = userId;
        const match = clean.match(/student[_\s]?(\d+)/) || clean.match(/\b(10[1-9])\b/);
        if (match) {
            targetId = `student_${match[1]}`;
        }

        let name = studentName;
        let reg = registerNo;

        if (targetId === 'student_102') {
            name = studentName !== 'Alex Johnson' ? studentName : 'Sarah Miller';
            reg = registerNo !== '7376241CS101' ? registerNo : '7376241CS102';
            return {
                text: `Fee Summary & Statement for Student: ${name} | Reg No: ${reg} (${targetId})\n- Total Pending Balance: $800.00\n\nDetailed Fee Breakdown:\n  - Exam Fee: $120.00 | Due: ${getOffsetDate(-10)} | Status: [PAID]\n  - Hostel Fee: $800.00 | Due: ${getOffsetDate(5)} | Status: [PENDING]`,
                success: true
            };
        } else if (targetId === 'student_103') {
            name = studentName !== 'Alex Johnson' ? studentName : 'David Kumar';
            reg = registerNo !== '7376241CS101' ? registerNo : '7376241CS103';
            return {
                text: `Fee Summary & Statement for Student: ${name} | Reg No: ${reg} (${targetId})\n- Total Pending Balance: $2,350.00\n\nDetailed Fee Breakdown:\n  - Hostel Fee: $850.00 | Due: ${getOffsetDate(-10)} | Status: [OVERDUE]\n  - Tuition Fee: $1,500.00 | Due: ${getOffsetDate(25)} | Status: [PENDING]`,
                success: true
            };
        } else {
            return {
                text: `Fee Summary & Statement for Student: ${name} | Reg No: ${reg} (${targetId})\n- Total Pending Balance: $1,515.50\n\nDetailed Fee Breakdown:\n  - Tuition Fee: $1,500.00 | Due: ${getOffsetDate(-10)} | Status: [OVERDUE]\n  - Library Fine: $15.50 | Due: ${getOffsetDate(3)} | Status: [PENDING]`,
                success: true
            };
        }
    }

    // Initial Load
    fetchDatabaseRecords();
});
