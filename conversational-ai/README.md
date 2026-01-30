# 🤖 VoxAI Conversational AI Service

A free, local conversational AI service for VoxAI that provides natural language chat capabilities using open-source models.

## ✨ Features

- **🆓 Completely Free**: Uses open-source models via Ollama
- **🏠 Runs Locally**: No data sent to external services
- **🚀 Fast Response**: Optimized for quick conversational responses
- **🔄 Fallback System**: Works even when AI models are unavailable
- **🎯 Context Aware**: Maintains conversation context
- **🔧 Model Switching**: Support for multiple AI models

## 🛠️ Setup Instructions

### Option 1: Quick Setup (Recommended)

1. **Run the setup script:**
   ```bash
   cd conversational-ai
   chmod +x setup_ollama.sh
   ./setup_ollama.sh
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the service:**
   ```bash
   python3 app.py
   ```

### Option 2: Manual Setup

1. **Install Ollama:**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Start Ollama service:**
   ```bash
   ollama serve
   ```

3. **Install AI models:**
   ```bash
   # Lightweight, fast model (recommended)
   ollama pull llama3.2:1b
   
   # Very lightweight model
   ollama pull phi3:mini
   
   # More capable but slower
   ollama pull mistral:7b
   ```

4. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Start the conversational AI service:**
   ```bash
   python3 app.py
   ```

## 🎯 API Endpoints

### Chat Endpoint
```http
POST /chat
Content-Type: application/json

{
  "message": "Hello, how are you?",
  "context": [
    {"content": "Hi there!", "sender": "user"},
    {"content": "Hello! How can I help you?", "sender": "system"}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "response": "I'm doing well, thank you! How can I assist you today?",
  "model": "llama3.2:1b",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Status Check
```http
GET /status
```

### List Models
```http
GET /models
```

### Switch Model
```http
POST /switch-model
Content-Type: application/json

{
  "model": "phi3:mini"
}
```

## 🤖 Recommended Models

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| `llama3.2:1b` | ~1GB | ⚡ Fast | 🌟 Good | General chat, quick responses |
| `phi3:mini` | ~2GB | ⚡ Fast | 🌟 Good | Lightweight conversations |
| `mistral:7b` | ~4GB | 🐌 Slower | ⭐⭐ Better | More detailed responses |
| `codellama:7b` | ~4GB | 🐌 Slower | ⭐⭐ Better | Code-related discussions |

## 🔧 Configuration

Edit the configuration in `app.py`:

```python
# Configuration
OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "llama3.2:1b"  # Change default model
FALLBACK_MODEL = "phi3:mini"   # Change fallback model
```

## 🚀 Integration with VoxAI

The service is automatically integrated with your VoxAI backend. When users send messages in text mode (not starting with "generate sql:"), the system will:

1. Send the message to the conversational AI service
2. Get an intelligent response
3. Display it in the chat interface
4. Maintain conversation context

## 🔍 Troubleshooting

### Ollama Not Starting
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
pkill ollama
ollama serve
```

### Models Not Available
```bash
# List installed models
ollama list

# Pull a model if missing
ollama pull llama3.2:1b
```

### Service Not Responding
```bash
# Check service status
curl http://localhost:5004/status

# Check logs
python3 app.py  # Run in foreground to see logs
```

## 📊 Performance Tips

1. **Use lightweight models** for faster responses
2. **Keep conversation context short** (last 3-5 messages)
3. **Monitor system resources** when running larger models
4. **Use SSD storage** for better model loading times

## 🔒 Privacy & Security

- ✅ **All data stays local** - no external API calls
- ✅ **No data collection** - conversations are not stored by the AI service
- ✅ **Open source models** - transparent and auditable
- ✅ **No internet required** - works offline once models are downloaded

## 🆘 Support

If you encounter issues:

1. Check the [Ollama documentation](https://ollama.com/docs)
2. Verify system requirements (8GB+ RAM recommended)
3. Try switching to a smaller model
4. Check the service logs for error messages

## 🎉 Example Conversations

**General Chat:**
```
User: Hello! How are you today?
VoxAI: Hello! I'm doing great, thank you for asking. I'm here to help you with any questions you might have about SQL, databases, or just general conversation. How can I assist you today?
```

**SQL Help:**
```
User: Can you explain what a JOIN is in SQL?
VoxAI: A JOIN in SQL is used to combine rows from two or more tables based on a related column between them. The most common types are INNER JOIN (returns matching records), LEFT JOIN (returns all records from left table), and RIGHT JOIN (returns all records from right table). Would you like me to show you some examples?
```

**Friendly Chat:**
```
User: I'm having trouble with my database project
VoxAI: I understand that database projects can be challenging! I'm here to help. What specific aspect are you struggling with? Is it designing the schema, writing queries, or something else? Feel free to share more details, and I'll do my best to guide you through it.
``` 