import pygame
import random

###########################################################################################
# global game constants
if 'PLAYER' not in globals():
    PLAYER = {
        'size': 50,
        'sprite': 'scout',
        'color': (0, 128, 255)
    }

# global game assets
ASSETS = {
    'tank': pygame.image.load('assets/tank.png').convert_alpha(),
    'scout': pygame.image.load('assets/scout.png').convert_alpha(),
    'mage': pygame.image.load('assets/mage.png').convert_alpha()
}
###########################################################################################


# enemy Functions #########################################################################
def spawn_enemy(registry):
    """
    Spawns an enemy at a random edge of the screen with speed influenced by player's health.
    """
    enemy_speed = random.uniform(1.0, 3.0)

    # if health is low, spawn fewer ENEMIES to give PLAYER a break
    health_ratio = registry.player_health / registry.max_health
    spawn_chance = 0.02 * health_ratio

    if random.random() < spawn_chance:
        enemy_speed = random.uniform(0.5, 2.0)

    side = random.choice(['top', 'bottom', 'left', 'right'])

    if side == 'top':
        x, y = random.randint(0, 800), 0
    elif side == 'bottom':
        x, y = random.randint(0, 800), 600
    elif side == 'left':
        x, y = 0, random.randint(0, 600)
    else:  # right
        x, y = 800, random.randint(0, 600)

    registry.enemies.append({
        'x': x,
        'y': y,
        'size': 30,
        'color': (255, 0, 0),
        'speed': enemy_speed
    })


def update_enemies(registry):
    """
    Moves ENEMIES toward the PLAYER and checks for collisions.
    """
    for enemy in registry.enemies[:]:
        current_speed = enemy['speed'] * registry.time_dilation

        # Move ENEMIES toward PLAYER
        dx = registry.player_x - enemy['x']
        dy = registry.player_y - enemy['y']
        dist = max(1, (dx**2 + dy**2)**0.5)

        enemy['x'] += (dx / dist) * current_speed
        enemy['y'] += (dy / dist) * current_speed

        # Check collision with PLAYER
        distance = ((registry.player_x - enemy['x'])**2 +
                    (registry.player_y - enemy['y'])**2)**0.5
        if distance < PLAYER['size'] + enemy['size']:
            # Player takes damage
            registry.player_health -= 5
            registry.enemies.remove(enemy)

            # Game over if health reaches 0
            if registry.player_health <= 0:
                registry.player_health = 0

        if (enemy['x'] < 0 or enemy['x'] > 800 or
                enemy['y'] < 0 or enemy['y'] > 600):
            registry.enemies.remove(enemy)
            registry.score += 1


def clear_enemies(registry):
    """
    Clear all enemies from the game
    """
    registry.enemies.clear()


# draw sprite ##############################################################################
def draw_sprite(screen, sprite_key, x, y, size, angle=0):
    """
    Handles rendering for both placeholder surfaces and PNGs.
    """
    if sprite_key in ASSETS:
        img = ASSETS[sprite_key]
        # Scale image to the current size logic
        img = pygame.transform.scale(img, (size * 2, size * 2))
        if angle != 0:
            img = pygame.transform.rotate(img, angle)

        # Supercell Style: Simple Drop Shadow
        shadow_rect = img.get_rect(center=(x + 4, y + 4))
        shadow_surf = pygame.Surface(
            (shadow_rect.width, shadow_rect.height), pygame.SRCALPHA)
        pygame.draw.ellipse(shadow_surf, (0, 0, 0, 80), [
                            0, 0, shadow_rect.width, shadow_rect.height])
        screen.blit(shadow_surf, shadow_rect)

        rect = img.get_rect(center=(x, y))
        screen.blit(img, rect)
    else:
        # Fallback to circle if asset missing
        pygame.draw.circle(screen, (255, 0, 255), (int(x), int(y)), size)


# health bar ##############################################################################
def draw_health_bar(screen, registry):
    """
    Draws a health bar above the player that changes color based on health percentage.
     Green when healthy, yellow when moderate, red when low.
    """
    try:
        bar_width = 200
        bar_height = 20
        bar_x = (800 - bar_width) // 2
        bar_y = 20

        pygame.draw.rect(screen, (20, 40, 80),
                         (bar_x, bar_y, bar_width, bar_height))

        health_percentage = registry.player_health / registry.max_health

        if health_percentage > 0.5:
            r = 255
            g = int(200 + (55 * (1 - health_percentage)) * 2)
            b = 0
        else:
            r = 255
            g = int(55 * health_percentage * 2)
            b = 0

        health_width = int(bar_width * health_percentage)
        pygame.draw.rect(screen, (r, g, b),
                         (bar_x, bar_y, health_width, bar_height))

        pygame.draw.rect(screen, (255, 200, 0),
                         (bar_x, bar_y, bar_width, bar_height), 3)

        font = pygame.font.SysFont('Arial', 18, bold=True)
        health_text = font.render(
            f"HEALTH: {registry.player_health}/{registry.max_health}", True, (255, 200, 0))
        screen.blit(health_text, (bar_x, bar_y + bar_height + 5))

    except Exception as e:
        print(f"Health bar error: {e}")


# main update loop ########################################################################
def update(screen, registry):
    """
    Main game update function called every frame. Handles player movement, enemy spawning, and rendering.
    """
    try:
        # get pressed keys
        keys = pygame.key.get_pressed()

        # background
        screen.fill((20, 60, 20))

        # player movement with arrow keys
        speed = 7
        if keys[pygame.K_LEFT]:
            registry.player_x -= speed
        if keys[pygame.K_RIGHT]:
            registry.player_x += speed
        if keys[pygame.K_UP]:
            registry.player_y -= speed
        if keys[pygame.K_DOWN]:
            registry.player_y += speed

        # 2. Render Player Sprite
        draw_sprite(screen, registry.current_sprite,
                    registry.player_x, registry.player_y, PLAYER['size'])

        # spawn and update ENEMIES
        if len(registry.enemies) < registry.max_enemies:
            spawn_enemy(registry)

        update_enemies(registry)

        for enemy in registry.enemies:
            draw_sprite(screen, 'scout', enemy['x'], enemy['y'], enemy['size'])

            bar_rect = pygame.Rect(enemy['x'] - 15, enemy['y'] - 25, 30, 5)
            pygame.draw.rect(screen, (0, 0, 0), bar_rect)
            pygame.draw.rect(screen, (255, 50, 50), [
                             bar_rect.x, bar_rect.y, 30, 5])

        # global UI
        draw_health_bar(screen, registry)

        # supercell gold score
        font = pygame.font.SysFont('Arial', 24, bold=True)
        score_text = font.render(
            f"SCORE: {registry.score}", True, (255, 200, 0))
        screen.blit(score_text, (30, 60))

        # reality Shift HUD (When Dilated)
        if registry.time_dilation < 1.0:
            overlay = pygame.Surface((800, 600), pygame.SRCALPHA)
            overlay.fill((191, 0, 255, 30))
            screen.blit(overlay, (0, 0))

        # game over
        if registry.player_health <= 0:
            # flashing background effect
            alpha_surface = pygame.Surface((800, 600), pygame.SRCALPHA)
            alpha_surface.fill((255, 50, 50, 150))
            screen.blit(alpha_surface, (0, 0))

            game_over_font = pygame.font.SysFont('Arial', 60, bold=True)
            game_over_text = game_over_font.render(
                "TROPHY LOST!", True, (255, 200, 0))
            text_rect = game_over_text.get_rect(center=(400, 250))
            screen.blit(game_over_text, text_rect)

            restart_font = pygame.font.SysFont('Arial', 24)
            restart_text = restart_font.render(
                "PRESS R TO BRAWL AGAIN!", True, (255, 255, 255))
            restart_rect = restart_text.get_rect(center=(400, 320))
            screen.blit(restart_text, restart_rect)

            # reset game on R key
            if keys[pygame.K_r]:
                clear_enemies(registry)
                registry.player_health = registry.max_health
                registry.score = 0

    except Exception as e:
        print(f"Game logic error: {e}")
        try:
            font = pygame.font.SysFont('Arial', 20)
            error_text = font.render(
                f"BRAWL ERROR: {str(e)}", True, (255, 50, 50))
            screen.blit(error_text, (30, 90))
        except:
            pass
