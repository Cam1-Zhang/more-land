import type { GameBoard } from '../types/game';
import type { AppLanguage } from './appStrings';
import { TUTORIAL_GUIDE_STEPS_STANDARD, tutorialGuideUiStandard } from './tutorialGuideStandard';
import { TUTORIAL_GUIDE_STEPS_WOLF_BEAUTY, tutorialGuideUiWolfBeauty } from './tutorialGuideWolfBeauty';
import {
  TUTORIAL_GUIDE_STEPS_SEER_WITCH_6,
  tutorialGuideUiSeerWitch6,
} from './tutorialGuideSeerWitch6';
import {
  buildTutorialGuideNav,
  tutorialGuideChromeUi,
  type TutorialGuideBoardUi,
  type TutorialGuideNavItem,
  type TutorialGuideStep,
} from './tutorialGuideTypes';

export type { TutorialGuideNavId, TutorialGuideStep } from './tutorialGuideTypes';
export {
  tutorialGuideChromeUi,
  tutorialGuideStepTitle,
  tutorialGuideStepBody,
  tutorialGuideStepBullets,
  tutorialGuideStepNote,
} from './tutorialGuideTypes';

export function getTutorialGuideSteps(board: GameBoard): readonly TutorialGuideStep[] {
  if (board === 'WolfBeauty') return TUTORIAL_GUIDE_STEPS_WOLF_BEAUTY;
  if (board === 'SeerWitch6') return TUTORIAL_GUIDE_STEPS_SEER_WITCH_6;
  return TUTORIAL_GUIDE_STEPS_STANDARD;
}

export function getTutorialGuideNav(board: GameBoard): TutorialGuideNavItem[] {
  return buildTutorialGuideNav(getTutorialGuideSteps(board));
}

export function getTutorialGuideStepCount(board: GameBoard): number {
  return getTutorialGuideSteps(board).length;
}

export function getTutorialGuideUi(board: GameBoard, lang: AppLanguage): TutorialGuideBoardUi {
  const chrome = tutorialGuideChromeUi[lang];
  const headerTitle =
    board === 'WolfBeauty'
      ? tutorialGuideUiWolfBeauty[lang].headerTitle
      : board === 'SeerWitch6'
        ? tutorialGuideUiSeerWitch6[lang].headerTitle
        : tutorialGuideUiStandard[lang].headerTitle;
  return { ...chrome, headerTitle };
}
