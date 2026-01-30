#!/bin/bash

# 🎤 VoxAI - Service Status Check
echo "🔍 VoxAI Platform Status Check"
echo "==============================="

# Function to check if a port is in use
check_port() {
    local port=$1
    local service=$2
    local url=$3
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ $service: Running on port $port"
        if [ ! -z "$url" ]; then
            echo "   🌐 URL: $url"
        fi
        return 0
    else
        echo "❌ $service: Not running on port $port"
        return 1
    fi
}

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local service=$2
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|404"; then
        echo "✅ $service: HTTP endpoint responding"
        return 0
    else
        echo "❌ $service: HTTP endpoint not responding"
        return 1
    fi
}

echo "🔍 Checking service ports..."
echo "----------------------------"

# Check all services
check_port 3000 "Frontend (Next.js)" "http://localhost:3000"
check_port 3001 "Backend API" "http://localhost:3001"
check_port 5000 "Text-to-SQL Service" "http://localhost:5000"
check_port 5001 "Whisper API" "http://localhost:5001"
check_port 5002 "Text-to-Title Service" "http://localhost:5002"
check_port 5004 "Conversational AI" "http://localhost:5004"
check_port 11434 "Ollama" "http://localhost:11434"

echo ""
echo "🌐 Checking HTTP endpoints..."
echo "-----------------------------"

# Check HTTP endpoints
check_endpoint "http://localhost:3001" "Backend API"
check_endpoint "http://localhost:5000" "Text-to-SQL Service"
check_endpoint "http://localhost:5001" "Whisper API (will show as not responding - normal)"
check_endpoint "http://localhost:5002" "Text-to-Title Service"
check_endpoint "http://localhost:5004" "Conversational AI"
check_endpoint "http://localhost:11434/api/tags" "Ollama API"

echo ""
echo "🤖 Checking Ollama models..."
echo "----------------------------"

if command -v ollama >/dev/null 2>&1; then
    if ollama list 2>/dev/null | grep -q "llama3.2:1b"; then
        echo "✅ Ollama: llama3.2:1b model installed"
    else
        echo "❌ Ollama: llama3.2:1b model not installed"
        echo "   💡 Run: ollama pull llama3.2:1b"
    fi
    
    if ollama list 2>/dev/null | grep -q "phi3:mini"; then
        echo "✅ Ollama: phi3:mini model installed"
    else
        echo "❌ Ollama: phi3:mini model not installed"
        echo "   💡 Run: ollama pull phi3:mini"
    fi
else
    echo "❌ Ollama: Not installed"
    echo "   💡 Install: curl -fsSL https://ollama.com/install.sh | sh"
fi

echo ""
echo "📦 Checking dependencies..."
echo "--------------------------"

# Check Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
else
    echo "❌ Node.js: Not installed"
fi

# Check Python
if command -v python3 >/dev/null 2>&1; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Python: $PYTHON_VERSION"
else
    echo "❌ Python: Not installed"
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm: $NPM_VERSION"
else
    echo "❌ npm: Not installed"
fi

# Check pip
if command -v pip3 >/dev/null 2>&1; then
    PIP_VERSION=$(pip3 --version | cut -d' ' -f2)
    echo "✅ pip3: $PIP_VERSION"
else
    echo "❌ pip3: Not installed"
fi

echo ""
echo "📁 Checking project structure..."
echo "--------------------------------"

# Check if key directories exist
for dir in "backend" "frontend" "conversational-ai" "Text-to-Sql" "whisper-api" "text-to-title"; do
    if [ -d "$dir" ]; then
        echo "✅ Directory: $dir exists"
    else
        echo "❌ Directory: $dir missing"
    fi
done

# Check if key files exist
for file in "README.md" "start-all-services.sh" "stop-all-services.sh" ".gitignore"; do
    if [ -f "$file" ]; then
        echo "✅ File: $file exists"
    else
        echo "❌ File: $file missing"
    fi
done

echo ""
echo "🎯 Summary"
echo "=========="

# Count running services
RUNNING_SERVICES=0
TOTAL_SERVICES=7

for port in 3000 3001 5000 5001 5002 5004 11434; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        RUNNING_SERVICES=$((RUNNING_SERVICES + 1))
    fi
done

echo "📊 Services running: $RUNNING_SERVICES/$TOTAL_SERVICES"

if [ $RUNNING_SERVICES -eq $TOTAL_SERVICES ]; then
    echo "🎉 All services are running! VoxAI is ready to use."
    echo "🌐 Access the application at: http://localhost:3000"
elif [ $RUNNING_SERVICES -eq 0 ]; then
    echo "💤 No services are running."
    echo "🚀 Start all services with: ./start-all-services.sh"
else
    echo "⚠️  Some services are not running."
    echo "🔧 Check individual services or restart all with:"
    echo "   ./stop-all-services.sh && ./start-all-services.sh"
fi

echo ""
echo "💡 Helpful commands:"
echo "   ./start-all-services.sh  - Start all services"
echo "   ./stop-all-services.sh   - Stop all services"
echo "   ./check-status.sh        - Check service status" 