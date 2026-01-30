const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;


app.use(express.json());
app.use(cors());


mongoose.connect(process.env.URI)
    .then(() => {
        console.log("Connected to database!");
    })
    .catch((err) => {
        console.log("Error connecting to database", err);
    });


const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const databaseRoutes = require('./routes/databaseRoutes');
const voiceToTextRoutes = require('./routes/VoiceToTextRoutes');
const textToSQLRoutes = require('./routes/textToSQLRoutes');


app.use('/user', userRoutes);
app.use('/chat', chatRoutes);
app.use('/database', databaseRoutes);
app.use('/voice-to-text', voiceToTextRoutes);
app.use('/text-to-sql', textToSQLRoutes);


app.get('/', (req, res) => {
    res.send("Welcome to VoxAi SQL");
});


app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
