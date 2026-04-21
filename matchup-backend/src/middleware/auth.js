const admin = require('firebase-admin');
require('dotenv').config();

if (!admin.apps.length) {
  try {
    // OPTION A (simple — for development, no service account file needed):
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    // OPTION B (recommended for production — download serviceAccountKey.json from
    // Firebase Console → Project Settings → Service Accounts → Generate new private key
    // then uncomment the 3 lines below and comment out the initializeApp above):
    //
    // const serviceAccount = require('../../serviceAccountKey.json');
    // admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

    console.log('Firebase Admin initialised');
  } catch (e) {
    console.error('Firebase Admin init failed:', e.message);
  }
}

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (e) {
    console.error('Token verification failed:', e.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};