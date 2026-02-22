# 選單天賦樹（Main Menu Talent Tree）

## 位置與用途

- UI：`src/components/MainMenu/TalentTree.jsx`
- 天賦定義：`src/data/constants.js` 的 `TALENTS`
- 實際套用：`src/engine/GameEngine.js`

## 分類（目前實作）

1. `Economy`
- `initial_gold`
- `player_max_hp`

2. `Tower Damage`
- `tower_dmg_base`
- `tower_attr_dmg`
- `tower_crit_chance`

3. `Attack Pattern`
- `tower_proj_count`
- `tower_chain`
- `tower_aoe_range`（目前僅常數與 UI，尚未在引擎套用）

4. `Tempo and Coverage`
- `tower_atk_speed`
- `tower_range`
- `game_speed`

5. `Level Rules`
- `mob_hp_drop`
- `mob_density`

## 成本與等級規則

- 升級成本：`floor(baseCost * 1.5^目前等級)`
- 退還：退還上一級成本（同公式前一階）
- 資源：`energy / wood / ore / water`

## 遊戲速度規則

- `game_speed` 每級 `+0.25x`，最高 4 級（上限 `x2.00`）
- 關卡內速度可調範圍：`x1.00 ~ x2.00`
- 調速步進：`0.25`

## UI 注意事項

- 卡片按鈕雙欄採 `minmax(0, 1fr)`，避免內容撐爆。
- 按鈕內容使用 `minWidth: 0` 並限制在卡片內。
- 長文案使用 `overflowWrap: anywhere`。
