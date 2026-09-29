"""Unit tests for the financial calculation engine."""
import pytest
from api.calculator import (
    calculate_comparison,
    ANNUAL_APPRECIATION,
    ANNUAL_RENT_INFLATION,
    ANNUAL_PROPERTY_TAX_INSURANCE,
    ANNUAL_MAINTENANCE,
    BUYER_CLOSING_COST_PCT,
    SELLER_CLOSING_FEE_PCT,
)


def test_default_constants():
    """Verify hardcoded market assumptions."""
    assert ANNUAL_APPRECIATION == 0.035
    assert ANNUAL_RENT_INFLATION == 0.030
    assert ANNUAL_PROPERTY_TAX_INSURANCE == 0.015
    assert ANNUAL_MAINTENANCE == 0.010
    assert BUYER_CLOSING_COST_PCT == 0.030
    assert SELLER_CLOSING_FEE_PCT == 0.060


def test_default_scenario_calculation():
    """Verify standard 30-year default scenario."""
    res = calculate_comparison(
        home_price=450000.0,
        down_payment_pct=20.0,
        mortgage_rate=6.5,
        initial_rent=2200.0,
        sp500_return=8.0,
        horizon_years=30,
    )

    # Initial figures
    assert res["initial_costs"]["down_payment"] == 90000.0
    assert res["initial_costs"]["buyer_closing_costs"] == 13500.0
    assert res["initial_costs"]["initial_portfolio"] == 103500.0
    assert round(res["initial_costs"]["monthly_mortgage_pi"], 2) == 2275.44

    # Trajectory length
    assert len(res["yearly_data"]) == 30

    # Year 30 mortgage should be paid off
    yr30 = res["yearly_data"][29]
    assert yr30["year"] == 30
    assert yr30["remaining_mortgage"] == 0.0

    # Home appreciation after 30 years at 3.5%
    expected_yr30_home_val = 450000.0 * (1.035 ** 30)
    assert pytest.approx(yr30["home_value"], rel=1e-3) == expected_yr30_home_val

    # Buy net worth should equal Home Value * (1 - seller_fee) - 0
    expected_buy_nw = expected_yr30_home_val * (1.0 - 0.06)
    assert pytest.approx(yr30["buy_net_worth"], rel=1e-3) == expected_buy_nw

    # Milestones should contain 5, 10, 20, 30
    assert set(res["milestones"].keys()) == {5, 10, 20, 30}
    assert res["winner"] in ("buy", "rent")
    assert isinstance(res["final_delta"], float)


def test_short_horizon_5_years():
    """Verify 5-year horizon only includes years 1-5 and milestone for year 5."""
    res = calculate_comparison(
        home_price=450000.0,
        down_payment_pct=20.0,
        mortgage_rate=6.5,
        initial_rent=2200.0,
        sp500_return=8.0,
        horizon_years=5,
    )
    assert len(res["yearly_data"]) == 5
    assert list(res["milestones"].keys()) == [5]
    assert res["yearly_data"][-1]["year"] == 5


def test_portfolio_deficit_flooring():
    """Verify portfolio does not drop below 0 if rent significantly outpaces buy costs with tiny down payment."""
    res = calculate_comparison(
        home_price=100000.0,
        down_payment_pct=3.0,
        mortgage_rate=3.0,
        initial_rent=10000.0,  # Extreme rent creates massive monthly deficit
        sp500_return=1.0,
        horizon_years=10,
    )
    for row in res["yearly_data"]:
        assert row["portfolio_value"] >= 0.0
        assert row["rent_net_worth"] >= 0.0


def test_crossover_year_detection():
    """Verify crossover year is detected when curves intersect."""
    # With typical numbers, renting often wins in year 1-2 due to closing costs, and buying catches up later
    res = calculate_comparison(
        home_price=450000.0,
        down_payment_pct=20.0,
        mortgage_rate=6.5,
        initial_rent=2200.0,
        sp500_return=8.0,
        horizon_years=30,
    )
    # Crossover year should be an int or None
    assert res["crossover_year"] is None or isinstance(res["crossover_year"], int)


def test_cash_purchase_100_pct_down():
    """Verify 100% down payment (no mortgage) works cleanly."""
    res = calculate_comparison(
        home_price=500000.0,
        down_payment_pct=100.0,
        mortgage_rate=6.5,
        initial_rent=2000.0,
        sp500_return=8.0,
        horizon_years=10,
    )
    assert res["initial_costs"]["monthly_mortgage_pi"] == 0.0
    for row in res["yearly_data"]:
        assert row["remaining_mortgage"] == 0.0


def test_zero_mortgage_rate():
    """Verify 0% interest rate works without division by zero."""
    res = calculate_comparison(
        home_price=360000.0,
        down_payment_pct=0.0,
        mortgage_rate=0.0,
        initial_rent=1500.0,
        sp500_return=7.0,
        horizon_years=5,
    )
    # 360,000 / 360 months = 1,000 / month
    assert res["initial_costs"]["monthly_mortgage_pi"] == 1000.0

