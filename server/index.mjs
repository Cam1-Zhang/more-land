/**
 * 轻量房间服：WebSocket，内存房间，供网页/App 真联机「组队开局」大厅同步。
 *
 *   PORT=3847 npm start
 *
 * 客户端在 .env 中设置 EXPO_PUBLIC_ROOM_WS=ws://电脑IP:3847（网页与原生一致）。
 * 生产环境请用 wss:// 并自行做 TLS 与鉴权。
 */
import { WebSocketServer } from 'ws';
import { randomBytes } from 'crypto';
import { createServer } from 'http';

const PORT = Number(process.env.PORT || 3847);
const MINIMAX_API_BASE_URL = (process.env.MINIMAX_API_BASE_URL || 'https://api.minimaxi.com').replace(/\/$/, '');
const MINIMAX_TTS_MODEL = process.env.MINIMAX_TTS_MODEL || 'speech-01-turbo';
const TTS_MAX_TEXT_LENGTH = 500;
const ttsRateByIp = new Map();

function setCors(req, res) {
  const configured = (process.env.TTS_ALLOWED_ORIGIN || '').trim();
  const requestOrigin = req.headers.origin || '';
  const allowedOrigin = configured || requestOrigin || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

function sendJson(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

function allowTtsRequest(req) {
  const ip = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const current = ttsRateByIp.get(ip);
  if (!current || now - current.startedAt >= 60_000) {
    ttsRateByIp.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= 30;
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32_768) throw new Error('body_too_large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

const MINIMAX_EMOTIONS = new Set([
  'happy',
  'sad',
  'angry',
  'fearful',
  'disgusted',
  'surprised',
  'calm',
]);

async function synthesizeMiniMax(input) {
  const apiKey = (process.env.MINIMAX_API_KEY || '').trim();
  const groupId = (process.env.MINIMAX_GROUP_ID || '').trim();
  if (!apiKey) throw new Error('minimax_not_configured');

  const query = groupId ? `?GroupId=${encodeURIComponent(groupId)}` : '';
  const emotion = MINIMAX_EMOTIONS.has(input.emotion) ? input.emotion : 'calm';
  // speech-01-* does not accept emotion (same as Wolfcha / MiniMax docs).
  const supportsEmotion = !/^speech-01/i.test(MINIMAX_TTS_MODEL);
  const voice_setting = {
    voice_id: input.voiceId,
    speed: input.speed,
    vol: 1,
    pitch: input.pitch,
    ...(supportsEmotion ? { emotion } : {}),
  };
  const response = await fetch(`${MINIMAX_API_BASE_URL}/v1/t2a_v2${query}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(groupId ? { GroupId: groupId } : {}),
    },
    body: JSON.stringify({
      model: MINIMAX_TTS_MODEL,
      text: input.text,
      stream: false,
      voice_setting,
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
        channel: 1,
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => null);
  const upstreamCode = payload?.base_resp?.status_code;
  if (!response.ok || (typeof upstreamCode === 'number' && upstreamCode !== 0)) {
    throw new Error(`minimax_${upstreamCode ?? response.status}`);
  }

  const audio = payload?.data?.audio;
  if (typeof audio !== 'string' || !audio) throw new Error('minimax_audio_missing');
  if (/^https?:\/\//i.test(audio)) {
    const audioResponse = await fetch(audio, { signal: AbortSignal.timeout(30_000) });
    if (!audioResponse.ok) throw new Error(`minimax_audio_${audioResponse.status}`);
    const bytes = Buffer.from(await audioResponse.arrayBuffer());
    return bytes.toString('base64');
  }
  if (!/^[0-9a-f]+$/i.test(audio) || audio.length % 2 !== 0) {
    throw new Error('minimax_audio_invalid');
  }
  return Buffer.from(audio, 'hex').toString('base64');
}

const server = createServer(async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true, minimaxConfigured: Boolean(process.env.MINIMAX_API_KEY) });
    return;
  }
  if (req.method !== 'POST' || req.url !== '/tts') {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }
  if (!allowTtsRequest(req)) {
    sendJson(res, 429, { error: 'rate_limited' });
    return;
  }
  try {
    const body = await readJsonBody(req);
    const text = String(body?.text || '').trim().slice(0, TTS_MAX_TEXT_LENGTH);
    const voiceId = String(body?.voiceId || '').trim().slice(0, 100);
    if (!text || !voiceId) {
      sendJson(res, 400, { error: 'missing_text_or_voice' });
      return;
    }
    const audioBase64 = await synthesizeMiniMax({
      text,
      voiceId,
      emotion: String(body?.emotion || 'calm'),
      speed: Math.max(0.5, Math.min(2, Number(body?.speed) || 1)),
      pitch: Math.max(-12, Math.min(12, Math.round(Number(body?.pitch) || 0))),
    });
    sendJson(res, 200, { audioBase64, mimeType: 'audio/mpeg' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'tts_failed';
    console.error('[tts]', message);
    sendJson(res, message === 'minimax_not_configured' ? 503 : 502, { error: message });
  }
});

/** @typedef {{ displayName: string; ready: boolean }} Member */
/** @typedef {{ hostId: string; members: Map<string, Member>; clients: Map<string, import('ws').WebSocket> }} Room */

/** @type {Map<string, Room>} */
const rooms = new Map();

function genRoomCode() {
  for (let k = 0; k < 50; k++) {
    const c = String(100000 + Math.floor(Math.random() * 900000));
    if (!rooms.has(c)) return c;
  }
  return String(100000 + Math.floor(Math.random() * 900000));
}

function genClientId() {
  return randomBytes(10).toString('hex');
}

function send(ws, obj) {
  try {
    ws.send(JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

function roomPayload(room, yourId) {
  const members = [...room.members.entries()].map(([id, m]) => ({
    id,
    displayName: m.displayName,
    ready: m.ready,
  }));
  return {
    type: 'room',
    hostId: room.hostId,
    members,
    yourId,
  };
}

function broadcastRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  for (const [id, ws] of room.clients) {
    send(ws, { ...roomPayload(room, id), code });
  }
}

function leaveRoom(clientId, roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  room.clients.delete(clientId);
  room.members.delete(clientId);
  if (room.hostId === clientId) {
    room.hostId = room.clients.keys().next().value ?? null;
    if (room.hostId) {
      const m = room.members.get(room.hostId);
      if (m) m.ready = false;
    }
  }
  if (room.clients.size === 0) {
    rooms.delete(roomCode);
    return;
  }
  broadcastRoom(roomCode);
}

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const clientId = genClientId();
  /** @type {string | null} */
  let joinedCode = null;

  send(ws, { type: 'hello', clientId });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      send(ws, { type: 'error', message: 'invalid_json' });
      return;
    }
    const type = msg?.type;

    if (type === 'create') {
      const displayName = String(msg.displayName || 'Player').slice(0, 24);
      if (joinedCode) {
        send(ws, { type: 'error', message: 'already_in_room' });
        return;
      }
      const code = genRoomCode();
      /** @type {Room} */
      const room = {
        hostId: clientId,
        members: new Map([[clientId, { displayName, ready: false }]]),
        clients: new Map([[clientId, ws]]),
      };
      rooms.set(code, room);
      joinedCode = code;
      send(ws, { type: 'created', code });
      send(ws, { ...roomPayload(room, clientId), code });
      return;
    }

    if (type === 'join') {
      const code = String(msg.code || '').replace(/\D/g, '').slice(0, 6);
      const displayName = String(msg.displayName || 'Player').slice(0, 24);
      if (!/^\d{6}$/.test(code)) {
        send(ws, { type: 'error', message: 'bad_code' });
        return;
      }
      const room = rooms.get(code);
      if (!room) {
        send(ws, { type: 'error', message: 'room_not_found' });
        return;
      }
      if (joinedCode && joinedCode !== code) {
        send(ws, { type: 'error', message: 'already_in_room' });
        return;
      }
      if (room.clients.has(clientId)) {
        room.members.set(clientId, { displayName, ready: room.members.get(clientId)?.ready ?? false });
      } else {
        room.members.set(clientId, { displayName, ready: false });
        room.clients.set(clientId, ws);
      }
      joinedCode = code;
      send(ws, { type: 'joined', code });
      broadcastRoom(code);
      return;
    }

    if (type === 'ready') {
      if (!joinedCode) return;
      const room = rooms.get(joinedCode);
      if (!room || !room.members.has(clientId)) return;
      const m = room.members.get(clientId);
      if (m) m.ready = Boolean(msg.ready);
      broadcastRoom(joinedCode);
      return;
    }

    if (type === 'sync_settings') {
      if (!joinedCode) return;
      const room = rooms.get(joinedCode);
      if (!room || room.hostId !== clientId) {
        send(ws, { type: 'error', message: 'not_host' });
        return;
      }
      for (const [, cws] of room.clients) {
        send(cws, {
          type: 'settings',
          lockedDifficulty: msg.lockedDifficulty,
          lockBoardWithPreset: msg.lockBoardWithPreset,
        });
      }
      return;
    }

    if (type === 'start') {
      if (!joinedCode) return;
      const room = rooms.get(joinedCode);
      if (!room || room.hostId !== clientId) {
        send(ws, { type: 'error', message: 'not_host' });
        return;
      }
      const members = [...room.members.values()];
      if (room.members.size < 2) {
        send(ws, { type: 'error', message: 'need_two_players' });
        return;
      }
      if (!members.every((x) => x.ready)) {
        send(ws, { type: 'error', message: 'not_all_ready' });
        return;
      }
      const payload = {
        type: 'go_character_select',
        code: joinedCode,
        lockedDifficulty: msg.lockedDifficulty,
        lockBoardWithPreset: msg.lockBoardWithPreset,
      };
      for (const [, cws] of room.clients) {
        send(cws, payload);
      }
      return;
    }

    if (type === 'leave') {
      if (!joinedCode) return;
      const code = joinedCode;
      leaveRoom(clientId, code);
      joinedCode = null;
      send(ws, { type: 'left' });
      return;
    }

    send(ws, { type: 'error', message: 'unknown_type' });
  });

  ws.on('close', () => {
    if (joinedCode) {
      leaveRoom(clientId, joinedCode);
    }
  });
});

// eslint-disable-next-line no-console
server.listen(PORT, () => {
  console.log(`room + MiniMax TTS server listening http://0.0.0.0:${PORT}`);
});
