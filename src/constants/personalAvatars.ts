export const PERSONAL_AVATARS = [
  { id: 'male-alt', bodyType: 'male', style: '亚比风', styleEn: 'Alternative', detail: '日系叠穿 · 狼尾碎发', detailEn: 'Japanese layers · wolf cut', column: 0 },
  { id: 'male-cute', bodyType: 'male', style: '可爱风', styleEn: 'Cute', detail: '奶油针织 · 柔软暖色', detailEn: 'Cream knitwear · warm tones', column: 1 },
  { id: 'male-normal', bodyType: 'male', style: '正常风', styleEn: 'Everyday', detail: '韩系西装 · 中分短发', detailEn: 'Korean tailoring · curtain hair', column: 2 },
  { id: 'female-alt', bodyType: 'female', style: '亚比风', styleEn: 'Alternative', detail: '日系水手领 · 姬发银饰', detailEn: 'Japanese sailor collar · hime cut', column: 3 },
  { id: 'female-cute', bodyType: 'female', style: '可爱风', styleEn: 'Cute', detail: '低双马尾 · 白色连衣裙', detailEn: 'Low twin ponytails · white dress', column: 4 },
  { id: 'female-normal', bodyType: 'female', style: '正常风', styleEn: 'Everyday', detail: '韩系针织 · 百褶长裙', detailEn: 'Korean knitwear · pleated skirt', column: 5 },
] as const;
export type PersonalAvatarId = typeof PERSONAL_AVATARS[number]['id'];
export function getPersonalAvatar(value: { presetId?: string; bodyType?: string }) {
  return PERSONAL_AVATARS.find(avatar => avatar.id === value.presetId)
    ?? PERSONAL_AVATARS[value.bodyType === 'female' ? 5 : 2];
}

export const PERSONAL_AVATAR_SEATED_ROWS = { down: 1, left: 2, right: 3, up: 4 } as const;
