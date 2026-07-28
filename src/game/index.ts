/**
 * Game rules layer (wolfcha-style).
 *
 * Pipeline: Phase → Action → Record → Resolve → Next Phase
 *
 * - **Phase / flow** — `phaseConfig`, `phaseFlow`, `flow/*`
 * - **Record** — `state/pendingNight`, `types.nightActionsFromPending`
 * - **Resolve** — `resolve/*`, `utils/nightResolver`, `utils/knightDuel`, …
 * - **Action (AI/human collectors)** — still wired in GameRoomScreen; move to `actions/` incrementally
 *
 * GameRoomScreen = UI + session I/O; this folder = deterministic rules & transitions.
 */

export * from './types';
export * from './phaseConfig';
export * from './phaseFlow';

export * from './state/pendingNight';
export * from './state/runtimePhase';

export * from './flow/boardFlow';
export * from './flow/nightSegmentRunner';

export * from './resolve/buildNightChoices';
export * from './resolve/mergeNightOutcome';
export * from './resolve/wolfBeautyNightAftermath';
export * from './phases/knightDuelResolve';

export * from './info';
