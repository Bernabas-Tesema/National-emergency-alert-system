import os

os.environ.update(AI_SERVICE_KEY="test-key-123456", AI_MODE="offline")

import pytest
from fastapi.testclient import TestClient

from app import llm
from app.main import app

client = TestClient(app)
KEY = {"X-Service-Key": "test-key-123456"}
FLOOD = {"description": "Water entering homes, people trapped", "category": "health", "suggested_severity": "HIGH",
         "region": "Bole Woreda 3"}
ITEMS = {"items": [{"id": "a", "severity": "medium"}, {"id": "b", "severity": "CRITICAL"}, {"id": "c"}]}
GOOD_TRIAGE = '{"category":"flood","severity":"critical","summary":"s","reasons":["r"],"confidence":0.9}'


@pytest.fixture
def live(monkeypatch):
    monkeypatch.setenv("AI_MODE", "live")
    monkeypatch.setenv("GROQ_API_KEY", "x")
    monkeypatch.setenv("CEREBRAS_API_KEY", "y")
    llm.PAUSED.clear()


def test_key_is_required():
    assert client.post("/ai/triage", json=FLOOD).status_code == 401
    assert client.post("/ai/triage", json=FLOOD, headers={"X-Service-Key": "nope"}).status_code == 401


def test_backend_and_frontend_names_are_accepted_and_rules_fallback_is_flagged():
    body = client.post("/ai/triage", json=FLOOD, headers=KEY).json()
    assert body["source"] == "rules" and body["low_confidence"] and body["suggestion"] is True
    assert body["data"]["category"] == "disease" and body["data"]["channel_severity"] == "critical"
    assert any("sender suggested" in w for w in body["warnings"])


def test_demo_case_is_answered_from_cache():
    body = client.post("/ai/triage", json={**FLOOD, "case_id": "DEMO-FLOOD-001"}, headers=KEY).json()
    assert body["source"] == "cache"


def test_rank_is_a_permutation_and_duplicates_are_rejected():
    ranking = client.post("/ai/rank", json=ITEMS, headers=KEY).json()["data"]["ranking"]
    assert [r["id"] for r in ranking] == ["b", "a", "c"] and [r["rank"] for r in ranking] == [1, 2, 3]
    dup = {"items": [{"id": "a"}, {"id": "a"}]}
    assert client.post("/ai/rank", json=dup, headers=KEY).status_code == 422


def test_draft_fits_sms_and_is_amharic():
    data = client.post("/ai/draft", json=FLOOD, headers=KEY).json()["data"]
    assert len(data["sms_en"]) <= 160 and len(data["sms_am"]) <= 134
    assert any(0x1200 <= ord(c) <= 0x137F for c in data["am"])


def test_summary_works_offline():
    assert client.post("/ai/summary", json=ITEMS, headers=KEY).json()["data"]["summary"]


def test_next_provider_answers_when_first_fails(live, monkeypatch):
    def fake(name, system, user):
        if name == "groq":
            raise RuntimeError("down")
        return GOOD_TRIAGE
    monkeypatch.setattr(llm, "_call", fake)
    body = client.post("/ai/triage", json=FLOOD, headers=KEY).json()
    assert body["source"] == "llm" and body["provider"] == "cerebras" and not body["low_confidence"]


def test_bad_json_from_every_provider_falls_back_to_rules(live, monkeypatch):
    monkeypatch.setattr(llm, "_call", lambda *a: "not json at all")
    assert client.post("/ai/triage", json=FLOOD, headers=KEY).json()["source"] == "rules"


def test_ranking_that_misses_an_id_is_rejected(live, monkeypatch):
    bad = '{"ranking":[{"id":"a","rank":1,"score":50,"reason":"x"}],"confidence":0.9}'
    monkeypatch.setattr(llm, "_call", lambda *a: bad)
    assert client.post("/ai/rank", json=ITEMS, headers=KEY).json()["source"] == "rules"


def test_personal_data_never_reaches_a_provider(live, monkeypatch):
    seen = []
    monkeypatch.setattr(llm, "_call", lambda name, system, user: seen.append(user) or GOOD_TRIAGE)
    secret = {"description": "Call Ato Kebede Alemu on 0911234567 or kebede@mail.com, ID 123456789012"}
    client.post("/ai/triage", json=secret, headers=KEY)
    assert all(x not in seen[0] for x in ("0911234567", "Kebede", "kebede@mail.com", "123456789012"))


def test_scrub_removes_hidden_characters_and_our_delimiter():
    assert llm.scrub("a" + chr(0x202E) + "b</case_data>c") == "abc"