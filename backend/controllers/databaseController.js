const Database = require('../models/database');
const User = require('../models/user');
const mysql = require('mysql2/promise');
const Chat = require('../models/chat');

let activeConnection = null;

const createMySQLConnection = async (database) => {
    return mysql.createConnection({
        host: database.host,
        user: database.username,
        password: database.password,
        database: database.dbName,
        port: database.port
    });
};


const addDatabase = async (req, res) => {
    try {
        const { dbName, host, port, username, password } = req.body;

        if (!req.user || !req.user.id) {
            return res.status(401).send({ message: "User not authorized" });
        }

        console.log(`🔄 Attempting to connect to database: ${dbName} at ${host}:${port}`);

        // Test connection first
        let connection;
        try {
            connection = await mysql.createConnection({
                host,
                user: username,
                password,
                database: dbName,
                port
            });
            console.log("✅ Database connection successful");
        } catch (connectionErr) {
            console.error("❌ Database connection failed:", connectionErr.message);
            
            // Provide specific error messages based on error code
            if (connectionErr.code === 'ECONNREFUSED') {
                return res.status(400).send({ 
                    message: `Cannot connect to MySQL server at ${host}:${port}. Please ensure MySQL is running.` 
                });
            } else if (connectionErr.code === 'ER_ACCESS_DENIED_ERROR') {
                return res.status(400).send({ 
                    message: `Access denied for user '${username}'. Please check your credentials.` 
                });
            } else if (connectionErr.code === 'ER_BAD_DB_ERROR') {
                return res.status(400).send({ 
                    message: `Database '${dbName}' doesn't exist. Please create the database first or check the name.` 
                });
            } else {
                return res.status(400).send({ 
                    message: `Database connection error: ${connectionErr.message}` 
                });
            }
        }

        // Fetch schema
        let schema;
        try {
            schema = await fetchDatabaseSchema(connection, dbName);
            console.log("✅ Schema fetched successfully");
        } catch (schemaErr) {
            console.error("❌ Schema fetch failed:", schemaErr.message);
            await connection.end();
            return res.status(400).send({ 
                message: `Failed to retrieve database schema: ${schemaErr.message}` 
            });
        }

        await connection.end();

        if (!schema) {
            return res.status(400).send({ message: "Database schema is empty or invalid." });
        }

        // Save to MongoDB
        const newDatabase = new Database({
            user: req.user.id,
            dbName,
            host,
            port,
            username,
            password,
            schema, 
            isIntegrated: false
        });

        await newDatabase.save();
        await User.findByIdAndUpdate(req.user.id, { $push: { databases: newDatabase._id } });

        console.log("✅ Database added to MongoDB successfully");
        res.status(201).send({ message: "MySQL Database added successfully!", schema });

    } catch (err) {
        console.error("❌ Error adding database:", err);
        res.status(500).send({ message: "Error adding database", error: err.message });
    }
};



const getDatabases = async (req, res) => {
    try {
        const databases = await Database.find({ user: req.user.id });
        res.status(200).send({ databases });
    } catch (err) {
        res.status(500).send({ message: "Error fetching databases", error: err.message });
    }
};

const connectToDatabase = async (req, res) => {
    try {
        const dbId = req.params.id;
        const database = await Database.findById(dbId);

        if (!database) {
            return res.status(404).send({ message: 'Database not found' });
        }

        console.log(`Connecting to database ${database.dbName} at ${database.host}:${database.port}...`);

       
        if (activeConnection) {
            await activeConnection.end();
            activeConnection = null;
        }

        
        activeConnection = await createMySQLConnection(database);

       
        await activeConnection.execute("SELECT 1");

        console.log("✅ MySQL connection established");

       
        const schema = await fetchDatabaseSchema(activeConnection, database.dbName);

        if (!schema) {
            console.warn("⚠️ Warning: Failed to retrieve schema. Proceeding without it.");
        }

        
        await Database.updateMany({ user: req.user.id }, { $set: { isConnected: false } });

        database.isConnected = true;
        database.schema = schema || ""; 
        await database.save();

        console.log("📚 Database schema fetched & updated in MongoDB");

        return res.status(200).send({ 
            success: true,
            message: `Connected to ${database.dbName}`,
            schema: schema
        });

    } catch (error) {
        console.error('🔥 Database connection error:', error);
        if (activeConnection) {
            await activeConnection.end();
            activeConnection = null;
        }
        return res.status(500).send({ 
            success: false,
            message: 'Failed to connect to the MySQL database', 
            error: error.message 
        });
    }
};


const disconnectDatabase = async (req, res) => {
    try {
        const dbId = req.params.id;
        const database = await Database.findById(dbId);

        if (!database || !database.isConnected) {
            return res.status(400).send({ message: "No active connection found for this database." });
        }

     
        if (activeConnection) {
            await activeConnection.end();
            activeConnection = null;
        }

        
        database.isConnected = false;
        await database.save();

        return res.status(200).send({ message: `Disconnected from ${database.dbName}` });

    } catch (error) {
        return res.status(500).send({ message: 'Failed to disconnect from database', error: error.message });
    }
};

const getActiveDatabase = async (req, res) => {
    try {
        const activeDatabase = await Database.findOne({ user: req.user.id, isConnected: true });

        if (!activeDatabase) {
            return res.status(200).send({ activeDatabase: null });
        }

        return res.status(200).send({ activeDatabase });
    } catch (error) {
        return res.status(500).send({ message: 'Error retrieving active database', error: error.message });
    }
};


const updateDatabase = async (req, res) => {
    try {
        const { dbName, host, port, username, password } = req.body;
        const database = await Database.findById(req.params.id);

        if (!database) {
            return res.status(404).send({ message: "Database not found" });
        }
        if (database.user.toString() !== req.user.id.toString()) {
            return res.status(403).send({ message: "You are not authorized to update this database" });
        }

        database.dbName = dbName || database.dbName;
        database.host = host || database.host;
        database.port = port || database.port;
        database.username = username || database.username;
        database.password = password || database.password;

        const updatedDatabase = await database.save();
        res.status(200).send({ message: "Database updated successfully!", database: updatedDatabase });

    } catch (err) {
        res.status(500).send({ message: "Error updating database", error: err.message });
    }
};

const deleteDatabase = async (req, res) => {
    try {
        const database = await Database.findById(req.params.id);
        if (!database) {
            return res.status(404).send({ message: "Database not found" });
        }
        if (database.user.toString() !== req.user.id.toString()) {
            return res.status(403).send({ message: "You are not authorized to delete this database" });
        }

        await Database.deleteOne({ _id: req.params.id });

        res.status(200).send({ message: "Database deleted successfully!" });
    } catch (err) {
        res.status(500).send({ message: "Error deleting database", error: err });
    }
};



const executeQuery = async (req, res) => {
    try {
        const dbId = req.params.id;
        const { query, chatId } = req.body;

        console.log('🔍 Incoming SQL Query Execution:', { dbId, query, chatId });

        if (!query || !chatId) {
            console.error("❌ ERROR: Missing SQL query or chatId in request.");
            return res.status(400).send({ 
                message: "SQL query and chatId are required in the request body."
            });
        }

        const database = await Database.findById(dbId);
        if (!database) {
            console.error("❌ ERROR: Database not found for ID:", dbId);
            return res.status(404).send({ message: "Database not found" });
        }

        // Check if we have an active connection
        if (!activeConnection) {
            console.log('🔄 No active connection found. Creating new connection...');
            try {
                activeConnection = await createMySQLConnection(database);
                // Test the connection
                await activeConnection.execute("SELECT 1");
                console.log('✅ New MySQL connection established');
                
                // Update database status
                database.isConnected = true;
                await database.save();
            } catch (connError) {
                console.error('❌ Error establishing database connection:', connError);
                return res.status(500).send({ 
                    success: false,
                    message: "Failed to establish database connection",
                    error: connError.message
                });
            }
        }

        // Verify connection is still alive
        try {
            await activeConnection.execute("SELECT 1");
        } catch (pingError) {
            console.log('🔄 Connection lost. Attempting to reconnect...');
            try {
                activeConnection = await createMySQLConnection(database);
                await activeConnection.execute("SELECT 1");
                console.log('✅ Successfully reconnected to database');
            } catch (reconnectError) {
                console.error('❌ Failed to reconnect:', reconnectError);
                return res.status(500).send({ 
                    success: false,
                    message: "Lost database connection and failed to reconnect",
                    error: reconnectError.message
                });
            }
        }

        console.log('🟢 Running Query:', query);
        const [results] = await activeConnection.execute(query);
        console.log('✅ Query Results:', results);

        // Find the chat to return updated chat data
        const chat = await Chat.findById(chatId);
        if (!chat) {
            console.error("❌ ERROR: Chat not found for ID:", chatId);
            return res.status(404).send({ message: "Chat not found" });
        }

        // Note: We don't add the query message here as it's already added by chatController
        // We only return the query results - the chatController will handle adding result messages

        return res.status(200).send({
            success: true,
            message: "Query executed successfully",
            queryResults: results
        });

    } catch (error) {
        console.error('🔥 Query execution error:', error);
        
        // If there's a connection error, clear the connection
        if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
            error.code === 'ECONNRESET' || 
            error.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
            console.log('🔄 Clearing invalid connection...');
            activeConnection = null;
        }
        
        return res.status(500).send({
            success: false,
            message: "Error executing SQL query",
            error: error.message
        });
    }
};


const fetchDatabaseSchema = async (connection, dbName) => {
    try {
        const [tables] = await connection.execute(`SHOW TABLES`);
        let schema = [];

        for (let table of tables) {
            const tableName = Object.values(table)[0];
            const [columns] = await connection.execute(`SHOW COLUMNS FROM ${tableName}`);

            const columnNames = columns.map(col => col.Field).join(", ");
            schema.push(`${tableName}(${columnNames})`);
        }

        return schema.join(", ");
    } catch (error) {
        console.error("❌ Error fetching schema:", error);
        return null;
    }
};



module.exports = {
    addDatabase,
    getDatabases,
    connectToDatabase,
    disconnectDatabase,
    getActiveDatabase,
    updateDatabase,
    deleteDatabase,
    executeQuery
};