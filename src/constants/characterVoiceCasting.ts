import { CHARACTERS } from '../data/mockData';
import type { AppLanguage } from '../i18n/appStrings';
import type { AICharacter } from '../types';

/**
 * Gallery / in-game voice casting.
 * Age bands: youth 18–24, youngAdult 25–29, mature 30–54 (elegant), elder 55+.
 * Assignment prefers personality fit, then uniqueness (pitch/speed variants if needed).
 */

export type VoiceAgeBand = 'youth' | 'youngAdult' | 'mature' | 'elder';

export type CharacterVoiceCast = {
  voiceId: string;
  pitch: number;
  speed: number;
};

export function voiceAgeBand(age: number): VoiceAgeBand {
  if (age < 25) return 'youth';
  if (age < 30) return 'youngAdult';
  if (age < 55) return 'mature';
  return 'elder';
}

type VoiceSex = 'F' | 'M';
type VoiceTrait =
  | 'cute'
  | 'soft'
  | 'warm'
  | 'shy'
  | 'bright'
  | 'bold'
  | 'cold'
  | 'logical'
  | 'leader'
  | 'gentle'
  | 'sincere'
  | 'playful'
  | 'seductive'
  | 'stoic'
  | 'authoritative'
  | 'chaotic'
  | 'nervous'
  | 'elder';

function voiceSex(gender: string | undefined): VoiceSex {
  return String(gender || '').toLowerCase().startsWith('f') ? 'F' : 'M';
}

const ZH_POOLS: Record<VoiceAgeBand, Record<VoiceSex, readonly string[]>> = {
  youth: {
    F: [
      'Chinese (Mandarin)_Cute_Spirit',
      'Chinese (Mandarin)_Warm_Girl',
      'Chinese (Mandarin)_Soft_Girl',
      'Chinese (Mandarin)_Crisp_Girl',
      'Chinese (Mandarin)_BashfulGirl',
      'Chinese (Mandarin)_ExplorativeGirl',
      'female-shaonv',
      'Chinese (Mandarin)_Warm_HeartedGirl',
    ],
    M: [
      'Chinese (Mandarin)_Southern_Young_Man',
      'Chinese (Mandarin)_Gentle_Youth',
      'Chinese (Mandarin)_Pure-hearted_Boy',
      'Chinese (Mandarin)_Straightforward_Boy',
      'Chinese (Mandarin)_Unrestrained_Young_Man',
      'male-qn-qingse',
      'male-qn-daxuesheng',
    ],
  },
  youngAdult: {
    F: [
      'Chinese (Mandarin)_IntellectualGirl',
      'Chinese (Mandarin)_Sweet_Lady',
      'Chinese (Mandarin)_Gentle_Senior',
      'Chinese (Mandarin)_Laid_BackGirl',
      'female-tianmei',
      'Chinese (Mandarin)_Soft_Girl',
      'Chinese (Mandarin)_Warm_Girl',
      'female-yujie',
    ],
    M: [
      'male-qn-jingying',
      'male-qn-badao',
      'Chinese (Mandarin)_Stubborn_Friend',
      'Chinese (Mandarin)_Sincere_Adult',
      'Chinese (Mandarin)_Gentle_Youth',
      'Chinese (Mandarin)_Unrestrained_Young_Man',
      'male-qn-daxuesheng',
      'Chinese (Mandarin)_Southern_Young_Man',
    ],
  },
  mature: {
    F: [
      'Chinese (Mandarin)_Mature_Woman',
      'female-yujie',
      'female-chengshu',
      'Chinese (Mandarin)_Wise_Women',
      'Chinese (Mandarin)_IntellectualGirl',
      'Chinese (Mandarin)_Sweet_Lady',
      'Chinese (Mandarin)_Gentle_Senior',
      'Chinese (Mandarin)_News_Anchor',
      'female-tianmei',
      'Chinese (Mandarin)_Warm_Bestie',
      'wumei_yujie',
      'Arrogant_Miss',
    ],
    M: [
      'Chinese (Mandarin)_Reliable_Executive',
      'Chinese (Mandarin)_Gentleman',
      'Chinese (Mandarin)_Male_Announcer',
      'Chinese (Mandarin)_Radio_Host',
      'Chinese (Mandarin)_Sincere_Adult',
      'Chinese (Mandarin)_Stubborn_Friend',
      'male-qn-jingying',
      'male-qn-badao',
      'Chinese (Mandarin)_Lyrical_Voice',
      'Chinese (Mandarin)_Southern_Young_Man',
      'Chinese (Mandarin)_Gentle_Youth',
      'Chinese (Mandarin)_Unrestrained_Young_Man',
      'male-qn-qingse',
      'male-qn-daxuesheng',
      'Chinese (Mandarin)_Straightforward_Boy',
    ],
  },
  elder: {
    F: [
      'Chinese (Mandarin)_Kind-hearted_Auntie',
      'Chinese (Mandarin)_Warm-HeartedAunt',
      'Chinese (Mandarin)_Kind-hearted_Elder',
      'Chinese (Mandarin)_Wise_Women',
    ],
    M: [
      'Chinese (Mandarin)_Humorous_Elder',
      'Chinese (Mandarin)_Gentleman',
      'Chinese (Mandarin)_Radio_Host',
      'Chinese (Mandarin)_Male_Announcer',
    ],
  },
};

const EN_POOLS: Record<VoiceAgeBand, Record<VoiceSex, readonly string[]>> = {
  youth: {
    F: [
      'Sweet_Girl',
      'Lively_Girl',
      'English_PlayfulGirl',
      'English_Whispering_girl',
      'English_LovelyGirl',
      'English_Soft-spokenGirl',
      'English_Kind-heartedGirl',
      'English_WhimsicalGirl',
    ],
    M: [
      'English_DecentYoungMan',
      'English_ReservedYoungMan',
      'English_Gentle-voiced_man',
      'English_Strong-WilledBoy',
      'Friendly_Person',
      'English_SadTeen',
    ],
  },
  youngAdult: {
    F: [
      'English_Graceful_Lady',
      'Charming_Lady',
      'English_ConfidentWoman',
      'English_radiant_girl',
      'English_SereneWoman',
      'English_Upbeat_Woman',
      'English_compelling_lady1',
    ],
    M: [
      'English_Diligent_Man',
      'English_Trustworthy_Man',
      'English_magnetic_voiced_man',
      'English_DecentYoungMan',
      'English_Gentle-voiced_man',
      'English_Debator',
    ],
  },
  mature: {
    F: [
      'English_Graceful_Lady',
      'English_compelling_lady1',
      'English_ConfidentWoman',
      'English_SereneWoman',
      'English_Wiselady',
      'English_captivating_female1',
      'English_AssertiveQueen',
      'English_CalmWoman',
      'English_SentimentalLady',
    ],
    M: [
      'English_Trustworthy_Man',
      'English_Deep-VoicedGentleman',
      'English_magnetic_voiced_man',
      'English_ManWithDeepVoice',
      'English_Steadymentor',
      'English_Debator',
      'English_PatientMan',
      'English_CaptivatingStoryteller',
      'English_Diligent_Man',
      'English_MaturePartner',
      'English_expressive_narrator',
      'English_Aussie_Bloke',
      'English_Jovialman',
    ],
  },
  elder: {
    F: ['English_Wiselady', 'English_SereneWoman', 'English_CalmWoman', 'English_SentimentalLady'],
    M: [
      'English_WiseScholar',
      'English_PatientMan',
      'English_Deep-VoicedGentleman',
      'English_Steadymentor',
      'English_Jovialman',
    ],
  },
};

/** Soft personality → preferred voice cast. Full roster pins freeze unintended reshuffles. */
type VoicePin = string | CharacterVoiceCast;

const ZH_PINS: Record<string, VoicePin> = {
  '1': { voiceId: 'Chinese (Mandarin)_Pure-hearted_Boy', pitch: 1, speed: 0.96 }, // Toby
  '2': { voiceId: 'female-shaonv', pitch: 0, speed: 1 }, // Momo
  '3': { voiceId: 'Chinese (Mandarin)_Unrestrained_Young_Man', pitch: 0, speed: 1.06 }, // Jack
  '4': { voiceId: 'female-tianmei', pitch: 0, speed: 1 }, // Lily
  '5': { voiceId: 'Chinese (Mandarin)_Stubborn_Friend', pitch: 0, speed: 1 }, // Ben
  '6': { voiceId: 'Chinese (Mandarin)_Humorous_Elder', pitch: 0, speed: 1 }, // Frank [asked]
  '7': { voiceId: 'Chinese (Mandarin)_ExplorativeGirl', pitch: 0, speed: 1.06 }, // Daisy
  '8': { voiceId: 'Chinese (Mandarin)_Straightforward_Boy', pitch: 0, speed: 1.06 }, // Sam
  '9': { voiceId: 'Chinese (Mandarin)_Soft_Girl', pitch: 0, speed: 1 }, // Alice
  '10': { voiceId: 'Chinese (Mandarin)_Radio_Host', pitch: 0, speed: 1 }, // Tom
  '11': { voiceId: 'Chinese (Mandarin)_BashfulGirl', pitch: -1, speed: 0.94 }, // Luna
  '12': { voiceId: 'male-qn-qingse', pitch: 1, speed: 0.96 }, // Peter
  '13': { voiceId: 'male-qn-daxuesheng', pitch: 0, speed: 1.06 }, // Zack
  '14': { voiceId: 'Chinese (Mandarin)_IntellectualGirl', pitch: 0, speed: 1 }, // Rose
  '15': { voiceId: 'male-qn-jingying', pitch: -1, speed: 0.94 }, // Devin
  '16': { voiceId: 'female-chengshu', pitch: 0, speed: 1 }, // Sarah
  '17': { voiceId: 'male-qn-badao', pitch: 0, speed: 1 }, // Mike
  '18': { voiceId: 'Chinese (Mandarin)_IntellectualGirl', pitch: 0, speed: 0.94 }, // Chloe
  '19': { voiceId: 'Chinese (Mandarin)_Sincere_Adult', pitch: 0, speed: 0.94 }, // Gary
  '20': { voiceId: 'Chinese (Mandarin)_Gentle_Senior', pitch: 0, speed: 1 }, // Mia
  '21': { voiceId: 'Chinese (Mandarin)_Gentle_Youth', pitch: 0, speed: 1 }, // Leo
  '22': { voiceId: 'Chinese (Mandarin)_IntellectualGirl', pitch: 0, speed: 1.06 }, // Ivy
  '23': { voiceId: 'Chinese (Mandarin)_Humorous_Elder', pitch: 1, speed: 1.06 }, // Hank [asked]
  '24': { voiceId: 'Chinese (Mandarin)_Warm_Bestie', pitch: 0, speed: 1 }, // Jill
  '25': { voiceId: 'Chinese (Mandarin)_Gentleman', pitch: -1, speed: 1 }, // Frost
  '26': { voiceId: 'Chinese (Mandarin)_Lyrical_Voice', pitch: 0, speed: 1 }, // Oscar
  '27': { voiceId: 'Chinese (Mandarin)_Mature_Woman', pitch: 0, speed: 1 }, // Elena
  '28': { voiceId: 'Chinese (Mandarin)_Unrestrained_Young_Man', pitch: 0, speed: 0.9 }, // Mage
  '29': { voiceId: 'Chinese (Mandarin)_Reliable_Executive', pitch: -1, speed: 1 }, // Victor
  '30': { voiceId: 'Chinese (Mandarin)_IntellectualGirl', pitch: -1, speed: 0.94 }, // Sofia
  '31': { voiceId: 'Chinese (Mandarin)_Unrestrained_Young_Man', pitch: 0, speed: 1 }, // Dante
  '32': { voiceId: 'Chinese (Mandarin)_IntellectualGirl', pitch: 0, speed: 1.1 }, // Rita
  '33': { voiceId: 'Chinese (Mandarin)_Unrestrained_Young_Man', pitch: 0, speed: 0.94 }, // Xander
  '34': { voiceId: 'Chinese (Mandarin)_News_Anchor', pitch: 0, speed: 1 }, // Nora
  '35': { voiceId: 'Chinese (Mandarin)_Lyrical_Voice', pitch: 0, speed: 0.94 }, // Julian
  '36': { voiceId: 'Chinese (Mandarin)_IntellectualGirl', pitch: -1, speed: 1 }, // Clara
  '37': { voiceId: 'Chinese (Mandarin)_Humorous_Elder', pitch: -3, speed: 0.9 }, // Prof. Mori [asked]
  '38': { voiceId: 'female-yujie', pitch: -1, speed: 0.94 }, // Widow
  '39': { voiceId: 'Chinese (Mandarin)_Male_Announcer', pitch: -1, speed: 0.94 }, // Kaspar
  '40': { voiceId: 'female-yujie', pitch: -1, speed: 1 }, // Vesper [asked]
  '41': { voiceId: 'Chinese (Mandarin)_Humorous_Elder', pitch: -2, speed: 0.88 }, // Socrates [asked]
  '42': { voiceId: 'Chinese (Mandarin)_IntellectualGirl', pitch: 0, speed: 0.9 }, // Ada
  '43': { voiceId: 'Chinese (Mandarin)_Sincere_Adult', pitch: 0, speed: 1 }, // Ghost [asked]
  '44': { voiceId: 'Chinese (Mandarin)_Reliable_Executive', pitch: 0, speed: 1 }, // Kaiser
  '45': { voiceId: 'Chinese (Mandarin)_Male_Announcer', pitch: 0, speed: 1 }, // Old Fox [asked]
  '46': { voiceId: 'Chinese (Mandarin)_Reliable_Executive', pitch: 0, speed: 0.94 }, // Ambassador
  '47': { voiceId: 'Chinese (Mandarin)_Wise_Women', pitch: 0, speed: 1 }, // Justice
  '48': { voiceId: 'Chinese (Mandarin)_Gentleman', pitch: 0, speed: 1.06 }, // God Eye
};

const EN_PINS: Record<string, VoicePin> = {
  '1': { voiceId: 'English_SadTeen', pitch: 1, speed: 0.96 }, // Toby
  '2': { voiceId: 'English_Soft-spokenGirl', pitch: 0, speed: 1 }, // Momo
  '3': { voiceId: 'English_Strong-WilledBoy', pitch: 0, speed: 1.06 }, // Jack
  '4': { voiceId: 'English_Whispering_girl', pitch: 0, speed: 1 }, // Lily
  '5': { voiceId: 'English_DecentYoungMan', pitch: 0, speed: 1 }, // Ben
  '6': { voiceId: 'English_Deep-VoicedGentleman', pitch: 0, speed: 1 }, // Frank [asked]
  '7': { voiceId: 'English_PlayfulGirl', pitch: 0, speed: 1.06 }, // Daisy
  '8': { voiceId: 'Friendly_Person', pitch: 0, speed: 1.06 }, // Sam
  '9': { voiceId: 'English_CalmWoman', pitch: 0, speed: 0.94 }, // Alice
  '10': { voiceId: 'English_Aussie_Bloke', pitch: 0, speed: 1 }, // Tom
  '11': { voiceId: 'English_SereneWoman', pitch: -1, speed: 0.94 }, // Luna
  '12': { voiceId: 'English_Gentle-voiced_man', pitch: 1, speed: 0.96 }, // Peter
  '13': { voiceId: 'English_Debator', pitch: 0, speed: 1.06 }, // Zack
  '14': { voiceId: 'English_SereneWoman', pitch: 0, speed: 1 }, // Rose
  '15': { voiceId: 'English_ReservedYoungMan', pitch: -1, speed: 0.94 }, // Devin
  '16': { voiceId: 'English_compelling_lady1', pitch: 0, speed: 1 }, // Sarah
  '17': { voiceId: 'English_Steadymentor', pitch: 0, speed: 1 }, // Mike
  '18': { voiceId: 'English_AssertiveQueen', pitch: 0, speed: 1 }, // Chloe
  '19': { voiceId: 'English_MaturePartner', pitch: 0, speed: 1 }, // Gary
  '20': { voiceId: 'English_Kind-heartedGirl', pitch: 0, speed: 1 }, // Mia
  '21': { voiceId: 'English_PatientMan', pitch: 0, speed: 1 }, // Leo
  '22': { voiceId: 'English_CalmWoman', pitch: 0, speed: 1 }, // Ivy
  '23': { voiceId: 'English_Jovialman', pitch: 0, speed: 1 }, // Hank [asked]
  '24': { voiceId: 'English_Upbeat_Woman', pitch: 0, speed: 1 }, // Jill
  '25': { voiceId: 'English_Deep-VoicedGentleman', pitch: -1, speed: 0.94 }, // Frost
  '26': { voiceId: 'English_magnetic_voiced_man', pitch: 0, speed: 0.94 }, // Oscar
  '27': { voiceId: 'English_compelling_lady1', pitch: 0, speed: 0.94 }, // Elena
  '28': { voiceId: 'English_Aussie_Bloke', pitch: 0, speed: 1.06 }, // Mage
  '29': { voiceId: 'English_Trustworthy_Man', pitch: -1, speed: 1 }, // Victor
  '30': { voiceId: 'English_Graceful_Lady', pitch: -1, speed: 0.94 }, // Sofia
  '31': { voiceId: 'English_Jovialman', pitch: 0, speed: 0.94 }, // Dante
  '32': { voiceId: 'English_AssertiveQueen', pitch: 0, speed: 0.94 }, // Rita
  '33': { voiceId: 'English_ManWithDeepVoice', pitch: 0, speed: 1.06 }, // Xander
  '34': { voiceId: 'English_AssertiveQueen', pitch: 0, speed: 0.9 }, // Nora
  '35': { voiceId: 'English_magnetic_voiced_man', pitch: 0, speed: 1 }, // Julian
  '36': { voiceId: 'English_AssertiveQueen', pitch: 0, speed: 1.06 }, // Clara
  '37': { voiceId: 'English_WiseScholar', pitch: -2, speed: 0.9 }, // Prof. Mori [asked]
  '38': { voiceId: 'English_compelling_lady1', pitch: -1, speed: 1 }, // Widow
  '39': { voiceId: 'English_WiseScholar', pitch: -1, speed: 1 }, // Kaspar
  '40': { voiceId: 'English_AssertiveQueen', pitch: -1, speed: 1 }, // Vesper [asked]
  '41': { voiceId: 'English_WiseScholar', pitch: -3, speed: 0.88 }, // Socrates [asked]
  '42': { voiceId: 'English_Wiselady', pitch: 0, speed: 1 }, // Ada
  '43': { voiceId: 'English_Aussie_Bloke', pitch: 0, speed: 0.94 }, // Ghost [asked]
  '44': { voiceId: 'English_Trustworthy_Man', pitch: 0, speed: 1 }, // Kaiser
  '45': { voiceId: 'English_expressive_narrator', pitch: 0, speed: 1 }, // Old Fox [asked]
  '46': { voiceId: 'English_Trustworthy_Man', pitch: 0, speed: 0.94 }, // Ambassador
  '47': { voiceId: 'English_AssertiveQueen', pitch: 0, speed: 1.1 }, // Justice
  '48': { voiceId: 'English_Diligent_Man', pitch: 0, speed: 1 }, // God Eye
};

const VOICE_TRAITS: Record<string, readonly VoiceTrait[]> = {
  // zh female
  'Chinese (Mandarin)_Cute_Spirit': ['cute', 'playful', 'bright'],
  'Chinese (Mandarin)_Warm_Girl': ['warm', 'soft', 'bright'],
  'Chinese (Mandarin)_Soft_Girl': ['soft', 'gentle', 'shy'],
  'Chinese (Mandarin)_Crisp_Girl': ['bright', 'bold'],
  'Chinese (Mandarin)_BashfulGirl': ['shy', 'nervous', 'soft'],
  'Chinese (Mandarin)_ExplorativeGirl': ['bright', 'playful', 'bold'],
  'female-shaonv': ['cute', 'soft', 'warm'],
  'Chinese (Mandarin)_Warm_HeartedGirl': ['warm', 'sincere'],
  'Chinese (Mandarin)_IntellectualGirl': ['logical', 'cold', 'stoic'],
  'Chinese (Mandarin)_Sweet_Lady': ['soft', 'warm', 'seductive'],
  'wumei_yujie': ['seductive', 'authoritative', 'leader'],
  Arrogant_Miss: ['bold', 'authoritative', 'leader', 'cold'],
  'Chinese (Mandarin)_Gentle_Senior': ['gentle', 'warm', 'sincere'],
  'Chinese (Mandarin)_Laid_BackGirl': ['soft', 'playful'],
  'female-tianmei': ['soft', 'cute', 'warm'],
  'Chinese (Mandarin)_Mature_Woman': ['seductive', 'leader', 'bold', 'cold'],
  'female-yujie': ['seductive', 'authoritative', 'cold', 'leader'],
  'female-chengshu': ['authoritative', 'stoic', 'sincere'],
  'Chinese (Mandarin)_Wise_Women': ['logical', 'authoritative', 'stoic'],
  'Chinese (Mandarin)_News_Anchor': ['authoritative', 'logical', 'cold'],
  'Chinese (Mandarin)_Warm_Bestie': ['warm', 'playful', 'bright'],
  'Chinese (Mandarin)_Kind-hearted_Auntie': ['elder', 'warm'],
  'Chinese (Mandarin)_Warm-HeartedAunt': ['elder', 'warm'],
  'Chinese (Mandarin)_Kind-hearted_Elder': ['elder', 'warm', 'gentle'],
  // zh male
  'Chinese (Mandarin)_Southern_Young_Man': ['warm', 'bright', 'playful'],
  'Chinese (Mandarin)_Gentle_Youth': ['gentle', 'soft', 'sincere'],
  'Chinese (Mandarin)_Pure-hearted_Boy': ['sincere', 'shy', 'soft'],
  'Chinese (Mandarin)_Straightforward_Boy': ['bold', 'bright'],
  'Chinese (Mandarin)_Unrestrained_Young_Man': ['bold', 'chaotic', 'playful'],
  'male-qn-qingse': ['shy', 'nervous', 'soft'],
  'male-qn-daxuesheng': ['sincere', 'bright', 'gentle'],
  'male-qn-jingying': ['leader', 'logical', 'authoritative'],
  'male-qn-badao': ['bold', 'leader', 'authoritative'],
  'Chinese (Mandarin)_Stubborn_Friend': ['bold', 'sincere'],
  'Chinese (Mandarin)_Sincere_Adult': ['sincere', 'gentle', 'warm'],
  'Chinese (Mandarin)_Reliable_Executive': ['leader', 'authoritative', 'stoic'],
  'Chinese (Mandarin)_Gentleman': ['gentle', 'sincere', 'stoic'],
  'Chinese (Mandarin)_Male_Announcer': ['authoritative', 'logical'],
  'Chinese (Mandarin)_Radio_Host': ['warm', 'playful', 'bright'],
  'Chinese (Mandarin)_Lyrical_Voice': ['soft', 'seductive', 'gentle'],
  'Chinese (Mandarin)_Humorous_Elder': ['elder', 'playful', 'chaotic'],
  // en (subset used by pools)
  Sweet_Girl: ['cute', 'soft'],
  Lively_Girl: ['bright', 'playful', 'bold'],
  English_PlayfulGirl: ['playful', 'chaotic', 'bright'],
  English_Whispering_girl: ['shy', 'soft', 'seductive'],
  English_LovelyGirl: ['cute', 'warm'],
  'English_Soft-spokenGirl': ['soft', 'shy', 'gentle'],
  'English_Kind-heartedGirl': ['warm', 'sincere'],
  English_WhimsicalGirl: ['playful', 'chaotic'],
  English_DecentYoungMan: ['sincere', 'gentle'],
  English_ReservedYoungMan: ['shy', 'stoic', 'cold'],
  'English_Gentle-voiced_man': ['gentle', 'soft'],
  'English_Strong-WilledBoy': ['bold', 'leader'],
  Friendly_Person: ['warm', 'playful'],
  English_SadTeen: ['nervous', 'shy', 'soft'],
  English_Graceful_Lady: ['seductive', 'authoritative', 'cold'],
  Charming_Lady: ['seductive', 'warm'],
  English_ConfidentWoman: ['leader', 'bold', 'authoritative'],
  English_radiant_girl: ['bright', 'warm'],
  English_SereneWoman: ['soft', 'stoic', 'gentle'],
  English_Upbeat_Woman: ['bright', 'playful'],
  English_compelling_lady1: ['seductive', 'leader'],
  English_Diligent_Man: ['sincere', 'logical'],
  English_Trustworthy_Man: ['sincere', 'leader', 'authoritative'],
  English_magnetic_voiced_man: ['seductive', 'leader'],
  English_Debator: ['logical', 'bold', 'authoritative'],
  English_Wiselady: ['logical', 'authoritative', 'elder'],
  English_captivating_female1: ['seductive', 'warm'],
  English_AssertiveQueen: ['leader', 'authoritative', 'cold'],
  English_CalmWoman: ['stoic', 'soft', 'gentle'],
  English_SentimentalLady: ['soft', 'warm'],
  'English_Deep-VoicedGentleman': ['authoritative', 'stoic', 'gentle'],
  English_ManWithDeepVoice: ['authoritative', 'bold'],
  English_Steadymentor: ['sincere', 'leader', 'gentle'],
  English_PatientMan: ['gentle', 'sincere', 'elder'],
  English_CaptivatingStoryteller: ['warm', 'playful'],
  English_MaturePartner: ['warm', 'seductive'],
  English_expressive_narrator: ['authoritative', 'logical'],
  English_Aussie_Bloke: ['playful', 'bold', 'chaotic'],
  English_Jovialman: ['playful', 'warm', 'elder'],
  English_WiseScholar: ['logical', 'elder', 'stoic'],
};

function personalityDesiredTraits(personality: string): VoiceTrait[] {
  const p = personality.toLowerCase();
  const traits: VoiceTrait[] = [];
  if (/cold|profiler|calculat|stoic|algorithm|logic|analyst|pattern|auditor|mastermind|chess|inquisitor|omniscient|untraceable|detail|information|seeker|intuitive/.test(p)) {
    traits.push('cold', 'logical', 'stoic');
  }
  if (/dictator|commander|leader|domination|vocal|absolute|wall of truth|solid wall|rule-follower|rule follower|executive|diplomat|strict/.test(p)) {
    traits.push('leader', 'authoritative');
  }
  if (/impulsive|loud|aggressive|risk|chaos|joker|joke|chatty|distracted|experimental|searcher/.test(p)) {
    traits.push('bold', 'playful', 'chaotic', 'bright');
  }
  if (/naive|trusting|confused|indecisive|fearful|silent|emotional|stutter|shy|over-detailed|lost|illogical|weird/.test(p)) {
    traits.push('soft', 'shy', 'nervous', 'cute');
  }
  if (/peacekeeper|steady|honest|sincere|kind|guard|peace/.test(p)) {
    traits.push('gentle', 'sincere', 'warm');
  }
  if (/seducer|silver|actor|chameleon|manipulat|rhetorical|charism/.test(p)) {
    traits.push('seductive', 'leader', 'bold');
  }
  if (/stubborn|one-track|defensive/.test(p)) {
    traits.push('bold', 'sincere');
  }
  if (/self-centered|social player|social chameleon/.test(p)) {
    traits.push('bright', 'playful', 'seductive');
  }
  if (/deceiver|fox|poor liar/.test(p)) {
    traits.push('playful', 'chaotic', 'warm');
  }
  if (traits.length === 0) traits.push('sincere', 'gentle');
  return traits;
}

function personalityShape(personality: string): { pitch: number; speed: number } {
  const p = personality.toLowerCase();
  let pitch = 0;
  let speed = 1;
  if (/cold|stoic|calculat|logic|profiler|mastermind|chess/.test(p)) {
    speed -= 0.06;
    pitch -= 1;
  }
  if (/impulsive|loud|chatty|joke|chaos|aggressive/.test(p)) {
    speed += 0.06;
  }
  if (/fearful|silent|stutter|shy|nervous|emotional/.test(p)) {
    pitch += 1;
    speed -= 0.04;
  }
  if (/seducer|charism|dictator|commander/.test(p)) {
    pitch -= 1;
  }
  return {
    pitch: Math.max(-3, Math.min(3, pitch)),
    speed: Math.max(0.9, Math.min(1.1, speed)),
  };
}

function scoreVoiceForPersonality(voiceId: string, personality: string): number {
  const desired = personalityDesiredTraits(personality);
  const have = VOICE_TRAITS[voiceId] || [];
  let score = 0;
  for (const trait of desired) {
    if (have.includes(trait)) score += 3;
  }
  if (desired.includes('cold') || desired.includes('logical') || desired.includes('stoic')) {
    if (have.includes('cute') || have.includes('playful') || have.includes('warm')) score -= 4;
  }
  if (desired.includes('shy') || desired.includes('nervous') || desired.includes('soft')) {
    if (have.includes('authoritative') || have.includes('leader') || have.includes('bold')) score -= 3;
  }
  if (desired.includes('leader') || desired.includes('authoritative')) {
    if (
      have.includes('cute') ||
      have.includes('shy') ||
      have.includes('nervous') ||
      have.includes('playful') ||
      have.includes('warm')
    ) {
      score -= 4;
    }
  }
  if (desired.includes('gentle') || desired.includes('sincere')) {
    if (have.includes('chaotic') || have.includes('bold')) score -= 2;
  }
  if (desired.includes('seductive')) {
    if (have.includes('cute') || have.includes('elder') || have.includes('nervous')) score -= 2;
  }
  return score;
}

const PITCH_VARIANTS = [0, -1, 1, -2, 2, -3, 3];

function castKey(voiceId: string, pitch: number, speed: number): string {
  return `${voiceId}|${pitch}|${speed.toFixed(2)}`;
}

function candidateLayers(
  band: VoiceAgeBand,
  sex: VoiceSex,
  pools: Record<VoiceAgeBand, Record<VoiceSex, readonly string[]>>
): string[][] {
  if (band === 'elder') return [[...pools.elder[sex]]];
  if (band === 'youth') return [[...pools.youth[sex]], [...pools.youngAdult[sex]]];
  if (band === 'youngAdult') {
    return [[...pools.youngAdult[sex]], [...pools.youth[sex]], [...pools.mature[sex]]];
  }
  // mature: never borrow elder; youngAdult ok for elegant leftovers
  return [[...pools.mature[sex]], [...pools.youngAdult[sex]]];
}

function assignUniqueCasts(
  characters: readonly AICharacter[],
  pools: Record<VoiceAgeBand, Record<VoiceSex, readonly string[]>>,
  pins: Record<string, VoicePin>
): Record<string, CharacterVoiceCast> {
  const usedVoiceIds = new Set<string>();
  const usedCastKeys = new Set<string>();
  const out: Record<string, CharacterVoiceCast> = {};

  const tryClaim = (voiceId: string, pitch: number, speed: number): CharacterVoiceCast | null => {
    const key = castKey(voiceId, pitch, speed);
    if (usedCastKeys.has(key)) return null;
    usedCastKeys.add(key);
    usedVoiceIds.add(voiceId);
    return { voiceId, pitch, speed };
  };

  // 1) Hard pins first (exact cast; age-pool check skipped so freeze pins always apply)
  for (const c of characters) {
    const pin = pins[c.id];
    if (!pin) continue;
    const pinned: CharacterVoiceCast =
      typeof pin === 'string'
        ? { voiceId: pin, ...personalityShape(c.personality) }
        : pin;
    const cast =
      tryClaim(pinned.voiceId, pinned.pitch, pinned.speed) ||
      tryClaim(pinned.voiceId, pinned.pitch, 1) ||
      tryClaim(pinned.voiceId, 0, pinned.speed) ||
      tryClaim(pinned.voiceId, 0, 1);
    if (cast) out[c.id] = cast;
  }

  // 2) Score-ranked unique voice ids (most personality-constrained first)
  const pending = characters
    .filter((c) => !out[c.id])
    .map((c) => {
      const layers = candidateLayers(voiceAgeBand(c.age), voiceSex(c.gender), pools);
      const flat = [...new Set(layers.flat())];
      const scores = flat.map((id) => scoreVoiceForPersonality(id, c.personality)).sort((a, b) => b - a);
      const best = scores[0] ?? 0;
      const goodCount = scores.filter((s) => s >= 6).length;
      return { c, layers, flat, best, goodCount };
    })
    .sort((a, b) => {
      // Few good options first (constrained personalities claim their fit)
      if (a.goodCount !== b.goodCount) return a.goodCount - b.goodCount;
      if (b.best !== a.best) return b.best - a.best;
      const order: Record<VoiceAgeBand, number> = { elder: 0, youth: 1, youngAdult: 2, mature: 3 };
      const ba = voiceAgeBand(a.c.age);
      const bb = voiceAgeBand(b.c.age);
      if (order[ba] !== order[bb]) return order[ba] - order[bb];
      return Number(a.c.id) - Number(b.c.id);
    });

  for (const item of pending) {
    const shape = personalityShape(item.c.personality);
    let claimed: CharacterVoiceCast | null = null;

    // Prefer unused voice ids, ranked by personality score then layer (age fit)
    const ranked: { voiceId: string; layer: number; score: number }[] = [];
    item.layers.forEach((layer, layerIdx) => {
      for (const voiceId of layer) {
        if (usedVoiceIds.has(voiceId)) continue;
        ranked.push({
          voiceId,
          layer: layerIdx,
          score: scoreVoiceForPersonality(voiceId, item.c.personality),
        });
      }
    });
    ranked.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.layer !== b.layer) return a.layer - b.layer;
      return a.voiceId.localeCompare(b.voiceId);
    });

    for (const row of ranked) {
      // Never claim a free-but-mismatched voice ahead of a better reused fit.
      if (row.score < 3) continue;
      claimed =
        tryClaim(row.voiceId, shape.pitch, shape.speed) ||
        tryClaim(row.voiceId, 0, 1);
      if (claimed) break;
    }

    // 3) Prefer high-scoring voices even if base id is taken — vary pitch/speed.
    if (!claimed) {
      const reuseRanked = [...item.flat]
        .map((voiceId) => ({
          voiceId,
          score: scoreVoiceForPersonality(voiceId, item.c.personality),
        }))
        .filter((row) => row.score >= 3)
        .sort((a, b) => b.score - a.score || a.voiceId.localeCompare(b.voiceId));

      outer: for (const row of reuseRanked) {
        for (const pitch of [shape.pitch, ...PITCH_VARIANTS]) {
          for (const speed of [shape.speed, 1, 0.94, 1.06, 0.9, 1.1]) {
            const key = castKey(row.voiceId, pitch, speed);
            if (usedCastKeys.has(key)) continue;
            // Allow sharing voiceId across seats via pitch/speed; track cast key only.
            usedCastKeys.add(key);
            claimed = { voiceId: row.voiceId, pitch, speed };
            break outer;
          }
        }
      }
    }

    // 4) Absolute fallback: any remaining cast key in-band
    if (!claimed) {
      const reuseRanked = [...item.flat]
        .map((voiceId) => ({
          voiceId,
          score: scoreVoiceForPersonality(voiceId, item.c.personality),
        }))
        .sort((a, b) => b.score - a.score || a.voiceId.localeCompare(b.voiceId));
      outer: for (const row of reuseRanked) {
        for (const pitch of [shape.pitch, ...PITCH_VARIANTS]) {
          for (const speed of [shape.speed, 1, 0.94, 1.06, 0.9, 1.1]) {
            const key = castKey(row.voiceId, pitch, speed);
            if (usedCastKeys.has(key)) continue;
            usedCastKeys.add(key);
            claimed = { voiceId: row.voiceId, pitch, speed };
            break outer;
          }
        }
      }
    }

    if (claimed) out[item.c.id] = claimed;
  }

  return out;
}

const ZH_CAST_BY_ID = assignUniqueCasts(CHARACTERS, ZH_POOLS, ZH_PINS);
const EN_CAST_BY_ID = assignUniqueCasts(CHARACTERS, EN_POOLS, EN_PINS);

export function getAssignedCharacterVoiceCast(
  characterId: string,
  lang: AppLanguage
): CharacterVoiceCast | undefined {
  return (lang === 'en' ? EN_CAST_BY_ID : ZH_CAST_BY_ID)[characterId];
}

export function getAssignedCharacterVoiceId(
  characterId: string,
  lang: AppLanguage
): string | undefined {
  return getAssignedCharacterVoiceCast(characterId, lang)?.voiceId;
}

export function listCharacterVoiceCasting(lang: AppLanguage): {
  id: string;
  name: string;
  age: number;
  personality: string;
  voiceId: string;
  pitch: number;
  speed: number;
  score: number;
}[] {
  const map = lang === 'en' ? EN_CAST_BY_ID : ZH_CAST_BY_ID;
  return CHARACTERS.map((c) => {
    const cast = map[c.id]!;
    return {
      id: c.id,
      name: c.name,
      age: c.age,
      personality: c.personality,
      voiceId: cast.voiceId,
      pitch: cast.pitch,
      speed: cast.speed,
      score: scoreVoiceForPersonality(cast.voiceId, c.personality),
    };
  });
}
