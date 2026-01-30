const admin = require('firebase-admin');
const serviceAccount = require('./voxai-data-firebase-adminsdk-4td45-2f31937eb6.json');  // Replace with your key file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://voxai-data.appspot.com"  // Replace with your Firebase bucket name
});

const bucket = admin.storage().bucket();

module.exports = { bucket };
