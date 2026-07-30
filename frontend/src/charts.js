import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend
);

// Dark theme: default text/gridlines readable on dark card backgrounds.
ChartJS.defaults.color = "#9aa1b1";
ChartJS.defaults.borderColor = "rgba(255, 255, 255, 0.08)";
