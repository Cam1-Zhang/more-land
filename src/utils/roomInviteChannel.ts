/**
 * 组队房间号渠道：
 * - 房主：地址栏同步 `?room=六位数字`（便于复制当前页链接）。
 * - 邀请好友：`?room=…&join=1`，打开后自动填入房间号并弹出「加入」弹层。
 * 真联机仍需服务端；此处只做 URL / 剪贴板约定。
 */
export const ROOM_QUERY_PARAM = 'room';
export const JOIN_QUERY_PARAM = 'join';
export const JOIN_QUERY_VALUE = '1';

export function normalizeRoomCodeParam(raw: string | null | undefined): string | null {
  const d = String(raw ?? '')
    .replace(/\D/g, '')
    .slice(0, 6);
  return d.length === 6 ? d : null;
}

export function readRoomFromCurrentWebUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const q = new URLSearchParams(window.location.search).get(ROOM_QUERY_PARAM);
    return normalizeRoomCodeParam(q);
  } catch {
    return null;
  }
}

export function readJoinIntentFromWebUrl(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get(JOIN_QUERY_PARAM) === JOIN_QUERY_VALUE;
  } catch {
    return false;
  }
}

/** 重新打开网页时清掉房主大厅残留的 room 参数；邀请链接 join=1 仍保留给加入流程。 */
export function clearHostRoomQueryOnWeb(): void {
  if (typeof window === 'undefined' || typeof window.history?.replaceState !== 'function') return;
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get(JOIN_QUERY_PARAM) === JOIN_QUERY_VALUE) return;
    if (!u.searchParams.has(ROOM_QUERY_PARAM)) return;
    u.searchParams.delete(ROOM_QUERY_PARAM);
    const qs = u.searchParams.toString();
    window.history.replaceState({}, '', `${u.pathname}${qs ? `?${qs}` : ''}${u.hash}`);
  } catch {
    /* noop */
  }
}

/** 房主：只写入房间号，去掉 join，避免误弹加入层 */
export function setHostRoomQueryOnWeb(roomCode: string): void {
  if (typeof window === 'undefined' || typeof window.history?.replaceState !== 'function') return;
  const digits = normalizeRoomCodeParam(roomCode);
  if (!digits) return;
  try {
    const u = new URL(window.location.href);
    u.searchParams.set(ROOM_QUERY_PARAM, digits);
    u.searchParams.delete(JOIN_QUERY_PARAM);
    const qs = u.searchParams.toString();
    window.history.replaceState({}, '', `${u.pathname}${qs ? `?${qs}` : ''}${u.hash}`);
  } catch {
    /* noop */
  }
}

/**
 * 完整邀请链接。`openJoinModal` 为 true 时带 `join=1`，用于复制/分享。
 */
export function buildTeamLobbyInviteUrl(
  roomCode: string,
  opts?: { openJoinModal?: boolean }
): string {
  const digits = normalizeRoomCodeParam(roomCode);
  if (!digits) return '';
  const openJoin = opts?.openJoinModal === true;
  if (typeof window !== 'undefined' && window.location?.href) {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set(ROOM_QUERY_PARAM, digits);
      if (openJoin) u.searchParams.set(JOIN_QUERY_PARAM, JOIN_QUERY_VALUE);
      else u.searchParams.delete(JOIN_QUERY_PARAM);
      const qs = u.searchParams.toString();
      return `${u.origin}${u.pathname}${qs ? `?${qs}` : ''}${u.hash}`;
    } catch {
      return '';
    }
  }
  return '';
}
