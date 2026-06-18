# Skill: Animation States

## Cách load (không dùng anims.create)
Tất cả animation định nghĩa trong file JSON riêng, Phaser tự đăng ký khi load:
```js
scene.load.animation('bear_anim', 'assets/images/bear/bear_anim.json');
// Sau khi load xong, dùng trực tiếp:
sprite.play('bear_idle', true); // ignoreIfPlaying = true
```

---

## PLAYER (player_1)
Asset: `assets/images/player_1/player_1_anim.json`

| Key | Frames | frameRate | repeat | Trigger |
|-----|--------|-----------|--------|---------|
| `idle` | player_1–6 | 12 | loop | Đứng yên (velocity = 0) |
| `run_front` | player_19–24 | 12 | loop | Di chuyển xuống (vel.y > 0) |
| `run_top` | player_31–36 | 12 | loop | Di chuyển lên (vel.y < 0) |
| `run_right_left` | player_25–30 | 12 | loop | Di chuyển ngang |

**Priority logic:** `abs(vel.y) >= abs(vel.x)` → vertical wins (run_top/run_front). Ngang: flipX khi đi trái.

**Death:** không có anim — đổi texture sang `'ghost'` (static), float tween lên xuống.

**Effect animations** (sprite riêng, không phải player sprite):

| Key | Dùng cho |
|-----|---------|
| `shoot` | Muzzle flash |
| `blood` | Máu bắn ra |
| `effect_4` | Grenade explosion |
| `effect_5` | Gasoline bomb burst (repeat: 0) |
| `effect_6` | Fire zone |
| `effect_8` | Electric zone |
| `effect_9` | Burn bám người |
| `skill_2` | Portal teleport |

---

## MONSTERS

### Bear
Asset: `assets/images/bear/bear_anim.json`

| Key | Frames | frameRate | Trigger |
|-----|--------|-----------|---------|
| `bear_idle` | bear_idle_1–4 | 12 | Idle, attack (đứng đánh) |
| `bear_walk` | bear_walk_1–4 | 12 | Chase, tiến về phía player |

### Wolf
Asset: `assets/images/wolf/wolf_anim.json`

| Key | Frames | frameRate | Trigger |
|-----|--------|-----------|---------|
| `wolf_idle` | wolf_idle_1–4 | 12 | Idle, attack |
| `wolf_walk` | wolf_walk_1–4 | 12 | Chase |

### TreeMan
Asset: `assets/images/tree_man/tree_man_anim.json`

| Key | Frames | frameRate | Trigger |
|-----|--------|-----------|---------|
| `tree_man_idle` | ent_idle_1–4 | **8** | Idle, attack |
| `tree_man_walk` | ent_walk_1–4 | 12 | Chase |

### GnollBrute
Asset: `assets/images/gnoll_brute/gnollbrute_anim.json`

| Key | Frames | frameRate | Trigger |
|-----|--------|-----------|---------|
| `gnollbrute_idle` | gnollbrute_idle_1–4 | 12 | Idle, attack |
| `gnollbrute_walk` | gnollbrute_walk_1–4 | 12 | Chase |

### GnollShaman *(ranged)*
Asset: `assets/images/gnoll_shaman/gnollshaman_anim.json`

| Key | Frames | frameRate | Trigger |
|-----|--------|-----------|---------|
| `gnollshaman_idle` | gnollshaman_idle_1–4 | 12 | Idle, attack (đứng bắn, 60–130px) |
| `gnollshaman_walk` | gnollshaman_walk_1–4 | 12 | Chase (>130px), retreat (<60px) |

### ForestGuardian *(ranged, scale 1.5x)*
Asset: `assets/images/forest_guardian/forest_guardian_anim.json`

| Key | Frames | frameRate | Trigger |
|-----|--------|-----------|---------|
| `forest_guardian_idle` | forestguardian_idle_1–4 | 12 | Idle, attack (bắn tornado, 50–140px) |
| `forest_guardian_walk` | forestguardian_walk_1–4 | 12 | Chase (>140px), retreat (<50px) |

Tornado dùng animation `'effect_2'` (key `tornado`, file `tornado_anim.json`).

### LargeMushRoom *(scale 1.5x)*
Asset: `assets/images/large_mush_room/largemushroom_anim.json`

| Key | Frames | frameRate | Trigger |
|-----|--------|-----------|---------|
| `mushroom_idle` | largemushroom_idle_1–4 | **8** | Idle, attack |
| `mushroom_walk` | largemushroom_walk_1–4 | **8** | Chase |

Khi chết: spawn 2 SmallMushRoom (không có death animation).

### SmallMushRoom
Asset: `assets/images/small_mush_room/smallmushroom_anim.json`

| Key | Frames | frameRate | Trigger |
|-----|--------|-----------|---------|
| `smallmushroom_idle` | smallmushroom_idle_1–4 | 12 | Idle, attack |
| `smallmushroom_walk` | smallmushroom_walk_1–4 | 12 | Chase |

### Golem *(scale 1.5x)*
Asset: `assets/images/golem/golem_anim.json`

| Key | Frames | frameRate | Trigger |
|-----|--------|-----------|---------|
| `golem_idle` | golem_idle_1–**6** | 12 | Idle, attack |
| `golem_walk` | golem_walk_1–**6** | 12 | Chase |

Khi đánh trúng: play `'effect_1'` (one-shot) tại vị trí player.

### IceMonster *(ally/summon — category 0x0004)*
Asset: `assets/images/skill/ice_monster/ice_monster_anim.json` *(chú ý: folder khác)*

| Key | Trigger |
|-----|---------|
| `ice_monster_idle` | Theo player, đứng gần (≤30px) |
| `ice_monster_walk` | Chase enemy, follow player (>30px) |
| `ice_monster_attack` | Tấn công enemy trong melee range (18px) |

---

## Bảng tổng hợp

| Entity | idle key | walk key | frameRate | Frames | Đặc điểm |
|--------|----------|----------|-----------|--------|-----------|
| Player | `idle` | `run_*` | 12 | 6 | 4 hướng directional |
| Bear | `bear_idle` | `bear_walk` | 12 | 4 | — |
| Wolf | `wolf_idle` | `wolf_walk` | 12 | 4 | — |
| TreeMan | `tree_man_idle` | `tree_man_walk` | **8**/12 | 4 | idle chậm hơn |
| GnollBrute | `gnollbrute_idle` | `gnollbrute_walk` | 12 | 4 | — |
| GnollShaman | `gnollshaman_idle` | `gnollshaman_walk` | 12 | 4 | ranged |
| ForestGuardian | `forest_guardian_idle` | `forest_guardian_walk` | 12 | 4 | ranged + tornado |
| LargeMushRoom | `mushroom_idle` | `mushroom_walk` | **8** | 4 | cả 2 chậm |
| SmallMushRoom | `smallmushroom_idle` | `smallmushroom_walk` | 12 | 4 | spawn từ Large |
| Golem | `golem_idle` | `golem_walk` | 12 | **6** | nhiều frame nhất |
| IceMonster | `ice_monster_idle` | `ice_monster_walk` | ? | ? | thêm `_attack` |

## Gotchas
- Không entity nào có **hit animation** hay **death animation** — tất cả dùng tint flash đỏ khi bị đánh, tween alpha→0 khi chết
- Guard `currentAnim.key !== 'xxx_idle'` trước khi play để tránh restart animation giữa chừng
- `ignoreIfPlaying: true` (tham số thứ 2 của `play()`) — luôn truyền `true` để không restart anim đang chạy
- Fallback chain trong `setupAnimations()`: `wolf_idle` → `idle` → `wolf_walk` → `walk`
