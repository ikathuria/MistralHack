# 🌟 Mistral AI Hackathon Submission: MistralHack

### 🚀 The "Elevator Pitch"
**MistralHack** is a voice-controlled RPG where the source code is a living, breathing character. Using **Mistral devstral-medium** and **ElevenLabs**, players can rewrite the game's physics and logic in real-time through voice commands, turning the act of coding into a high-stakes "Reality-Shifting" game mechanic.

---

### 💡 Key Innovation: The Voice-to-Reality Loop
While most AI games use LLMs for static dialogue, MistralHack uses them for **real-time hot-reloading of the game engine**.
1. **Intent Capture**: ElevenLabs **scribe_v2** transcribes player voice commands (e.g., *"Make my arrows explode on impact"*).
2. **AI Refactoring**: **Mistral devstral-medium** receives the current `game_logic.py` and the player's intent, then generates a precise, executable Python patch.
3. **Instant Patching**: The engine hot-swaps the logic mid-frame, allowing the player to witness their requested "reality shift" without pausing or restarting.

---

### 🎨 Features & Experience
- **The Architect AI**: An omnipresent supervisor (powered by **eleven_turbo_v2_5**) that narrates the "glitches" and "patches" as you modify the world.
- **Dynamic Campaign**: Navigate a quest-driven world where you must earn "Sigils of Truth" to weaken the barrier of **Lillith**, the final boss.
- **Mana Economy**: Reality-shifting is a resource. Players must balance their mana levels between movement buffs, quest revelation, and powerful offensive spells.
- **High-Aesthetic UI**: A vibrant, "Supercell-style" aesthetic with high-energy movement and explosive particle effects.

---

### 🛠️ Tech Stack
- **Language**: Python 3.10+
- **Game Engine**: Pygame (custom hot-reload implementation)
- **Code Reasoning**: `devstral-medium-latest`
- **Voice Intelligence**: ElevenLabs `scribe_v2` (STT) and `eleven_turbo_v2_5` (TTS)
- **Deployment**: Local Python environment with secure API integration.

### 🏆 Why MistralHack?
We demonstrated that generative AI isn't just for content—it's for **core logic**. By reducing the latency between *Human Intent* and *Executable Logic* to a few seconds, we've created a new genre: **The Generative RPG**.
