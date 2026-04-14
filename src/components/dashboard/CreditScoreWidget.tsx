/**
 * CreditScoreWidget — simulated credit score display for all plan tiers.
 * Shows a visual gauge + score range derived from quiz_data if available.
 * When a real credit bureau API is connected, swap the score source here.
 */

import React from "react";
import { TrendingUp, AlertCircle, Info } from "lucide-react";
import type { Profile } from "@/types/database";

interface CreditScoreWidgetProps {
  profile: Profile | null;
}

function getScoreFromProfile(profile: Profile | null): {
  score: number;
  label: string;
  color: string;
  ringColor: string;
  change: number | null;
} {
  // If quiz_data has a score range, use midpoint
  const quizData = profile?.quiz_data as Record<string, unknown> | null;
  const rawScore = quizData?.score as string | undefined;

  let score = 620; // default mid-range
  if (rawScore) {
    const parsed = parseInt(rawScore, 10);
    if (!isNaN(parsed)) score = parsed;
    else if (rawScore === "below_500") score = 480;
    else if (rawScore === "500_550")   score = 525;
    else if (rawScore === "550_600")   score = 575;
    else if (rawScore === "600_650")   score = 625;
    else if (rawScore === "650_700")   score = 675;
    else if (rawScore === "700_750")   score = 725;
    else if (rawScore === "above_750") score = 760;
  }

  if (score < 580)       return { score, label: "Poor",      color: "text-red-600",    ringColor: "#ef4444", change: null };
  if (score < 670)       return { score, label: "Fair",      color: "text-orange-500", ringColor: "#f97316", change: null };
  if (score < 740)       return { score, label: "Good",      color: "text-yellow-500", ringColor: "#eab308", change: null };
  if (score < 800)       return { score, label: "Very Good", color: "text-emerald-500",ringColor: "#10b981", change: null };
  return                        { score, label: "Exceptional",color: "text-emerald-600",ringColor: "#059669", change: null };
}

/** Render an SVG arc gauge */
function ScoreGauge({ score, ringColor }: { score: number; ringColor: string }) {
  const min = 300, max = 850;
  const pct = (score - min) / (max - min); // 0–1
  const radius = 54;
  const circumference = Math.PI * radius; // half circle
  const strokeDash = circumference * pct;

  return (
    <svg viewBox="0 0 120 70" className="w-40 h-24">
      {/* Track */}
      <path
        d="M 10 65 A 50 50 0 0 1 110 65"
        fill="none"
        stroke="#e4e4e7"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Progress */}
      <path
        d="M 10 65 A 50 50 0 0 1 110 65"
        fill="none"
        stroke={ringColor}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${strokeDash} ${circumference}`}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      {/* Score label */}
      <text x="60" y="58" textAnchor="middle" fontSize="20" fontWeight="700" fill="#111111">
        {score}
      </text>
    </svg>
  );
}

export function CreditScoreWidget({ profile }: CreditScoreWidgetProps) {
  const { score, label, color, ringColor } = getScoreFromProfile(profile);
  const quizData = profile?.quiz_data as Record<string, unknown> | null;
  const negativeItems = profile?.negative_items ?? (quizData?.negative_items as number | undefined) ?? null;

  return (
    <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Credit Score Overview</h2>
          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Estimated based on your profile — connect bureau for live data
          </p>
        </div>
        <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">
          Estimated
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-8">
        {/* Gauge */}
        <div className="flex flex-col items-center gap-1">
          <ScoreGauge score={score} ringColor={ringColor} />
          <span className={`text-sm font-bold ${color}`}>{label}</span>
          <span className="text-xs text-zinc-400">300 — 850 scale</span>
        </div>

        {/* Stats */}
        <div className="flex-1 grid grid-cols-2 gap-4 w-full">
          <StatCard
            label="Score Range"
            value={score < 580 ? "Poor" : score < 670 ? "Fair" : score < 740 ? "Good" : "Very Good"}
            icon={<TrendingUp className="h-4 w-4" />}
            color={color}
          />
          <StatCard
            label="Est. Negative Items"
            value={negativeItems != null ? `${negativeItems}` : "Unknown"}
            icon={<AlertCircle className="h-4 w-4" />}
            color="text-orange-500"
          />
          <StatCard
            label="Improvement Potential"
            value={score < 620 ? "High" : score < 720 ? "Moderate" : "Low"}
            icon={<TrendingUp className="h-4 w-4" />}
            color="text-emerald-500"
          />
          <StatCard
            label="Priority Timeline"
            value={score < 580 ? "Urgent" : score < 670 ? "30-60 days" : "60-90 days"}
            icon={<AlertCircle className="h-4 w-4" />}
            color="text-blue-500"
          />
        </div>
      </div>

      {/* Connect real bureau CTA */}
      <div className="mt-6 rounded-xl bg-zinc-50 border border-zinc-200 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Connect your credit bureau</p>
          <p className="text-xs text-zinc-500 mt-0.5">Get your real score from all 3 bureaus — coming soon</p>
        </div>
        <button
          disabled
          className="shrink-0 rounded-full bg-zinc-200 px-4 py-2 text-xs font-medium text-zinc-400 cursor-not-allowed"
        >
          Coming Soon
        </button>
      </div>
    </section>
  );
}

function StatCard({ label, value, icon, color }: {
  label: string; value: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
      <div className={`flex items-center gap-1.5 ${color} mb-1`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-sm font-bold text-zinc-900">{value}</p>
    </div>
  );
}
