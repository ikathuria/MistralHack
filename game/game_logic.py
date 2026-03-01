import pygame
import random
import app.narrator as narrator


# global game assets
ASSETS = {}


def load_assets():
    """Loads game assets, ensuring pygame is initialized first."""
    global ASSETS
    try:
        ASSETS = {
            "tank": pygame.image.load("resources/tank.png").convert_alpha(),
            "scout": pygame.image.load("resources/scout.png").convert_alpha(),
            "mage": pygame.image.load("resources/mage.png").convert_alpha(),
            "lillith": pygame.image.load("resources/lillith.png").convert_alpha(),
        }
    except Exception as e:
        print(f"FAILED TO LOAD ASSETS: {e}")
        import os

        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        try:
            ASSETS = {
                "tank": pygame.image.load(
                    os.path.join(base_path, "resources/tank.png")
                ).convert_alpha(),
                "scout": pygame.image.load(
                    os.path.join(base_path, "resources/scout.png")
                ).convert_alpha(),
                "mage": pygame.image.load(
                    os.path.join(base_path, "resources/mage.png")
                ).convert_alpha(),
                "lillith": pygame.image.load(
                    os.path.join(base_path, "resources/lillith.png")
                ).convert_alpha(),
            }
        except:
            ASSETS = {}


def randomize_positions(registry):
    """Randomly places entities on empty tiles."""
    empty_tiles = []
    for r, row in enumerate(registry.world_map):
        for c, tile in enumerate(row):
            if tile == 0:
                empty_tiles.append(
                    (c * registry.tile_size + 50, r * registry.tile_size + 50)
                )

    if len(empty_tiles) > 5:
        random.shuffle(empty_tiles)
        registry.player.x, registry.player.y = empty_tiles.pop()
        for npc in registry.npcs:
            npc.x, npc.y = empty_tiles.pop()
        registry.villain.x, registry.villain.y = empty_tiles.pop()


def check_collision(x, y, registry):
    grid_x, grid_y = int(x // registry.tile_size), int(y // registry.tile_size)
    if 0 <= grid_y < len(registry.world_map) and 0 <= grid_x < len(
        registry.world_map[0]
    ):
        return registry.world_map[grid_y][grid_x] == 1
    return True


def draw_sprite(screen, sprite_key, x, y, size, camera_offset=(0, 0)):
    rx, ry = x - camera_offset[0], y - camera_offset[1]
    if sprite_key in ASSETS:
        img = pygame.transform.scale(ASSETS[sprite_key], (size * 2, size * 2))
        rect = img.get_rect(center=(rx, ry))
        screen.blit(img, rect)
    else:
        color = (255, 200, 0) if sprite_key == "mage" else (0, 150, 255)
        pygame.draw.circle(screen, color, (int(rx), int(ry)), size // 2)


def draw_ui(screen, registry):
    # stats bar
    pygame.draw.rect(screen, (20, 20, 20), (20, 20, 300, 80))
    pygame.draw.rect(screen, (255, 200, 0), (20, 20, 300, 80), 2)

    font = pygame.font.SysFont("Arial", 16, bold=True)
    # health
    hp_ratio = registry.player.health / registry.player.max_health
    pygame.draw.rect(screen, (255, 50, 50), (30, 35, int(200 * hp_ratio), 10))
    screen.blit(
        font.render(f"HP: {registry.player.health}", True, (255, 255, 255)), (240, 32)
    )

    # mana
    mana_ratio = registry.player.mana / 100
    pygame.draw.rect(screen, (0, 150, 255), (30, 55, int(200 * mana_ratio), 10))
    screen.blit(
        font.render(f"MANA: {int(registry.player.mana)}", True, (255, 255, 255)),
        (240, 52),
    )

    # inventory / sigils
    sigils_text = f"SIGILS: {len(registry.player.inventory)}/3"
    screen.blit(font.render(sigils_text, True, (255, 215, 0)), (30, 75))

    # dialogue log
    log_rect = pygame.Rect(0, 500, 800, 100)
    pygame.draw.rect(screen, (10, 10, 10), log_rect)
    pygame.draw.line(screen, (255, 200, 0), (0, 500), (800, 500), 3)
    font_log = pygame.font.SysFont("Consolas", 16)
    for i, msg in enumerate(registry.combat_log[-4:]):
        screen.blit(
            font_log.render(f"> {msg}", True, (200, 200, 200)), (20, 510 + i * 20)
        )

    # recording indicator
    if registry.is_recording:
        dot_color = (
            (255, 0, 0) if (pygame.time.get_ticks() // 500) % 2 == 0 else (100, 0, 0)
        )
        pygame.draw.circle(screen, dot_color, (400, 40), 10)
        font_rec = pygame.font.SysFont("Arial", 20, bold=True)
        rec_txt = font_rec.render("VOICE RECORDING...", True, (255, 50, 50))
        screen.blit(rec_txt, (420, 30))


def update(screen, registry):
    try:
        if not ASSETS:
            load_assets()
        if not hasattr(registry, "initialized") or not registry.initialized:
            randomize_positions(registry)
            registry.initialized = True

        keys = pygame.key.get_pressed()
        screen.fill((10, 25, 10))

        # camera follow
        cam_x = registry.player.x - 400
        cam_y = registry.player.y - 300

        # arena bounds (based on map size)
        map_width = len(registry.world_map[0]) * registry.tile_size
        map_height = len(registry.world_map) * registry.tile_size
        cam_x = max(0, min(cam_x, map_width - 800))
        cam_y = max(0, min(cam_y, map_height - 600))

        # screen shake
        if registry.screen_shake > 0:
            cam_x += random.randint(-5, 5)
            cam_y += random.randint(-5, 5)
            registry.screen_shake -= 1

        # draw map with camera
        for r, row in enumerate(registry.world_map):
            for c, tile in enumerate(row):
                rx, ry = c * registry.tile_size - cam_x, r * registry.tile_size - cam_y
                if tile == 1:
                    pygame.draw.rect(screen, (40, 40, 40), (rx, ry, 100, 100))
                    pygame.draw.rect(screen, (80, 80, 80), (rx, ry, 100, 100), 2)
                else:
                    pygame.draw.rect(screen, (20, 40, 20), (rx, ry, 100, 100))
                    pygame.draw.rect(screen, (30, 50, 30), (rx, ry, 100, 100), 1)

        # player movement
        speed = 5
        old_x, old_y = registry.player.x, registry.player.y
        if keys[pygame.K_LEFT]:
            registry.player.x -= speed
        if keys[pygame.K_RIGHT]:
            registry.player.x += speed
        if check_collision(registry.player.x, registry.player.y, registry):
            registry.player.x = old_x
        if keys[pygame.K_UP]:
            registry.player.y -= speed
        if keys[pygame.K_DOWN]:
            registry.player.y += speed
        if check_collision(registry.player.x, registry.player.y, registry):
            registry.player.y = old_y

        # interactions (npcs)
        for npc in registry.npcs:
            draw_sprite(
                screen,
                npc.sprite,
                npc.x,
                npc.y,
                registry.player.size,
                (cam_x, cam_y),
            )
            dist = (
                (registry.player.x - npc.x) ** 2 + (registry.player.y - npc.y) ** 2
            ) ** 0.5
            if dist < 80:
                font_hint = pygame.font.SysFont("Arial", 14, bold=True)
                hint_txt = f"Press E to talk to {npc.name}"
                if npc.name == "Guard" and registry.training_active:
                    hint_txt = "TRAINING IN PROGRESS..."

                screen.blit(
                    font_hint.render(hint_txt, True, (255, 255, 255)),
                    (npc.x - cam_x - 60, npc.y - cam_y - 50),
                )

                if keys[pygame.K_e] and not registry.training_active:
                    msg = npc.dialogue
                    if npc.name == "Elder":
                        if "Elder Sigil" not in registry.player.inventory:
                            registry.player.inventory.append("Elder Sigil")
                            registry.lillith_barrier_strength -= 33
                            msg = "Take my Sigil. But Lillith has hidden the last one. Shout a 'Pulse of Truth' to see the veil!"
                        elif not registry.hidden_sigil_revealed:
                            msg = "Use your mana! Say 'Pulse of Truth' to reveal what is hidden in the latent space."

                    elif npc.name == "Guard":
                        if "Guard Sigil" not in registry.player.inventory:
                            registry.player.inventory.append("Guard Sigil")
                            registry.lillith_barrier_strength -= 33
                            msg = "Sigil earned. But you're slow! Let's calibrate your reflexes. (Press E again to start training)"
                        elif not registry.training_active:
                            registry.training_active = True
                            registry.training_timer = 30 * 60
                            registry.training_orbs = []
                            msg = "DODGE! Survive 30 seconds of calibration!"

                    if not registry.combat_log or msg != registry.combat_log[-1]:
                        registry.combat_log.append(f"{npc.name}: {msg}")
                        narrator.npc_dialogue(npc.name, msg)

        # reflex calibration logic
        if registry.training_active:
            registry.training_timer -= 1
            if registry.training_timer % 60 == 0:
                side = random.choice(["top", "bottom", "left", "right"])
                if side == "top":
                    ox, oy = random.randint(0, map_width), 0
                elif side == "bottom":
                    ox, oy = random.randint(0, map_width), map_height
                elif side == "left":
                    ox, oy = 0, random.randint(0, map_height)
                else:
                    ox, oy = map_width, random.randint(0, map_height)

                dx, dy = registry.player.x - ox, registry.player.y - oy
                n = max(1, (dx**2 + dy**2) ** 0.5)
                registry.training_orbs.append(
                    {"x": ox, "y": oy, "vx": (dx / n) * 4, "vy": (dy / n) * 4}
                )

            for orb in registry.training_orbs[:]:
                orb["x"] += orb["vx"]
                orb["y"] += orb["vy"]

                pygame.draw.circle(
                    screen,
                    (0, 255, 255),
                    (int(orb["x"] - cam_x), int(orb["y"] - cam_y)),
                    10,
                )

                odist = (
                    (registry.player.x - orb["x"]) ** 2
                    + (registry.player.y - orb["y"]) ** 2
                ) ** 0.5
                if odist < 25:
                    registry.training_active = False
                    registry.combat_log.append("Guard: Calibration FAILED! Too slow.")
                    registry.training_orbs = []

                if (
                    orb["x"] < -100
                    or orb["x"] > map_width + 100
                    or orb["y"] < -100
                    or orb["y"] > map_height + 100
                ):
                    registry.training_orbs.remove(orb)

            if registry.training_timer <= 0:
                registry.training_active = False
                registry.training_sessions += 1
                registry.combat_log.append(
                    f"Guard: Calibration Success! ({registry.training_sessions}/2)"
                )
                if registry.training_sessions >= 2:
                    registry.lillith_barrier_strength -= 1
                    registry.player.can_cast_ult = True
                    dialogue = "Guard: Reflexes calibrated. You can now cast high-damage spells!"
                    narrator.npc_dialogue("Guard", dialogue)
                    registry.combat_log.append(dialogue)

        # hidden sigil logic
        if (
            registry.hidden_sigil_revealed
            and "Hidden Sigil" not in registry.player.inventory
        ):
            sx, sy = registry.hidden_sigil_pos
            pygame.draw.circle(
                screen, (255, 255, 0), (int(sx - cam_x), int(sy - cam_y)), 15
            )
            pygame.draw.circle(
                screen, (255, 255, 255), (int(sx - cam_x), int(sy - cam_y)), 20, 2
            )
            if (
                (registry.player.x - sx) ** 2 + (registry.player.y - sy) ** 2
            ) ** 0.5 < 40:
                registry.player.inventory.append("Hidden Sigil")
                registry.lillith_barrier_strength -= 33
                registry.combat_log.append(
                    "Architect: You found the Hidden Sigil! The veil is pierced."
                )

        # villain: Lillith
        draw_sprite(
            screen,
            "lillith",
            registry.villain.x,
            registry.villain.y,
            registry.villain.size,
            (cam_x, cam_y),
        )

        # barrier
        if registry.lillith_barrier_strength > 0:
            barrier_rx = registry.villain.x - cam_x
            barrier_ry = registry.villain.y - cam_y
            pygame.draw.circle(
                screen, (191, 0, 255, 120), (int(barrier_rx), int(barrier_ry)), 100, 5
            )
            font_v = pygame.font.SysFont("Arial", 14, bold=True)
            screen.blit(
                font_v.render(
                    f"BARRIER: {int(registry.lillith_barrier_strength)}%",
                    True,
                    (191, 0, 255),
                ),
                (barrier_rx - 40, barrier_ry + 110),
            )

        else:
            # pursuit logic
            dx, dy = (
                registry.player.x - registry.villain.x,
                registry.player.y - registry.villain.y,
            )
            dist = (dx**2 + dy**2) ** 0.5
            if dist > 0:
                registry.villain.x += (
                    (dx / dist) * registry.villain.speed * registry.time_dilation
                )
                registry.villain.y += (
                    (dy / dist) * registry.villain.speed * registry.time_dilation
                )

            # contact damage
            if dist < (registry.player.size + registry.villain.size) / 2:
                registry.player.health -= 20  # damage per frame
                if pygame.time.get_ticks() % 1000 < 20:  # subtle shake on hit
                    registry.screen_shake = 5

            # dynamic spells logic
            for spell in registry.player.spells[:]:
                spell["x"] += spell.get("vx", 0)
                spell["y"] += spell.get("vy", 0)
                pygame.draw.circle(
                    screen,
                    spell.get("color", (255, 255, 255)),
                    (int(spell["x"] - cam_x), int(spell["y"] - cam_y)),
                    spell.get("size", 10),
                )

                spell["life"] = spell.get("life", 60) - 1
                if spell["life"] <= 0:
                    registry.player.spells.remove(spell)

                # collision with Lillith
                vdist = (
                    (spell["x"] - registry.villain.x) ** 2
                    + (spell["y"] - registry.villain.y) ** 2
                ) ** 0.5
                if vdist < 80 and registry.lillith_barrier_strength <= 0:
                    registry.combat_log.append(f"HIT! Lillith HP decreasing...")

                    voice_line = random.choice(["ouch", "damn", "ugh"])
                    narrator.npc_dialogue(registry.villain.name, voice_line)
                    registry.villain.health -= 33

                    registry.player.spells.remove(spell)

        # player
        draw_sprite(
            screen,
            registry.player.sprite,
            registry.player.x,
            registry.player.y,
            registry.player.size,
            (cam_x, cam_y),
        )

        # UI
        draw_ui(screen, registry)
        if registry.training_active:
            f_sys = pygame.font.SysFont("Arial", 24, bold=True)
            screen.blit(
                f_sys.render(
                    f"CALIBRATING: {registry.training_timer // 60}s",
                    True,
                    (0, 255, 255),
                ),
                (350, 20),
            )

        # UI
        draw_ui(screen, registry)

        # win condition
        if registry.villain.health <= 0:
            # flashing background effect
            alpha_surface = pygame.Surface((800, 600), pygame.SRCALPHA)
            alpha_surface.fill((255, 200, 0, 150))
            screen.blit(alpha_surface, (0, 0))

            win_font = pygame.font.SysFont("Arial", 60, bold=True)
            win_text = win_font.render("YOU WIN!", True, (255, 255, 255))
            text_rect = win_text.get_rect(center=(400, 250))
            screen.blit(win_text, text_rect)

            restart_font = pygame.font.SysFont("Arial", 24)
            restart_text = restart_font.render(
                "PRESS R TO RESTART!", True, (255, 255, 255)
            )
            restart_rect = restart_text.get_rect(center=(400, 320))
            screen.blit(restart_text, restart_rect)

            # reset game on R key
            if keys[pygame.K_r]:
                clear_enemies(registry)
                registry.player.health = registry.player.max_health
                registry.player.mana = registry.player.max_mana
                registry.player.can_cast_ult = False
                registry.lillith_barrier_strength = 100.0
                registry.villain.health = registry.villain.max_health
                registry.player.inventory = []
                registry.player.x = 400
                registry.player.y = 300
                randomize_positions(registry)

        # game over
        if registry.player.health <= 0:
            # flashing background effect
            alpha_surface = pygame.Surface((800, 600), pygame.SRCALPHA)
            alpha_surface.fill((255, 50, 50, 150))
            screen.blit(alpha_surface, (0, 0))

            game_over_font = pygame.font.SysFont("Arial", 60, bold=True)
            game_over_text = game_over_font.render("YOU DIED!", True, (255, 200, 0))
            text_rect = game_over_text.get_rect(center=(400, 250))
            screen.blit(game_over_text, text_rect)

            restart_font = pygame.font.SysFont("Arial", 24)
            restart_text = restart_font.render(
                "PRESS R TO RESTART!", True, (255, 255, 255)
            )
            restart_rect = restart_text.get_rect(center=(400, 320))
            screen.blit(restart_text, restart_rect)

            # reset game on R key
            if keys[pygame.K_r]:
                clear_enemies(registry)
                registry.player.health = registry.player.max_health
                registry.player.mana = registry.player.max_mana
                registry.player.can_cast_ult = False
                registry.lillith_barrier_strength = 100.0
                registry.villain.health = registry.villain.max_health
                registry.player.inventory = []
                registry.player.x = 400
                registry.player.y = 300
                randomize_positions(registry)

    except Exception as e:
        print(f"RPG Logic Error: {e}")
