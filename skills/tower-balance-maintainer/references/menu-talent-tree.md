# 選單天賦樹（Main Menu Talent Tree）

## 位置與用途

- UI 檔案：`src/components/MainMenu/TalentTree.jsx`
- 天賦定義來源：`src/data/constants.js` 的 `TALENTS`
- 遊戲內實際效果套用：
  - 塔屬性與初始值：`src/engine/GameEngine.js`
  - 關卡/怪物倍率：`src/engine/GameEngine.js`
  - 遊戲速度上限與調速：`src/engine/GameEngine.js` + `src/components/Game/Game.jsx`

## 分類

1. `關卡設定` (使用energy)
- `initial_gold` 初始金幣
- `player_max_hp` 提升玩家最大生命
- `mob_hp_drop` 增加怪物血量與資源掉落
- `mob_density` 增加怪物密集度
- `item_drop_rate` 增加道具掉落機率

2. `近戰塔特性` (使用wood)
- `melee_tower_dmg_base` 增加塔基礎傷害
- `melee_tower_attr_dmg` 增加塔屬性傷害
- `melee_tower_crit_chance` 增加暴擊機率
- `melee_tower_atk_speed` 增加塔攻擊速度
- `melee_tower_range` 增加塔攻擊距離

3. `遠程塔特性` (使用ore)
- `range_tower_dmg_base` 增加塔基礎傷害
- `range_tower_attr_dmg` 增加塔屬性傷害
- `range_tower_atk_speed` 增加塔攻擊速度
- `range_tower_crit_chance` 增加暴擊機率
- `range_tower_chain` 增加投射物連鎖次數
- `range_tower_proj_count` 增加攻擊數量
- `range_tower_range` 增加塔攻擊距離

4. `法術塔特性` (使用water)
- `spell_tower_dmg_base` 增加塔基礎傷害
- `spell_tower_atk_speed` 增加塔攻擊速度
- `spell_tower_range` 增加塔攻擊距離

## 成本與等級規則

- 升級成本公式：`floor(baseCost * 1.5^目前等級)`
- 退還公式：退還上一級成本（同一公式的前一階）
- 資源種類：`energy / wood / ore / water`

## UI 注意事項

- 卡片操作按鈕為雙欄，需使用 `minmax(0, 1fr)` 防止內容把欄位撐爆。
- 按鈕內容（文字、圖示、數值）需 `minWidth: 0` 並限制在卡片內，避免跨卡片溢出。
- 長文案需可斷行（`overflowWrap: anywhere`），避免在窄欄位下超出框線。
- 遊戲內調速步進：`0.25`
- 遊戲內調速範圍：`x1.00` 到上限（`x2.00`）