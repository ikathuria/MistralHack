import sounddevice as sd
import numpy as np
from faster_whisper import WhisperModel

from constants import WHISPER_MODEL_SIZE

model = WhisperModel(WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")


def record_and_transcribe(duration=3):
    fs = 16000
    print(f"Listening for {duration} seconds...")

    # 1. Record
    audio = sd.rec(int(duration * fs), samplerate=fs,
                   channels=1, dtype='float32')
    sd.wait()

    # 2. IMPORTANT: Flatten to 1D for Whisper
    audio_data = audio.flatten()

    # 3. Transcribe
    segments, info = model.transcribe(audio_data, beam_size=5)

    full_text = ""
    for segment in segments:
        print(f"[{segment.start:.2f}s] {segment.text}")
        full_text += segment.text

    return full_text.strip()


if __name__ == "__main__":
    result = record_and_transcribe()
    print(f"Final Transcription: {result}")
