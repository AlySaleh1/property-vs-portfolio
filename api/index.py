import os
import sys
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from flask import Flask, render_template, request, jsonify

try:
    from api.calculator import calculate_comparison
except ModuleNotFoundError:
    from calculator import calculate_comparison

TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = Flask(
    __name__,
    template_folder=TEMPLATE_DIR,
    static_folder=STATIC_DIR,
)


def parse_params(source: dict) -> dict:
    """Extracts and validates calculator inputs from dict / query string."""
    def get_float(keys, default):
        for k in keys:
            if k in source and source[k] is not None:
                try:
                    return float(source[k])
                except (ValueError, TypeError):
                    pass
        return default

    def get_int(keys, default):
        for k in keys:
            if k in source and source[k] is not None:
                try:
                    return int(float(source[k]))
                except (ValueError, TypeError):
                    pass
        return default

    return {
        "home_price": get_float(["home_price", "price"], 450000.0),
        "down_payment_pct": get_float(["down_payment_pct", "down"], 20.0),
        "mortgage_rate": get_float(["mortgage_rate", "rate"], 6.5),
        "initial_rent": get_float(["initial_rent", "rent"], 2200.0),
        "sp500_return": get_float(["sp500_return", "sp"], 8.0),
        "horizon_years": get_int(["horizon_years", "horizon"], 30),
    }


@app.route("/", methods=["GET"])
def index():
    """Renders the single-page calculator pre-hydrated with URL query parameters."""
    params = parse_params(request.args)
    result = calculate_comparison(
        home_price=params["home_price"],
        down_payment_pct=params["down_payment_pct"],
        mortgage_rate=params["mortgage_rate"],
        initial_rent=params["initial_rent"],
        sp500_return=params["sp500_return"],
        horizon_years=params["horizon_years"],
    )
    return render_template(
        "index.html",
        initial_params=params,
        initial_result=result,
        initial_result_json=json.dumps(result),
    )


@app.route("/api/calculate", methods=["GET", "POST"])
def api_calculate():
    """JSON API endpoint for calculation."""
    if request.method == "POST":
        source = request.get_json(silent=True) or request.form.to_dict()
    else:
        source = request.args.to_dict()

    params = parse_params(source)
    result = calculate_comparison(
        home_price=params["home_price"],
        down_payment_pct=params["down_payment_pct"],
        mortgage_rate=params["mortgage_rate"],
        initial_rent=params["initial_rent"],
        sp500_return=params["sp500_return"],
        horizon_years=params["horizon_years"],
    )
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
