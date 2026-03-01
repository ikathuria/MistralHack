class GlobalRegistry:
    """
    Architectural Mod: A persistent state container that survives
    hot-reloading of the game_logic module.
    """

    def __init__(self):
        self.score = 0

        self.current_sprite = 'scout'
        self.player_health = 100
        self.max_health = 100
        self.player_x = 400
        self.player_y = 300

        self.enemies = []
        self.max_enemies = 10

        self.time_dilation = 1.0


# Supercell Official Palette (Brawl Stars Inspired)
COLORS = {
    "SUPERCELL_GOLD": (255, 200, 0),
    "BRAWL_PURPLE": (191, 0, 255),
    "ARENA_GREEN": (20, 80, 20),
    "TROPHY_RED": (255, 50, 50),
    "EL_PRIMO_BLUE": (0, 150, 255)
}
