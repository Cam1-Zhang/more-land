import type { AppLanguage } from '../i18n/appStrings';
import { gameCopy } from '../i18n/appStrings';
import type { RoomPlayer, PlayerOutReason } from './nightResolver';

export type WolfBeautyMartyrResult = {
  players: RoomPlayer[];
  martyr: RoomPlayer | null;
};

/** Wolf Beauty died — charmed player follows (exile / hunter / knight / poison). */
export function applyWolfBeautyMartyr(
  players: readonly RoomPlayer[],
  deadWolfBeautyId: string
): WolfBeautyMartyrResult {
  const wb = players.find((p) => p.id === deadWolfBeautyId);
  if (!wb || wb.role !== 'WolfBeauty') {
    return { players: [...players], martyr: null };
  }
  const martyr = players.find((p) => p.isAlive && p.charmedByWolfBeautyId === deadWolfBeautyId);
  if (!martyr) {
    return { players: [...players], martyr: null };
  }
  const next = players.map((p) =>
    p.id === martyr.id
      ? {
          ...p,
          isAlive: false,
          outReason: 'wolf_beauty_charm' as PlayerOutReason,
          cannotUseHunterGun: true,
          charmedByWolfBeautyId: undefined,
        }
      : p
  );
  return { players: next, martyr: next.find((p) => p.id === martyr.id && !p.isAlive) ?? null };
}

export function wolfBeautyMartyrLog(martyrName: string, lang: AppLanguage): string {
  return gameCopy[lang].wolfBeautyMartyr(martyrName);
}
