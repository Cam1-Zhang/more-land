import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import type { SandboxSnapshot } from './aiSimulationSandbox';
import type { MatchSummary } from './simulationLogger';
import { summarizePlayerHistory } from '../utils/memoryEngine';

export type AiDebugPanelProps = {
  snapshot: SandboxSnapshot | null;
  summary: MatchSummary | null;
  selectedPlayerId: string | null;
  onSelectPlayer: (id: string) => void;
};

/**
 * Per-AI debug: suspicion map, emotion, thoughts, vote, alliance heuristics, memory summary.
 */
export function AiDebugPanel({ snapshot, summary, selectedPlayerId, onSelectPlayer }: AiDebugPanelProps) {
  if (!snapshot || !selectedPlayerId) {
    return (
      <View style={styles.empty}>
        <Text style={styles.muted}>Run simulation to inspect AI state.</Text>
      </View>
    );
  }

  const p = snapshot.players.find((x) => x.character.id === selectedPlayerId);
  if (!p) {
    return (
      <View style={styles.empty}>
        <Text style={styles.muted}>Player not found.</Text>
      </View>
    );
  }

  const mem = summarizePlayerHistory(p.memory, selectedPlayerId);
  const susLines = Object.entries(p.suspicion.scores)
    .filter(([id]) => id !== selectedPlayerId)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, sc]) => `${id}: ${Math.round(sc)}`);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>{p.character.name}</Text>
      <Text style={styles.tag}>
        {p.alive ? 'alive' : 'eliminated'} · {p.role} · {p.character.difficulty}
      </Text>

      <Text style={styles.h2}>Suspicion (observer lens)</Text>
      <Text style={styles.mono}>{susLines.join('\n') || '—'}</Text>

      <Text style={styles.h2}>Emotion</Text>
      <Text style={styles.body}>
        stress {p.emotion.stress} · top {Object.entries(p.emotion.vector).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'}
      </Text>

      <Text style={styles.h2}>Last thought</Text>
      {p.lastThought ? (
        <Text style={styles.body}>
          target {p.lastThought.target} ({p.lastThought.confidence}%) · {p.lastThought.emotion}
          {'\n'}
          {p.lastThought.reasons.join(' · ')}
        </Text>
      ) : (
        <Text style={styles.muted}>—</Text>
      )}

      <Text style={styles.h2}>Last vote</Text>
      {p.lastVote ? (
        <Text style={styles.body}>
          {p.lastVote.target} · {p.lastVote.strategicIntent} · conf {p.lastVote.confidence}
          {'\n'}
          {p.lastVote.reason.join(' · ')}
        </Text>
      ) : (
        <Text style={styles.muted}>—</Text>
      )}

      <Text style={styles.h2}>Strategic mask (sim)</Text>
      <Text style={styles.body}>
        {(() => {
          const mv = p.maskVoteLedger;
          const sl = mv?.speechLineCount ?? 0;
          const hardRate = sl > 0 ? `${Math.round(((mv?.speechHardCommits ?? 0) / sl) * 100)}%` : '—';
          return (
            <>
              activeStrategicIntent: {p.lastVote?.strategicIntent ?? '—'}
              {'\n'}
              maskIntentCount: {mv?.maskIntentCount ?? 0} · fakeSupportCount: {mv?.fakeSupportCount ?? 0} ·
              redirectCount (classic): {mv?.redirectCount ?? 0} · delayedCommitCount (votes):{' '}
              {mv?.delayedCommitCount ?? 0}
              {'\n'}
              redirectSoft (votes): {mv?.redirectSoftCount ?? 0} · pressureSeed: {mv?.pressureSeedCount ?? 0} ·
              focusShift: {mv?.focusShiftCount ?? 0}
              {'\n'}
              narrativeRedirect: {mv?.narrativeRedirectCount ?? 0} · socialMomentum: {mv?.socialMomentumActions ?? 0}
              {'\n'}
              uncertaintyLines: {mv?.uncertaintyLines ?? 0} · ambiguityUsage: {mv?.ambiguityUsage ?? 0} ·
              delayedCommitSpeech: {mv?.delayedCommitSpeechCount ?? 0}
              {'\n'}
              speechLines: {sl} · hardCommits: {mv?.speechHardCommits ?? 0} · hardCommitRate: {hardRate}
            </>
          );
        })()}
      </Text>

      <Text style={styles.h2}>Alliance assumptions (co-vote)</Text>
      <Text style={styles.body}>{p.assumedAllies.length ? p.assumedAllies.join(', ') : '—'}</Text>

      <Text style={styles.h2}>Memory summary</Text>
      <Text style={styles.mono}>{mem.lines.join('\n')}</Text>

      {summary ? (
        <>
          <Text style={styles.h2}>Match checks (selected)</Text>
          {summary.personality
            .filter((r) => r.playerId === selectedPlayerId)
            .map((r) => (
              <View key={r.playerId} style={styles.block}>
                {r.checks.map((c) => (
                  <Text key={c.label} style={c.ok ? styles.ok : styles.bad}>
                    {c.ok ? '✓' : '✗'} {c.label}: {c.detail}
                  </Text>
                ))}
              </View>
            ))}
        </>
      ) : null}

      <Text style={styles.h2}>Players</Text>
      <View style={styles.row}>
        {snapshot.players.map((pl) => (
          <Pressable
            key={pl.character.id}
            onPress={() => onSelectPlayer(pl.character.id)}
            style={[styles.chip, selectedPlayerId === pl.character.id && styles.chipOn]}
          >
            <Text style={[styles.chipText, selectedPlayerId === pl.character.id && styles.chipTextOn]}>
              {pl.character.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, maxHeight: 420 },
  pad: { paddingBottom: 24 },
  empty: { padding: 12 },
  h1: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  h2: { fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 4 },
  body: { fontSize: 12, lineHeight: 18 },
  mono: { fontSize: 11, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), lineHeight: 16 },
  muted: { fontSize: 12, opacity: 0.6 },
  tag: { fontSize: 11, opacity: 0.75, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#e8e0d4' },
  chipOn: { backgroundColor: '#2d4a36' },
  chipText: { fontSize: 11, fontWeight: '700', color: '#2a1810' },
  chipTextOn: { color: '#f8efd2' },
  block: { marginTop: 4 },
  ok: { fontSize: 11, color: '#1a5c2e' },
  bad: { fontSize: 11, color: '#7a1e1e' },
});
