import client from '../modules/feathersjs-client.js';

// Pagination settings
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let filteredEmployees = [];
let allEmployees = [];
let allPersons = [];

// Initialize the ABC module
document.addEventListener('DOMContentLoaded', () => {
  // Tab switching functionality
  const tabs = document.querySelectorAll('#abcTabs li');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('is-active'));
      
      // Add active class to clicked tab
      tab.classList.add('is-active');
      
      // Hide all tab contents
      tabContents.forEach(content => {
        content.style.display = 'none';
      });
      
      // Show the corresponding tab content
      const tabId = tab.dataset.tab;
      document.getElementById(`${tabId}Tab`).style.display = 'block';
    });
  });
  
  // Load data when ABC section becomes visible
  const abcAppCard = document.getElementById('abcAppCard');
  if (abcAppCard) {
    abcAppCard.addEventListener('click', initializeABC);
  }
  
  // Set up event listeners
  document.getElementById('refreshEmployees').addEventListener('click', loadEmployees);
  document.getElementById('employeeForm').addEventListener('submit', handleEmployeeSubmit);
  document.getElementById('employeeSearch').addEventListener('input', handleEmployeeSearch);
  
  // Close notification when clicking X
  const deleteButtons = document.querySelectorAll('.notification .delete');
  deleteButtons.forEach(button => {
    button.addEventListener('click', () => {
      button.parentNode.style.display = 'none';
    });
  });
});

// Initialize the ABC module data
async function initializeABC() {
  await Promise.all([
    loadPersons(),
    loadEmployees()
  ]);
}

// Load persons for dropdown
async function loadPersons() {
  try {
    const response = await client.service('abcHelper').getPersons({});

    console.log('getPersons response:', response);
    
    if (response.success) {
      allPersons = response.data || [];
      populatePersonsDropdown(allPersons);
    } else {
      showNotification('Error loading persons: ' + response.message, 'is-danger');
    }
  } catch (error) {
    console.error('Error loading persons:', error);
    showNotification('Error loading persons: ' + error.message, 'is-danger');
  }
}

// Populate persons dropdown
function populatePersonsDropdown(persons) {
  const select = document.getElementById('prsn');
  select.innerHTML = '<option value="">Select a person</option>';
  
  persons.forEach(person => {
    const option = document.createElement('option');
    option.value = person.prsn;
    option.textContent = `${person.name2} (${person.code})`;
    select.appendChild(option);
  });
}

// Load employees
async function loadEmployees() {
  try {
    // Show loading state
    document.getElementById('employeeTableBody').innerHTML = `
      <tr>
        <td colspan="5" class="has-text-centered">
          <span class="icon is-large">
            <i class="fas fa-spinner fa-pulse"></i>
          </span>
          <p>Loading employees...</p>
        </td>
      </tr>
    `;
    
    const response = await client.service('abcHelper').getEmployeesWithDetails({});
    
    if (response.success) {
      allEmployees = response.data || [];
      filteredEmployees = [...allEmployees];
      
      // Reset search and pagination
      document.getElementById('employeeSearch').value = '';
      currentPage = 1;
      
      renderEmployeeTable();
    } else {
      document.getElementById('employeeTableBody').innerHTML = `
        <tr>
          <td colspan="5" class="has-text-centered has-text-danger">
            <span class="icon">
              <i class="fas fa-exclamation-triangle"></i>
            </span>
            <p>${response.message || 'Error loading employees'}</p>
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('Error loading employees:', error);
    document.getElementById('employeeTableBody').innerHTML = `
      <tr>
        <td colspan="5" class="has-text-centered has-text-danger">
          <span class="icon">
            <i class="fas fa-exclamation-triangle"></i>
          </span>
          <p>Error: ${error.message}</p>
        </td>
      </tr>
    `;
  }
}

// Handle employee search
function handleEmployeeSearch(event) {
  const searchTerm = event.target.value.toLowerCase();
  
  if (searchTerm.trim() === '') {
    filteredEmployees = [...allEmployees];
  } else {
    filteredEmployees = allEmployees.filter(employee => 
      (employee.abccode && employee.abccode.toLowerCase().includes(searchTerm)) ||
      (employee.abcname && employee.abcname.toLowerCase().includes(searchTerm)) ||
      (employee.prsnname && employee.prsnname.toLowerCase().includes(searchTerm)) ||
      (employee.prsncode && employee.prsncode.toLowerCase().includes(searchTerm))
    );
  }
  
  currentPage = 1;
  renderEmployeeTable();
}

// Render employee table with pagination
function renderEmployeeTable() {
  const tableBody = document.getElementById('employeeTableBody');
  tableBody.innerHTML = '';
  
  if (filteredEmployees.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="has-text-centered">
          <p>No employees found</p>
        </td>
      </tr>
    `;
    document.getElementById('employeePagination').innerHTML = '';
    return;
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredEmployees.length);
  
  // Get current page of employees
  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);
  
  // Render table rows
  currentEmployees.forEach(employee => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${employee.abccode || '-'}</td>
      <td>${employee.abcname || '-'}</td>
      <td>${employee.prsnname || '-'} (${employee.prsncode || '-'})</td>
      <td>
        <span class="tag ${employee.abcisactive ? 'is-success' : 'is-danger'}">
          ${employee.abcisactive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>
        <div class="buttons are-small">
          <button class="button is-info edit-employee" data-abcst="${employee.abcst}">
            <span class="icon">
              <i class="fas fa-edit"></i>
            </span>
          </button>
          <button class="button ${employee.abcisactive ? 'is-warning' : 'is-success'} toggle-status" 
            data-abcst="${employee.abcst}" 
            data-status="${employee.abcisactive ? '0' : '1'}">
            <span class="icon">
              <i class="fas ${employee.abcisactive ? 'fa-pause' : 'fa-play'}"></i>
            </span>
          </button>
        </div>
      </td>
    `;
    
    // Add event listeners for the action buttons
    tableBody.appendChild(row);
  });
  
  // Add event listeners after adding rows
  document.querySelectorAll('.edit-employee').forEach(button => {
    button.addEventListener('click', () => editEmployee(button.dataset.abcst));
  });
  
  document.querySelectorAll('.toggle-status').forEach(button => {
    button.addEventListener('click', () => toggleEmployeeStatus(
      button.dataset.abcst, 
      button.dataset.status === '1'
    ));
  });
  
  // Render pagination
  renderPagination(totalPages);
}

// Render pagination controls
function renderPagination(totalPages) {
  const paginationElement = document.getElementById('employeePagination');
  
  if (totalPages <= 1) {
    paginationElement.innerHTML = '';
    return;
  }
  
  let paginationHTML = `
    <a class="pagination-previous" ${currentPage === 1 ? 'disabled' : ''}>Previous</a>
    <a class="pagination-next" ${currentPage === totalPages ? 'disabled' : ''}>Next</a>
    <ul class="pagination-list">
  `;
  
  // First page
  if (currentPage > 2) {
    paginationHTML += `
      <li><a class="pagination-link" data-page="1">1</a></li>
    `;
  }
  
  // Ellipsis if needed
  if (currentPage > 3) {
    paginationHTML += `<li><span class="pagination-ellipsis">&hellip;</span></li>`;
  }
  
  // Pages around current page
  for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
    paginationHTML += `
      <li><a class="pagination-link ${i === currentPage ? 'is-current' : ''}" data-page="${i}">${i}</a></li>
    `;
  }
  
  // Ellipsis if needed
  if (currentPage < totalPages - 2) {
    paginationHTML += `<li><span class="pagination-ellipsis">&hellip;</span></li>`;
  }
  
  // Last page
  if (currentPage < totalPages - 1) {
    paginationHTML += `
      <li><a class="pagination-link" data-page="${totalPages}">${totalPages}</a></li>
    `;
  }
  
  paginationHTML += `</ul>`;
  paginationElement.innerHTML = paginationHTML;
  
  // Add event listeners for pagination
  const previousButton = paginationElement.querySelector('.pagination-previous');
  if (!previousButton.hasAttribute('disabled')) {
    previousButton.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderEmployeeTable();
      }
    });
  }
  
  const nextButton = paginationElement.querySelector('.pagination-next');
  if (!nextButton.hasAttribute('disabled')) {
    nextButton.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderEmployeeTable();
      }
    });
  }
  
  const pageLinks = paginationElement.querySelectorAll('.pagination-link:not(.is-current)');
  pageLinks.forEach(link => {
    link.addEventListener('click', () => {
      currentPage = parseInt(link.dataset.page);
      renderEmployeeTable();
    });
  });
}

// Edit employee
function editEmployee(abcst) {
  const employee = allEmployees.find(emp => emp.abcst === parseInt(abcst));
  
  if (!employee) {
    showNotification('Employee not found', 'is-danger');
    return;
  }
  
  // Populate form with employee data
  document.getElementById('abcst').value = employee.abcst;
  document.getElementById('prsn').value = employee.cccidcontextual;
  document.getElementById('code').value = employee.abccode || '';
  document.getElementById('name').value = employee.abcname || '';
  document.getElementById('isactive').checked = employee.abcisactive;
  
  // Scroll to form
  document.getElementById('employeeForm').scrollIntoView({ behavior: 'smooth' });
}

// Toggle employee status
async function toggleEmployeeStatus(abcst, newStatus) {
  try {
    const employee = allEmployees.find(emp => emp.abcst === parseInt(abcst));
    
    if (!employee) {
      showNotification('Employee not found', 'is-danger');
      return;
    }
    
    const result = await client.service('abcHelper').saveEmployee({
      abcst: parseInt(abcst),
      prsn: employee.cccidcontextual,
      isactive: newStatus ? 1 : 0
    });
    
    if (result.success) {
      showNotification(`Employee status updated to ${newStatus ? 'active' : 'inactive'}`, 'is-success');
      // Refresh employees list
      await loadEmployees();
    } else {
      showNotification('Error updating employee status: ' + result.message, 'is-danger');
    }
  } catch (error) {
    console.error('Error toggling employee status:', error);
    showNotification('Error toggling employee status: ' + error.message, 'is-danger');
  }
}

// Handle employee form submission
async function handleEmployeeSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const abcst = form.abcst.value || null;
  const prsn = form.prsn.value;
  const code = form.code.value;
  const name = form.name.value;
  const isactive = form.isactive.checked ? 1 : 0;
  
  if (!prsn) {
    showNotification('Please select a person', 'is-warning');
    return;
  }
  
  try {
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `
      <span class="icon">
        <i class="fas fa-spinner fa-pulse"></i>
      </span>
      <span>Saving...</span>
    `;
    
    const employeeData = {
      prsn: parseInt(prsn),
      code: code,
      name: name,
      isactive: isactive
    };
    
    if (abcst) {
      employeeData.abcst = parseInt(abcst);
    }
    
    const result = await client.service('abcHelper').saveEmployee(employeeData);
    
    if (result.success) {
      showNotification('Employee saved successfully', 'is-success');
      form.reset();
      form.abcst.value = '';
      
      // Refresh employees list
      await loadEmployees();
    } else {
      showNotification('Error saving employee: ' + result.message, 'is-danger');
    }
    
    // Restore button state
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  } catch (error) {
    console.error('Error saving employee:', error);
    showNotification('Error saving employee: ' + error.message, 'is-danger');
    
    // Restore button state
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = false;
    submitButton.innerHTML = 'Save';
  }
}

// Show notification
function showNotification(message, type) {
  const notification = document.getElementById('notification');
  notification.className = 'notification ' + type;
  document.getElementById('notificationMessage').textContent = message;
  notification.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);
}

// Add this to the existing client.js or in modules/feathersjs-client.js
// Make sure the abcHelper service is properly registered in the client
export function registerAbcServices(client, socketClient) {
  client.use('abc', socketClient.service('abc'), {
    methods: ['getEmployees', 'setEmployee', 'getPrsnList']
  });
  
  client.use('abcHelper', socketClient.service('abcHelper'), {
    methods: ['getEmployeesWithDetails', 'saveEmployee', 'getPersons']
  });
}

// Initialize the module
export default {
  initializeABC,
  loadEmployees,
  loadPersons
};