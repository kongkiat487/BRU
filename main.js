// CSV Data Source URL
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRV9_mpDA5cuhzG700dNNwD54BvOqBILqZkAlygrNNw9EW7L4N175UiAWwzBNF7TkWIpLJWJh6P-Tu4/pub?gid=1269439941&single=true&output=csv';

// Global Application State
let rawData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 10;
let sortColumn = 'ปีการศึกษา';
let sortDirection = 'desc';

// Chart Instances
let yearlyTrendChart = null;
let typeShareChart = null;
let facultyApplicantsChart = null;
let facultyPassRateChart = null;

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const errorToast = document.getElementById('errorToast');
const errorMessage = document.getElementById('errorMessage');
const lastUpdatedTime = document.getElementById('lastUpdatedTime');
const refreshBtn = document.getElementById('refreshBtn');
const refreshIcon = document.getElementById('refreshIcon');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

// Filters
const yearFilter = document.getElementById('yearFilter');
const facultyFilter = document.getElementById('facultyFilter');
const typeFilter = document.getElementById('typeFilter');
const searchInput = document.getElementById('searchInput');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const filteredCountBadge = document.getElementById('filteredCountBadge');

// Table Controls
const tableBody = document.getElementById('tableBody');
const pageSizeSelect = document.getElementById('pageSizeSelect');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageNumberBadge = document.getElementById('pageNumberBadge');
const pageInfo = document.getElementById('pageInfo');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEventListeners();
  fetchData();
});

// Theme Setup & Toggle
function initTheme() {
  const isDark = localStorage.getItem('theme') === 'dark' || 
                 (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDark) {
    document.documentElement.classList.add('dark');
    themeIcon.className = 'fa-solid fa-sun text-amber-400 text-lg';
  } else {
    document.documentElement.classList.remove('dark');
    themeIcon.className = 'fa-solid fa-moon text-indigo-600 text-lg';
  }
}

themeToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeIcon.className = isDark ? 'fa-solid fa-sun text-amber-400 text-lg' : 'fa-solid fa-moon text-indigo-600 text-lg';
  
  // Re-render charts to adapt grid/label colors
  if (filteredData.length > 0) {
    updateCharts(filteredData);
  }
});

// Event Listeners
function setupEventListeners() {
  refreshBtn.addEventListener('click', () => {
    refreshIcon.classList.add('animate-spin');
    fetchData();
  });

  yearFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  facultyFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  typeFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      applyFilters();
    }, 300);
  });

  resetFiltersBtn.addEventListener('click', () => {
    yearFilter.value = 'all';
    facultyFilter.value = 'all';
    typeFilter.value = 'all';
    searchInput.value = '';
    currentPage = 1;
    applyFilters();
  });

  pageSizeSelect.addEventListener('change', (e) => {
    pageSize = parseInt(e.target.value, 10);
    currentPage = 1;
    renderTable();
  });

  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    const maxPage = Math.ceil(filteredData.length / pageSize);
    if (currentPage < maxPage) {
      currentPage++;
      renderTable();
    }
  });
}

// Fetch Real-time Data via Fetch API (100% Client-Side Static Dashboard)
async function fetchData() {
  loadingOverlay.classList.remove('hidden');
  loadingOverlay.classList.add('flex');
  errorToast.classList.add('hidden');

  let csvText = null;

  // 1. ดึงข้อมูลตรงจาก Google Sheets (ทำงานได้สมบูรณ์แบบบน Cloud Vercel, GitHub Pages หรือ Web Server)
  if (!csvText) {
    try {
      const response = await fetch(CSV_URL, { cache: 'no-store' });
      if (response.ok) {
        const text = await response.text();
        if (text && text.includes('ปีการศึกษา')) {
          csvText = text;
        }
      }
    } catch (err) {
      console.warn('Direct fetch failed:', err);
    }
  }

  // 2. ระบบสำรอง: หากเปิดไฟล์ตรงในเครื่อง (file://) ให้ดึงผ่าน JSON Proxy (allorigins /get)
  if (!csvText) {
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(CSV_URL)}`;
      const response = await fetch(proxyUrl, { cache: 'no-store' });
      if (response.ok) {
        const json = await response.json();
        if (json && json.contents && json.contents.includes('ปีการศึกษา')) {
          csvText = json.contents;
        }
      }
    } catch (err) {
      console.warn('Allorigins JSON proxy failed:', err);
    }
  }

  // 3. ระบบสำรองชั้นที่ 2: ดึงผ่าน Public CORS Proxies อื่นๆ
  if (!csvText) {
    const backupProxies = [
      `https://corsproxy.io/?${encodeURIComponent(CSV_URL)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(CSV_URL)}`,
      `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(CSV_URL)}`
    ];
    for (const url of backupProxies) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (response.ok) {
          const text = await response.text();
          if (text && !text.trim().startsWith('<') && text.includes('ปีการศึกษา')) {
            csvText = text;
            break;
          }
        }
      } catch (err) {
        console.warn(`Backup proxy failed for ${url}:`, err);
      }
    }
  }

  if (!csvText) {
    showError('ไม่สามารถดึงข้อมูลจาก Google Sheets ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและกดรีเฟรชหน้าเว็บอีกครั้ง');
    finishLoading();
    return;
  }

  try {
    // Parse CSV using PapaParse
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          processRawData(results.data);
          updateLastUpdatedTime();
        } else {
          showError('ไม่พบข้อมูลในไฟล์ CSV');
        }
        finishLoading();
      },
      error: (err) => {
        showError(`ข้อผิดพลาดในการแปลงไฟล์ CSV: ${err.message}`);
        finishLoading();
      }
    });
  } catch (err) {
    console.error('Parse error:', err);
    showError(`เกิดข้อผิดพลาดในการประมวลผลข้อมูล: ${err.message}`);
    finishLoading();
  }
}

function finishLoading() {
  setTimeout(() => {
    loadingOverlay.classList.add('opacity-0');
    setTimeout(() => {
      loadingOverlay.classList.remove('flex');
      loadingOverlay.classList.add('hidden');
      loadingOverlay.classList.remove('opacity-0');
      refreshIcon.classList.remove('animate-spin');
    }, 300);
  }, 500);
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorToast.classList.remove('hidden');
}

function hideError() {
  errorToast.classList.add('hidden');
}

function updateLastUpdatedTime() {
  const now = new Date();
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
  lastUpdatedTime.textContent = now.toLocaleDateString('th-TH', options) + ' น.';
}

// Data Processing & Cleaning
function processRawData(rows) {
  const yearsSet = new Set();
  const facultiesSet = new Set();

  rawData = rows.map((row, idx) => {
    const year = (row['ปีการศึกษา'] || '').trim();
    const faculty = (row['ชื่อคณะ'] || '').trim();
    const type = (row['ประเภทการสมัคร'] || '').trim();
    const applicants = parseFloat((row['จำนวนผู้สมัคร'] || '0').replace(/,/g, '')) || 0;
    const admitted = parseFloat((row['จำนวนผู้ผ่าน'] || '0').replace(/,/g, '')) || 0;
    const passRate = parseFloat((row['เปอร์เซ็นต์การผ่าน (%)'] || '0').replace(/,/g, '')) || 0;
    const rejected = parseFloat((row['จำนวนผู้ไม่ผ่าน'] || '0').replace(/,/g, '')) || 0;

    if (year) yearsSet.add(year);
    if (faculty) facultiesSet.add(faculty);

    return {
      id: idx,
      ปีการศึกษา: year,
      ชื่อคณะ: faculty,
      ประเภทการสมัคร: type,
      จำนวนผู้สมัคร: applicants,
      จำนวนผู้ผ่าน: admitted,
      'เปอร์เซ็นต์การผ่าน (%)': passRate,
      จำนวนผู้ไม่ผ่าน: rejected
    };
  }).filter(item => item.ปีการศึกษา && item.ชื่อคณะ);

  populateDropdowns(Array.from(yearsSet).sort(), Array.from(facultiesSet).sort());
  applyFilters();
}

function populateDropdowns(years, faculties) {
  // Preserve selected values if refreshing
  const selectedYear = yearFilter.value;
  const selectedFaculty = facultyFilter.value;

  yearFilter.innerHTML = '<option value="all">ทั้งหมดทุกปีการศึกษา (2564 - 2567)</option>';
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = `ปีการศึกษา ${y}`;
    yearFilter.appendChild(opt);
  });
  if (selectedYear && years.includes(selectedYear)) yearFilter.value = selectedYear;

  facultyFilter.innerHTML = '<option value="all">ทั้งหมดทุกคณะ / หน่วยงาน</option>';
  faculties.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    facultyFilter.appendChild(opt);
  });
  if (selectedFaculty && faculties.includes(selectedFaculty)) facultyFilter.value = selectedFaculty;
}

// Filtering & Dashboard Update
function applyFilters() {
  const selectedYear = yearFilter.value;
  const selectedFaculty = facultyFilter.value;
  const selectedType = typeFilter.value;
  const keyword = searchInput.value.trim().toLowerCase();

  filteredData = rawData.filter(item => {
    const matchYear = (selectedYear === 'all') || (item.ปีการศึกษา === selectedYear);
    const matchFaculty = (selectedFaculty === 'all') || (item.ชื่อคณะ === selectedFaculty);
    const matchType = (selectedType === 'all') || (item.ประเภทการสมัคร === selectedType);
    const matchKeyword = !keyword || (item.ชื่อคณะ.toLowerCase().includes(keyword));

    return matchYear && matchFaculty && matchType && matchKeyword;
  });

  filteredCountBadge.textContent = `${filteredData.length.toLocaleString()} รายการ`;

  updateKPICards(filteredData);
  updateCharts(filteredData);
  renderTable();
}

// KPI Calculation & Animation
function updateKPICards(data) {
  let totalApp = 0;
  let totalAdm = 0;
  let totalRej = 0;

  data.forEach(item => {
    totalApp += item.จำนวนผู้สมัคร;
    totalAdm += item.จำนวนผู้ผ่าน;
    totalRej += item.จำนวนผู้ไม่ผ่าน;
  });

  const avgRate = totalApp > 0 ? ((totalAdm / totalApp) * 100).toFixed(2) : '0.00';

  animateValue('kpiApplicants', totalApp);
  animateValue('kpiAdmitted', totalAdm);
  animateValue('kpiRejected', totalRej);
  animateValue('kpiPassRate', parseFloat(avgRate), 2);

  // Animate progress bar
  const bar = document.getElementById('kpiPassRateBar');
  bar.style.width = `${Math.min(100, parseFloat(avgRate))}%`;
}

function animateValue(id, endValue, decimals = 0) {
  const obj = document.getElementById(id);
  const startValue = parseFloat(obj.getAttribute('data-value')) || 0;
  obj.setAttribute('data-value', endValue);

  const duration = 800;
  let startTimestamp = null;

  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    
    // Ease out cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = startValue + (endValue - startValue) * easeProgress;
    
    obj.textContent = current.toLocaleString('th-TH', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };

  window.requestAnimationFrame(step);
}

// Chart.js Implementations
function getChartThemeColors() {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    textColor: isDark ? '#cbd5e1' : '#334155',
    gridColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)',
    tooltipBg: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    tooltipText: isDark ? '#f8fafc' : '#0f172a',
    tooltipBorder: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
  };
}

function updateCharts(data) {
  const theme = getChartThemeColors();
  
  renderYearlyTrendChart(data, theme);
  renderTypeShareChart(data, theme);
  renderFacultyApplicantsChart(data, theme);
  renderFacultyPassRateChart(data, theme);
}

// Chart 1: Yearly Trend (Bar + Line Combo)
function renderYearlyTrendChart(data, theme) {
  const yearlyMap = {};
  data.forEach(item => {
    const y = item.ปีการศึกษา;
    if (!yearlyMap[y]) yearlyMap[y] = { applicants: 0, admitted: 0 };
    yearlyMap[y].applicants += item.จำนวนผู้สมัคร;
    yearlyMap[y].admitted += item.จำนวนผู้ผ่าน;
  });

  const years = Object.keys(yearlyMap).sort();
  const applicantsData = years.map(y => yearlyMap[y].applicants);
  const admittedData = years.map(y => yearlyMap[y].admitted);

  const ctx = document.getElementById('yearlyTrendChart').getContext('2d');
  
  if (yearlyTrendChart) yearlyTrendChart.destroy();

  yearlyTrendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: years.map(y => `ปีฯ ${y}`),
      datasets: [
        {
          label: 'จำนวนผู้สมัคร',
          data: applicantsData,
          backgroundColor: 'rgba(99, 102, 241, 0.85)',
          hoverBackgroundColor: 'rgba(99, 102, 241, 1)',
          borderColor: '#6366f1',
          borderWidth: 1,
          borderRadius: 8,
          barPercentage: 0.6,
          order: 2
        },
        {
          label: 'ผู้ผ่านการคัดเลือก',
          data: admittedData,
          type: 'line',
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          borderWidth: 3,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: true,
          tension: 0.3,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
          displayColors: true,
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.raw.toLocaleString()} คน`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: theme.textColor, font: { family: 'Prompt', size: 12 } }
        },
        y: {
          grid: { color: theme.gridColor },
          ticks: {
            color: theme.textColor,
            font: { family: 'Prompt', size: 11 },
            callback: value => value.toLocaleString()
          }
        }
      }
    }
  });
}

// Chart 2: Admission vs Quota Share (Doughnut)
function renderTypeShareChart(data, theme) {
  const typeMap = { 'Admission': 0, 'Quota': 0 };
  let total = 0;

  data.forEach(item => {
    const t = item.ประเภทการสมัคร;
    if (typeMap[t] !== undefined) {
      typeMap[t] += item.จำนวนผู้สมัคร;
      total += item.จำนวนผู้สมัคร;
    } else {
      typeMap[t] = (typeMap[t] || 0) + item.จำนวนผู้สมัคร;
      total += item.จำนวนผู้สมัคร;
    }
  });

  const labels = Object.keys(typeMap);
  const values = labels.map(l => typeMap[l]);
  const colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899'];

  // Update Legend HTML
  const legendDiv = document.getElementById('typeShareLegend');
  legendDiv.innerHTML = labels.map((l, idx) => {
    const val = typeMap[l] || 0;
    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
    return `
      <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50">
        <div class="flex items-center justify-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
          <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: ${colors[idx % colors.length]}"></span>
          <span>${l}</span>
        </div>
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${val.toLocaleString()} คน (${pct}%)</div>
      </div>
    `;
  }).join('');

  const ctx = document.getElementById('typeShareChart').getContext('2d');
  if (typeShareChart) typeShareChart.destroy();

  typeShareChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        hoverBackgroundColor: ['#7c3aed', '#0891b2', '#d97706', '#db2777'],
        borderWidth: 2,
        borderColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return `${context.label}: ${val.toLocaleString()} คน (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// Chart 3: Applicants by Faculty (Horizontal Bar Chart)
function renderFacultyApplicantsChart(data, theme) {
  const facultyMap = {};
  data.forEach(item => {
    const f = item.ชื่อคณะ;
    if (!facultyMap[f]) facultyMap[f] = 0;
    facultyMap[f] += item.จำนวนผู้สมัคร;
  });

  const sortedFaculties = Object.keys(facultyMap).sort((a, b) => facultyMap[b] - facultyMap[a]);
  const values = sortedFaculties.map(f => facultyMap[f]);

  const ctx = document.getElementById('facultyApplicantsChart').getContext('2d');
  if (facultyApplicantsChart) facultyApplicantsChart.destroy();

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 400, 0);
  gradient.addColorStop(0, '#ec4899');
  gradient.addColorStop(0.5, '#a855f7');
  gradient.addColorStop(1, '#6366f1');

  facultyApplicantsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sortedFaculties,
      datasets: [{
        label: 'จำนวนผู้สมัคร (คน)',
        data: values,
        backgroundColor: gradient,
        borderRadius: 6,
        barPercentage: 0.7
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
          callbacks: {
            label: context => `ผู้สมัคร: ${context.raw.toLocaleString()} คน`
          }
        }
      },
      scales: {
        x: {
          grid: { color: theme.gridColor },
          ticks: { color: theme.textColor, font: { family: 'Prompt', size: 11 } }
        },
        y: {
          grid: { display: false },
          ticks: { color: theme.textColor, font: { family: 'Prompt', size: 12, weight: '500' } }
        }
      }
    }
  });
}

// Chart 4: Pass Rate by Faculty (Horizontal Bar Chart)
function renderFacultyPassRateChart(data, theme) {
  const facultyMap = {};
  data.forEach(item => {
    const f = item.ชื่อคณะ;
    if (!facultyMap[f]) facultyMap[f] = { applicants: 0, admitted: 0 };
    facultyMap[f].applicants += item.จำนวนผู้สมัคร;
    facultyMap[f].admitted += item.จำนวนผู้ผ่าน;
  });

  const sortedFaculties = Object.keys(facultyMap).map(f => {
    const app = facultyMap[f].applicants;
    const adm = facultyMap[f].admitted;
    const rate = app > 0 ? (adm / app) * 100 : 0;
    return { faculty: f, rate: parseFloat(rate.toFixed(2)) };
  }).sort((a, b) => b.rate - a.rate);

  const labels = sortedFaculties.map(item => item.faculty);
  const rates = sortedFaculties.map(item => item.rate);

  // Dynamic colors based on pass rate
  const barColors = rates.map(r => {
    if (r >= 50) return '#10b981'; // Emerald
    if (r >= 30) return '#3b82f6'; // Blue
    if (r >= 20) return '#f59e0b'; // Amber
    return '#f43f5e'; // Rose
  });

  const ctx = document.getElementById('facultyPassRateChart').getContext('2d');
  if (facultyPassRateChart) facultyPassRateChart.destroy();

  facultyPassRateChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'อัตราการผ่าน (%)',
        data: rates,
        backgroundColor: barColors,
        borderRadius: 6,
        barPercentage: 0.7
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
          callbacks: {
            label: context => `อัตราการสอบผ่าน: ${context.raw}%`
          }
        }
      },
      scales: {
        x: {
          max: 100,
          grid: { color: theme.gridColor },
          ticks: { 
            color: theme.textColor, 
            font: { family: 'Prompt', size: 11 },
            callback: val => val + '%'
          }
        },
        y: {
          grid: { display: false },
          ticks: { color: theme.textColor, font: { family: 'Prompt', size: 12, weight: '500' } }
        }
      }
    }
  });
}

// Table Sorting & Rendering
function sortTable(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = column;
    sortDirection = 'desc';
  }
  renderTable();
}

function renderTable() {
  // Sort Data
  const sorted = [...filteredData].sort((a, b) => {
    let valA = a[sortColumn];
    let valB = b[sortColumn];

    if (typeof valA === 'string') {
      return sortDirection === 'asc' 
        ? valA.localeCompare(valB, 'th') 
        : valB.localeCompare(valA, 'th');
    } else {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Pagination Slice
  const totalItems = sorted.length;
  const maxPage = Math.max(1, Math.ceil(totalItems / pageSize));
  if (currentPage > maxPage) currentPage = maxPage;

  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const pageData = sorted.slice(startIdx, endIdx);

  // Update Controls
  pageNumberBadge.textContent = currentPage;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= maxPage;
  
  if (totalItems > 0) {
    pageInfo.textContent = `แสดง ${startIdx + 1} ถึง ${endIdx} จากทั้งหมด ${totalItems.toLocaleString()} รายการ`;
  } else {
    pageInfo.textContent = 'ไม่พบข้อมูลที่ตรงกับเงื่อนไข';
  }

  // Render Rows HTML
  if (pageData.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-10 text-slate-400 dark:text-slate-500">
          <i class="fa-solid fa-folder-open text-4xl mb-2 block"></i>
          ไม่พบข้อมูลตามตัวกรองที่เลือก
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = pageData.map(item => {
    const isQuota = item.ประเภทการสมัคร === 'Quota';
    const badgeClass = isQuota 
      ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' 
      : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';

    const rate = item['เปอร์เซ็นต์การผ่าน (%)'];
    let rateColor = 'bg-rose-500';
    if (rate >= 50) rateColor = 'bg-emerald-500';
    else if (rate >= 30) rateColor = 'bg-blue-500';
    else if (rate >= 20) rateColor = 'bg-amber-500';

    return `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
        <td class="py-3 px-4 font-medium">${item.ปีการศึกษา}</td>
        <td class="py-3 px-4 font-semibold text-slate-900 dark:text-white">${item.ชื่อคณะ}</td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeClass}">
            <i class="fa-solid ${isQuota ? 'fa-id-card' : 'fa-file-lines'} text-xs"></i>
            ${item.ประเภทการสมัคร}
          </span>
        </td>
        <td class="py-3 px-4 text-right font-medium">${item.จำนวนผู้สมัคร.toLocaleString()}</td>
        <td class="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">${item.จำนวนผู้ผ่าน.toLocaleString()}</td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-2">
            <div class="w-16 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
              <div class="${rateColor} h-full rounded-full" style="width: ${Math.min(100, rate)}%"></div>
            </div>
            <span class="font-bold w-12 text-right">${rate}%</span>
          </div>
        </td>
        <td class="py-3 px-4 text-right text-slate-500 dark:text-slate-400">${item.จำนวนผู้ไม่ผ่าน.toLocaleString()}</td>
      </tr>
    `;
  }).join('');
}
