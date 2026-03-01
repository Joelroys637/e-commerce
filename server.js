const express = require('express');
const cookieSession = require('cookie-session');

const dotenv = require('dotenv');
const path = require('path');
const admin = require('firebase-admin');
// Load env vars
dotenv.config();

// First, initialize Firebase Admin
// We require a serviceAccountKey.json or for the user to be authenticapp.listenated in GCP
try {
  let credentialSettings;

  // 1. Try to use Environment Variables (for Vercel/Production)
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    credentialSettings = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercel env vars often escape newlines, so we replace them 
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    });
  }
  // 2. Fallback to local JSON file (for local development)
  else {
    try {
      const serviceAccount = require('./serviceAccountKey.json');
      credentialSettings = admin.credential.cert(serviceAccount);
    } catch (err) {
      console.warn("WARNING: 'serviceAccountKey.json' not found and Firebase env vars missing.");
      throw new Error("Missing Firebase credentials! Either provide serviceAccountKey.json or set FIREBASE_ environment variables.");
    }
  }

  admin.initializeApp({
    credential: credentialSettings,
    projectId: process.env.FIREBASE_PROJECT_ID || (credentialSettings && credentialSettings.projectId) || 'e-commerce-a5515',
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID || 'e-commerce-a5515'}-default-rtdb.firebaseio.com`,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'e-commerce-a5515.firebasestorage.app'
  });
  console.log("Firebase Admin initialized successfully.");
} catch (e) {
  console.error("Firebase Admin initialization failed:", e.message);
  // It's usually better to exit the process if critical services can't load
  // rather than crashing silently later on route calls.
  // process.exit(1); 
}

const app = express();

// Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Session
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'secret'],
  maxAge: 24 * 60 * 60 * 1000
}));

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static folder
app.use(express.static(path.join(__dirname, 'public')));

// Set global variables for templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAdmin = req.session.isAdmin || false;
  next();
});

// Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', userRoutes);

// 404 Route
app.use((req, res) => {
  res.status(404).render('user/404', { pageTitle: 'Page Not Found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

