"""Render the app's phrases to MP3 clips with Kokoro TTS (more natural than Piper).

Usage: make_voice_kokoro.py <kokoro.onnx> <voices.bin> <phrases.json> <out-root>
Writes <out-root>/f/<key>.mp3 (af_heart) and <out-root>/m/<key>.mp3 (am_michael).
Clips are trimmed, mono 24 kHz, without ID3/Xing headers so the app can join them into one utterance.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro

model, voices, phrases_path, out_root = sys.argv[1], sys.argv[2], sys.argv[3], Path(sys.argv[4])
VOICES = {'f': 'af_heart', 'm': 'am_michael'}
k = Kokoro(model, voices)
phrases = json.load(open(phrases_path))
trim = ('silenceremove=start_periods=1:start_threshold=-48dB,areverse,'
        'silenceremove=start_periods=1:start_threshold=-48dB,areverse,apad=pad_dur=0.08')
with tempfile.TemporaryDirectory() as tmp:
    for tag, voice in VOICES.items():
        out = out_root / tag
        out.mkdir(parents=True, exist_ok=True)
        for i, p in enumerate(phrases):
            if (out / f"{p['key']}.mp3").exists():
                continue
            samples, sr = k.create(p['speak'], voice=voice, speed=1.0, lang='en-us')
            wav = Path(tmp) / 'clip.wav'
            sf.write(wav, samples, sr)
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), '-af', trim, '-ac', '1', '-ar', '24000',
                            '-b:a', '48k', '-id3v2_version', '0', '-write_xing', '0', str(out / f"{p['key']}.mp3")], check=True)
            if i % 50 == 0:
                print(tag, f'{i}/{len(phrases)}', flush=True)
print('done')
