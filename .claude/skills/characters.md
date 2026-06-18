# Skill: Characters

## Nhân vật hiện tại (CharacterConfigs trong js/Character.js)

| key | name | HP | Damage | Speed | Defense |
|-----|------|----|--------|-------|---------|
| `player_1` | PHOENIX | 100 | 25 | 3.0 | 8 |

Chỉ có 1 nhân vật đang hoạt động (`unlocked: true`). Field `transformSkill` dự phòng cho biến hình nhưng chưa dùng.

## Flow chọn nhân vật
```
CharacterSelectScene → registry.set('selectedCharacter', key) → MainScene đọc
```

## Load assets
```js
scene.load.atlas(key, `assets/images/${key}/${key}.png`, `${key}_atlas.json`);
scene.load.animation(`${key}_anim`, `assets/images/${key}/${key}_anim.json`);
```

## Player body (Matter.js)
- Collider chính: circle r=8 (va chạm vật lý)
- Sensor: circle r=16 (detect item pickup)
- 4 weapon slots, switch bằng phím 1–4 hoặc `player.switchWeapon(n)`
- Reload: phím R, cooldown per-slot qua `ammoData`

## Thêm nhân vật mới
1. Thêm entry vào `CharacterConfigs` trong `Character.js`
2. Thêm asset folder `assets/images/<key>/` với atlas PNG + JSON + anim JSON
3. Set `unlocked: true` để mở khóa
