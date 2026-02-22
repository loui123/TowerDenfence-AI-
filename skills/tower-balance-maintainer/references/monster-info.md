# 怪物資訊與道具掉落

## 1. 怪物基礎設定（目前）
- 波次怪物基礎血量：`10 * 波數 * 怪物血量天賦倍率 * 關卡倍率`
- 波次 10 以上額外關卡倍率：每關 `+30%`（複利）
- 基礎移動速度：`2`
- 地形移速修正：
  - 沼澤：`-30%`
  - 平原：`+10%`

## 2. 怪物類型與資源掉落
- `normal`：掉落【能量】（`energy`）
- `fire`：掉落【紅水晶】
- `wood`：掉落【綠寶石】
- `water`：掉落【藍水晶】
- `boss`：在原有屬性掉落之外，額外掉落【金礦】

### 2.1 掉落對照（摘要）
- 一般怪物（`normal`）→ 能量
- 火屬性怪物（`fire`）→ 紅水晶
- 木屬性怪物（`wood`）→ 綠寶石
- 水屬性怪物（`water`）→ 藍水晶
- BOSS（任意屬性）→ 額外金礦

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

## 5. 怪物詞墜（進階機制）
- 第 11 波起：怪物有機率獲得 1 個隨機詞墜。
- 第 50 波起：怪物有機率同時獲得多個詞墜。
- 詞墜會在關卡怪物資訊（當波/下波）中顯示。

### 5.1 詞墜效果
- 緩速效果減免
- 暈眩效果硬質
- 暈眩效果減免
- 暴擊傷害減免
- 近戰傷害減免
- 流血減免
- 中毒傷害減免
- 投射物傷害減免
- 元素傷害減免
- 怪物移動速度提升
