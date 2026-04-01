const DB_URL = 'https://guardian-pulse-1360c-default-rtdb.asia-southeast1.firebasedatabase.app';
const API_KEY = 'AIzaSyBR6YEX8I_nIXkxOm33e9ij0Y-jQDgT1xc';

export async function dbPush(path, data, env) {
  try {
    const res = await fetch(`${DB_URL}/${path}.json?auth=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(result));
    return { success: true, id: result.name };
  } catch (err) {
    console.error(`[firebase] dbPush error on ${path}:`, err.message);
    throw err;
  }
}

export async function dbSet(path, data, env) {
  try {
    const res = await fetch(`${DB_URL}/${path}.json?auth=${API_KEY}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(result));
    return { success: true };
  } catch (err) {
    console.error(`[firebase] dbSet error on ${path}:`, err.message);
    throw err;
  }
}

export async function dbGet(path, env) {
  try {
    const res = await fetch(`${DB_URL}/${path}.json?auth=${API_KEY}`);
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  } catch (err) {
    console.error(`[firebase] dbGet error on ${path}:`, err.message);
    throw err;
  }
}

export async function dbQuery(path, orderByField, valueOrLimit, limitOrEnv, maybeEnv) {
  try {
    // Support both 4-arg (path, orderBy, limit, env) and 5-arg (path, orderBy, equalTo, limit, env)
    let equalToValue, limitLast, env;
    if (maybeEnv) { // 5 args
      equalToValue = valueOrLimit;
      limitLast = limitOrEnv;
      env = maybeEnv;
    } else { // 4 args
      limitLast = valueOrLimit;
      env = limitOrEnv;
    }

    const url = new URL(`${DB_URL}/${path}.json`);
    url.searchParams.append('auth', API_KEY);
    url.searchParams.append('orderBy', `"${orderByField}"`);
    if (equalToValue !== undefined) {
      url.searchParams.append('equalTo', `"${equalToValue}"`);
    }
    url.searchParams.append('limitToLast', String(limitLast));

    const res = await fetch(url.toString());
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    
    if (!data) return [];
    
    return Object.keys(data).map(key => ({
      ...data[key],
      id: key
    }));
  } catch (err) {
    console.error(`[firebase] dbQuery error on ${path}:`, err.message);
    throw err;
  }
}

export async function dbUpdate(path, data, env) {
  try {
    const res = await fetch(`${DB_URL}/${path}.json?auth=${API_KEY}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(result));
    return { success: true };
  } catch (err) {
    console.error(`[firebase] dbUpdate error on ${path}:`, err.message);
    throw err;
  }
}

export async function sendFCM(fcmToken, title, body, data, env) {
  try {
    const serverKey = env.FIREBASE_SERVER_KEY;
    if (!serverKey) throw new Error("Missing FIREBASE_SERVER_KEY in env");

    const payload = {
      to: fcmToken,
      notification: { title, body },
      data: data || {}
    };

    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${serverKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`FCM Send Error: ${res.status} ${errText}`);
    }
    
    const result = await res.json();
    console.log('[firebase] FCM sent successfully:', result);
    return true;
  } catch (err) {
    console.error('[firebase] sendFCM error:', err.message);
    return false;
  }
}
