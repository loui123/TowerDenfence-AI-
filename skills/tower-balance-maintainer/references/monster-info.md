# 怪物資訊與道具掉落

## 1. 怪物基礎設定（目前）
- 波次怪物基礎血量：`10 * 波數 * 怪物血量天賦倍率 * 關卡倍率`
- 波次 10 以上額外關卡倍率：每關 `+30%`（複利）
- 基礎移動速度：`2`
- 地形移速修正：
  - 沼澤：`-30%`
  - 平原：`+10%`

## 2. 怪物類型與資源掉落
- `normal`：掉落能量（`energy`）
- `fire`：掉落礦石（`ore`）
- `water`：掉落水晶（`water`）
- `wood`：掉落木材（`wood`）

## 3. 道具/裝備掉落表（每次擊殺各條目獨立判定）

### 3.1 normal
- `潤滑油`（`lubricant`）：`0.4%`
- `火力全開`（`full_firepower`）：`0.4%`
- `閃電鏈`（`chain_lightning`）：`0.2%`
- `勇氣旗幟`（`courage_banner`）：`0.2%`
- `殺戮旗幟`（`slaughter_banner`）：`0.2%`
- `靈活旗幟`（`agility_banner`）：`0.2%`

### 3.2 fire
- `力量之書`（`power_book`）：`2%`
- `潤滑油`（`lubricant`）：`0.4%`
- `火力全開`（`full_firepower`）：`0.4%`
- `閃電鏈`（`chain_lightning`）：`0.2%`
- `勇氣旗幟`（`courage_banner`）：`0.2%`
- `殺戮旗幟`（`slaughter_banner`）：`0.2%`
- `靈活旗幟`（`agility_banner`）：`0.2%`

### 3.3 water
- `等級之書`（`level_book`）：`1%`
- `潤滑油`（`lubricant`）：`0.4%`
- `火力全開`（`full_firepower`）：`0.4%`
- `閃電鏈`（`chain_lightning`）：`0.2%`
- `勇氣旗幟`（`courage_banner`）：`0.2%`
- `殺戮旗幟`（`slaughter_banner`）：`0.2%`
- `靈活旗幟`（`agility_banner`）：`0.2%`

### 3.4 wood
- `速度之書`（`speed_book`）：`1%`
- `潤滑油`（`lubricant`）：`0.4%`
- `火力全開`（`full_firepower`）：`0.4%`
- `閃電鏈`（`chain_lightning`）：`0.2%`
- `勇氣旗幟`（`courage_banner`）：`0.2%`
- `殺戮旗幟`（`slaughter_banner`）：`0.2%`
- `靈活旗幟`（`agility_banner`）：`0.2%`

## 3.5 輔助塔相關額外產出
- 以下由「輔助塔升級/專精」直接產生，不走怪物掉落表：
  - `level_book`
  - `speed_book`
  - `power_book`
  - `crit_book`

## 4. 維護建議
- 若要調整掉落機率，請同步修改：
  - `src/data/items.js`
  - 本檔 `skills/tower-balance-maintainer/references/monster-info.md`
  - 道具說明檔 `skills/tower-balance-maintainer/references/item-system.md`
