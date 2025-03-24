// ABC BI Module - Beautiful Report ABC per Employee
// A simplified, impressive interface showcasing the next possibilities in BI

// Import the Feathers client
import client from '../modules/feathersjs-client.js';

// Global variables
let employeeData = {};
let currentEmployee = null;
let charts = {};
let expandedSections = new Set();

// Initialize the dashboard
function initDashboard() {
  // Set up the current date for the report header
  setupReportDate();
  
  // Add event listeners
  document.getElementById('employeeSelector').addEventListener('change', handleEmployeeChange);
  document.getElementById('periodSelector').addEventListener('change', fetchAndDisplayData);
  document.getElementById('yearSelector').addEventListener('change', fetchAndDisplayData);
  
  // Set up expandable sections
  setupExpandableSections();
  
  // Initial data load
  fetchAndDisplayData();
}

// Set up the current date display for the report header
function setupReportDate() {
  const today = new Date();
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  };
  const formattedDate = today.toLocaleDateString('ro-RO', options);
  
  const dateElement = document.getElementById('reportDate');
  if (dateElement) {
    dateElement.textContent = formattedDate;
  }
  
  // Set default values for selectors
  document.getElementById('yearSelector').value = today.getFullYear();
  document.getElementById('periodSelector').value = today.getMonth() + 1;
}

// Set up expandable sections for the hierarchical report
function setupExpandableSections() {
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.closest('.report-section');
      const content = section.querySelector('.section-content');
      const icon = header.querySelector('.toggle-icon');
      
      if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        content.style.maxHeight = '0';
        icon.textContent = '+';
        expandedSections.delete(section.id);
      } else {
        content.classList.add('expanded');
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.textContent = '-';
        expandedSections.add(section.id);
      }
    });
  });
}

// Fetch data from the API and update visualizations
async function fetchAndDisplayData() {
  // Show loading state
  showLoadingState();
  
  // Get filter values
  const year = document.getElementById('yearSelector').value;
  const period = document.getElementById('periodSelector').value;
  
  try {
    // Use Feathers client to fetch data
    const result = await client.service('abcHelper').getEmployeesReport({
      fiscprd: year,
      period: period
    });
    
    if (result.success) {
      processEmployeeData(result.data);
      populateEmployeeSelector();
      
      // If no employee is selected yet, select the first one
      if (!currentEmployee && Object.keys(employeeData).length > 0) {
        currentEmployee = Object.keys(employeeData)[0];
        document.getElementById('employeeSelector').value = currentEmployee;
      }
      
      updateDashboard();
    } else {
      showErrorMessage(result.message || 'Failed to load ABC report data');
    }
  } catch (error) {
    console.error('Error fetching ABC report data:', error);
    showErrorMessage('Error loading data: ' + error.message);
  } finally {
    hideLoadingState();
  }
}

// Process the fetched data and organize it by employee
function processEmployeeData(data) {
  employeeData = {};
  
  data.forEach(item => {
    const employeeId = item.codAngajat;
    const employeeName = item.numeAngajat || 'Unknown';
    const transactionType = item.tipTranzactie || 'Other';
    const tprms = item.tprms || 0;
    const mainCategory = item.numeCategoriePrincipala || 'Uncategorized';
    const mainCategoryId = item.categoriePrincipala || '0';
    const subCategory = item.numeSubcategorie || 'General';
    const subCategoryId = item.subcategorie || '0'; 
    const specificElement = item.numeElementSpecific || 'General';
    const specificElementId = item.elementSpecific || '0';
    const cost = item.sumaCost || 0;
    const abcClass = item.clasificareABC || 'C';
    
    // Create employee entry if it doesn't exist
    if (!employeeData[employeeId]) {
      employeeData[employeeId] = {
        id: employeeId,
        name: employeeName,
        totalRevenue: 0,
        totalExpenses: 0,
        totalOther: 0,
        transactions: {
          revenues: {
            tprms: 1000,
            total: 0,
            categories: {},
            items: []
          },
          expenses: {
            tprms: 1002,
            total: 0,
            categories: {},
            items: []
          },
          other: {
            tprms: -1,
            total: 0,
            categories: {},
            items: []
          }
        },
        abcDistribution: {
          A: 0,
          B: 0,
          C: 0
        }
      };
    }
    
    // Determine transaction category
    let transactionCategory;
    if (tprms === 1000 || transactionType.toLowerCase() === 'venituri') {
      transactionCategory = 'revenues';
    } else if (tprms === 1002 || transactionType.toLowerCase() === 'cheltuieli') {
      transactionCategory = 'expenses';
    } else {
      transactionCategory = 'other';
    }
    
    // Update transaction data
    const transactions = employeeData[employeeId].transactions[transactionCategory];
    
    // Add to total
    transactions.total += cost;
    
    // Update main category totals
    if (!transactions.categories[mainCategoryId]) {
      transactions.categories[mainCategoryId] = {
        id: mainCategoryId,
        name: mainCategory,
        total: 0,
        subcategories: {}
      };
    }
    transactions.categories[mainCategoryId].total += cost;
    
    // Update subcategory totals
    if (!transactions.categories[mainCategoryId].subcategories[subCategoryId]) {
      transactions.categories[mainCategoryId].subcategories[subCategoryId] = {
        id: subCategoryId,
        name: subCategory,
        total: 0,
        specificElements: {}
      };
    }
    transactions.categories[mainCategoryId].subcategories[subCategoryId].total += cost;
    
    // Update specific element totals (third level)
    if (!transactions.categories[mainCategoryId].subcategories[subCategoryId].specificElements[specificElementId]) {
      transactions.categories[mainCategoryId].subcategories[subCategoryId].specificElements[specificElementId] = {
        id: specificElementId,
        name: specificElement,
        total: 0
      };
    }
    transactions.categories[mainCategoryId].subcategories[subCategoryId].specificElements[specificElementId].total += cost;
    
    // Add item details
    transactions.items.push({
      tprms: tprms,
      transactionType: transactionType,
      categoryId: mainCategoryId,
      category: mainCategory,
      subcategoryId: subCategoryId,
      subcategory: subCategory,
      specificElementId: specificElementId,
      specificElement: specificElement,
      cost: cost,
      abcClass: abcClass
    });
    
    // Update ABC classification totals
    employeeData[employeeId].abcDistribution[abcClass] += cost;
    
    // Update employee totals
    if (transactionCategory === 'revenues') {
      employeeData[employeeId].totalRevenue += cost;
    } else if (transactionCategory === 'expenses') {
      employeeData[employeeId].totalExpenses += cost;
    } else {
      employeeData[employeeId].totalOther += cost;
    }
  });
}

// Populate the employee selector dropdown
function populateEmployeeSelector() {
  const select = document.getElementById('employeeSelector');
  if (!select) return;
  
  // Save current selection
  const currentSelection = select.value;
  
  // Clear existing options
  select.innerHTML = '';
  
  // Sort employees by total (revenue + expenses)
  const sortedEmployees = Object.values(employeeData)
    .sort((a, b) => (b.totalRevenue + b.totalExpenses) - (a.totalRevenue + a.totalExpenses));
  
  // Add options for each employee
  sortedEmployees.forEach(employee => {
    const option = document.createElement('option');
    option.value = employee.id;
    option.textContent = `${employee.name} (${employee.id})`;
    select.appendChild(option);
  });
  
  // Restore selection if possible
  if (currentSelection && select.querySelector(`option[value="${currentSelection}"]`)) {
    select.value = currentSelection;
  } else if (sortedEmployees.length > 0) {
    select.value = sortedEmployees[0].id;
  }
}

// Handle employee change in the selector
function handleEmployeeChange(event) {
  currentEmployee = event.target.value;
  updateDashboard();
}

// Update all dashboard elements with new data
function updateDashboard() {
  if (!currentEmployee || !employeeData[currentEmployee]) {
    showErrorMessage('No employee data available');
    return;
  }

  const employee = employeeData[currentEmployee];
  
  // Update employee info header
  updateEmployeeInfo(employee);
  
  // Update KPIs and Summary
  updateKPIs(employee);
  
  // Update charts
  updateOverviewCharts(employee);
  
  // Update revenues section
  updateRevenuesSection(employee);
  
  // Update expenses section
  updateExpensesSection(employee);
  
  // Restore expanded sections
  restoreExpandedSections();
}

// Update employee info in the header
function updateEmployeeInfo(employee) {
  document.getElementById('employeeName').textContent = employee.name;
  document.getElementById('employeeId').textContent = employee.id;
  
  // Update total summary
  const total = employee.totalRevenue + employee.totalExpenses + employee.totalOther;
  document.getElementById('employeeTotal').textContent = formatCurrency(total);
}

// Calculate and update KPI metrics
function updateKPIs(employee) {
  // Revenue KPI
  document.getElementById('kpiRevenue').textContent = formatCurrency(employee.totalRevenue);
  
  // Expenses KPI
  document.getElementById('kpiExpenses').textContent = formatCurrency(employee.totalExpenses);
  
  // Balance KPI (Revenue - Expenses)
  const balance = employee.totalRevenue - employee.totalExpenses;
  const balanceElement = document.getElementById('kpiBalance');
  balanceElement.textContent = formatCurrency(balance);
  
  // Add color class based on balance
  balanceElement.className = 'kpi-value';
  if (balance > 0) {
    balanceElement.classList.add('positive');
  } else if (balance < 0) {
    balanceElement.classList.add('negative');
  }
  
  // ABC Distribution KPI
  const totalABC = employee.abcDistribution.A + employee.abcDistribution.B + employee.abcDistribution.C;
  
  // Calculate percentages
  const aPercentage = totalABC > 0 ? (employee.abcDistribution.A / totalABC * 100).toFixed(1) : '0.0';
  const bPercentage = totalABC > 0 ? (employee.abcDistribution.B / totalABC * 100).toFixed(1) : '0.0';
  const cPercentage = totalABC > 0 ? (employee.abcDistribution.C / totalABC * 100).toFixed(1) : '0.0';
  
  // Update ABC distribution
  document.getElementById('abcDistributionA').textContent = `${aPercentage}%`;
  document.getElementById('abcDistributionB').textContent = `${bPercentage}%`;
  document.getElementById('abcDistributionC').textContent = `${cPercentage}%`;
  
  // Update ABC distribution progress bars
  document.getElementById('abcProgressA').style.width = `${aPercentage}%`;
  document.getElementById('abcProgressB').style.width = `${bPercentage}%`;
  document.getElementById('abcProgressC').style.width = `${cPercentage}%`;
}

// Update overview charts
function updateOverviewCharts(employee) {
  // Clear previous charts to prevent memory leaks
  Object.keys(charts).forEach(key => {
    if (charts[key]) {
      charts[key].destroy();
      delete charts[key];
    }
  });
  
  updateRevenueExpenseChart(employee);
  updateABCDistributionChart(employee);
}

// Create/update the revenue vs expenses chart
function updateRevenueExpenseChart(employee) {
  const ctx = document.getElementById('revenueExpenseChart').getContext('2d');
  
  charts.revenueExpense = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Venituri', 'Cheltuieli', 'Sold'],
      datasets: [{
        data: [
          employee.totalRevenue, 
          employee.totalExpenses, 
          employee.totalRevenue - employee.totalExpenses
        ],
        backgroundColor: [
          'rgba(46, 204, 113, 0.8)',
          'rgba(231, 76, 60, 0.8)',
          (employee.totalRevenue - employee.totalExpenses) >= 0 ? 
            'rgba(52, 152, 219, 0.8)' : 'rgba(243, 156, 18, 0.8)'
        ],
        borderColor: [
          'rgba(46, 204, 113, 1)',
          'rgba(231, 76, 60, 1)',
          (employee.totalRevenue - employee.totalExpenses) >= 0 ? 
            'rgba(52, 152, 219, 1)' : 'rgba(243, 156, 18, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value, true);
            }
          }
        }
      }
    }
  });
}

// Create/update the ABC distribution pie chart
function updateABCDistributionChart(employee) {
  const ctx = document.getElementById('abcDistributionChart').getContext('2d');
  
  charts.abcDistribution = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['A', 'B', 'C'],
      datasets: [{
        data: [
          employee.abcDistribution.A,
          employee.abcDistribution.B,
          employee.abcDistribution.C
        ],
        backgroundColor: [
          'rgba(231, 76, 60, 0.8)',
          'rgba(243, 156, 18, 0.8)',
          'rgba(46, 204, 113, 0.8)'
        ],
        borderColor: [
          'rgba(231, 76, 60, 1)',
          'rgba(243, 156, 18, 1)',
          'rgba(46, 204, 113, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (value / total * 100).toFixed(1) : '0.0';
              return `Class ${label}: ${formatCurrency(value)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Update the revenues section with hierarchical data
function updateRevenuesSection(employee) {
  const revenueSectionContent = document.getElementById('revenueSectionContent');
  if (!revenueSectionContent) return;
  
  // Update total revenue in section header
  document.getElementById('totalRevenue').textContent = formatCurrency(employee.totalRevenue);
  
  // Clear existing content
  revenueSectionContent.innerHTML = '';
  
  // Get revenue data
  const revenues = employee.transactions.revenues;
  
  // Sort categories by total
  const sortedCategories = Object.entries(revenues.categories)
    .sort((a, b) => b[1].total - a[1].total);
  
  // Create chart for revenue categories
  const chartContainer = document.createElement('div');
  chartContainer.className = 'chart-container';
  chartContainer.style.height = '300px';
  chartContainer.style.marginBottom = '20px';
  
  const canvas = document.createElement('canvas');
  canvas.id = 'revenueCategoriesChart';
  chartContainer.appendChild(canvas);
  revenueSectionContent.appendChild(chartContainer);
  
  // Add category breakdown
  if (sortedCategories.length > 0) {
    const categoriesContainer = document.createElement('div');
    categoriesContainer.className = 'categories-container';
    
    sortedCategories.forEach(([categoryName, categoryData], index) => {
      const categorySection = createCategorySection(
        'revenue', 
        index, 
        categoryName, 
        categoryData, 
        employee.totalRevenue
      );
      categoriesContainer.appendChild(categorySection);
    });
    
    revenueSectionContent.appendChild(categoriesContainer);
    
    // Initialize the revenue categories chart
    updateRevenueCategoriesChart(sortedCategories);
  } else {
    const noDataMsg = document.createElement('p');
    noDataMsg.className = 'no-data-message';
    noDataMsg.textContent = 'No revenue data available for this period';
    revenueSectionContent.appendChild(noDataMsg);
  }
}

// Update the expenses section with hierarchical data
function updateExpensesSection(employee) {
  const expensesSectionContent = document.getElementById('expensesSectionContent');
  if (!expensesSectionContent) return;
  
  // Update total expenses in section header
  document.getElementById('totalExpenses').textContent = formatCurrency(employee.totalExpenses);
  
  // Clear existing content
  expensesSectionContent.innerHTML = '';
  
  // Get expenses data
  const expenses = employee.transactions.expenses;
  
  // Sort categories by total
  const sortedCategories = Object.entries(expenses.categories)
    .sort((a, b) => b[1].total - a[1].total);
  
  // Create chart for expenses categories
  const chartContainer = document.createElement('div');
  chartContainer.className = 'chart-container';
  chartContainer.style.height = '300px';
  chartContainer.style.marginBottom = '20px';
  
  const canvas = document.createElement('canvas');
  canvas.id = 'expenseCategoriesChart';
  chartContainer.appendChild(canvas);
  expensesSectionContent.appendChild(chartContainer);
  
  // Add category breakdown
  if (sortedCategories.length > 0) {
    const categoriesContainer = document.createElement('div');
    categoriesContainer.className = 'categories-container';
    
    sortedCategories.forEach(([categoryName, categoryData], index) => {
      const categorySection = createCategorySection(
        'expense', 
        index, 
        categoryName, 
        categoryData, 
        employee.totalExpenses
      );
      categoriesContainer.appendChild(categorySection);
    });
    
    expensesSectionContent.appendChild(categoriesContainer);
    
    // Initialize the expense categories chart
    updateExpenseCategoriesChart(sortedCategories);
  } else {
    const noDataMsg = document.createElement('p');
    noDataMsg.className = 'no-data-message';
    noDataMsg.textContent = 'No expense data available for this period';
    expensesSectionContent.appendChild(noDataMsg);
  }
}

// Create a category section with subcategories
function createCategorySection(type, index, categoryId, categoryData, totalAmount) {
  const section = document.createElement('div');
  section.className = 'category-section';
  section.id = `${type}-category-${index}`;
  
  // Calculate percentage of total
  const percentage = (categoryData.total / totalAmount * 100).toFixed(1);
  
  // Create header (Level 1 - Main Category)
  const header = document.createElement('div');
  header.className = 'category-header level-1-header';
  header.innerHTML = `
    <div class="category-toggle">
      <span class="toggle-icon">+</span>
    </div>
    <div class="category-name">${categoryData.name}</div>
    <div class="category-amount">${formatCurrency(categoryData.total)}</div>
    <div class="category-percentage">${percentage}%</div>
    <div class="category-progress">
      <div class="progress-bar" style="width: ${percentage}%"></div>
    </div>
  `;
  
  // Create content container for subcategories
  const content = document.createElement('div');
  content.className = 'subcategories-container';
  content.style.display = 'none';
  
  // Sort subcategories by amount
  const sortedSubcategories = Object.entries(categoryData.subcategories)
    .sort((a, b) => b[1].total - a[1].total);
  
  // Add subcategories
  sortedSubcategories.forEach(([subCategoryId, subCategoryData], subIndex) => {
    const subCategoryPercentage = (subCategoryData.total / categoryData.total * 100).toFixed(1);
    
    // Create subcategory container (Level 2)
    const subCategoryContainer = document.createElement('div');
    subCategoryContainer.className = 'subcategory-container';
    subCategoryContainer.id = `${type}-subcategory-${index}-${subIndex}`;
    
    // Create subcategory header
    const subCategoryHeader = document.createElement('div');
    subCategoryHeader.className = 'subcategory-header level-2-header';
    subCategoryHeader.innerHTML = `
      <div class="subcategory-toggle">
        <span class="toggle-icon">+</span>
      </div>
      <div class="subcategory-name">${subCategoryData.name}</div>
      <div class="subcategory-amount">${formatCurrency(subCategoryData.total)}</div>
      <div class="subcategory-percentage">${subCategoryPercentage}%</div>
      <div class="subcategory-progress">
        <div class="progress-bar" style="width: ${subCategoryPercentage}%"></div>
      </div>
    `;
    
    // Create container for specific elements
    const specificElementsContainer = document.createElement('div');
    specificElementsContainer.className = 'specific-elements-container';
    specificElementsContainer.style.display = 'none';
    
    // Sort specific elements by amount
    const sortedSpecificElements = Object.entries(subCategoryData.specificElements)
      .sort((a, b) => b[1].total - a[1].total);
    
    // Add specific elements (Level 3)
    sortedSpecificElements.forEach(([elementId, elementData], elemIndex) => {
      const elementPercentage = (elementData.total / subCategoryData.total * 100).toFixed(1);
      
      const specificElement = document.createElement('div');
      specificElement.className = 'specific-element-item level-3-item';
      specificElement.id = `${type}-element-${index}-${subIndex}-${elemIndex}`;
      specificElement.innerHTML = `
        <div class="element-name">${elementData.name}</div>
        <div class="element-amount">${formatCurrency(elementData.total)}</div>
        <div class="element-percentage">${elementPercentage}%</div>
        <div class="element-progress">
          <div class="progress-bar" style="width: ${elementPercentage}%"></div>
        </div>
      `;
      
      specificElementsContainer.appendChild(specificElement);
    });
    
    // Add toggle functionality for subcategory
    subCategoryHeader.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering parent click events
      
      const isVisible = specificElementsContainer.style.display !== 'none';
      specificElementsContainer.style.display = isVisible ? 'none' : 'block';
      subCategoryHeader.querySelector('.toggle-icon').textContent = isVisible ? '+' : '-';
      
      // Track expanded state for this subcategory
      const id = subCategoryContainer.id;
      if (isVisible) {
        expandedSections.delete(id);
      } else {
        expandedSections.add(id);
      }
    });
    
    // Append all elements to the subcategory container
    subCategoryContainer.appendChild(subCategoryHeader);
    subCategoryContainer.appendChild(specificElementsContainer);
    
    // Add the subcategory container to the main content
    content.appendChild(subCategoryContainer);
  });
  
  // Add toggle functionality for main category
  header.addEventListener('click', () => {
    const isVisible = content.style.display !== 'none';
    content.style.display = isVisible ? 'none' : 'block';
    header.querySelector('.toggle-icon').textContent = isVisible ? '+' : '-';
    
    // Track expanded state for this category
    const id = section.id;
    if (isVisible) {
      expandedSections.delete(id);
    } else {
      expandedSections.add(id);
    }
  });
  
  section.appendChild(header);
  section.appendChild(content);
  
  return section;
}

// Create/update the revenue categories chart
function updateRevenueCategoriesChart(sortedCategories) {
  const ctx = document.getElementById('revenueCategoriesChart').getContext('2d');
  
  const labels = sortedCategories.map(([name]) => name);
  const values = sortedCategories.map(([_, data]) => data.total);
  
  // Generate gradient colors for the chart
  const gradients = values.map((_, index) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    const hue = 120 + (index * 30) % 360; // Green-based hues
    gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.8)`);
    gradient.addColorStop(1, `hsla(${hue}, 70%, 40%, 0.8)`);
    return gradient;
  });
  
  charts.revenueCategories = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Venituri pe categorii',
        data: values,
        backgroundColor: gradients,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = (value / total * 100).toFixed(1);
              return `${formatCurrency(value)} (${percentage}%)`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value, true);
            }
          }
        }
      }
    }
  });
}

// Create/update the expense categories chart
function updateExpenseCategoriesChart(sortedCategories) {
  const ctx = document.getElementById('expenseCategoriesChart').getContext('2d');
  
  const labels = sortedCategories.map(([name]) => name);
  const values = sortedCategories.map(([_, data]) => data.total);
  
  // Generate gradient colors for the chart
  const gradients = values.map((_, index) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    const hue = 0 + (index * 30) % 360; // Red-based hues
    gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.8)`);
    gradient.addColorStop(1, `hsla(${hue}, 70%, 40%, 0.8)`);
    return gradient;
  });
  
  charts.expenseCategories = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Cheltuieli pe categorii',
        data: values,
        backgroundColor: gradients,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = (value / total * 100).toFixed(1);
              return `${formatCurrency(value)} (${percentage}%)`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value, true);
            }
          }
        }
      }
    }
  });
}

// Restore expanded sections after data update
function restoreExpandedSections() {
  expandedSections.forEach(sectionId => {
    const section = document.getElementById(sectionId);
    if (section) {
      const content = section.querySelector('.section-content');
      const icon = section.querySelector('.toggle-icon');
      
      if (content && icon) {
        content.classList.add('expanded');
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.textContent = '-';
      }
    }
  });
}

// Helper function to format currency
function formatCurrency(value, shortFormat = false) {
  if (shortFormat && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value);
  }
  
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Show loading state
function showLoadingState() {
  document.body.classList.add('is-loading');
  
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
  }
}

// Hide loading state
function hideLoadingState() {
  document.body.classList.remove('is-loading');
  
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
}

// Show error message
function showErrorMessage(message) {
  console.warn('Error message:', message);
  
  const notification = document.getElementById('notification');
  if (notification) {
    const notificationMessage = document.getElementById('notificationMessage');
    if (notificationMessage) {
      notificationMessage.textContent = message;
      notification.style.display = 'block';
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        notification.style.display = 'none';
      }, 5000);
    }
  } else {
    // Fallback to alert
    alert(message);
  }
}

// Export functions for external use
window.abcBI = {
  initDashboard,
  fetchAndDisplayData
};
