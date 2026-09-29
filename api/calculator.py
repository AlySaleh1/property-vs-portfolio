"""Financial calculation engine for Property vs Portfolio comparison."""
from typing import Dict, Any, List, Optional
import math

# Fixed market assumptions
ANNUAL_APPRECIATION = 0.035
ANNUAL_RENT_INFLATION = 0.030
ANNUAL_PROPERTY_TAX_INSURANCE = 0.015
ANNUAL_MAINTENANCE = 0.010
BUYER_CLOSING_COST_PCT = 0.030
SELLER_CLOSING_FEE_PCT = 0.060


def calculate_comparison(
    home_price: float = 450000.0,
    down_payment_pct: float = 20.0,
    mortgage_rate: float = 6.5,
    initial_rent: float = 2200.0,
    sp500_return: float = 8.0,
    horizon_years: int = 30,
) -> Dict[str, Any]:
    """
    Computes yearly net worth trajectories comparing buying a home vs
    renting and investing the down payment and monthly cashflow deltas into the S&P 500.
    """
    # Normalize percentage inputs (accept either 20.0 or 0.20)
    d_pct = down_payment_pct / 100.0 if down_payment_pct > 1.0 else down_payment_pct
    m_rate = mortgage_rate / 100.0 if mortgage_rate > 1.0 else mortgage_rate
    sp_rate = sp500_return / 100.0 if sp500_return > 1.0 else sp500_return
    horizon = max(1, min(30, int(horizon_years)))

    # Initial figures
    down_payment = home_price * d_pct
    buyer_closing_costs = home_price * BUYER_CLOSING_COST_PCT
    initial_portfolio = down_payment + buyer_closing_costs
    loan_principal = max(0.0, home_price - down_payment)

    # Monthly mortgage payment (30-year fixed)
    monthly_mortgage_rate = m_rate / 12.0
    num_mortgage_months = 360

    if loan_principal > 0:
        if monthly_mortgage_rate > 0:
            factor = (1.0 + monthly_mortgage_rate) ** num_mortgage_months
            monthly_pi = loan_principal * (monthly_mortgage_rate * factor) / (factor - 1.0)
        else:
            monthly_pi = loan_principal / num_mortgage_months
    else:
        monthly_pi = 0.0

    # Stock market monthly effective rate
    monthly_sp_rate = ((1.0 + sp_rate) ** (1.0 / 12.0)) - 1.0

    # Simulation state
    remaining_loan = loan_principal
    portfolio = initial_portfolio
    yearly_data: List[Dict[str, Any]] = []

    total_months = horizon * 12
    for m in range(1, total_months + 1):
        # 1. Mortgage amortization
        if m <= num_mortgage_months and remaining_loan > 0:
            monthly_interest = remaining_loan * monthly_mortgage_rate
            monthly_principal = min(remaining_loan, max(0.0, monthly_pi - monthly_interest))
            remaining_loan = max(0.0, remaining_loan - monthly_principal)
            active_pi = monthly_pi
        else:
            remaining_loan = 0.0
            active_pi = 0.0

        # 2. Current home value and monthly holding costs
        home_val = home_price * ((1.0 + ANNUAL_APPRECIATION) ** (m / 12.0))
        monthly_holding = home_val * ((ANNUAL_PROPERTY_TAX_INSURANCE + ANNUAL_MAINTENANCE) / 12.0)
        monthly_buy_cost = active_pi + monthly_holding

        # 3. Monthly rent
        year_idx = (m - 1) // 12
        monthly_rent = initial_rent * ((1.0 + ANNUAL_RENT_INFLATION) ** year_idx)

        # 4. Cashflow delta and portfolio compounding
        delta_m = monthly_buy_cost - monthly_rent
        portfolio = max(0.0, portfolio * (1.0 + monthly_sp_rate) + delta_m)

        # 5. Check if year boundary reached
        if m % 12 == 0:
            year_num = m // 12
            # Net Home Equity = Exit Market Value - Seller Fees - Remaining Mortgage
            seller_fees = home_val * SELLER_CLOSING_FEE_PCT
            buy_nw = home_val - seller_fees - remaining_loan
            rent_nw = portfolio

            yearly_data.append({
                "year": year_num,
                "buy_net_worth": round(buy_nw, 2),
                "rent_net_worth": round(rent_nw, 2),
                "delta": round(buy_nw - rent_nw, 2),
                "home_value": round(home_val, 2),
                "remaining_mortgage": round(remaining_loan, 2),
                "monthly_buy_cost": round(monthly_buy_cost, 2),
                "monthly_rent": round(monthly_rent, 2),
                "portfolio_value": round(portfolio, 2),
            })

    # Summary metrics
    final_point = yearly_data[-1] if yearly_data else {}
    final_buy_nw = final_point.get("buy_net_worth", 0.0)
    final_rent_nw = final_point.get("rent_net_worth", 0.0)
    final_delta = round(final_buy_nw - final_rent_nw, 2)
    winner = "buy" if final_delta >= 0 else "rent"

    # Detect crossover year (first year where leader flips)
    crossover_year: Optional[int] = None
    if yearly_data:
        initial_lead = "buy" if yearly_data[0]["delta"] >= 0 else "rent"
        for pt in yearly_data[1:]:
            current_lead = "buy" if pt["delta"] >= 0 else "rent"
            if current_lead != initial_lead:
                crossover_year = pt["year"]
                break

    # Milestones (5, 10, 20, 30 if <= horizon)
    milestones: Dict[int, Dict[str, Any]] = {}
    for target_yr in [5, 10, 20, 30]:
        if target_yr <= horizon and target_yr <= len(yearly_data):
            milestones[target_yr] = yearly_data[target_yr - 1]

    return {
        "yearly_data": yearly_data,
        "final_delta": final_delta,
        "winner": winner,
        "crossover_year": crossover_year,
        "milestones": milestones,
        "initial_costs": {
            "down_payment": round(down_payment, 2),
            "buyer_closing_costs": round(buyer_closing_costs, 2),
            "initial_portfolio": round(initial_portfolio, 2),
            "monthly_mortgage_pi": round(monthly_pi, 2),
        },
    }
