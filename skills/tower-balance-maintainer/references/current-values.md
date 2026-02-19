# 目前遊戲數值總表（中文）

最後同步日期：2026-02-16  
對應程式版本來源：`src/data/constants.js`、`src/engine/GameEngine.js`、`src/components/Game/Game.jsx`

---

## 1. 塔的基礎數值（`src/data/constants.js`）

| 塔名稱 | id | 建造花費 | 基礎傷害 | 攻擊距離 | 基礎攻速 | 基礎暴擊率 | 攻擊型態 |
|---|---|---:|---:|---:|---:|---:|---|
| 近戰塔 | `melee` | 100 | 15 | 2 | 0.85 | 20% | `melee` |
| 弓箭塔 | `projectile` | 100 | 10 | 6 | 0.5 | 0% | `projectile` |
| 緩速塔 | `projectile_slow` | 100 | 6 | 4 | 0.6 | 0% | `projectile_slow` |
| 砲擊塔 | `projectile_aoe` | 100 | 14 | 4 | 0.5 | 0% | `projectile_aoe` |
| 法術塔 | `magic` | 100 | 8 | 12 | 0.3 | 0% | `magic` |

補充：
- 「基礎攻速」在程式中是每秒攻擊次數的基底，實際出手頻率還會被地形、天賦、專精再乘上去。
- 緩速塔目前是投射物塔（不是光環持續緩速）。

---

## 2. 天賦數值（`src/data/constants.js` + `src/engine/GameEngine.js`）

### 2.1 塔相關天賦
- `tower_dmg_base`：每級 +1 基礎傷害（加在塔原始 damage 上）。
- `tower_attr_dmg`：每級 +10%（目前乘在整體 damage 計算上）。
- `tower_atk_speed`：每級 +5% 攻速。
- `tower_range`：每級 +0.5 攻擊距離。
- `tower_aoe_range`：每級 +0.5（目前常數有定義，但 `GameEngine` 尚未真正套用）。
- `tower_proj_count`：每級 +1 攻擊目標數（多重目標）。
- `tower_chain`：每級 +1 連鎖次數。
- `tower_crit_chance`：每級 +5% 暴擊率。

#### 2.1.1 升級三選一天賦池（每座塔等級提升時）
- 全塔通用：
  - `base_dmg`：基礎傷害 +25%。
  - `fire_dmg`：火屬性附加傷害 +25%（以塔基礎傷害為基準累加）。 
  - `water_dmg`：水屬性附加傷害 +25%（以塔基礎傷害為基準累加）。
  - `wood_dmg`：木屬性附加傷害 +25%（以塔基礎傷害為基準累加）。
  - `crit_chance`：暴擊率 +10%。 (該塔暴擊率高於等於100%時，天賦池不會出現)
  - `crit_dmg`：暴擊傷害 +20%。 
  - `speed`：攻速 +10%。(該塔取得5次後 即不會再次出現)
  - `range`：射程 +1。(該塔取得2次後 即不會再次出現) 
- 投射物塔限定（弓箭塔/緩速塔/砲擊塔）：
  - `proj_chain_up`：連鎖次數 +1。  (該塔取得2次後 即不會再次出現)
  - `proj_count_up`：攻擊數量 +1（同次攻擊可鎖定更多目標）。(該塔取得2次後 即不會再次出現)
- 近戰塔限定：
  - `melee_bleed`：附加流血（每秒基礎傷害 30% 持續 4 秒，每級再 +30%）。
  - `addition_attack`：額外攻擊次數+1。攻擊目標時額外攻擊一次但傷害只有基礎傷害的50%。(該塔取得3次後 即不會再次出現)
- 緩速塔限定：
  - `slow_power_up`：緩速效果 +10%（可疊）。(該塔取得3次後 即不會再次出現)
- 砲擊塔限定：
  - `knockback_up`：擊退距離 +0.5。
- 法術塔限定(法術塔不使用通用天賦)：
  - `base_magic_dmg`：基礎傷害 +20。
  - `speed_magic`：急速施法 攻擊間隔縮短20% (僅5次 最高5等)
  - `trigger_magic`：觸發機率+20% (僅3次 最高3等  僅在學會一座塔elemental_xxx_magic後出現) 
  - `elemental_fire_magic`：基礎傷害轉為火屬性傷害，擊中時40%機率產生爆炸 造成基礎傷害+40點(每等級+60點傷害)範圍傷害(範圍3格) 怪物受到爆炸傷害後，會被點燃，後續受到火焰傷害時會增加承受的傷害量(每層+10%上限5層) (一座塔elemental_xxx_magic 等元素魔法僅能挑選一種)
  - `elemental_water_magic`：基礎傷害轉為水屬性傷害，擊中時40%機率產生水花 造成基礎傷害+40點(每等級+60點傷害)範圍傷害(範圍3格) 受到該傷害的怪物減少移動速度(每層+20%上限5層) (一座塔elemental_xxx_magic 等元素魔法僅能挑選一種)
  - `elemental_wood_magic`：基礎傷害轉為木屬性傷害，擊中時40%機率在該目標點產生龍捲風 造成每秒基礎傷害+20點(每等級+40點傷害)範圍傷害(範圍3格) 持續三秒鐘，會定期將周圍五格怪物逐漸吸引到龍捲風的中心點(完全不動的敵人會被吸進去、朝龍捲風中心點移動中的敵人會增加速度、遠離龍捲風中心點移動中的敵人會被減速) (一座塔elemental_xxx_magic 等元素魔法僅能挑選一種)

#### 2.1.2 專精天賦池（塔滿等後）
- 條件型全域專精：
  - `spec_speed_aura`：加速靈氣（條件：`speed` 至少選 5 次），全塔攻速 +10%。
  - `spec_fire_global`：火之靈氣（條件：`fire_dmg` 至少選 5 次），全塔命中觸發 20% 基礎傷害的附加火焰傷害（2 格）。
  - `spec_water_global`：水之靈氣（條件：`water_dmg` 至少選 5 次），全塔命中25%機率暈眩 0.15 秒並附加 50% 基礎水傷。
  - `spec_wood_global`：木之靈氣（條件：`wood_dmg` 至少選 5 次），全塔命中附加中毒（每秒 10% 基礎傷害，4 秒，所有中毒傷害分開計算）。
  - `spec_crit_global`：暴擊靈氣（條件：`crit_chance` 至少選 5 次），全塔暴擊機率 +20%。
  - `spec_crit_dmg_global`：暴擊靈氣（條件：`crit_dmg` 至少選 5 次），全塔暴擊傷害 +20%。
- 無條件塔個體專精：
  - `spec_tower_speed_50`：該塔攻速 +20%。
  - `spec_tower_base_100`：該塔基礎傷害 +100%（x2）。
  - `spec_tower_range_3`：該塔射程 +3。
  - `spec_tower_share_exp`：該塔擊殺經驗隨機分配給其他塔。
  - `spec_tower_crit_random`：該塔暴擊傷害額外 +10% ~ +1000%（隨機）。
  - `spec_tower_stun_02`：該塔命中暈眩 0.2 秒。
  - `spec_tower_fire_explosion`：該塔命中觸發 50% 基礎火爆（3 格）。
  - `spec_tower_attr_off_triple`：該塔屬性傷害失效，但基礎傷害 x3。
  - `spec_tower_half_dmg_double_speed`：該塔基礎傷害減半，攻速翻倍。

#### 2.1.3 各塔可出現的三選一/專精（快速查表）
- 近戰塔（`melee`）：
  - 三選一：全塔通用 + `melee_bleed`。
  - 專精：全域條件型 + 無條件塔個體專精。
- 弓箭塔（`projectile`）：
  - 三選一：全塔通用 + `proj_chain_up` + `proj_count_up`。
  - 專精：全域條件型 + 無條件塔個體專精。
- 緩速塔（`projectile_slow`）：
  - 三選一：全塔通用 + `slow_power_up`。
  - 專精：全域條件型 + 無條件塔個體專精。
- 砲擊塔（`projectile_aoe`）：
  - 三選一：全塔通用 + `proj_chain_up` + `proj_count_up`+ `knockback_up`。
  - 專精：全域條件型 + 無條件塔個體專精。

### 2.2 關卡與遊戲節奏天賦
- `mob_hp_drop`：每級怪物血量 +30%，掉落資源 +10%。
- `mob_density`：怪物密度倍率 = `2^等級`（等級越高，同波怪更多、出怪更快）。
- `game_speed`：每級 +0.25 倍速，最高 4 級（1.0x -> 2.0x）。
- `player_max_hp`：每級玩家最大生命 +1。

---

## 3. 核心公式（`src/engine/GameEngine.js`）

### 3.1 塔衍生屬性
- `damage = (baseDamage + tower_dmg_base) * (1 + tower_attr_dmg)`
- `range = baseRange + tower_range`
- `speed = baseSpeed * (1 + tower_atk_speed)`
- `crit = baseCrit + tower_crit_chance`

### 3.2 攻擊出手判定
- 當 `cooldown <= 0` 時發動攻擊。
- 發動後 `cooldown = 1 / effectiveSpeed`。
- `effectiveSpeed = tower.stats.speed * terrainSpeedMult * globalSpeedAura * towerMasterySpeed`

### 3.3 十關後成長
- 第 1~10 關：怪物血量倍率固定 `x1`。
- 第 11 關起：每關血量再乘 `1.3`，公式 `1.3^(wave-10)`（複利）。

---

## 4. 投射物、連鎖、多目標（`src/engine/GameEngine.js`）

### 4.1 多目標攻擊數
- 最終目標數 = `1 + floor(tower_proj_count) + tower.bonusTargets`

### 4.2 連鎖次數
- 最終連鎖數 = `floor(tower_chain) + tower.bonusChain`
- 連鎖搜尋半徑：5 格
- 每次連鎖後傷害乘上 `0.7`（持續遞減）
- 連鎖目標優先選擇距離最近的目標
- 連鎖發生時，該次連鎖中已連鎖過的對象不會再連鎖

### 4.3 目標死亡時投射物行為
- 若投射物飛行途中目標死亡：
  - 會繼續飛往該目標「最後位置」。
  - 抵達後直接消失。
  - 不再造成傷害或爆炸。

---

## 5. 狀態效果與命中附加（`src/engine/GameEngine.js`）

### 5.1 緩速塔（`projectile_slow`）命中效果
- 作用範圍：命中點周圍 2 格。
- 持續時間：3 秒。
- 緩速比例：`min(95%, 20% + slowPowerLevel * 10%)`
- 可疊加：同目標可有多層緩速，最終移速倍率採乘法堆疊，最低保底 `0.05`（不會低於 5%）。

### 5.2 流血（近戰塔升級 `melee_bleed`）
- 每層流血每秒傷害：`towerDamage * (0.3 * bleedLevel)`
- 持續 4 秒，每秒跳一次。
- 同一座塔重新命中會刷新自己的流血持續時間。
- 刷新當下會先觸發一次立即傷害（等於一跳流血傷害）。

### 5.3 木專精中毒
- 每次命中新增一層中毒，彼此獨立計算。
- 每秒傷害：來源塔基礎傷害的 10%。
- 持續 4 秒。

### 5.4 水專精
- 命中附加暈眩 0.15 秒。
- 同時附加來源塔基礎傷害 50% 的水屬性傷害。

### 5.5 火專精 / 塔本地火爆
- 以命中目標為中心，半徑 3 格爆炸。
- 爆炸傷害為來源塔基礎傷害 50%（火屬性）。

### 5.6 砲擊塔擊退
- 砲擊塔命中時，目標沿路徑被往回推約 0.5 格進度。

---

## 6. 地形效果（`src/engine/GameEngine.js`）

### 6.1 蓋塔地形加成
- `highland`（高地）：投射物傷害 x1.3。
- `forest`（森林）：投射物塔 30% miss、近戰塔暴擊 +20%。
- `plain`（平原）：近戰塔攻速 x1.2。
- `swamp`（沼澤）：近戰塔攻速 x0.8。

### 6.2 路徑地形對怪物
- `swamp`（沼澤）：怪物移速 x0.7。
- `plain`（平原）：怪物移速 x1.1。

---

## 7. 畫面顯示對照（`src/components/Game/Game.jsx`）

### 7.1 塔格顯示文字
- `melee -> 近`
- `projectile -> 弓`
- `projectile_slow -> 緩`
- `projectile_aoe -> 砲`

### 7.2 投射物顏色
- 弓箭塔投射物：黃色（`#ffd54a`）
- 緩速塔投射物：藍色（`#66b8ff`）

### 7.3 攻擊動畫規格（戰鬥特效）
- 法術塔（未選元素術式）：
  - 以紫色球（`magic_orb`）在目標怪物位置出現後立即爆炸（`magic_burst`）。
  - 視覺上為「直接在目標身上爆炸」，非飛行軌跡型投射物。
- 法術塔（已選 `elemental_xxx_magic`）：
  - `elemental_fire_magic`：改為火焰爆炸動畫（`fire_burst`）。
  - `elemental_water_magic`：改為水花擴散動畫（`water_burst`）。
  - `elemental_wood_magic`：改為木系爆發動畫（`wood_burst`）並搭配龍捲風持續區域效果（`tornado`）。
- 其餘塔維持原有動畫：
  - 弓箭塔：黃色投射物。
  - 緩速塔：藍色投射物。
  - 砲擊塔：原投射物 + 命中效果。

---

## 8. 之後每次改數值必做清單

1. 先改程式：`src/data/constants.js` / `src/engine/GameEngine.js`。  
2. 同步更新本檔，寫明「新公式與新數值」。  
3. 若玩家看得到文字，也同步 `src/components/Game/Game.jsx`、`src/components/MainMenu/TalentTree.jsx`。  
4. 執行 `npm run build` 確認沒壞。  
5. 回報時請用 `舊值 -> 新值` 條列。  
