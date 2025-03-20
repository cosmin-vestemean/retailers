// ABC BI Module - Handles data fetching, processing, and visualization for the ABC BI dashboard

// Import the Feathers client
import client from '../modules/feathersjs-client.js';

// Global variables
let abcReportData = [];
let charts = {};

// Initialize the dashboard
function initDashboard() {
  // Set default values for selectors
  const currentDate = new Date();
  document.getElementById('fiscalYearSelector').value = currentDate.getFullYear();
  document.getElementById('periodSelector').value = currentDate.getMonth() + 1;
  
  // Add event listeners only if elements exist
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', fetchAndDisplayData);
  }
  
  const tableSearchInput = document.getElementById('tableSearchInput');
  if (tableSearchInput) {
    tableSearchInput.addEventListener('keyup', filterTable);
  }
  
  // Initial data load
  fetchAndDisplayData();
}

// Fetch data from the API and update all visualizations
async function fetchAndDisplayData() {
  // Show loading state
  showLoadingState();
  
  // Get filter values
  const fiscprd = document.getElementById('fiscalYearSelector').value;
  const period = document.getElementById('periodSelector').value;
  
  try {
    // Use Feathers client instead of fetch
    const result = await client.service('abcHelper').getEmployeesReport({
      fiscprd: fiscprd,
      period: period
    });
    
    if (result.success) {
      abcReportData = result.data;
      updateDashboard(abcReportData);
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

// Update all dashboard elements with new data
function updateDashboard(data) {
  if (!data || data.length === 0) {
    showErrorMessage('No data available for the selected period');
    return;
  }

  updateKPIs(data);
  updateCharts(data);
  updateTable(data);
}

// Calculate and update KPI metrics
function updateKPIs(data) {
  // Count unique employees
  const uniqueEmployees = [...new Set(data.map(item => item.codAngajat))];
  
  // Calculate total cost
  const totalCost = data.reduce((sum, item) => sum + item.sumaCost, 0);
  
  // Count A class items
  const aClassItems = data.filter(item => item.clasificareABC === 'A').length;
  const aClassPercentage = (aClassItems / data.length * 100).toFixed(1);
  
  // Average cost per employee
  const avgCost = totalCost / uniqueEmployees.length;
  
  // Update DOM
  document.getElementById('kpiTotalEmployees').textContent = uniqueEmployees.length;
  document.getElementById('kpiTotalCost').textContent = formatCurrency(totalCost);
  document.getElementById('kpiClassA').textContent = `${aClassPercentage}%`;
  document.getElementById('kpiAvgCost').textContent = formatCurrency(avgCost);
}

// Update all chart visualizations
function updateCharts(data) {
  updateABCDistributionChart(data);
  updateCategoriesChart(data);
  updateParetoChart(data);
  updateEmployeesChart(data);
}

// Create/update the ABC distribution pie chart
function updateABCDistributionChart(data) {
  // Group data by ABC classification
  const abcGroups = data.reduce((acc, item) => {
    if (!acc[item.clasificareABC]) {
      acc[item.clasificareABC] = 0;
    }
    acc[item.clasificareABC] += item.sumaCost;
    return acc;
  }, {});
  
  const labels = Object.keys(abcGroups);
  const values = Object.values(abcGroups);
  
  // Colors for different classes
  const colors = {
    'A': 'rgba(220, 53, 69, 0.8)',
    'B': 'rgba(255, 193, 7, 0.8)',
    'C': 'rgba(40, 167, 69, 0.8)'
  };
  
  const backgroundColor = labels.map(label => colors[label] || 'rgba(108, 117, 125, 0.8)');
  
  if (charts.abcDistribution) {
    charts.abcDistribution.data.labels = labels;
    charts.abcDistribution.data.datasets[0].data = values;
    charts.abcDistribution.data.datasets[0].backgroundColor = backgroundColor;
    charts.abcDistribution.update();
  } else {
    const ctx = document.getElementById('abcDistributionChart').getContext('2d');
    charts.abcDistribution = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: backgroundColor,
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
                const percentage = (value / total * 100).toFixed(1);
                return `Class ${label}: ${formatCurrency(value)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
}

// Create/update the categories horizontal bar chart
function updateCategoriesChart(data) {
  // Group data by main category
  const categories = data.reduce((acc, item) => {
    const category = item.numeCategoriePrincipala || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += item.sumaCost;
    return acc;
  }, {});
  
  // Sort categories by cost (descending)
  const sortedCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10); // Top 10 categories
  
  const labels = sortedCategories.map(item => item[0]);
  const values = sortedCategories.map(item => item[1]);
  
  if (charts.categories) {
    charts.categories.data.labels = labels;
    charts.categories.data.datasets[0].data = values;
    charts.categories.update();
  } else {
    const ctx = document.getElementById('categoriesChart').getContext('2d');
    charts.categories = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cost by Category',
          data: values,
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return formatCurrency(context.parsed.x);
              }
            }
          }
        },
        scales: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return formatCurrency(context.parsed.x);
              }
            }
          }
        },
        scales: {
          x: {
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
}

// Create/update the Pareto analysis chart (line + bar)
function updateParetoChart(data) {
  // Sort items by cost (descending)
  const sortedItems = [...data].sort((a, b) => b.sumaCost - a.sumaCost);
  
  const labels = sortedItems.slice(0, 20).map((item, index) => `Item ${index + 1}`);
  const values = sortedItems.slice(0, 20).map(item => item.sumaCost);
  const cumulativePercent = sortedItems.slice(0, 20).map(item => item.procentCumulativ);
  
  if (charts.pareto) {
    charts.pareto.data.labels = labels;
    charts.pareto.data.datasets[0].data = values;
    charts.pareto.data.datasets[1].data = cumulativePercent;
    charts.pareto.update();
  } else {
    const ctx = document.getElementById('paretoChart').getContext('2d');
    charts.pareto = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Cost',
            data: values,
            backgroundColor: 'rgba(54, 162, 235, 0.8)',
            order: 2
          },
          {
            label: 'Cumulative %',
            data: cumulativePercent,
            type: 'line',
            borderColor: 'rgba(220, 53, 69, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(220, 53, 69, 1)',
            fill: false,
            yAxisID: 'y1',
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Cost'
            },
            ticks: {
              callback: function(value) {
                return formatCurrency(value, true);
              }
            }
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            max: 100,
            title: {
              display: true,
              text: 'Cumulative %'
            },
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            },
            grid: {
              drawOnChartArea: false
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                if (label === 'Cost') {
                  return `${label}: ${formatCurrency(value)}`;
                } else {
                  return `${label}: ${value.toFixed(1)}%`;
                }
              }
            }
          }
        }
      }
    });
  }
}

// Create/update the employees horizontal bar chart
function updateEmployeesChart(data) {
  // Group data by employee
  const employees = data.reduce((acc, item) => {
    const employee = item.codAngajat || 'Unknown';
    if (!acc[employee]) {
      acc[employee] = 0;
    }
    acc[employee] += item.sumaCost;
    return acc;
  }, {});
  
  // Sort employees by cost (descending)
  const sortedEmployees = Object.entries(employees)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10); // Top 10 employees
  
  const labels = sortedEmployees.map(item => item[0]);
  const values = sortedEmployees.map(item => item[1]);
  
  if (charts.employees) {
    charts.employees.data.labels = labels;
    charts.employees.data.datasets[0].data = values;
    charts.employees.update();
  } else {
    const ctx = document.getElementById('employeesChart').getContext('2d');
    charts.employees = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cost by Employee',
          data: values,
          backgroundColor: 'rgba(40, 167, 69, 0.8)',
          borderColor: 'rgba(40, 167, 69, 1)',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return formatCurrency(context.parsed.x);
              }
            }
          }
        },
        scales: {
          x: {
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
}

// Update the data table
function updateTable(data) {
  const tableBody = document.getElementById('abcReportTableBody');
  tableBody.innerHTML = '';
  
  data.forEach(item => {
    const row = document.createElement('tr');
    
    // Add class based on ABC classification
    if (item.clasificareABC === 'A') {
      row.classList.add('has-background-danger-light');
    } else if (item.clasificareABC === 'B') {
      row.classList.add('has-background-warning-light');
    } else if (item.clasificareABC === 'C') {
      row.classList.add('has-background-success-light');
    }
    
    row.innerHTML = `
      <td>${item.codAngajat}</td>
      <td>${item.numeCategoriePrincipala || '-'}</td>
      <td>${item.numeSubcategorie || '-'}</td>
      <td>${formatCurrency(item.sumaCost)}</td>
      <td>${item.procentCost.toFixed(2)}%</td>
      <td>${item.procentCumulativ.toFixed(2)}%</td>
      <td>
        <span class="tag ${getClassTagColor(item.clasificareABC)}">${item.clasificareABC}</span>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
}

// Filter table based on search input
function filterTable() {
  const searchText = document.getElementById('tableSearchInput').value.toLowerCase();
  const rows = document.getElementById('abcReportTableBody').getElementsByTagName('tr');
  
  Array.from(rows).forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchText) ? '' : 'none';
  });
}

// Helper function to get tag color based on ABC class
function getClassTagColor(abcClass) {
  switch (abcClass) {
    case 'A': return 'is-danger';
    case 'B': return 'is-warning';
    case 'C': return 'is-success';
    default: return 'is-info';
  }
}

// Helper function to format currency
function formatCurrency(value, shortFormat = false) {
  if (shortFormat && value >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Show loading state
function showLoadingState() {
  // Add loading class to charts
  document.querySelectorAll('.box canvas').forEach(canvas => {
    const boxElement = canvas.closest('.box');
    if (boxElement) {
      boxElement.classList.add('is-loading');
    }
  });
}

// Hide loading state
function hideLoadingState() {
  // Remove loading class from charts
  document.querySelectorAll('.box canvas').forEach(canvas => {
    const boxElement = canvas.closest('.box');
    if (boxElement) {
      boxElement.classList.remove('is-loading');
    }
  });
}

// Show error message
function showError(message) {
  showErrorMessage(message);
}

// Safer error message display
function showErrorMessage(message) {
  console.warn('Error message:', message);
  
  // Try to use notification element if it exists
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
      return;
    }
  }
  
  // Try to use notification container if it exists
  const container = document.getElementById('notification-container');
  if (container) {
    const notificationElement = document.createElement('div');
    notificationElement.className = 'notification is-danger';
    notificationElement.innerHTML = `
      <button class="delete"></button>
      <p><strong>Error:</strong> ${message}</p>
    `;
    
    // Add delete button functionality
    const deleteButton = notificationElement.querySelector('.delete');
    if (deleteButton) {
      deleteButton.addEventListener('click', () => {
        notificationElement.remove();
      });
    }
    
    container.appendChild(notificationElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notificationElement.parentNode) {
        notificationElement.remove();
      }
    }, 5000);
  } else {
    // Fallback to alert if no notification elements exist
    alert(message);
  }
}

// Export functions for external use
window.abcBI = {
  initDashboard,
  fetchAndDisplayData
};
