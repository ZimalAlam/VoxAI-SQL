#!/bin/bash

# 🎤 VoxAI - Start All Services Script
echo "🚀 Starting VoxAI Platform Services..."
echo "======================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command_exists python3; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

if ! command_exists ollama; then
    echo "⚠️  Ollama is not installed. Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
fi

echo "✅ Prerequisites check completed!"
echo ""

# Start Ollama if not running
echo "🤖 Starting Ollama service..."
if ! port_in_use 11434; then
    ollama serve &
    sleep 5
    echo "✅ Ollama started on port 11434"
else
    echo "✅ Ollama already running on port 11434"
fi

# Download AI models if not present
echo "📥 Checking AI models..."
if ! ollama list | grep -q "llama3.2:1b"; then
    echo "📥 Downloading llama3.2:1b model..."
    ollama pull llama3.2:1b
fi

if ! ollama list | grep -q "phi3:mini"; then
    echo "📥 Downloading phi3:mini model..."
    ollama pull phi3:mini
fi

echo ""

# Start services in background
echo "🔧 Starting Backend API (port 3001)..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi
npm start &
BACKEND_PID=$!
cd ..

echo "🖥️  Starting Frontend (port 3000)..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo "🤖 Starting Conversational AI (port 5004)..."
cd conversational-ai
if [ ! -d "venv" ]; then
    echo "🐍 Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt >/dev/null 2>&1
python app.py &
CONV_AI_PID=$!
deactivate
cd ..

echo "🔤 Starting Text-to-SQL Service (port 5000)..."
cd Text-to-Sql
if [ ! -d "venv" ]; then
    echo "🐍 Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt >/dev/null 2>&1
python app.py &
TEXT_SQL_PID=$!
deactivate
cd ..

echo "🎙️  Starting Whisper API (port 5001)..."
cd whisper-api
if [ ! -d "venv" ]; then
    echo "🐍 Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt >/dev/null 2>&1
python app.py &
WHISPER_PID=$!
deactivate
cd ..

echo "📝 Starting Text-to-Title Service (port 5002)..."
cd text-to-title
if [ ! -d "venv" ]; then
    echo "🐍 Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt >/dev/null 2>&1
python app.py &
TITLE_PID=$!
deactivate
cd ..

echo ""
echo "🎉 All VoxAI services are starting up!"
echo "======================================="
echo "📱 Frontend:          http://localhost:3000"
echo "🔧 Backend API:       http://localhost:3001"
echo "🤖 Conversational AI: http://localhost:5004"
echo "🔤 Text-to-SQL:       http://localhost:5000"
echo "🎙️  Whisper API:      http://localhost:5001"
echo "📝 Text-to-Title:     http://localhost:5002"
echo "🤖 Ollama:            http://localhost:11434"
echo ""
echo "⏳ Please wait 30-60 seconds for all services to fully initialize..."
echo "🌐 Main application will be available at: http://localhost:3000"
echo ""
echo "To stop all services, press Ctrl+C or run: ./stop-all-services.sh"

# Create PID file for stopping services later
echo $BACKEND_PID > .voxai_pids
echo $FRONTEND_PID >> .voxai_pids
echo $CONV_AI_PID >> .voxai_pids
echo $TEXT_SQL_PID >> .voxai_pids
echo $WHISPER_PID >> .voxai_pids
echo $TITLE_PID >> .voxai_pids

# Wait for all background processes
wait 