class GlobalRegistry:
    """
    Architectural Mod: A persistent state container that survives
    hot-reloading of the game_logic module.
    """

    def __init__(self):
        # player state
        self.current_sprite = 'scout'
        self.player_x = 400
        self.player_y = 300

        self.score = 0
        self.player_level = 1
        self.player_health = 100
        self.max_health = 100
        self.mana = 100

        self.attacks = []  # Persistent list of active projectiles/spells

        # enemy state
        self.enemies = []
        self.max_enemies = 10

        self.time_dilation = 1.0

        # combat log for narrative flavor
        self.combat_log = ["The Architect watches your first move..."]


# Supercell Official Palette (Brawl Stars Inspired)
COLORS = {
    "SUPERCELL_GOLD": (255, 200, 0),
    "BRAWL_PURPLE": (191, 0, 255),
    "ARENA_GREEN": (20, 80, 20),
    "TROPHY_RED": (255, 50, 50),
    "EL_PRIMO_BLUE": (0, 150, 255)
}
