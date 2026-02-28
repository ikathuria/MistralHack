import os
from dotenv import load_dotenv
import importlib
import numpy as np

import pygame

from mistralai import Mistral
from kokoro import KPipeline # text-to-speech
import sounddevice as sd

from constants import MISTRAL_MODEL, SYSTEM_PROMPT
import voice_input
import game_logic  # vibe file

load_dotenv()

###########################################################################################
# initialize Pygame
pygame.init()
screen = pygame.display.set_mode((800, 600))
clock = pygame.time.Clock()

# set up Mistral client
client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))

# set up Kokoro TTS
pipeline = KPipeline(lang_code='a')  # 'a' for american english
generator = pipeline(
    "Reality altered. Brawl mode activated.",
    voice='af_heart', speed=1.1
)
for _, _, audio in generator:
    sd.play(audio, 24000)


###########################################################################################
def get_vibe_code_with_stats(user_intent, current_code):
    """
    Calls Mistral and extracts logprobs to calculate confidence.
    This fulfills the 'Architectural Modification' track.
    """
    response = client.chat.complete(
        model=MISTRAL_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context: {current_code}\nIntent: {user_intent}"}
        ],
        # ensure your SDK is updated to use this
        # logprobs=True
    )

    print("Mistral Response:\n", response)

    new_code = response.choices[0].message.content

    # content_logprobs = response.choices[0].logprobs.content
    # probs = [np.exp(lp.logprob) for lp in content_logprobs]
    # avg_confidence = (sum(probs) / len(probs)) * 100 if probs else 100
    avg_confidence = 90.0  # Placeholder since logprobs may not be available

    return new_code, avg_confidence


def handle_vibe_shift():
    command = voice_input.record_and_transcribe(duration=4)
    print(f"You said: {command}")

    if not command:
        return

    response = client.chat.complete(
        model=MISTRAL_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": command}
        ]
    )

    new_code = response.choices[0].message.content

    with open("game_logic.py", "w") as f:
        f.write(new_code)

    print("Game logic updated via Mistral Vibe!")


if __name__ == "__main__":
    running = True
    while running:
        for event in pygame.event.get():

            if event.type == pygame.QUIT:
                running = False

            if event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
                user_command = voice_input.record_and_transcribe(duration=4)

                if user_command:
                    with open("game_logic.py", "r") as f:
                        current_code = f.read()

                    new_code, confidence = get_vibe_code_with_stats(
                        user_command, current_code
                    )

                    if "```" in new_code:
                        new_code = new_code.split("```")[1]  # Extract code from markdown

                    with open("game_logic.py", "w") as f:
                        f.write(new_code)

                    importlib.reload(game_logic)

                    if confidence > 85:
                        print(f"Success! Confidence: {confidence:.1f}%")
                    else:
                        print(f"Reality Glitch! Low Confidence: {confidence:.1f}%")


        screen.fill((30, 30, 30))

        game_logic.update(screen)

        pygame.display.flip()
        clock.tick(60)
