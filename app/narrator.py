import os
import io
import time
from dotenv import load_dotenv

import wave
import sounddevice as sd

from elevenlabs.client import ElevenLabs
from elevenlabs import stream

from utils.constants import ELEVENLABS_MODEL_V2T, ELEVENLABS_MODEL_T2V

###########################################################################################
load_dotenv()
client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))
###########################################################################################


def record_and_transcribe(duration=4):
    fs = 16000
    print(f"Recording intent for {duration} seconds...")

    audio = sd.rec(
        int(duration * fs), samplerate=fs,
        channels=1, dtype='int16'
    )
    sd.wait()

    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(fs)
        wf.writeframes(audio.tobytes())
    buffer.seek(0)

    # 3. Call ElevenLabs Scribe v2
    print("Transcribing via ElevenLabs...")
    curr_time = time.time()
    try:
        transcription = client.speech_to_text.convert(
            file=buffer,
            model_id=ELEVENLABS_MODEL_V2T,
            tag_audio_events=False,
            language_code="eng"
        )
        full_text = transcription.text
        print(f"Architect heard: {full_text}")
        print(f"Transcription took {time.time() - curr_time:.2f} seconds")
        return full_text
    except Exception as e:
        print(f"ElevenLabs STT Error: {e}")
        return ""


def announce_vibe_shift(text):
    """
    Streams audio directly to speakers. 
    Use this for the 'Game Architect' persona.
    """
    try:
        audio_stream = client.text_to_speech.convert(
            text=text,
            voice_id="pNInz6obpgDQGcFmaJgB",  # Adam
            model_id=ELEVENLABS_MODEL_T2V,
            output_format="mp3_44100_128"
        )
        stream(audio_stream)
    except Exception as e:
        print(f"ElevenLabs Error: {e}")


def architect_commentary(event_type):
    lines = {
        "intro": "Welcome to the Brawl! Let's shake things up.",
        "hard_mode": "You're struggling. Let me rewrite the physics to favor you.",
        "success": "Reality patched. Try not to break this one.",
        "glitch": "The logic is fracturing. Hold on!"
    }
    announce_vibe_shift(lines.get(event_type, "Proceeding."))


if __name__ == "__main__":
    result = record_and_transcribe()
    print(f"Final Transcription: {result}")
