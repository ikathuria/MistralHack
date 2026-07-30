"""Provenance is the submission's core idea, so it gets a real test.

These run fully offline — no B2, no GMICloud, no network — by driving the same
Manifest path a real pipeline uses. They prove the simulation fields are inside
the canonical SHA-256, which is what makes `genblaze verify` on a downloaded
asset meaningful.
"""
from datetime import date

from genblaze_core.models.manifest import Manifest
from genblaze_core.models.run import Run
from genblaze_core.models.step import Step

from realityshift_media.contracts import DivergenceBrief, NarrativeBeat
from realityshift_media.provenance import simulation_metadata


def _brief(fork_id="fork-1", cutoff=date(2019, 3, 1)):
    return DivergenceBrief(
        fork_id=fork_id,
        parent_fork_id="live",
        divergence_date=cutoff,
        sim_date=date(2024, 6, 1),
        nation_iso="IND",
        beats=[NarrativeBeat(headline="h", summary="s", entities=["IND"])],
        real_world_data_cutoff=cutoff,
        consensus_delta={"gdp_per_capita": 812.5},
    )


def _hash_for(brief):
    run = Run(name="broadcast", steps=[Step(provider="p", model="m", prompt="x")])
    run.metadata = {"simulation": simulation_metadata(brief)}
    return Manifest.from_run(run).canonical_hash


def test_cutoff_must_equal_divergence_date():
    import pytest
    with pytest.raises(ValueError):
        DivergenceBrief(
            fork_id="f", divergence_date=date(2019, 3, 1), sim_date=date(2024, 1, 1),
            real_world_data_cutoff=date(2020, 1, 1),  # mismatched on purpose
        )


def test_simulation_fields_present():
    meta = simulation_metadata(_brief())
    assert meta["fork_id"] == "fork-1"
    assert meta["real_world_data_cutoff"] == "2019-03-01"
    assert meta["is_counterfactual"] is True
    assert meta["consensus_reality"] is False


def test_fork_id_is_bound_into_the_canonical_hash():
    # Changing the fork must change the asset's provenance hash, or the manifest
    # would not actually attest which fork produced the media.
    assert _hash_for(_brief(fork_id="fork-A")) != _hash_for(_brief(fork_id="fork-B"))


def test_data_cutoff_is_bound_into_the_canonical_hash():
    assert _hash_for(_brief(cutoff=date(2019, 3, 1))) != _hash_for(_brief(cutoff=date(2021, 9, 1)))


def test_hash_is_deterministic():
    assert _hash_for(_brief()) == _hash_for(_brief())
