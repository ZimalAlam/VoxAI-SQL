#!/bin/bash

# 🎤 VoxAI - Stop All Services Script
echo "🛑 Stopping VoxAI Platform Services..."
echo "======================================="

# Function to kill process by PID
kill_process() {
    if kill -0 $1 2>/dev/null; then
        echo "🔴 Stopping process $1..."
        kill $1
        sleep 2
        if kill -0 $1 2>/dev/null; then
            echo "⚠️  Force killing process $1..."
            kill -9 $1
        fi
    fi
}

# Read PIDs from file and kill processes
if [ -f ".voxai_pids" ]; then
    echo "📋 Reading process IDs..."
    while read -r pid; do
        if [ ! -z "$pid" ]; then
            kill_process $pid
        fi
    done < .voxai_pids
    rm .voxai_pids
    echo "✅ Process ID file cleaned up"
fi

# Kill any remaining VoxAI-related processes
echo "🧹 Cleaning up any remaining processes..."

# Kill Node.js processes (backend/frontend)
pkill -f "node.*backend" 2>/dev/null
pkill -f "node.*frontend" 2>/dev/null
pkill -f "next.*dev" 2>/dev/null

# Kill Python Flask processes
pkill -f "python.*app.py" 2>/dev/null
pkill -f "flask.*run" 2>/dev/null

# Kill Ollama if running
pkill -f "ollama.*serve" 2>/dev/null

# Kill processes by port
echo "🔍 Checking for processes on VoxAI ports..."

for port in 3000 3001 5000 5001 5002 5004 11434; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "🔴 Killing process on port $port (PID: $pid)"
        kill $pid 2>/dev/null
        sleep 1
        # Force kill if still running
        if kill -0 $pid 2>/dev/null; then
            kill -9 $pid 2>/dev/null
        fi
    fi
done

echo ""
echo "✅ All VoxAI services have been stopped!"
echo "======================================="
echo "🔍 Port status:"
for port in 3000 3001 5000 5001 5002 5004 11434; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ Port $port: Still in use"
    else
        echo "✅ Port $port: Available"
    fi
done

echo ""
echo "🎉 VoxAI Platform has been shut down successfully!"
echo "💡 To start again, run: ./start-all-services.sh" 