/**
 * TruthLikelihoodChart — the Level 3 "substance visualisation" (plan Part 5).
 *
 * recharts ComposedChart:
 *   - Historical truth-likelihood as a solid line+dots, color-coded
 *   - Forecast trajectory as a dashed line
 *   - CI cone (Area between ci_low/ci_high) shaded grey
 *   - Vertical reference lines: "Today" + "Resolution"
 *   - NO grid lines beyond the reference lines
 *   - NO legend (the verdict line above the chart explains it)
 *
 * Y-axis labels in PLAIN ENGLISH ("Almost certainly fails / Coin flip / Almost
 * certainly holds"), not "Truth-likelihood".
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
  /** ISO date string for "today" reference; defaults to projection.current.as_of equivalent. */
  todayLabel?: string;
}

interface ChartPoint {
  cycle_date: string;
  historical?: number;
  forecast?: number;
  ci_low?: number;
  ci_high?: number;
}

function buildChartData(projection: CrowsNestProjection): { points: ChartPoint[]; todayDate: string } {
  const points: ChartPoint[] = [];

  // Historical
  const history = projection.history || [];
  for (const h of history) {
    points.push({
      cycle_date: h.cycle_date,
      historical: h.truth_likelihood,
    });
  }

  // The "today" boundary is the last historical cycle
  const todayDate = history.length > 0 ? history[history.length - 1].cycle_date : '';

  // Bridge point: ensure forecast line connects from the last historical point
  const lastHist = history[history.length - 1];
  if (lastHist) {
    points[points.length - 1].forecast = lastHist.truth_likelihood;
  }

  // Forecast trajectory
  for (const f of projection.forecast_trajectory || []) {
    points.push({
      cycle_date: f.cycle_date,
      forecast: f.truth_likelihood,
      ci_low: f.ci_low,
      ci_high: f.ci_high,
    });
  }

  return { points, todayDate };
}

const CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ payload: ChartPoint }> }> = ({
  active,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const value = point.historical ?? point.forecast;
  if (value === undefined) return null;
  const isFcst = point.historical === undefined;
  return (
    <div className="rounded-lg border border-border/60 bg-background/95 p-3 text-xs shadow-md">
      <div className="font-medium">{point.cycle_date}</div>
      <div className="text-muted-foreground">
        {isFcst ? 'forecast' : 'historical'} · {Math.round(value * 100)}% likely the bet holds
      </div>
      {isFcst && point.ci_low !== undefined && point.ci_high !== undefined ? (
        <div className="text-muted-foreground/70 text-[10px] mt-0.5">
          uncertainty band: {Math.round(point.ci_low * 100)}–{Math.round(point.ci_high * 100)}%
        </div>
      ) : null}
    </div>
  );
};

export const TruthLikelihoodChart: React.FC<TruthLikelihoodChartProps> = ({ projection }) => {
  const { points, todayDate } = buildChartData(projection);

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 bg-muted/20 p-6 text-sm text-muted-foreground">
        No history or forecast on file for this projection.
      </div>
    );
  }

  const currentTl = projection.current.truth_likelihood;
  const currentColor = truthLikelihoodToHex(currentTl);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={points} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
          <XAxis
            dataKey="cycle_date"
            tickFormatter={(v: string) => v.slice(0, 7)} // YYYY-MM
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
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* CI cone — only on forecast points */}
          <Area
            type="monotone"
            dataKey="ci_high"
            stroke="none"
            fill="#94a3b8"
            fillOpacity={0.12}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="ci_low"
            stroke="none"
            fill="#ffffff"
            fillOpacity={1}
            isAnimationActive={false}
          />

          {/* Historical line — solid, color-coded by current state */}
          <Line
            type="monotone"
            dataKey="historical"
            stroke={currentColor}
            strokeWidth={2.5}
            dot={{ r: 3, fill: currentColor }}
            connectNulls={false}
            isAnimationActive={false}
          />
          {/* Forecast line — dashed */}
          <Line
            type="monotone"
            dataKey="forecast"
            stroke={currentColor}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 2, fill: currentColor, fillOpacity: 0.6 }}
            connectNulls={false}
            isAnimationActive={false}
          />

          {/* Reference lines */}
          {todayDate ? (
            <ReferenceLine
              x={todayDate}
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
          ) : null}
          <ReferenceLine
            x={projection.resolution_date}
            stroke="#64748b"
            strokeWidth={1}
            strokeDasharray="2 4"
            label={{
              value: `resolves ${projection.resolution_date.slice(0, 7)}`,
              position: 'insideTopRight',
              fill: '#64748b',
              fontSize: 9,
            }}
          />
          {/* 50% (coin flip) reference */}
          <ReferenceLine y={0.5} stroke="#94a3b8" strokeDasharray="2 6" strokeOpacity={0.3} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>← {(projection.history || []).length} historical cycles</span>
        <span>{(projection.forecast_trajectory || []).length} forecast cycles →</span>
      </div>
    </div>
  );
};
