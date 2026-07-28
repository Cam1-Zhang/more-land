import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Share,
  Alert,
} from 'react-native';
import ParchmentTopBarFrame from '../components/ParchmentTopBarFrame';
import { GAME_WOOD_BTN, gameWoodButtonFace, gameWoodButtonLabel } from '../theme/gameButton';
import { SDV } from '../theme/stardewPixel';
import { AiDebugPanel } from '../debug/aiDebugPanel';
import {
  runAiSimulationSandbox,
  type SandboxConfig,
  type SandboxSnapshot,
} from '../debug/aiSimulationSandbox';
import type { MatchSummary } from '../debug/simulationLogger';
import { CHARACTERS } from '../data/mockData';
import {
  SANDBOX_PRESETS,
  listSandboxPresets,
  parseSandboxImportJson,
  exportSandboxConfigJson,
  type SandboxPresetId,
} from '../debug/sandboxRosterToolkit';

export default function AiSimulationSandboxScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const [seedStr, setSeedStr] = useState('42');
  const [playerCount, setPlayerCount] = useState('8');
  const [maxPhases, setMaxPhases] = useState('6');
  const [speedMs, setSpeedMs] = useState('0');
  const [rosterMode, setRosterMode] = useState<'random' | 'custom'>('random');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preserveOrder, setPreserveOrder] = useState(true);
  const [roleMode, setRoleMode] = useState<'random' | 'manual'>('random');
  const [manualRolesJson, setManualRolesJson] = useState('{\n  "27": "wolf",\n  "1": "town"\n}');
  const [stressM, setStressM] = useState('0');
  const [stressE, setStressE] = useState('0');
  const [stressC, setStressC] = useState('0');
  const [roleRerollOffset, setRoleRerollOffset] = useState(0);
  const [importJson, setImportJson] = useState('');
  const [presetTags, setPresetTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [snapshot, setSnapshot] = useState<SandboxSnapshot | null>(null);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [logTail, setLogTail] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const parsed = useMemo(() => {
    const seed = parseInt(seedStr, 10);
    const n = parseInt(playerCount, 10);
    const phases = parseInt(maxPhases, 10);
    const spd = parseInt(speedMs, 10);
    return {
      seed: Number.isFinite(seed) ? seed : 42,
      n: Number.isFinite(n) ? n : 8,
      phases: Number.isFinite(phases) ? phases : 6,
      spd: Number.isFinite(spd) ? Math.max(0, spd) : 0,
    };
  }, [seedStr, playerCount, maxPhases, speedMs]);

  const toggleCharacter = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const i = prev.indexOf(id);
      if (i >= 0) return prev.filter((x) => x !== id);
      if (prev.length >= 10) return prev;
      return [...prev, id];
    });
  }, []);

  const applyPreset = useCallback((id: SandboxPresetId) => {
    const p = SANDBOX_PRESETS[id];
    setRosterMode('custom');
    setSelectedIds([...p.characterIds]);
    setPresetTags([...p.tags]);
    setPlayerCount(String(p.characterIds.length));
  }, []);

  const applyImport = useCallback(() => {
    const r = parseSandboxImportJson(importJson.trim() || '{}');
    if (!r.ok) {
      Alert.alert('Import failed', r.error);
      return;
    }
    const d = r.data;
    if (d.seed != null) setSeedStr(String(d.seed));
    if (d.maxPhases != null) setMaxPhases(String(d.maxPhases));
    if (d.speedMs != null) setSpeedMs(String(d.speedMs));
    if (d.playerCount != null) setPlayerCount(String(d.playerCount));
    if (d.rosterMode) setRosterMode(d.rosterMode);
    if (d.customRosterOrder) setSelectedIds([...d.customRosterOrder]);
    if (d.preserveCustomOrder != null) setPreserveOrder(d.preserveCustomOrder);
    if (d.roleMode) setRoleMode(d.roleMode);
    if (d.manualRolesByIdOrName) setManualRolesJson(JSON.stringify(d.manualRolesByIdOrName, null, 2));
    if (d.stressProfileTargets) {
      setStressM(String(d.stressProfileTargets.manipulative ?? 0));
      setStressE(String(d.stressProfileTargets.emotional ?? 0));
      setStressC(String(d.stressProfileTargets.cautious ?? 0));
    }
    if (d.matchTags) setPresetTags([...d.matchTags]);
    if (d.roleRerollOffset != null) setRoleRerollOffset(d.roleRerollOffset);
    Alert.alert('Imported', 'Applied fields from JSON.');
  }, [importJson]);

  const buildConfig = useCallback(
    (overrides?: Partial<Pick<SandboxConfig, 'seed' | 'roleRerollOffset'>>): SandboxConfig | null => {
      let manual: Record<string, 'wolf' | 'town'> | undefined;
      if (roleMode === 'manual') {
        try {
          manual = JSON.parse(manualRolesJson.trim() || '{}') as Record<string, 'wolf' | 'town'>;
        } catch {
          Alert.alert('Manual roles', 'Invalid JSON for manual roles.');
          return null;
        }
      }

      const sm = parseInt(stressM, 10) || 0;
      const se = parseInt(stressE, 10) || 0;
      const sc = parseInt(stressC, 10) || 0;
      const stressProfileTargets =
        rosterMode === 'random' && (sm > 0 || se > 0 || sc > 0)
          ? { manipulative: sm, emotional: se, cautious: sc }
          : undefined;

      const customOrder = rosterMode === 'custom' ? selectedIds.filter(Boolean).slice(0, 10) : [];
      if (rosterMode === 'custom' && customOrder.length < 6) {
        Alert.alert('Roster', 'Custom roster needs at least 6 characters.');
        return null;
      }

      const n =
        rosterMode === 'custom'
          ? Math.max(6, Math.min(10, customOrder.length))
          : Math.max(6, Math.min(10, parsed.n));

      const tags = [...presetTags];
      if (rosterMode === 'custom') tags.push('ui:custom_roster');
      if (stressProfileTargets) tags.push('ui:stress_profile');

      const seedVal = overrides?.seed ?? parsed.seed;
      const roleOff = overrides?.roleRerollOffset ?? roleRerollOffset;

      return {
        observeMode: true,
        playerCount: n,
        seed: seedVal,
        speedMs: parsed.spd,
        maxPhases: parsed.phases,
        rosterMode,
        ...(rosterMode === 'custom'
          ? {
              customRosterOrder: customOrder,
              preserveCustomOrder: preserveOrder,
            }
          : {}),
        roleMode,
        ...(roleMode === 'manual' && manual ? { manualRolesByIdOrName: manual } : {}),
        ...(stressProfileTargets ? { stressProfileTargets } : {}),
        matchTags: tags,
        roleRerollOffset: roleOff,
      };
    },
    [
      parsed,
      rosterMode,
      selectedIds,
      preserveOrder,
      roleMode,
      manualRolesJson,
      stressM,
      stressE,
      stressC,
      presetTags,
      roleRerollOffset,
    ]
  );

  const run = useCallback(
    async (cfgIn?: SandboxConfig | null) => {
      const cfg = cfgIn ?? buildConfig();
      if (!cfg) return;
      setBusy(true);
      setLogTail([]);
      try {
        const { snapshot: snap, summary: sum } = await runAiSimulationSandbox(cfg, {
          onLog: (e) => {
            setLogTail((prev) => [...prev, `${e.t} p${'phase' in e ? e.phase : '?'} ${JSON.stringify(e)}`].slice(-80));
          },
        });
        setSnapshot(snap);
        setSummary(sum);
        setSelectedId(snap.players[0]?.character.id ?? null);
      } finally {
        setBusy(false);
      }
    },
    [buildConfig]
  );

  const exportJson = useCallback(async () => {
    const cfg = buildConfig();
    if (!cfg) return;
    const payload = {
      version: 1 as const,
      rosterMode: cfg.rosterMode ?? 'random',
      preserveCustomOrder: cfg.preserveCustomOrder !== false,
      playerCount: cfg.playerCount,
      customRosterOrder: cfg.customRosterOrder,
      roleMode: cfg.roleMode ?? 'random',
      manualRolesByIdOrName: cfg.manualRolesByIdOrName,
      stressProfileTargets: cfg.stressProfileTargets,
      matchTags: cfg.matchTags,
      seed: cfg.seed,
      maxPhases: cfg.maxPhases,
      speedMs: cfg.speedMs,
      roleRerollOffset: cfg.roleRerollOffset,
    };
    const body = exportSandboxConfigJson(payload);
    try {
      await Share.share({ message: body, title: 'Sandbox roster JSON' });
    } catch {
      Alert.alert('Export', body.slice(0, 4000));
    }
  }, [buildConfig]);

  const newSeedRerun = useCallback(async () => {
    const ns = (Math.random() * 1e9) | 0;
    setSeedStr(String(ns));
    setRoleRerollOffset(0);
    const cfg = buildConfig({ seed: ns, roleRerollOffset: 0 });
    if (cfg) await run(cfg);
  }, [buildConfig, run]);

  const bumpRoleReroll = useCallback(async () => {
    const next = roleRerollOffset + 1;
    const cfg = buildConfig({ roleRerollOffset: next });
    if (!cfg) return;
    setRoleRerollOffset(next);
    await run(cfg);
  }, [buildConfig, run, roleRerollOffset]);

  const sortedChars = useMemo(() => [...CHARACTERS].sort((a, b) => a.name.localeCompare(b.name)), []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ParchmentTopBarFrame contentStyle={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>AI Simulation</Text>
        <View style={{ width: 44 }} />
      </ParchmentTopBarFrame>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Seed (deterministic)</Text>
        <TextInput style={styles.input} value={seedStr} onChangeText={setSeedStr} keyboardType="number-pad" />

        <Text style={styles.label}>Roster mode</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.chip, rosterMode === 'random' && styles.chipOn]}
            onPress={() => setRosterMode('random')}
          >
            <Text style={[styles.chipText, rosterMode === 'random' && styles.chipTextOn]}>Random</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, rosterMode === 'custom' && styles.chipOn]}
            onPress={() => setRosterMode('custom')}
          >
            <Text style={[styles.chipText, rosterMode === 'custom' && styles.chipTextOn]}>Custom</Text>
          </TouchableOpacity>
        </View>

        {rosterMode === 'random' ? (
          <>
            <Text style={styles.label}>Players 6–10</Text>
            <TextInput style={styles.input} value={playerCount} onChangeText={setPlayerCount} keyboardType="number-pad" />
            <Text style={styles.label}>Stress profile (random roster only)</Text>
            <Text style={styles.hint}>Min seats: manipulative (dec≥70), emotional (emo≥72), cautious (cau≥72)</Text>
            <View style={styles.triRow}>
              <TextInput
                style={styles.triInput}
                value={stressM}
                onChangeText={setStressM}
                keyboardType="number-pad"
                placeholder="Manip"
              />
              <TextInput
                style={styles.triInput}
                value={stressE}
                onChangeText={setStressE}
                keyboardType="number-pad"
                placeholder="Emo"
              />
              <TextInput
                style={styles.triInput}
                value={stressC}
                onChangeText={setStressC}
                keyboardType="number-pad"
                placeholder="Caut"
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.label}>Tap to add/remove (6–10, order = seat order)</Text>
            <TouchableOpacity style={styles.smallBtn} onPress={() => setPreserveOrder((x) => !x)}>
              <Text style={styles.smallBtnText}>{preserveOrder ? 'Order: fixed' : 'Order: shuffle body'}</Text>
            </TouchableOpacity>
            <Text style={styles.monoSmall}>Selected ({selectedIds.length}): {selectedIds.join(' → ') || '—'}</Text>
            <View style={styles.charGrid}>
              {sortedChars.map((c) => {
                const on = selectedIds.includes(c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.charChip, on && styles.charChipOn]}
                    onPress={() => toggleCharacter(c.id)}
                  >
                    <Text style={[styles.charChipText, on && styles.charChipTextOn]} numberOfLines={1}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.label}>Presets (sets custom roster)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
          {listSandboxPresets().map((p) => (
            <TouchableOpacity key={p.id} style={styles.presetChip} onPress={() => applyPreset(p.id)}>
              <Text style={styles.presetChipText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Roles</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.chip, roleMode === 'random' && styles.chipOn]} onPress={() => setRoleMode('random')}>
            <Text style={[styles.chipText, roleMode === 'random' && styles.chipTextOn]}>Random roles</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, roleMode === 'manual' && styles.chipOn]} onPress={() => setRoleMode('manual')}>
            <Text style={[styles.chipText, roleMode === 'manual' && styles.chipTextOn]}>Manual JSON</Text>
          </TouchableOpacity>
        </View>
        {roleMode === 'manual' ? (
          <TextInput
            style={styles.jsonInput}
            value={manualRolesJson}
            onChangeText={setManualRolesJson}
            multiline
            autoCapitalize="none"
          />
        ) : null}

        <Text style={styles.label}>Max phases</Text>
        <TextInput style={styles.input} value={maxPhases} onChangeText={setMaxPhases} keyboardType="number-pad" />

        <Text style={styles.label}>Speed ms (0 = instant)</Text>
        <TextInput style={styles.input} value={speedMs} onChangeText={setSpeedMs} keyboardType="number-pad" />

        <TouchableOpacity style={styles.runBtn} onPress={() => void run()} disabled={busy} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color="#f8efd2" /> : <Text style={styles.runText}>Run match</Text>}
        </TouchableOpacity>

        <Text style={styles.label}>Rerun controls</Text>
        <View style={styles.rowWrap}>
          <TouchableOpacity style={styles.smallBtn} onPress={newSeedRerun} disabled={busy}>
            <Text style={styles.smallBtnText}>New seed, same roster</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallBtn} onPress={bumpRoleReroll} disabled={busy}>
            <Text style={styles.smallBtnText}>Same seed · reshuffle roles ({roleRerollOffset + 1})</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Import / export JSON</Text>
        <TextInput
          style={styles.jsonInput}
          value={importJson}
          onChangeText={setImportJson}
          multiline
          placeholder="Paste exported JSON…"
          autoCapitalize="none"
        />
        <View style={styles.rowWrap}>
          <TouchableOpacity style={styles.smallBtn} onPress={applyImport}>
            <Text style={styles.smallBtnText}>Apply import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallBtn} onPress={() => void exportJson()}>
            <Text style={styles.smallBtnText}>Export / share</Text>
          </TouchableOpacity>
        </View>

        {snapshot?.matchMeta ? (
          <View style={styles.summary}>
            <Text style={styles.h2}>Last match meta</Text>
            <Text style={styles.mono}>seed={snapshot.matchMeta.seed} roles={snapshot.matchMeta.roleMode}</Text>
            <Text style={styles.mono}>rosterMode={snapshot.matchMeta.rosterMode} orderFixed={String(snapshot.matchMeta.orderPreserved)}</Text>
            <Text style={styles.mono}>
              mix N/E/M/H: {snapshot.matchMeta.difficultyMix.Novice}/{snapshot.matchMeta.difficultyMix.Easy}/
              {snapshot.matchMeta.difficultyMix.Medium}/{snapshot.matchMeta.difficultyMix.Hard}
            </Text>
            <Text style={styles.mono} numberOfLines={4}>
              tags: {snapshot.matchMeta.tags.join(' · ')}
            </Text>
            <Text style={styles.mono} numberOfLines={3}>
              roster: {snapshot.matchMeta.roster.map((r) => r.name).join(', ')}
            </Text>
          </View>
        ) : null}

        {summary ? (
          <View style={styles.summary}>
            <Text style={styles.h2}>Summary</Text>
            <Text style={styles.mono}>
              stuck={String(summary.stuck.stuck)} repeats={summary.stuck.repeatCount}
            </Text>
            <Text style={styles.mono}>
              manipulative:{' '}
              {summary.mostManipulative.map((m) => `${m.name}:${m.score}`).join(' · ')}
            </Text>
            <Text style={styles.mono}>
              irrational: {summary.irrational.filter((x) => x.kind !== 'none').length || 'none'}
            </Text>
          </View>
        ) : null}

        {selectedId ? (
          <AiDebugPanel
            snapshot={snapshot}
            summary={summary}
            selectedPlayerId={selectedId}
            onSelectPlayer={setSelectedId}
          />
        ) : null}

        <Text style={styles.h2}>Log tail</Text>
        <ScrollView style={styles.logBox} nestedScrollEnabled>
          {logTail.map((line, i) => (
            <Text key={i} style={styles.logLine} numberOfLines={3}>
              {line}
            </Text>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SDV.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  back: { padding: 8 },
  backText: { fontSize: 18, fontWeight: '900', color: SDV.ink },
  title: { fontSize: 15, fontWeight: '900', color: SDV.ink },
  body: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: '800', color: SDV.ink, marginBottom: 4, marginTop: 8 },
  hint: { fontSize: 10, color: SDV.subtext, marginBottom: 6 },
  input: {
    borderWidth: 2,
    borderColor: SDV.wood,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    backgroundColor: SDV.panelLight,
    fontWeight: '600',
  },
  jsonInput: {
    borderWidth: 2,
    borderColor: SDV.wood,
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    marginBottom: 8,
    backgroundColor: SDV.panelLight,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: SDV.panel },
  chipOn: gameWoodButtonFace('default'),
  chipText: { fontSize: 11, fontWeight: '800', color: SDV.ink },
  chipTextOn: gameWoodButtonLabel('default'),
  charGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  charChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, backgroundColor: SDV.panel, borderWidth: 2, borderColor: SDV.wood },
  charChipOn: { ...gameWoodButtonFace('default'), borderWidth: GAME_WOOD_BTN.borderWidth, borderColor: GAME_WOOD_BTN.border },
  charChipText: { fontSize: 10, fontWeight: '700', maxWidth: 96, color: SDV.ink },
  charChipTextOn: gameWoodButtonLabel('default'),
  presetRow: { maxHeight: 44, marginBottom: 8 },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
    ...gameWoodButtonFace('default'),
  },
  presetChipText: { fontSize: 10, fontWeight: '800', ...gameWoodButtonLabel('default') },
  triRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  triInput: { flex: 1, borderWidth: 2, borderColor: SDV.wood, borderRadius: 8, padding: 8, backgroundColor: SDV.panelLight },
  runBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 12,
    ...gameWoodButtonFace('default'),
  },
  runText: { ...gameWoodButtonLabel('default'), fontWeight: '900' },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: SDV.panel, borderWidth: 2, borderColor: SDV.wood },
  smallBtnText: { fontSize: 10, fontWeight: '800', color: SDV.ink },
  summary: { marginBottom: 12 },
  h2: { fontSize: 14, fontWeight: '900', marginBottom: 6, color: SDV.ink },
  mono: { fontSize: 10, lineHeight: 14, color: SDV.ink, marginBottom: 4 },
  monoSmall: { fontSize: 9, color: SDV.subtext, marginBottom: 6 },
  logBox: { maxHeight: 200, backgroundColor: SDV.panel, borderRadius: 8, padding: 8, borderWidth: 2, borderColor: SDV.wood },
  logLine: { fontSize: 9, marginBottom: 4, color: SDV.subtext },
});
