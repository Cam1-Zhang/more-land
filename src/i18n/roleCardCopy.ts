import type { AppLanguage } from './appStrings';

export const roleCardUi = {
  zh: {
    title: '你的身份',
    secret: '请勿向他人展示本卡',
    privateIntel: '你的私密情报',
    confirm: '我已记住身份',
  },
  en: {
    title: 'Your role',
    secret: 'Do not show this card to others',
    privateIntel: 'Your private intel',
    confirm: 'I understand',
  },
} as const;

/** 开局身份卡徽章内纯文字（无 emoji，左侧单独放 roleEmoji） */
export const roleIdentityBadgeName: Record<AppLanguage, Record<string, string>> = {
  zh: {
    Werewolf: '狼人',
    Seer: '预言家',
    Witch: '女巫',
    Hunter: '猎人',
    Idiot: '白痴',
    Villager: '平民',
    WolfBeauty: '狼美人',
    Guard: '守卫',
    Knight: '骑士',
    Merlin: '梅林',
    Percival: '派西维尔',
    LoyalServant: '忠臣',
    Assassin: '刺客',
    Morgana: '莫甘娜',
    Mordred: '莫德雷德',
    Oberon: '奥伯伦',
    Random: '随机身份',
  },
  en: {
    Werewolf: 'Werewolf',
    Seer: 'Seer',
    Witch: 'Witch',
    Hunter: 'Hunter',
    Idiot: 'Idiot',
    Villager: 'Villager',
    WolfBeauty: 'Wolf Beauty',
    Guard: 'Guard',
    Knight: 'Knight',
    Merlin: 'Merlin',
    Percival: 'Percival',
    LoyalServant: 'Loyal Servant',
    Assassin: 'Assassin',
    Morgana: 'Morgana',
    Mordred: 'Mordred',
    Oberon: 'Oberon',
    Random: 'Random role',
  },
};

/** 标准板身份展示名 + 能力小字（与对局 role 字符串一致） */
export const roleIdentityTitles: Record<AppLanguage, Record<string, string>> = {
  zh: {
    Werewolf: '🐺 狼人',
    Seer: '🔮 预言家',
    Witch: '🧙‍♀️ 女巫',
    Hunter: '🔫 猎人',
    Idiot: '🤪 白痴',
    Villager: '🧑‍🌾 平民',
    WolfBeauty: '💋🐺 狼美人',
    Guard: '🛡️ 守卫',
    Knight: '⚔️ 骑士',
    Merlin: '🧙‍♂️ 梅林',
    Percival: '⚔️ 派西维尔',
    LoyalServant: '🏰 忠臣',
    Assassin: '🗡️ 刺客',
    Morgana: '🧙‍♀️ 莫甘娜',
    Mordred: '👑 莫德雷德',
    Oberon: '🌘 奥伯伦',
    Random: '随机身份',
  },
  en: {
    Werewolf: '🐺 Werewolf',
    Seer: '🔮 Seer',
    Witch: '🧙‍♀️ Witch',
    Hunter: '🔫 Hunter',
    Idiot: '🤪 Idiot',
    Villager: '🧑‍🌾 Villager',
    WolfBeauty: '💋🐺 Wolf Beauty',
    Guard: '🛡️ Guard',
    Knight: '⚔️ Knight',
    Merlin: '🧙‍♂️ Merlin',
    Percival: '⚔️ Percival',
    LoyalServant: '🏰 Loyal Servant',
    Assassin: '🗡️ Assassin',
    Morgana: '🧙‍♀️ Morgana',
    Mordred: '👑 Mordred',
    Oberon: '🌘 Oberon',
    Random: 'Random role',
  },
};

export const roleIdentityBodies: Record<AppLanguage, Record<string, string>> = {
  zh: {
    Werewolf:
      '每个夜晚，你与狼队同伴共同睁眼，选择击杀一名玩家。白天，你必须隐藏身份，用谎言和表演融入人群。猎杀所有人，或骗过所有人——这是你唯一的选择。',
    Seer:
      '每个夜晚，你可以查验一名玩家的身份——是好人还是狼人。你的判断是好人阵营最锋利的武器，但也是最危险的靶子。请谨慎选择何时亮明身份。',
    Witch:
      '你拥有一瓶解药与一瓶毒药，整局各限使用一次。每晚只能三选一：① 只用解药——救本夜被狼刀的那名玩家；② 只用毒药——毒杀场上任意一名玩家；③ 两瓶都不用。同一晚不可又救人又开毒。',
    Hunter:
      '当你死亡时（被投票放逐或被狼人击杀），你可以开枪带走场上任意一名玩家。注意：若你被女巫毒杀，则无法开枪——毒药夺走了你扣动扳机的力气。',
    Idiot:
      '若你在白天被投票放逐，可翻牌亮明身份，免于死亡——但你将永久失去投票权。你仍可正常发言参与讨论，只是你的票再也无法改变任何事情。',
    Villager:
      '你没有特殊能力，但你拥有最强大的武器——你的发言、逻辑与投票。不要低估自己的力量，好人阵营的胜利，从来都离不开每一个普通人的判断与勇气。',
    WolfBeauty:
      '你是狼人阵营中最危险的存在。每个夜晚，除与狼队共同击杀外，你可额外魅惑一名好人。若你被投票放逐、被猎人带走、被骑士决斗或女巫毒杀，最后一名被魅惑的玩家将随你一同殉情。若你被狼人刀杀，魅惑不触发。你不可魅惑其他狼人。',
    Knight:
      '白天讨论结束后、投票开始前，你可选择一名玩家决斗（整局仅一次）。若对方是狼人，其立即出局；若对方是好人，你立即出局。请谨慎使用这唯一的机会。',
    Guard:
      '每个夜晚，你可以暗中守护一名玩家，使其免受狼人袭击。但你不可连续两晚守护同一个人。若你守护的玩家恰好被女巫解药救治，则救人无效——过度的保护反而成了致命的冲突。',
    Merlin:
      '你是好人阵营的梅林。游戏开始时，你能看到除莫德雷德外的所有坏人，但不知道他们的具体身份。引导好人完成任务，同时隐藏自己：若刺客最后认出你，坏人仍可反转获胜。',
    Percival:
      '你是好人阵营的派西维尔。游戏开始时，你会看到梅林与莫甘娜，但无法分辨两人各自的身份。读懂他们的引导，保护真正的梅林，别让莫甘娜迷惑圆桌。',
    LoyalServant:
      '你是亚瑟的忠臣，属于好人阵营，没有额外能力与开局情报。通过发言、组队与投票找出坏人，保护梅林，帮助好人成功完成三次任务。',
    Assassin:
      '你是坏人阵营的刺客。与同伴混入任务并使其失败。若好人率先完成三次任务，你将获得最后一次机会：指认梅林，若命中则坏人立即获胜。',
    Morgana:
      '你是坏人阵营的莫甘娜。派西维尔开局会同时看到你和梅林，却无法分辨真假。伪装成梅林误导好人，帮助坏人破坏三次任务。',
    Mordred:
      '你是坏人阵营的莫德雷德。梅林在开局无法看到你，这使你能更安全地潜伏在好人中。利用这层隐蔽破坏任务，也要避免因过度安全而暴露。',
    Oberon:
      '你是坏人阵营的奥伯伦。你不知道其他坏人是谁，其他坏人也看不到你；但梅林仍能看到你。在没有队友指引的情况下识别同伴，并伺机使任务失败。',
    Random: '本局由系统随机分配的具体身份，请以卡面标题为准。',
  },
  en: {
    Werewolf:
      'Each night you open your eyes with the wolf pack and choose a kill. By day you must hide, lie, and blend in. Kill everyone—or fool everyone. That is your only path.',
    Seer:
      'Each night you may inspect one player: good or wolf. Your reads are town’s sharpest weapon—and the most dangerous target on your back. Choose carefully when to reveal.',
    Witch:
      'You hold one antidote and one poison—each once per game. Each night pick exactly one: ① antidote only—save tonight’s wolf strike target; ② poison only—kill any one player; ③ neither. You cannot save and poison the same night.',
    Hunter:
      'When you die (exiled by vote or killed by wolves), you may shoot any living player. If you die to the witch’s poison, you cannot shoot—the poison takes your trigger finger.',
    Idiot:
      'If you are exiled by day vote, you may reveal to survive that exile—but you permanently lose your vote. You may still speak; your ballot can no longer change anything.',
    Villager:
      'You have no special power—but you have the strongest tools: speech, logic, and your vote. Never underestimate yourself; town wins on ordinary people’s judgment and courage.',
    WolfBeauty:
      'You are the wolf team’s deadliest piece. Besides the pack kill, you may charm one good player each night. If you are exiled, shot by the Hunter, dueled by the Knight, or poisoned by the Witch, your last charm target dies with you. Wolf kills do not trigger the follow death. You cannot charm other wolves.',
    Knight:
      'After discussion and before the exile vote, you may duel one player once per game. If they are a wolf, they die; if they are good, you die. Use your only chance wisely.',
    Guard:
      'Each night you secretly guard one player from wolves. You cannot guard the same person two nights in a row. If your guarded player is also saved by the witch’s antidote, the save fails—too much protection becomes a fatal clash.',
    Merlin:
      'You are Merlin, on the side of Good. At the start, you see every Evil player except Mordred, but not their exact roles. Guide Good to three successful quests while hiding who you are: if the Assassin identifies you at the end, Evil steals the victory.',
    Percival:
      'You are Percival, on the side of Good. At the start, you see Merlin and Morgana but cannot tell which is which. Read their guidance, protect the true Merlin, and do not let Morgana deceive the Round Table.',
    LoyalServant:
      'You are a Loyal Servant of Arthur, on the side of Good, with no special power or opening information. Use discussion, team selection, and voting to expose Evil, protect Merlin, and complete three quests successfully.',
    Assassin:
      'You are the Assassin, on the side of Evil. Infiltrate quest teams and make them fail. If Good completes three quests first, you get one final chance to name Merlin; identify them correctly and Evil wins immediately.',
    Morgana:
      'You are Morgana, on the side of Evil. Percival sees both you and Merlin at the start but cannot tell you apart. Impersonate Merlin, mislead Good, and help Evil sabotage three quests.',
    Mordred:
      'You are Mordred, on the side of Evil. Merlin cannot see you at the start, letting you hide more safely among Good. Use that cover to sabotage quests without making your unusual safety look suspicious.',
    Oberon:
      'You are Oberon, on the side of Evil. You do not see the other Evil players, and they do not see you, though Merlin can still see you. Find your allies without their guidance and seize a chance to make quests fail.',
    Random: 'Your concrete role was randomly assigned—read the title on this card.',
  },
};
