from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
import uuid
import whisper
import torch

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
UPLOAD_FOLDER = './uploads'

# Remove incorrect binary paths and use whisper Python library directly
model = whisper.load_model("medium")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def convert_to_wav(audio_path):
    """Convert any audio to 16-bit PCM WAV format."""
    converted_path = audio_path.replace(".wav", "_converted.wav")
    command = [
        "ffmpeg", "-i", audio_path,
        "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
        converted_path
    ]
    try:
        subprocess.run(command, check=True)
        return converted_path
    except subprocess.CalledProcessError as e:
        print(f"Error converting audio: {e}")
        return None

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    if 'file' not in request.files:
        return jsonify({"error": "No audio file uploaded"}), 400

    audio = request.files['file']
    original_audio_path = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4()}.wav")
    audio.save(original_audio_path)

    audio_path = convert_to_wav(original_audio_path) or original_audio_path

    try:
        # Use whisper Python library directly instead of binary
        result = model.transcribe(audio_path)
        transcription = result["text"]
        
        return jsonify({"transcription": transcription})

    except Exception as e:
        print(f"Transcription error: {str(e)}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

    finally:
        if os.path.exists(original_audio_path):
            os.remove(original_audio_path)
        if audio_path != original_audio_path and os.path.exists(audio_path):
            os.remove(audio_path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
