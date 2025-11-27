import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, FlatList, 
  ActivityIndicator, RefreshControl, Dimensions, ListRenderItem
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Type definitions
interface Report {
  _id?: string;
  type?: string;
  description?: string;
  predictedLaw?: string;
  address?: string;
  dateReported: string;
  dateCompleted: string;
  comment?: string;
  reportTo?: string | string[];
  responderType?: string;
  reportedBy?: string;
  resolved?: boolean;
}

interface ChartDataset {
  label?: string;
  data: number[];
  backgroundColor: string[];
  hoverOffset?: number;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface UserData {
  user?: {
    name?: string;
    email?: string;
  };
}

interface NavItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
}

type RootStackParamList = {
  Login: undefined;
  Dash: undefined;
  Notifications: undefined;
  Reports: undefined;
  Rewards: undefined;
  Knowledge: undefined;
  Profile: undefined;
};

type CompletedReportsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CompletedReportsProps {
  navigation: CompletedReportsNavigationProp;
}

type ResponderType = 'Barangay' | 'NGO' | 'PCG';

const CompletedReports: React.FC<CompletedReportsProps> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("Kaibigan");
  const [reports, setReports] = useState<Report[]>([]);
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: []
    }]
  });

  const fetchUserData = async (): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await fetch('https://apk-blueguard-rosssyyy.onrender.com/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: UserData = await response.json();
      if (response.ok) {
        const currentUserName = data.user?.name || data.user?.email || "Kaibigan";
        setUserName(currentUserName);
        // After getting user data, fetch the completed reports
        fetchCompletedReports(token, currentUserName);
      } else {
        console.error('Error fetching user:', (data as any).message);
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchCompletedReports = async (token: string, userName: string): Promise<void> => {
    try {
      const response = await fetch('https://apk-blueguard-rosssyyy.onrender.com/get-completed-reports', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: Report[] = await response.json();
      if (response.ok) {
        // Filter completed reports to only show those reported by the current user
        const userCompletedReports = data.filter((report: Report) => report.reportedBy === userName);
        console.log('User completed reports:', userCompletedReports); 
        setReports(userCompletedReports);
        
        // Generate chart data from the reports
        generateChartData(userCompletedReports);
      } else {
        console.error('Error fetching completed reports:', (data as any).message);
      }
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching completed reports:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateChartData = (reports: Report[]): void => {
    // Group reports by responder type
    const responderCounts: Record<string, number> = {};
    reports.forEach((report: Report) => {
      const responderType = report.responderType || 'Unknown';
      if (responderCounts[responderType]) {
        responderCounts[responderType]++;
      } else {
        responderCounts[responderType] = 1;
      }
    });

    // Define colors for different responder types
    const colorMap: Record<string, string> = {
      'Barangay': 'rgb(75, 192, 192)',
      'NGO': 'rgb(54, 162, 235)',
      'PCG': 'rgb(255, 99, 132)',
      'Unknown': 'rgb(201, 203, 207)'
    };

    // Prepare data for Chart.js
    const labels = Object.keys(responderCounts);
    const data = labels.map((key: string) => responderCounts[key]);
    const backgroundColor = labels.map((key: string) => 
      colorMap[key] || `rgb(${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)})`
    );

    setChartData({
      labels: labels,
      datasets: [{
        label: 'Completed Reports',
        data: data,
        backgroundColor: backgroundColor,
        hoverOffset: 4
      }]
    });
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    fetchUserData();
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (responderType?: string): string => {
    switch(responderType as ResponderType) {
      case 'Barangay':
        return '#77DD77'; // Green for completed
      case 'NGO':
        return '#64B5F6'; // Light Blue
      case 'PCG':
        return '#FF6961'; // Red
      default:
        return '#009990'; // Teal for completed
    }
  };

  // Generate the HTML for the Chart.js doughnut chart
  const generateChartHTML = (): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background-color: white; 
          }
          .chart-container {
            position: relative;
            width: 100%;
            max-width: 350px;
            max-height: 300px;
          }
        </style>
      </head>
      <body>
        <div class="chart-container">
          <canvas id="myChart"></canvas>
        </div>
        <script>
          const ctx = document.getElementById('myChart');
          const data = ${JSON.stringify(chartData)};
          
          const config = {
            type: 'doughnut',
            data: data,
            options: {
              responsive: true,
              plugins: {
                legend: {
                  position: 'bottom',
                },
                title: {
                  display: true,
                  text: 'Reports by Responder Type'
                }
              }
            }
          };
          
          new Chart(ctx, config);
        </script>
      </body>
      </html>
    `;
  };

  const renderReportItem: ListRenderItem<Report> = ({ item }) => (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle}>{item.type || "Untitled Report"}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.responderType) }]}>
          <Text style={styles.statusText}>COMPLETED</Text>
        </View>
      </View>
      
      <Text style={styles.reportDescription} numberOfLines={2}>
        {item.description || "No description provided."}
      </Text>
      
      <View style={styles.lawSection}>
        <Text style={styles.lawLabel}>Predicted Law:</Text>
        <Text style={styles.lawText}>{item.predictedLaw || "No law prediction available"}</Text>
      </View>
      
      <View style={styles.reportFooter}>
        <View style={styles.reportDetail}>
          <Ionicons name="location" size={16} color="#009990" />
          <Text style={styles.reportDetailText}>{item.address || "Unknown Location"}</Text>
        </View>
        <View style={styles.reportDetail}>
          <Ionicons name="calendar" size={16} color="#009990" />
          <Text style={styles.reportDetailText}>
            Reported: {formatDate(item.dateReported)}
          </Text>
        </View>
      </View>
      
      <View style={styles.completionDetails}>
        <View style={styles.reportDetail}>
          <Ionicons name="checkmark-circle" size={16} color="#009990" />
          <Text style={styles.reportDetailText}>
            Completed: {formatDate(item.dateCompleted)}
          </Text>
        </View>
      </View>
      
      {item.comment && (
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>Resolution Comment:</Text>
          <Text style={styles.commentText}>{item.comment}</Text>
        </View>
      )}
      
      <View style={styles.reportToSection}>
        <Text style={styles.reportToLabel}>Reported To:</Text>
        <Text style={styles.reportToText}>
          {Array.isArray(item.reportTo) ? item.reportTo.join(", ") : item.reportTo || "Unknown"}
        </Text>
      </View>
    </View>
  );

  const navItems: NavItem[] = [
    { name: 'Dashboard', icon: 'home', screen: 'Dash' },
    { name: 'Notifications', icon: 'notifications', screen: 'Notifications' },
    { name: 'My Reports', icon: 'document-text', screen: 'Reports' },
    { name: 'Rewards', icon: 'trophy', screen: 'Rewards' },
    { name: 'Knowledge', icon: 'book', screen: 'Knowledge' },
    { name: 'Profile', icon: 'person', screen: 'Profile' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="earth" size={30} color="white" />
        <Text style={styles.headerTitle}>BlueGuard</Text>
      </View>

      <View style={styles.titleContainer}>
        <Ionicons name="checkmark-done" size={24} color="#009990" />
        <Text style={styles.pageTitle}>Completed Reports</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#009990" />
        </View>
      ) : (
        <>
          {/* Chart section */}
          {reports.length > 0 && (
            <View style={styles.chartContainer}>
              <WebView
                source={{ html: generateChartHTML() }}
                style={styles.webview}
                originWhitelist={['*']}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
            </View>
          )}

          {/* Reports list */}
          <FlatList
            data={reports}
            renderItem={renderReportItem}
            keyExtractor={(item: Report) => item._id || Math.random().toString()}
            contentContainerStyle={styles.reportsList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#009990']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-done-outline" size={60} color="#aaa" />
                <Text style={styles.emptyText}>No completed reports found</Text>
              </View>
            }
          />
        </>
      )}

      {/* Spacer to ensure content isn't hidden behind the footer */}
      <View style={{ height: 80 }} />
      
      {/* Footer */}
      <View style={styles.footer}>
        {navItems.map((item: NavItem, index: number) => (
          <TouchableOpacity 
            key={index} 
            style={styles.navButton} 
            onPress={() => navigation.navigate(item.screen as keyof RootStackParamList)}
          >
            <Ionicons name={item.icon} size={24} color="white" />
            <Text style={styles.navText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F5F5',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#000957', 
    justifyContent: 'center' 
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FFFFFF', 
    marginLeft: 10 
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportsList: {
    padding: 15,
    paddingBottom: 100,
  },
  chartContainer: {
    height: 300,
    margin: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  webview: {
    flex: 1,
  },
  reportCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  reportDescription: {
    color: '#666',
    marginBottom: 10,
  },
  lawSection: {
    marginVertical: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  lawLabel: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#333',
  },
  lawText: {
    fontSize: 14,
    color: '#009990',
    marginTop: 2,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  reportDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  commentSection: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  commentLabel: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#333',
  },
  commentText: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  reportToSection: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportToLabel: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#333',
    marginRight: 5,
  },
  reportToText: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyText: {
    marginTop: 10,
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000957',
    width: '100%',
    padding: 10,
    position: 'absolute',
    bottom: 0,
  },
  navButton: { 
    alignItems: 'center' 
  },
  navText: { 
    color: 'white', 
    fontSize: 12 
  },
  completionDetails: {
    marginTop: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  }
});

export default CompletedReports;