import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBR6YEX8I_nIXkxOm33e9ij0Y-jQDgT1xc',
  authDomain: 'guardian-pulse-1360c.firebaseapp.com',
  databaseURL: 'https://guardian-pulse-1360c-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'guardian-pulse-1360c',
  appId: '1:1058794098347:web:e358b1e45760d97127b1ee',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const PATIENTS = [
  { id: 'patient-1', firstName: 'Sarah', lastName: 'Connor', phone: '+14155550001', mode: 'normal', targetBpm: 72 },
  { id: 'patient-2', firstName: 'John', lastName: 'Doe', phone: '+14155550002', mode: 'parkinson', targetBpm: 68 },
  { id: 'patient-3', firstName: 'Jane', lastName: 'Smith', phone: '+14155550003', mode: 'sleep', targetBpm: 55 },
  { id: 'patient-4', firstName: 'Robert', lastName: 'Oppenheimer', phone: '+14155550004', mode: 'normal', targetBpm: 125 }, // High
  { id: 'patient-5', firstName: 'Marie', lastName: 'Curie', phone: '+14155550005', mode: 'normal', targetBpm: 45 }, // Low
  { id: 'patient-6', firstName: 'Alan', lastName: 'Turing', phone: '+14155550006', mode: 'normal', targetBpm: 80 }
];

async function seed() {
  console.log('Seeding Guardian Pulse mock data...');

  // 1. Seed Users
  for (const p of PATIENTS) {
    await set(ref(db, `users/${p.id}`), {
      firstName: p.firstName,
      lastName: p.lastName,
      email: `${p.firstName.toLowerCase()}@example.com`,
      role: 'patient',
      phone: p.phone,
      mode: p.mode,
      needsSupport: p.id === 'patient-1', // Sarah needs support
      createdAt: Date.now() - 30 * 86400000
    });
  }

  // Admin
  await set(ref(db, `users/admin-1`), {
    firstName: 'Dr. Strange',
    lastName: 'Admin',
    email: 'pranjalmishra2409@gmail.com',
    role: 'admin',
    createdAt: Date.now() - 60 * 86400000
  });

  // 2. Seed Initial ECG History (Past 10 minutes)
  console.log('Generating ECG history...');
  const now = Date.now();
  for (const p of PATIENTS) {
    for (let i = 60; i >= 0; i--) {
      // every 2 seconds = 120 seconds = 2 mins for 60 points
      const t = now - (i * 2000);
      const jitter = Math.floor(Math.random() * 7) - 3;
      await push(ref(db, `ecg_readings`), {
        userId: p.id,
        timestamp: t,
        bpm: p.targetBpm + jitter,
        voltage: 1.0 + (Math.random() * 0.2),
        rrIntervals: [800, 810, 790, 820]
      });
    }
  }

  // 3. Seed Alerts
  console.log('Generating Alerts...');
  await set(ref(db, `alerts/alert-1`), {
    userId: 'patient-4',
    type: 'cardiac',
    status: 'active',
    createdAt: now - 300000, // 5 mins ago
  });

  await set(ref(db, `alerts/alert-2`), {
    userId: 'patient-5',
    type: 'cardiac',
    status: 'active',
    createdAt: now - 150000, // 2.5 mins ago
  });

  await set(ref(db, `alerts/alert-3`), {
    userId: 'patient-2',
    type: 'parkinson',
    status: 'resolved',
    createdAt: now - 86400000 * 2, // 2 days ago
  });

  console.log('Initial seed complete. Starting live simulation generator...');
  console.log('Press Ctrl+C to stop.');

  // 4. Start Live Simulation
  setInterval(async () => {
    const t = Date.now();
    for (const p of PATIENTS) {
      const jitter = Math.floor(Math.random() * 9) - 4; // -4 to +4
      let currentBpm = p.targetBpm + jitter;
      
      // Randomly spike Robert sometimes
      if (p.id === 'patient-4' && Math.random() > 0.8) {
        currentBpm += 20;
      }

      await push(ref(db, `ecg_readings`), {
        userId: p.id,
        timestamp: t,
        bpm: currentBpm,
        voltage: 1.0 + (Math.random() * 0.3),
        rrIntervals: [800, 810 + jitter]
      });
    }
    process.stdout.write('.'); // indicator
  }, 2000);
}

seed().catch(console.error);
