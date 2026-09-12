"""VidyaGPT backend API tests."""
import os
import time
import uuid
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://vidya-qa-platform.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@vidyagpt.com"
ADMIN_PASS = "zvZCkbQei9Lcs73c6II01RrV"

SAMPLE_DOC = (
    "Admissions require 60% in 12th standard for BTech program. "
    "Fees are Rs 50000 per semester. The BTech program spans 8 semesters. "
    "Hostel accommodation is available for outstation students at Rs 15000 per semester."
)


# ------------------ Fixtures ------------------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def property_id(admin_headers):
    """Create a college for tests, return DB id."""
    pid_str = f"TEST_{uuid.uuid4().hex[:8]}"
    r = requests.post(f"{API}/properties",
                      headers=admin_headers,
                      json={"name": "TEST College", "alias": "TCOL", "property_id": pid_str},
                      timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    yield data["id"]
    # cleanup
    requests.delete(f"{API}/properties/{data['id']}", headers=admin_headers, timeout=30)


@pytest.fixture(scope="session")
def uploaded_doc(admin_headers, property_id):
    files = {"file": ("sample.txt", SAMPLE_DOC.encode(), "text/plain")}
    data = {"property_id": property_id}
    r = requests.post(f"{API}/documents/upload", headers=admin_headers, files=files, data=data, timeout=60)
    assert r.status_code == 200, r.text
    return r.json()


# ------------------ Auth ------------------
class TestAuth:
    def test_login_admin(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code in (400, 401, 403)

    def test_register_and_me(self):
        email = f"test_{uuid.uuid4().hex[:8]}@vg.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "Pass@1234", "name": "T"})
        assert r.status_code == 200, r.text
        token = r.json()["token"]
        m = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert m.status_code == 200
        assert m.json()["email"] == email

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code in (401, 403)


# ------------------ Properties ------------------
class TestProperties:
    def test_create_list_toggle_delete(self, admin_headers):
        pid_str = f"TEST_{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{API}/properties", headers=admin_headers,
                          json={"name": "TEST Prop", "alias": "TP", "property_id": pid_str})
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        assert r.json()["active"] is True

        # duplicate
        d = requests.post(f"{API}/properties", headers=admin_headers,
                          json={"name": "X", "alias": "X", "property_id": pid_str})
        assert d.status_code == 400

        # list
        lst = requests.get(f"{API}/properties", headers=admin_headers).json()
        assert any(p["id"] == pid for p in lst)

        # toggle
        t = requests.patch(f"{API}/properties/{pid}/toggle", headers=admin_headers)
        assert t.status_code == 200
        assert t.json()["active"] is False

        # delete
        dl = requests.delete(f"{API}/properties/{pid}", headers=admin_headers)
        assert dl.status_code == 200

    def test_owner_isolation(self, admin_headers):
        # user B creates
        email = f"userb_{uuid.uuid4().hex[:8]}@vg.com"
        reg = requests.post(f"{API}/auth/register", json={"email": email, "password": "Pass@1234", "name": "B"})
        assert reg.status_code == 200
        tokenB = reg.json()["token"]
        hB = {"Authorization": f"Bearer {tokenB}"}

        pid_str = f"TEST_{uuid.uuid4().hex[:8]}"
        rp = requests.post(f"{API}/properties", headers=hB,
                           json={"name": "B", "alias": "B", "property_id": pid_str})
        b_pid = rp.json()["id"]

        # admin should not see or access
        adm_list = requests.get(f"{API}/properties", headers=admin_headers).json()
        assert not any(p["id"] == b_pid for p in adm_list)

        # admin toggling B's property should 404
        t = requests.patch(f"{API}/properties/{b_pid}/toggle", headers=admin_headers)
        assert t.status_code == 404

        # admin listing B's documents should 404
        d = requests.get(f"{API}/documents", headers=admin_headers, params={"property_id": b_pid})
        assert d.status_code == 404

        requests.delete(f"{API}/properties/{b_pid}", headers=hB)


# ------------------ Documents ------------------
class TestDocuments:
    def test_upload_and_list(self, admin_headers, property_id, uploaded_doc):
        assert uploaded_doc["status"] == "ready"
        # tiny wait for indexing to be visible
        time.sleep(1)
        r = requests.get(f"{API}/documents", headers=admin_headers, params={"property_id": property_id})
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) >= 1
        d = next((x for x in docs if x["id"] == uploaded_doc["id"]), None)
        assert d is not None
        assert d["status"] == "ready"
        assert d["chunk_count"] > 0

    def test_unsupported_type(self, admin_headers, property_id):
        files = {"file": ("x.zip", b"binary", "application/zip")}
        r = requests.post(f"{API}/documents/upload", headers=admin_headers,
                          files=files, data={"property_id": property_id})
        assert r.status_code == 400


# ------------------ Chat / Cache ------------------
class TestChat:
    def test_chat_then_cache_hit(self, admin_headers, property_id, uploaded_doc):
        payload = {"property_id": property_id, "question": "What are the admission requirements?",
                   "model_key": "gpt-5.4"}
        r1 = requests.post(f"{API}/chat", headers=admin_headers, json=payload, timeout=60)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["cache_status"] == "MISS"
        assert isinstance(d1.get("citations"), list)
        assert len(d1["citations"]) >= 1
        assert "filename" in d1["citations"][0] and "page" in d1["citations"][0]
        assert isinstance(d1.get("retrieved_chunks"), list)
        assert d1["latency_ms"] >= 0
        assert d1["content"]

        # cache HIT
        r2 = requests.post(f"{API}/chat", headers=admin_headers, json=payload, timeout=30)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["cache_status"] == "HIT"
        assert d2["tokens_cached"] > 0
        assert d2["latency_ms"] <= 100

    def test_cache_stats(self, admin_headers, property_id):
        r = requests.get(f"{API}/cache/stats", headers=admin_headers, params={"property_id": property_id})
        assert r.status_code == 200
        d = r.json()
        for k in ["entries", "hits", "hit_rate", "tokens_saved", "cost_saved"]:
            assert k in d


# ------------------ Auto QA ------------------
class TestAutoQA:
    def test_quick_run(self, admin_headers, property_id, uploaded_doc):
        r = requests.post(f"{API}/qa/auto", headers=admin_headers,
                          json={"property_id": property_id, "mode": "quick", "model_key": "gpt-5.4"})
        assert r.status_code == 200, r.text
        run_id = r.json()["run_id"]

        # list
        lst = requests.get(f"{API}/qa/runs", headers=admin_headers, params={"property_id": property_id}).json()
        assert any(x["id"] == run_id for x in lst)

        # poll up to 150s
        detail = None
        for _ in range(60):
            time.sleep(3)
            dr = requests.get(f"{API}/qa/runs/{run_id}", headers=admin_headers, timeout=30)
            assert dr.status_code == 200
            detail = dr.json()
            if detail["run"]["status"] in ("completed", "failed", "stopped"):
                break
        assert detail is not None
        assert detail["run"]["status"] == "completed", f"run status: {detail['run']['status']}"
        run = detail["run"]
        assert run["passed"] + run["failed"] == run["total"]
        assert isinstance(run.get("scores"), dict) and run["scores"]
        cats = {c["category"] for c in detail["cases"]}
        # should contain functional + at least one security or negative category
        assert any(c in cats for c in ["functional", "grounding"])
        assert any(c in cats for c in ["jailbreak", "prompt_injection", "negative", "out_of_scope"])


# ------------------ Model Lab ------------------
class TestModelLab:
    def test_models_list(self, admin_headers):
        r = requests.get(f"{API}/lab/models", headers=admin_headers)
        assert r.status_code == 200
        models = r.json()
        keys = {m["key"] for m in models}
        assert {"gpt-5.4", "claude-sonnet-5", "gemini-3-flash"}.issubset(keys)

    def test_compare(self, admin_headers, property_id, uploaded_doc):
        payload = {"property_id": property_id, "question": "What is the fee?",
                   "models": ["gpt-5.4", "claude-sonnet-5", "gemini-3-flash"]}
        r = requests.post(f"{API}/lab/compare", headers=admin_headers, json=payload, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["results"]) == 3
        for res in d["results"]:
            for k in ["answer", "tokens", "cost", "latency_ms", "grounded_score", "overall_score", "model_key"]:
                assert k in res
        assert d["recommended"] in {r["model_key"] for r in d["results"]}


# ------------------ Golden ------------------
class TestGolden:
    def test_crud(self, admin_headers, property_id):
        c = requests.post(f"{API}/golden", headers=admin_headers, json={
            "property_id": property_id, "question": "Fee?", "expected_answer": "Rs 50000",
            "expected_behavior": "answer", "category": "functional", "severity": "P2", "tags": ["fee"]
        })
        assert c.status_code == 200
        gid = c.json()["id"]
        lst = requests.get(f"{API}/golden", headers=admin_headers, params={"property_id": property_id}).json()
        assert any(g["id"] == gid for g in lst)
        d = requests.delete(f"{API}/golden/{gid}", headers=admin_headers)
        assert d.status_code == 200


# ------------------ Ownership checks (iteration 2) ------------------
class TestOwnership:
    def test_delete_golden_other_user_returns_404(self, admin_headers):
        # admin creates a property + golden case
        pid_str = f"TEST_{uuid.uuid4().hex[:8]}"
        rp = requests.post(f"{API}/properties", headers=admin_headers,
                           json={"name": "OwnTest", "alias": "OT", "property_id": pid_str})
        assert rp.status_code == 200, rp.text
        prop_id = rp.json()["id"]
        try:
            g = requests.post(f"{API}/golden", headers=admin_headers, json={
                "property_id": prop_id, "question": "Q?", "expected_answer": "A",
                "expected_behavior": "answer", "category": "functional", "severity": "P2", "tags": []
            })
            assert g.status_code == 200, g.text
            gid = g.json()["id"]

            # user B tries to delete admin's golden case
            email = f"userdel_{uuid.uuid4().hex[:8]}@vg.com"
            reg = requests.post(f"{API}/auth/register",
                                json={"email": email, "password": "Pass@1234", "name": "DEL"})
            assert reg.status_code == 200
            hB = {"Authorization": f"Bearer {reg.json()['token']}"}

            d = requests.delete(f"{API}/golden/{gid}", headers=hB)
            assert d.status_code == 404, f"expected 404, got {d.status_code}: {d.text}"

            # admin can still delete it
            d2 = requests.delete(f"{API}/golden/{gid}", headers=admin_headers)
            assert d2.status_code == 200
        finally:
            requests.delete(f"{API}/properties/{prop_id}", headers=admin_headers)

    def test_stop_run_other_user_returns_404(self, admin_headers, property_id, uploaded_doc):
        # admin starts a run
        r = requests.post(f"{API}/qa/auto", headers=admin_headers,
                          json={"property_id": property_id, "mode": "quick", "model_key": "gpt-5.4"})
        assert r.status_code == 200, r.text
        run_id = r.json()["run_id"]

        # user B tries to stop it
        email = f"userstop_{uuid.uuid4().hex[:8]}@vg.com"
        reg = requests.post(f"{API}/auth/register",
                            json={"email": email, "password": "Pass@1234", "name": "STP"})
        hB = {"Authorization": f"Bearer {reg.json()['token']}"}
        s = requests.post(f"{API}/qa/runs/{run_id}/stop", headers=hB)
        assert s.status_code == 404, f"expected 404, got {s.status_code}: {s.text}"


# ------------------ Dashboard ------------------
class TestDashboard:
    def test_dashboard(self, admin_headers, property_id):
        r = requests.get(f"{API}/dashboard", headers=admin_headers, params={"property_id": property_id})
        assert r.status_code == 200
        d = r.json()
        for k in ["documents", "conversations", "total_tokens", "total_cost",
                  "cache_hit_rate", "avg_latency_ms", "quality_trend"]:
            assert k in d
        assert isinstance(d["quality_trend"], list)
