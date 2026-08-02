"""Presigned GET URLs for a PRIVATE Backblaze B2 bucket.

A private bucket returns 403 to an unauthenticated browser request, so the
front-page wall can't read `https://bucket/key` directly. Instead the batch job
presigns each asset (and the index) and writes the time-limited signed URL into
the media index. No public bucket, and no Worker proxy required.

Caveat: B2 download authorizations cap at 7 days (604800 s), so the index is
re-presigned whenever it's regenerated. For a persistent public site a public
bucket is simpler; this is the private-bucket path.

Uses B2's S3-compatible endpoint via boto3 (a genblaze-s3 dependency), so it
does not depend on Genblaze internals.
"""
from __future__ import annotations

import os
from urllib.parse import urlparse

MAX_EXPIRES = 7 * 24 * 3600  # B2 presign ceiling


def _endpoint(region: str) -> str:
    return f"https://s3.{region}.backblazeb2.com"


def _client():
    import boto3

    region = os.environ["B2_REGION"]
    return boto3.client(
        "s3",
        endpoint_url=_endpoint(region),
        aws_access_key_id=os.environ["B2_KEY_ID"],
        aws_secret_access_key=os.environ["B2_APP_KEY"],
        region_name=region,
    )


def object_key_from_url(url: str) -> str:
    """Recover the B2 object key from an asset URL the sink returned.

    Works for both virtual-hosted (`https://bucket.s3…/key`) and path-style
    (`https://s3…/bucket/key`) URLs.
    """
    path = urlparse(url).path.lstrip("/")
    bucket = os.environ.get("B2_BUCKET", "")
    if bucket and path.startswith(bucket + "/"):
        return path[len(bucket) + 1:]
    return path


def presign_get(key: str, expires: int = MAX_EXPIRES) -> str:
    """A time-limited signed GET URL for one object in the private bucket."""
    expires = min(expires, MAX_EXPIRES)
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": os.environ["B2_BUCKET"], "Key": key},
        ExpiresIn=expires,
    )


def presign_url(asset_url: str, expires: int = MAX_EXPIRES) -> str:
    """Presign an asset URL the sink produced (convenience over presign_get)."""
    return presign_get(object_key_from_url(asset_url), expires)
