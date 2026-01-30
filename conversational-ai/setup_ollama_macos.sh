#!/bin/bash

echo "🤖 Setting up Ollama for VoxAI Conversational AI (macOS)"
echo "====================================================="

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is for macOS only. For Linux, use setup_ollama.sh"
    exit 1
fi

# Check if Ollama is already installed
if command -v ollama &> /dev/null; then
    echo "✅ Ollama is already installed"
    ollama --version
else
    echo "📥 Installing Ollama for macOS..."
    
    # Check if we have curl
    if ! command -v curl &> /dev/null; then
        echo "❌ curl is required but not installed"
        exit 1
    fi
    
    # Download and install Ollama for macOS
    echo "🔄 Downloading Ollama..."
    curl -L https://ollama.com/download/ollama-darwin -o /tmp/ollama
    
    if [ $? -eq 0 ]; then
        echo "🔧 Installing Ollama..."
        chmod +x /tmp/ollama
        sudo mv /tmp/ollama /usr/local/bin/ollama
        
        if [ $? -eq 0 ]; then
            echo "✅ Ollama installed successfully"
        else
            echo "❌ Failed to install Ollama (permission denied?)"
            echo "💡 Try running: sudo mv /tmp/ollama /usr/local/bin/ollama"
            exit 1
        fi
    else
        echo "❌ Failed to download Ollama"
        echo "💡 You can also install via Homebrew: brew install ollama"
        exit 1
    fi
fi

echo ""
echo "🚀 Starting Ollama service..."

# Start Ollama in background
ollama serve > /tmp/ollama.log 2>&1 &
OLLAMA_PID=$!

echo "   Ollama PID: $OLLAMA_PID"
echo "   Log file: /tmp/ollama.log"

# Wait for Ollama to start
echo "⏳ Waiting for Ollama to start..."
sleep 8

# Check if Ollama is running
MAX_ATTEMPTS=10
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama is running on http://localhost:11434"
        break
    else
        echo "   Attempt $ATTEMPT/$MAX_ATTEMPTS - waiting..."
        sleep 2
        ATTEMPT=$((ATTEMPT + 1))
    fi
done

if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
    echo "❌ Ollama failed to start after $MAX_ATTEMPTS attempts"
    echo "📋 Check the log file: tail -f /tmp/ollama.log"
    exit 1
fi

echo ""
echo "📦 Installing recommended AI models..."
echo "ℹ️  This may take several minutes depending on your internet connection"

# Install lightweight models for better performance on macOS
echo ""
echo "📥 Installing Llama 3.2 1B (lightweight, ~1GB)..."
ollama pull llama3.2:1b
if [ $? -eq 0 ]; then
    echo "   ✅ Llama 3.2 1B installed"
else
    echo "   ❌ Failed to install Llama 3.2 1B"
fi

echo ""
echo "📥 Installing Phi-3 Mini (very lightweight, ~2GB)..."
ollama pull phi3:mini
if [ $? -eq 0 ]; then
    echo "   ✅ Phi-3 Mini installed"
else
    echo "   ❌ Failed to install Phi-3 Mini"
fi

echo ""
echo "📥 Installing Mistral 7B (more capable, ~4GB)..."
echo "⚠️  This is a larger model and may take longer to download"
ollama pull mistral:7b
if [ $? -eq 0 ]; then
    echo "   ✅ Mistral 7B installed"
else
    echo "   ❌ Failed to install Mistral 7B (you can install it later)"
fi

echo ""
echo "🧪 Testing models..."

# Test the primary model
echo "Testing Llama 3.2 1B..."
TEST_RESPONSE=$(echo "Hello, how are you?" | ollama run llama3.2:1b 2>/dev/null | head -1)
if [ -n "$TEST_RESPONSE" ]; then
    echo "   ✅ Test successful: $TEST_RESPONSE"
else
    echo "   ⚠️  Test response was empty (model may still be loading)"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Available models:"
ollama list

echo ""
echo "📱 Next steps:"
echo "   1. Install Python dependencies:"
echo "      cd conversational-ai"
echo "      pip3 install -r requirements.txt"
echo ""
echo "   2. Start the conversational AI service:"
echo "      python3 app.py"
echo ""
echo "   3. Or start all VoxAI services at once:"
echo "      cd .."
echo "      ./start_voxai_with_ai.sh"
echo ""
echo "📝 Service URLs:"
echo "   • Conversational AI: http://localhost:5004"
echo "   • Ollama API:        http://localhost:11434"
echo ""
echo "🔧 Troubleshooting:"
echo "   • Check Ollama status: curl http://localhost:11434/api/tags"
echo "   • View Ollama logs:    tail -f /tmp/ollama.log"
echo "   • Restart Ollama:      pkill ollama && ollama serve &"
echo ""
echo "💡 Tips for macOS:"
echo "   • Ollama will use your Mac's GPU if available (Metal)"
echo "   • Recommended RAM: 8GB+ for smooth operation"
echo "   • Models are stored in ~/.ollama/models" 