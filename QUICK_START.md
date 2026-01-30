# 🚀 VoxAI Quick Start Guide

Get VoxAI up and running in 5 minutes!

## 📋 Prerequisites Check

Run this to check if you have everything needed:
```bash
./check-status.sh
```

## ⚡ One-Command Setup

```bash
# Clone the repository
git clone https://github.com/mortiestmorty1/FYP-VOXAi.git
cd FYP-VOXAi

# Start everything at once
./start-all-services.sh
```

That's it! 🎉

## 🌐 Access Your Application

After running the start script, wait 30-60 seconds then visit:
- **Main App**: http://localhost:3000
- **Backend API**: http://localhost:3001

## 🛑 Stop Everything

```bash
./stop-all-services.sh
```

## 🔧 Manual Setup (If Needed)

### 1. Install Prerequisites
```bash
# Install Node.js (https://nodejs.org)
# Install Python 3.8+ (https://python.org)
# Install Ollama
brew install ollama  # macOS
# or
curl -fsSL https://ollama.com/install.sh | sh  # Linux
```

### 2. Setup Environment
```bash
# Backend environment (create backend/.env)
cd backend
cp .env.example .env  # Edit with your values
cd ..
```

### 3. Install Dependencies
```bash
# Backend
cd backend && npm install && cd ..

# Frontend  
cd frontend && npm install && cd ..

# Python services
cd conversational-ai && pip install -r requirements.txt && cd ..
cd Text-to-Sql && pip install -r requirements.txt && cd ..
cd whisper-api && pip install -r requirements.txt && cd ..
cd text-to-title && pip install -r requirements.txt && cd ..
```

### 4. Setup AI Models
```bash
# Start Ollama
ollama serve &

# Download models
ollama pull llama3.2:1b
ollama pull phi3:mini
```

### 5. Start Services Manually
```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Conversational AI
cd conversational-ai && python app.py

# Terminal 4: Text-to-SQL
cd Text-to-Sql && python app.py

# Terminal 5: Whisper API
cd whisper-api && python app.py

# Terminal 6: Text-to-Title
cd text-to-title && python app.py
```

## 🆘 Troubleshooting

### Services won't start?
```bash
# Check what's using your ports
./check-status.sh

# Kill conflicting processes
./stop-all-services.sh

# Try again
./start-all-services.sh
```

### AI models not working?
```bash
# Check Ollama
ollama list
ollama pull llama3.2:1b
ollama pull phi3:mini
```

### Dependencies missing?
```bash
# Node.js issues
cd backend && npm install
cd frontend && npm install

# Python issues  
pip3 install -r conversational-ai/requirements.txt
pip3 install -r Text-to-Sql/requirements.txt
pip3 install -r whisper-api/requirements.txt
pip3 install -r text-to-title/requirements.txt
```

## 🎯 What Each Service Does

- **Frontend** (port 3000): Web interface
- **Backend** (port 3001): API server & user management
- **Conversational AI** (port 5004): Chat with AI
- **Text-to-SQL** (port 5000): Convert text to SQL queries
- **Whisper API** (port 5001): Voice to text conversion
- **Text-to-Title** (port 5002): Generate titles from text
- **Ollama** (port 11434): Local AI model server

## 📖 Need More Help? 

Check the main [README.md](README.md) for detailed documentation.

---

**Made with ❤️ by the VoxAI Team** 