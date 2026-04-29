/**
 * TruthLikelihoodChart — redesigned for the re-anchor / forward-projection model.
 *
 * Two visually distinct panels meeting at "today":
 *
 *   PAST: actual evidence-driven movement on TL (where research has moved the
 *   bet from prior). Solid line + dots; dot marks annotated when an evidence
 *   card landed.
 *
 *   FORWARD: a reasoned projection — central path (solid widening cone) +
 *   alternate scenario (dashed thinner line). NOT a flat extrapolation: the
 *   shape encodes the analyst's expectation of where TL is going.
 *
 * If the projection has no history (typical at re-anchor; cycle 0), the past
 * panel collapses to a single "anchored at prior" pin and the forward panel
 * shows the cone fanning out to resolution_date.
 *
 * Y-axis is plain English: "almost no / unlikely / coin flip / likely /
 * almost certain". The 50% line is dashed grey.
 */
import React from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  CrowsNestProjection,
  truthLikelihoodToHex,
} from '@/types/crows-nest';

interface TruthLikelihoodChartProps {
  projection: CrowsNestProjection;
  /** ISO date string for "today" reference. */
  todayLabel?: string;
}

interface ChartPoint {
  cycle_date: string;
  past?: number;
  central?: number;
  central_low?: number;
  central_high?: number;
  alternate?: number;
  prior_pin?: number;
}

const TODAY_DEFAULT = '2026-04-30';

function buildChartData(projection: CrowsNestProjection, todayLabel: string): ChartPoint[] {
  const points: ChartPoint[] = [];
  const history = projection.history || [];
  const todayDate = todayLabel;
  const resolutionDate = projection.resolution_date;
  const prior = projection.prior ?? projection.current.truth_likelihood;
  const fp = projection.forward_projection;

  // Past panel: history points + prior pin at "today"
  for (const h of history) {
    if (h.cycle_date <= todayDate) {
      points.push({ cycle_date: h.cycle_date, past: h.truth_likelihood });
    }
  }

  // Always inject a "today" pin at the current TL (whether or not history exists)
  const todayTl = projection.current.truth_likelihood;
  // Replace or insert the today point
  const existingTodayIdx = points.findIndex((p) => p.cycle_date === todayDate);
  if (existingTodayIdx >= 0) {
    points[existingTodayIdx].past = todayTl;
    points[existingTodayIdx].central = todayTl;
    points[existingTodayIdx].central_low = todayTl;
    points[existingTodayIdx].central_high = todayTl;
    points[existingTodayIdx].alternate = todayTl;
    points[existingTodayIdx].prior_pin = prior;
  } else {
    points.push({
      cycle_date: todayDate,
      past: todayTl,
      central: todayTl,
      central_low: todayTl,
      central_high: todayTl,
      alternate: todayTl,
      prior_pin: prior,
    });
  }

  // Forward panel: central path + alternate, fanning out to resolution_date
  if (fp && resolutionDate) {
    const central = fp.central_path;
    const alt = fp.alternate_scenario;
    const expected = central?.expected_tl_at_resolution;
    // Single midpoint between today and resolution to give the cone shape
    const midDate = midpointDate(todayDate, resolutionDate);
    if (midDate && expected) {
      // Mid-cone point — interpolate
      const midLow = (todayTl + expected.low) / 2;
      const midMid = (todayTl + expected.mid) / 2;
      const midHigh = (todayTl + expected.high) / 2;
      const midAlt = alt && typeof alt.tl_at_resolution === 'number'
        ? (todayTl + alt.tl_at_resolution) / 2
        : undefined;
      points.push({
        cycle_date: midDate,
        central: midMid,
        central_low: midLow,
        central_high: midHigh,
        alternate: midAlt,
      });
    }
    if (expected) {
      const altTl = alt && typeof alt.tl_at_resolution === 'number'
        ? alt.tl_at_resolution
        : undefined;
      points.push({
        cycle_date: resolutionDate,
        central: expected.mid,
        central_low: expected.low,
        central_high: expected.high,
        alternate: altTl,
      });
    }
  }

  // Sort by date
  points.sort((a, b) => a.cycle_date.localeCompare(b.cycle_date));
  return points;
}

function midpointDate(d1: string, d2: string): string | null {
  try {
    const t1 = new Date(d1).getTime();
    const t2 = new Date(d2).getTime();
    if (isNaN(t1) || isNaN(t2)) return null;
    const mid = new Date((t1 + t2) / 2);
    return mid.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

const CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ payload: ChartPoint }> }> = ({
  active,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  const isFuture = p.past === undefined;
  return (
    <div className="rounded-lg border border-border/60 bg-background/95 p-3 text-xs shadow-md">
      <div className="font-medium">{p.cycle_date}</div>
      {p.past !== undefined ? (
        <div className="text-muted-foreground">
          observed: {Math.round(p.past * 100)}% likely
        </div>
      ) : null}
      {isFuture && p.central !== undefined ? (
        <div className="text-foreground">
          central path: {Math.round(p.central * 100)}%
          {p.central_low !== undefined && p.central_high !== undefined ? (
            <span className="text-muted-foreground/70">
              {' '}
              ({Math.round(p.central_low * 100)}-{Math.round(p.central_high * 100)})
            </span>
          ) : null}
        </div>
      ) : null}
      {isFuture && p.alternate !== undefined ? (
        <div className="text-amber-600">
          alternate: {Math.round(p.alternate * 100)}%
        </div>
      ) : null}
    </div>
  );
};

export const TruthLikelihoodChart: React.FC<TruthLikelihoodChartProps> = ({
  projection,
  todayLabel = TODAY_DEFAULT,
}) => {
  const points = buildChartData(projection, todayLabel);
  const fp = projection.forward_projection;

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 bg-muted/20 p-6 text-sm text-muted-foreground">
        No data on file for this projection.
      </div>
    );
  }

  const currentTl = projection.current.truth_likelihood;
  const currentColor = truthLikelihoodToHex(currentTl);
  const altColor = '#f59e0b'; // amber for alternate scenario

  const direction = fp?.central_path?.direction;
  const altName = fp?.alternate_scenario?.name;
  const hasHistory = (projection.history || []).filter((h) => h.cycle_date <= todayLabel).length > 0;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={points} margin={{ top: 24, right: 24, left: 8, bottom: 24 }}>
          <XAxis
            dataKey="cycle_date"
            tickFormatter={(v: string) => v.slice(0, 7)}
            tick={{ fontSize: 10, fill: 'currentColor' }}
            stroke="currentColor"
            opacity={0.4}
          />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            tickFormatter={(v: number) => {
              if (v === 0) return 'almost no';
              if (v === 0.25) return 'unlikely';
              if (v === 0.5) return 'coin flip';
              if (v === 0.75) return 'likely';
              if (v === 1) return 'almost certain';
              return '';
            }}
            tick={{ fontSize: 10, fill: 'currentColor' }}
            stroke="currentColor"
            opacity={0.4}
            width={75}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Forward central-path cone — fan out from today to resolution */}
          <Area
            type="monotone"
            dataKey="central_high"
            stroke="none"
            fill={currentColor}
            fillOpacity={0.14}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="central_low"
            stroke="none"
            fill="#ffffff"
            fillOpacity={1}
            isAnimationActive={false}
          />

          {/* Past line — solid, color-coded */}
          <Line
            type="monotone"
            dataKey="past"
            stroke={currentColor}
            strokeWidth={2.5}
            dot={{ r: 3, fill: currentColor }}
            connectNulls={false}
            isAnimationActive={false}
          />

          {/* Forward central-path mid line — solid */}
          <Line
            type="monotone"
            dataKey="central"
            stroke={currentColor}
            strokeWidth={2}
            strokeDasharray="0"
            dot={{ r: 2.5, fill: currentColor, fillOpacity: 0.7 }}
            connectNulls={true}
            isAnimationActive={false}
          />

          {/* Alternate scenario — dashed amber line */}
          <Line
            type="monotone"
            dataKey="alternate"
            stroke={altColor}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={{ r: 2, fill: altColor, fillOpacity: 0.7 }}
            connectNulls={true}
            isAnimationActive={false}
          />

          {/* Reference lines */}
          <ReferenceLine
            x={todayLabel}
            stroke="#f43f5e"
            strokeWidth={1.5}
            strokeDasharray="2 2"
            label={{
              value: 'today',
              position: 'top',
              fill: '#f43f5e',
              fontSize: 10,
              fontWeight: 600,
            }}
          />
          <ReferenceLine
            x={projection.resolution_date}
            stroke="#64748b"
            strokeWidth={1}
            strokeDasharray="2 4"
            label={{
              value: `resolves ${(projection.resolution_date || '').slice(0, 7)}`,
              position: 'insideTopRight',
              fill: '#64748b',
              fontSize: 9,
            }}
          />
          <ReferenceLine y={0.5} stroke="#94a3b8" strokeDasharray="2 6" strokeOpacity={0.3} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {hasHistory
            ? `${(projection.history || []).length} cycle${(projection.history || []).length === 1 ? '' : 's'} of evidence accumulated`
            : 'cycle 0 — anchored at prior, no evidence movement yet'}
        </span>
        <span className="flex items-center gap-3">
          {direction ? (
            <span>central path: {direction}</span>
          ) : null}
          {altName ? (
            <span className="text-amber-600">alternate: {altName}</span>
          ) : null}
        </span>
      </div>
    </div>
  );
};
