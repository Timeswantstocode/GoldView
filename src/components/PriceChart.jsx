import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, registerables, Filler, Tooltip,
  Legend, CategoryScale, LinearScale, PointElement, LineElement
} from 'chart.js';

ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const PriceChart = React.forwardRef((props, ref) => {
  return <Line {...props} ref={ref} />;
});

PriceChart.displayName = 'PriceChart';

export default PriceChart;
