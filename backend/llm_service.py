"""LLM service wrapper for multi-provider calls via emergentintegrations."""
import os
import time
import hashlib
import logging
from typing import AsyncIterator, List, Dict, Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

log = logging.getLogger("vidyagpt.llm")

EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

# Model registry (provider, model, in_cost_per_1k, out_cost_per_1k)
MODEL_REGISTRY: Dict[str, Dict] = {
    "gpt-5.4": {"provider": "openai", "model": "gpt-5.4", "in_cost": 0.0025, "out_cost": 0.010, "label": "GPT-5.4"},
    "claude-sonnet-5": {"provider": "anthropic", "model": "claude-sonnet-5", "in_cost": 0.003, "out_cost": 0.015, "label": "Claude Sonnet 5"},
    "gemini-3-flash": {"provider": "gemini", "model": "gemini-3-flash-preview", "in_cost": 0.0005, "out_cost": 0.002, "label": "Gemini 3 Flash"},
}


def estimate_tokens(text: str) -> int:
    return max(1, int(len(text) / 4))


def calc_cost(model_key: str, tokens_in: int, tokens_out: int) -> float:
    m = MODEL_REGISTRY.get(model_key)
    if not m:
        return 0.0
    return (tokens_in / 1000.0) * m["in_cost"] + (tokens_out / 1000.0) * m["out_cost"]


async def chat_completion(
    model_key: str,
    system_message: str,
    user_text: str,
    session_id: Optional[str] = None,
) -> Dict:
    """Non-streaming chat completion returning full response + telemetry."""
    m = MODEL_REGISTRY.get(model_key, MODEL_REGISTRY["gpt-5.4"])
    sid = session_id or hashlib.md5(user_text.encode()).hexdigest()[:16]
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=sid,
        system_message=system_message,
    ).with_model(m["provider"], m["model"])
    start = time.time()
    text = ""
    try:
        async for ev in chat.stream_message(UserMessage(text=user_text)):
            if isinstance(ev, TextDelta):
                text += ev.content
            elif isinstance(ev, StreamDone):
                break
    except Exception as e:
        # SEC hardening: never leak raw provider error text to the client
        log.warning(f"LLM error [{model_key}]: {e}")
        return {"text": "The AI service is temporarily unavailable. Please try again shortly.",
                "error": "llm_error", "latency_ms": int((time.time()-start)*1000),
                "tokens_in": 0, "tokens_out": 0, "cost": 0.0, "model": m["model"], "provider": m["provider"]}
    latency_ms = int((time.time() - start) * 1000)
    tokens_in = estimate_tokens(system_message + user_text)
    tokens_out = estimate_tokens(text)
    cost = calc_cost(model_key, tokens_in, tokens_out)
    return {
        "text": text,
        "latency_ms": latency_ms,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "cost": cost,
        "model": m["model"],
        "provider": m["provider"],
        "model_key": model_key,
    }


async def stream_completion(
    model_key: str,
    system_message: str,
    user_text: str,
    session_id: Optional[str] = None,
) -> AsyncIterator[str]:
    m = MODEL_REGISTRY.get(model_key, MODEL_REGISTRY["gpt-5.4"])
    sid = session_id or hashlib.md5(user_text.encode()).hexdigest()[:16]
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=sid,
        system_message=system_message,
    ).with_model(m["provider"], m["model"])
    async for ev in chat.stream_message(UserMessage(text=user_text)):
        if isinstance(ev, TextDelta):
            yield ev.content
        elif isinstance(ev, StreamDone):
            return


# ---- Simple embedding (deterministic hash-based fallback) ----
# emergentintegrations doesn't expose embeddings uniformly; we use a lightweight
# TF-based embedding for retrieval that works fully offline and is deterministic.
import re
from collections import Counter
import math

_VOCAB_DIM = 512


def embed_text(text: str) -> List[float]:
    """Deterministic hash-projected term-frequency embedding (512-dim, unsigned).
    Uses two-hash projection into a positive vector so co-occurring tokens
    never destructively cancel — reliable retrieval for small corpora.
    """
    tokens = re.findall(r"[a-zA-Z\u0900-\u097F0-9]+", text.lower())
    if not tokens:
        return [0.0] * _VOCAB_DIM
    vec = [0.0] * _VOCAB_DIM
    cnt = Counter(tokens)
    for tok, freq in cnt.items():
        h1 = int(hashlib.md5(tok.encode()).hexdigest(), 16)
        h2 = int(hashlib.md5((tok + "_alt").encode()).hexdigest(), 16)
        w = 1.0 + math.log(freq)
        vec[h1 % _VOCAB_DIM] += w
        vec[h2 % _VOCAB_DIM] += w * 0.5
    # L2 normalize
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def cosine(a: List[float], b: List[float]) -> float:
    return sum(x * y for x, y in zip(a, b))
