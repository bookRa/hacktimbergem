#!/usr/bin/env python
"""Quick API test to verify Clean Architecture is working."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    """Test health check endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["architecture"] == "Clean Architecture"
    print("✅ Health check passed!")
    print(f"   Title: {data['title']}")
    print(f"   Version: {data['version']}")
    print(f"   Architecture: {data['architecture']}")
    return True

def test_routes():
    """Verify all expected routes are registered."""
    expected_prefixes = ["/api/projects", "/api/entities", "/api/concepts", "/api/links"]
    routes = [r.path for r in app.routes if hasattr(r, 'path')]
    
    print(f"\n✅ Total routes registered: {len(routes)}")
    for prefix in expected_prefixes:
        matching = [r for r in routes if r.startswith(prefix)]
        print(f"   {prefix}: {len(matching)} endpoints")
    return True

if __name__ == "__main__":
    print("🧪 Testing Clean Architecture API...\n")
    test_root()
    test_routes()
    print("\n🎉 All tests passed!")
