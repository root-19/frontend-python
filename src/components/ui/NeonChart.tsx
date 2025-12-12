import ReactApexChart from 'react-apexcharts'

type NeonChartProps = {
  type: 'pie' | 'bar' | 'line'
  series: any
  options?: any
  height?: number
}

export default function NeonChart({ type, series, options = {}, height = 300 }: NeonChartProps) {
  const baseOptions = {
    chart: {
      background: 'transparent',
      foreColor: '#0D0D10',
      animations: { enabled: true, easing: 'easeinout', speed: 800 },
      toolbar: { show: false },
    },
    theme: { mode: 'light' },
    grid: { borderColor: '#E5E7EB' },
    colors: ['#A259FF', '#22c55e', '#ef4444', '#f59e0b', '#00E5FF'],
    tooltip: { theme: 'light' },
    legend: { labels: { colors: '#727284' } },
    dataLabels: { style: { colors: ['#0D0D10'] } },
    xaxis: { labels: { style: { colors: '#0D0D10' } } },
    yaxis: { labels: { style: { colors: '#0D0D10' } } },
    ...options,
  }
  return <ReactApexChart type={type} series={series} options={baseOptions} height={height} />
}
