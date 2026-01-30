#!/usr/bin/env python3

import requests
import json

def test_conversational_ai():
    """Test the conversational AI service."""
    base_url = "http://localhost:5004"
    
    print("🧪 Testing VoxAI Conversational AI Service")
    print("=" * 50)
    
    # Test 1: Check service status
    print("\n1. Checking service status...")
    try:
        response = requests.get(f"{base_url}/status", timeout=5)
        if response.status_code == 200:
            status = response.json()
            print(f"   ✅ Service is running")
            print(f"   🤖 Ollama running: {status.get('ollama_running', False)}")
            print(f"   📦 Available models: {status.get('available_models', [])}")
            print(f"   🎯 Current model: {status.get('current_model', 'None')}")
        else:
            print(f"   ❌ Service returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Service not accessible: {e}")
        return False
    
    # Test 2: Simple chat
    print("\n2. Testing simple chat...")
    try:
        chat_data = {
            "message": "Hello! How are you?",
            "context": []
        }
        
        response = requests.post(f"{base_url}/chat", json=chat_data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"   ✅ Chat successful")
                print(f"   🤖 Model: {result.get('model', 'Unknown')}")
                print(f"   💬 Response: {result.get('response', '')[:100]}...")
            else:
                print(f"   ❌ Chat failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"   ❌ Chat request failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Chat test failed: {e}")
        return False
    
    # Test 3: Context-aware chat
    print("\n3. Testing context-aware chat...")
    try:
        context_data = {
            "message": "What did I just ask you?",
            "context": [
                {"content": "Hello! How are you?", "sender": "user"},
                {"content": "Hello! I'm doing great, thank you for asking.", "sender": "system"}
            ]
        }
        
        response = requests.post(f"{base_url}/chat", json=context_data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"   ✅ Context-aware chat successful")
                print(f"   💬 Response: {result.get('response', '')[:100]}...")
            else:
                print(f"   ❌ Context chat failed: {result.get('error', 'Unknown error')}")
        else:
            print(f"   ❌ Context chat request failed with status {response.status_code}")
    except Exception as e:
        print(f"   ❌ Context chat test failed: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Conversational AI service is working!")
    print("\n💡 Tips:")
    print("   • The service runs on http://localhost:5004")
    print("   • It integrates automatically with your VoxAI backend")
    print("   • Users can now have natural conversations in text mode")
    print("   • SQL queries still work with 'generate sql:' prefix")
    
    return True

if __name__ == "__main__":
    test_conversational_ai() 