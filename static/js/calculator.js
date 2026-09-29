/**
 * Financial Calculation Engine & Reactive UI Controller
 * Provides 60 FPS slider recalculations with 100% parity with Python backend.
 */

// Fixed market constants
const ANNUAL_APPRECIATION = 0.035;
const ANNUAL_RENT_INFLATION = 0.030;
const ANNUAL_PROPERTY_TAX_INSURANCE = 0.015;
const ANNUAL_MAINTENANCE = 0.010;
const BUYER_CLOSING_COST_PCT = 0.030;
const SELLER_CLOSING_FEE_PCT = 0.060;

function round2(val) {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

function formatCurrency(val) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatCurrencyExact(val) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

/**
 * Calculates yearly wealth trajectory comparing home buying vs renting & investing.
 */
function calculateComparison(params) {
  const homePrice = Number(params.homePrice) || 450000;
  let downPaymentPct = Number(params.downPaymentPct);
  if (isNaN(downPaymentPct)) downPaymentPct = 20;
  let mortgageRate = Number(params.mortgageRate);
  if (isNaN(mortgageRate)) mortgageRate = 6.5;
  const initialRent = Number(params.initialRent) || 2200;
  let sp500Return = Number(params.sp500Return);
  if (isNaN(sp500Return)) sp500Return = 8.0;
  const horizonYears = Math.max(1, Math.min(30, Math.round(Number(params.horizonYears) || 30)));

  // Normalize percentages
  const dPct = downPaymentPct > 1.0 ? downPaymentPct / 100.0 : downPaymentPct;
  const mRate = mortgageRate > 1.0 ? mortgageRate / 100.0 : mortgageRate;
  const spRate = sp500Return > 1.0 ? sp500Return / 100.0 : sp500Return;

  // Initial outlays
  const downPayment = homePrice * dPct;
  const buyerClosingCosts = homePrice * BUYER_CLOSING_COST_PCT;
  const initialPortfolio = downPayment + buyerClosingCosts;
  const loanPrincipal = Math.max(0, homePrice - downPayment);

  // 30-year fixed mortgage calculation
  const monthlyMortgageRate = mRate / 12.0;
  const numMortgageMonths = 360;
  let monthlyPi = 0;

  if (loanPrincipal > 0) {
    if (monthlyMortgageRate > 0) {
      const factor = Math.pow(1.0 + monthlyMortgageRate, numMortgageMonths);
      monthlyPi = loanPrincipal * (monthlyMortgageRate * factor) / (factor - 1.0);
    } else {
      monthlyPi = loanPrincipal / numMortgageMonths;
    }
  }

  // Stock market monthly compounding rate
  const monthlySpRate = Math.pow(1.0 + spRate, 1.0 / 12.0) - 1.0;

  // Monthly simulation loop
  let remainingLoan = loanPrincipal;
  let portfolio = initialPortfolio;
  const yearlyData = [];
  const totalMonths = horizonYears * 12;

  for (let m = 1; m <= totalMonths; m++) {
    let activePi = 0;
    if (m <= numMortgageMonths && remainingLoan > 0) {
      const monthlyInterest = remainingLoan * monthlyMortgageRate;
      const monthlyPrincipal = Math.min(remainingLoan, Math.max(0, monthlyPi - monthlyInterest));
      remainingLoan = Math.max(0, remainingLoan - monthlyPrincipal);
      activePi = monthlyPi;
    } else {
      remainingLoan = 0;
      activePi = 0;
    }

    // Property value and holding costs
    const homeVal = homePrice * Math.pow(1.0 + ANNUAL_APPRECIATION, m / 12.0);
    const monthlyHolding = homeVal * ((ANNUAL_PROPERTY_TAX_INSURANCE + ANNUAL_MAINTENANCE) / 12.0);
    const monthlyBuyCost = activePi + monthlyHolding;

    // Rent
    const yearIdx = Math.floor((m - 1) / 12);
    const monthlyRent = initialRent * Math.pow(1.0 + ANNUAL_RENT_INFLATION, yearIdx);

    // Delta & portfolio
    const deltaM = monthlyBuyCost - monthlyRent;
    portfolio = Math.max(0, portfolio * (1.0 + monthlySpRate) + deltaM);

    if (m % 12 === 0) {
      const yearNum = m / 12;
      const sellerFees = homeVal * SELLER_CLOSING_FEE_PCT;
      const buyNw = homeVal - sellerFees - remainingLoan;
      const rentNw = portfolio;

      yearlyData.push({
        year: yearNum,
        buyNetWorth: round2(buyNw),
        rentNetWorth: round2(rentNw),
        delta: round2(buyNw - rentNw),
        homeValue: round2(homeVal),
        remainingMortgage: round2(remainingLoan),
        monthlyBuyCost: round2(monthlyBuyCost),
        monthlyRent: round2(monthlyRent),
        portfolioValue: round2(portfolio),
      });
    }
  }

  const finalPoint = yearlyData.length ? yearlyData[yearlyData.length - 1] : {};
  const finalBuyNw = finalPoint.buyNetWorth || 0;
  const finalRentNw = finalPoint.rentNetWorth || 0;
  const finalDelta = round2(finalBuyNw - finalRentNw);
  const winner = finalDelta >= 0 ? "buy" : "rent";

  // Crossover year
  let crossoverYear = null;
  if (yearlyData.length > 0) {
    const initialLead = yearlyData[0].delta >= 0 ? "buy" : "rent";
    for (let i = 1; i < yearlyData.length; i++) {
      const currentLead = yearlyData[i].delta >= 0 ? "buy" : "rent";
      if (currentLead !== initialLead) {
        crossoverYear = yearlyData[i].year;
        break;
      }
    }
  }

  // Milestones (5, 10, 20, 30)
  const milestones = {};
  [5, 10, 20, 30].forEach((yr) => {
    if (yr <= horizonYears && yr <= yearlyData.length) {
      milestones[yr] = yearlyData[yr - 1];
    }
  });

  return {
    yearlyData,
    finalDelta,
    winner,
    crossoverYear,
    milestones,
    initialCosts: {
      downPayment: round2(downPayment),
      buyerClosingCosts: round2(buyerClosingCosts),
      initialPortfolio: round2(initialPortfolio),
      monthlyMortgagePi: round2(monthlyPi),
    },
  };
}

// Browser Interactive UI Management
if (typeof window !== "undefined") {
  window.CalculatorEngine = {
    calculateComparison,
    formatCurrency,
    formatCurrencyExact,
  };

  let chartInstance = null;

  function getFormValues() {
    return {
      homePrice: parseFloat(document.getElementById("input-price").value) || 450000,
      downPaymentPct: parseFloat(document.getElementById("input-down").value) || 20,
      mortgageRate: parseFloat(document.getElementById("input-rate").value) || 6.5,
      initialRent: parseFloat(document.getElementById("input-rent").value) || 2200,
      sp500Return: parseFloat(document.getElementById("input-sp").value) || 8.0,
      horizonYears: parseInt(document.getElementById("input-horizon").value, 10) || 30,
    };
  }

  function syncPair(sliderId, numberId, formatPrefix = "", formatSuffix = "") {
    const slider = document.getElementById(sliderId);
    const num = document.getElementById(numberId);
    if (!slider || !num) return;

    slider.addEventListener("input", () => {
      num.value = slider.value;
      recalculateAndRender();
    });

    num.addEventListener("input", () => {
      let val = parseFloat(num.value);
      if (isNaN(val)) return;
      slider.value = val;
      recalculateAndRender();
    });
  }

  function updateUrlQuery(params) {
    const query = new URLSearchParams({
      price: params.homePrice,
      down: params.downPaymentPct,
      rate: params.mortgageRate,
      rent: params.initialRent,
      sp: params.sp500Return,
      horizon: params.horizonYears,
    });
    const newUrl = `${window.location.pathname}?${query.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }

  function updateHeroVerdict(result, horizonYears) {
    const verdictBanner = document.getElementById("verdict-banner");
    const verdictTitle = document.getElementById("verdict-title");
    const verdictAmount = document.getElementById("verdict-amount");
    const verdictDesc = document.getElementById("verdict-desc");
    const crossoverBadge = document.getElementById("crossover-badge");

    const absDelta = Math.abs(result.finalDelta);
    const formattedDelta = formatCurrency(absDelta);

    if (result.winner === "buy") {
      verdictBanner.className = "p-5 sm:p-6 rounded-xl border transition-all duration-200 bg-emerald-50/80 border-emerald-300 dark:bg-[#0d131f] dark:border-emerald-500/40 text-slate-900 dark:text-slate-100 shadow-sm dark:shadow-none";
      verdictTitle.innerHTML = `<span class="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-400"><svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> Homeownership Wins</span>`;
      verdictAmount.textContent = `+${formattedDelta}`;
      verdictAmount.className = "text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums mt-1";
      verdictDesc.textContent = `Liquidated home equity exceeds renter portfolio by ${formattedDelta} at Year ${horizonYears}.`;
      verdictDesc.className = "text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-2.5 leading-relaxed";
    } else {
      verdictBanner.className = "p-5 sm:p-6 rounded-xl border transition-all duration-200 bg-blue-50/80 border-blue-300 dark:bg-[#0d131f] dark:border-blue-500/40 text-slate-900 dark:text-slate-100 shadow-sm dark:shadow-none";
      verdictTitle.innerHTML = `<span class="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider font-semibold text-blue-700 dark:text-blue-400"><svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg> Rent & Invest Wins</span>`;
      verdictAmount.textContent = `+${formattedDelta}`;
      verdictAmount.className = "text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono tracking-tight text-blue-600 dark:text-blue-400 tabular-nums mt-1";
      verdictDesc.textContent = `S&P 500 portfolio outpaces home equity by ${formattedDelta} at Year ${horizonYears}.`;
      verdictDesc.className = "text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-2.5 leading-relaxed";
    }

    if (result.crossoverYear) {
      crossoverBadge.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-300 bg-amber-100/90 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 font-mono text-xs font-medium">
        <svg class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
        Crossover in Year ${result.crossoverYear}
      </span>`;
    } else {
      const leaderName = result.winner === "buy" ? "Buying" : "Renting";
      crossoverBadge.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
        No crossover (${leaderName} leads throughout)
      </span>`;
    }
  }

  function updateMilestones(result) {
    const container = document.getElementById("milestones-grid");
    if (!container) return;

    const targetYears = [5, 10, 20, 30].filter((y) => result.milestones[y]);
    if (targetYears.length === 0) {
      container.innerHTML = "";
      return;
    }

    let html = "";
    targetYears.forEach((yr) => {
      const m = result.milestones[yr];
      const buyLead = m.delta >= 0;
      const diffFormatted = formatCurrency(Math.abs(m.delta));
      html += `
        <div class="bg-white dark:bg-[#0d131f] border border-slate-200 dark:border-slate-800 rounded-lg p-3 sm:p-3.5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm dark:shadow-none">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-mono font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Year ${yr}</span>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded font-medium ${buyLead ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30" : "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"}">
              ${buyLead ? "Buy" : "Rent"} +${diffFormatted}
            </span>
          </div>
          <div class="space-y-1 font-mono text-xs tabular-nums">
            <div class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400 text-[11px]">Home:</span>
              <span class="text-slate-900 dark:text-slate-200 font-semibold">${formatCurrency(m.buyNetWorth)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400 text-[11px]">S&P:</span>
              <span class="text-slate-900 dark:text-slate-200 font-semibold">${formatCurrency(m.rentNetWorth)}</span>
            </div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  function updateBreakdown(result, params) {
    const outlayEl = document.getElementById("breakdown-outlay");
    const outlaySubEl = document.getElementById("breakdown-outlay-sub");
    const monthlyEl = document.getElementById("breakdown-monthly");
    const monthlySubEl = document.getElementById("breakdown-monthly-sub");
    const exitEl = document.getElementById("breakdown-exit");
    const exitSubEl = document.getElementById("breakdown-exit-sub");

    if (!outlayEl) return;

    // Upfront Outlay
    const totalOutlay = result.initialCosts.initialPortfolio;
    outlayEl.textContent = formatCurrency(totalOutlay);
    if (outlaySubEl) {
      outlaySubEl.textContent = `${formatCurrency(result.initialCosts.downPayment)} down + ${formatCurrency(result.initialCosts.buyerClosingCosts)} closing fees`;
    }

    // Monthly housing cost year 1
    const homePrice = Number(params.homePrice) || 450000;
    const monthlyHolding = (homePrice * (ANNUAL_PROPERTY_TAX_INSURANCE + ANNUAL_MAINTENANCE)) / 12.0;
    const totalMonthlyBuy = result.initialCosts.monthlyMortgagePi + monthlyHolding;
    const monthlyRent = Number(params.initialRent) || 2200;
    if (monthlyEl) {
      monthlyEl.textContent = `${formatCurrency(totalMonthlyBuy)}/mo vs ${formatCurrency(monthlyRent)}/mo`;
    }
    if (monthlySubEl) {
      const diff = totalMonthlyBuy - monthlyRent;
      if (diff > 0) {
        monthlySubEl.textContent = `Renting saves ${formatCurrency(diff)}/mo invested in S&P`;
      } else {
        monthlySubEl.textContent = `Buying saves ${formatCurrency(Math.abs(diff))}/mo over rent`;
      }
    }

    // Exit friction fee at horizon
    const horizonYearData = result.yearlyData[result.yearlyData.length - 1];
    if (horizonYearData && exitEl) {
      const exitFee = horizonYearData.homeValue * SELLER_CLOSING_FEE_PCT;
      exitEl.textContent = formatCurrency(exitFee);
      if (exitSubEl) {
        exitSubEl.textContent = `6.0% fee on ${formatCurrency(horizonYearData.homeValue)} home at Yr ${params.horizonYears}`;
      }
    }
  }

  function updateChartTheme(isDark) {
    if (!chartInstance) return;
    const gridColor = isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(226, 232, 240, 0.9)";
    const tickColor = "#64748b";
    const tooltipBg = isDark ? "#0d131f" : "#0f172a";
    const tooltipBorder = isDark ? "#1e293b" : "#e2e8f0";

    chartInstance.options.scales.x.grid.color = gridColor;
    chartInstance.options.scales.y.grid.color = gridColor;
    chartInstance.options.scales.x.ticks.color = tickColor;
    chartInstance.options.scales.y.ticks.color = tickColor;
    chartInstance.options.plugins.tooltip.backgroundColor = tooltipBg;
    chartInstance.options.plugins.tooltip.borderColor = tooltipBorder;
    chartInstance.update("none");
  }

  function updateChart(result) {
    const ctx = document.getElementById("trajectory-chart");
    if (!ctx) return;

    const labels = result.yearlyData.map((d) => `Y${d.year}`);
    const buyData = result.yearlyData.map((d) => d.buyNetWorth);
    const rentData = result.yearlyData.map((d) => d.rentNetWorth);

    if (chartInstance) {
      chartInstance.data.labels = labels;
      chartInstance.data.datasets[0].data = buyData;
      chartInstance.data.datasets[1].data = rentData;
      chartInstance.update("none"); // 60 FPS update mode
      return;
    }

    if (typeof Chart === "undefined") return;

    const isDark = document.documentElement.classList.contains("dark");
    const gridColor = isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(226, 232, 240, 0.9)";
    const tooltipBg = isDark ? "#0d131f" : "#0f172a";
    const tooltipBorder = isDark ? "#1e293b" : "#e2e8f0";

    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Home Equity (Net Exit)",
            data: buyData,
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.04)",
            borderWidth: 2,
            fill: true,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: "#10b981",
          },
          {
            label: "S&P 500 Portfolio",
            data: rentData,
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.04)",
            borderWidth: 2,
            fill: true,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: "#2563eb",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: tooltipBg,
            borderColor: tooltipBorder,
            borderWidth: 1,
            titleColor: "#f8fafc",
            titleFont: { family: "JetBrains Mono, monospace", size: 11 },
            bodyColor: "#cbd5e1",
            bodyFont: { family: "JetBrains Mono, monospace", size: 12 },
            padding: 10,
            boxPadding: 4,
            usePointStyle: true,
            callbacks: {
              label: function (context) {
                return ` ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: "#64748b", font: { family: "JetBrains Mono, monospace", size: 10 } },
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: "#64748b",
              font: { family: "JetBrains Mono, monospace", size: 10 },
              callback: function (val) {
                if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
                if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
                return `$${val}`;
              },
            },
          },
        },
      },
    });
  }

  function initThemeToggle() {
    const themeToggle = document.getElementById("theme-toggle");
    const sunIcon = document.getElementById("theme-icon-sun");
    const moonIcon = document.getElementById("theme-icon-moon");

    function updateIcons(isDark) {
      if (sunIcon && moonIcon) {
        if (isDark) {
          sunIcon.classList.remove("hidden");
          moonIcon.classList.add("hidden");
        } else {
          sunIcon.classList.add("hidden");
          moonIcon.classList.remove("hidden");
        }
      }
    }

    const initialDark = document.documentElement.classList.contains("dark");
    updateIcons(initialDark);

    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        const willBeDark = !document.documentElement.classList.contains("dark");
        if (willBeDark) {
          document.documentElement.classList.add("dark");
          localStorage.setItem("theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("theme", "light");
        }
        updateIcons(willBeDark);
        updateChartTheme(willBeDark);
      });
    }
  }

  function recalculateAndRender() {
    const params = getFormValues();
    const result = calculateComparison(params);
    updateHeroVerdict(result, params.horizonYears);
    updateMilestones(result);
    updateBreakdown(result, params);
    updateChart(result);
    updateUrlQuery(params);
  }

  window.addEventListener("DOMContentLoaded", () => {
    // Synchronize 5 core inputs
    syncPair("slider-price", "input-price");
    syncPair("slider-down", "input-down");
    syncPair("slider-rate", "input-rate");
    syncPair("slider-rent", "input-rent");
    syncPair("slider-sp", "input-sp");

    // Synchronize Horizon
    const horizonSlider = document.getElementById("slider-horizon");
    const horizonInput = document.getElementById("input-horizon");
    if (horizonSlider && horizonInput) {
      horizonSlider.addEventListener("input", () => {
        horizonInput.value = horizonSlider.value;
        recalculateAndRender();
      });
      horizonInput.addEventListener("input", () => {
        horizonSlider.value = horizonInput.value;
        recalculateAndRender();
      });
    }

    // Horizon Presets (5 Years vs 30 Years)
    const preset5 = document.getElementById("preset-5yr");
    const preset30 = document.getElementById("preset-30yr");
    if (preset5) {
      preset5.addEventListener("click", () => {
        if (horizonSlider) horizonSlider.value = 5;
        if (horizonInput) horizonInput.value = 5;
        recalculateAndRender();
      });
    }
    if (preset30) {
      preset30.addEventListener("click", () => {
        if (horizonSlider) horizonSlider.value = 30;
        if (horizonInput) horizonInput.value = 30;
        recalculateAndRender();
      });
    }

    // Share / Copy Link Button
    const shareBtn = document.getElementById("share-btn");
    const shareToast = document.getElementById("share-toast");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
          if (shareToast) {
            shareToast.classList.remove("opacity-0", "pointer-events-none");
            setTimeout(() => {
              shareToast.classList.add("opacity-0", "pointer-events-none");
            }, 2000);
          }
        });
      });
    }

    // Initialize theme switcher
    initThemeToggle();

    // Initial render
    recalculateAndRender();
  });
}

// Module export for Node.js test runner
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    calculateComparison,
    ANNUAL_APPRECIATION,
    ANNUAL_RENT_INFLATION,
    ANNUAL_PROPERTY_TAX_INSURANCE,
    ANNUAL_MAINTENANCE,
    BUYER_CLOSING_COST_PCT,
    SELLER_CLOSING_FEE_PCT,
  };
}
