# 5-Year "Rent & Invest" vs. "Buy Home" Delta Calculator

## 1. High Concept & "The One Job"
A hyper-focused, single-purpose financial tool that cuts through 30-year mortgage noise and answers one specific question:
> **"If I plan to move or sell in 3–5 years, will my net worth be higher by buying a home, or by renting and investing the down payment in index funds?"**

Most traditional calculators assume a 30-year horizon, hiding the massive early drag of transaction friction (closing costs, agent fees, HOA, property taxes, front-loaded mortgage interest). This tool spotlights the exact **Net Worth Delta** and crossover point over short horizons (1 to 7 years).

---

## 2. Technical Stack & Vercel Architecture

* **Backend:** Python 3.11+, Flask (WSGI app exposed as a Vercel Serverless Function via `api/index.py`)
* **Frontend:** Jinja2 templates, Tailwind CSS (via CDN), Chart.js (via CDN for net worth trajectory)
* **Storage:** Stateless (input state preserved via URL query parameters for instant link sharing)
* **Hosting:** Vercel (Hobby Tier, 0 configuration serverless deployment)

### Target File Structure
```text
.
├── api/
│   └── index.py            # Entry point for Vercel serverless function
├── templates/
│   └── index.html          # Clean, responsive single-page UI with dynamic sliders
├── static/
│   ├── css/
│   └── js/
│       └── calculator.js   # Client-side dynamic updates and Chart.js integration
├── requirements.txt        # Flask, etc.
├── vercel.json             # Vercel routing configuration
└── README.md
```

---

## 3. Core Financial Logic & Formulas

### Scenario A: Buying
1. **Initial Outlay:**
   $$\text{Cash Out} = \text{Down Payment} + \text{Buyer Closing Costs (approx. 2–4\%)}$$
2. **Monthly Expenses:**
   $$\text{Monthly Cost} = \text{Mortgage P&I} + \text{Property Tax} + \text{Homeowners Insurance} + \text{HOA} + \text{Maintenance (1\%/yr)}$$
3. **Net Worth at Year $N$ (Exit):**
   $$\text{Home Value}_N = \text{Home Price} \times (1 + g)^N$$
   $$\text{Remaining Debt}_N = \text{Amortized Balance at month } 12N$$
   $$\text{Net Proceeds} = \text{Home Value}_N - \text{Remaining Debt}_N - \text{Seller Closing/Agent Fees (approx. 6–8\%)}$$
   $$\text{Net Worth (Buy)} = \text{Net Proceeds}$$

### Scenario B: Renting & Investing the Difference
1. **Initial Portfolio:**
   $$\text{Portfolio}_0 = \text{Buyer Closing Costs} + \text{Down Payment}$$
2. **Monthly Cashflow Delta:**
   $$\Delta_m = \text{Monthly Cost (Buy)} - \text{Monthly Rent}_m$$
   * If $\Delta_m > 0$: The surplus is invested monthly into the S&P 500 index fund at expected annual return $r$ (e.g., 8–10%).
   * If $\Delta_m < 0$: The deficit is drawn from investment earnings.
3. **Net Worth at Year $N$:**
   $$\text{Net Worth (Rent)} = \text{Future Value of Portfolio}_0 + \text{Future Value of Monthly Additions } \Delta_m$$

### The Output Metric:
$$\text{Delta}_N = \text{Net Worth (Buy)}_N - \text{Net Worth (Rent)}_N$$
* Visual badge: **"Buying wins by \$X"** or **"Renting & Investing wins by \$Y"** at Year 3 and Year 5.

---

## 4. Key Inputs & Default Parameters

| Input Parameter | Default Value | Notes |
|---|---|---|
| **Target Home Price** | $450,000 | Sliders with synced numeric inputs |
| **Down Payment %** | 20% | Computes initial cash outlay |
| **Mortgage Rate** | 6.5% | 30-year fixed |
| **Monthly Rent** | $2,200 | Comparable rental cost |
| **Rent Annual Inflation** | 3.0% | Annual rent increase |
| **Home Appreciation Rate** | 3.5% | Historical average |
| **Stock Market Return** | 8.0% | S&P 500 average annual return |
| **Seller Agent/Closing Fee** | 6.0% | Crucial friction factor on short-term sales |
| **Property Tax & Insurance** | 1.5% / yr | Local escrow |

---

## 5. 5-Hour Build & Deployment Plan

### Hour 1: Core Financial Engine & Unit Tests
- Set up virtual environment and install dependencies (`flask`).
- Implement the amortization schedule and investment compound calculator module.
- Write unit tests verifying edge cases (e.g. 0% appreciation, high market returns).

### Hour 2: Flask Routing & API Endpoints
- Create Flask app with two endpoints:
  - `GET /`: Renders UI with query-param presets.
  - `POST /api/calculate` (or `GET /api/calculate`): Returns yearly comparison JSON and crossover year.
- Set up Jinja2 base templates.

### Hour 3: UI & Interactive Visualizations
- Build clean dashboard using Tailwind CSS:
  - Left column: Input controls (sliders + clean number inputs).
  - Right column: Summary cards ("Year 3 Delta", "Year 5 Delta", "Crossover Year").
- Add Chart.js line graph showing 10-year trajectory comparing both net worth curves.

### Hour 4: Vercel Configuration & Polish
- Add `vercel.json` and adjust `api/index.py` for Vercel's serverless WSGI bridge.
- Add "Share Scenario" button (serializes current inputs into URL hash/query).
- Mobile responsiveness and input validation (prevent NaN / negative values).

### Hour 5: Deployment, Testing & Documentation
- Test production build locally using `vercel dev` or WSGI runner.
- Deploy to Vercel via CLI (`vercel --prod`) or GitHub integration.
- Verify live SSL URL and audit page performance.
