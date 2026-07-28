import { CommonActions } from '@react-navigation/native';
import { Alert, Platform } from 'react-native';
import type { AppLanguage } from '../i18n/appStrings';
import { navExitCopy } from '../i18n/appStrings';

export function exitToHome(navigation: { dispatch: (a: unknown) => void }) {
  navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
}

export function promptExitGameWithConfirm(
  navigation: { dispatch: (a: unknown) => void },
  lang: AppLanguage,
  allowExitRef: { current: boolean },
  onConfirm?: () => void
) {
  const t = navExitCopy[lang];
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
    const ok = window.confirm(`${t.leaveGameTitle}\n\n${t.leaveGameBody}`);
    if (ok) {
      allowExitRef.current = true;
      onConfirm?.();
      exitToHome(navigation);
    }
    return;
  }
  Alert.alert(t.leaveGameTitle, t.leaveGameBody, [
    { text: t.cancel, style: 'cancel' },
    {
      text: t.confirm,
      style: 'destructive',
      onPress: () => {
        allowExitRef.current = true;
        onConfirm?.();
        exitToHome(navigation);
      },
    },
  ]);
}

export function promptExitTutorialWithConfirm(
  navigation: { dispatch: (a: unknown) => void },
  lang: AppLanguage,
  allowExitRef: { current: boolean }
) {
  const t = navExitCopy[lang];
  Alert.alert(t.leaveTutorialTitle, t.leaveTutorialBody, [
    { text: t.cancel, style: 'cancel' },
    {
      text: t.confirm,
      style: 'destructive',
      onPress: () => {
        allowExitRef.current = true;
        exitToHome(navigation);
      },
    },
  ]);
}
