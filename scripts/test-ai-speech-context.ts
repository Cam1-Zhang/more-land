import assert from 'node:assert/strict';
import { narratorLinesForCurrentDay } from '../src/game/info/logFilter';
import type { NarratorLine } from '../src/game/info/narrator';
import { buildDiscussionFocusSnapshot } from '../src/utils/focusTracker';
import { lineDirectlyAccusesTarget } from '../src/utils/speechAccusation';
import { scrubPrematurePlayerReads } from '../src/utils/speechChronologyGuard';

function line(kind: NarratorLine['kind'], zh: string): NarratorLine {
  return { kind, zh, en: zh, visibility: 'public' };
}

const timeline: NarratorLine[] = [
  line('NIGHT_START', '第1夜'),
  line('NIGHT_RESOLVE', '第1天天亮'),
  line('SPEECH', 'Luna：第一天的话'),
  line('NIGHT_START', '第2夜'),
  line('NIGHT_WOLF_ACTION', '狼人请闭眼'),
  line('NIGHT_RESOLVE', '第2天天亮'),
  line('SPEECH', 'Toby：第二天的话'),
];
assert.deepEqual(
  narratorLinesForCurrentDay(timeline).map((entry) => entry.zh),
  ['第2天天亮', 'Toby：第二天的话']
);

assert.equal(lineDirectlyAccusesTarget('Frank：我觉得Luna像狼。', 'Luna', 'zh'), true);
assert.equal(lineDirectlyAccusesTarget('Frank：我不觉得Luna是狼，Toby更像狼。', 'Luna', 'zh'), false);
assert.equal(lineDirectlyAccusesTarget('Frank：我不觉得Luna是狼，Toby更像狼。', 'Toby', 'zh'), true);
assert.equal(lineDirectlyAccusesTarget('Frank：Luna说Toby是狼。', 'Luna', 'zh'), false);
assert.equal(lineDirectlyAccusesTarget('Frank：Luna说Toby是狼。', 'Toby', 'zh'), false);
assert.equal(lineDirectlyAccusesTarget('Luna：我觉得自己像狼。', 'Luna', 'zh'), false);
assert.equal(lineDirectlyAccusesTarget('Frank: I think Luna looks like a wolf.', 'Luna', 'en'), true);
assert.equal(lineDirectlyAccusesTarget("Frank: I don't think Luna is a wolf.", 'Luna', 'en'), false);

assert.equal(
  scrubPrematurePlayerReads('我对九号Alice稍微留个心眼，她待会儿节奏容易带跑偏。', ['Alice'], 'zh'),
  ''
);
assert.equal(
  scrubPrematurePlayerReads('我先听Alice待会儿怎么说。', ['Alice'], 'zh'),
  '我先听Alice待会儿怎么说。'
);
assert.equal(
  scrubPrematurePlayerReads('我昨晚验了Alice，是金水。', ['Alice'], 'zh'),
  '我昨晚验了Alice，是金水。'
);
assert.equal(lineDirectlyAccusesTarget('Frank: Luna said Toby is a wolf.', 'Toby', 'en'), false);

const focus = buildDiscussionFocusSnapshot(
  ['Frank：我不觉得Luna是狼，Toby更像狼。'],
  ['Frank', 'Luna', 'Toby'],
  'zh'
);
assert.deepEqual(focus.accusationEdges, [{ accuserDisplay: 'Frank', targetDisplay: 'Toby' }]);
assert.deepEqual(focus.softDefenseHints, [{ defenderDisplay: 'Frank', protectedDisplay: 'Luna' }]);

console.log('AI speech context regression checks passed.');
