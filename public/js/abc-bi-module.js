// ABC BI Module - Handles data fetching, processing, and visualization for the ABC BI dashboard

// Import the Feathers client
import client from '../modules/feathersjs-client.js';

// Global variables
let abcReportData = [];
let charts = {};
let currentReportView = 'overview';

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
  
  const compareEmployeesBtn = document.getElementById('compareEmployeesBtn');
  if (compareEmployeesBtn) {
    compareEmployeesBtn.addEventListener('click', updateEmployeeComparisonCharts);
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
  const transactionType = document.getElementById('transactionTypeSelector').value;
  
  try {
    // Use Feathers client instead of fetch
    const result = await client.service('abcHelper').getEmployeesReport({
      fiscprd: fiscprd,
      period: period,
      tprms: transactionType !== 'all' ? transactionType : undefined
    });
    
    if (result.success) {
      abcReportData = result.data;
      updateDashboard(abcReportData);
      populateEmployeeComparisonSelect(abcReportData);
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
  updateReportView(currentReportView);
  // Always update the table data for when user switches to the table tab
  updateTable(data);
}

// Update dashboard based on selected report type
function updateReportView(reportType) {
  currentReportView = reportType;
  
  // Clear previous charts to prevent memory leaks
  Object.keys(charts).forEach(key => {
    if (charts[key]) {
      charts[key].destroy();
      delete charts[key];
    }
  });
  
  switch (reportType) {
    case 'overview':
      updateOverviewCharts(abcReportData);
      break;
    case 'pareto':
      updateParetoCharts(abcReportData);
      break;
    case 'costStructure':
      updateCostStructureCharts(abcReportData);
      break;
    case 'employeeComparison':
      updateEmployeeComparisonCharts();
      break;
    case 'reportDetails':
      // Just make sure the table is updated
      updateTable(abcReportData);
      break;
    default:
      updateOverviewCharts(abcReportData);
  }
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

// Update overview charts (original dashboard)
function updateOverviewCharts(data) {
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

// Create/update the Pareto analysis chart (line + bar)
function updateParetoChart(data) {
  // Sort items by cost (descending)
  const sortedItems = [...data].sort((a, b) => b.sumaCost - a.sumaCost);
  
  const labels = sortedItems.slice(0, 20).map((item, index) => `Item ${index + 1}`);
  const values = sortedItems.slice(0, 20).map(item => item.sumaCost);
  const cumulativePercent = sortedItems.slice(0, 20).map(item => item.procentCumulativ);
  
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

// Update the employees horizontal bar chart
function updateEmployeesChart(data) {
  // Group data by employee
  const employees = data.reduce((acc, item) => {
    const employeeId = item.codAngajat || 'Unknown';
    const employeeName = item.numeAngajat || 'Unknown';
    const employeeLabel = `${employeeName} (${employeeId})`;
    
    if (!acc[employeeLabel]) {
      acc[employeeLabel] = 0;
    }
    acc[employeeLabel] += item.sumaCost;
    return acc;
  }, {});
  
  // Sort employees by cost (descending)
  const sortedEmployees = Object.entries(employees)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10); // Top 10 employees
  
  const labels = sortedEmployees.map(item => item[0]);
  const values = sortedEmployees.map(item => item[1]);
  
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

// Update Pareto Analysis Charts
function updateParetoCharts(data) {
  // Create detailed Pareto chart
  updateDetailedParetoChart(data);
  
  // Create cumulative distribution chart
  updateCumulativeDistributionChart(data);
  
  // Update Pareto summary table
  updateParetoSummaryTable(data);
}

// Create/update detailed Pareto chart
function updateDetailedParetoChart(data) {
  // Sort items by cost (descending)
  const sortedItems = [...data].sort((a, b) => b.sumaCost - a.sumaCost);
  
  // Prepare data for chart - use more items than the overview chart
  const labels = sortedItems.slice(0, 30).map((item, index) => {
    const employeeName = item.numeAngajat || 'Unknown';
    return `${employeeName.split(' ')[0]} (${index + 1})`;
  });
  
  const values = sortedItems.slice(0, 30).map(item => item.sumaCost);
  const cumulativePercent = sortedItems.slice(0, 30).map(item => item.procentCumulativ);
  
  // Determine bar colors based on ABC classification
  const barColors = sortedItems.slice(0, 30).map(item => {
    switch(item.clasificareABC) {
      case 'A': return 'rgba(220, 53, 69, 0.8)';
      case 'B': return 'rgba(255, 193, 7, 0.8)';
      case 'C': return 'rgba(40, 167, 69, 0.8)';
      default: return 'rgba(108, 117, 125, 0.8)';
    }
  });
  
  const ctx = document.getElementById('detailedParetoChart').getContext('2d');
  charts.detailedPareto = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Cost',
          data: values,
          backgroundColor: barColors,
          order: 2
        },
        {
          label: 'Cumulative %',
          data: cumulativePercent,
          type: 'line',
          borderColor: 'rgba(13, 110, 253, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(13, 110, 253, 1)',
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
        },
        legend: {
          position: 'top'
        }
      }
    }
  });
}

// Create/update cumulative distribution chart
function updateCumulativeDistributionChart(data) {
  // Calculate the percentage of items for each ABC class
  const totalItems = data.length;
  const aClassCount = data.filter(item => item.clasificareABC === 'A').length;
  const bClassCount = data.filter(item => item.clasificareABC === 'B').length;
  const cClassCount = data.filter(item => item.clasificareABC === 'C').length;
  
  const aClassPercentage = (aClassCount / totalItems) * 100;
  const bClassPercentage = (bClassCount / totalItems) * 100;
  const cClassPercentage = (cClassCount / totalItems) * 100;
  
  const ctx = document.getElementById('cumulativeDistributionChart').getContext('2d');
  charts.cumulativeDistribution = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['0%', '20%', '40%', '60%', '80%', '100%'],
      datasets: [
        {
          label: 'Ideal Pareto',
          data: [0, 0, 0, 0, 80, 100],
          borderColor: 'rgba(108, 117, 125, 0.5)',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0
        },
        {
          label: 'Actual Distribution',
          data: [0, 20, 40, 60, 80, 100].map(x => {
            if (x <= aClassPercentage) return 80 * (x / aClassPercentage);
            if (x <= aClassPercentage + bClassPercentage) 
              return 80 + (15 * (x - aClassPercentage) / bClassPercentage);
            return 95 + (5 * (x - aClassPercentage - bClassPercentage) / cClassPercentage);
          }),
          borderColor: 'rgba(13, 110, 253, 1)',
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: '% of Items'
          }
        },
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: '% of Cost'
          },
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
            }
          }
        }
      }
    }
  });
}

// Update Pareto summary table
function updateParetoSummaryTable(data) {
  const totalItems = data.length;
  const totalCost = data.reduce((sum, item) => sum + item.sumaCost, 0);
  
  const aClassItems = data.filter(item => item.clasificareABC === 'A');
  const bClassItems = data.filter(item => item.clasificareABC === 'B');
  const cClassItems = data.filter(item => item.clasificareABC === 'C');
  
  const aClassCost = aClassItems.reduce((sum, item) => sum + item.sumaCost, 0);
  const bClassCost = bClassItems.reduce((sum, item) => sum + item.sumaCost, 0);
  const cClassCost = cClassItems.reduce((sum, item) => sum + item.sumaCost, 0);
  
  const tableBody = document.getElementById('paretoSummaryTable');
  tableBody.innerHTML = `
    <tr class="has-background-danger-light">
      <td><strong>A</strong></td>
      <td>${((aClassItems.length / totalItems) * 100).toFixed(1)}%</td>
      <td>${((aClassCost / totalCost) * 100).toFixed(1)}%</td>
    </tr>
    <tr class="has-background-warning-light">
      <td><strong>B</strong></td>
      <td>${((bClassItems.length / totalItems) * 100).toFixed(1)}%</td>
      <td>${((bClassCost / totalCost) * 100).toFixed(1)}%</td>
    </tr>
    <tr class="has-background-success-light">
      <td><strong>C</strong></td>
      <td>${((cClassItems.length / totalItems) * 100).toFixed(1)}%</td>
      <td>${((cClassCost / totalCost) * 100).toFixed(1)}%</td>
    </tr>
  `;
}

// Update Cost Structure Charts
function updateCostStructureCharts(data) {
  updateCostBreakdownChart(data);
  updateMainCategoriesChart(data);
  updateSubcategoriesChart(data);
}

// Create/update the cost breakdown chart
function updateCostBreakdownChart(data) {
  // Group data by main category and subcategory
  const categories = {};
  
  data.forEach(item => {
    const mainCategory = item.numeCategoriePrincipala || 'Uncategorized';
    const subCategory = item.numeSubcategorie || 'General';
    
    if (!categories[mainCategory]) {
      categories[mainCategory] = {};
    }
    
    if (!categories[mainCategory][subCategory]) {
      categories[mainCategory][subCategory] = 0;
    }
    
    categories[mainCategory][subCategory] += item.sumaCost;
  });
  
  // Create labels and dataset series
  const mainCategories = Object.keys(categories).sort();
  const datasets = [];
  const colors = [
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 99, 132, 0.8)',
    'rgba(255, 205, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
    'rgba(201, 203, 207, 0.8)',
    'rgba(94, 232, 177, 0.8)'
  ];
  
  mainCategories.forEach((mainCategory, index) => {
    const subCategories = Object.keys(categories[mainCategory]);
    const borderColor = colors[index % colors.length].replace('0.8', '1');
    
    subCategories.forEach(subCategory => {
      datasets.push({
        label: `${mainCategory} - ${subCategory}`,
        data: mainCategories.map(cat => cat === mainCategory ? categories[mainCategory][subCategory] : 0),
        backgroundColor: colors[index % colors.length],
        borderColor: borderColor,
        borderWidth: 1
      });
    });
  });
  
  const ctx = document.getElementById('costBreakdownChart').getContext('2d');
  charts.costBreakdown = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: mainCategories,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true
        },
        y: {
          stacked: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value, true);
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        },
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            font: {
              size: 10
            }
          }
        }
      }
    }
  });
}

// Create/update main categories chart
function updateMainCategoriesChart(data) {
  // Group data by main category
  const categories = data.reduce((acc, item) => {
    const category = item.numeCategoriePrincipala || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += item.sumaCost;
    return acc;
  }, {});
  
  // Prepare data for chart
  const sortedCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1]);
  
  const labels = sortedCategories.map(item => item[0]);
  const values = sortedCategories.map(item => item[1]);
  
  // Generate colors
  const colors = [
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 99, 132, 0.8)',
    'rgba(255, 205, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
    'rgba(201, 203, 207, 0.8)',
    'rgba(94, 232, 177, 0.8)'
  ];
  
  const backgroundColor = values.map((_, i) => colors[i % colors.length]);
  
  const ctx = document.getElementById('mainCategoriesChart').getContext('2d');
  charts.mainCategories = new Chart(ctx, {
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
            font: {
              size: 11
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = (value / total * 100).toFixed(1);
              return `${label}: ${formatCurrency(value)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Create/update subcategories chart
function updateSubcategoriesChart(data) {
  // Get the main category with the highest cost
  const mainCategories = data.reduce((acc, item) => {
    const category = item.numeCategoriePrincipala || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += item.sumaCost;
    return acc;
  }, {});
  
  const topMainCategory = Object.entries(mainCategories)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  // Filter data for the top main category and group by subcategory
  const subcategories = data
    .filter(item => (item.numeCategoriePrincipala || 'Uncategorized') === topMainCategory)
    .reduce((acc, item) => {
      const subcategory = item.numeSubcategorie || 'General';
      if (!acc[subcategory]) {
        acc[subcategory] = 0;
      }
      acc[subcategory] += item.sumaCost;
      return acc;
    }, {});
  
  // Prepare data for chart
  const sortedSubcategories = Object.entries(subcategories)
    .sort((a, b) => b[1] - a[1]);
  
  const labels = sortedSubcategories.map(item => item[0]);
  const values = sortedSubcategories.map(item => item[1]);
  
  // Generate colors
  const colors = [
    'rgba(75, 192, 192, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 99, 132, 0.8)',
    'rgba(255, 205, 86, 0.8)',
    'rgba(201, 203, 207, 0.8)',
    'rgba(94, 232, 177, 0.8)'
  ];
  
  const backgroundColor = values.map((_, i) => colors[i % colors.length]);
  
  const ctx = document.getElementById('subcategoriesChart').getContext('2d');
  charts.subcategories = new Chart(ctx, {
    type: 'doughnut',
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
            font: {
              size: 11
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = (value / total * 100).toFixed(1);
              return `${label}: ${formatCurrency(value)} (${percentage}%)`;
            }
          }
        },
        title: {
          display: true,
          text: `Subcategories for ${topMainCategory}`,
          font: {
            size: 14
          }
        }
      }
    }
  });
}

// Employee Comparison Functions
// Populate employee comparison select dropdown
function populateEmployeeComparisonSelect(data) {
  const select = document.getElementById('employeeComparisonSelect');
  if (!select) return;
  
  // Get unique employees
  const uniqueEmployees = [...new Set(data.map(item => item.codAngajat))];
  
  // Clear existing options
  select.innerHTML = '';
  
  // Group employee data
  const employeeData = {};
  uniqueEmployees.forEach(employeeId => {
    const employeeItems = data.filter(item => item.codAngajat === employeeId);
    const employeeName = employeeItems[0]?.numeAngajat || 'Unknown';
    const totalCost = employeeItems.reduce((sum, item) => sum + item.sumaCost, 0);
    
    employeeData[employeeId] = {
      name: employeeName,
      totalCost: totalCost
    };
  });
  
  // Sort employees by total cost (descending)
  const sortedEmployees = Object.entries(employeeData)
    .sort((a, b) => b[1].totalCost - a[1].totalCost);
  
  // Add options for each employee
  sortedEmployees.forEach(([employeeId, data]) => {
    const option = document.createElement('option');
    option.value = employeeId;
    option.textContent = `${data.name} (${employeeId}) - ${formatCurrency(data.totalCost)}`;
    select.appendChild(option);
  });
  
  // Select the top 3 employees by default
  const topEmployees = sortedEmployees.slice(0, 3).map(([id]) => id);
  topEmployees.forEach(id => {
    const option = select.querySelector(`option[value="${id}"]`);
    if (option) option.selected = true;
  });
}

// Update employee comparison charts
function updateEmployeeComparisonCharts() {
  const select = document.getElementById('employeeComparisonSelect');
  if (!select) return;
  
  // Get selected employee IDs
  const selectedEmployees = Array.from(select.selectedOptions).map(option => option.value);
  
  if (selectedEmployees.length === 0) {
    showErrorMessage('Please select at least one employee for comparison');
    return;
  }
  
  // Filter data for selected employees
  const filteredData = abcReportData.filter(item => selectedEmployees.includes(item.codAngajat));
  
  updateEmployeeCostComparisonChart(filteredData, selectedEmployees);
  updateEmployeeCategoryChart(filteredData, selectedEmployees);
}

// Create/update employee cost comparison chart
function updateEmployeeCostComparisonChart(data, selectedEmployees) {
  // Prepare data for chart
  const employeeData = {};
  
  selectedEmployees.forEach(employeeId => {
    const employeeItems = data.filter(item => item.codAngajat === employeeId);
    const employeeName = employeeItems[0]?.numeAngajat || 'Unknown';
    
    // Calculate total for each transaction type
    const venituriTotal = employeeItems
      .filter(item => item.tipTranzactie === 'Venituri')
      .reduce((sum, item) => sum + item.sumaCost, 0);
      
    const cheltuieliTotal = employeeItems
      .filter(item => item.tipTranzactie === 'Cheltuieli')
      .reduce((sum, item) => sum + item.sumaCost, 0);
    
    const alteleTotal = employeeItems
      .filter(item => item.tipTranzactie !== 'Venituri' && item.tipTranzactie !== 'Cheltuieli')
      .reduce((sum, item) => sum + item.sumaCost, 0);
    
    employeeData[employeeId] = {
      name: employeeName,
      venituri: venituriTotal,
      cheltuieli: cheltuieliTotal,
      altele: alteleTotal,
      total: venituriTotal + cheltuieliTotal + alteleTotal
    };
  });
  
  // Sort employees by total cost (descending)
  const sortedEmployees = Object.entries(employeeData)
    .sort((a, b) => b[1].total - a[1].total);
  
  const labels = sortedEmployees.map(([_, data]) => data.name);
  const venituriData = sortedEmployees.map(([_, data]) => data.venituri);
  const cheltuieliData = sortedEmployees.map(([_, data]) => data.cheltuieli);
  const alteleData = sortedEmployees.map(([_, data]) => data.altele);
  
  const ctx = document.getElementById('employeeComparisonChart').getContext('2d');
  charts.employeeComparison = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Venituri',
          data: venituriData,
          backgroundColor: 'rgba(40, 167, 69, 0.8)',
          borderColor: 'rgba(40, 167, 69, 1)',
          borderWidth: 1
        },
        {
          label: 'Cheltuieli',
          data: cheltuieliData,
          backgroundColor: 'rgba(220, 53, 69, 0.8)',
          borderColor: 'rgba(220, 53, 69, 1)',
          borderWidth: 1
        },
        {
          label: 'Altele',
          data: alteleData,
          backgroundColor: 'rgba(108, 117, 125, 0.8)',
          borderColor: 'rgba(108, 117, 125, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: false
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value, true);
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      }
    }
  });
}

// Create/update employee category chart
function updateEmployeeCategoryChart(data, selectedEmployees) {
  // For simplicity, we'll focus on the top employee's categories
  if (selectedEmployees.length === 0) return;
  
  // Get top employee data
  const employeeItems = {};
  const employeeNames = {};
  
  selectedEmployees.forEach(employeeId => {
    const items = data.filter(item => item.codAngajat === employeeId);
    employeeItems[employeeId] = items;
    employeeNames[employeeId] = items[0]?.numeAngajat || 'Unknown';
  });
  
  // Get the main categories across all selected employees
  const allCategories = new Set();
  Object.values(employeeItems).flat().forEach(item => {
    allCategories.add(item.numeCategoriePrincipala || 'Uncategorized');
  });
  
  const categories = Array.from(allCategories);
  
  // Create datasets for each employee
  const datasets = selectedEmployees.map((employeeId, index) => {
    const items = employeeItems[employeeId];
    const employeeName = employeeNames[employeeId];
    
    // Calculate total for each category
    const categoryTotals = categories.map(category => {
      return items
        .filter(item => (item.numeCategoriePrincipala || 'Uncategorized') === category)
        .reduce((sum, item) => sum + item.sumaCost, 0);
    });
    
    // Colors for different employees
    const colors = [
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 99, 132, 0.8)',
      'rgba(255, 205, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)'
    ];
    
    return {
      label: employeeName,
      data: categoryTotals,
      backgroundColor: colors[index % colors.length],
      borderColor: colors[index % colors.length].replace('0.8', '1'),
      borderWidth: 1
    };
  });
  
  const ctx = document.getElementById('employeeCategoryChart').getContext('2d');
  charts.employeeCategory = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: categories,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          ticks: {
            display: false
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label} - ${context.label}: ${formatCurrency(context.parsed.r)}`;
            }
          }
        },
        legend: {
          position: 'top'
        }
      }
    }
  });
}

// Update the data table
function updateTable(data) {
  const tableBody = document.getElementById('abcReportTableBody');
  if (!tableBody) return; // Safety check
  
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
      <td>${item.numeAngajat || ''} (${item.codAngajat})</td>
      <td>${item.tipTranzactie || 'N/A'}</td>
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
  document.querySelectorAll('.box canvas').forEach(canvas => {
    const boxElement = canvas.closest('.box');
    if (boxElement) {
      boxElement.classList.add('is-loading');
    }
  });
}

// Hide loading state
function hideLoadingState() {
  document.querySelectorAll('.box canvas').forEach(canvas => {
    const boxElement = canvas.closest('.box');
    if (boxElement) {
      boxElement.classList.remove('is-loading');
    }
  });
}

// Show error message
function showErrorMessage(message) {
  console.warn('Error message:', message);
  
  // Try to use notification element if it exists
  const notification = document.getElementById('notification');
  if (notification) {
    const notificationMessage = document.getElementById('notificationMessage');
    if (notificationMessage) {
      notificationMessage.textContent = message;
      notification.style.display = 'block';
      notification.className = 'notification is-danger';
      
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
  fetchAndDisplayData,
  updateReportView
};
