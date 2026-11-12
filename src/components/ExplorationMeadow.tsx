import React, { memo } from 'react';
import Svg, { Defs, G, Path, Pattern, Rect } from 'react-native-svg';

/** Deterministic, pixel-aligned terrain. Kept separate from the moving actors. */
export default memo(function ExplorationMeadow({ width, height }: { width: number; height: number }) {
  const flowers = Array.from({ length: Math.floor(width * height / 1800) }, (_, i) => ({
    x: 24 + ((i * 137 + 53) % Math.max(1, Math.floor(width - 48))),
    y: 40 + ((i * 79 + 31) % Math.max(1, Math.floor(height - 62))),
  }));
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <Defs>
        <Pattern id="grass" width="48" height="40" patternUnits="userSpaceOnUse">
          <Rect width="48" height="40" fill="#91b957" />
          <Path d="M4 8h2v3h2V7h2v6H6v-2H4z M30 28h2v3h2v-5h2v7h-4v-2h-2z" fill="#7ca34a" />
          <Path d="M21 17h3v1h-3z M39 5h2v1h-2z M8 32h3v1H8z" fill="#a8c96c" />
          <Path d="M17 36h1v2h-1z M43 21h2v1h-2z" fill="#85ad50" />
        </Pattern>
        <Pattern id="hedge" width="32" height="24" patternUnits="userSpaceOnUse">
          <Rect width="32" height="24" fill="#436740" />
          <Path d="M0 4h5V1h15v4h8v12h-6v4H6v-3H0z" fill="#577f43" />
          <Path d="M3 5h7V3h9v4h7v5h-9v3H6v-4H3z" fill="#6d934b" />
          <Path d="M8 5h7v2H8z M19 10h4v2h-4z" fill="#89aa58" />
        </Pattern>
        <Pattern id="fence" width="32" height="20" patternUnits="userSpaceOnUse">
          <Rect y="7" width="32" height="3" fill="#65462e" />
          <Rect y="4" width="32" height="3" fill="#c99b60" />
          <Rect x="3" y="1" width="5" height="17" fill="#65462e" />
          <Rect x="3" width="4" height="15" fill="#d4ad70" />
          <Rect x="3" width="2" height="14" fill="#e8c78b" />
        </Pattern>
      </Defs>
      <Rect width={width} height={height} fill="url(#grass)" />
      <Rect width={width} height="26" fill="#709648" />
      <Rect width={width} height="20" fill="url(#hedge)" />
      <Rect y="20" width={width} height="20" fill="url(#fence)" />
      <Rect y={height - 10} width={width} height="10" fill="#789f48" />
      <Rect width="8" height={height} fill="#709648" />
      <Rect x={width - 8} width="8" height={height} fill="#709648" />
      {flowers.map(({ x, y }, i) => (
        <G key={i} transform={`translate(${x},${y})`}>
          <Path d="M0 3h1v4h-1z M-2 5h2v1h-2z" fill="#598343" />
          <Path d="M-1 0h2v1h2v2H1v1h-2V3h-2V1h2z" fill={i % 4 === 0 ? '#eecb78' : '#f3edc7'} />
          <Rect width="1" height="2" y="1" fill="#c39447" />
        </G>
      ))}
      {[24, width - 40].map((x, i) => (
        <G key={i} transform={`translate(${x},${height - 32})`}>
          <Path d="M0 7h4V2h12v3h5v12H0z" fill="#6f795b" />
          <Path d="M2 6h4V2h10v4h3v5H2z" fill="#a2a488" />
          <Path d="M6 3h8v2H6z" fill="#c3bc97" />
          <Path d="M-3 12h2v5h3v-4h2v7h-7z" fill="#598343" />
        </G>
      ))}
    </Svg>
  );
});
