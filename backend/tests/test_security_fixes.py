"""Security fix verification tests (SEC-001 to SEC-005, CORS, rate limit)."""
import os
import time
import uuid
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://vidya-qa-platform.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@vidyagpt.com"
ADMIN_PASS = "zvZCkbQei9Lcs73c6II01RrV"
OLD_ADMIN_PASS = "Admin@12345"


# ---------- helpers ----------
def register_user():
    email = f"sec_{uuid.uuid4().hex[:8]}@vg.com"
    pwd = "Pass@1234"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": pwd, "name": "Sec"}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    return email, pwd, data["token"], data["user"]


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ================= SEC-005 =================
class TestSEC005DefaultPassRevoked:
    def test_old_admin_password_rejected(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": OLD_ADMIN_PASS}, timeout=30)
        assert r.status_code == 401, f"expected 401 but got {r.status_code}: {r.text}"

    def test_new_admin_password_works(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_register_defaults_to_student(self):
        email, _, _, user = register_user()
        assert user["role"] == "student", f"expected role=student got role={user.get('role')}"


# ================= SEC-002: JWT =================
class TestSEC002JWT:
    def test_token_has_three_parts(self, admin_token):
        parts = admin_token.split(".")
        assert len(parts) == 3
        # each part should decode as base64url
        for p in parts:
            pad = p + "=" * (-len(p) % 4)
            base64.urlsafe_b64decode(pad.encode())

    def test_tampered_token_rejected(self, admin_token):
        # flip a char in the signature (last segment)
        parts = admin_token.split(".")
        sig = parts[2]
        tampered_char = "A" if sig[0] != "A" else "B"
        tampered = ".".join([parts[0], parts[1], tampered_char + sig[1:]])
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tampered}"}, timeout=30)
        assert r.status_code == 401, f"expected 401 got {r.status_code}"


# ================= SEC-001: Forgot password flow =================
class TestSEC001ForgotFlow:
    def test_old_forgot_endpoint_gone(self):
        r = requests.post(f"{API}/auth/forgot", json={"email": ADMIN_EMAIL}, timeout=30)
        assert r.status_code in (404, 405), f"old /auth/forgot should not exist, got {r.status_code}"

    def test_forgot_request_unknown_email_returns_null_token(self):
        r = requests.post(f"{API}/auth/forgot-request",
                          json={"email": f"nonexistent_{uuid.uuid4().hex}@example.com"}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert "reset_token" in body
        assert body["reset_token"] is None, f"unknown email should return null token, got {body}"

    def test_full_reset_flow_and_single_use(self):
        # create a fresh user
        email, old_pwd, _, _ = register_user()

        # request reset
        r = requests.post(f"{API}/auth/forgot-request", json={"email": email}, timeout=30)
        assert r.status_code == 200, r.text
        token = r.json().get("reset_token")
        assert token, f"expected reset_token for known email, got {r.json()}"

        # short password should fail via pydantic
        s = requests.post(f"{API}/auth/forgot-confirm",
                         json={"token": token, "new_password": "short"}, timeout=30)
        assert s.status_code == 422, f"short password should be rejected by Pydantic, got {s.status_code}"

        # invalid token (must be >= 20 chars to bypass Pydantic min_length) -> 400 (not 500)
        b = requests.post(f"{API}/auth/forgot-confirm",
                          json={"token": "invalid_token_that_is_long_enough_1234567890", "new_password": "NewPass@1234"}, timeout=30)
        assert b.status_code == 400, f"invalid token should return 400, got {b.status_code}: {b.text}"

        # confirm with valid token
        new_pwd = "NewPass@1234"
        c = requests.post(f"{API}/auth/forgot-confirm",
                          json={"token": token, "new_password": new_pwd}, timeout=30)
        assert c.status_code == 200, c.text

        # old password no longer works
        li_old = requests.post(f"{API}/auth/login", json={"email": email, "password": old_pwd}, timeout=30)
        assert li_old.status_code == 401

        # new password works
        li_new = requests.post(f"{API}/auth/login", json={"email": email, "password": new_pwd}, timeout=30)
        assert li_new.status_code == 200

        # reusing the same token -> 400
        reuse = requests.post(f"{API}/auth/forgot-confirm",
                              json={"token": token, "new_password": "AnotherPass@1234"}, timeout=30)
        assert reuse.status_code == 400, f"reused token should return 400, got {reuse.status_code}"


# ================= SEC-003: Cross-user 404s on conversations & qa runs =================
class TestSEC003CrossUser404:
    def test_conversation_and_qa_run_not_accessible_to_other_user(self, admin_headers):
        # user A creates property + document + chat (creates conversation) + qa run
        _, _, tokenA, _ = register_user()
        hA = {"Authorization": f"Bearer {tokenA}"}
        pid_str = f"TEST_{uuid.uuid4().hex[:8]}"
        rp = requests.post(f"{API}/properties", headers=hA,
                          json={"name": "A", "alias": "A", "property_id": pid_str}, timeout=30)
        assert rp.status_code == 200, rp.text
        prop_id = rp.json()["id"]
        try:
            # upload doc
            files = {"file": ("s.txt", b"Fees are Rs 50000. Admission requires 60 percent.", "text/plain")}
            ru = requests.post(f"{API}/documents/upload", headers=hA,
                              files=files, data={"property_id": prop_id}, timeout=60)
            assert ru.status_code == 200, ru.text

            # chat to create a conversation
            rc = requests.post(f"{API}/chat", headers=hA,
                              json={"property_id": prop_id, "question": "Fee?", "model_key": "gpt-5.4"},
                              timeout=60)
            assert rc.status_code == 200, rc.text
            conv_id = rc.json().get("conversation_id")
            assert conv_id, f"no conversation_id returned: {rc.json()}"

            # qa run
            rq = requests.post(f"{API}/qa/auto", headers=hA,
                              json={"property_id": prop_id, "mode": "quick", "model_key": "gpt-5.4"},
                              timeout=30)
            assert rq.status_code == 200, rq.text
            run_id = rq.json()["run_id"]

            # user B (admin) tries to fetch
            mb = requests.get(f"{API}/conversations/{conv_id}/messages", headers=admin_headers, timeout=30)
            assert mb.status_code == 404, f"conv access should be 404, got {mb.status_code}"

            qb = requests.get(f"{API}/qa/runs/{run_id}", headers=admin_headers, timeout=30)
            assert qb.status_code == 404, f"qa run access should be 404, got {qb.status_code}"

            # owner can still fetch
            mo = requests.get(f"{API}/conversations/{conv_id}/messages", headers=hA, timeout=30)
            assert mo.status_code == 200

            qo = requests.get(f"{API}/qa/runs/{run_id}", headers=hA, timeout=30)
            assert qo.status_code == 200
        finally:
            requests.delete(f"{API}/properties/{prop_id}", headers=hA, timeout=30)


# ================= SEC-004: Delete property ownership order =================
class TestSEC004DeletePropertyOwnership:
    def test_other_user_delete_does_not_cascade(self, admin_headers):
        _, _, tokenA, _ = register_user()
        hA = {"Authorization": f"Bearer {tokenA}"}
        pid_str = f"TEST_{uuid.uuid4().hex[:8]}"
        rp = requests.post(f"{API}/properties", headers=hA,
                          json={"name": "A", "alias": "A", "property_id": pid_str}, timeout=30)
        prop_id = rp.json()["id"]
        try:
            files = {"file": ("s.txt", b"Fees are Rs 50000. Admission requires 60 percent.", "text/plain")}
            ru = requests.post(f"{API}/documents/upload", headers=hA,
                              files=files, data={"property_id": prop_id}, timeout=60)
            assert ru.status_code == 200
            doc_id = ru.json()["id"]

            # admin tries to delete A's property
            db = requests.delete(f"{API}/properties/{prop_id}", headers=admin_headers, timeout=30)
            assert db.status_code == 404, f"expected 404, got {db.status_code}: {db.text}"

            # doc should still exist for user A
            ld = requests.get(f"{API}/documents", headers=hA, params={"property_id": prop_id}, timeout=30)
            assert ld.status_code == 200
            assert any(d["id"] == doc_id for d in ld.json()), "user A's document was deleted!"
        finally:
            requests.delete(f"{API}/properties/{prop_id}", headers=hA, timeout=30)


# ================= CORS =================
class TestCORS:
    def test_no_wildcard_with_credentials(self):
        origin = BASE_URL  # our own preview origin
        r = requests.options(f"{API}/auth/login",
                            headers={
                                "Origin": origin,
                                "Access-Control-Request-Method": "POST",
                                "Access-Control-Request-Headers": "content-type",
                            }, timeout=30)
        acao = r.headers.get("Access-Control-Allow-Origin", "")
        acac = r.headers.get("Access-Control-Allow-Credentials", "").lower()
        # If credentials are allowed, ACAO must not be '*'
        if acac == "true":
            assert acao != "*", f"CORS misconfig: ACAO=* with credentials. headers={dict(r.headers)}"
        # preflight itself should be 200/204
        assert r.status_code in (200, 204), f"preflight failed: {r.status_code}"


# ================= Rate limit (run LAST) =================
class TestZZRateLimit:
    def test_login_rate_limit_429(self):
        # Requests may be distributed across multiple ingress pods, each with its
        # own slowapi in-memory counter — send enough attempts to reliably trip
        # the 20/min per-IP limit on at least one pod.
        codes = []
        for i in range(50):
            r = requests.post(f"{API}/auth/login",
                             json={"email": "nobody@example.com", "password": "wrong"}, timeout=15)
            codes.append(r.status_code)
            if r.status_code == 429:
                break
        assert 429 in codes, f"expected 429 in 50 rapid login attempts, got codes: {codes}"
