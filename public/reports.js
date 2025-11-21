document.addEventListener('DOMContentLoaded', () => {
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const refreshBtn = document.getElementById('refreshReports');
  const statusEl = document.getElementById('reportsStatus');

  const totalSalesEl = document.getElementById('totalSales');
  const orderCountEl = document.getElementById('orderCount');
  const averageOrderEl = document.getElementById('averageOrder');

  const topProductsBody = document.getElementById('topProductsBody');
  const recentOrdersBody = document.getElementById('recentOrdersBody');

  let revenueChart;
  let categoryChart;

  const COLORS = ['#ff6d6d', '#f7a072', '#f9c784', '#657ed4', '#7bd389', '#b467c2'];

  function formatCurrency(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function formatDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  }

  function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
  }

  function updateSummary(summary) {
    totalSalesEl.textContent = formatCurrency(summary.totalSales);
    orderCountEl.textContent = summary.orderCount?.toString() || '0';
    averageOrderEl.textContent = formatCurrency(summary.averageOrder);
  }

  function ensureCharts(revenueData, categoryData) {
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');

    const revenueLabels = revenueData.map(item => item.day);
    const revenueValues = revenueData.map(item => item.revenue);

    if (!revenueChart) {
      revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
          labels: revenueLabels,
          datasets: [{
            label: 'Revenue',
            data: revenueValues,
            borderColor: '#ff6d6d',
            backgroundColor: 'rgba(255, 109, 109, 0.2)',
            fill: true,
            tension: 0.3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2,
          scales: {
            y: {
              beginAtZero: true,
            }
          },
          plugins: {
            legend: {
              display: true,
              align: 'end',
            }
          }
        }
      });
    } else {
      revenueChart.data.labels = revenueLabels;
      revenueChart.data.datasets[0].data = revenueValues;
      revenueChart.update();
    }

    const categoryLabels = categoryData.map(item => item.name);
    const categoryValues = categoryData.map(item => item.revenue);

    if (!categoryChart) {
      categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
          labels: categoryLabels,
          datasets: [{
            data: categoryValues,
            backgroundColor: COLORS,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1.4,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    } else {
      categoryChart.data.labels = categoryLabels;
      categoryChart.data.datasets[0].data = categoryValues;
      categoryChart.update();
    }
  }

  function updateTableBody(element, rows, formatter) {
    element.innerHTML = '';
    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 3;
      td.textContent = 'No data in range.';
      tr.appendChild(td);
      element.appendChild(tr);
      return;
    }

    rows.forEach(row => {
      const tr = document.createElement('tr');
      formatter(row).forEach(text => {
        const td = document.createElement('td');
        td.textContent = text;
        tr.appendChild(td);
      });
      element.appendChild(tr);
    });
  }

  async function loadReports() {
    const start = startInput.value;
    const end = endInput.value;

    if (!start || !end) {
      alert('Please select both start and end dates.');
      return;
    }

    if (new Date(start) > new Date(end)) {
      alert('Start date must be before end date.');
      return;
    }

    setStatus('Refreshing data…');

    try {
      const params = new URLSearchParams({ start, end });
      const res = await fetch(`/manager/reports/data?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to load reports');
      }

      updateSummary(data.summary);
      ensureCharts(data.revenueByDay, data.categoryBreakdown);

      updateTableBody(
        topProductsBody,
        data.topProducts,
        row => [row.name, row.qty.toString(), formatCurrency(row.revenue)]
      );

      updateTableBody(
        recentOrdersBody,
        data.recentOrders,
        row => [`#${row.orderId}`, formatCurrency(row.total), formatDateTime(row.placedAt)]
      );

      setStatus(`Showing ${start} to ${end}`);
    } catch (err) {
      console.error('Failed to load reports', err);
      setStatus('Failed to load data. Try again.');
      alert('Failed to load reports. Please try again.');
    }
  }

  refreshBtn.addEventListener('click', loadReports);
  loadReports();
});
