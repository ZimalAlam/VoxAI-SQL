const { default: axios } = require("axios");

const generateTitle = async (text) => {
    try {
        console.log('🔄 Calling text-to-title service with text:', text);
        const response = await axios.post('http://127.0.0.1:5002/generate-title', {
            text,
        });
        console.log('✅ Text-to-title service response:', response.data);
        return response.data.title; // Ensure the title is returned correctly
    } catch (error) {
        console.error("❌ Error generating title:", error.message);
        throw new Error("Failed to generate title.");
    }
};

module.exports = { generateTitle };
