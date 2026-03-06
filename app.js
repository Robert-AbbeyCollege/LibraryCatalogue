/**
 * Abbey College Malvern Library Catalogue
 * Logic for fetching, parsing, and searching the library stock.
 */

const CSV_FILE = 'libstock.csv';
let itemsPerPage = 50;

let libraryData = [];
let filteredResults = [];
let currentPage = 1;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const subjectFilter = document.getElementById('subjectFilter');
const sortOrder = document.getElementById('sortOrder');
const resultsGrid = document.getElementById('resultsGrid');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const statusMessage = document.getElementById('statusMessage');
const resultsCount = document.getElementById('resultsCount');
const pageSizeSelect = document.getElementById('pageSize');

/**
 * Initialize the catalogue
 */
async function init() {
    try {
        updateStatus('Fetching latest catalogue data...', false);

        Papa.parse(CSV_FILE, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                if (results.data && results.data.length > 0) {
                    libraryData = results.data;
                    filteredResults = [...libraryData];

                    populateSubjects();
                    renderResults();
                    updateStatus(`Successfully loaded ${libraryData.length} records.`, false);
                } else {
                    updateStatus('Error: No data found in CSV file.', true);
                }
            },
            error: function (err) {
                updateStatus('Error loading CSV file. Ensure you are running through a local server.', true);
                console.error('PapaParse error:', err);
            }
        });
    } catch (error) {
        updateStatus('An unexpected error occurred.', true);
        console.error('Init error:', error);
    }
}

/**
 * Populate Subject Filter dropdown
 */
function populateSubjects() {
    const subjects = new Set();

    libraryData.forEach(item => {
        if (item.subject) {
            // Take the first part of the subject (before /) for clean filtering
            const mainSubject = item.subject.split('/')[0].trim();
            if (mainSubject) subjects.add(mainSubject);
        }
    });

    const sortedSubjects = Array.from(subjects).sort();

    sortedSubjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject.charAt(0).toUpperCase() + subject.slice(1);
        subjectFilter.appendChild(option);
    });
}

/**
 * Update the status message bar
 */
function updateStatus(message, isError) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle('error', isError);
}

/**
 * Render results to the grid
 */
function renderResults(append = false) {
    if (!append) {
        resultsGrid.innerHTML = '';
        currentPage = 1;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = itemsPerPage === 'all' ? filteredResults.length : start + itemsPerPage;
    const currentBatch = filteredResults.slice(start, end);

    currentBatch.forEach((book, index) => {
        const card = createBookCard(book, index);
        resultsGrid.appendChild(card);
    });

    resultsCount.textContent = `Showing ${Math.min(end, filteredResults.length)} of ${filteredResults.length} books`;

    // Show/hide load more button
    if (end < filteredResults.length) {
        loadMoreBtn.classList.remove('hidden');
    } else {
        loadMoreBtn.classList.add('hidden');
    }
}

/**
 * Create a book card element
 */
function createBookCard(book, index) {
    const div = document.createElement('div');
    div.className = 'book-card animate-card';
    const staggerIndex = itemsPerPage === 'all' ? Math.min(index, 50) : index % itemsPerPage;
    div.style.animationDelay = `${staggerIndex * 0.05}s`;

    // Map CSV column names (case sensitive check)
    const title = book.title || 'Untitled';
    const author = book.author || 'Unknown Author';
    const code = book.code || '';
    const subject = book.subject || 'General';
    const publisher = book.publisher || '';
    const pubDate = book['publication Date'] || book.pub_date || '';

    div.innerHTML = `
        ${code ? `<span class="book-shelf-code">${code}</span>` : ''}
        <h3 class="book-title">${title}</h3>
        <p class="book-author">by ${author}</p>
        <span class="book-subject-badge">${subject.split('/')[0]}</span>
        <div class="book-meta">
            ${publisher ? `<span>${publisher}</span>` : ''}
            ${pubDate ? `<span> | ${pubDate}</span>` : ''}
        </div>
    `;

    return div;
}

/**
 * Handle Search and Filter logic
 */
function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    const subject = subjectFilter.value.toLowerCase();
    const sort = sortOrder.value;

    filteredResults = libraryData.filter(item => {
        const matchesSearch = !query ||
            (item.title && item.title.toLowerCase().includes(query)) ||
            (item.author && item.author.toLowerCase().includes(query)) ||
            (item.code && item.code.toLowerCase().includes(query));

        const matchesSubject = !subject ||
            (item.subject && item.subject.toLowerCase().includes(subject));

        return matchesSearch && matchesSubject;
    });

    // Apply Sorting
    if (sort === 'title-asc') {
        filteredResults.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sort === 'author-asc') {
        filteredResults.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    } else if (sort === 'dewey-asc') {
        filteredResults.sort((a, b) => {
            const deweyA = parseFloat((a.code || '0').toString().replace(/[^\d.]/g, '')) || 0;
            const deweyB = parseFloat((b.code || '0').toString().replace(/[^\d.]/g, '')) || 0;
            return deweyA - deweyB;
        });
    } else if (sort === 'date-desc') {
        filteredResults.sort((a, b) => (b['publication Date'] || 0) - (a['publication Date'] || 0));
    }

    renderResults();
}

/**
 * Event Listeners
 */
searchInput.addEventListener('input', debounce(applyFilters, 300));
subjectFilter.addEventListener('change', applyFilters);
sortOrder.addEventListener('change', applyFilters);

pageSizeSelect.addEventListener('change', () => {
    const val = pageSizeSelect.value;
    itemsPerPage = val === 'all' ? 'all' : parseInt(val);
    renderResults();
});

loadMoreBtn.addEventListener('click', () => {
    currentPage++;
    renderResults(true);
});

/**
 * Simple debounce function for search
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Start the app
init();
