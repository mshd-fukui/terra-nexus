"""炭素算定ロジックの単体テスト（外部データ不要）。"""
from pathlib import Path

from terranexus.carbon import CarbonPools, estimate, load_coefficients
from terranexus.landcover import LandCover

_TABLE = Path(__file__).resolve().parent.parent / "data_tables" / "carbon_pools.csv"


def test_load_coefficients_has_tree_class():
    coeffs = load_coefficients(_TABLE)
    assert 10 in coeffs  # Tree cover
    assert coeffs[10].total > 0


def test_estimate_matches_manual():
    # 森林 100ha + 市街地 50ha の合成流域
    coeffs = {10: CarbonPools(120, 30, 90, 10), 50: CarbonPools(2, 1, 30, 0)}
    lc = LandCover(area_ha_by_class={10: 100.0, 50: 50.0})
    res = estimate(lc, coeffs)

    expected_forest = 100 * (120 + 30 + 90 + 10)   # 25,000
    expected_built = 50 * (2 + 1 + 30 + 0)         # 1,650
    assert res.total_mg_c == expected_forest + expected_built
    assert res.by_class_mg_c[10] == expected_forest
    assert abs(res.density_mg_c_per_ha - res.total_mg_c / 150) < 1e-6


def test_green_and_forest_ratio():
    lc = LandCover(area_ha_by_class={10: 80.0, 30: 20.0, 50: 100.0})
    assert abs(lc.forest_ratio - 0.4) < 1e-9      # 80 / 200
    assert abs(lc.green_ratio - 0.5) < 1e-9       # (80+20) / 200
