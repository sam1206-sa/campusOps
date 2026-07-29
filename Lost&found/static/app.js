/* ==========================================================================
   Campus Lost & Found Operations - Client Application JS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // DOM Elements
    const reportForm = document.getElementById('report-form');
    const userIdInput = document.getElementById('user-id');
    const categorySelect = document.getElementById('category');
    const locationInput = document.getElementById('location');
    const textInput = document.getElementById('text-input');
    const btnSubmit = document.getElementById('btn-submit');

    const btnSeed = document.getElementById('btn-seed');
    const btnReset = document.getElementById('btn-reset');

    const searchInput = document.getElementById('search-input');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const itemsGrid = document.getElementById('items-grid');
    const emptyState = document.getElementById('empty-state');

    const statTotal = document.getElementById('stat-total');
    const statLost = document.getElementById('stat-lost');
    const statFound = document.getElementById('stat-found');
    const statMatched = document.getElementById('stat-matched');

    const toastBanner = document.getElementById('toast-banner');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');

    const matchModal = document.getElementById('match-modal');
    const closeModal = document.getElementById('close-modal');
    const modalAckBtn = document.getElementById('modal-ack-btn');

    // App State
    let allItems = [];
    let currentFilterTab = 'all';
    let searchQuery = '';

    // ==========================================================================
    // INITIALIZATION & EVENT LISTENERS
    // ==========================================================================

    fetchItemsAndStats();

    // Form Submission
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            user_id: userIdInput.value.trim(),
            text: textInput.value.trim(),
            location: locationInput.value.trim() || null,
            category: categorySelect.value
        };

        if (!payload.user_id || !payload.text) {
            showToast('Error', 'Please fill in both your Student ID and item description.', 'error');
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing & Classifying...';

        try {
            const res = await fetch('/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                showToast('Classification Error', data.detail || 'Could not process report.', 'error');
            } else {
                showToast('Report Saved', data.message, data.matches_found > 0 ? 'success' : 'info');
                textInput.value = '';
                locationInput.value = '';
                
                // If a match was found, pop up match modal!
                if (data.matches_found > 0 && data.matched_item) {
                    showMatchModal(payload, data.matched_item);
                }

                fetchItemsAndStats();
            }
        } catch (err) {
            showToast('Connection Error', 'Failed to reach server.', 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Process & Match Report';
        }
    });

    // Seed Sample Data
    btnSeed.addEventListener('click', async () => {
        btnSeed.disabled = true;
        btnSeed.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Seeding...';
        try {
            const res = await fetch('/api/seed', { method: 'POST' });
            const data = await res.json();
            showToast('Sample Data Loaded', data.message, 'success');
            fetchItemsAndStats();
        } catch (err) {
            showToast('Error', 'Could not seed database.', 'error');
        } finally {
            btnSeed.disabled = false;
            btnSeed.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Load Sample Data';
        }
    });

    // Reset Database
    btnReset.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to clear all records from the database?')) return;
        try {
            const res = await fetch('/api/reset', { method: 'POST' });
            const data = await res.json();
            showToast('Database Reset', data.message, 'info');
            fetchItemsAndStats();
        } catch (err) {
            showToast('Error', 'Could not reset database.', 'error');
        }
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderFilteredItems();
    });

    // Tab buttons
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilterTab = btn.getAttribute('data-tab');
            renderFilteredItems();
        });
    });

    // Modal controls
    closeModal.addEventListener('click', () => matchModal.classList.add('hidden'));
    modalAckBtn.addEventListener('click', () => matchModal.classList.add('hidden'));


    // ==========================================================================
    // DATA FETCHING & RENDERING
    // ==========================================================================

    async function fetchItemsAndStats() {
        try {
            const [itemsRes, statsRes] = await Promise.all([
                fetch('/api/items'),
                fetch('/api/stats')
            ]);

            allItems = await itemsRes.json();
            const stats = await statsRes.json();

            // Update stats indicators
            statTotal.textContent = stats.total;
            statLost.textContent = stats.lost;
            statFound.textContent = stats.found;
            statMatched.textContent = stats.matched;

            renderFilteredItems();
        } catch (err) {
            console.error('Error fetching data:', err);
        }
    }

    function renderFilteredItems() {
        itemsGrid.innerHTML = '';

        let filtered = allItems.filter(item => {
            // Tab filter logic
            if (currentFilterTab === 'lost' && item.status !== 'lost') return false;
            if (currentFilterTab === 'found' && item.status !== 'found') return false;
            if (currentFilterTab === 'matched' && !item.matched_id) return false;

            // Search query logic
            if (searchQuery) {
                const desc = (item.item_description || '').toLowerCase();
                const loc = (item.location || '').toLowerCase();
                const user = (item.user_id || '').toLowerCase();
                const cat = (item.category || '').toLowerCase();

                return desc.includes(searchQuery) || loc.includes(searchQuery) || user.includes(searchQuery) || cat.includes(searchQuery);
            }

            return true;
        });

        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            filtered.forEach(item => {
                const card = createItemCard(item);
                itemsGrid.appendChild(card);
            });
        }
    }

    function createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'item-card';

        const isLost = item.status === 'lost';
        const badgeClass = isLost ? 'badge-lost' : 'badge-found';
        const statusLabel = isLost ? 'LOST' : 'FOUND';

        const dateStr = item.date_reported ? new Date(item.date_reported).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recently';

        let matchBadgeHtml = '';
        if (item.matched_id) {
            matchBadgeHtml = `<span class="matched-badge"><i class="fa-solid fa-link"></i> Matched with #${item.matched_id}</span>`;
        }

        card.innerHTML = `
            <div>
                <div class="item-card-header">
                    <span class="status-badge ${badgeClass}">${statusLabel} #${item.id}</span>
                    ${matchBadgeHtml}
                </div>
                <p class="item-desc" style="margin-top: 10px;">${escapeHtml(item.item_description)}</p>
            </div>
            
            <div class="item-meta">
                <div class="meta-item"><i class="fa-solid fa-user"></i> ${escapeHtml(item.user_id)}</div>
                <div class="meta-item"><i class="fa-solid fa-tag"></i> ${escapeHtml(item.category || 'General')}</div>
                ${item.location ? `<div class="meta-item"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.location)}</div>` : ''}
                <div class="meta-item" style="margin-left: auto;"><i class="fa-regular fa-clock"></i> ${dateStr}</div>
            </div>
        `;

        return card;
    }

    function showMatchModal(yourPayload, matchedItem) {
        document.getElementById('modal-your-title').textContent = `${yourPayload.category} (${yourPayload.user_id})`;
        document.getElementById('modal-your-desc').textContent = yourPayload.text;
        document.getElementById('modal-your-user').textContent = `Location: ${yourPayload.location || 'Not specified'}`;

        document.getElementById('modal-match-title').textContent = `${matchedItem.category || 'Matched Item'} (#${matchedItem.id})`;
        document.getElementById('modal-match-desc').textContent = matchedItem.item_description;
        document.getElementById('modal-match-user').textContent = `Reported by: ${matchedItem.user_id} (${matchedItem.location || 'Campus'})`;

        matchModal.classList.remove('hidden');
    }

    function showToast(title, message, type = 'info') {
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        toastBanner.className = `toast-banner ${type}`;
        
        setTimeout(() => {
            toastBanner.classList.add('hidden');
        }, 5000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

});
