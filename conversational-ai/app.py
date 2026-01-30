#!/usr/bin/env python3

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import logging
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "llama3.2:1b"  # Lightweight model for faster responses
FALLBACK_MODEL = "phi3:mini"   # Even smaller fallback

class ConversationalAI:
    def __init__(self):
        self.available_models = []
        self.current_model = DEFAULT_MODEL
        self.check_ollama_status()
    
    def check_ollama_status(self):
        """Check if Ollama is running and what models are available."""
        try:
            response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
            if response.status_code == 200:
                models_data = response.json()
                self.available_models = [model['name'] for model in models_data.get('models', [])]
                logger.info(f"Ollama is running. Available models: {self.available_models}")
                
                # Set current model to first available, or default
                if DEFAULT_MODEL in self.available_models:
                    self.current_model = DEFAULT_MODEL
                elif FALLBACK_MODEL in self.available_models:
                    self.current_model = FALLBACK_MODEL
                elif self.available_models:
                    self.current_model = self.available_models[0]
                else:
                    logger.warning("No models available in Ollama")
                    
                return True
        except Exception as e:
            logger.error(f"Ollama not available: {e}")
            return False
    
    def generate_response(self, message, context=None):
        """Generate a conversational response using Ollama."""
        if not self.available_models:
            return self.get_fallback_response(message)
        
        # Create a conversational prompt
        system_prompt = """You are VoxAI, a helpful and friendly AI assistant integrated into a SQL query platform. 
You help users with general questions, provide explanations about SQL and databases, and engage in natural conversation.
Keep responses concise but helpful. Be encouraging and supportive."""
        
        # Build conversation context
        prompt = f"{system_prompt}\n\nUser: {message}\nVoxAI:"
        
        if context:
            # Add recent conversation history
            conversation_history = "\n".join([
                f"{'User' if msg.get('sender') == 'user' else 'VoxAI'}: {msg.get('content', '')}"
                for msg in context[-3:]  # Last 3 messages for context
            ])
            prompt = f"{system_prompt}\n\nRecent conversation:\n{conversation_history}\n\nUser: {message}\nVoxAI:"
        
        try:
            payload = {
                "model": self.current_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "max_tokens": 200
                }
            }
            
            response = requests.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get('response', '').strip()
                
                if ai_response:
                    return {
                        "success": True,
                        "response": ai_response,
                        "model": self.current_model,
                        "timestamp": datetime.now().isoformat()
                    }
            
            logger.error(f"Ollama API error: {response.status_code} - {response.text}")
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
        
        return self.get_fallback_response(message)
    
    def get_fallback_response(self, message):
        """Provide fallback responses when AI model is not available."""
        message_lower = message.lower()
        
        # Simple pattern matching for common queries
        if any(word in message_lower for word in ['hello', 'hi', 'hey']):
            return {
                "success": True,
                "response": "Hello! I'm VoxAI, your SQL assistant. How can I help you today?",
                "model": "fallback",
                "timestamp": datetime.now().isoformat()
            }
        elif any(word in message_lower for word in ['sql', 'query', 'database']):
            return {
                "success": True,
                "response": "I'd be happy to help with SQL queries! You can ask me to convert natural language to SQL, or ask questions about databases and SQL syntax.",
                "model": "fallback",
                "timestamp": datetime.now().isoformat()
            }
        elif any(word in message_lower for word in ['help', 'what can you do']):
            return {
                "success": True,
                "response": "I can help you with:\n• Converting natural language to SQL queries\n• Explaining SQL concepts\n• General conversation\n• Database-related questions\n\nJust ask me anything!",
                "model": "fallback",
                "timestamp": datetime.now().isoformat()
            }
        elif any(word in message_lower for word in ['thank', 'thanks']):
            return {
                "success": True,
                "response": "You're welcome! Feel free to ask if you need any more help.",
                "model": "fallback",
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "success": True,
                "response": "I understand you're asking about that topic. While I'd love to give you a detailed response, I'm currently running in basic mode. For SQL queries, try using the SQL mode, or ask me about databases and SQL concepts!",
                "model": "fallback",
                "timestamp": datetime.now().isoformat()
            }

# Initialize the conversational AI
ai_assistant = ConversationalAI()

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "service": "VoxAI Conversational AI",
        "status": "running",
        "available_models": ai_assistant.available_models,
        "current_model": ai_assistant.current_model,
        "endpoints": {
            "chat": "/chat",
            "status": "/status",
            "models": "/models"
        }
    })

@app.route('/chat', methods=['POST'])
def chat():
    """Handle conversational chat requests."""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({
                "success": False,
                "error": "Message is required"
            }), 400
        
        message = data['message'].strip()
        context = data.get('context', [])  # Previous conversation messages
        
        if not message:
            return jsonify({
                "success": False,
                "error": "Message cannot be empty"
            }), 400
        
        logger.info(f"Generating response for: {message[:50]}...")
        
        # Generate response
        result = ai_assistant.generate_response(message, context)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return jsonify({
            "success": False,
            "error": "Internal server error"
        }), 500

@app.route('/status', methods=['GET'])
def status():
    """Check the status of the AI service."""
    ollama_status = ai_assistant.check_ollama_status()
    
    return jsonify({
        "ollama_running": ollama_status,
        "available_models": ai_assistant.available_models,
        "current_model": ai_assistant.current_model,
        "fallback_available": True
    })

@app.route('/models', methods=['GET'])
def list_models():
    """List available AI models."""
    ai_assistant.check_ollama_status()  # Refresh model list
    
    return jsonify({
        "available_models": ai_assistant.available_models,
        "current_model": ai_assistant.current_model,
        "recommended_models": [
            "llama3.2:1b",
            "phi3:mini", 
            "mistral:7b",
            "codellama:7b"
        ]
    })

@app.route('/switch-model', methods=['POST'])
def switch_model():
    """Switch to a different AI model."""
    try:
        data = request.get_json()
        model_name = data.get('model')
        
        if not model_name:
            return jsonify({
                "success": False,
                "error": "Model name is required"
            }), 400
        
        if model_name not in ai_assistant.available_models:
            return jsonify({
                "success": False,
                "error": f"Model '{model_name}' is not available. Available models: {ai_assistant.available_models}"
            }), 400
        
        ai_assistant.current_model = model_name
        
        return jsonify({
            "success": True,
            "message": f"Switched to model: {model_name}",
            "current_model": ai_assistant.current_model
        })
        
    except Exception as e:
        logger.error(f"Error switching model: {e}")
        return jsonify({
            "success": False,
            "error": "Internal server error"
        }), 500

if __name__ == '__main__':
    print("🤖 Starting VoxAI Conversational AI Service...")
    print(f"🔗 Ollama URL: {OLLAMA_BASE_URL}")
    print(f"🎯 Default Model: {DEFAULT_MODEL}")
    print("🚀 Service will run on http://localhost:5004")
    
    app.run(debug=True, host='0.0.0.0', port=5005) 