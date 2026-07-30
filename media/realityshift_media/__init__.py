"""RealityShift media layer — divergence data to broadcast media, stored in B2.

Public surface:
  contracts.DivergenceBrief / NarrativeBeat  — the interface boundary
  adapter.build_brief                         — read-only Supabase -> brief
  provenance.apply_provenance                 — bind simulation fields into the manifest
  storage.backblaze_sink                      — content-addressable B2 sink
  pricing.register_pricing                    — cost recipes (SDK ships none)
"""
from .contracts import DivergenceBrief, NarrativeBeat

__all__ = ["DivergenceBrief", "NarrativeBeat"]
