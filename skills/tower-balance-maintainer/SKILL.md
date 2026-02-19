---
name: tower-balance-maintainer
description: Maintain a single source of truth for this tower defense game's balance values and formulas. Use when adjusting tower base stats, talent scaling, status effects (slow/bleed/stun/poison), projectile chain/target logic, wave scaling, or related UI labels; always sync references/current-values.md in the same change.
---

# Tower Balance Maintainer

Keep game-balance edits and balance documentation synchronized.

## Follow This Workflow

1. Read `references/current-values.md` to understand current balance targets and formulas.
2. Apply requested value changes in code first:
   - `src/data/constants.js` for tower base stats, talent definitions, wave config.
   - `src/engine/GameEngine.js` for actual combat formulas and runtime behavior.
   - `src/components/Game/Game.jsx` only when UI text/colors/presented stats must match the mechanics.
3. Update `references/current-values.md` in the same edit to reflect exact new values.
4. Run `npm run build` to catch syntax/integration errors.
5. Report changed values explicitly (old -> new) and include touched file paths.

## Sync Rules

- Treat `src/engine/GameEngine.js` as mechanics truth when docs conflict.
- Do not leave undocumented gameplay-value changes.
- Keep formulas in docs concrete (percent, duration, radius, caps).
- If a change is intentionally temporary, mark it as `temporary` in `references/current-values.md`.

## Fast Map Of Tuning Areas

- Base tower identity and costs: `src/data/constants.js`
- Tower hit logic, status stacking, chain, specialization: `src/engine/GameEngine.js`
- Projectile color and in-battle display values: `src/components/Game/Game.jsx`
- Player-facing talent descriptions: `src/components/MainMenu/TalentTree.jsx`
