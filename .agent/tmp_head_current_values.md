# 目前遊戲數值總表（中文）

最後同步日期：2026-02-21  
對應程式版本來源：`src/data/constants.js`、`src/engine/GameEngine.js`、`src/components/Game/Game.jsx`

---

## 0. 近期更新摘要（2026-02-21）

- 新增塔型：`support`（輔助塔）
  - 基礎：`damage=0`、`range=1`、`speed=0`、`crit=0`、`cost=100`
  - 不套用一般塔天賦（`tower_dmg_base/tower_attr_dmg/tower_atk_speed/tower_range/tower_crit_chance`）。
  - 以「附近非輔助塔擊殺」獲得經驗，每 `15 EXP` 升 1 級。
- 新增輔助塔專屬升級池與專精池：
  - 升級：攻擊/速度/緩速/暴擊靈氣強化、靈氣轉換、範圍+1、道具獎勵、金幣獎勵。
  - 專精：書本 x10、靈氣翻倍、範圍+5、幸運靈氣。
- 新增靈氣機制：
  - 一般塔會吃到輔助塔提供的傷害/攻速/暴擊率加成。
  - 緩速靈氣會作用於怪物移速（上限仍受最低移速保底限制）。
  - 幸運靈氣：每秒隨機 `+0.00 ~ +2.00` 暴傷加成。
- 新增道具與裝備：
  - `crit_book`（暴擊之書）：暴擊率 +10%。
  - `build_book`（建設之書）：本局可建塔上限 +1（Boss 擊殺 10% 機率掉落）。
  - `full_firepower`（火力全開）：基礎攻擊力改為 40，仍保留既有倍率與天賦乘算。
  - `lubricant`（潤滑油）修正為：基礎攻速改為 1，並保留既有倍率與天賦乘算。
- 關卡流程調整：
  - 取消「第 10 波特殊結算／通關通知」，改為無限波次持續推進。
- 左下「所有塔資訊」面板：
  - 即時依 DPS 排序（不改變使用者目前選取的塔目標）。
- 掉落規則調整：
  - 波數越高，怪物擊殺資源掉落越多（與原有掉落倍率乘算）。
- 介面流程更新（關卡內）：
  - 左上「塔的詳細資訊」改為「選取塔顯示」，不再靠 hover。
  - 右下改為「更新日誌 / Console」。
  - Console 最多 7 行，舊到新排序（新訊息在最下）。
  - 建塔金幣不足時不跳對話框，改為上方短暫字幕「金錢不足」。
  - 地圖格子改為像素風地形圖，build 格做降彩與半透明處理。

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
- 塔的等級到達十等為滿等，無法再升級，且獲得一個專精天賦 (塔的格子背景顏色隨等級由橘色到紫色  滿等會變白色)。 
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
  - `wood_dmg`：木屬性附加傷害 +25%（以塔基礎傷害為基準累加）。 習得後，攻擊附加中毒效果。
  - `crit_chance`：暴擊率 +10%。 (該塔暴擊率高於等於100%時，天賦池不會出現)
  - `crit_dmg`：暴擊傷害 +20%。 
  - `speed`：攻速 +10%。(該塔取得4次後 即不會再次出現)
  - `range`：射程 +1。(該塔取得4次後 即不會再次出現) 
  - `poison_dmg`：中毒傷害 +40%(該塔取得3次後 即不會再次出現)。 (僅在wood_dmg習得後出現) 
  - `poison_duration`：中毒持續時間 +2秒(該塔取得3次後 即不會再次出現)。 (僅在wood_dmg習得後出現) 
  - `poison_frequency`：中毒傷害頻率 +25%。 (僅在wood_dmg習得後出現) 
- 投射物塔限定（弓箭塔/緩速塔/砲擊塔）：
  - `proj_chain_up`：連鎖次數 +1。  (該塔取得4次後 即不會再次出現)
  - `proj_count_up`：攻擊數量 +1（同次攻擊可鎖定更多目標）。(該塔取得2次後 即不會再次出現)
- 近戰塔限定：
  - `melee_bleed`：附加流血（每秒造成傷害的 30% 持續 4 秒，每級再 +30% 不得疊加）。
  - `addition_attack`：額外攻擊次數+1。攻擊目標時額外攻擊一次但傷害只有基礎傷害的50%。(該塔取得3次後 即不會再次出現)
- 緩速塔限定：
  - `slow_power_up`：緩速效果 +10%（可疊）。(該塔取得3次後 即不會再次出現)
- 砲擊塔限定：
  - `knockback_up`：攻擊爆炸擊退距離 +0.5。
  - `knockback_stun`：攻擊爆炸附加怪物暈眩0.2秒。
  - `knockback_radius`：攻擊爆炸範圍 +1格。
- 法術塔限定(法術塔不使用通用天賦)：
  - `base_magic_dmg`：基礎傷害 +20。
  - `speed_magic`：急速施法 攻擊間隔縮短20% (僅5次 最高5等)
  - `trigger_magic`：觸發機率+20% (僅3次 最高3等  僅在學會一座塔elemental_xxx_magic後出現) 
  - `elemental_fire_magic`：基礎傷害轉為火屬性傷害，擊中時40%機率產生爆炸 造成基礎傷害+40點(每等級+60點傷害)範圍傷害(範圍3格) 怪物受到爆炸傷害後，會被點燃，後續受到火焰傷害時會增加承受的傷害量(每層+10%上限5層) (一座塔elemental_xxx_magic 等元素魔法僅能挑選一種)
  - `elemental_water_magic`：基礎傷害轉為水屬性傷害，擊中時40%機率產生水花 造成基礎傷害+40點(每等級+60點傷害)範圍傷害(範圍3格) 受到該傷害的怪物減少移動速度(每層+20%上限5層) (一座塔elemental_xxx_magic 等元素魔法僅能挑選一種)
  - `elemental_wood_magic`：基礎傷害轉為木屬性傷害，擊中時40%機率在該目標點產生龍捲風 造成每秒基礎傷害+20點(每等級+40點傷害)範圍傷害(範圍3格) 持續三秒鐘，會定期將周圍五格怪物逐漸吸引到龍捲風的中心點(完全不動的敵人會被吸進去、朝龍捲風中心點移動中的敵人會增加速度、遠離龍捲風中心點移動中的敵人會被減速) (一座塔elemental_xxx_magic 等元素魔法僅能挑選一種)

#### 2.1.2 專精天賦池（塔滿等後）
- 條件型全域專精：
  - `spec_speed_aura`：加速靈氣（條件：`speed` 至少選 4 次），全塔攻速 +10%。
  - `spec_fire_global`：火之靈氣（條件：`fire_dmg` 至少選 4 次），全塔命中觸發 20% 基礎傷害的附加火焰傷害（2 格）。
  - `spec_water_global`：水之靈氣（條件：`water_dmg` 至少選 4 次），全塔命中25%機率暈眩 0.15 秒並附加 50% 基礎水傷。
  - `spec_wood_global`：木之靈氣（條件：`wood_dmg` 至少選 4 次），全塔命中附加中毒（每秒 10% 基礎傷害，4 秒，所有中毒傷害分開計算），並提升中毒時間5秒。
  - `spec_crit_global`：暴擊靈氣（條件：`crit_chance` 至少選 4 次），全塔暴擊機率 +20%。
  - `spec_crit_dmg_global`：暴擊靈氣（條件：`crit_dmg` 至少選 4 次），全塔暴擊傷害 +20%。
  - `spec_chain_no_limit`：連鎖彈射（條件：`proj_chain_up` 至少選 3 次），該塔的連鎖傷害不會降低，且連鎖過的目標可重複連鎖。若無連鎖目標則將傷害加成到最後一次擊中的怪物身上。
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
  - `spec_tower_bleed`：該塔流血傷害增加200%並延長持續時間至10秒（條件：`melee_bleed` 至少選 3 次）。
  - `spec_tower_poison`：所有塔中毒傷害增加200%並延長持續時間10秒，並附加移動速度減緩15%（條件：`poison_dmg` 至少選 3 次）。
  - `spec_tower_poison_frequency`：所有塔中毒傷害頻率增加200%，並附加移動速度減緩15%（條件：`poison_frequency` 至少選 3 次）。 

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
- 第 1~10 關：怪物血量倍率固定 `x1.1`（複利）。
- 第 11 關起：每關血量再乘 `1.2`，公式 `1.2^(wave-10)`（複利）。


## 4. 投射物、連鎖、多目標（`src/engine/GameEngine.js`）

### 4.1 多目標攻擊數
- 最終目標數 = `1 + floor(tower_proj_count) + tower.bonusTargets`

### 4.2 連鎖次數
- 最終連鎖數 = `floor(tower_chain) + tower.bonusChain`
- 連鎖搜尋半徑：4 格
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
- 緩速比例：`min(95%, 30% + slowPowerLevel * 10%)`
- 可疊加：同目標可有多層緩速，最終移速倍率採乘法堆疊，最低保底 `0.05`（不會低於 5%）。

### 5.2 流血（近戰塔升級 `melee_bleed`）
- 每層流血每秒傷害：`towerDamage * (0.3 * bleedLevel)`
- 持續 4 秒，每秒跳一次。
- 同一座塔重新命中會刷新自己的流血持續時間。
- 刷新當下會先觸發一次立即傷害（等於一跳流血傷害）。

### 5.3 木專精中毒
- 每次命中新增一層中毒，彼此獨立計算。
- 每秒傷害：來源塔基礎傷害的 30%。
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
- `swamp`（沼澤）：近戰塔攻速 x0.8，緩速塔緩速效果 x1.2。
- `desert`（沙地）：所有塔攻速 x0.9，傷害 x1.2。

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

## 9. 資源掉落補充（最新）
- `normal`（一般怪物）掉落【能量】。
- `fire`（火屬性怪物）掉落【紅水晶】。
- `wood`（木屬性怪物）掉落【綠寶石】。
- `water`（水屬性怪物）掉落【藍水晶】。
- `boss` 會在原有屬性掉落之外，額外掉落【金礦】。
- 波數加成掉落倍率：`1 + (wave - 1) * 0.1`
- 最終資源掉落量：`floor(波數加成掉落倍率 * mob_hp_drop掉落倍率)`，最低為 `1`

## 10. 怪物詞墜（10波後）
- 第 11 波起：怪物有機率隨機附加 1 個詞墜。
- 第 50 波起：怪物有機率隨機附加多個詞墜（可能 2~3 個）。
- 詞墜會顯示在關卡怪物資訊（當波/下波）。

### 10.1 詞墜清單
- 緩速效果減免：被緩速效果最多至 80%~40%（依波數遞進，50 波後至 40%）。
- 暈眩效果硬質：每 1 秒最多承受 0.5 秒暈眩。
- 暈眩效果減免：暈眩持續時間減少 40%~80%（依波數遞進，50 波後至 80%）。
- 暴擊傷害減免：承受暴擊額外傷害最多減少到 0（減免量依波數遞進，50 波後等效至 200%）。
- 近戰傷害減免：承受近戰傷害減少 30%。
- 流血減免：承受流血傷害減少 30%。
- 中毒傷害減免：承受中毒傷害減少 50%。
- 投射物傷害減免：承受投射物傷害減少 30%。
- 元素傷害減免：承受元素傷害減少 30%。
- 怪物移動速度提升：怪物移動速度增加 10%~60%（依波數遞進，60波內遞進至60%）。
- 怪物生命提升:增加怪物生命10%~60%（依波數遞進，60波內遞進至60%）。

## 11. 怪物詞墜權重（調整用）
- 本區為「怪物詞墜清單」的權重參考，數值越高越容易被抽到。
- 建議以相對權重調整，不需總和 = 100。

| 詞墜ID | 詞墜名稱 | 建議權重 | 備註 |
|---|---:|---:|---|
| `slow_resist_cap` | 緩速效果減免 | 5 | 10波後生效，50波內遞進至40%下限 |
| `stun_hardness` | 暈眩效果硬質 | 5 | 每秒最多承受0.5秒暈眩 |
| `stun_duration_reduction` | 暈眩效果減免 | 5 | 10波後生效，50波內遞進至80% |
| `palsy_resist_cap` | 麻痺效果硬質 | 5 | 每秒最多承受0.1秒麻痺 |
| `crit_damage_reduction` | 暴擊傷害減免 | 5 | 50波內等效至200%減免上限 |
| `melee_dmg_reduction` | 近戰傷害減免 | 10 | 固定30% |
| `bleed_dmg_reduction` | 流血減免 | 10 | 固定30% |
| `poison_dmg_reduction` | 中毒傷害減免 | 10 | 固定50% |
| `projectile_dmg_reduction` | 投射物傷害減免 | 10 | 固定30% |
| `elemental_dmg_reduction` | 元素傷害減免 | 10 | 固定30% |
| `move_speed_up` | 怪物移動速度提升10~60% | 30 | 10波後生效，60波內遞進至60% |
| `hp_percent_up` | 增加怪物生命10~60%數 | 40 | 新增：10波後生效，60波內遞進至60% |

## 2026-02-23 更新（已實作）

### A. 詞墜頻率與規則
- 11~19 波：固定 1 詞墜
- 20~29 波：固定 2 詞墜（同波不重複）
- 30~39 波：固定 3 詞墜（同控制系詞墜不重複）
- 40 波後：每 10 波 +1 詞墜
- 30 波後允許重複的詞墜僅有 move_speed_up、hp_percent_up

### B. 控制遞減與控制平衡
- 新增控制抗性遞減：slow/stun/palsy/knockback，5 秒內連續控制會遞減效果，最低保留 35%
- 緩速疊加改為「最強緩速 100% + 其餘 30%」

### C. 地形/塔/裝備共鳴
- 新增 6 組共鳴（地形 x 塔型 x 裝備），會影響攻速、傷害、暴擊、緩速、擊退、連鎖等
- 關卡資訊面板可查看當波與下波共鳴提示

### D. 元素異常系統（火/水）
- 水分支新增「凍傷」：最高 100 層，持續 3 秒，刷新時疊層；每層提高承傷 5%
- 火分支新增「灼傷」：持續 3 秒，刷新時間；每秒傷害 = 灼傷層數 x 灼傷附加時命中傷害平均值
- spec_water_global、spec_fire_global 改為全塔附加凍傷/灼傷

### E. 地形對異常加成
- swamp：凍傷每層增傷 +30%，灼傷傷害 -20%
- desert：灼傷傷害 +40%，凍傷每層增傷 -20%
- orest：中毒傷害 +30%

### F. 新增專精重置道具
- 新增 specialization_reset_scroll，可重置「已選過專精的 Lv10 塔」並重新選擇專精

### G. 掉落權重調整
- 道具掉落改為「期望值封頂 + 每隻怪掉落上限」
- 一般怪最多 1 件，Boss 最多 2 件
- 保留 Boss 額外 uild_book 10% 機率
## 2026-02-23 更新（全域複合專精與法術複合專精）

### 1) 全域複合型條件專精（新增）
- spec_global_wood_base：條件=木附傷>=1 且基礎傷害>=1；效果=全塔基礎傷害 x1.2
- spec_global_wood_crit_dmg：條件=木附傷>=1 且暴擊傷害>=1；效果=全塔暴傷 +0.25
- spec_global_water_base：條件=水附傷>=1 且基礎傷害>=1；效果=全塔基礎傷害 x1.2
- spec_global_water_speed：條件=水附傷>=1 且攻速>=1；效果=全塔攻速 x1.12
- spec_global_fire_speed：條件=火附傷>=1 且攻速>=1；效果=全塔攻速 x1.12
- spec_global_fire_crit：條件=火附傷>=1 且暴擊率>=1；效果=全塔暴擊率 +10%
- spec_global_bleed_speed：條件=流血>=1 且攻速>=1；效果=全塔攻速 x1.1
- spec_global_bleed_base：條件=流血>=1 且基礎傷害>=1；效果=全塔基礎傷害 x1.15

### 2) 法術三選一天賦（新增）
- 元素術式解除互斥：elemental_fire_magic / elemental_water_magic / elemental_wood_magic 可同塔共存
- magic_wood_poison_talent：提升木屬性法術傷害量
- magic_water_frostbite_talent：提升水屬性法術異常效果與傷害量
- magic_fire_scorch_talent：提升火屬性法術異常效果與傷害量

### 3) 法術複合條件專精（新增）
- spec_magic_wood_base：木法術 + 基礎傷害；木法塔基礎傷害 x1.35
- spec_magic_water_frost_trigger：水法術 + 凍傷天賦；法術觸發率 +25%
- spec_magic_fire_speed：火法術；該塔攻速 x1.25
- spec_magic_combo_wood_fire：木+火改為「焚森術」，覆蓋原本木/火法術
- spec_magic_combo_fire_water：火+水改為「蒸潮術」，覆蓋原本火/水法術
- spec_magic_combo_water_wood：水+木改為「潮林術」，覆蓋原本水/木法術
- spec_magic_dual_ailment：任兩種異常法術天賦成立；提高觸發率與異常強度

### 4) 輔助塔專精（新增）
- support_spec_global_item_drop：條件=書系升級總次數（經驗/速度/力量/暴擊）>=3
- 效果=全域道具/裝備掉落率 +15%

### 5) 實作補充
- 法術塔改為 magicElements 多元素結構；單次觸發會在已啟用元素中抽取一種施放
- 若選到複合法術專精且元素條件成立，會取消原本單元素法術並改放複合法術
## 2026-02-23 更新（法術塔三選一文案）
- 木元素術式：攻擊時機率觸發龍捲風（龍捲風在場上持續3秒，每秒對範圍內怪物造成傷害），升級後提升傷害量
- 水元素術式：攻擊時機率觸發水球，升級後提升傷害量
- 火元素術式：攻擊時機率觸發炎爆，升級後提升傷害量

## 2026-02-23 更新（龍捲風與合併法術控場）
- 龍捲風現在具備持續控場：存在期間會持續牽引範圍內怪物，並持續附加短效緩速。
- 合併法術（木+火 / 火+水 / 水+木）施放後，會在場地上生成持續 3 秒的控場區域。
- 木+火、水+木：控場區會持續緩速並牽引怪物。
- 火+水：控場區會持續強化緩速，並有機率造成短暫硬控。
## 2026-02-23 更新（急救套件全域即時使用）
- 
epair_kit 改為點擊後立即使用（不需點塔）。
- 使用時若生命未滿：恢復 1 點生命。
- 使用時若生命已滿：同時擴充最大生命 +1，並回滿至新上限。
## 2026-02-23 更新（急救套件雙擊使用）
- 
epair_kit 調整為「連點兩下立即使用」。
- 若生命未滿：恢復 1 點生命。
- 若生命已滿：先擴充最大生命 +1，再恢復 1 點生命。
## 2026-02-23 更新（怪物數量曲線與詞墜）
- 無天賦時出怪曲線：10波=20、20波=35、30波=55、40波=80（封頂80）
- 公式：count = min(80, 0.025*w^2 + 0.75*w + 10)
- mob_density：每級 +0.25 倍，最高 x2。
- 新詞墜：
  - mob_count_up（30波後）：怪物數量 x1.25~x3，權重10
  - oss_count_up（30波後）：額外BOSS +1~+5，權重10
  - rostbite_dmg_reduction（10波後）：100波內遞進至95%
  - scorch_dmg_reduction（10波後）：100波內遞進至95%
## 2026-02-23 更新（依 monster-info 掉落實作）
- 一般怪掉落改為「各條目獨立判定」，並套用 item_drop_rate 倍率。
- 四屬怪掉落表：
  - normal：crit_book 5%、speed_book 2%、uild_book 2%
  - fire：crit_book 5%、power_book 2%、uild_book 2%
  - water：speed_book 5%、crit_book 2%、uild_book 2%
  - wood：power_book 5%、crit_book 2%、uild_book 2%
- Boss 額外掉落改為獨立判定：
  - uild_book 20%、level_book 10%、specialization_reset_scroll 2%
  - lubricant/full_firepower/chain_lightning 各 2%
  - courage_banner/slaughter_banner/agility_banner 各 3%
- 移除舊的 Boss 固定 uild_book 10% 額外判定。
