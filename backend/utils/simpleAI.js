// Simple AI utility for conversational responses
// This provides immediate conversational AI without external dependencies

const responses = {
    greeting: [
        "Hello! I'm VoxAI, your SQL assistant. How can I help you today?",
        "Hi there! I'm here to help with SQL queries and database questions. What can I do for you?",
        "Hey! Welcome to VoxAI. I can help you with SQL, databases, or just chat. What's on your mind?",
        "Hello! Great to see you. I'm ready to help with any SQL or database questions you have."
    ],
    
    sqlHelp: [
        "I'd be happy to help with SQL! You can ask me to convert natural language to SQL by starting your message with 'generate sql:' followed by your question.",
        "For SQL queries, just type 'generate sql:' followed by what you want to find. For example: 'generate sql: show all customers from New York'",
        "SQL is my specialty! Use 'generate sql:' prefix for database queries, or ask me about SQL concepts and I'll explain them.",
        "I can help you write SQL queries! Start with 'generate sql:' for automatic query generation, or ask me about SQL syntax and concepts."
    ],
    
    databaseConcepts: [
        "Great question about databases! I love explaining database concepts. What specific aspect would you like to know more about?",
        "Databases are fascinating! I can explain concepts like tables, relationships, indexes, normalization, and more. What interests you?",
        "I'm here to help with database concepts! Whether it's about design, optimization, or theory, feel free to ask.",
        "Database knowledge is powerful! I can help explain anything from basic concepts to advanced topics. What would you like to learn?"
    ],
    
    joinExplanation: [
        "A JOIN in SQL combines rows from two or more tables based on a related column. The main types are:\n• INNER JOIN: Returns only matching records\n• LEFT JOIN: Returns all records from left table\n• RIGHT JOIN: Returns all records from right table\n• FULL JOIN: Returns all records from both tables\n\nWould you like examples of any specific type?",
        "JOINs are used to link tables together! Think of it like connecting puzzle pieces - you match records that have something in common (like a customer ID). The different types determine which records you keep when some don't have matches.",
        "SQL JOINs are relationships between tables. Imagine you have a Customers table and an Orders table - a JOIN lets you see which customer made which order by matching their IDs. Different JOIN types handle unmatched records differently."
    ],
    
    thanks: [
        "You're very welcome! Feel free to ask if you need any more help with SQL or databases.",
        "Happy to help! I'm always here for your SQL and database questions.",
        "My pleasure! Don't hesitate to ask if you have more questions.",
        "Glad I could help! I'm here whenever you need assistance with databases or SQL."
    ],
    
    help: [
        "I can help you with:\n• Converting natural language to SQL (use 'generate sql:' prefix)\n• Explaining SQL concepts and syntax\n• Database design questions\n• General conversation about databases\n• Troubleshooting SQL queries\n\nWhat would you like to explore?",
        "Here's what I can do:\n• Generate SQL queries from your questions\n• Explain database concepts\n• Help with SQL syntax\n• Discuss database best practices\n• Answer general questions\n\nJust ask me anything!",
        "I'm your database assistant! I can:\n• Create SQL queries from natural language\n• Explain how databases work\n• Help with SQL problems\n• Chat about database topics\n• Provide coding assistance\n\nHow can I assist you today?"
    ],
    
    encouragement: [
        "Don't worry, database concepts can be tricky at first, but you'll get the hang of it! I'm here to help you learn.",
        "That's a great question! Learning databases takes time, and asking questions is the best way to improve.",
        "You're on the right track! Database skills are valuable, and I'm happy to guide you through any challenges.",
        "Keep going! Everyone starts somewhere with databases, and asking questions shows you're thinking critically."
    ],
    
    fallback: [
        "That's an interesting topic! While I specialize in SQL and databases, I'm happy to chat. Is there anything database-related I can help you with?",
        "I understand what you're asking about. My expertise is in SQL and databases, but I enjoy our conversation! Do you have any database questions?",
        "Thanks for sharing that with me! I'm particularly good with SQL queries and database concepts. Is there anything in that area I can help with?",
        "I appreciate you telling me about that. While my strength is in databases and SQL, I'm here to help however I can. Any database questions on your mind?"
    ]
};

const patterns = {
    greeting: [
        /\b(hello|hi|hey|good morning|good afternoon|good evening)\b/i,
        /\bhow are you\b/i,
        /\bwhat's up\b/i
    ],
    sqlHelp: [
        /\b(sql|query|database|table)\b/i,
        /\bhow.*sql\b/i,
        /\bwrite.*query\b/i,
        /\bdatabase.*help\b/i
    ],
    databaseConcepts: [
        /\b(database|table|schema|design|normalization|index)\b/i,
        /\bhow.*database.*work\b/i,
        /\bexplain.*database\b/i
    ],
    joinExplanation: [
        /\b(join|inner join|left join|right join|full join)\b/i,
        /\bhow.*join.*work\b/i,
        /\bexplain.*join\b/i,
        /\bwhat.*join\b/i
    ],
    thanks: [
        /\b(thank|thanks|appreciate|grateful)\b/i
    ],
    help: [
        /\b(help|what can you do|capabilities|features)\b/i,
        /\bhow.*help\b/i,
        /\bwhat.*do\b/i
    ],
    encouragement: [
        /\b(difficult|hard|confused|stuck|don't understand)\b/i,
        /\bi don't know\b/i,
        /\bhelp.*understand\b/i
    ]
};

function classifyMessage(message) {
    const messageLower = message.toLowerCase();
    
    // Check each pattern category
    for (const [category, patternList] of Object.entries(patterns)) {
        for (const pattern of patternList) {
            if (pattern.test(messageLower)) {
                return category;
            }
        }
    }
    
    return 'fallback';
}

function getRandomResponse(responseArray) {
    return responseArray[Math.floor(Math.random() * responseArray.length)];
}

function generateResponse(message, context = []) {
    const category = classifyMessage(message);
    
    // Add some context awareness
    if (context && context.length > 0) {
        const lastMessage = context[context.length - 1]?.text?.toLowerCase() || '';
        if ((lastMessage.includes('sql') || lastMessage.includes('database')) && category === 'fallback') {
            return {
                success: true,
                response: getRandomResponse(responses.sqlHelp),
                model: "simple_ai_builtin",
                category: "sqlHelp"
            };
        }
    }
    
    // Get appropriate responses
    const responseArray = responses[category] || responses.fallback;
    const response = getRandomResponse(responseArray);
    
    return {
        success: true,
        response: response,
        model: "simple_ai_builtin",
        category: category
    };
}

module.exports = {
    generateResponse,
    classifyMessage
}; 