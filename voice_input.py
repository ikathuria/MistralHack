import time
import numpy as np
import sounddevice as sd

from transformers import VoxtralRealtimeForConditionalGeneration, AutoProcessor

from constants import VOXTRAL_MODEL

processor = AutoProcessor.from_pretrained(VOXTRAL_MODEL)
model = VoxtralRealtimeForConditionalGeneration.from_pretrained(
    VOXTRAL_MODEL, device_map="auto"
)
print("Voxtral model loaded successfully with device set as", model.device)


def record_and_transcribe(duration=3):
    fs = 16000
    print(f"Listening for {duration} seconds...")

    audio = sd.rec(int(duration * fs), samplerate=fs,
                   channels=1, dtype='float32')
    sd.wait()
    audio_data = audio.flatten()

    print("Audio recorded, transcribing...")
    start_time = time.time()
    inputs = processor(audio_data, return_tensors="pt")
    inputs = inputs.to(model.device, dtype=model.dtype)

    outputs = model.generate(**inputs)
    decoded_outputs = processor.batch_decode(outputs, skip_special_tokens=True)

    end_time = time.time()
    print(f"Transcription took {end_time - start_time:.2f} seconds")

    return decoded_outputs[0]


if __name__ == "__main__":
    result = record_and_transcribe()
    print(f"Final Transcription: {result}")
