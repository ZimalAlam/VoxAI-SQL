const axios = require('axios');
const { bucket } = require('../firebase'); 
const VoiceToText = require('../models/VoiceToText');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const FormData = require('form-data'); 


const validMimeTypes = [
  'audio/wav',
  'audio/mpeg',
  'audio/ogg',
  'audio/mp4',
  'video/mp4',
  'video/3gpp',
  'audio/webm',
  'audio/webm;codecs=opus'
];


const convertToWav = (inputPath) => {
  const outputPath = path.join(
    path.dirname(inputPath),
    `${path.basename(inputPath, path.extname(inputPath))}.wav`
  );

  try {
    console.log(`Converting ${inputPath} to ${outputPath}...`);
    execSync(`ffmpeg -i "${inputPath}" -ar 16000 -ac 1 "${outputPath}" -y`);
    return outputPath;
  } catch (error) {
    console.error('Error during conversion:', error);
    throw new Error('Audio format conversion failed');
  }
};


exports.uploadVoiceFile = async (req, res) => {
  try {
    const audioPath = req.file.path; 
    console.log('Uploaded file:', req.file);

    const mimeType = req.file.mimetype;
    console.log(`Detected MIME type: ${mimeType}`);

    let finalAudioPath = audioPath;

    
    if (!validMimeTypes.includes(mimeType)) {
      console.log(`Unsupported MIME type: ${mimeType}. Converting to WAV...`);
      finalAudioPath = convertToWav(audioPath);
    }

    
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(finalAudioPath));

    
    const response = await axios.post('http://127.0.0.1:5001/transcribe', formData, {
      headers: formData.getHeaders(),
    });

    const transcription = response.data.transcription;

    
    const destination = `voices/${path.basename(finalAudioPath)}`;
    await bucket.upload(finalAudioPath, {
      destination,
      metadata: { contentType: 'audio/wav' },
    });

    const [file] = await bucket.file(destination).getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    
    const newEntry = new VoiceToText({
      user: req.user.id,
      voiceUrl: file,
      transcription,
      metadata: { originalMimeType: mimeType },
    });

    await newEntry.save();

    
    fs.unlinkSync(audioPath);
    if (finalAudioPath !== audioPath) fs.unlinkSync(finalAudioPath);

    res.status(200).json({ message: 'Transcription successful', data: newEntry });
  } catch (error) {
    console.error('Error in transcription process:', error);
    res.status(500).json({ message: 'Error in transcription process', error });
  }
};
