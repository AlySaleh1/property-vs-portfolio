"""Parity tests between Python and JavaScript financial calculation engines."""
import json
import subprocess
import pytest
from api.calculator import calculate_comparison

JS_CALCULATOR_PATH = "static/js/calculator.js"


def run_js_calculator(params):
    """Executes the JS calculator in Node.js and returns parsed JSON output."""
    js_code = f"""
    const {{ calculateComparison }} = require('./{JS_CALCULATOR_PATH}');
    const params = {json.dumps(params)};
    const result = calculateComparison(params);
    console.log(JSON.stringify(result));
    """
    res = subprocess.run(
        ["node", "-e", js_code],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(res.stdout)


@pytest.mark.parametrize(
    "params",
    [
        {
            "homePrice": 450000.0,
            "downPaymentPct": 20.0,
            "mortgageRate": 6.5,
            "initialRent": 2200.0,
            "sp500Return": 8.0,
            "horizonYears": 30,
        },
        {
            "homePrice": 300000.0,
            "downPaymentPct": 10.0,
            "mortgageRate": 7.0,
            "initialRent": 1800.0,
            "sp500Return": 10.0,
            "horizonYears": 5,
        },
        {
            "homePrice": 1200000.0,
            "downPaymentPct": 25.0,
            "mortgageRate": 5.5,
            "initialRent": 4500.0,
            "sp500Return": 7.5,
            "horizonYears": 20,
        },
        {
            "homePrice": 250000.0,
            "downPaymentPct": 5.0,
            "mortgageRate": 6.0,
            "initialRent": 3500.0,
            "sp500Return": 6.0,
            "horizonYears": 15,
        },
    ],
)
def test_python_js_parity(params):
    """Verify parity between Python and JS calculation engines across multiple vectors."""
    py_result = calculate_comparison(
        home_price=params["homePrice"],
        down_payment_pct=params["downPaymentPct"],
        mortgage_rate=params["mortgageRate"],
        initial_rent=params["initialRent"],
        sp500_return=params["sp500Return"],
        horizon_years=params["horizonYears"],
    )
    js_result = run_js_calculator(params)

    # Winner & crossover match
    assert py_result["winner"] == js_result["winner"]
    assert py_result["crossover_year"] == js_result["crossoverYear"]
    assert pytest.approx(py_result["final_delta"], abs=1.0) == js_result["finalDelta"]

    # Trajectory match
    assert len(py_result["yearly_data"]) == len(js_result["yearlyData"])
    for py_row, js_row in zip(py_result["yearly_data"], js_result["yearlyData"]):
        assert py_row["year"] == js_row["year"]
        assert pytest.approx(py_row["buy_net_worth"], abs=1.0) == js_row["buyNetWorth"]
        assert pytest.approx(py_row["rent_net_worth"], abs=1.0) == js_row["rentNetWorth"]
        assert pytest.approx(py_row["delta"], abs=1.0) == js_row["delta"]
        assert pytest.approx(py_row["home_value"], abs=1.0) == js_row["homeValue"]
        assert pytest.approx(py_row["remaining_mortgage"], abs=1.0) == js_row["remainingMortgage"]
