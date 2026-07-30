"""Pricing recipes for the models we use.

Genblaze ships zero hardcoded prices (core >= 0.3.0): compute_cost() and
Pipeline.estimated_cost() return None for any model until pricing is registered
here. Without this the cost dashboard renders empty columns and nothing warns
you — see GENBLAZE_FEEDBACK.md #3.

Rates are GMICloud list prices captured from the Genblaze model matrix and are a
snapshot — verify against GMICloud before trusting them for billing. Maintained
here, in application code, exactly as the SDK's pricing-recipes cookbook intends.
"""
from __future__ import annotations

from typing import Any

from genblaze_core.providers.pricing import per_output_second, per_unit

# model slug -> pricing strategy
_IMAGE_PRICES = {
    "seedream-5.0-lite": per_unit(0.035),          # $/asset
    "flux-1-schnell": per_unit(0.003),
}
_VIDEO_PRICES = {
    "seedance-1-0-pro-fast": per_unit(0.022),       # $/asset — bulk / iteration
    "seedance-1-0-pro-250528": per_unit(0.300),     # $/asset
    "seedance-2-0-260128": per_output_second(0.052),  # $/second — hero broadcast only
    "kling-image2video-v2.1-master": per_unit(0.280),  # $/asset
}


def register_pricing(provider: Any) -> int:
    """Register every known rate that matches models in this provider's registry.

    Returns the count registered, so a caller can assert coverage rather than
    silently ship an un-priced dashboard.
    """
    registered = 0
    for slug, strategy in {**_IMAGE_PRICES, **_VIDEO_PRICES}.items():
        try:
            provider.models.register_pricing(slug, strategy)
            registered += 1
        except Exception:
            # Slug not in this provider's registry — skip; another provider owns it.
            continue
    return registered
