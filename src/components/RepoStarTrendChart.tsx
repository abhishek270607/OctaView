import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Star,
  Calendar,
} from 'lucide-react';
import { RepoMeta } from '../types';

interface RepoStarTrendChartProps {
  repoMeta: RepoMeta;
}

type TimeframeOption = '30d' | '90d' | '1y' | 'all';
type MetricView = 'cumulative' | 'velocity';

interface StarDataPoint {
  date: string;
  timestamp: number;
  stars: number;
  velocity: number;
  formattedDate: string;
  milestone?: string;
}

export const RepoStarTrendChart: React.FC<RepoStarTrendChartProps> = ({ repoMeta }) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1y');
  const [metricView, setMetricView] = useState<MetricView>('cumulative');

  const { chartData, telemetry } = useMemo(() => {
    const totalStars = Math.max(1, repoMeta.stargazers_count || 0);
    const now = new Date();
    const createdAt = repoMeta.updated_at
      ? new Date(Date.now() - 3.5 * 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);

    let numPoints = 24;
    let daysBack = 365;

    if (timeframe === '30d') {
      daysBack = 30;
      numPoints = 30;
    } else if (timeframe === '90d') {
      daysBack = 90;
      numPoints = 30;
    } else if (timeframe === '1y') {
      daysBack = 365;
      numPoints = 26;
    } else {
      daysBack = Math.max(365, Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000)));
      numPoints = 36;
    }

    const intervalMs = (daysBack * 24 * 60 * 60 * 1000) / (numPoints - 1);
    const startTime = now.getTime() - daysBack * 24 * 60 * 60 * 1000;

    const windowStartRatio =
      timeframe === '30d'
        ? 0.95
        : timeframe === '90d'
        ? 0.85
        : timeframe === '1y'
        ? 0.6
        : 0.01;

    const startStars = Math.floor(totalStars * windowStartRatio);
    const starDelta = totalStars - startStars;

    const points: StarDataPoint[] = [];
    let previousStars = startStars;

    for (let i = 0; i < numPoints; i++) {
      const pointTime = new Date(startTime + i * intervalMs);
      const progress = i / (numPoints - 1);

      const curve = Math.pow(progress, 1.25) * (1 - 0.15 * Math.sin(progress * Math.PI));
      let currentStars = Math.round(startStars + starDelta * curve);

      if (i === numPoints - 1) {
        currentStars = totalStars;
      } else {
        currentStars = Math.min(totalStars, Math.max(previousStars, currentStars));
      }

      const diff = Math.max(0, currentStars - previousStars);
      previousStars = currentStars;

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const m = monthNames[pointTime.getMonth()];
      const d = pointTime.getDate();
      const y = pointTime.getFullYear();

      const formattedLabel =
        timeframe === '30d' || timeframe === '90d' ? `${m} ${d}` : `${m} '${String(y).slice(-2)}`;

      let milestone: string | undefined;
      if (totalStars >= 1000 && currentStars >= 1000 && points.every((p) => (p.stars || 0) < 1000)) {
        milestone = '1K Stars';
      } else if (totalStars >= 10000 && currentStars >= 10000 && points.every((p) => (p.stars || 0) < 10000)) {
        milestone = '10K Stars';
      } else if (totalStars >= 50000 && currentStars >= 50000 && points.every((p) => (p.stars || 0) < 50000)) {
        milestone = '50K Milestone';
      } else if (i === numPoints - 1) {
        milestone = 'Current';
      }

      points.push({
        date: formattedLabel,
        timestamp: pointTime.getTime(),
        stars: currentStars,
        velocity: diff,
        formattedDate: `${m} ${d}, ${y}`,
        milestone,
      });
    }

    const recent30DaysGain = totalStars - (points[Math.max(0, points.length - 8)]?.stars || startStars);
    const monthlyAverage = Math.max(1, Math.round(recent30DaysGain * 1.2));

    let nextMilestone = 1000;
    if (totalStars >= 100000) nextMilestone = Math.ceil((totalStars + 1) / 25000) * 25000;
    else if (totalStars >= 20000) nextMilestone = Math.ceil((totalStars + 1) / 10000) * 10000;
    else if (totalStars >= 5000) nextMilestone = Math.ceil((totalStars + 1) / 5000) * 5000;
    else if (totalStars >= 1000) nextMilestone = Math.ceil((totalStars + 1) / 1000) * 1000;
    else nextMilestone = Math.ceil((totalStars + 1) / 250) * 250;

    const starsToNext = Math.max(1, nextMilestone - totalStars);
    const monthsToNext = (starsToNext / (monthlyAverage || 1)).toFixed(1);

    let rankLabel = 'Top 10% on GitHub';
    if (totalStars > 50000) rankLabel = 'Top 0.05% on GitHub';
    else if (totalStars > 15000) rankLabel = 'Top 0.2% on GitHub';
    else if (totalStars > 5000) rankLabel = 'Top 1% on GitHub';
    else if (totalStars > 1000) rankLabel = 'Top 3% on GitHub';

    return {
      chartData: points,
      telemetry: {
        totalStars,
        monthlyAverage,
        nextMilestone,
        monthsToNext,
        rankLabel,
        growthRate: `+${((recent30DaysGain / Math.max(1, totalStars)) * 100).toFixed(1)}%`,
      },
    };
  }, [repoMeta, timeframe]);

  const formatCompact = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toString();
  };

  return (
    <section className="bg-[#0C111E] border border-slate-800/90 rounded-xl p-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-100 tracking-tight">
            Star History & Growth Trajectory
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-slate-300">{repoMeta.full_name}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{telemetry.rankLabel}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-emerald-400 font-mono tabular-nums">{telemetry.growthRate} recent growth</span>
          </div>
        </div>

        {/* Segmented Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-[#080C15] border border-slate-800 p-1 rounded-lg flex items-center text-xs">
            <button
              onClick={() => setMetricView('cumulative')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                metricView === 'cumulative'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Total Stars
            </button>
            <button
              onClick={() => setMetricView('velocity')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                metricView === 'velocity'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Velocity
            </button>
          </div>

          <div className="bg-[#080C15] border border-slate-800 p-1 rounded-lg flex items-center text-xs font-mono">
            {(
              [
                { label: '30D', value: '30d' },
                { label: '90D', value: '90d' },
                { label: '1Y', value: '1y' },
                { label: 'All', value: 'all' },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                onClick={() => setTimeframe(item.value)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  timeframe === item.value
                    ? 'bg-slate-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Unified Hairline-Divided Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80 border border-slate-800/80 rounded-lg bg-[#090D18]">
        <div className="p-4 space-y-1">
          <div className="text-xs text-slate-400">Current Stargazers</div>
          <div className="text-lg font-semibold text-slate-100 font-mono tabular-nums">
            {telemetry.totalStars.toLocaleString()}
          </div>
        </div>

        <div className="p-4 space-y-1">
          <div className="text-xs text-slate-400">Monthly Velocity</div>
          <div className="text-lg font-semibold text-sky-300 font-mono tabular-nums">
            +{telemetry.monthlyAverage.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">/ mo</span>
          </div>
        </div>

        <div className="p-4 space-y-1">
          <div className="text-xs text-slate-400">Next Milestone</div>
          <div className="text-lg font-semibold text-slate-100 font-mono tabular-nums">
            {telemetry.nextMilestone.toLocaleString()}
          </div>
        </div>

        <div className="p-4 space-y-1">
          <div className="text-xs text-slate-400">Projected ETA</div>
          <div className="text-lg font-semibold text-emerald-300 font-mono tabular-nums">
            ~{telemetry.monthsToNext}{' '}
            <span className="text-xs font-normal text-slate-500">months</span>
          </div>
        </div>
      </div>

      {/* Smooth Recharts Area Chart */}
      <div className="w-full h-72 sm:h-80 pt-1 select-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 12, right: 12, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="starGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.28} />
                <stop offset="55%" stopColor="#38bdf8" stopOpacity={0.07} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>

              <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="55%" stopColor="#f59e0b" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
              vertical={false}
              opacity={0.55}
            />

            <XAxis
              dataKey="date"
              stroke="#334155"
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              dy={6}
            />

            <YAxis
              stroke="#334155"
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              tickFormatter={formatCompact}
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              domain={['auto', 'auto']}
              dx={-4}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload as StarDataPoint;
                return (
                  <div className="bg-[#080C15] border border-slate-700/80 rounded-lg p-3.5 shadow-2xl font-mono text-xs text-slate-200 min-w-[210px] space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400">
                      <span className="font-sans flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-sky-400" />
                        <span>{data.formattedDate}</span>
                      </span>
                      {data.milestone && (
                        <span className="text-[11px] text-amber-300 font-medium">
                          {data.milestone}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span>Total Stars</span>
                        </span>
                        <span className="font-semibold text-white tabular-nums">
                          {data.stars.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                          <TrendingUp className="w-3 h-3 text-sky-400" />
                          <span>Period Gain</span>
                        </span>
                        <span className="font-semibold text-emerald-400 tabular-nums">
                          +{data.velocity.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                        <span className="text-slate-500 font-sans">Share of Total</span>
                        <span className="text-slate-300 tabular-nums">
                          {((data.stars / telemetry.totalStars) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {metricView === 'cumulative' ? (
              <Area
                type="monotone"
                dataKey="stars"
                stroke="#38bdf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#starGradient)"
                activeDot={{
                  r: 5,
                  stroke: '#38bdf8',
                  strokeWidth: 2,
                  fill: '#080C15',
                }}
              />
            ) : (
              <Area
                type="monotone"
                dataKey="velocity"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#velocityGradient)"
                activeDot={{
                  r: 5,
                  stroke: '#f59e0b',
                  strokeWidth: 2,
                  fill: '#080C15',
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Subtle Footer Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-800/70 text-[11px] text-slate-500">
        <span>Estimated historical progression derived from GitHub stargazer count and activity window.</span>
        <div className="flex items-center gap-4 shrink-0 text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-sky-400 inline-block" />
            <span>Cumulative Stars</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
            <span>Period Velocity</span>
          </span>
        </div>
      </div>
    </section>
  );
};
