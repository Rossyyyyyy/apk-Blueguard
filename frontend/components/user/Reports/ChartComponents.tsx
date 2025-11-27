// frontend/components/user/ChartComponents.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';

/**
 * Types
 */
export interface PieDataItem {
  name: string;
  population: number;
  color: string;
  legendFontColor?: string;
  legendFontSize?: number;
}

export interface BarChartDataset {
  data: number[];
}

export interface BarChartData {
  labels: string[];
  datasets: BarChartDataset[];
}

interface DonutProps {
  data?: PieDataItem[];
  width?: number;
  height?: number;
}

interface BarProps {
  data?: BarChartData;
  width?: number;
  height?: number;
  yAxisSuffix?: string; // <-- required by typings, provide default if not passed
}

/**
 * ReportDonutChart - Donut / Pie chart component
 */
export const ReportDonutChart: React.FC<DonutProps> = ({ data, width, height }) => {
  const chartData: PieDataItem[] = data ?? [
    { name: 'Overfishing', population: 25, color: '#FF6384', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Illegal Fishing', population: 20, color: '#36A2EB', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Marine Pollution', population: 30, color: '#FFCE56', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Destructive Fishing', population: 15, color: '#4BC0C0', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Others', population: 10, color: '#9966FF', legendFontColor: '#7F7F7F', legendFontSize: 12 },
  ];

  const w = width ?? Dimensions.get('window').width - 40;
  const h = height ?? 220;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Incident Types</Text>
      <PieChart
        data={chartData as any}
        width={w}
        height={h}
        chartConfig={{
          backgroundColor: '#FFFFFF',
          backgroundGradientFrom: '#FFFFFF',
          backgroundGradientTo: '#FFFFFF',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(0, 0, 150, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
        hasLegend={true as any}
        center={[10, 0]}
        avoidFalseZero
        style={styles.chart}
      />
    </View>
  );
};

/**
 * ReportBarChart - simple bar chart component
 */
export const ReportBarChart: React.FC<BarProps> = ({ data, width, height, yAxisSuffix }) => {
  const defaultData: BarChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{ data: [12, 19, 15, 20, 25, 28] }],
  };

  const chartData = data ?? defaultData;
  const w = width ?? Dimensions.get('window').width - 40;
  const h = height ?? 220;
  const suffix = yAxisSuffix ?? ''; // <-- ensure not undefined

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Monthly Reports</Text>
      <BarChart
        data={chartData as any}
        width={w}
        height={h}
        yAxisLabel=""
        yAxisSuffix={suffix} // <-- required prop passed here
        chartConfig={{
          backgroundColor: '#0A5EB0',
          backgroundGradientFrom: '#0A5EB0',
          backgroundGradientTo: '#000957',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          style: { borderRadius: 16 },
          barPercentage: 0.8,
        }}
        style={styles.barChart}
        fromZero
        showValuesOnTopOfBars
      />
    </View>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  chartContainer: {
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000957',
    marginBottom: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  barChart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});
