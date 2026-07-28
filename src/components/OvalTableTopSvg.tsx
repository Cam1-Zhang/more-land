import React, { useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import Svg, { Ellipse, Rect, Defs, ClipPath, G } from 'react-native-svg';

type Props = {
  width: number;
  height: number;
  /** 外圈（桌沿木纹主色） */
  rimFill?: string;
  /** 内圈（台面深色底，格纹叠在上面） */
  surfaceFill?: string;
};

/**
 * 俯视椭圆桌：粗描边 + 木纹外圈 + 内圈像素格纹绿呢（clip），整体偏像素桌游风。
 */
export default function OvalTableTopSvg({
  width,
  height,
  rimFill = '#6b4423',
  surfaceFill = '#14261c',
}: Props) {
  const clipIdRef = useRef(`felt_${Math.random().toString(36).slice(2, 12)}`);
  const clipId = clipIdRef.current;

  if (width < 8 || height < 8) return null;

  const cx = width / 2;
  const cy = height / 2;
  const strokeOuter = Math.max(3, Math.round(Math.min(width, height) * 0.012));
  const strokeInner = Math.max(2, Math.round(strokeOuter * 0.75));
  const pad = strokeOuter;
  const rxo = Math.max(2, width / 2 - pad);
  const ryo = Math.max(2, height / 2 - pad);
  const inset = Math.max(6, Math.min(width, height) * 0.065);
  const rxi = Math.max(1, rxo - inset);
  const ryi = Math.max(1, ryo - inset);

  const feltRects = useMemo(() => {
    const stride = Math.max(8, Math.round(Math.min(width, height) / 22));
    const cells: React.ReactElement[] = [];
    let key = 0;
    const x0 = Math.floor(cx - rxi);
    const y0 = Math.floor(cy - ryi);
    const x1 = Math.ceil(cx + rxi);
    const y1 = Math.ceil(cy + ryi);
    for (let gy = y0; gy < y1; gy += stride) {
      for (let gx = x0; gx < x1; gx += stride) {
        const mx = gx + stride / 2;
        const my = gy + stride / 2;
        const nx = (mx - cx) / rxi;
        const ny = (my - cy) / ryi;
        if (nx * nx + ny * ny > 1.01) continue;
        const checker = (Math.floor(gx / stride) + Math.floor(gy / stride)) % 2;
        const fill = checker ? '#163027' : '#1a3d2c';
        cells.push(<Rect key={key++} x={gx} y={gy} width={stride} height={stride} fill={fill} />);
      }
    }
    return cells;
  }, [cx, cy, rxi, ryi, width, height]);

  const rimHighlight = '#8b5a2e';
  const rimShadow = '#3d2918';

  const webCrisp =
    Platform.OS === 'web'
      ? ({ shapeRendering: 'crispEdges' } as Record<string, string>)
      : undefined;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} {...webCrisp}>
      <Defs>
        <ClipPath id={clipId}>
          <Ellipse cx={cx} cy={cy} rx={rxi} ry={ryi} />
        </ClipPath>
      </Defs>

      <Ellipse
        cx={cx}
        cy={cy}
        rx={rxo + 1}
        ry={ryo + 1}
        fill={rimShadow}
        stroke="#0d0a08"
        strokeWidth={strokeOuter + 1}
      />
      <Ellipse
        cx={cx}
        cy={cy}
        rx={rxo}
        ry={ryo}
        fill={rimFill}
        stroke="#0d0a08"
        strokeWidth={strokeOuter}
      />
      <Ellipse
        cx={cx}
        cy={cy - Math.max(1, strokeOuter * 0.15)}
        rx={rxo - strokeOuter * 0.35}
        ry={ryo - strokeOuter * 0.35}
        fill="none"
        stroke={rimHighlight}
        strokeWidth={1.5}
        opacity={0.55}
      />

      <Ellipse cx={cx} cy={cy} rx={rxi} ry={ryi} fill={surfaceFill} stroke="#0d0a08" strokeWidth={strokeInner} />
      <G clipPath={`url(#${clipId})`}>{feltRects}</G>

      <Ellipse
        cx={cx}
        cy={cy}
        rx={rxi}
        ry={ryi}
        fill="none"
        stroke="#0a1610"
        strokeWidth={Math.max(2, strokeInner)}
      />
    </Svg>
  );
}
