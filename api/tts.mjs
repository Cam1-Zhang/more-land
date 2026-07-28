const MAX_TEXT_LENGTH = 500;
const EMOTIONS = new Set([
  'happy',
  'sad',
  'angry',
  'fearful',
  'disgusted',
  'surprised',
  'calm',
]);

function applyCors(req, res) {
  const configured = (process.env.TTS_ALLOWED_ORIGIN || '').trim();
  const requestOrigin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', configured || requestOrigin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Vary', 'Origin');
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32_768) throw new Error('body_too_large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function synthesize(input) {
  const apiKey = (process.env.MINIMAX_API_KEY || '').trim();
  if (!apiKey) throw new Error('minimax_not_configured');

  const baseUrl = (process.env.MINIMAX_API_BASE_URL || 'https://api.minimaxi.com').replace(/\/$/, '');
  // Match Wolfcha default: speech-01-turbo (stable rhythm; speech-01 has no emotion).
  const model = process.env.MINIMAX_TTS_MODEL || 'speech-01-turbo';
  const groupId = (process.env.MINIMAX_GROUP_ID || '').trim();
  const query = groupId ? `?GroupId=${encodeURIComponent(groupId)}` : '';
  const supportsEmotion = !/^speech-01/i.test(model);
  const voice_setting = {
    voice_id: input.voiceId,
    speed: input.speed,
    vol: 1,
    pitch: input.pitch,
    ...(supportsEmotion ? { emotion: input.emotion } : {}),
  };
  const response = await fetch(`${baseUrl}/v1/t2a_v2${query}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(groupId ? { GroupId: groupId } : {}),
    },
    body: JSON.stringify({
      model,
      text: input.text,
      stream: false,
      output_format: 'hex',
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
    return Buffer.from(await audioResponse.arrayBuffer()).toString('base64');
  }
  if (!/^[0-9a-f]+$/i.test(audio) || audio.length % 2 !== 0) {
    throw new Error('minimax_audio_invalid');
  }
  return Buffer.from(audio, 'hex').toString('base64');
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const body = await readBody(req);
    const text = String(body?.text || '').trim().slice(0, MAX_TEXT_LENGTH);
    const voiceId = String(body?.voiceId || '').trim().slice(0, 100);
    if (!text || !voiceId) return res.status(400).json({ error: 'missing_text_or_voice' });

    const emotionInput = String(body?.emotion || 'calm');
    const audioBase64 = await synthesize({
      text,
      voiceId,
      emotion: EMOTIONS.has(emotionInput) ? emotionInput : 'calm',
      speed: Math.max(0.5, Math.min(2, Number(body?.speed) || 1)),
      pitch: Math.max(-12, Math.min(12, Math.round(Number(body?.pitch) || 0))),
    });
    return res.status(200).json({ audioBase64, mimeType: 'audio/mpeg' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'tts_failed';
    console.error('[tts]', message);
    return res.status(message === 'minimax_not_configured' ? 503 : 502).json({ error: message });
  }
}
