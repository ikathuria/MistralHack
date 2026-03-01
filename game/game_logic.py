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

if 'SPARK' not in globals():
    SPARK = []

###########################################################################################
# global game assets
ASSETS = {
    # Placeholder: Replace with pygame.image.load('tank.png')
    'tank': pygame.Surface((60, 60)),
    'scout': pygame.Surface((40, 40)),
    'mage': pygame.Surface((45, 45))
}
# Initialize placeholders with Supercell colors
ASSETS['tank'].fill((255, 200, 0))   # Gold
ASSETS['scout'].fill((0, 255, 150))  # Teal
ASSETS['mage'].fill((150, 0, 255))   # Purple

###########################################################################################

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

        # keep PLAYER on screen with bounce effect
        registry.player_x = max(25, min(775, registry.player_x))
        registry.player_y = max(25, min(575, registry.player_y))

        pygame.draw.circle(
            screen, (255, 255, 255),
            (int(registry.player_x), int(registry.player_y)),
            PLAYER['size'] + 2
        )
        pygame.draw.circle(
            screen, PLAYER['color'],
            (int(registry.player_x), int(registry.player_y)),
            PLAYER['size']
        )

        # spawn and update ENEMIES
        if len(registry.enemies) < registry.max_enemies:
            spawn_enemy(registry)

        update_enemies(registry)

        for enemy in registry.enemies:
            pygame.draw.circle(screen, (200, 100, 255), (int(
                enemy['x']), int(enemy['y'])), enemy['size'] + 2)
            pygame.draw.circle(screen, enemy['color'], (int(
                enemy['x']), int(enemy['y'])), enemy['size'])

        # player health bar and score
        draw_health_bar(screen, registry)

        font = pygame.font.SysFont('Arial', 24, bold=True)
        score_text = font.render(f"SCORE: {registry.score}", True, (255, 200, 0))
        screen.blit(score_text, (30, 60))

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
        print(f"Supercell Game Error: {e}")
        try:
            font = pygame.font.SysFont('Arial', 20)
            error_text = font.render(
                f"BRAWL ERROR: {str(e)}", True, (255, 50, 50))
            screen.blit(error_text, (30, 90))
        except:
            pass