"""Backblaze B2 storage for generated media and manifests.

Content-addressable so that forks sharing pre-divergence history share the
identical generated assets: identical prompts produce byte-identical output,
which collapses to a single object under assets/<sha[:2]>/<sha[2:4]>/<sha>. With
N forks off one divergence point, pre-divergence media cost is O(1), not O(N).
"""
from __future__ import annotations

import os

from genblaze_core import KeyStrategy, ObjectStorageSink
from genblaze_s3 import S3StorageBackend


def backblaze_sink(bucket: str | None = None) -> ObjectStorageSink:
    """Build a B2-backed sink.

    Credentials come from B2_KEY_ID / B2_APP_KEY / B2_BUCKET / B2_REGION unless
    passed explicitly. for_backblaze raises a clear error at construction if any
    are missing, rather than a cryptic failure mid-upload.
    """
    backend = S3StorageBackend.for_backblaze(
        bucket=bucket or os.environ["B2_BUCKET"],
        region=os.environ.get("B2_REGION"),
        key_id=os.environ.get("B2_KEY_ID"),
        app_key=os.environ.get("B2_APP_KEY"),
    )
    return ObjectStorageSink(backend, key_strategy=KeyStrategy.CONTENT_ADDRESSABLE)
