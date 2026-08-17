"""Lightweight in-memory rate limiter.

Good enough for a single-process deployment. For multi-worker / multi-instance
production, swap the ``_buckets`` store for a shared Redis backend — the public
``rate_limit()`` API can stay the same.
"""
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request

_buckets: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_lock = Lock()


def rate_limit(max_calls: int, window_seconds: int):
    """FastAPI dependency: allow ``max_calls`` per ``window_seconds`` per IP+path."""

    async def _checker(request: Request) -> None:
        client = request.client
        ip = client.host if client else "unknown"
        key = (ip, request.url.path)
        now = time.monotonic()
        with _lock:
            dq = _buckets[key]
            while dq and now - dq[0] > window_seconds:
                dq.popleft()
            if len(dq) >= max_calls:
                raise HTTPException(
                    429,
                    detail={
                        "code": "RATE_LIMITED",
                        "message": "Too many requests. Please try again shortly.",
                    },
                )
            dq.append(now)

    return _checker
