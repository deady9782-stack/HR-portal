import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const uid = process.argv[2];

if (!uid) {
  throw new Error("Provide the Firebase user UID: npm run admin:grant -- <UID>");
}

if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  throw new Error("Set NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local.");
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
const credential = clientEmail && privateKey
  ? cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") })
  : applicationDefault();
const app = getApps()[0] ?? initializeApp({ credential, projectId });

const auth = getAuth(app);
const user = await auth.getUser(uid);
await auth.setCustomUserClaims(uid, {
  ...user.customClaims,
  hr: true,
  admin: true,
});

console.log(`Granted HR administrator access to ${user.email ?? uid}. The user must sign out and back in.`);
