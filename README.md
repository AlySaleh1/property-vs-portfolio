# Property vs Portfolio

An interactive, high-performance financial calculator comparing the wealth trajectory of purchasing a home versus renting and investing the down payment and monthly cashflow deltas into the S&P 500 over a 5- to 30-year horizon.

## Key Features

- **5 Core Sliders**: Home Price, Down Payment %, Mortgage Interest Rate, Monthly Rent, S&P 500 Return.
- **Horizon Range**: Adjustable from 5 to 30 years with quick toggles for 5-Year Moves and 30-Year Full Horizons.
- **Underlying Market Assumptions**: Realistic defaults baked into the engine:
  - 3.5% Home Appreciation Rate
  - 3.0% Rent Inflation Rate
  - 1.5% Property Tax & Insurance
  - 1.0% Maintenance & Repairs
  - 3.0% Buyer Closing Costs
  - 6.0% Seller Exit & Broker Fees
- **Dynamic Chart.js Visualization**: Real-time 60 FPS trajectory lines comparing liquidated Home Equity vs. Compounded S&P 500 Portfolio.
- **Key Milestones**: Snapshot net worth deltas at Years 5, 10, 20, and 30.
- **Stateless URL Sharing**: Inputs automatically encode to query parameters for 1-click scenario bookmarking and sharing.
- **Dual Engine Architecture with Guaranteed Parity**: Sub-16ms client-side evaluation alongside a unit-tested Python backend.

---

## Local Development

### 1. Prerequisites
- Python 3.9+
- Node.js 18+ (for parity tests)

### 2. Setup Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Run Locally
```bash
python api/index.py
```
Visit `http://localhost:5001` in your browser.

---

## Test Suite

Run the full pytest suite (including financial logic tests, route integration tests, and Python/JS parity validation):
```bash
source .venv/bin/activate
pytest -v
```

---

## Vercel Deployment

Configured for zero-config serverless deployment via `vercel.json`:
```bash
vercel --prod
```
