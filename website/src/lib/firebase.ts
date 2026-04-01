import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBR6YEX8I_nIXkxOm33e9ij0Y-jQDgT1xc',
  authDomain: 'guardian-pulse-1360c.firebaseapp.com',
  databaseURL: 'https://guardian-pulse-1360c-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'guardian-pulse-1360c',
  appId: '1:1058794098347:web:e358b1e45760d97127b1ee',
  messagingSenderId: '1058794098347',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getDatabase(app);
export default app;
