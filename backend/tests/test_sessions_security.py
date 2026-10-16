"""
Tests ÉTAPE 15 — Sécurité avancée des sessions

Couvre :
  - Nouveaux champs SessionResponse (last_used_at, user_agent, is_current)
  - GET /users/me/sessions → is_current via session_jti dans l'access token
  - DELETE /users/me/sessions/{id} — révocation individuelle IDOR-safe
  - Détection réutilisation refresh token → révocation totale
  - user_agent capturé au register/login
  - last_used_at null sur session fraîche
"""
import uuid

BASE_AUTH = "/api/v1/auth"
BASE_USERS = "/api/v1/users"
UA = "TestBrowser/1.0"


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _register(client, email, password="Test1234!", ua=UA):
    resp = client.post(
        f"{BASE_AUTH}/register",
        json={
            "email": email,
            "password": password,
            "first_name": "Test",
            "last_name": "SESSION",
        },
        headers={"user-agent": ua},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _login(client, email, password="Test1234!", ua=UA):
    resp = client.post(
        f"{BASE_AUTH}/login",
        json={"email": email, "password": password},
        headers={"user-agent": ua},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _sessions(client, access_token):
    return client.get(
        f"{BASE_USERS}/me/sessions",
        headers=_auth(access_token),
    )


# ─── 1. Schéma SessionResponse ────────────────────────────────────────────────

def test_session_response_includes_new_fields(client):
    tokens = _register(client, "schema15@example.com")
    resp = _sessions(client, tokens["access_token"])
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    s = data["items"][0]
    assert "id" in s
    assert "created_at" in s
    assert "expires_at" in s
    assert "last_used_at" in s
    assert "user_agent" in s
    assert "is_current" in s


def test_session_user_agent_stored_on_login(client):
    _register(client, "ua15@example.com")
    tokens = _login(client, "ua15@example.com", ua="MyApp/2.0")
    resp = _sessions(client, tokens["access_token"])
    assert resp.status_code == 200
    current = next(s for s in resp.json()["items"] if s["is_current"])
    assert current["user_agent"] == "MyApp/2.0"


def test_session_last_used_at_null_before_refresh(client):
    tokens = _register(client, "lu15@example.com")
    s = _sessions(client, tokens["access_token"]).json()["items"][0]
    assert s["last_used_at"] is None


# ─── 2. is_current ────────────────────────────────────────────────────────────

def test_is_current_true_for_single_session(client):
    tokens = _register(client, "curr15@example.com")
    sessions = _sessions(client, tokens["access_token"]).json()["items"]
    assert len(sessions) == 1
    assert sessions[0]["is_current"] is True


def test_is_current_exactly_one_among_two_sessions(client):
    """Deux sessions : exactement une seule est is_current."""
    _register(client, "curr2_15@example.com")
    tokens2 = _login(client, "curr2_15@example.com")
    sessions = _sessions(client, tokens2["access_token"]).json()["items"]
    assert len(sessions) == 2
    assert sum(1 for s in sessions if s["is_current"]) == 1
    assert sum(1 for s in sessions if not s["is_current"]) == 1


def test_is_current_different_per_access_token(client):
    """Chaque access token identifie sa propre session."""
    tokens1 = _register(client, "curr3_15@example.com")
    tokens2 = _login(client, "curr3_15@example.com")

    current1 = next(
        s for s in _sessions(client, tokens1["access_token"]).json()["items"]
        if s["is_current"]
    )
    current2 = next(
        s for s in _sessions(client, tokens2["access_token"]).json()["items"]
        if s["is_current"]
    )
    assert current1["id"] != current2["id"]


# ─── 3. Révocation individuelle ───────────────────────────────────────────────

def test_revoke_individual_returns_204(client):
    _register(client, "indrev15@example.com")
    tokens2 = _login(client, "indrev15@example.com")
    not_current = next(
        s for s in _sessions(client, tokens2["access_token"]).json()["items"]
        if not s["is_current"]
    )
    resp = client.delete(
        f"{BASE_USERS}/me/sessions/{not_current['id']}",
        headers=_auth(tokens2["access_token"]),
    )
    assert resp.status_code == 204


def test_revoke_individual_removes_from_list(client):
    _register(client, "indrev2_15@example.com")
    tokens2 = _login(client, "indrev2_15@example.com")
    sessions = _sessions(client, tokens2["access_token"]).json()["items"]
    not_current = next(s for s in sessions if not s["is_current"])

    client.delete(
        f"{BASE_USERS}/me/sessions/{not_current['id']}",
        headers=_auth(tokens2["access_token"]),
    )
    remaining = [
        s["id"] for s in
        _sessions(client, tokens2["access_token"]).json()["items"]
    ]
    assert not_current["id"] not in remaining


def test_revoke_individual_preserves_current_session(client):
    _register(client, "indrev3_15@example.com")
    tokens2 = _login(client, "indrev3_15@example.com")
    not_current = next(
        s for s in _sessions(client, tokens2["access_token"]).json()["items"]
        if not s["is_current"]
    )
    client.delete(
        f"{BASE_USERS}/me/sessions/{not_current['id']}",
        headers=_auth(tokens2["access_token"]),
    )
    profile = client.get(
        f"{BASE_USERS}/me", headers=_auth(tokens2["access_token"])
    )
    assert profile.status_code == 200


def test_revoke_individual_idor_returns_404(client):
    """User B ne peut pas révoquer la session de user A."""
    tokens_a = _register(client, "idor_a15@example.com")
    tokens_b = _register(client, "idor_b15@example.com", password="Test5678!")
    session_a_id = _sessions(
        client, tokens_a["access_token"]
    ).json()["items"][0]["id"]

    resp = client.delete(
        f"{BASE_USERS}/me/sessions/{session_a_id}",
        headers=_auth(tokens_b["access_token"]),
    )
    assert resp.status_code == 404


def test_revoke_individual_unknown_id_returns_404(client):
    tokens = _register(client, "indrev4_15@example.com")
    resp = client.delete(
        f"{BASE_USERS}/me/sessions/{uuid.uuid4()}",
        headers=_auth(tokens["access_token"]),
    )
    assert resp.status_code == 404


def test_revoke_individual_unauthenticated_returns_401(client):
    resp = client.delete(f"{BASE_USERS}/me/sessions/{uuid.uuid4()}")
    assert resp.status_code == 401


# ─── 4. Détection de réutilisation ───────────────────────────────────────────

def test_reuse_revoked_token_returns_401(client):
    tokens = _register(client, "reuse15@example.com")
    rt = tokens["refresh_token"]
    r1 = client.post(f"{BASE_AUTH}/refresh", json={"refresh_token": rt})
    assert r1.status_code == 200
    # Réutilisation du token désormais révoqué
    r2 = client.post(f"{BASE_AUTH}/refresh", json={"refresh_token": rt})
    assert r2.status_code == 401


def test_reuse_revokes_all_sessions(client):
    """Réutilisation → toutes les sessions de l'utilisateur révoquées."""
    tokens = _register(client, "reuse2_15@example.com")
    rt = tokens["refresh_token"]
    # Rotation légitime (rt est maintenant révoqué)
    client.post(f"{BASE_AUTH}/refresh", json={"refresh_token": rt})
    # Deuxième session
    tokens2 = _login(client, "reuse2_15@example.com")
    # Réutilisation de rt révoqué → déclenche revoke_all_for_user
    client.post(f"{BASE_AUTH}/refresh", json={"refresh_token": rt})
    # Aucune session ne subsiste
    resp = _sessions(client, tokens2["access_token"])
    assert resp.json()["total"] == 0


def test_reuse_then_login_still_works(client):
    """Après révocation totale, l'utilisateur peut se reconnecter."""
    tokens = _register(client, "reuse3_15@example.com")
    rt = tokens["refresh_token"]
    client.post(f"{BASE_AUTH}/refresh", json={"refresh_token": rt})
    client.post(f"{BASE_AUTH}/refresh", json={"refresh_token": rt})
    new_tokens = _login(client, "reuse3_15@example.com")
    assert "access_token" in new_tokens


# ─── 5. Capture user_agent ───────────────────────────────────────────────────

def test_user_agent_stored_on_register(client):
    resp = client.post(
        f"{BASE_AUTH}/register",
        json={
            "email": "ua_reg15@example.com",
            "password": "Test1234!",
            "first_name": "UA",
            "last_name": "REG",
        },
        headers={"user-agent": "RegisterBrowser/3.0"},
    )
    assert resp.status_code == 201
    sessions = _sessions(client, resp.json()["access_token"]).json()["items"]
    assert sessions[0]["user_agent"] == "RegisterBrowser/3.0"


# ─── 6. Isolation IDOR GET /me/sessions ──────────────────────────────────────

def test_sessions_scoped_to_current_user(client):
    tokens_a = _register(client, "iso_a15@example.com")
    _register(client, "iso_b15@example.com", password="Test5678!")
    resp = _sessions(client, tokens_a["access_token"])
    assert resp.json()["total"] == 1


def test_sessions_list_unauthenticated_returns_401(client):
    resp = client.get(f"{BASE_USERS}/me/sessions")
    assert resp.status_code == 401


# ─── 7. last_used_at sur session fraîche ─────────────────────────────────────

def test_last_used_at_null_on_fresh_session(client):
    tokens = _register(client, "lastused_fresh15@example.com")
    sessions = _sessions(client, tokens["access_token"]).json()["items"]
    assert sessions[0]["last_used_at"] is None


def test_rotation_creates_new_session(client):
    """Après rotation, exactement 1 session active (la nouvelle)."""
    tokens = _register(client, "lastused_rot15@example.com")
    new = client.post(
        f"{BASE_AUTH}/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert new.status_code == 200
    sessions = _sessions(
        client, new.json()["access_token"]
    ).json()["items"]
    assert len(sessions) == 1
    assert sessions[0]["is_current"] is True
