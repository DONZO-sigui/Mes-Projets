from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "running"
    assert "GNF-Token" in data["service"]


def test_health():
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_health_db_returns_json():
    resp = client.get("/api/v1/health/db")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "database" in data
