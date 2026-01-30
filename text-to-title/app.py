from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import logging

# Initialize Flask App
app = Flask(__name__)
CORS(app)

# Load the Model and Tokenizer
MODEL_PATH = "./models"
model_name = "google/roberta2roberta_L-24_gigaword"
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_PATH)
logging.basicConfig(level=logging.INFO)

@app.route('/generate-title', methods=['POST'])
def generate_title():
    try:
        logging.info("Received request")
        input_data = request.json
        if not input_data or 'text' not in input_data:
            logging.error("Invalid request: Missing 'text'")
            return jsonify({"error": "Invalid request, 'text' field is required"}), 400
        
        input_text = input_data['text']
        logging.info(f"Input text: {input_text}")

        inputs = tokenizer.encode("summarize: " + input_text, return_tensors="pt", max_length=512, truncation=True)

        outputs = model.generate(
            inputs,
            max_length=10,
            min_length=5,
            length_penalty=1.5,
            num_beams=6,
            early_stopping=True
        )
        title = tokenizer.decode(outputs[0], skip_special_tokens=True).title()

        logging.info(f"Generated title: {title}")
        return jsonify({"title": title})
    
    except Exception as e:
        logging.error(f"Error occurred: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Run the Flask App
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
