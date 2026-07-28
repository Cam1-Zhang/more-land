import * as Font from 'expo-font';

let zpixPromise: Promise<void> | null = null;

/** Load Zpix once (~7 MB). Safe to call from hub → game path; no-ops after first resolve. */
export function ensureZpixLoaded(): Promise<void> {
  if (!zpixPromise) {
    zpixPromise = Font.loadAsync({
      Zpix: require('../../assets/fonts/Zpix.ttf'),
    }).catch(() => undefined);
  }
  return zpixPromise;
}
