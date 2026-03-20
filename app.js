/**
 * Abbey College Malvern Library Catalogue
 * Logic for fetching, parsing, and searching the library stock.
 */

const CSV_FILE = 'libstock.csv';
let itemsPerPage = 24;

let libraryData = [];
let filteredResults = [];
let currentPage = 1;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const sortOrder = document.getElementById('sortOrder');
const resultsGrid = document.getElementById('resultsGrid');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const statusMessage = document.getElementById('statusMessage');
const resultsCount = document.getElementById('resultsCount');

// Dewey Explorer Elements
const deweyActiveSelect = document.getElementById('deweyActive');
const deweyBreadcrumbNav = document.getElementById('deweyBreadcrumb');
const resetDeweyBtn = document.getElementById('resetDewey');

let deweyData = [];
let currentDeweyPath = []; // Array of {id, name}
let deweyMap = new Map();

function buildDeweyMap(nodes) {
    if (!nodes) return;
    nodes.forEach(node => {
        deweyMap.set(node.number, node.name);
        if (node.children) buildDeweyMap(node.children);
    });
}

/**
 * Initialize the catalogue
 */
async function init() {
    try {
        updateStatus('Fetching latest catalogue data...', false);

        // Fetch Dewey data asynchronously so it doesn't block CSV rendering
        fetch('mds.json')
            .then(res => res.json())
            .then(data => {
                deweyData = data;
                buildDeweyMap(deweyData);
                renderDeweyExplorer(); // Populate dropdown when loaded
                renderResults(); // Re-render results to display category names
            })
            .catch(err => console.error('Error fetching Dewey data:', err));

        Papa.parse(CSV_FILE, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                if (results.data && results.data.length > 0) {
                    libraryData = results.data.map(item => {
                        return {
                            code: item.code,
                            deweyNum: getDeweyNumber(item.code),
                            title: item.title,
                            author: item.author,
                            subject: item.subject,
                            publisher: item.publisher,
                            'publication Date': item['publication Date'] || item.pub_date,
                            notes: item.notes || ''
                        };
                    });
                    filteredResults = [...libraryData];

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
 * Render the Dewey Explorer UI
 */
function renderDeweyExplorer() {
    // 1. Render Breadcrumbs
    deweyBreadcrumbNav.innerHTML = '';

    // Add "Root" as first breadcrumb
    const rootBtn = document.createElement('span');
    rootBtn.className = 'breadcrumb-item';
    rootBtn.textContent = 'All Categories';
    rootBtn.onclick = () => navigateDeweyPath(-1);
    deweyBreadcrumbNav.appendChild(rootBtn);

    currentDeweyPath.forEach((step, index) => {
        const sep = document.createElement('span');
        sep.className = 'breadcrumb-sep';
        sep.textContent = '>';
        deweyBreadcrumbNav.appendChild(sep);

        const btn = document.createElement('span');
        btn.className = 'breadcrumb-item';
        btn.textContent = step.name;
        btn.onclick = () => navigateDeweyPath(index);
        deweyBreadcrumbNav.appendChild(btn);
    });

    // 2. Resolve target object for dropdown
    let currentOptions = deweyData;
    currentDeweyPath.forEach(step => {
        if (currentOptions) {
            const match = currentOptions.find(opt => opt.number === step.id);
            if (match && match.children) {
                currentOptions = match.children;
            } else {
                currentOptions = null;
            }
        }
    });

    // 3. Populate Active Select
    deweyActiveSelect.innerHTML = '<option value="">Select a sub-category...</option>';

    if (currentOptions && currentOptions.length > 0) {
        deweyActiveSelect.disabled = false;
        const sortedOptions = [...currentOptions].sort((a, b) => a.number.localeCompare(b.number));
        sortedOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.number;
            option.textContent = `${opt.number} - ${opt.name}`;
            deweyActiveSelect.appendChild(option);
        });
    } else {
        deweyActiveSelect.disabled = true;
        const opt = deweyActiveSelect.querySelector('option');
        if (!deweyData || deweyData.length === 0) {
            opt.textContent = 'Loading categories...';
        } else {
            opt.textContent = 'Final category reached';
        }
    }
}

/**
 * Navigate to a specific level in the breadcrumb
 */
function navigateDeweyPath(index) {
    currentDeweyPath = currentDeweyPath.slice(0, index + 1);
    renderDeweyExplorer();
    applyFilters();
}

/**
 * Dewey Selection Event
 */
deweyActiveSelect.addEventListener('change', () => {
    const val = deweyActiveSelect.value;
    if (!val) return;

    // Find the name of the selected category
    let currentOptions = deweyData;
    currentDeweyPath.forEach(step => {
        const match = currentOptions.find(opt => opt.number === step.id);
        if (match && match.children) currentOptions = match.children;
    });

    const selectedOpt = currentOptions.find(opt => opt.number === val);
    const selectedName = selectedOpt ? selectedOpt.name : 'Unknown';

    // Push to path
    currentDeweyPath.push({ id: val, name: selectedName });

    renderDeweyExplorer();
    applyFilters();
});

resetDeweyBtn.addEventListener('click', () => {
    currentDeweyPath = [];
    renderDeweyExplorer();
    applyFilters();
});

/**
 * Helper to get clean Dewey number from mixed strings
 */
function getDeweyNumber(code) {
    if (!code) return null;
    const match = code.toString().match(/(\d{3}(\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
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
    const publisher = book.publisher || '';
    const pubDate = book['publication Date'] || book.pub_date || '';
    const notes = book.notes || '';

    // Calculate the 3-digit Dewey Category Name
    let categoryName = 'Uncategorized';
    if (book.deweyNum !== null && deweyMap.size > 0) {
        const intPart = Math.floor(book.deweyNum);
        const deweyKey = intPart.toString().padStart(3, '0');
        if (deweyMap.has(deweyKey)) {
            categoryName = `${deweyKey} - ${deweyMap.get(deweyKey)}`;
        } else {
            const divKey = (Math.floor(intPart / 10) * 10).toString().padStart(3, '0');
            if (deweyMap.has(divKey)) {
                categoryName = `${divKey} - ${deweyMap.get(divKey)}`;
            } else {
                const classKey = (Math.floor(intPart / 100) * 100).toString().padStart(3, '0');
                categoryName = deweyMap.has(classKey) ? `${classKey} - ${deweyMap.get(classKey)}` : 'Unknown Category';
            }
        }
    } else if (book.deweyNum !== null) {
        categoryName = 'Loading...';
    }

    div.innerHTML = `
        ${code ? `<span class="book-shelf-code">${code}</span>` : ''}
        <h3 class="book-title">${title}</h3>
        <p class="book-author">by ${author}</p>
        <span class="book-subject-badge">${categoryName}</span>
        ${notes ? `<p class="book-notes"><strong>Notes:</strong> ${notes}</p>` : ''}
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
    const sort = sortOrder.value;

    filteredResults = libraryData.filter(item => {
        // Search Filter
        const matchesSearch = !query ||
            (item.title && item.title.toLowerCase().includes(query)) ||
            (item.author && item.author.toLowerCase().includes(query)) ||
            (item.code && item.code.toLowerCase().includes(query)) ||
            (item.notes && item.notes.toLowerCase().includes(query));

        // Dewey Decimal Filter
        let matchesDewey = true;
        if (currentDeweyPath.length > 0) {
            const codeNum = item.deweyNum;
            if (codeNum !== null) {
                const latestStep = currentDeweyPath[currentDeweyPath.length - 1];
                const min = parseFloat(latestStep.id);
                // Level 1 (Class) range 100, Level 2 (Div) range 10, Level 3 (Sec) range 1
                const level = currentDeweyPath.length - 1;
                const range = Math.pow(10, 2 - level);
                const max = min + range - 0.0001;

                matchesDewey = codeNum >= min && codeNum <= max;
            } else {
                matchesDewey = false;
            }
        }

        return matchesSearch && matchesDewey;
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
sortOrder.addEventListener('change', applyFilters);

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
