#!/usr/bin/env python3

from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import random
from datetime import datetime

app = Flask(__name__)
CORS(app)

class SimpleConversationalAI:
    def __init__(self):
        self.responses = {
            # Greetings
            'greeting': [
                "Hello! I'm VoxAI, your SQL assistant. How can I help you today?",
                "Hi there! I'm here to help with SQL queries and database questions. What can I do for you?",
                "Hey! Welcome to VoxAI. I can help you with SQL, databases, or just chat. What's on your mind?",
                "Hello! Great to see you. I'm ready to help with any SQL or database questions you have."
            ],
            
            # SQL Help
            'sql_help': [
                "I'd be happy to help with SQL! You can ask me to convert natural language to SQL by starting your message with 'generate sql:' followed by your question.",
                "For SQL queries, just type 'generate sql:' followed by what you want to find. For example: 'generate sql: show all customers from New York'",
                "SQL is my specialty! Use 'generate sql:' prefix for database queries, or ask me about SQL concepts and I'll explain them.",
                "I can help you write SQL queries! Start with 'generate sql:' for automatic query generation, or ask me about SQL syntax and concepts."
            ],
            
            # Database concepts
            'database_concepts': [
                "Great question about databases! I love explaining database concepts. What specific aspect would you like to know more about?",
                "Databases are fascinating! I can explain concepts like tables, relationships, indexes, normalization, and more. What interests you?",
                "I'm here to help with database concepts! Whether it's about design, optimization, or theory, feel free to ask.",
                "Database knowledge is powerful! I can help explain anything from basic concepts to advanced topics. What would you like to learn?"
            ],
            
            # JOIN explanations
            'join_explanation': [
                "A JOIN in SQL combines rows from two or more tables based on a related column. The main types are:\n• INNER JOIN: Returns only matching records\n• LEFT JOIN: Returns all records from left table\n• RIGHT JOIN: Returns all records from right table\n• FULL JOIN: Returns all records from both tables\n\nWould you like examples of any specific type?",
                "JOINs are used to link tables together! Think of it like connecting puzzle pieces - you match records that have something in common (like a customer ID). The different types determine which records you keep when some don't have matches.",
                "SQL JOINs are relationships between tables. Imagine you have a Customers table and an Orders table - a JOIN lets you see which customer made which order by matching their IDs. Different JOIN types handle unmatched records differently."
            ],
            
            # Thanks
            'thanks': [
                "You're very welcome! Feel free to ask if you need any more help with SQL or databases.",
                "Happy to help! I'm always here for your SQL and database questions.",
                "My pleasure! Don't hesitate to ask if you have more questions.",
                "Glad I could help! I'm here whenever you need assistance with databases or SQL."
            ],
            
            # General help
            'help': [
                "I can help you with:\n• Converting natural language to SQL (use 'generate sql:' prefix)\n• Explaining SQL concepts and syntax\n• Database design questions\n• General conversation about databases\n• Troubleshooting SQL queries\n\nWhat would you like to explore?",
                "Here's what I can do:\n• Generate SQL queries from your questions\n• Explain database concepts\n• Help with SQL syntax\n• Discuss database best practices\n• Answer general questions\n\nJust ask me anything!",
                "I'm your database assistant! I can:\n• Create SQL queries from natural language\n• Explain how databases work\n• Help with SQL problems\n• Chat about database topics\n• Provide coding assistance\n\nHow can I assist you today?"
            ],
            
            # Fallback responses
            'fallback': [
                "That's an interesting topic! While I specialize in SQL and databases, I'm happy to chat. Is there anything database-related I can help you with?",
                "I understand what you're asking about. My expertise is in SQL and databases, but I enjoy our conversation! Do you have any database questions?",
                "Thanks for sharing that with me! I'm particularly good with SQL queries and database concepts. Is there anything in that area I can help with?",
                "I appreciate you telling me about that. While my strength is in databases and SQL, I'm here to help however I can. Any database questions on your mind?"
            ],
            
            # Encouragement
            'encouragement': [
                "Don't worry, database concepts can be tricky at first, but you'll get the hang of it! I'm here to help you learn.",
                "That's a great question! Learning databases takes time, and asking questions is the best way to improve.",
                "You're on the right track! Database skills are valuable, and I'm happy to guide you through any challenges.",
                "Keep going! Everyone starts somewhere with databases, and asking questions shows you're thinking critically."
            ]
        }
        
        self.patterns = {
            'greeting': [
                r'\b(hello|hi|hey|good morning|good afternoon|good evening)\b',
                r'\bhow are you\b',
                r'\bwhat\'s up\b'
            ],
            'sql_help': [
                r'\b(sql|query|database|table)\b',
                r'\bhow.*sql\b',
                r'\bwrite.*query\b',
                r'\bdatabase.*help\b'
            ],
            'database_concepts': [
                r'\b(database|table|schema|design|normalization|index)\b',
                r'\bhow.*database.*work\b',
                r'\bexplain.*database\b'
            ],
            'join_explanation': [
                r'\b(join|inner join|left join|right join|full join)\b',
                r'\bhow.*join.*work\b',
                r'\bexplain.*join\b',
                r'\bwhat.*join\b'
            ],
            'thanks': [
                r'\b(thank|thanks|appreciate|grateful)\b'
            ],
            'help': [
                r'\b(help|what can you do|capabilities|features)\b',
                r'\bhow.*help\b',
                r'\bwhat.*do\b'
            ],
            'encouragement': [
                r'\b(difficult|hard|confused|stuck|don\'t understand)\b',
                r'\bi don\'t know\b',
                r'\bhelp.*understand\b'
            ]
        }
    
    def classify_message(self, message):
        """Classify the user's message to determine the appropriate response type."""
        message_lower = message.lower()
        
        # Check each pattern category
        for category, patterns in self.patterns.items():
            for pattern in patterns:
                if re.search(pattern, message_lower):
                    return category
        
        return 'fallback'
    
    def generate_response(self, message, context=None):
        """Generate a response based on the message and context."""
        category = self.classify_message(message)
        
        # Add some context awareness
        if context and len(context) > 0:
            last_message = context[-1].get('content', '').lower()
            if 'sql' in last_message or 'database' in last_message:
                if category == 'fallback':
                    category = 'sql_help'
        
        # Get appropriate responses
        responses = self.responses.get(category, self.responses['fallback'])
        response = random.choice(responses)
        
        return {
            "success": True,
            "response": response,
            "model": "simple_ai",
            "category": category,
            "timestamp": datetime.now().isoformat()
        }

# Initialize the AI
ai_assistant = SimpleConversationalAI()

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "service": "VoxAI Simple Conversational AI",
        "status": "running",
        "model": "simple_ai",
        "features": [
            "Fast responses",
            "SQL help",
            "Database concepts",
            "Pattern-based conversations",
            "Context awareness"
        ],
        "endpoints": {
            "chat": "/chat",
            "status": "/status"
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
        context = data.get('context', [])
        
        if not message:
            return jsonify({
                "success": False,
                "error": "Message cannot be empty"
            }), 400
        
        # Generate response
        result = ai_assistant.generate_response(message, context)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@app.route('/status', methods=['GET'])
def status():
    """Check the status of the AI service."""
    return jsonify({
        "status": "running",
        "model": "simple_ai",
        "type": "pattern_based",
        "fast_response": True,
        "ready": True
    })

if __name__ == '__main__':
    print("🤖 Starting VoxAI Simple Conversational AI...")
    print("🚀 This is a lightweight, fast AI that works immediately!")
    print("📝 Service will run on http://localhost:5004")
    print("⚡ Features: Fast responses, SQL help, database concepts")
    
    app.run(debug=True, host='0.0.0.0', port=5004) 