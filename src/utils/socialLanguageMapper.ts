/**
 * Maps internal engine signals → natural table talk (ZH/EN).
 * No game logic — phrase banks only.
 */
import type { AppLanguage } from '../i18n/appStrings';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function pick<T>(arr: readonly T[], seed: number, salt: number): T {
  return arr[(seed + salt) % arr.length]!;
}

/** Coarse bucket from 0–100 numeric engine signals (never spoken as a number to the model if avoidable). */
export function sensationBand(n: number): 'low' | 'mid' | 'high' {
  const x = clamp(Math.round(n), 0, 100);
  if (x < 36) return 'low';
  if (x < 68) return 'mid';
  return 'high';
}

/** “Vote heat / people starting to line up” without simulation jargon. */
export function voteTensionPhrase(
  lang: AppLanguage,
  band: ReturnType<typeof sensationBand>,
  targetName: string | null,
  seed: number,
  ballotPublic = true
): string {
  if (lang === 'zh') {
    if (!targetName) {
      return pick(
        ballotPublic
          ? ['场上已经有人在悄悄对票了，我听得很清楚。', '气氛有点紧，感觉大家手里都捏着票。']
          : ['场上风向已经有人在带了，我听得很清楚。', '气氛有点紧，感觉大家都在憋大招。'],
        seed,
        1
      );
    }
    if (band === 'high') {
      return pick(
        [
          `我感觉这轮大家的手都往${targetName}身上指了，TA压力会很大。`,
          `风向很明显在往${targetName}那边靠，我想听TA自己怎么说。`,
          `${targetName}今天火力太集中了，我想看TA能不能自圆其说。`,
          `这轮${targetName}躲不掉了，先等TA开口。`,
        ],
        seed,
        2
      );
    }
    if (band === 'mid') {
      return pick(
        [
          `已经有人在带${targetName}的节奏了，我想看后面敢不敢跟。`,
          `这轮${targetName}有点像被推上台的感觉。`,
          `我觉得${targetName}这条线值得往下追，还没到定论。`,
          `${targetName}有点被动，我先盯着TA后面怎么圆。`,
        ],
        seed,
        3
      );
    }
    return pick(
      [
        `票还散着，但${targetName}这条线我想先盯一眼。`,
        `${targetName}现在还没到热点，但我心里有一个问号。`,
        `我对${targetName}还有点存疑，先听TA后面怎么说。`,
        `${targetName}这轮发言有个地方我没听很懂，想再等一下。`,
        `我先把${targetName}挂着观察，还不急着下结论。`,
      ],
      seed,
      4
    );
  }
  if (!targetName) {
    return pick(
      ballotPublic
        ? ['People are already lining votes up—I can feel it.', 'The table feels tight; everyone is holding a vote.']
        : ['People are already lining up reads—I can feel it.', 'The table feels tight; everyone is holding their cards close.'],
      seed,
      11
    );
  }
  if (band === 'high') {
    return pick(
      [
        `A lot of fingers are pointing at ${targetName} today—huge heat.`,
        `The wind is swinging hard toward ${targetName}; I want their answer.`,
      ],
      seed,
      12
    );
  }
  if (band === 'mid') {
    return pick(
      [
        `Somebody is steering toward ${targetName}—I want to see who follows.`,
        `${targetName} is starting to look like the exile magnet.`,
      ],
      seed,
      13
    );
  }
  return pick(
    [`Votes are still scattered, but I am keeping an eye on ${targetName}.`, `The room is soft on ${targetName}—I still want pressure.`],
    seed,
    14
  );
}

/** “Two seats look welded” without “alliance risk”. */
export function allianceUneasePhrase(
  lang: AppLanguage,
  band: ReturnType<typeof sensationBand>,
  a: string,
  b: string | null,
  seed: number,
  ballotPublic = true
): string {
  if (!b) {
    return lang === 'zh'
      ? pick([`${a}这轮站位有点怪，我想听TA解释。`, `我对${a}的听感不干净，先点出来。`, `${a}说话的方式让我心里有个问号。`, `我觉得${a}有点刻意，先挂着。`], seed, 20)
      : pick([`${a} feels off in how they sit this round.`, `I do not like how ${a} is parking socially.`, `${a} is giving me a weird vibe—worth watching.`, `Something about ${a}'s angle reads off to me.`], seed, 21);
  }
  if (lang === 'zh') {
    if (band === 'high') {
      return pick(
        [
          `${a}跟${b}互相护得太顺手了，我开始怀疑他们是不是一边的。`,
          `他们两个一唱一和有点明显，我不想装作看不见。`,
          `${a}和${b}每次都站在同一侧，这个默契有点可疑。`,
          `我越看越觉得${a}、${b}是同一队的，说不定不是巧合。`,
        ],
        seed,
        22
      );
    }
    return pick(
      [
        `${a}和${b}站队太同步了，我想听他们各自独立聊一轮。`,
        `我眼里${a}、${b}像绑在一条绳上，先记一笔。`,
        `${a}跟${b}的立场贴得有点近，我想单独听他们的逻辑。`,
        `${a}和${b}总是在同一个方向接话，这点我注意到了。`,
      ],
      seed,
      23
    );
  }
  if (band === 'high') {
    return pick(
      [
        `${a} and ${b} keep bailing each other out—reads like a pack.`,
        `${a} and ${b} are a little too in sync for my taste.`,
      ],
      seed,
      30
    );
  }
  return pick(
    ballotPublic
      ? [
          `${a} and ${b} vote and talk like a pair—I want separate reads.`,
          `${a} and ${b} keep landing on the same side—worth a hard look.`,
        ]
      : [
          `${a} and ${b} talk like a pair—I want separate reads.`,
          `${a} and ${b} keep landing on the same side—worth a hard look.`,
        ],
    seed,
    31
  );
}

/** Social “heat / chatter crowding” without “social pressure score”. */
export function tableCrowdingPhrase(lang: AppLanguage, band: ReturnType<typeof sensationBand>, seed: number): string {
  if (lang === 'zh') {
    if (band === 'high') return pick(['麦上有点吵，大家都急着表态。', '场上声音很杂，我想把线捋清楚再说。', '信息太乱了，我先抓最扎眼的那条。', '今天叠的事太多，我只盯最刺的一点。'], seed, 40);
    if (band === 'mid') return pick(['信息量堆得有点快，我抓重点说。', '几件事叠在一起，我先把最刺的点拎出来。', '这轮东西有点多，我说我觉得最有用的。', '先盯一条最有价值的线，其他先放。'], seed, 41);
    return pick(['轮到我了，我直接说我的疑点。', '我先说我心里那个问号，聊完再听大家的。', '这轮没太多争议，我就说一个感觉。', '我把我注意到的那个点提出来就好。', '这轮信息还比较散，我先占个位说感受。'], seed, 42);
  }
  if (band === 'high') return pick(['The table is loud—everyone wants a take.', 'Lots of noise; I will name the sharpest hinge.', 'Too much going on—one pressure point at a time.', 'I will cut through the noise and name the cleanest read.'], seed, 50);
  if (band === 'mid') return pick(['A lot is happening—I will keep it tight.', 'Too many threads; I pick one pressure point.', 'Busy round—here is the read I care most about.', 'Let me strip it down to the one thing worth pressing.'], seed, 51);
  return pick(['I will keep this calm and readable.', 'Just one question on my mind right now.', 'Let me share where I am sitting on this.', 'Quick take—nothing fancy.'], seed, 52);
}

/** Hard-only forwardNotes from thoughtEngine → one human line each. */
export function forwardNoteToPlayerLine(
  note: string,
  lang: AppLanguage,
  seed: number,
  ballotPublic = true
): string | null {
  if (note.startsWith('pivot_risk')) {
    return lang === 'zh'
      ? pick(['前两名咬得太死，下一轮很容易互相扯票。', '最热的两个坑挨太近，我怕好人互打。'], seed, 60)
      : pick(['Top reads are tied—next vote could splinter town.', 'Two hottest seats are too close—messy exile risk.'], seed, 61);
  }
  if (note.startsWith('simulated_plurality')) {
    if (ballotPublic === false) {
      return lang === 'zh'
        ? pick(['麦上还在互相探底，我想多听一轮独立视角。', '嘴上都能圆，我想看谁敢把站边落到地上。'], seed, 62)
        : pick(
            ['Talk is still cheap—give me a stance I can pressure.', 'Everyone sounds smooth—I want a hinge I can test.'],
            seed,
            63
          );
    }
    return lang === 'zh'
      ? pick(['现在大家还在互相试探，真刀真枪要看票露出来。', '嘴上都能圆，我想看票型敢不敢落地。'], seed, 62)
      : pick(['Talk is cheap until votes show who is real.', 'Claims are noisy—ballot is the receipt.'], seed, 63);
  }
  if (note.startsWith('group_psychology') || note.includes('bandwagon')) {
    return lang === 'zh'
      ? pick(['谁先带节奏，后面一串人就容易跟着跑。', '风向一带起来，后面很难刹住车。'], seed, 64)
      : pick(['First loud voice drags the table—watch the pile-on.', 'Momentum is contagious at this table.'], seed, 65);
  }
  if (note.startsWith('contingency_pivot')) {
    const m = /^contingency_pivot:(.+)$/.exec(note);
    const name = m?.[1]?.trim();
    if (name) {
      return lang === 'zh'
        ? `要是主线聊崩了，我会回头看${name}这条备胎线。`
        : `If the main thread collapses, I pivot attention to ${name}.`;
    }
  }
  if (note.startsWith('hidden_alliance_hypothesis')) {
    return lang === 'zh'
      ? pick(['有几张牌站队太整齐了，我不想装看不见。', '我闻得到小团体味，只是还没锤死。'], seed, 66)
      : pick(['A few seats move like a bloc—I smell it.', 'Too tidy a cluster—could be a pack.'], seed, 67);
  }
  if (note.startsWith('watch_for_coordinated_false_consensus')) {
    return lang === 'zh'
      ? '几个人口径太统一了，我反而心里打鼓。'
      : 'Too many people saying the same thing—feels staged.';
  }
  if (note.startsWith('simulate_social_collapse')) {
    return lang === 'zh'
      ? '好人别被节奏带着互打，先把狼坑收紧。'
      : 'Town should not friendly-fire—tighten the wolf pool first.';
  }
  return null;
}

/** manipulationAwareness machine strings → table talk. */
export function manipulationTagToPlayerLine(tag: string, lang: AppLanguage, seed: number): string | null {
  if (tag.includes('bandwagon') || tag.includes('social_pressure')) {
    return lang === 'zh'
      ? pick(['后面一串跟票那种，我最不放心。', '大家一拥而上的时候，我习惯多看一眼。'], seed, 70)
      : pick(['I get nervous when the table piles on in lockstep.', 'When everyone stacks the same read, I look for who started the drumbeat.'], seed, 71);
  }
  if (tag.includes('narrative_flip') || tag.includes('manipulation')) {
    return lang === 'zh'
      ? pick(['改口改得太顺滑也要警惕，不像单纯听错。', '故事版本换太快，我会盯是谁在递新剧本。'], seed, 72)
      : pick(['Clean story flips make me side-eye the rewrite.', 'Who benefits if the narrative shifts overnight?'], seed, 73);
  }
  if (tag.includes('agenda') || tag.includes('pile_on')) {
    return lang === 'zh'
      ? pick(['有人一直在带风向，我不想被推着走。', '麦上谁在定调子，我听得很清楚。'], seed, 74)
      : pick(['Somebody keeps steering— I refuse to be dragged.', 'Watch who sets the agenda every round.'], seed, 75);
  }
  if (tag.includes('false_consensus')) {
    return lang === 'zh'
      ? '假共识最害人，我宁愿聊得难听一点。'
      : 'Fake consensus is poison—I would rather sound rude than soft.';
  }
  return null;
}

/** One line: how this persona should sound (meta for prompt, not spoken verbatim). */
export function personaSpeakHint(profile: AIBehaviorProfile, lang: AppLanguage, seed: number): string {
  const L = profile.logic >= 75;
  const E = profile.emotionality >= 78;
  const D = profile.deception >= 72;
  const C = profile.caution >= 78;
  const A = profile.aggression >= 74;
  if (lang === 'zh') {
    if (D) return pick(['语气客气但带刺，别像在念稿。', '表面软一点，话里要有钩子。'], seed, 80);
    if (L) return pick(['条理清楚，但别说成报告会。', '像真人在盘逻辑，别堆术语。'], seed, 81);
    if (E) return pick(['带点情绪没关系，像被局气到了。', '直觉先抛出来，再用一两句扣住人。'], seed, 82);
    if (C) return pick(['有点犹豫、留余地，但还是要点名。', '别太冲，但别滑过去。'], seed, 83);
    if (A) return pick(['短句、直接，可以施压但别骂街。', '该点名就点名，别绕弯子。'], seed, 84);
    return pick(['自然口语，像熟人局。', '像平时打狼人杀那样聊。'], seed, 85);
  }
  if (D) return pick(['Polite surface, sharp hook—no script voice.', 'Soft words, hard steer—sounds human.'], seed, 90);
  if (L) return pick(['Clean logic, not a spreadsheet monologue.', 'Talk like a player, not a whitepaper.'], seed, 91);
  if (E) return pick(['Let emotion leak a little—genuine heat.', 'Gut read first, one hinge fact second.'], seed, 92);
  if (C) return pick(['Hesitant but still names a seat.', 'Careful tone, still lands a punch.'], seed, 93);
  if (A) return pick(['Blunt, short, table-appropriate pressure.', 'Direct callouts—no speech essay.'], seed, 94);
  return pick(['Natural table banter.', 'Sound like a real weekly game night.'], seed, 95);
}
