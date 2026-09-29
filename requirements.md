# Project Requirements

## Goal
An interactive, single-page financial calculator that answers whether purchasing a property or renting and investing the difference in the S&P 500 yields a higher net worth. The tool models wealth trajectories over a default 30-year horizon—with an adjustable 5- to 30-year timeline and quick presets—providing an intuitive, transparent comparison grounded in accessible financial literacy.

## Core Features
* **Simplified Parameter Controls (5 Core Inputs + Horizon)**: Sliders synchronized with numeric inputs:
  1. **Target Home Price** (e.g., $450,000)
  2. **Down Payment Percentage** (e.g., 20%)
  3. **30-Year Fixed Mortgage Interest Rate** (e.g., 6.5%)
  4. **Initial Monthly Rent** (e.g., $2,200)
  5. **Expected S&P 500 Annual Return** (e.g., 8.0%)
  6. **Analysis Time Horizon** (5 to 30 years, defaulting to 30 years with quick toggles for "5 Years" and "30 Years")
* **Fixed Market Assumptions (No UI Clutter)**: Hardcoded standard constants under the hood:
  * Annual Home Appreciation Rate: 3.5%
  * Annual Rent Inflation Rate: 3.0%
  * Annual Property Tax & Homeowners Insurance: 1.5% of home value
  * Annual Home Maintenance & Repairs: 1.0% of home value
  * Buyer Closing Costs: 3.0% of purchase price
  * Seller Closing & Broker Fees: 6.0% of exit home value
* **Dynamic Net Worth Trajectory Visualization**: An interactive Chart.js line graph displaying yearly net worth curves up to the selected horizon:
  * **Buying Path**: Net Home Equity at Year $N$ ($\text{Property Market Value} - \text{Remaining Mortgage Balance} - \text{Seller Closing Fees}$). Note that mortgage principal reaches $0$ at Year 30, reducing monthly costs to taxes, insurance, and maintenance.
  * **Renting & Investing Path**: S&P 500 Portfolio Value compounding the initial down payment and closing cost savings, plus/minus monthly cash flow deltas ($\text{Monthly Cost to Buy} - \text{Monthly Rent}$). If monthly rent exceeds homeownership cost in later years, the monthly deficit is withdrawn from the portfolio balance (floored at $0$).
* **Outcome Summary & Milestone Metrics**: High-contrast summary cards spotlighting:
  * Final Net Worth Delta at the selected horizon (e.g., "Buying wins by $X" or "Renting & Investing wins by $Y")
  * Breakeven / Crossover Year (the year where buying overtakes renting, or vice versa)
  * Intermediate milestone snapshots (Year 5, Year 10, Year 20, Year 30, dynamically displayed up to the selected horizon)
* **Stateless URL Sharing**: Automatically encodes the 5 core inputs and horizon into URL query parameters so scenarios can be bookmarked or shared instantly without accounts or databases.

## Tech Stack
* **Backend**: Python 3.11+, Flask WSGI deployed as a Vercel Serverless Function (`api/index.py`)
* **Frontend**: Jinja2 HTML templates, Tailwind CSS (via CDN), Chart.js (via CDN), and vanilla JavaScript
* **Logic Engine**: Dual-engine architecture with automated parity testing:
  * Client-side JavaScript (`static/js/calculator.js`) for zero-latency, 60 FPS slider recalculations
  * Python backend module (`api/index.py` / `api/calculator.py`) providing a unit-tested API endpoint (`/api/calculate`) and server-rendered initial state
  * Parity test suite ensuring both engines yield matching numbers for any scenario
* **Hosting & Deployment**: Vercel (Hobby Tier serverless configuration via `vercel.json`)

## Constraints
* **Simplicity First**: Strictly 5 core sliders + horizon timeline. Zero advanced/secondary input clutter in the UI.
* **Stateless Architecture**: Zero databases, user authentication, or persistent server-side sessions. All state lives in memory or URL parameters.
* **Calculation Transparency**: Financial calculations remain nominal pre-tax dollars. Multi-bracket IRS deductions and capital gains complexities are explicit non-goals.
* **Performance**: Slider movements must recalculate and update the Chart.js visual canvas in sub-16ms client-side execution.
* **Zero External Paid APIs**: All computations are performed mathematically using the input parameters and hardcoded market constants.
