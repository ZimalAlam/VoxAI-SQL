# 🍎 macOS Setup Guide for VoxAI Conversational AI

## 🚀 Quick Setup Options

### Option 1: Homebrew (Recommended for macOS)
```bash
# 1. Install Ollama via Homebrew
brew install ollama

# 2. Start Ollama service
ollama serve &

# 3. Install AI models
ollama pull llama3.2:1b    # Fast, lightweight (~1GB)
ollama pull phi3:mini      # Very lightweight (~2GB)

# 4. Install Python dependencies
cd conversational-ai
pip3 install -r requirements.txt

# 5. Test the setup
python3 test_ai.py
```

### Option 2: Automated Script
```bash
# Run the macOS-specific setup script
./conversational-ai/setup_ollama_macos.sh
```

### Option 3: Manual Installation
```bash
# 1. Download Ollama for macOS
curl -L https://ollama.com/download/ollama-darwin -o /tmp/ollama
chmod +x /tmp/ollama
sudo mv /tmp/ollama /usr/local/bin/ollama

# 2. Start Ollama
ollama serve &

# 3. Install models
ollama pull llama3.2:1b
ollama pull phi3:mini

# 4. Install Python dependencies
cd conversational-ai
pip3 install -r requirements.txt
```

## 🔍 Verification

Check if everything is working:
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# List installed models
ollama list

# Test conversational AI
cd conversational-ai
python3 test_ai.py
```

## 🎯 Starting Services

### Start Individual Services
```bash
# Terminal 1: Ollama (if not already running)
ollama serve

# Terminal 2: Conversational AI
cd conversational-ai
python3 app.py

# Terminal 3: Text-to-SQL (existing)
cd Text-to-Sql
python3 app.py

# Terminal 4: Backend (existing)
cd backend
npm start

# Terminal 5: Frontend (existing)
cd frontend
npm run dev
```

### Start All Services at Once
```bash
./start_voxai_with_ai.sh
```

## 🍎 macOS-Specific Tips

### Performance Optimization
- **Metal GPU Acceleration**: Ollama automatically uses your Mac's GPU (Metal) for faster inference
- **Memory Management**: Close other applications to free up RAM for AI models
- **Model Storage**: Models are stored in `~/.ollama/models` (can be large files)

### Recommended Models for Mac
| Model | Size | RAM Needed | Speed | Quality |
|-------|------|------------|-------|---------|
| `phi3:mini` | ~2GB | 4GB+ | ⚡⚡⚡ | 🌟🌟🌟 |
| `llama3.2:1b` | ~1GB | 4GB+ | ⚡⚡⚡ | 🌟🌟🌟 |
| `mistral:7b` | ~4GB | 8GB+ | ⚡⚡ | 🌟🌟🌟🌟 |

### Troubleshooting macOS Issues

#### Ollama Won't Start
```bash
# Check if port is in use
lsof -i :11434

# Kill existing Ollama processes
pkill ollama

# Restart Ollama
ollama serve
```

#### Permission Issues
```bash
# If you get permission denied errors
sudo chown -R $(whoami) ~/.ollama
```

#### Model Download Issues
```bash
# Check internet connection and try again
ollama pull llama3.2:1b

# Or try a smaller model first
ollama pull phi3:mini
```

#### Python Dependencies
```bash
# If pip3 is not found
brew install python3

# If you prefer using virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 🔧 Configuration for Mac

Edit `conversational-ai/app.py` if needed:
```python
# Optimize for macOS
DEFAULT_MODEL = "phi3:mini"  # Lighter model for better performance
FALLBACK_MODEL = "llama3.2:1b"
```

## 📊 System Requirements

### Minimum
- macOS 10.15+ (Catalina or later)
- 8GB RAM
- 5GB free disk space

### Recommended
- macOS 12+ (Monterey or later)
- 16GB RAM
- 10GB free disk space
- Apple Silicon (M1/M2/M3) for best performance

## 🎉 What Works on Mac

✅ **Metal GPU Acceleration** - Faster inference on Apple Silicon  
✅ **Native Performance** - Optimized for macOS  
✅ **Low Power Usage** - Efficient on MacBook batteries  
✅ **Easy Installation** - Homebrew support  
✅ **Background Operation** - Runs quietly in background  

## 🆘 Getting Help

If you encounter issues:

1. **Check Homebrew**: `brew doctor`
2. **Verify Python**: `python3 --version`
3. **Check Ollama**: `ollama --version`
4. **View logs**: `tail -f /tmp/ollama.log`
5. **Restart services**: Kill and restart all services

## 🚀 Ready to Go!

Once setup is complete, your VoxAI platform will have:
- 🤖 Intelligent conversational AI
- 💬 Natural language chat capabilities  
- 🔍 SQL query generation (existing)
- 🏠 100% local operation
- ⚡ Fast responses optimized for Mac 