import random


class Character:

    def __init__(self, name, x, y, size, sprite, health, max_health, dialogue=""):
        self.name = name
        self.x = x
        self.y = y
        self.size = size
        self.sprite = sprite
        self.health = health
        self.max_health = max_health
        self.dialogue = dialogue


class GlobalRegistry:
    """
    Architectural Mod: A persistent state container that survives
    hot-reloading of the game_logic module.
    """

    def __init__(self):
        # narrative log
        self.is_recording = False
        self.log = [
            "Welcome to the Reality-Shift RPG. Press SPACE to whisper to the Architect."
        ]
        self.combat_log = self.log  # Keep for backward compatibility

        # Quest & State Extensions
        self.quest_stage = 0
        self.inventory = []
        self.mana = 100
        self.can_cast_ult = False

        # Architect's Sight
        self.hidden_sigil_revealed = False
        self.hidden_sigil_pos = (random.randint(100, 1400), random.randint(100, 900))

        # player state
        self.score = 0
        self.player = Character("Player", 400, 300, 40, "scout", 100, 100, speed=5.0)

        # Reflex Calibration (Guard's Mini-game)
        self.training_active = False
        self.training_timer = 0
        self.training_orbs = []
        self.training_sessions = 0

        # NPC state
        self.npcs = [
            Character(
                "Elder",
                200,
                200,
                40,
                "mage",
                100,
                100,
                speed=0.0,
                dialogue="Find the three Sigils of Truth to weaken her shield.",
            ),
            Character(
                "Guard",
                600,
                400,
                40,
                "tank",
                100,
                100,
                speed=0.0,
                dialogue="Train hard. Lillith's barrier is no joke.",
            ),
        ]

        # Antagonist state
        self.villain = Character(
            "Lillith", 1200, 500, 60, "lillith", 100, 100, speed=2.5
        )
        self.lillith_barrier_strength = 100.0

        # Boss Fight & Spells
        self.spells = []  # Active player spells

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

        # Visual FX
        self.time_dilation = 1.0
        self.screen_shake = 0
        self.pops = []


# Supercell Official Palette (Brawl Stars Inspired)
COLORS = {
    "SUPERCELL_GOLD": (255, 200, 0),
    "BRAWL_PURPLE": (191, 0, 255),
    "ARENA_GREEN": (20, 80, 20),
    "TROPHY_RED": (255, 50, 50),
    "EL_PRIMO_BLUE": (0, 150, 255),
}
