// Validated categorical palette (fixed hue order — never cycled arbitrarily).
// Source: dataviz skill reference palette, light-mode steps.
export const CATEGORICAL = {
  blue: "#2a78d6",
  green: "#008300",
  magenta: "#e87ba4",
  yellow: "#eda100",
  aqua: "#1baf7a",
  orange: "#eb6834",
  violet: "#4a3aa7",
  red: "#e34948",
};

// MSU brand pair — validated as a categorical duo (lightness band, CVD
// separation, normal-vision floor all pass; gold needs the relief rule,
// satisfied by the legend/labels already shown on every chart that uses it).
export const MSU_MAROON = "#a52142";
export const MSU_GOLD = "#c9a227";

// Reserved status colors — never reused for arbitrary categories.
export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

export const NEUTRAL_FILL = "#d9d7ce";

// Fixed triplets reused across dashboards for visual consistency:
// - a 3-way identity breakdown (doughnuts)
// - a 3-metric "this period" bar chart
export const TRIPLET_IDENTITY = [MSU_MAROON, MSU_GOLD, CATEGORICAL.aqua];
export const TRIPLET_METRICS = [CATEGORICAL.violet, CATEGORICAL.orange, CATEGORICAL.green];
