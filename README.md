# 🧙‍♂️ MistralHack: The Reality-Shift RPG

**MistralHack** is an experimental RPG built for the **Mistral AI Hackathon**. It pushes the boundaries of real-time AI integration by allowing players to rewrite the game's source code through voice commands while playing.

![The Architect](https://img.shields.io/badge/Mistral-AI-orange) ![ElevenLabs](https://img.shields.io/badge/ElevenLabs-Voice-blue) ![Pygame](https://img.shields.io/badge/Pygame-Engine-green)

---

## 🌌 The Concept
In the world of MistralHack, you are a "Brawler" in a reality controlled by **The Architect** (powered by Mistral AI). Reality is not fixed but is a script. By using your "Mana", you can whisper instructions to the Architect to shift physics, reveal hidden paths, or cast powerful spells.

### 🎙️ Voice-to-Reality Loop
1. **Speak**: Hold **Spacebar** to record your intent (e.g., *"Make me move twice as fast"* or *"Reveal the hidden path"*).
2. **Translate**: **ElevenLabs scribe_v2** transcribes your voice with high accuracy.
3. **Rewrite**: **Mistral (devstral-medium-latest)** receives your intent and the current game logic, then generates a live patch.
4. **Narrate**: **ElevenLabs eleven_turbo_v2_5** narrates the changes made by the Architect.
5. **Deploy**: The engine hot-reloads the `game_logic.py` module instantly without interrupting your movement.

---

## ✨ Key Features

### 🛠️ Real-Time Code Patching
Powered by Mistral's coding models, the game can handle complex logic shifts. Whether you want to change your class (Mage, Scout, Tank), alter gravity, or spawn new entities, the Architect handles the refactoring in microseconds.

### 🎭 Narrative & Roleplay
- **The Architect**: A constant presence that comments on your changes via **ElevenLabs TTS**.
- **Dynamic NPCs**: Characters like the **Elder** and **Guard** have unique voices and quest-specific dialogue.
- **Quest System**: Complete the "Architect's Sight" quest and "Reflex Calibration" mini-game to unlock the final confrontation.

### ⚔️ Final Boss: Lillith
Lillith is protected by a logic barrier. Once weakened by the Sigils of Truth, she enters a pursuit phase where she aggressively hunts the player. Players must use voice-casted spells (Lightning, Fire, Ice) to defeat her.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- A working microphone
- **API Keys** for:
  - [Mistral AI](https://console.mistral.ai/)
  - [ElevenLabs](https://elevenlabs.io/api)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/ikathuria/MistralHack.git
cd MistralHack

# Use the provided .venv or create one
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configuration
Create a `.env` file in the root directory:
```env
MISTRAL_API_KEY=your_mistral_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

### 4. Run the Game
```bash
python engine.py
```

---

## 🎮 Controls
- **Arrow Keys**: Move your character.
- **Spacebar (Start/Stop)**: Toggle voice recording. Speak your intent to the Architect.
- **E Key**: Interact with NPCs and items.
- **R Key**: Reset the game (after Win/Lose).

> 💡 Pro-Tip: Your Mana is your most precious resource. Don't waste it on small changes; save it for the final showdown with Lillith.

---

## 🏗️ Technical Architecture
- **`engine.py`**: The core loop and hot-reloading orchestrator. 
- **`app/coder.py`**: The interface to Mistral AI for code generation.
- **`app/narrator.py`**: Voice recording (STT) and narration (TTS).
- **`game/game_logic.py`**: The "living" source code that gets modified by AI.
- **`game/constants.py`**: A `GlobalRegistry` that preserves game state across logic reloads.

---

## 🏆 Hackathon Details
- **Submission**: Mistral AI Hackathon 2026.
- **Focus**: Demonstrating the power of Mistral's coding models and ElevenLabs voice models in interactive, low-latency environments.
- **Primary AI Models**: `devstral-medium-latest`, `scribe_v2`, `eleven_turbo_v2_5`.

---
*Created with ❤️ by Ishani Kathuria.*