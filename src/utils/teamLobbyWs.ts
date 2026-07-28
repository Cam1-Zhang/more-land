import type { DifficultyType } from '../types';
import type { GameBoard } from '../types/game';

export type LobbyMember = { id: string; displayName: string; ready: boolean };

export type LobbyRoomPayload = {
  code: string;
  hostId: string;
  members: LobbyMember[];
  yourId: string;
};

export type LobbyWsHandlers = {
  onHello?: (clientId: string) => void;
  onCreated?: (code: string) => void;
  onJoined?: (code: string) => void;
  onRoom?: (p: LobbyRoomPayload) => void;
  onSettings?: (p: { lockedDifficulty: DifficultyType; lockBoardWithPreset: GameBoard }) => void;
  onGoCharacterSelect?: (p: {
    code: string;
    lockedDifficulty: DifficultyType;
    lockBoardWithPreset: GameBoard;
  }) => void;
  onError?: (message: string) => void;
  onLeft?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
};

const DIFFS: DifficultyType[] = ['Novice', 'Easy', 'Medium', 'Hard'];
const BOARDS: GameBoard[] = ['Standard12', 'WolfBeauty', 'SeerWitch6'];

function parseMembers(raw: unknown): LobbyMember[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
    .map((x) => ({
      id: String(x.id ?? ''),
      displayName: String(x.displayName ?? ''),
      ready: Boolean(x.ready),
    }))
    .filter((m) => m.id.length > 0);
}

function coerceDifficulty(v: unknown): DifficultyType {
  const s = String(v ?? '');
  return DIFFS.includes(s as DifficultyType) ? (s as DifficultyType) : 'Easy';
}

function coerceBoard(v: unknown): GameBoard {
  const s = String(v ?? '');
  return BOARDS.includes(s as GameBoard) ? (s as GameBoard) : 'Standard12';
}

export function getTeamLobbyWsUrl(): string | undefined {
  const v = process.env.EXPO_PUBLIC_ROOM_WS;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

export type TeamLobbyConnection = {
  send: (msg: Record<string, unknown>) => void;
  close: () => void;
};

export function createTeamLobbyConnection(url: string, handlers: LobbyWsHandlers): TeamLobbyConnection {
  const ws = new WebSocket(url);
  const queue: Record<string, unknown>[] = [];

  const flush = () => {
    while (queue.length > 0 && ws.readyState === WebSocket.OPEN) {
      const next = queue.shift();
      if (next) ws.send(JSON.stringify(next));
    }
  };

  ws.onopen = () => {
    flush();
    handlers.onOpen?.();
  };

  ws.onclose = () => {
    handlers.onClose?.();
  };

  ws.onerror = () => {
    handlers.onError?.('socket_error');
  };

  ws.onmessage = (ev) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
    } catch {
      handlers.onError?.('invalid_json');
      return;
    }
    const type = msg.type;
    if (type === 'hello') {
      handlers.onHello?.(String(msg.clientId ?? ''));
      return;
    }
    if (type === 'created') {
      handlers.onCreated?.(String(msg.code ?? ''));
      return;
    }
    if (type === 'joined') {
      handlers.onJoined?.(String(msg.code ?? ''));
      return;
    }
    if (type === 'room') {
      handlers.onRoom?.({
        code: String(msg.code ?? ''),
        hostId: String(msg.hostId ?? ''),
        members: parseMembers(msg.members),
        yourId: String(msg.yourId ?? ''),
      });
      return;
    }
    if (type === 'settings') {
      handlers.onSettings?.({
        lockedDifficulty: coerceDifficulty(msg.lockedDifficulty),
        lockBoardWithPreset: coerceBoard(msg.lockBoardWithPreset),
      });
      return;
    }
    if (type === 'go_character_select') {
      handlers.onGoCharacterSelect?.({
        code: String(msg.code ?? ''),
        lockedDifficulty: coerceDifficulty(msg.lockedDifficulty),
        lockBoardWithPreset: coerceBoard(msg.lockBoardWithPreset),
      });
      return;
    }
    if (type === 'error') {
      handlers.onError?.(String(msg.message ?? 'error'));
      return;
    }
    if (type === 'left') {
      handlers.onLeft?.();
      return;
    }
  };

  return {
    send(msg: Record<string, unknown>) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      } else {
        queue.push(msg);
      }
    },
    close() {
      queue.length = 0;
      ws.close();
    },
  };
}
