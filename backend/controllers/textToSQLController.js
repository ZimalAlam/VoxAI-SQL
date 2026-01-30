const TextToSQL = require('../models/TextToSQL');  // Import schema


exports.convertTextToSQL = async (req, res) => {
  try {
    const { inputText, sqlQuery, metadata } = req.body;

   
    const newTextToSQL = new TextToSQL({
      user: req.user.id,  
      inputText,
      sqlQuery, 
      metadata: metadata || {}  // Any additional metadata
    });

    await newTextToSQL.save();

    res.status(200).json({ message: 'Text-to-SQL conversion saved!', data: newTextToSQL });
  } catch (err) {
    res.status(500).json({ message: 'Error saving Text-to-SQL conversion', error: err });
  }
};
