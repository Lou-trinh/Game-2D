# Skill: Player Skills

## skill_2 — Portal Teleport
Asset: `tele_port` atlas + `skill_2` animation JSON

```
activate skill_2
→ tạo portal sprite tại vị trí player, play 'skill_2' anim (once)
→ on animationcomplete callback
→ player teleport đến vị trí portal
→ createPortalEffect(x, y) fade out tại vị trí cũ
→ createSurfTrail(angle) tạo 5 trail sprites theo hướng dash
```

`createPortalEffect(x, y, onComplete)`: generic factory, tạo sprite atlas `tele_port`, play `skill_2`, gọi `onComplete` khi xong.

`createSurfTrail(angle)`: tạo 5 trail sprites dùng `effect_3` animation, spawn theo hướng dash, alpha tween fade out.

## skill_3 — Gate (chưa phải player skill)
`gate` atlas được preload trong MainScene, là spawn point của enemy, không phải skill player sử dụng trực tiếp. Chưa implement thành skill có thể trigger.

## Character Skills (CharacterConfigs)
Field `transformSkill` trong `CharacterConfigs` dự phòng cho cơ chế biến hình (Taoist → Mino style) — chưa implement cho bất kỳ nhân vật nào.

## CharacterSelectScene — UI chọn nhân vật
- Grid 3×2 card layout, mỗi card là `container` gộp glow/border/preview/name/desc
- Lock overlay cho `!charData.unlocked`
- Particle emitter bám theo card đang chọn (cleanup khi chuyển card)
- `selectCharacter()`: scale tween + glow animation
- Xác nhận: `registry.set('selectedCharacter', key)` → fadeOut → start MainScene
- Background: particle `arrow` texture với blendMode ADD
