import type { AppLanguage } from '../../i18n/appStrings';
import { gameCopy } from '../../i18n/appStrings';
import type { RoomPlayer } from '../../utils/nightResolver';
import type { NightDeathCause } from '../../utils/nightResolver';
import { applyWolfBeautyMartyr } from '../../utils/wolfBeautyMartyr';

export type WolfBeautyNightLog = { line: string };

export type WolfBeautyNightAftermath = {
  players: RoomPlayer[];
  logs: WolfBeautyNightLog[];
};

/**
 * After standard night resolve: wolf-kill on WB breaks charm; poison triggers martyr.
 * (wolfcha WOLF_BEAUTY_FOLLOW at night resolve)
 */
export function applyWolfBeautyNightAftermath(
  players: readonly RoomPlayer[],
  diedTonight: readonly RoomPlayer[],
  deathCauseById: ReadonlyMap<string, NightDeathCause>,
  lang: AppLanguage
): WolfBeautyNightAftermath {
  const t = gameCopy[lang];
  let next = [...players];
  const logs: WolfBeautyNightLog[] = [];

  for (const d of diedTonight) {
    if (d.role !== 'WolfBeauty') continue;
    const cause = deathCauseById.get(d.id);
    if (cause === 'wolf' || cause === 'both') {
      next = next.map((p) =>
        p.charmedByWolfBeautyId === d.id ? { ...p, charmedByWolfBeautyId: undefined } : p
      );
      logs.push({ line: t.wolfBeautyCharmBroken });
    } else if (cause === 'poison') {
      const martyr = applyWolfBeautyMartyr(next, d.id);
      next = martyr.players;
      if (martyr.martyr) logs.push({ line: t.wolfBeautyMartyr(martyr.martyr.name) });
    }
  }

  return { players: next, logs };
}

export function deathDetailsToCauseMap(
  details: readonly { id: string; cause: NightDeathCause }[]
): Map<string, NightDeathCause> {
  return new Map(details.map((d) => [d.id, d.cause]));
}
