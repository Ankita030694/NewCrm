import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

import { getChartOptions } from '../utils/chartConfigs';
import { useTheme } from '../context/ThemeContext';

interface LazyChartsProps {
  chartData: any;
}

const LazyCharts: React.FC<LazyChartsProps> = ({ chartData }) => {
  const { theme } = useTheme();
  const options = getChartOptions(theme);

  return (
    <div className="h-48">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default LazyCharts; 