"""Render the app's phrases to small MP3 clips with Piper TTS.

Usage: make_voice.py <piper-model.onnx> <phrases.json> <out-dir>
Clips are trimmed, mono 24 kHz, no ID3/Xing headers so they can be
concatenated byte-wise in the browser into one utterance.
"""
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

from piper import PiperVoice

model, phrases_path, out_dir = sys.argv[1], sys.argv[2], Path(sys.argv[3])
out_dir.mkdir(parents=True, exist_ok=True)
voice = PiperVoice.load(model)
phrases = json.load(open(phrases_path))
trim = ('silenceremove=start_periods=1:start_threshold=-45dB,areverse,'
        'silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.07')
with tempfile.TemporaryDirectory() as tmp:
    for i, p in enumerate(phrases):
        wav = Path(tmp) / f"{p['key']}.wav"
        with wave.open(str(wav), 'wb') as wf:
            voice.synthesize_wav(p['speak'], wf)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), '-af', trim, '-ac', '1', '-ar', '24000',
                        '-b:a', '48k', '-id3v2_version', '0', '-write_xing', '0', str(out_dir / f"{p['key']}.mp3")], check=True)
        if i % 25 == 0:
            print(f'{i}/{len(phrases)}', flush=True)
print('done', len(phrases))
