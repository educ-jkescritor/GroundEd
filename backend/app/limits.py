"""Load protection for a small public server (one process, e.g. a 2 vCPU Vultr instance).

- Analysis slots: at most MAX_CONCURRENT_ANALYSES PDFs are analysed at once. A request waits up to
  ANALYSIS_QUEUE_SECONDS for a slot, then gets HTTP 429 ("busy") instead of piling up threads.
  A slot is only freed when the analysis thread really finishes, even if the client already got a timeout.
- Draft rate limit: Gemini calls (not cache hits) are limited per client and per day, so a public demo
  cannot spend the API credit. In memory: resets on restart, which is fine for one process.
"""
from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
from datetime import date
from typing import Awaitable, Callable, TypeVar

from fastapi import HTTPException

from . import config

T = TypeVar("T")

_slots: asyncio.Semaphore | None = None


def _semaphore() -> asyncio.Semaphore:
    global _slots
    if _slots is None:
        _slots = asyncio.Semaphore(config.MAX_CONCURRENT_ANALYSES)
    return _slots


def reset() -> None:
    """For tests: forget slots and counters."""
    global _slots
    _slots = None
    _draft_calls.clear()
    _daily.clear()


async def run_analysis(start: Callable[[], Awaitable[T]]) -> T:
    """Run `start()` in an analysis slot, with the queue wait and the analysis time limit applied."""
    sem = _semaphore()
    try:
        await asyncio.wait_for(sem.acquire(), timeout=config.ANALYSIS_QUEUE_SECONDS)
    except asyncio.TimeoutError as e:
        raise HTTPException(429, "GroundEd is analysing other modules right now. Please try again in a minute.",
                            headers={"Retry-After": "30"}) from e
    task = asyncio.ensure_future(start())
    try:
        result = await asyncio.wait_for(asyncio.shield(task), timeout=config.ANALYSIS_TIMEOUT_SECONDS)
    except asyncio.TimeoutError as e:
        task.add_done_callback(lambda _: sem.release())  # the thread is still working: free the slot when it ends
        raise HTTPException(504, f"Analysis took longer than {config.ANALYSIS_TIMEOUT_SECONDS} seconds and was "
                                 "stopped. Try a shorter PDF.") from e
    except BaseException:  # pipeline error (e.g. bad PDF) or cancellation
        if task.done():
            sem.release()
        else:
            task.add_done_callback(lambda _: sem.release())
        raise
    sem.release()
    return result


_draft_calls: dict[str, deque[float]] = defaultdict(deque)
_daily: dict[str, int] = {}


def check_draft_allowed(client: str) -> None:
    """Raise 429 if this client or the whole server used up its AI-draft allowance. Call only before a real
    Gemini call (cached drafts are free)."""
    now = time.monotonic()
    q = _draft_calls[client]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= config.DRAFTS_PER_MINUTE_PER_CLIENT:
        raise HTTPException(429, f"Too many AI draft requests (limit {config.DRAFTS_PER_MINUTE_PER_CLIENT} per "
                                 "minute). Please wait a minute.", headers={"Retry-After": "60"})
    today = date.today().isoformat()
    if _daily.get(today, 0) >= config.DRAFTS_PER_DAY:
        raise HTTPException(429, f"The daily limit of {config.DRAFTS_PER_DAY} AI drafts for this server is used "
                                 "up. Evidence and scores still work; drafts are available again tomorrow.")
    q.append(now)
    if today not in _daily:
        _daily.clear()  # new day: drop yesterday's counter
    _daily[today] = _daily.get(today, 0) + 1
