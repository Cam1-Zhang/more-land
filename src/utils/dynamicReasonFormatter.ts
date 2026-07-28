/**
 * Turns machine reason tags + suspicion structure into concrete, name-bound observations.
 * No GPT — deterministic templates + small personality skew for variety.
 */
import type { AppLanguage } from '../i18n/appStrings';
import type { AIBehaviorProfile } from '../data/aiBehaviorProfiles';
import type { InternalThoughtSnapshot } from './thoughtEngine';
import type { SuspicionState } from './suspicionEngine';

export type DynamicReasonFormatInput = {
  lang: AppLanguage;
  targetName: string;
  targetId: string;
  reasonTags: readonly string[];
  thought: InternalThoughtSnapshot;
  suspicion: SuspicionState;
  observerId: string;
  idToName: (id: string) => string;
  personality: AIBehaviorProfile;
  /** Deterministic variety */
  varietySeed: number;
  /** When false, do not phrase observations as if per-seat daytime exile ballots were public. */
  dayExileVotesPublic?: boolean;
};

function pick<T>(arr: readonly T[], seed: number, salt: number): T {
  return arr[(seed + salt) % arr.length]!;
}

/** Strongest defend edge for `targetId` (who they defended) excluding observer. */
export function topDefendPartnerForSubject(
  suspicion: SuspicionState,
  subjectId: string,
  observerId: string
): { partnerId: string; count: number } | null {
  const row = suspicion.defendTally[subjectId];
  if (!row) return null;
  let bestId: string | null = null;
  let best = 0;
  for (const [pid, c] of Object.entries(row)) {
    if (pid === observerId) continue;
    if (c > best) {
      best = c;
      bestId = pid;
    }
  }
  return bestId && best > 0 ? { partnerId: bestId, count: best } : null;
}

/** Seats who repeatedly co-voted the same exile target as `subjectId` (Hard matrix). */
export function coVoteAllyNames(
  suspicion: SuspicionState,
  subjectId: string,
  observerId: string,
  idToName: (id: string) => string,
  minSync: number
): string[] {
  const row = suspicion.coVoteSameTarget[subjectId];
  if (!row) return [];
  const out: string[] = [];
  for (const [other, c] of Object.entries(row)) {
    if (other === observerId || other === subjectId) continue;
    if (c >= minSync) out.push(idToName(other));
  }
  return out.sort();
}

function zhLines(input: DynamicReasonFormatInput): string[] {
  const { targetName, reasonTags, thought, personality } = input;
  const seed = input.varietySeed;
  const ballotPublic = input.dayExileVotesPublic !== false;
  const defend = topDefendPartnerForSubject(input.suspicion, input.targetId, input.observerId);
  const defendName = defend ? input.idToName(defend.partnerId) : null;
  const coNames = ballotPublic
    ? coVoteAllyNames(input.suspicion, input.targetId, input.observerId, input.idToName, 2)
    : [];
  const coStr = coNames.slice(0, 2).join('、');
  const flip = input.suspicion.accusationFlipCount[input.targetId] ?? 0;
  const blind = input.suspicion.blindFollowCount[input.targetId] ?? 0;
  const leadVote =
    thought.votePrediction.leadingTargetId === input.targetId
      ? pick(
          [
            `我感觉大家的手都在往${targetName}那边靠，我想听TA自己怎么接。`,
            `这轮${targetName}有点像被推上台，我得盯紧TA怎么带队。`,
          ],
          seed,
          11
        )
      : null;

  const lines: string[] = [];

  const logical = personality.logic >= 72;
  const manip = personality.deception >= 70;
  const emo = personality.emotionality >= 78;
  const cautious = personality.caution >= 76 && personality.aggression < 42;
  const aggressive = personality.aggression >= 74;

  for (const tag of reasonTags) {
    switch (tag) {
      case 'very_high_suspicion_score':
        lines.push(
          logical
            ? pick(
                [
                  `${targetName}是我眼里最大的问号：几件事串起来不对劲，我想听TA自己圆。`,
                  `${targetName}这条线最刺，我想先把逻辑扣死再问别的。`,
                ],
                seed,
                20
              )
            : pick(
                [
                  `${targetName}这张牌我现在最不想放：疑点太密了。`,
                  `我眼里最烫的就是${targetName}，这轮必须听TA把线圆回来。`,
                ],
                seed,
                21
              )
        );
        break;
      case 'elevated_suspicion_score':
      case 'nonzero_suspicion_signal':
        lines.push(
          pick(
            [
              `${targetName}在我这边越来越像焦点，不是空穴来风。`,
              `${targetName}这条线我想重点听更新。`,
            ],
            seed,
            30
          )
        );
        break;
      case 'changed_vote_or_accusation_line':
        lines.push(
          emo
            ? pick(
                [
                  `${targetName}前后态度转得太快，我很难当作“正常更新”。`,
                  `${targetName}改口那一下我听得很刺耳——不像单纯听错。`,
                ],
                seed,
                40
              )
            : pick(
                ballotPublic
                  ? [
                      `${targetName}的站边/票型前后不一致，我想对照TA的解释能不能闭合。`,
                      `${targetName}这轮叙事和上一轮接不上，这是硬矛盾点。`,
                    ]
                  : [
                      `${targetName}几轮站边口径前后接不上，我想当面把逻辑扣齐。`,
                      `${targetName}这轮说法和上一轮对不上，我想听TA怎么圆。`,
                    ],
                seed,
                41
              )
        );
        break;
      case 'followed_majority_blindly':
        lines.push(
          aggressive
            ? pick(
                ballotPublic
                  ? [
                      `${targetName}一直在跟大票走，独立思考呢？这轮我要点名施压。`,
                      `${targetName}别当影子票：你总得告诉大家你到底信谁。`,
                    ]
                  : [
                      `${targetName}每轮都像跟着最响的那个声音跑，缺少自己的落点。`,
                      `${targetName}别总躲在“大家怎么说”后面，你得告诉大家你信谁。`,
                    ],
                seed,
                50
              )
            : pick(
                ballotPublic
                  ? [
                      `${targetName}几轮都像在跟车，缺少自己的判断落点。`,
                      `${targetName}的票型太“顺大流”，我想听TA单独站边的理由。`,
                    ]
                  : [
                      `${targetName}几轮都像踩着同一个节奏表态，缺少自己的判断落点。`,
                      `${targetName}太“顺大流”了，我想听TA独立站边的理由。`,
                    ],
                seed,
                51
              )
        );
        break;
      case 'defended_others_linked_to_hot_seats':
        if (defendName) {
          lines.push(
            manip
              ? pick(
                  [
                    `${targetName}连着帮${defendName}挡火——我越看越像一伙的。`,
                    `场上焦点在${defendName}时，${targetName}接话接得太巧了。`,
                  ],
                  seed,
                  60
                )
              : pick(
                  [
                    `${targetName}连着给${defendName}解围，我想继续看他们俩怎么互动。`,
                    `${defendName}被踩以后${targetName}立刻接话，这反应不自然。`,
                  ],
                  seed,
                  61
                )
          );
        } else {
          lines.push(
            pick(
              [
                `${targetName}总在风口浪尖旁边打圆场，我不想当作巧合。`,
                `${targetName}那种“解围”出现得太规律了。`,
              ],
              seed,
              62
            )
          );
        }
        break;
      case 'logic_weighted_inconsistency_pattern':
        lines.push(
          pick(
            ballotPublic
              ? [
                  `${targetName}一边改口一边跟票，两个信号叠在一起我不舒服。`,
                  `${targetName}的“故事版本”和“票型版本”对不上号。`,
                ]
              : [
                  `${targetName}一边改口一边跟着风向跑，两个信号叠在一起我不舒服。`,
                  `${targetName}的“故事版本”和麦上站边对不上号。`,
                ],
            seed,
            70
          )
        );
        break;
      case 'leadership_weighted_passive_bandwagon':
        lines.push(
          pick(
            ballotPublic
              ? [
                  `${targetName}像在躲责任：麦上不响、票上却永远安全跟车。`,
                  `${targetName}带队欲望低但跟票极准，这个组合很狼。`,
                ]
              : [
                  `${targetName}像在躲责任：麦上不响、风向一变又总能站到安全边。`,
                  `${targetName}带队欲望低但站边极准，这个组合很狼。`,
                ],
            seed,
            80
          )
        );
        break;
      case 'manipulation_read_defense_network':
        lines.push(
          pick(
            [
              `${targetName}总在旁边“和稀泥”，听着像在控场不像在找狼。`,
              `${targetName}解围次数太多，我想反问一句：TA到底站哪边？`,
            ],
            seed,
            90
          )
        );
        break;
      case 'insufficient_structural_signals':
        lines.push(
          cautious
            ? pick(
                [
                  `信息还不够硬，但我仍想先把${targetName}放进观察位，听TA下一轮怎么补。`,
                  ballotPublic
                    ? `${targetName}我暂时不锤死，只标一个轻问号，等票型说话。`
                    : `${targetName}我暂时不锤死，只标一个轻问号，等后面公开信息更硬再说。`,
                ],
                seed,
                100
              )
            : pick(
                [
                  `锤还不死，但${targetName}仍是我这轮最想追问的人。`,
                  `就算还没铁证，我也想把压力轻轻落在${targetName}身上逼更新。`,
                ],
                seed,
                101
              )
        );
        break;
      default:
        break;
    }
  }

  if (flip >= 2 && !reasonTags.includes('changed_vote_or_accusation_line')) {
    lines.push(
      pick(
        ballotPublic
          ? [
              `${targetName}改票/改踩的次数已经不止一两次了。`,
              `${targetName}的票型摆动幅度太大，我想听TA给统一解释。`,
            ]
          : [
              `${targetName}几轮站边摆得厉害，我想听TA把逻辑说闭合。`,
              `${targetName}麦上口风前后不太一致，我想当面追问。`,
            ],
        seed,
        110
      )
    );
  }
  if (blind >= 2 && !reasonTags.includes('followed_majority_blindly')) {
    lines.push(
      pick(
        ballotPublic
          ? [
              `${targetName}几乎总跟着大家最狠的那一脚踩，自己却没个站得住的口子。`,
              `${targetName}跟票跟得太顺了，像只想躲在人群里。`,
            ]
          : [
              `${targetName}几乎总跟着最响的那股风向踩，自己却没个站得住的口子。`,
              `${targetName}每轮表态都跟得太顺，像只想躲在人群里。`,
            ],
        seed,
        120
      )
    );
  }
  if (defendName && defend && defend.count >= 2 && !reasonTags.includes('defended_others_linked_to_hot_seats')) {
    lines.push(
      pick(
        [
          `${targetName}连着多轮护${defendName}，我想把这条关系线钉死来看。`,
          `${defendName}被集火时${targetName}总在旁边递台阶。`,
        ],
        seed,
        130
      )
    );
  }
  if (coStr) {
    lines.push(
      pick(
        ballotPublic
          ? [
              `${targetName}跟${coStr}好几轮都踩到同一个点，像绑在一条船上。`,
              `${targetName}和${coStr}投票步子太齐，我不想装作看不见。`,
            ]
          : [
              `${targetName}跟${coStr}好几轮麦上咬点太同步，像绑在一条船上。`,
              `${targetName}和${coStr}站队太齐，我不想装作看不见。`,
            ],
        seed,
        140
      )
    );
  }
  if (thought.predictedAllies.length > 0 && manip) {
    const a = thought.predictedAllies[0]!;
    lines.push(
      pick(
        [
          `我闻着${targetName}在拉${a}当挡箭牌，想把水搅浑。`,
          `${targetName}跟${a}一唱一和不对劲，不像偶然。`,
        ],
        seed,
        150
      )
    );
  }
  if (leadVote) lines.push(leadVote);

  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const ln of lines) {
    const t = ln.trim();
    if (t.length < 6 || seen.has(t)) continue;
    seen.add(t);
    uniq.push(t);
  }
  return uniq.slice(0, 6);
}

function enLines(input: DynamicReasonFormatInput): string[] {
  const { targetName, reasonTags, thought, personality } = input;
  const seed = input.varietySeed;
  const ballotPublic = input.dayExileVotesPublic !== false;
  const defend = topDefendPartnerForSubject(input.suspicion, input.targetId, input.observerId);
  const defendName = defend ? input.idToName(defend.partnerId) : null;
  const coNames = ballotPublic
    ? coVoteAllyNames(input.suspicion, input.targetId, input.observerId, input.idToName, 2)
    : [];
  const coStr = coNames.slice(0, 2).join(', ');
  const logical = personality.logic >= 72;
  const manip = personality.deception >= 70;
  const emo = personality.emotionality >= 78;
  const lines: string[] = [];

  for (const tag of reasonTags) {
    switch (tag) {
      case 'very_high_suspicion_score':
        lines.push(
          logical
            ? `${targetName} is my biggest open question—too many tells line up the same way.`
            : `${targetName} is the hottest seat for me right now—I want a real answer, not vibes.`
        );
        break;
      case 'changed_vote_or_accusation_line':
        lines.push(
          emo
            ? `${targetName} flipped too fast—that swing does not feel like a normal town update.`
            : ballotPublic
              ? `${targetName}'s story and votes do not stitch cleanly across rounds.`
              : `${targetName}'s rhetoric does not stitch cleanly across rounds.`
        );
        break;
      case 'followed_majority_blindly':
        lines.push(
          ballotPublic
            ? `${targetName} keeps sliding with the loudest pile-on—show me your own read, not echo.`
            : `${targetName} keeps sliding with the loudest narrative—show me your own read, not echo.`
        );
        break;
      case 'defended_others_linked_to_hot_seats':
        if (defendName) {
          lines.push(
            manip
              ? `${targetName} keeps soft-bailing ${defendName}—that pattern looks practiced, not accidental.`
              : `When heat lands on ${defendName}, ${targetName} shows up too quickly to cool it—unnatural timing.`
          );
        } else {
          lines.push(`${targetName} keeps cooling the hottest seats—pattern, not coincidence.`);
        }
        break;
      case 'insufficient_structural_signals':
        lines.push(`Hammer is not iron yet, but ${targetName} is still who I want on the mic.`);
        break;
      default:
        break;
    }
  }
  if (thought.votePrediction.leadingTargetId === input.targetId) {
    lines.push(
      pick(
        [
          `I feel the room leaning on ${targetName}—I want their answer, not the noise.`,
          `If the table stacks on ${targetName}, they owe us a clean story.`,
        ],
        seed,
        200
      )
    );
  }
  if (coStr) {
    lines.push(
      ballotPublic
        ? `${targetName} and ${coStr} keep stepping on the same exile—too tidy for me.`
        : `${targetName} and ${coStr} keep landing on the same talking points—too tidy for me.`
    );
  }
  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const ln of lines) {
    const t = ln.trim();
    if (t.length < 8 || seen.has(t)) continue;
    seen.add(t);
    uniq.push(t);
  }
  return uniq.slice(0, 6);
}

/**
 * Concrete observation lines for prompts / local fallback (ZH/EN).
 */
export function formatDynamicObservationLines(input: DynamicReasonFormatInput): string[] {
  const out = input.lang === 'zh' ? zhLines(input) : enLines(input);
  if (out.length > 0) return out;
  if (input.lang === 'zh') {
    return [
      pick(
        [
          `我这轮先把火力轻轻落在${input.targetName}身上，逼一轮可核对的更新。`,
          `${input.targetName}是我当前最想追问的一张牌。`,
        ],
        input.varietySeed,
        900
      ),
    ];
  }
  return [
    pick(
      [
        `I am pressing ${input.targetName} for one checkable update this round.`,
        `${input.targetName} is the seat I want on the record—explain the thread.`,
      ],
      input.varietySeed,
      901
    ),
  ];
}

/** Single line for ultra-short fallback (still name-anchored). */
export function pickPrimaryGroundedLine(lines: readonly string[], seed: number): string {
  if (lines.length === 0) return '';
  return pick(lines, seed, 999);
}

export function genericFillerPhrasesZh(): readonly string[] {
  return ['再听一轮', '先跟大部队', '我先不站边', '像在带节奏', '听听更新', '跟大部走'];
}

export function lineLooksLikeGenericFillerZh(text: string): boolean {
  const t = text.replace(/\s/g, '');
  return genericFillerPhrasesZh().some((g) => t.includes(g));
}

export function stripGenericFillerZh(text: string): string {
  if (!lineLooksLikeGenericFillerZh(text)) return text;
  return pick(
    [
      '这轮我想把追问落到具体人具体事上，不想空划水。',
      '别光跟车，先把上一轮的票型和发言对齐再说话。',
    ],
    text.length * 17,
    17
  );
}
