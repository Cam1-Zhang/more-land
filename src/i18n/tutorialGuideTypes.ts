import type { AppLanguage } from './appStrings';
import type { RoleCardImageKey } from '../constants/roleCardImages';

export type TutorialGuideNavId =
  | 'goal'
  | 'roles'
  | 'flow'
  | 'night'
  | 'day'
  | 'win'
  | 'tips'
  | 'setup'
  | 'terms';

export type TutorialGuideStep = {
  id: TutorialGuideNavId;
  step: number;
  titleZh: string;
  titleEn: string;
  bodyZh: string;
  bodyEn: string;
  bulletsZh?: readonly string[];
  bulletsEn?: readonly string[];
  noteZh?: string;
  noteEn?: string;
  roleArts?: readonly RoleCardImageKey[];
  showVillageScene?: boolean;
};

export type TutorialGuideNavItem = {
  id: TutorialGuideNavId;
  labelZh: string;
  labelEn: string;
};

export type TutorialGuideChromeUi = {
  skipTutorial: string;
  startNow: string;
  nextPage: string;
  prevPage: string;
  lastPageHint: string;
  chapterOutline: string;
  stepOf: (cur: number, total: number) => string;
};

export type TutorialGuideBoardUi = TutorialGuideChromeUi & {
  headerTitle: string;
};

export function buildTutorialGuideNav(steps: readonly TutorialGuideStep[]): TutorialGuideNavItem[] {
  return steps.map((s) => ({
    id: s.id,
    labelZh: s.titleZh,
    labelEn: s.titleEn,
  }));
}

export function tutorialGuideStepTitle(step: TutorialGuideStep, lang: AppLanguage): string {
  return lang === 'zh' ? step.titleZh : step.titleEn;
}

export function tutorialGuideStepBody(step: TutorialGuideStep, lang: AppLanguage): string {
  return lang === 'zh' ? step.bodyZh : step.bodyEn;
}

export function tutorialGuideStepBullets(step: TutorialGuideStep, lang: AppLanguage): readonly string[] {
  return lang === 'zh' ? step.bulletsZh ?? [] : step.bulletsEn ?? [];
}

export function tutorialGuideStepNote(step: TutorialGuideStep, lang: AppLanguage): string | null {
  const t = lang === 'zh' ? step.noteZh : step.noteEn;
  return t?.trim() ? t : null;
}

export const tutorialGuideChromeUi: Record<AppLanguage, TutorialGuideChromeUi> = {
  zh: {
    skipTutorial: '跳过教程',
    startNow: '立即开始',
    nextPage: '下一页',
    prevPage: '上一页',
    lastPageHint: '已看完教程，可立即开始选角练习',
    chapterOutline: '目录',
    stepOf: (cur, total) => `第 ${cur} / ${total} 页`,
  },
  en: {
    skipTutorial: 'Skip tutorial',
    startNow: 'Start now',
    nextPage: 'Next',
    prevPage: 'Previous',
    lastPageHint: 'Tutorial complete — start character select',
    chapterOutline: 'Contents',
    stepOf: (cur, total) => `Page ${cur} / ${total}`,
  },
};
