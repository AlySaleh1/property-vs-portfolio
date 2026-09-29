"""Route integration tests for the Flask serverless application."""
import json
import pytest
from api.index import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_api_calculate_post(client):
    """Test POST /api/calculate with JSON payload."""
    payload = {
        "home_price": 500000,
        "down_payment_pct": 20,
        "mortgage_rate": 6.5,
        "initial_rent": 2500,
        "sp500_return": 8.0,
        "horizon_years": 30,
    }
    response = client.post(
        "/api/calculate",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "yearly_data" in data
    assert "winner" in data
    assert "final_delta" in data
    assert len(data["yearly_data"]) == 30


def test_api_calculate_get(client):
    """Test GET /api/calculate with query string parameters."""
    response = client.get("/api/calculate?home_price=400000&horizon_years=10")
    assert response.status_code == 200
    data = response.get_json()
    assert len(data["yearly_data"]) == 10
    assert data["initial_costs"]["down_payment"] == 80000.0


def test_index_get_default(client):
    """Test GET / returns 200 and renders HTML."""
    response = client.get("/")
    assert response.status_code == 200
    assert b"Property vs Portfolio" in response.data or b"Rent vs. Buy" in response.data


def test_index_get_with_query_params(client):
    """Test GET / properly parses URL query params into initial state."""
    response = client.get("/?price=550000&down=15&rate=6.0&rent=2400&sp=9.0&horizon=20")
    assert response.status_code == 200
    html = response.data.decode("utf-8")
    assert "550000" in html
