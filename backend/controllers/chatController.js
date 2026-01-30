const Chat = require('../models/chat');
const User = require('../models/user');
const { generateTitle } = require('../utils/aiService');
const axios = require('axios');
const TextToSQL = require('../models/TextToSQL');
const Database = require('../models/database');
const simpleAI = require('../utils/simpleAI');


const shouldGenerateSQL = (text) => {
    return text.toLowerCase().startsWith("generate sql:");
  };

  const createChat = async (req, res) => {
    console.log('Request Body:', req.body);  
    const { messages } = req.body;

    if (!req.user || !req.user.id) {
        return res.status(400).send({ message: "User ID is missing" });
    }

    try {
       
        const formattedMessages = messages?.map(msg => ({
            text: msg.text,
            sender: msg.sender || "user",  
            createdAt: msg.createdAt || new Date()
        })) || [];

        const newChat = new Chat({
            user: req.user.id,
            title: "New Chat",
            messages: formattedMessages
        });

       
        await newChat.save();

        if (formattedMessages.length > 0) {
            const firstMessage = formattedMessages[0].text;

            
            const title = await generateTitle(firstMessage);

           
            newChat.title = title;
            await newChat.save();
        }

        res.status(201).send({ message: "Chat created successfully!", chat: newChat });
    } catch (err) {
        console.error("Error creating chat:", err);
        res.status(500).send({ message: "Error creating chat", error: err });
    }
};




// Fetch chats
const getChats = (req, res) => {
    Chat.find({ user: req.user.id })
        .then(chats => {
            res.status(200).send(chats);
        })
        .catch(err => {
            res.status(500).send({ message: "Error fetching chats", error: err });
        });
};

const addMessage = async (req, res) => {
    const { chatId, text } = req.body;

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).send({ message: "Chat not found" });
        }

       
        const userMessage = { text, sender: "user", createdAt: new Date() };
        chat.messages.push(userMessage);
        await chat.save();

        if (shouldGenerateSQL(text)) {
            const naturalQuery = text.replace(/generate sql:/i, '').trim();

           
            const activeDatabase = await Database.findOne({ user: req.user.id, isConnected: true });

            if (!activeDatabase) {
                console.error("❌ No active database connected.");
                return res.status(400).send({ message: "No active database connected." });
            }

            if (!activeDatabase.schema) {
                console.error("❌ Database schema is missing.");
                return res.status(400).send({ message: "Database schema is missing. Please reconnect the database." });
            }

            console.log("📚 Using schema:", activeDatabase.schema);

            
            const flaskResponse = await axios.post('http://127.0.0.1:5003/nl-to-sql', {
                question: naturalQuery,
                schema: activeDatabase.schema
            });

            const sqlQuery = flaskResponse.data.sql_query;

          
            const newTextToSQL = new TextToSQL({
                user: req.user.id,
                inputText: naturalQuery,
                sqlQuery
            });

            await newTextToSQL.save();


            const sqlMessage = { 
                text: sqlQuery, 
                sender: "system", 
                createdAt: new Date()
            };
            chat.messages.push(sqlMessage);
            await chat.save();


            const queryExecResponse = await axios.post(
                `http://localhost:3001/database/query/${activeDatabase._id}`,
                {
                    query: sqlQuery,
                    chatId: chat._id
                },
                {
                    headers: { Authorization: req.headers.authorization }
                }
            );

            const queryResultMessage = {
                text: `Query executed successfully. Showing ${queryExecResponse.data.queryResults.length} results.`,
                sender: "system", 
                isQueryResult: true,
                queryResults: queryExecResponse.data.queryResults,
                createdAt: new Date()
            };

            chat.messages.push(queryResultMessage);
            await chat.save();

            return res.status(200).send({
                message: "Message added and SQL generated successfully!",
                generatedSQL: sqlQuery,
                queryResults: queryExecResponse.data.queryResults,
                chat
            });
        } else {
            // Handle conversational AI for text mode using built-in simple AI
            try {
                console.log("🤖 Generating conversational AI response for:", text);
                
                // Get recent conversation context (last 5 messages)
                const recentMessages = chat.messages.slice(-5).map(msg => ({
                    text: msg.text,
                    sender: msg.sender
                }));

                // Use built-in simple AI (fast and reliable)
                const aiResponse = simpleAI.generateResponse(text, recentMessages);

                const aiMessage = {
                    text: aiResponse.response,
                    sender: "system",
                    isAIResponse: true,
                    aiModel: aiResponse.model,
                    aiCategory: aiResponse.category,
                    createdAt: new Date()
                };

                chat.messages.push(aiMessage);
                await chat.save();

                console.log("✅ AI response generated successfully with built-in AI");
                return res.status(200).send({
                    message: "Message added and AI response generated successfully!",
                    aiResponse: aiResponse.response,
                    aiModel: aiResponse.model,
                    aiCategory: aiResponse.category,
                    chat
                });

            } catch (aiError) {
                console.error("❌ Error with built-in AI:", aiError.message);
                
                // Ultimate fallback response
                const fallbackMessage = {
                    text: "Hello! I'm VoxAI, your SQL assistant. I can help you generate SQL queries by starting your message with 'generate sql:' followed by your question. What would you like to know?",
                    sender: "system",
                    isAIResponse: true,
                    aiModel: "ultimate_fallback",
                    createdAt: new Date()
                };

                chat.messages.push(fallbackMessage);
                await chat.save();

                return res.status(200).send({
                    message: "Message added with fallback response!",
                    aiResponse: fallbackMessage.text,
                    aiModel: "ultimate_fallback",
                    chat
                });
            }
        }

    } catch (err) {
        console.error('❌ Error adding message:', err);
        return res.status(500).send({ message: "Error processing message", error: err.message });
    }
};
  const getChatTitle = async (req, res) => {
    const { chatId } = req.params;
    console.log('🎯 getChatTitle called for chatId:', chatId);

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            console.log('❌ Chat not found:', chatId);
            return res.status(404).send({ message: 'Chat not found' });
        }

        console.log('📋 Chat found:', {
            chatId,
            currentTitle: chat.title,
            messageCount: chat.messages.length
        });

        // If title already exists, return it
        if (chat.title && chat.title !== 'Loading...' && chat.title !== 'New Chat') {
            console.log('✅ Returning existing title:', chat.title);
            return res.status(200).send({ title: chat.title });
        }

        // Generate title if not already present - use first user message
        const firstUserMessage = chat.messages.find(msg => msg.sender === 'user');
        if (!firstUserMessage || !firstUserMessage.text) {
            console.log('❌ No first user message found');
            return res.status(400).send({ message: 'No user message found to generate title' });
        }
        
        const firstMessage = firstUserMessage.text;

        console.log('🔄 Generating title for message:', firstMessage);
        const title = await generateTitle(firstMessage); // Call your AI title generation function
        console.log('✅ Generated title:', title);
        
        chat.title = title;
        await chat.save();

        res.status(200).send({ title });
    } catch (error) {
        console.error('❌ Error fetching or generating title:', error);
        res.status(500).send({ message: 'Error fetching or generating title', error });
    }
}; 
const getChatById = async (req, res) => {
    const { chatId } = req.params;

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).send({ message: "Chat not found" });
        }

        res.status(200).send(chat);
    } catch (err) {
        console.error("Error fetching chat:", err);
        res.status(500).send({ message: "Error fetching chat", error: err.message });
    }
};

// Add updateChatTitle function
const updateChatTitle = async (req, res) => {
    const { chatId } = req.params;
    const { title } = req.body;

    if (!title) {
        return res.status(400).send({ message: "Title is required" });
    }

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).send({ message: "Chat not found" });
        }

        // Update the title
        chat.title = title;
        await chat.save();

        console.log('Title updated successfully:', { chatId, title });
        res.status(200).send({ message: "Title updated successfully", chat });
    } catch (err) {
        console.error("Error updating chat title:", err);
        res.status(500).send({ message: "Error updating chat title", error: err.message });
    }
};

module.exports = {
    createChat,
    getChats,
    addMessage,
    getChatTitle,
    getChatById,
    updateChatTitle
};