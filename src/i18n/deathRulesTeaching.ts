export type DeathRulesTeachingSection = {
  title: string;
  bullets: string[];
};

export const deathRulesTeachingCopy = {
  zh: {
    title: '夜间结算与出局说明',
    subtitle: '（与常见桌游流程一致，便于理解本练习局）',
    confirm: '我知道了',
    sections: [
      {
        title: '夜间结算顺序（重点）',
        bullets: [
          '固定顺序：①狼人先统一刀型 → ②女巫再行动（解药仅作用于本夜狼刀目标；毒药在本阶段择定要毒杀的玩家；女巫每夜三选一：仅解药 / 仅毒 / 都不用，不可同夜又救又毒）→ ③预言家验人 → ④天亮后法官统一公布昨夜出局结果。',
          '最后一步「统一结算」：所有人同时在黎明得知谁出局，而不是刀完立刻死人离桌。',
          '双死：若本夜狼刀指向 A，女巫毒指向 B（A、B 为不同人），天亮会同时公布两人出局，这就是常说的「双死」。',
          '若狼刀与毒指向同一人：该玩家视为同时承受狼刀与毒杀（仍按一次出局结算）。',
          '女巫本夜被狼刀：无法自救时解药救不了自己；但若本夜你已选择撒毒，毒药照常带走你的目标——天亮可出现「女巫 + 被毒者」等同夜双死。',
        ],
      },
      {
        title: '出局与遗言',
        bullets: [
          '夜里被狼刀：玩家自己会知道中刀。第一晚（首夜）被刀可以说遗言（最后一次发言）；第二晚及以后被刀不能说话，也没有遗言。',
          '白天被投票放逐：一定有遗言（不论第几天）。',
          '被女巫毒死：视同「夜里死亡」——首夜有毒发可遗言，之后夜里毒死无遗言。',
          '被猎人开枪带走：是否与遗言，与猎人同一时机——猎人白天死则你可遗言；猎人夜里死则你无遗言。',
          '已死亡玩家：遗言结束后全程不能再说话、不能提示、不能做手势。',
        ],
      },
    ],
  },
  en: {
    title: 'Night order & elimination',
    subtitle: '(Common table flow for this trainer)',
    confirm: 'Got it',
    sections: [
      {
        title: 'Night resolution order',
        bullets: [
          'Fixed order: ① Werewolves choose a kill → ② Witch acts (antidote only on tonight’s wolf strike; poison target chosen this phase; each night: antidote only, poison only, or neither—never both) → ③ Seer checks → ④ Dawn: moderator announces all night deaths together.',
          'Deaths are revealed together at dawn—not one-by-one the moment wolves strike.',
          'Double elimination: if wolves targeted A and Witch poisoned B (different players), both are announced at dawn—that’s “double death.”',
          'If wolf kill and poison hit the same player, that player dies once but counts as taking both effects.',
          'If Witch is wolf-struck and cannot self-save: poison already thrown still resolves—you may see Witch + poison victim die the same night.',
        ],
      },
      {
        title: 'Elimination & last words',
        bullets: [
          'Wolf kill at night: you know you were hit. Night 1: you may give last words (one final speech). Night 2+: no speech and no last words.',
          'Exiled by daytime vote: you always get last words (any day).',
          'Witch poison: treated like a night death—last words only if it is still “first night death”; after that, no last words.',
          'Hunter’s shot: same timing as the Hunter—if the Hunter dies in day you may speak; if at night you may not.',
          'After last words: dead players must stay completely silent—no hints or gestures.',
        ],
      },
    ],
  },
} as const;
