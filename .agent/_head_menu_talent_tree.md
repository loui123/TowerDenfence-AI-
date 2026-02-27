# 選單天賦樹（Main Menu Talent Tree）

## 1. 位置與用途
- UI：`src/components/MainMenu/TalentTree.jsx`
- 天賦定義：`src/data/constants.js` 的 `TALENTS`
- 成本與存檔：`src/contexts/GameContext.jsx`
- 關卡內實際效果：`src/engine/GameEngine.js`

## 2. 分類與天賦（目前實作）

### 2.1 關卡設定
- `initial_gold`：初始金幣（每級 +50）
- `player_max_hp`：玩家最大生命（每級 +1）
- `item_drop_rate`：道具掉落率（每級 +10%）
- `tower_limit`：可建塔上限（每級 +1）
- `mob_hp_drop`：怪物血量與資源掉落（每級怪物血量 +30%、資源 +10%）
- `mob_density`：怪物密集度（每級密度 x1.4）
- `boss_count`：首領數量（每關數量 +1）

### 2.2 近戰塔特性（紅水晶）
- `melee_tower_dmg_base`：每級 +1 基礎傷害
- `melee_tower_attr_dmg`：每級 +10% 屬性/總傷乘算
- `melee_tower_crit_chance`：每級 +5% 暴擊率
- `melee_tower_atk_speed`：每級 +5% 攻速
- `melee_tower_range`：每級 +0.5 距離

### 2.3 遠程塔特性（綠寶石）
- `range_tower_dmg_base`：每級 +1 基礎傷害
- `range_tower_attr_dmg`：每級 +10% 屬性/總傷乘算
- `range_tower_atk_speed`：每級 +5% 攻速
- `range_tower_crit_chance`：每級 +5% 暴擊率
- `range_tower_chain`：每級 +1 連鎖次數
- `range_tower_proj_count`：每級 +1 攻擊數量
- `range_tower_range`：每級 +0.5 距離

### 2.4 法術塔特性（藍水晶）
- `spell_tower_dmg_base`：每級 +1 基礎傷害
- `spell_tower_atk_speed`：每級 +5% 攻速
- `spell_tower_range`：每級 +0.5 距離

## 3. 成本與退款規則
- 升級成本：`floor(baseCost * 1.5^目前等級)`
- 退款金額：退還「上一級」實際花費成本（同公式 `level - 1`）
- 最高等級：目前未設定全域上限（除非單一天賦有 `maxLevel`，目前主選單天賦未設定）

## 4. 關卡內套用規則（現況）

### 4.1 塔屬性套用
`GameEngine.getTowerTalentModifiersForType(typeId)` 會依塔型前綴取值：
- 近戰：`melee_tower_*`
- 法術：`spell_tower_*`
- 投射物/緩速/砲擊：`range_tower_*`

套用公式：
- `baseDamage = (原始基礎傷害 + dmg_base) * (1 + attr_dmg)`
- `speed = 原始攻速 * (1 + atk_speed)`
- `range = 原始距離 + range`
- `crit = 原始暴擊率 + crit_chance`

### 4.2 關卡規則套用
- 初始金幣：`200 + getTalentValue('initial_gold')`
- 初始生命：`1 + floor(getTalentValue('player_max_hp'))`
- 怪物血量倍率：`1 + talents.mob_hp_drop * 0.3`
- 資源掉落倍率：`1 + talents.mob_hp_drop * 0.1`
- 怪物密集度倍率：`1.4^(talents.mob_density)`
- 建塔上限：`5 + floor(getTalentValue('tower_limit'))`
- 道具掉落倍率：`1 + getTalentValue('item_drop_rate')`

## 5. 遊戲速度（目前）
- 關卡內可調速度：`x1.00 ~ x2.00`
- 調整步進：`0.25`
- 目前「主選單天賦」沒有遊戲速度上限相關項目

## 6. UI 顯示重點
- 天賦分類已改為：`關卡設定 / 近戰塔特性 / 遠程塔特性 / 法術塔特性`
- 天賦效果文案已對應新 id（例如 `tower_limit`、`item_drop_rate`）
- 資源列顯示：能量、紅水晶、綠寶石、藍水晶、金礦

## 7. 維護清單
1. 新增或改動主選單天賦時，同步修改：
   - `src/data/constants.js`
   - `src/components/MainMenu/TalentTree.jsx`
   - `src/engine/GameEngine.js`
2. 若影響資源成本，也同步檢查 `src/contexts/GameContext.jsx`。
3. 更新本檔 `skills/tower-balance-maintainer/references/menu-talent-tree.md`。

## 2026-02-22 �s�W�G�˳Ƥѽ�i�˳�-�l�����O�j
- �ѽ� id�Gequip_absorption_force
- ���Ӹ귽�Ggold_ore
- ��¦��O�G100
- �̤j���šG1
- �ĪG�G�}�l�C���ɡA�I�]��o�˳� bsorption_force x1�C
- ����G���˳ƨӷ��ȭ��D���ѽ�A���|�ѩǪ������C
