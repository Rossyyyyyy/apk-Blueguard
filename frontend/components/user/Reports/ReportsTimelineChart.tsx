import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AbstractChartConfig } from 'react-native-chart-kit/dist/AbstractChart';

interface Report {
  _id: string;
  type?: string;
  description?: string;
  predictedLaw?: string;
  address?: string;
  dateReported: string;
  comment?: string;
  reportTo?: string | string[];
  reportedBy: string;
  responderType?: string;
}

interface ChartDataset {
  data: number[];
  color: (opacity: number) => string;
  strokeWidth: number;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface MonthlyData {
  [month: string]: {
    [responderType: string]: number;
  };
}

interface ResponderCounts {
  [responderType: string]: number;
}

interface MonthCounts {
  [month: string]: number;
}

const API_BASE_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

const ReportsTimelineChart: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    datasets: []
  });

  const screenWidth = Dimensions.get('window').width;

  // Get colors by responder type (same as in your original code)
  const getStatusColor = (responderType?: string): string => {
    switch(responderType) {
      case 'Barangay':
        return '#FFB347'; // Orange
      case 'NGO':
        return '#64B5F6'; // Light Blue
      case 'PCG':
        return '#FF6961'; // Red
      default:
        return '#888888'; // Gray
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/get-reported`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: Report[] = await response.json();
      
      if (response.ok) {
        setReports(data);
        processChartData(data);
      } else {
        setError('Failed to fetch reports');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError('Error fetching reports: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Process the data for the line chart
  const processChartData = (reportsData: Report[]): void => {
    // Group reports by month and responder type
    const monthlyData: MonthlyData = {};
    const responderTypes = new Set<string>();
    
    reportsData.forEach(report => {
      const date = new Date(report.dateReported);
      const month = date.toLocaleString('default', { month: 'short' });
      const responderType = report.responderType || 'Unknown';
      
      if (!monthlyData[month]) {
        monthlyData[month] = {};
      }
      
      monthlyData[month][responderType] = (monthlyData[month][responderType] || 0) + 1;
      responderTypes.add(responderType);
    });

    // Convert to the format required by react-native-chart-kit
    const months = Object.keys(monthlyData).sort((a, b) => {
      const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthsOrder.indexOf(a) - monthsOrder.indexOf(b);
    });

    const datasets: ChartDataset[] = Array.from(responderTypes).map(responderType => {
      return {
        data: months.map(month => monthlyData[month][responderType] || 0),
        color: (opacity: number = 1) => getStatusColor(responderType),
        strokeWidth: 2
      };
    });

    setChartData({
      labels: months.length > 0 ? months : ['No Data'],
      datasets: datasets.length > 0 ? datasets : [{ 
        data: [0], 
        color: (opacity: number = 1) => '#CCCCCC', 
        strokeWidth: 2 
      }]
    });
  };

  const getTopResponder = (): string => {
    const responderCounts: ResponderCounts = {};
    reports.forEach(report => {
      const responderType = report.responderType || 'Unknown';
      responderCounts[responderType] = (responderCounts[responderType] || 0) + 1;
    });
    
    return Object.entries(responderCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)[0] || 'None';
  };

  const getTopMonth = (): string => {
    const monthCounts: MonthCounts = {};
    reports.forEach(report => {
      const date = new Date(report.dateReported);
      const month = date.toLocaleString('default', { month: 'short' });
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    
    return Object.entries(monthCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)[0] || 'None';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading chart data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const chartConfig: AbstractChartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#ffa726'
    }
  };

  return (
    <ScrollView horizontal={true} style={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Reports Timeline by Month</Text>
        <LineChart
          data={chartData}
          width={Math.max(screenWidth - 40, chartData.labels.length * 60)}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
        <View style={styles.legendContainer}>
          {Array.from(new Set(reports.map(r => r.responderType))).map((responderType, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.colorIndicator, { backgroundColor: getStatusColor(responderType) }]} />
              <Text style={styles.legendText}>{responderType || 'Unknown'}</Text>
            </View>
          ))}
        </View>
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>Key Insights:</Text>
          <Text style={styles.insightText}>- {getTopResponder()} has the highest number of reports</Text>
          <Text style={styles.insightText}>- {getTopMonth()} had the most reports submitted</Text>
          <Text style={styles.insightText}>- Total reports tracked: {reports.length}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  chart: {
    borderRadius: 16,
  },
  loadingText: {
    textAlign: 'center',
    color: '#888',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
    color: '#FF6961',
    padding: 20,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 8,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#555',
  },
  insightsContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 12,
    color: '#555',
    marginBottom: 5,
  }
});

export default ReportsTimelineChart;