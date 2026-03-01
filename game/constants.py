class GlobalRegistry:
    """
    Architectural Mod: A persistent state container that survives
    hot-reloading of the game_logic module.
    """

    def __init__(self):
        # player state
        self.current_sprite = "scout"
        self.player_x = 400
        self.player_y = 300

        self.score = 0
        self.player_level = 1
        self.player_health = 100
        self.max_health = 100
        self.mana = 100

        # World State (Larger Roaming Arena)
        self.world_map = [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ]
        self.tile_size = 100

        # Quest & State
        self.quest_stage = 0
        self.inventory = [] # List of Sigils
        self.mana = 100
        self.lillith_barrier_strength = 100.0
        
        # Visual FX
        self.screen_shake = 0
        self.pops = [] # Temporary pop effects on kill

        # NPC state
        self.npcs = [
            {
                'name': 'Elder',
                'x': 200,
                'y': 200,
                'sprite': 'mage',
                'dialogue': "Find the three Sigils of Truth to weaken her shield."
            },
            {
                'name': 'Guard',
                'x': 600,
                'y': 400,
                'sprite': 'tank',
                'dialogue': "Train hard. Lillith's barrier is no joke."
            }
        ]

        # Antagonist state
        self.villain = {
            'name': 'Lillith',
            'x': 1200,
            'y': 500,
            'size': 60,
            'sprite': 'lillith'
        }

        self.time_dilation = 1.0

        # narrative log
        self.log = [
            "Welcome to the Reality-Shift RPG. Press SPACE to whisper to the Architect."
        ]
        self.combat_log = self.log  # Keep for backward compatibility


# Supercell Official Palette (Brawl Stars Inspired)
COLORS = {
    "SUPERCELL_GOLD": (255, 200, 0),
    "BRAWL_PURPLE": (191, 0, 255),
    "ARENA_GREEN": (20, 80, 20),
    "TROPHY_RED": (255, 50, 50),
    "EL_PRIMO_BLUE": (0, 150, 255),
}
