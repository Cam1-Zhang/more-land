import { Asset } from 'expo-asset';
import { Image, type ImageSourcePropType } from 'react-native';
import { ROLES_POOL_BY_BOARD } from '../constants/boardSetup';
import {
  GAME_ROOM_BACKGROUND_DAY,
  GAME_ROOM_BACKGROUND_NIGHT,
} from '../constants/gameRoomSceneImages';
import {
  GAME_ROOM_NIGHT_CUE_GUARD,
  GAME_ROOM_NIGHT_CUE_SEER,
  GAME_ROOM_NIGHT_CUE_WITCH,
  GAME_ROOM_NIGHT_CUE_WOLVES,
} from '../constants/gameRoomNightRoleCueImages';
import {
  LOYAL_SERVANT_CARD_IMAGES,
  ROLE_CARD_IMAGES,
  type RoleCardImageKey,
} from '../constants/roleCardImages';
import { ROOM_STICKER_PACK } from '../data/roomStickers';
import type { GameBoard } from '../types/game';

const GAME_ROOM_RIGHT_PARCHMENT = require('../../assets/gameRoomRightParchment.jpg');

async function warmImageSource(source: ImageSourcePropType): Promise<void> {
  try {
    if (typeof source === 'number') {
      await Asset.fromModule(source).downloadAsync();
      return;
    }
    const resolve = Image.resolveAssetSource as
      | ((s: ImageSourcePropType) => { uri?: string } | undefined)
      | undefined;
    if (typeof resolve === 'function' && typeof Image.prefetch === 'function') {
      const resolved = resolve(source);
      if (resolved?.uri) {
        await Image.prefetch(resolved.uri);
      }
    }
  } catch {
    /* ignore — best-effort warm */
  }
}

/** Prefetch room art (BG, role cards, night cues, stickers) while still on CharacterSelect. */
export function preloadGameEntryAssets(board: GameBoard): void {
  const roleKeys = [...new Set(ROLES_POOL_BY_BOARD[board])] as RoleCardImageKey[];
  const sources: ImageSourcePropType[] = [
    GAME_ROOM_BACKGROUND_DAY,
    GAME_ROOM_BACKGROUND_NIGHT,
    GAME_ROOM_RIGHT_PARCHMENT,
    ...roleKeys
      .map((key) => ROLE_CARD_IMAGES[key])
      .filter((src): src is ImageSourcePropType => src != null),
    ...ROOM_STICKER_PACK.map((s) => s.source),
  ];
  if (board === 'Avalon10') {
    sources.push(...LOYAL_SERVANT_CARD_IMAGES);
  } else {
    sources.push(
      GAME_ROOM_NIGHT_CUE_GUARD,
      GAME_ROOM_NIGHT_CUE_WOLVES,
      GAME_ROOM_NIGHT_CUE_SEER,
      GAME_ROOM_NIGHT_CUE_WITCH
    );
  }
  void Promise.all(sources.map((src) => warmImageSource(src)));
}
