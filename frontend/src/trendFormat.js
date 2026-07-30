export function formatTrend(delta) {
  if (delta > 0) return { trend: `+${delta}`, trendTone: "good" };
  if (delta < 0) return { trend: `${delta}`, trendTone: "bad" };
  return { trend: "No change", trendTone: "neutral" };
}
