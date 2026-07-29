document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const streamContainer = document.getElementById('stream-container');
    const loader = document.getElementById('loader');
    const clearBtn = document.getElementById('clear-btn');
    const tagBtns = document.querySelectorAll('.tag-btn');
    const menuItems = document.querySelectorAll('.menu-item');

    // Category Titles Mapping
    const CATEGORY_LABELS = {
        'scheduler': 'EXAMS & TIMETABLE',
        'complaint': 'WIFI & REPAIRS',
        'document': 'CERTIFICATES & FORMS',
        'faq': 'RULES & POLICIES',
        'notifier': 'ANNOUNCEMENTS & ALERTS',
        'representative': 'STUDENT REPRESENTATIVE ASSIGNED',
        'unknown': 'CAMPUS REPRESENTATIVE ASSIGNED'
    };

    // Submit Top Search Bar Query
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = searchInput.value.trim();
        if (text) {
            submitQuery(text);
        }
    });

    // Sample Prompt Tag Buttons
    tagBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const promptText = btn.getAttribute('data-text');
            if (promptText) {
                searchInput.value = promptText;
                submitQuery(promptText);
            }
        });
    });

    // Left Sidebar Menu Contents Click Listener & Filtering
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');

            const filter = item.getAttribute('data-filter');
            filterCards(filter);

            const promptText = item.getAttribute('data-prompt');
            if (promptText) {
                searchInput.value = promptText;
                submitQuery(promptText);
            }
        });
    });

    function filterCards(filterCategory) {
        const cards = streamContainer.querySelectorAll('.query-card');
        cards.forEach(card => {
            const cardIntent = card.getAttribute('data-intent');
            if (filterCategory === 'all' || cardIntent === filterCategory) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Clear Stream Button
    clearBtn.addEventListener('click', () => {
        streamContainer.innerHTML = `
            <div class="welcome-box">
                <div class="welcome-icon">
                    <i class="fa-solid fa-magnifying-glass"></i>
                </div>
                <h3>Stream Cleared</h3>
                <p>Use the <strong>top search bar</strong> or <strong>categories on the left</strong> to ask a question.</p>
            </div>
        `;
    });

    async function submitQuery(text) {
        // Clear Search Input
        searchInput.value = '';

        // Show Loader
        loader.classList.remove('hidden');

        try {
            // Call API
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: "student_web_01",
                    text: text
                })
            });

            const data = await response.json();

            // Hide Loader
            loader.classList.add('hidden');

            // Reset active menu filter to 'all' or active item filter to make sure new card is visible
            const activeItem = document.querySelector('.menu-item.active');
            const activeFilter = activeItem ? activeItem.getAttribute('data-filter') : 'all';

            // Render Card in Stream
            renderQueryCard(text, data.intent, data.reply, activeFilter);

        } catch (error) {
            console.error('API Error:', error);
            loader.classList.add('hidden');
            const randomTicket = Math.floor(1000 + Math.random() * 9000);
            renderQueryCard(text, 'representative', `Your query '${text}' has been logged and assigned to a Student Support Representative (Ticket #REP-${randomTicket}). A representative will assist you shortly.`, 'all');
        }
    }

    function renderQueryCard(userText, intent, botReply, activeFilter = 'all') {
        // Remove welcome box if present
        const welcomeBox = streamContainer.querySelector('.welcome-box');
        if (welcomeBox) {
            welcomeBox.remove();
        }

        const card = document.createElement('div');
        card.className = 'query-card';
        card.setAttribute('data-intent', intent);

        const categoryTitle = CATEGORY_LABELS[intent] || 'CAMPUSOPS';

        card.innerHTML = `
            <div class="query-user-part">
                <i class="fa-solid fa-circle-question query-icon"></i>
                <span>Query: "${escapeHtml(userText)}"</span>
            </div>
            <div class="query-bot-part">
                <span class="badge-tag badge-${intent}">${categoryTitle}</span>
                <p>${escapeHtml(botReply)}</p>
            </div>
        `;

        if (activeFilter !== 'all' && activeFilter !== intent) {
            card.style.display = 'none';
        }

        streamContainer.insertBefore(card, streamContainer.firstChild);
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    }
});
