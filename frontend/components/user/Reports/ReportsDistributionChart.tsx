import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Type definitions
interface Report {
  responderType?: string;
  [key: string]: any;
}

interface ChartDataItem {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

type ResponderType = 'Barangay' | 'NGO' | 'PCG';

const ReportsDistributionChart: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get colors by responder type (same as in your original code)
  const getStatusColor = (responderType: string): string => {
    switch(responderType as ResponderType) {
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

      const response = await fetch('https://apk-blueguard-rosssyyy.onrender.com/get-reported', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: Report[] = await response.json();
      
      if (response.ok) {
        setReports(data);
      } else {
        setError((data as any).message || 'Failed to fetch reports');
      }
    } catch (error) {
      setError('Error fetching reports: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Process the data for the pie chart
  const getChartData = (): ChartDataItem[] => {
    // Group reports by responder type
    const responderCounts: Record<string, number> = {};
    
    reports.forEach((report: Report) => {
      const responderType = report.responderType || 'Unknown';
      responderCounts[responderType] = (responderCounts[responderType] || 0) + 1;
    });

    // Convert to the format required by react-native-chart-kit
    const chartData: ChartDataItem[] = Object.keys(responderCounts).map((responderType: string) => ({
      name: responderType,
      population: responderCounts[responderType],
      color: getStatusColor(responderType),
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }));

    return chartData.length > 0 ? chartData : [
      {
        name: 'No Data',
        population: 1,
        color: '#CCCCCC',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      }
    ];
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

  const chartData = getChartData();
  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reports Distribution by Responder</Text>
      <PieChart
        data={chartData}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16
          }
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Total Reports: {reports.length}</Text>
        {chartData.map((item: ChartDataItem, index: number) => (
          <View key={index} style={styles.statItem}>
            <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
            <Text style={styles.statText}>
              {item.name}: {item.population} 
              {reports.length > 0 ? ` (${((item.population / reports.length) * 100).toFixed(1)}%)` : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  statsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statText: {
    fontSize: 14,
    color: '#555',
  }
});

export default ReportsDistributionChart;