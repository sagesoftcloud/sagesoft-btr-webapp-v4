// Global variables
let currentUser = {};
let currentViewRegion = '';

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeDashboard();
});

function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    
    if (!isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load user data
    currentUser = {
        email: sessionStorage.getItem('userEmail'),
        role: sessionStorage.getItem('userRole'),
        region: sessionStorage.getItem('userRegion'),
        name: sessionStorage.getItem('userName')
    };
    
    setupUserInterface();
}

function setupUserInterface() {
    // Display user info
    document.getElementById('userName').textContent = currentUser.name;
    
    // Set user badge
    const badge = document.getElementById('userBadge');
    if (currentUser.role === 'super-admin') {
        badge.textContent = '👑 Super Admin';
        badge.className = 'px-2 py-1 bg-ph-yellow text-ph-blue rounded text-xs font-semibold';
        setupSuperAdminUI();
    } else {
        badge.textContent = `📍 ${currentUser.region}`;
        badge.className = 'px-2 py-1 bg-ph-red text-ph-white rounded text-xs font-semibold';
        setupRegionalAdminUI();
    }
}

function setupSuperAdminUI() {
    // Show region filter
    document.getElementById('regionFilter').classList.remove('hidden');
    document.getElementById('uploadRegionSelect').classList.remove('hidden');
    
    // Set current view region to ALL
    currentViewRegion = 'ALL';
    document.getElementById('currentRegion').textContent = 'Viewing: ALL REGIONS';
    document.getElementById('statsRegion').textContent = 'ALL';
    
    // Setup region filter change handler
    document.getElementById('regionSelect').addEventListener('change', function(e) {
        currentViewRegion = e.target.value;
        document.getElementById('currentRegion').textContent = `Viewing: ${currentViewRegion}`;
        document.getElementById('statsRegion').textContent = currentViewRegion;
        updateDocumentList();
        updateStats();
    });
}

function setupRegionalAdminUI() {
    // Hide region filter and upload region select
    document.getElementById('regionFilter').classList.add('hidden');
    document.getElementById('uploadRegionSelect').classList.add('hidden');
    
    // Set current view region to user's region
    currentViewRegion = currentUser.region;
    document.getElementById('statsRegion').textContent = currentUser.region;
}

function signOut() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}

function initializeDashboard() {
    updateStats();
    setupFileUpload();
    setupChat();
    setupSearch();
    updateDocumentList();
}

// File Upload
function setupFileUpload() {
    document.getElementById('fileInput').addEventListener('change', function(event) {
        const files = event.target.files;
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        Array.from(files).forEach(file => {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'flex justify-between items-center p-3 bg-gray-100 rounded';
            
            // Determine upload region
            let uploadRegion = currentUser.region;
            if (currentUser.role === 'super-admin') {
                uploadRegion = document.getElementById('uploadRegion').value;
            }
            
            fileDiv.innerHTML = `
                <div>
                    <span class="text-sm font-medium">${file.name}</span>
                    <p class="text-xs text-gray-500">Upload to: ${uploadRegion}</p>
                </div>
                <button onclick="uploadFile('${file.name}', '${uploadRegion}')" class="bg-ph-blue text-white px-3 py-1 rounded text-sm hover:bg-blue-800">Upload</button>
            `;
            fileList.appendChild(fileDiv);
        });
    });
}

function uploadFile(fileName, region) {
    // Simulate upload with region context
    setTimeout(() => {
        alert(`File "${fileName}" uploaded successfully to ${region}!`);
        updateStats();
        updateDocumentList();
    }, 1000);
}

function updateDocumentList() {
    // Mock documents by region
    const mockDocuments = {
        'NCR': [
            { name: 'NCR Budget 2025.pdf', size: '2.1 MB', date: '2025-01-15' },
            { name: 'NCR Financial Report.xlsx', size: '1.8 MB', date: '2025-01-10' }
        ],
        'REGION-1': [
            { name: 'Region 1 Allocation.pdf', size: '1.5 MB', date: '2025-01-12' },
            { name: 'Region 1 Audit.docx', size: '900 KB', date: '2025-01-08' }
        ],
        'REGION-2': [
            { name: 'Region 2 Budget.pdf', size: '1.9 MB', date: '2025-01-14' },
            { name: 'Region 2 Summary.xlsx', size: '1.2 MB', date: '2025-01-09' }
        ]
    };
    
    // Update search results based on current view region
    console.log(`Document list updated for region: ${currentViewRegion}`);
}

// Chat
function setupChat() {
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Add welcome message based on user role
    setTimeout(() => {
        let welcomeMsg = '';
        if (currentUser.role === 'super-admin') {
            welcomeMsg = `Welcome ${currentUser.name}! I can help you analyze documents across all regions. I have access to cross-regional data and can provide comparative insights.`;
        } else {
            welcomeMsg = `Welcome ${currentUser.name}! I can help you with ${currentUser.region} treasury operations and document analysis.`;
        }
        addMessageToChat('assistant', welcomeMsg);
    }, 1000);
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;

    addMessageToChat('user', message);
    input.value = '';
    
    // Simulate AI response with regional context
    setTimeout(() => {
        let response = '';
        if (currentUser.role === 'super-admin') {
            response = `As your AI assistant with cross-regional access, I can analyze data from ${currentViewRegion === 'ALL' ? 'all regions' : currentViewRegion}. How can I help with your treasury analysis?`;
        } else {
            response = `I'm analyzing your ${currentUser.region} treasury data. Based on your regional context, I can help with budget analysis, document insights, and treasury operations specific to ${currentUser.region}.`;
        }
        addMessageToChat('assistant', response);
    }, 1500);
}

function addMessageToChat(role, message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `mb-3 ${role === 'user' ? 'text-right' : 'text-left'}`;
    
    const bgColor = role === 'user' ? 'bg-ph-blue text-white' : 'bg-gray-200 text-gray-800';
    messageDiv.innerHTML = `
        <div class="inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${bgColor}">
            ${message}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Search functionality
function setupSearch() {
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    // Mock search results based on current region access
    const mockResults = {
        'NCR': [
            { name: 'NCR Budget Report 2025.pdf', type: 'PDF', size: '2.3 MB', date: '2025-01-15', region: 'NCR' },
            { name: 'NCR Treasury Guidelines.docx', type: 'Document', size: '1.1 MB', date: '2025-01-10', region: 'NCR' }
        ],
        'REGION-1': [
            { name: 'Region 1 Financial Statement.xlsx', type: 'Spreadsheet', size: '856 KB', date: '2025-01-08', region: 'REGION-1' },
            { name: 'Region 1 Audit Report.pdf', type: 'PDF', size: '3.2 MB', date: '2024-12-20', region: 'REGION-1' }
        ],
        'ALL': [
            { name: 'NCR Budget Report 2025.pdf', type: 'PDF', size: '2.3 MB', date: '2025-01-15', region: 'NCR' },
            { name: 'Region 1 Financial Statement.xlsx', type: 'Spreadsheet', size: '856 KB', date: '2025-01-08', region: 'REGION-1' },
            { name: 'Region 2 Treasury Report.pdf', type: 'PDF', size: '1.9 MB', date: '2025-01-12', region: 'REGION-2' }
        ]
    };

    // Get results based on user access
    let searchResults = [];
    if (currentUser.role === 'super-admin') {
        searchResults = mockResults[currentViewRegion] || [];
    } else {
        searchResults = mockResults[currentUser.region] || [];
    }

    // Filter results based on query
    const filteredResults = searchResults.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase())
    );

    displaySearchResults(filteredResults, query);
}

function displaySearchResults(results, query) {
    const searchResults = document.getElementById('searchResults');
    const resultsList = document.getElementById('resultsList');
    
    if (results.length === 0) {
        resultsList.innerHTML = `<p class="text-gray-500">No results found for "${query}" in accessible regions</p>`;
    } else {
        resultsList.innerHTML = results.map(item => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded border">
                <div>
                    <h4 class="font-medium text-gray-800">${item.name}</h4>
                    <p class="text-sm text-gray-600">${item.type} • ${item.size} • ${item.date} • ${item.region}</p>
                </div>
                <div class="flex space-x-2">
                    <button onclick="viewDocument('${item.name}')" class="bg-ph-blue text-white px-3 py-1 rounded text-sm hover:bg-blue-800">View</button>
                    <button onclick="downloadDocument('${item.name}')" class="bg-ph-red text-white px-3 py-1 rounded text-sm hover:bg-red-700">Download</button>
                </div>
            </div>
        `).join('');
    }
    
    searchResults.classList.remove('hidden');
}

function viewDocument(fileName) {
    alert(`Opening document: ${fileName} (View Only)`);
}

function downloadDocument(fileName) {
    alert(`Downloading: ${fileName}`);
}

function updateStats() {
    // Update stats based on current region view
    const baseCount = currentViewRegion === 'ALL' ? 250 : 50;
    const baseStorage = currentViewRegion === 'ALL' ? 5000 : 1000;
    const baseQueries = currentViewRegion === 'ALL' ? 150 : 30;
    
    document.getElementById('docCount').textContent = baseCount + Math.floor(Math.random() * 50);
    document.getElementById('storageUsed').textContent = (baseStorage + Math.floor(Math.random() * 500)) + ' MB';
    document.getElementById('aiQueries').textContent = baseQueries + Math.floor(Math.random() * 20);
}
