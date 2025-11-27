import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ImageBackground,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';

const { width, height } = Dimensions.get('window');

// API Base URL
const API_BASE_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

// Chart Colors
const CHART_COLORS = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC949', '#AF7AA1', '#FF9DA7'];

// Types
interface CompletedReport {
  _id: string;
  type: string;
  description: string;
  address: string;
  comment: string;
  predictedLaw: string;
  reportedBy: string;
  dateReported: string;
  dateCompleted: string;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
  legendFontColor?: string;
  legendFontSize?: number;
}

// NGO Sidebar Component
const NGOSidebar = ({ isOpen, setIsOpen, userEmail, onLogout }: any) => {
  const navigation = useNavigation<any>();

  const navItems = [
    { label: 'Dashboard', icon: 'tachometer', route: 'NGO' },
    { label: 'Reports', icon: 'file-text', route: 'NGOReports' },
    { label: 'Ongoing Reports', icon: 'spinner', route: 'NGOOngoing' },
    { label: 'Completed', icon: 'check-circle', route: 'NGOCompleted' },
    { label: 'Settings', icon: 'cog', route: 'NGOSettings' },
    { label: 'Messages', icon: 'envelope', route: 'NGOMessages' },
  ];

  const handleNavigation = (route: string) => {
    navigation.navigate(route);
    setIsOpen(false);
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsOpen(false)}
    >
      <TouchableOpacity 
        style={styles.sidebarOverlay}
        activeOpacity={1}
        onPress={() => setIsOpen(false)}
      >
        <View style={styles.overlayBackground} />
      </TouchableOpacity>

      <View style={styles.sidebar}>
        {/* Sidebar Header */}
        <View style={styles.sidebarHeader}>
          <Icon name="life-ring" size={28} color="#fff" />
          <Text style={styles.sidebarTitle}>NGO Management</Text>
        </View>

        {/* Sidebar Menu */}
        <ScrollView 
          style={styles.sidebarMenu}
          showsVerticalScrollIndicator={false}
        >
          {navItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => handleNavigation(item.route)}
              activeOpacity={0.7}
            >
              <Icon name={item.icon} size={20} color="#fff" />
              <Text style={styles.menuText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Display logged-in user email */}
        {userEmail && (
          <View style={styles.userEmailContainer}>
            <Text style={styles.userEmailLabel}>Logged in as:</Text>
            <Text style={styles.userEmailText} numberOfLines={1}>
              {userEmail}
            </Text>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <Icon name="sign-out" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// Main NGO Completed Component
const NGOCompleted = () => {
  const navigation = useNavigation<any>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [completedReports, setCompletedReports] = useState<CompletedReport[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchCompletedReports();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const responderType = await AsyncStorage.getItem('responderType');
      const email = await AsyncStorage.getItem('userEmail');

      if (!token || responderType !== 'ngo') {
        Alert.alert('Access Denied', 'You must be an NGO responder to access this page.');
        navigation.replace('Login');
        return;
      }

      if (email) {
        setUserEmail(email);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const fetchCompletedReports = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching NGO completed reports...');
      
      const response = await fetch(`${API_BASE_URL}/api/completed-reports?responderType=NGO`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Received data:', data);

      // ✅ FIX: Handle both array and object response formats
      let reportsArray: CompletedReport[] = [];
      
      if (Array.isArray(data)) {
        reportsArray = data;
      } else if (data.completedReports && Array.isArray(data.completedReports)) {
        reportsArray = data.completedReports;
      } else if (data.reports && Array.isArray(data.reports)) {
        reportsArray = data.reports;
      } else {
        console.warn('⚠️ Unexpected data format:', data);
        reportsArray = [];
      }

      console.log(`✅ Found ${reportsArray.length} NGO completed reports`);
      setCompletedReports(reportsArray);

      // Process chart data
      if (reportsArray.length > 0) {
        const reportCounts: { [key: string]: number } = {};
        reportsArray.forEach((report: CompletedReport) => {
          const reportType = report.type || 'Unknown';
          reportCounts[reportType] = (reportCounts[reportType] || 0) + 1;
        });

        const processedChartData = Object.keys(reportCounts).map((type, index) => ({
          name: type,
          value: reportCounts[type],
          color: CHART_COLORS[index % CHART_COLORS.length],
          legendFontColor: '#495057',
          legendFontSize: 13,
        }));

        setChartData(processedChartData);
        console.log('📊 Chart data processed:', processedChartData);
      } else {
        setChartData([]);
      }
    } catch (error) {
      console.error('❌ Error fetching completed reports:', error);
      Alert.alert('Error', 'Failed to fetch completed reports. Please try again.');
      setCompletedReports([]);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/completed-reports/${id}`, {
                method: 'DELETE',
              });

              const result = await response.json();
              if (response.ok) {
                setCompletedReports((prevReports) =>
                  prevReports.filter((report) => report._id !== id)
                );
                Alert.alert('Success', 'Report deleted successfully');
                fetchCompletedReports(); // Refresh data
              } else {
                Alert.alert('Error', result.message || 'Failed to delete report');
              }
            } catch (error) {
              console.error('Error deleting:', error);
              Alert.alert('Error', 'Failed to delete report. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userEmail', 'responderType']);
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 119, 182, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#0077b6',
    },
  };

  const barChartData = {
    labels: chartData.map(item => item.name.substring(0, 8)),
    datasets: [{ data: chartData.length > 0 ? chartData.map(item => item.value) : [0] }],
  };

  const lineChartData = {
    labels: chartData.map(item => item.name.substring(0, 8)),
    datasets: [{ data: chartData.length > 0 ? chartData.map(item => item.value) : [0] }],
  };

  return (
    <View style={styles.container}>
      {/* Hamburger Menu */}
      <TouchableOpacity
        style={styles.hamburger}
        onPress={() => setIsSidebarOpen(true)}
        activeOpacity={0.7}
      >
        <Icon name="bars" size={24} color="#0077b6" />
      </TouchableOpacity>

      {/* Sidebar */}
      <NGOSidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      <ScrollView style={styles.main}>
        <ImageBackground
          source={require('../../../assets/ocean-bg.jpg')}
          style={styles.backgroundImage}
          imageStyle={{ opacity: 0.15 }}
        >
          <View style={styles.content}>
            <Text style={styles.title}>✅ Completed Reports</Text>

            {/* Total Completed Card */}
            <View style={styles.completedCard}>
              <View style={styles.completedIconContainer}>
                <Icon name="check-circle" size={48} color="#28a745" />
              </View>
              <View style={styles.completedTextContainer}>
                <Text style={styles.completedLabel}>Total Completed Reports</Text>
                <Text style={styles.completedValue}>{completedReports.length}</Text>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0077b6" />
                <Text style={styles.loadingText}>Loading reports...</Text>
              </View>
            ) : (
              <>
                {/* Charts Section */}
                {chartData.length > 0 && (
                  <>
                    {/* Pie Chart */}
                    <View style={styles.chartCard}>
                      <View style={styles.chartHeader}>
                        <Icon name="pie-chart" size={20} color="#0077b6" />
                        <Text style={styles.chartTitle}>Report Distribution</Text>
                      </View>
                      <PieChart
                        data={chartData}
                        width={width - 60}
                        height={220}
                        chartConfig={chartConfig}
                        accessor="value"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        style={styles.chart}
                      />
                    </View>

                    {/* Bar Chart */}
                    <View style={styles.chartCard}>
                      <View style={styles.chartHeader}>
                        <Icon name="bar-chart" size={20} color="#0077b6" />
                        <Text style={styles.chartTitle}>Reports by Type</Text>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <BarChart
                          data={barChartData}
                          width={Math.max(width - 60, 400)}
                          height={220}
                          chartConfig={chartConfig}
                          style={styles.chart}
                          fromZero
                          showValuesOnTopOfBars
                          yAxisLabel=""
                          yAxisSuffix=""
                        />
                      </ScrollView>
                    </View>

                    {/* Line Chart */}
                    <View style={styles.chartCard}>
                      <View style={styles.chartHeader}>
                        <Icon name="line-chart" size={20} color="#0077b6" />
                        <Text style={styles.chartTitle}>Reports Over Time</Text>
                      </View>
                      <LineChart
                        data={lineChartData}
                        width={width - 60}
                        height={220}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.chart}
                        withInnerLines={false}
                        withOuterLines={true}
                        yAxisLabel=""
                        yAxisSuffix=""
                      />
                    </View>
                  </>
                )}

                {/* Reports List */}
                <View style={styles.reportsCard}>
                  <View style={styles.cardHeader}>
                    <Icon name="list" size={20} color="#0077b6" />
                    <Text style={styles.cardTitle}>Completed Reports List</Text>
                  </View>

                  {completedReports.length > 0 ? (
                    completedReports.map((report) => (
                      <View key={report._id} style={styles.reportItem}>
                        <View style={styles.reportHeader}>
                          <View style={styles.reportTypeContainer}>
                            <Icon name="file-text" size={16} color="#0077b6" />
                            <Text style={styles.reportType}>{report.type || 'Unknown Type'}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDelete(report._id)}
                          >
                            <Icon name="trash" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.reportContent}>
                          <View style={styles.reportRow}>
                            <Text style={styles.reportLabel}>Description:</Text>
                            <Text style={styles.reportValue}>{report.description || 'N/A'}</Text>
                          </View>

                          <View style={styles.reportRow}>
                            <Text style={styles.reportLabel}>Address:</Text>
                            <Text style={styles.reportValue}>{report.address || 'N/A'}</Text>
                          </View>

                          <View style={styles.reportRow}>
                            <Text style={styles.reportLabel}>Comment:</Text>
                            <Text style={styles.reportValue}>{report.comment || 'N/A'}</Text>
                          </View>

                          <View style={styles.reportRow}>
                            <Text style={styles.reportLabel}>Predicted Law:</Text>
                            <Text style={styles.reportValue}>{report.predictedLaw || 'N/A'}</Text>
                          </View>

                          <View style={styles.reportRow}>
                            <Text style={styles.reportLabel}>Reported By:</Text>
                            <Text style={styles.reportValue}>{report.reportedBy || 'Unknown'}</Text>
                          </View>

                          <View style={styles.reportDates}>
                            <View style={styles.dateItem}>
                              <Icon name="calendar" size={14} color="#6c757d" />
                              <Text style={styles.dateLabel}>Reported:</Text>
                              <Text style={styles.dateValue}>
                                {report.dateReported ? new Date(report.dateReported).toLocaleDateString() : 'N/A'}
                              </Text>
                            </View>

                            <View style={styles.dateItem}>
                              <Icon name="check" size={14} color="#28a745" />
                              <Text style={styles.dateLabel}>Completed:</Text>
                              <Text style={styles.dateValue}>
                                {report.dateCompleted ? new Date(report.dateCompleted).toLocaleDateString() : 'N/A'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.noDataContainer}>
                      <Icon name="inbox" size={48} color="#6c757d" />
                      <Text style={styles.noDataText}>No completed reports found</Text>
                      <Text style={styles.noDataSubtext}>Completed reports will appear here</Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </ImageBackground>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  hamburger: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 100,
    padding: 12,
    backgroundColor: 'transparent',
    borderRadius: 5,
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: '#000957',
    zIndex: 100,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  sidebarMenu: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  menuText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 10,
  },
  userEmailContainer: {
    marginBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  userEmailLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 5,
  },
  userEmailText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 5,
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 10,
  },
  main: {
    flex: 1,
    marginTop: 60,
  },
  backgroundImage: {
    flex: 1,
    minHeight: height,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0077b6',
    textAlign: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    backgroundColor: '#d4edda',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderLeftWidth: 6,
    borderLeftColor: '#28a745',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  completedIconContainer: {
    marginRight: 20,
  },
  completedTextContainer: {
    flex: 1,
  },
  completedLabel: {
    fontSize: 16,
    color: '#155724',
    fontWeight: '600',
    marginBottom: 8,
  },
  completedValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#28a745',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  chartCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0077b6',
    marginLeft: 8,
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
  },
  reportsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e9ecef',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0077b6',
    marginLeft: 12,
    flex: 1,
  },
  reportItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0077b6',
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reportContent: {
    gap: 12,
  },
  reportRow: {
    marginBottom: 8,
  },
  reportLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
  },
  reportValue: {
    fontSize: 15,
    color: '#212529',
  },
  reportDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
  },
  dateValue: {
    fontSize: 12,
    color: '#495057',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noDataText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default NGOCompleted;