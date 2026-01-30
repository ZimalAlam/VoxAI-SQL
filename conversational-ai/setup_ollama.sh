#!/bin/bash

echo "🤖 Setting up Ollama for VoxAI Conversational AI"
echo "================================================"

# Check if Ollama is already installed
if command -v ollama &> /dev/null; then
    echo "✅ Ollama is already installed"
else
    echo "📥 Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    
    if [ $? -eq 0 ]; then
        echo "✅ Ollama installed successfully"
    else
        echo "❌ Failed to install Ollama"
        exit 1
    fi
fi

echo ""
echo "🚀 Starting Ollama service..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to start
echo "⏳ Waiting for Ollama to start..."
sleep 5

# Check if Ollama is running
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "✅ Ollama is running"
else
    echo "❌ Ollama failed to start"
    exit 1
fi

echo ""
echo "📦 Installing recommended AI models..."

# Install lightweight models for better performance
echo "📥 Installing Llama 3.2 1B (lightweight, fast)..."
ollama pull llama3.2:1b

echo "📥 Installing Phi-3 Mini (very lightweight)..."
ollama pull phi3:mini

echo "📥 Installing Mistral 7B (more capable, slower)..."
ollama pull mistral:7b

echo ""
echo "🧪 Testing models..."

# Test the models
echo "Testing Llama 3.2..."
echo "Hello, how are you?" | ollama run llama3.2:1b

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Available models:"
ollama list

echo ""
echo "🚀 To start the conversational AI service:"
echo "   cd conversational-ai"
echo "   pip install -r requirements.txt"
echo "   python3 app.py"
echo ""
echo "📝 The service will run on http://localhost:5004"
echo "🔗 Ollama API is available at http://localhost:11434" 