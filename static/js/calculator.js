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
      verdictBanner.className = "p-6 rounded-2xl border transition-all duration-300 bg-emerald-950/30 border-emerald-500/30 text-emerald-100 shadow-lg shadow-emerald-950/20";
      verdictTitle.innerHTML = `<span class="inline-flex items-center gap-2"><svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> Buying Wins</span>`;
      verdictAmount.textContent = `+${formattedDelta}`;
      verdictAmount.className = "text-4xl font-extrabold tracking-tight text-emerald-400";
      verdictDesc.textContent = `Homeowner net worth exceeds renter portfolio by ${formattedDelta} at Year ${horizonYears}.`;
    } else {
      verdictBanner.className = "p-6 rounded-2xl border transition-all duration-300 bg-indigo-950/30 border-indigo-500/30 text-indigo-100 shadow-lg shadow-indigo-950/20";
      verdictTitle.innerHTML = `<span class="inline-flex items-center gap-2"><svg class="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg> Renting & Investing Wins</span>`;
      verdictAmount.textContent = `+${formattedDelta}`;
      verdictAmount.className = "text-4xl font-extrabold tracking-tight text-indigo-400";
      verdictDesc.textContent = `S&P 500 portfolio outpaces home equity by ${formattedDelta} at Year ${horizonYears}.`;
    }

    if (result.crossoverYear) {
      crossoverBadge.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
        Crossover in Year ${result.crossoverYear}
      </span>`;
    } else {
      const leaderName = result.winner === "buy" ? "Buying" : "Renting";
      crossoverBadge.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
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
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Year ${yr}</span>
            <span class="text-xs px-2 py-0.5 rounded font-medium ${buyLead ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"}">
              ${buyLead ? "Buy" : "Rent"} +${diffFormatted}
            </span>
          </div>
          <div class="space-y-1.5 text-xs text-slate-300">
            <div class="flex justify-between">
              <span class="text-slate-400">Home Equity:</span>
              <span class="font-medium text-slate-200">${formatCurrency(m.buyNetWorth)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">S&P Portfolio:</span>
              <span class="font-medium text-slate-200">${formatCurrency(m.rentNetWorth)}</span>
            </div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  function updateChart(result) {
    const ctx = document.getElementById("trajectory-chart");
    if (!ctx) return;

    const labels = result.yearlyData.map((d) => `Yr ${d.year}`);
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

    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Home Equity (Net Exit)",
            data: buyData,
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            borderWidth: 2.5,
            fill: true,
            tension: 0.25,
            pointRadius: 2,
            pointHoverRadius: 6,
            pointBackgroundColor: "#10b981",
          },
          {
            label: "S&P 500 Portfolio",
            data: rentData,
            borderColor: "#6366f1",
            backgroundColor: "rgba(99, 102, 241, 0.08)",
            borderWidth: 2.5,
            fill: true,
            tension: 0.25,
            pointRadius: 2,
            pointHoverRadius: 6,
            pointBackgroundColor: "#6366f1",
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
            position: "top",
            labels: {
              color: "#94a3b8",
              font: { family: "system-ui", size: 12, weight: "500" },
              boxWidth: 14,
              boxHeight: 14,
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          tooltip: {
            backgroundColor: "#0f172a",
            borderColor: "#334155",
            borderWidth: 1,
            titleColor: "#f8fafc",
            bodyColor: "#cbd5e1",
            padding: 12,
            boxPadding: 6,
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
            grid: { color: "rgba(51, 65, 85, 0.3)" },
            ticks: { color: "#64748b", font: { size: 11 } },
          },
          y: {
            grid: { color: "rgba(51, 65, 85, 0.3)" },
            ticks: {
              color: "#64748b",
              font: { size: 11 },
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

  function recalculateAndRender() {
    const params = getFormValues();
    const result = calculateComparison(params);
    updateHeroVerdict(result, params.horizonYears);
    updateMilestones(result);
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
