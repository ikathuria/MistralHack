import pygame
import random
import app.narrator as narrator

# global game constants
if "PLAYER" not in globals():
    PLAYER = {"size": 40, "color": (0, 128, 255)}

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
        registry.player_x, registry.player_y = empty_tiles.pop()
        for npc in registry.npcs:
            npc["x"], npc["y"] = empty_tiles.pop()
        registry.villain["x"], registry.villain["y"] = empty_tiles.pop()


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
    # Stats Bar
    pygame.draw.rect(screen, (20, 20, 20), (20, 20, 300, 80))
    pygame.draw.rect(screen, (255, 200, 0), (20, 20, 300, 80), 2)

    font = pygame.font.SysFont("Arial", 16, bold=True)
    # Health
    hp_ratio = registry.player_health / registry.max_health
    pygame.draw.rect(screen, (255, 50, 50), (30, 35, int(200 * hp_ratio), 10))
    screen.blit(
        font.render(f"HP: {registry.player_health}", True, (255, 255, 255)), (240, 32)
    )

    # Mana
    mana_ratio = registry.mana / 100
    pygame.draw.rect(screen, (0, 150, 255), (30, 55, int(200 * mana_ratio), 10))
    screen.blit(
        font.render(f"MANA: {int(registry.mana)}", True, (255, 255, 255)), (240, 52)
    )

    # Inventory / Sigils
    sigils_text = f"SIGILS: {len(registry.inventory)}/3"
    screen.blit(font.render(sigils_text, True, (255, 215, 0)), (30, 75))

    # Dialogue Log
    log_rect = pygame.Rect(0, 500, 800, 100)
    pygame.draw.rect(screen, (10, 10, 10), log_rect)
    pygame.draw.line(screen, (255, 200, 0), (0, 500), (800, 500), 3)
    font_log = pygame.font.SysFont("Consolas", 16)
    for i, msg in enumerate(registry.combat_log[-4:]):
        screen.blit(
            font_log.render(f"> {msg}", True, (200, 200, 200)), (20, 510 + i * 20)
        )


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
        cam_x = registry.player_x - 400
        cam_y = registry.player_y - 300

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
        old_x, old_y = registry.player_x, registry.player_y
        if keys[pygame.K_LEFT]:
            registry.player_x -= speed
        if keys[pygame.K_RIGHT]:
            registry.player_x += speed
        if check_collision(registry.player_x, registry.player_y, registry):
            registry.player_x = old_x
        if keys[pygame.K_UP]:
            registry.player_y -= speed
        if keys[pygame.K_DOWN]:
            registry.player_y += speed
        if check_collision(registry.player_x, registry.player_y, registry):
            registry.player_y = old_y

        # interactions (npcs)
        for npc in registry.npcs:
            draw_sprite(
                screen,
                npc["sprite"],
                npc["x"],
                npc["y"],
                PLAYER["size"],
                (cam_x, cam_y),
            )
            dist = (
                (registry.player_x - npc["x"]) ** 2
                + (registry.player_y - npc["y"]) ** 2
            ) ** 0.5
            if dist < 80:
                font_hint = pygame.font.SysFont("Arial", 14, bold=True)
                screen.blit(
                    font_hint.render(
                        f"Press E to talk to {npc['name']}", True, (255, 255, 255)
                    ),
                    (npc["x"] - cam_x - 60, npc["y"] - cam_y - 50),
                )
                if keys[pygame.K_e]:
                    msg = npc["dialogue"]
                    if len(registry.inventory) < 3 and "sigil" not in [
                        s.lower() for s in registry.inventory
                    ]:
                        if (
                            npc["name"] == "Elder"
                            and "Elder Sigil" not in registry.inventory
                        ):
                            registry.inventory.append("Elder Sigil")
                            registry.lillith_barrier_strength -= 33.34
                            msg = (
                                "You have earned the Elder Sigil. Her barrier falters."
                            )
                        elif (
                            npc["name"] == "Guard"
                            and "Guard Sigil" not in registry.inventory
                        ):
                            registry.inventory.append("Guard Sigil")
                            registry.lillith_barrier_strength -= 33.34
                            msg = (
                                "Hero's mettle! Take the Guard Sigil. Strike her down."
                            )

                    if not registry.combat_log or msg != registry.combat_log[-1]:
                        registry.combat_log.append(f"{npc['name']}: {msg}")
                        narrator.npc_dialogue(npc["name"], msg)

        # villain: Lillith
        draw_sprite(
            screen,
            "lillith",
            registry.villain["x"],
            registry.villain["y"],
            registry.villain["size"],
            (cam_x, cam_y),
        )
        # Barrier
        if registry.lillith_barrier_strength > 0:
            barrier_rx = registry.villain["x"] - cam_x
            barrier_ry = registry.villain["y"] - cam_y
            pygame.draw.circle(
                screen, (191, 0, 255, 100), (int(barrier_rx), int(barrier_ry)), 80, 5
            )
            font_v = pygame.font.SysFont("Arial", 14, bold=True)
            screen.blit(
                font_v.render(
                    f"BARRIER: {int(registry.lillith_barrier_strength)}%",
                    True,
                    (191, 0, 255),
                ),
                (barrier_rx - 40, barrier_ry + 70),
            )

        # player
        draw_sprite(
            screen,
            registry.current_sprite,
            registry.player_x,
            registry.player_y,
            PLAYER["size"],
            (cam_x, cam_y),
        )

        # UI
        draw_ui(screen, registry)

        # win condition
        if registry.lillith_barrier_strength <= 0:
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
                registry.player_health = registry.max_health
                registry.score = 0
                registry.lillith_barrier_strength = 100.0
                registry.inventory = []
                registry.quest_stage = 0
                registry.player_x = 400
                registry.player_y = 300
                randomize_positions(registry)

        # game over
        if registry.player_health <= 0:
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
                registry.player_health = registry.max_health
                registry.score = 0
                registry.lillith_barrier_strength = 100.0
                registry.inventory = []
                registry.quest_stage = 0
                registry.player_x = 400
                registry.player_y = 300
                randomize_positions(registry)

    except Exception as e:
        print(f"RPG Logic Error: {e}")
