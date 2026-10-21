"""JSON extraction, circuit breaker and the failover client."""
import pytest

from app.core.breaker import CircuitBreaker
from app.core.llm_client import AllProvidersFailed, LLMClient, extract_json
from app.core.providers.base import ProviderError
from app.core.schemas import AreaOut

from .conftest import FakeProvider

GOOD = {"woredas": ["BOLE-W03"], "confidence": 0.8, "reasons": ["x"]}


# ───── extract_json ─────
def test_extract_plain():
    assert extract_json('{"a": 1}') == {"a": 1}


def test_extract_fenced_and_chatty():
    assert extract_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert extract_json('Sure! Here you go: {"a": {"b": 2}} Hope that helps') == {"a": {"b": 2}}


def test_extract_ignores_braces_inside_strings():
    assert extract_json('{"a": "x } y { z"}') == {"a": "x } y { z"}


@pytest.mark.parametrize("bad", ["no json here", '{"a": 1', ""])
def test_extract_rejects_garbage(bad):
    with pytest.raises(ValueError):
        extract_json(bad)


# ───── breaker ─────
class Clock:
    t = 0.0

    def __call__(self):
        return self.t


def test_breaker_opens_after_threshold_then_recovers():
    clk = Clock()
    b = CircuitBreaker(failures=3, cooldown_s=60, clock=clk)
    for _ in range(2):
        b.failure()
    assert b.state == "closed" and b.allow()
    b.failure()
    assert b.state == "open" and not b.allow()
    clk.t = 61
    assert b.state == "half_open"
    assert b.allow()  # one trial
    assert not b.allow()  # only one at a time
    b.success()
    assert b.state == "closed" and b.allow()


def test_breaker_failed_trial_reopens():
    clk = Clock()
    b = CircuitBreaker(failures=1, cooldown_s=60, clock=clk)
    b.failure()
    clk.t = 61
    assert b.allow()
    b.failure()
    assert b.state == "open"


def test_breaker_open_for_is_immediate_and_capped():
    clk = Clock()
    b = CircuitBreaker(failures=3, cooldown_s=60, clock=clk)
    b.failure(open_for=5)
    assert b.state == "open"
    clk.t = 6
    assert b.state == "half_open"
    b.success()
    b.failure(open_for=99999)
    clk.t = 6 + 601
    assert b.state == "half_open"  # capped at 600 s


# ───── client ─────
def client_for(*providers, **kw):
    return LLMClient(providers=list(providers), breakers={p.name: CircuitBreaker(3, 60) for p in providers}, **kw)


async def ask(c):
    return await c.complete(system="s", user="u", schema=AreaOut)


async def test_first_provider_wins():
    a, b = FakeProvider("a", [GOOD]), FakeProvider("b", [GOOD])
    res = await ask(client_for(a, b))
    assert res.provider == "a" and len(b.calls) == 0


async def test_rate_limit_fails_over_and_trips_breaker():
    a = FakeProvider("a", [ProviderError("rate_limited", retry_after=30)])
    b = FakeProvider("b", [GOOD])
    c = client_for(a, b)
    assert (await ask(c)).provider == "b"
    assert c.breakers["a"].state == "open"
    assert (await ask(c)).provider == "b"
    assert len(a.calls) == 1  # second request skipped "a" entirely: no wasted timeout
    assert c.stats["a"].last_error == "rate_limited"


async def test_bad_json_gets_one_retry_with_a_hint():
    a = FakeProvider("a", ["not json at all", GOOD])
    res = await ask(client_for(a))
    assert res.provider == "a" and len(a.calls) == 2
    assert "rejected" in a.calls[1][1]


async def test_schema_violation_retries_then_moves_on():
    bad = {"woredas": [], "confidence": 7, "reasons": []}  # confidence out of range
    a, b = FakeProvider("a", [bad]), FakeProvider("b", [GOOD])
    res = await ask(client_for(a, b))
    assert res.provider == "b" and len(a.calls) == 2
    assert "confidence" in a.calls[1][1]
    assert "7" not in a.calls[1][1].split("rejected:")[1].split(".")[0].replace("confidence", "")  # no echoed value


async def test_all_fail_raises_with_reasons():
    a, b = FakeProvider("a", [ProviderError("server")]), FakeProvider("b", [ProviderError("timeout")])
    with pytest.raises(AllProvidersFailed) as e:
        await ask(client_for(a, b))
    assert e.value.attempts == [("a", "server"), ("b", "timeout")]


async def test_no_providers_raises():
    with pytest.raises(AllProvidersFailed):
        await ask(client_for())


async def test_bad_key_is_parked_for_a_long_time():
    a = FakeProvider("a", [ProviderError("auth")])
    c = client_for(a, FakeProvider("b", [GOOD]), cooldown_s=60)
    await ask(c)
    assert c.breakers["a"].state == "open"
