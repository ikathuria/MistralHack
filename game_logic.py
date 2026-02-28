import pygame
import random

# Initialize global variables only if they don't exist
if 'SCORE' not in globals():
    SCORE = 0
if 'PLAYER_HEALTH' not in globals():
    PLAYER_HEALTH = 100
if 'MAX_HEALTH' not in globals():
    MAX_HEALTH = 100
if 'player' not in globals():
    player = {
        'x': 400,
        'y': 300,
        'size': 50,
        'color': (255, 200, 0)  # Supercell gold color
    }
if 'enemies' not in globals():
    enemies = []


def spawn_enemy():
    """Spawn a new enemy"""
    side = random.choice(['top', 'bottom', 'left', 'right'])
    
    if side == 'top':
        x, y = random.randint(0, 800), 0
    elif side == 'bottom':
        x, y = random.randint(0, 800), 600
    elif side == 'left':
        x, y = 0, random.randint(0, 600)
    else:  # right
        x, y = 800, random.randint(0, 600)
    
    enemies.append({
        'x': x,
        'y': y,
        'size': 30,
        'color': (255, 0, 0),  # Red enemies
        'speed': random.uniform(1.0, 3.0)
    })


def update_enemies():
    """Update enemy positions and handle player collisions"""
    global PLAYER_HEALTH, SCORE
    
    for enemy in enemies[:]:
        # Move enemies toward player
        dx = player['x'] - enemy['x']
        dy = player['y'] - enemy['y']
        dist = max(1, (dx**2 + dy**2)**0.5)
        
        enemy['x'] += (dx / dist) * enemy['speed']
        enemy['y'] += (dy / dist) * enemy['speed']
        
        # Check collision with player
        distance = ((player['x'] - enemy['x'])**2 + (player['y'] - enemy['y'])**2)**0.5
        if distance < player['size'] + enemy['size']:
            # Player takes damage
            PLAYER_HEALTH -= 5
            enemies.remove(enemy)
            
            # Game over if health reaches 0
            if PLAYER_HEALTH <= 0:
                PLAYER_HEALTH = 0
        
        # Remove enemies that go off screen
        if (enemy['x'] < 0 or enemy['x'] > 800 or 
            enemy['y'] < 0 or enemy['y'] > 600):
            enemies.remove(enemy)
            SCORE += 1


def draw_health_bar(screen):
    try:
        bar_width = 200
        bar_height = 20
        bar_x = (800 - bar_width) // 2
        bar_y = 20
        
        # Draw background (Supercell dark blue)
        pygame.draw.rect(screen, (20, 40, 80), (bar_x, bar_y, bar_width, bar_height))
        
        # Draw health (Supercell gold to red gradient)
        health_percentage = PLAYER_HEALTH / MAX_HEALTH
        
        # Supercell vibe: gold (255, 200, 0) to red (255, 50, 50)
        if health_percentage > 0.5:
            r = 255
            g = int(200 + (55 * (1 - health_percentage)) * 2)
            b = 0
        else:
            r = 255
            g = int(55 * health_percentage * 2)
            b = 0
        
        health_width = int(bar_width * health_percentage)
        pygame.draw.rect(screen, (r, g, b), (bar_x, bar_y, health_width, bar_height))
        
        # Draw border (Supercell gold)
        pygame.draw.rect(screen, (255, 200, 0), (bar_x, bar_y, bar_width, bar_height), 3)
        
        # Draw health text with Supercell font style
        font = pygame.font.SysFont('Arial', 18, bold=True)
        health_text = font.render(f"HEALTH: {PLAYER_HEALTH}/{MAX_HEALTH}", True, (255, 200, 0))
        screen.blit(health_text, (bar_x, bar_y + bar_height + 5))
    except Exception as e:
        print(f"Health bar error: {e}")


def update(screen):
    try:
        global PLAYER_HEALTH, SCORE
        
        # Handle player movement with arrow keys - Supercell speed!
        keys = pygame.key.get_pressed()
        speed = 7  # Faster movement for high-energy gameplay
        
        if keys[pygame.K_LEFT]:
            player['x'] -= speed
        if keys[pygame.K_RIGHT]:
            player['x'] += speed
        if keys[pygame.K_UP]:
            player['y'] -= speed
        if keys[pygame.K_DOWN]:
            player['y'] += speed
        
        # Keep player on screen with bounce effect
        player['x'] = max(25, min(775, player['x']))
        player['y'] = max(25, min(575, player['y']))
        
        # Spawn enemies more frequently for high-energy action
        if random.random() < 0.03:
            spawn_enemy()
        
        # Update enemies with Supercell vibe
        update_enemies()
        
        # Draw everything with Supercell colors
        # Draw player with gold outline
        pygame.draw.circle(screen, (255, 255, 255), (int(player['x']), int(player['y'])), player['size'] + 2)
        pygame.draw.circle(screen, player['color'], (int(player['x']), int(player['y'])), player['size'])
        
        # Draw enemies with purple outline (Supercell style)
        for enemy in enemies:
            pygame.draw.circle(screen, (200, 100, 255), (int(enemy['x']), int(enemy['y'])), enemy['size'] + 2)
            pygame.draw.circle(screen, enemy['color'], (int(enemy['x']), int(enemy['y'])), enemy['size'])
        
        # Draw Supercell-style health bar
        draw_health_bar(screen)
        
        # Draw score with Supercell gold
        font = pygame.font.SysFont('Arial', 24, bold=True)
        score_text = font.render(f"SCORE: {SCORE}", True, (255, 200, 0))
        screen.blit(score_text, (30, 60))
        
        # Game over message with Supercell style
        if PLAYER_HEALTH <= 0:
            # Flashing background effect
            alpha_surface = pygame.Surface((800, 600), pygame.SRCALPHA)
            alpha_surface.fill((255, 50, 50, 150))
            screen.blit(alpha_surface, (0, 0))
            
            game_over_font = pygame.font.SysFont('Arial', 60, bold=True)
            game_over_text = game_over_font.render("TROPHY LOST!", True, (255, 200, 0))
            text_rect = game_over_text.get_rect(center=(400, 250))
            screen.blit(game_over_text, text_rect)
            
            restart_font = pygame.font.SysFont('Arial', 24)
            restart_text = restart_font.render("PRESS R TO BRAWL AGAIN!", True, (255, 255, 255))
            restart_rect = restart_text.get_rect(center=(400, 320))
            screen.blit(restart_text, restart_rect)
            
            # Reset game on R key
            if keys[pygame.K_r]:
                enemies.clear()
                PLAYER_HEALTH = MAX_HEALTH
                SCORE = 0
                
    except Exception as e:
        print(f"Supercell Game Error: {e}")
        try:
            font = pygame.font.SysFont('Arial', 20)
            error_text = font.render(f"BRAWL ERROR: {str(e)}", True, (255, 50, 50))
            screen.blit(error_text, (30, 90))
        except:
            pass