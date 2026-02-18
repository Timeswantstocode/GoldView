import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, Filler, Tooltip,
  CategoryScale, LinearScale, PointElement, LineElement
} from 'chart.js';

ChartJS.register(Filler, Tooltip, CategoryScale, LinearScale, PointElement, LineElement);

const PriceChart = React.forwardRef((props, ref) => {
  return <Line {...props} ref={ref} />;
});

PriceChart.displayName = 'PriceChart';

export default PriceChart;
