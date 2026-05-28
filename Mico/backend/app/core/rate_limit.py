"""
Simple in-memory IP-based rate limiter.

Designed as a FastAPI dependency.  For multi-process / multi-worker
deployments replace the in-memory store with Redis (drop-in:
swap _store for a Redis sorted-set per key).

Default for the signup endpoint: 5 requests per IP per 60 seconds.
"""
import time
from collections import defaultdict
from threading import Lock
from typing import Callable

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    """
    Sliding-window rate limiter backed by a plain dict of timestamps.

    Thread-safe for single-process (uvicorn --workers 1) deployments.
    """

    def __init__(self, max_calls: int = 5, window_seconds: int = 60) -> None:
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._store: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def _get_key(self, request: Request) -> str:
        # prefer X-Forwarded-For when behind a proxy/load-balancer
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def __call__(self, request: Request) -> None:
        key = self._get_key(request)
        now = time.monotonic()
        cutoff = now - self.window_seconds

        with self._lock:
            # purge timestamps outside the sliding window
            self._store[key] = [t for t in self._store[key] if t > cutoff]

            if len(self._store[key]) >= self.max_calls:
                oldest = self._store[key][0]
                retry_after = int(self.window_seconds - (now - oldest)) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        f"Too many requests. "
                        f"Please wait {retry_after} second(s) before trying again."
                    ),
                    headers={"Retry-After": str(retry_after)},
                )

            self._store[key].append(now)


# Pre-built dependency instances ─ import and use directly in Depends()
signup_rate_limiter = InMemoryRateLimiter(max_calls=5, window_seconds=60)
