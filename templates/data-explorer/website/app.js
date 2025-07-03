let currentData = [];
let currentPage = 1;
let lastKey = null;
let categories = new Set();

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    // Set up query type change handler
    document.getElementById('queryType').addEventListener('change', (e) => {
        const categoryInput = document.getElementById('categoryInput');
        if (e.target.value === 'byCategory') {
            categoryInput.style.display = 'inline-block';
        } else {
            categoryInput.style.display = 'none';
        }
    });
});

// Load data from the API
async function loadData() {
    try {
        const response = await fetch(`${API_ENDPOINT}/data?limit=50${lastKey ? '&lastKey=' + lastKey : ''}`);
        const data = await response.json();
        
        currentData = data.items || [];
        updateTable();
        updateStats();
        
        // Update pagination
        document.getElementById('nextBtn').disabled = !data.lastKey;
        document.getElementById('pageInfo').textContent = `Page ${currentPage}`;
        
        if (data.lastKey) {
            lastKey = data.lastKey;
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load data');
    }
}

// Update the data table
function updateTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    if (currentData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No data found</td></tr>';
        return;
    }
    
    currentData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name || '-'}</td>
            <td>${item.category || '-'}</td>
            <td>${item.description || '-'}</td>
            <td>${formatDate(item.timestamp)}</td>
            <td class="action-buttons">
                <button class="edit-btn" onclick="editRecord('${item.id}')">Edit</button>
                <button class="delete-btn" onclick="deleteRecord('${item.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
        
        if (item.category) {
            categories.add(item.category);
        }
    });
}

// Update statistics
function updateStats() {
    document.getElementById('totalRecords').textContent = currentData.length;
    document.getElementById('totalCategories').textContent = categories.size;
    document.getElementById('lastUpdated').textContent = formatDate(Date.now());
}

// Format timestamp to readable date
function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(parseInt(timestamp));
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Execute query based on selected type
async function executeQuery() {
    const queryType = document.getElementById('queryType').value;
    const searchInput = document.getElementById('searchInput').value;
    const categoryInput = document.getElementById('categoryInput').value;
    
    try {
        let response;
        
        if (queryType === 'all') {
            await loadData();
            return;
        } else if (queryType === 'byCategory') {
            response = await fetch(`${API_ENDPOINT}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    queryType: 'byCategory',
                    parameters: {
                        category: categoryInput,
                        limit: 50
                    }
                })
            });
        } else if (queryType === 'search') {
            response = await fetch(`${API_ENDPOINT}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    queryType: 'search',
                    parameters: {
                        searchTerm: searchInput,
                        limit: 50
                    }
                })
            });
        }
        
        const data = await response.json();
        currentData = data.items || [];
        updateTable();
        updateStats();
    } catch (error) {
        console.error('Error executing query:', error);
        showError('Failed to execute query');
    }
}

// Search data
async function searchData() {
    document.getElementById('queryType').value = 'search';
    await executeQuery();
}

// Show add modal
function showAddModal() {
    document.getElementById('modalTitle').textContent = 'Add New Record';
    document.getElementById('recordForm').reset();
    document.getElementById('recordId').value = '';
    document.getElementById('modal').style.display = 'block';
}

// Show edit modal
async function editRecord(id) {
    const record = currentData.find(item => item.id === id);
    if (!record) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Record';
    document.getElementById('recordId').value = record.id;
    document.getElementById('recordName').value = record.name || '';
    document.getElementById('recordCategory').value = record.category || '';
    document.getElementById('recordDescription').value = record.description || '';
    
    // Extract additional data
    const { id: _, name: __, category: ___, description: ____, timestamp: _____, ...additionalData } = record;
    if (Object.keys(additionalData).length > 0) {
        document.getElementById('recordData').value = JSON.stringify(additionalData, null, 2);
    }
    
    document.getElementById('modal').style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// Save record (add or update)
async function saveRecord(event) {
    event.preventDefault();
    
    const id = document.getElementById('recordId').value;
    const name = document.getElementById('recordName').value;
    const category = document.getElementById('recordCategory').value;
    const description = document.getElementById('recordDescription').value;
    const additionalDataStr = document.getElementById('recordData').value;
    
    let record = {
        name,
        category,
        description
    };
    
    if (id) {
        record.id = id;
    }
    
    // Parse additional data if provided
    if (additionalDataStr) {
        try {
            const additionalData = JSON.parse(additionalDataStr);
            record = { ...record, ...additionalData };
        } catch (error) {
            showError('Invalid JSON in additional data field');
            return;
        }
    }
    
    try {
        const response = await fetch(`${API_ENDPOINT}/data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(record)
        });
        
        if (response.ok) {
            closeModal();
            await loadData();
            showSuccess(id ? 'Record updated successfully' : 'Record added successfully');
        } else {
            throw new Error('Failed to save record');
        }
    } catch (error) {
        console.error('Error saving record:', error);
        showError('Failed to save record');
    }
}

// Delete record
async function deleteRecord(id) {
    if (!confirm('Are you sure you want to delete this record?')) {
        return;
    }
    
    // Note: This is a placeholder - actual implementation would require
    // DELETE endpoint support in the Lambda function
    showError('Delete functionality not yet implemented');
}

// Pagination controls
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        lastKey = null; // Reset to reload from beginning
        loadData();
    }
}

function nextPage() {
    currentPage++;
    loadData();
}

// Show success message
function showSuccess(message) {
    alert(message); // In production, use a better notification system
}

// Show error message
function showError(message) {
    alert('Error: ' + message); // In production, use a better notification system
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        closeModal();
    }
}