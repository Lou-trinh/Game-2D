# Skill: Combat Effects

## AoE Weapons

### Grenade (`throwGrenade()`)
```
click fire → tạo grenade sprite
→ parabolic arc tween đến vị trí chuột
→ explodeGrenade():
   → play 'effect_4' animation (once)
   → AOE rect check radius 80px
   → damage tất cả enemy trong vùng (self-damage nếu player trong vùng)
   → dropLoot tại vị trí nổ
```

### Gasoline Bomb (`explodeGasolineBomb()`)
```
→ createFireZone(x, y, duration=7000ms)
→ tick damage mỗi 500ms trong 7 giây
→ 'effect_6' animation loop tại vị trí zone
→ applyBurningEffect(enemy) cho enemy trong zone
```

### Electric Bomb
```
→ tương tự Gasoline nhưng dùng 'effect_8' animation
→ applyBurningEffect(enemy, 'electric') — stun + DoT
→ effect_9 bám trên enemy trong 4 giây (override enemy update())
```

## DoT / Status Effects

### `applyBurningEffect(enemy)`
- Play `effect_9` sprite bám trên enemy (follow position mỗi frame)
- Tick damage mỗi 500ms
- Duration: 4 giây
- Override enemy `update()` để apply stun (không move trong thời gian burn)

## Visual Effects

### Muzzle Flash (`showMuzzleFlash()`)
- Sprite `effect_7` tại đầu nòng súng
- Play `'shoot'` animation (once, repeat: 0)
- Tự destroy sau khi animation kết thúc

### Blood Splatter (`createBloodSplatter(x, y)`)
- Sprite `effect_3` tại vị trí đạn trúng
- Play `'blood'` animation (once)
- Tự destroy sau animation

### Hit Flash (tất cả enemy)
- `setTint(0xff0000)` khi bị đánh
- `clearTint()` sau 100ms
- Không có hit animation riêng

### Death Effect (tất cả enemy)
- `setTint(0x666666)` khi HP = 0
- Tween `alpha → 0` trong 300ms
- Destroy object sau tween
- Golem: thêm play `'effect_1'` (one-shot) tại vị trí player khi đánh trúng

## Audio Keys
Sound play qua `this.scene.sound.play(key)`, preload ở SceneLoading:

| Key | Dùng cho |
|-----|---------|
| `rifle_shot` | Hầu hết súng |
| `grenade_explosion` | Grenade + Rocket |
| `glass_broken` | Chest vỡ |
| `fire_sound` | Gasoline bomb zone |
| `electric_sound` | Electric bomb zone |
| `shovel_swing` | Melee attack |
| `reload_sound` | Reload bất kỳ vũ khí |
