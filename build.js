// build.js — runs during Vercel deployment
// Reads Firebase config from environment variables and injects
// them into index.html, writing the result to public/index.html
//
// Set these in Vercel Dashboard → Project → Settings → Environment Variables:
//   FIREBASE_API_KEY
//   FIREBASE_PROJECT_ID
//   FIREBASE_APP_ID
//   FIREBASE_SENDER_ID

const fs   = require('fs');
const path = require('path');

// Read source
const src = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Read env vars (fall back to placeholders if not set — safe for local dev)
const apiKey    = process.env.FIREBASE_API_KEY        || 'YOUR_API_KEY';
const projectId = process.env.FIREBASE_PROJECT_ID     || 'YOUR_PROJECT_ID';
const appId     = process.env.FIREBASE_APP_ID         || 'YOUR_APP_ID';
const senderId  = process.env.FIREBASE_SENDER_ID      || 'YOUR_SENDER_ID';

// Replace the FB_CONFIG block
const injected = src.replace(
  /const FB_CONFIG\s*=\s*\{[\s\S]*?\};/,
  `const FB_CONFIG = {
  apiKey:            "${apiKey}",
  authDomain:        "${projectId}.firebaseapp.com",
  projectId:         "${projectId}",
  storageBucket:     "${projectId}.appspot.com",
  messagingSenderId: "${senderId}",
  appId:             "${appId}"
};`
);

// Write to public/ folder (Vercel serves this)
fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), injected, 'utf8');

console.log('✓ ShuttlePro built — Firebase config injected from environment variables');
console.log('  Project ID:', projectId);
