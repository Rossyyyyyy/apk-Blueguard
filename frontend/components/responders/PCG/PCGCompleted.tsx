import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const API_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

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

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  population: number;
  legendFontColor: string;
  legendFontSize: number;
}

const CHART_COLORS = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC949', '#AF7AA1', '#FF9DA7'];

const PCGCompleted = () => {
  const [completedReports, setCompletedReports] = useState<CompletedReport[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));
  const navigation = useNavigation<any>();

  useEffect(() => {
    checkAuth();
    fetchCompletedReports();
    startPulseAnimation();
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const email = await AsyncStorage.getItem('userEmail');

      if (!token) {
        Alert.alert('Authentication Required', 'You must be logged in to access this page.');
        navigation.navigate('Login');
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
      const response = await fetch(`${API_URL}/api/completed-reports?responderType=PCG`);
      const data: CompletedReport[] = await response.json();
      setCompletedReports(data);

      // Process chart data
      const reportCounts: Record<string, number> = {};
      data.forEach(report => {
        reportCounts[report.type] = (reportCounts[report.type] || 0) + 1;
      });

      const processedData = Object.keys(reportCounts).map((type, index) => ({
        name: type,
        value: reportCounts[type],
        color: CHART_COLORS[index % CHART_COLORS.length],
        population: reportCounts[type],
        legendFontColor: '#2c3e50',
        legendFontSize: 14,
      }));

      setChartData(processedData);
    } catch (error) {
      console.error('Error fetching completed reports:', error);
      Alert.alert('Error', 'Failed to fetch completed reports');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/completed-reports/${id}`, {
                method: 'DELETE',
              });

              const result = await response.json();
              if (response.ok) {
                setCompletedReports(prevReports => prevReports.filter(report => report._id !== id));
                Alert.alert('Success', 'Report deleted successfully');
              } else {
                Alert.alert('Error', result.message || 'Failed to delete report');
              }
            } catch (error) {
              console.error('Error deleting:', error);
              Alert.alert('Error', 'Failed to delete report');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('authToken');
              await AsyncStorage.removeItem('userEmail');
              navigation.navigate('Login');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const sidebarItems = [
    { title: 'Dashboard', icon: 'view-dashboard', route: 'PCG' },
    { title: 'Reports', icon: 'file-document', route: 'PCGReports' },
    { title: 'Ongoing', icon: 'progress-clock', route: 'PCGOngoing' },
    { title: 'Completed', icon: 'check-circle', route: 'PCGCompleted' },
    { title: 'Messages', icon: 'message-text', route: 'PCGMessages' },
    { title: 'Settings', icon: 'cog', route: 'PCGSettings' },
  ];

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#f8f9fa',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(78, 121, 167, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#4E79A7',
    },
  };

  const barChartData = {
    labels: chartData.map(item => item.name.substring(0, 3)),
    datasets: [{ data: chartData.map(item => item.value) }],
  };

  const lineChartData = {
    labels: chartData.map(item => item.name.substring(0, 3)),
    datasets: [{
      data: chartData.map(item => item.value),
      color: (opacity = 1) => `rgba(78, 121, 167, ${opacity})`,
      strokeWidth: 3,
    }],
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0f2027', '#203a43', '#2c5364']}
        style={styles.backgroundGradient}
      />

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {isSidebarOpen && (
        <View style={styles.sidebar}>
          <LinearGradient
            colors={['#0f2027', '#203a43', '#2c5364']}
            style={styles.sidebarGradient}
          >
            <View style={styles.sidebarHeader}>
              <Animated.Image
                source={require('../../../assets/Philippine_Coast_Guard_(PCG).svg.png')}
                style={[styles.pcgLogo, { transform: [{ scale: pulseAnim }] }]}
                resizeMode="contain"
              />
              <Text style={styles.sidebarHeaderText}>PCG Management</Text>
            </View>

            <ScrollView style={styles.sidebarMenu} showsVerticalScrollIndicator={false}>
              {sidebarItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.sidebarItem,
                    item.route === 'PCGCompleted' && styles.sidebarItemActive
                  ]}
                  onPress={() => {
                    setIsSidebarOpen(false);
                    navigation.navigate(item.route);
                  }}
                  activeOpacity={0.7}
                >
                  <Icon name={item.icon} size={24} color="#4facfe" />
                  <Text style={styles.sidebarItemText}>{item.title}</Text>
                  <Icon name="chevron-right" size={20} color="#7f8c8d" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {userEmail ? (
              <View style={styles.userInfo}>
                <Icon name="account-circle" size={20} color="#4facfe" />
                <Text style={styles.userEmail} numberOfLines={1}>{userEmail}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Icon name="logout" size={20} color="#fff" />
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {/* Hamburger Menu */}
      <TouchableOpacity
        style={styles.hamburger}
        onPress={() => setIsSidebarOpen(!isSidebarOpen)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
          style={styles.hamburgerGradient}
        >
          <Icon name={isSidebarOpen ? "close" : "menu"} size={28} color="#2c3e50" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Main Content */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['rgba(17, 153, 142, 0.1)', 'rgba(56, 239, 125, 0.1)']}
            style={styles.headerGradient}
          >
            <View style={styles.headerIconContainer}>
              <Icon name="check-circle" size={40} color="#11998e" />
            </View>
            <Text style={styles.headerTitle}>✅ Completed Reports</Text>
            <Text style={styles.headerSubtitle}>View all resolved cases</Text>
          </LinearGradient>
        </View>

        {/* Statistics Card */}
        <View style={styles.statsCard}>
          <LinearGradient
            colors={['#11998e', '#38ef7d']}
            style={styles.statsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statsIconContainer}>
              <Icon name="file-document-check" size={48} color="#fff" />
            </View>
            <View style={styles.statsContent}>
              <Text style={styles.statsLabel}>Total Completed</Text>
              <Text style={styles.statsValue}>{completedReports.length}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Charts Section */}
        {chartData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.sectionIconBadge}
              >
                <Icon name="chart-pie" size={20} color="#fff" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>Analytics</Text>
            </View>

            {/* Pie Chart */}
            <View style={styles.chartCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
                style={styles.chartGradient}
              >
                <Text style={styles.chartTitle}>Report Distribution</Text>
                <PieChart
                  data={chartData}
                  width={SCREEN_WIDTH - 60}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  style={styles.chart}
                />
              </LinearGradient>
            </View>

            {/* Bar Chart */}
            {barChartData.datasets[0].data.length > 0 && (
              <View style={styles.chartCard}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
                  style={styles.chartGradient}
                >
                  <Text style={styles.chartTitle}>Reports by Type</Text>
                  <BarChart
                    data={barChartData}
                    width={SCREEN_WIDTH - 60}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={chartConfig}
                    style={styles.chart}
                    showValuesOnTopOfBars
                  />
                </LinearGradient>
              </View>
            )}

            {/* Line Chart */}
            {lineChartData.datasets[0].data.length > 0 && (
              <View style={styles.chartCard}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
                  style={styles.chartGradient}
                >
                  <Text style={styles.chartTitle}>Completion Trend</Text>
                  <LineChart
                    data={lineChartData}
                    width={SCREEN_WIDTH - 60}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={chartConfig}
                    bezier
                    style={styles.chart}
                  />
                </LinearGradient>
              </View>
            )}
          </View>
        )}

        {/* Reports List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.sectionIconBadge}
            >
              <Icon name="format-list-bulleted" size={20} color="#fff" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>All Reports</Text>
          </View>

          {completedReports.length > 0 ? (
            completedReports.map((report) => (
              <View key={report._id} style={styles.reportCard}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
                  style={styles.reportGradient}
                >
                  <View style={styles.reportHeader}>
                    <View style={styles.reportTypeBadge}>
                      <Icon name="alert-circle" size={16} color="#4E79A7" />
                      <Text style={styles.reportType}>{report.type}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(report._id)}
                      style={styles.deleteBtn}
                    >
                      <Icon name="delete" size={20} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.reportRow}>
                    <Icon name="text" size={16} color="#7f8c8d" />
                    <Text style={styles.reportLabel}>Description:</Text>
                    <Text style={styles.reportValue}>{report.description}</Text>
                  </View>

                  <View style={styles.reportRow}>
                    <Icon name="map-marker" size={16} color="#7f8c8d" />
                    <Text style={styles.reportLabel}>Address:</Text>
                    <Text style={styles.reportValue}>{report.address}</Text>
                  </View>

                  {report.comment && (
                    <View style={styles.reportRow}>
                      <Icon name="comment-text" size={16} color="#7f8c8d" />
                      <Text style={styles.reportLabel}>Comment:</Text>
                      <Text style={styles.reportValue}>{report.comment}</Text>
                    </View>
                  )}

                  {report.predictedLaw && (
                    <View style={styles.reportRow}>
                      <Icon name="gavel" size={16} color="#7f8c8d" />
                      <Text style={styles.reportLabel}>Law:</Text>
                      <Text style={styles.reportValue}>{report.predictedLaw}</Text>
                    </View>
                  )}

                  <View style={styles.reportRow}>
                    <Icon name="account" size={16} color="#7f8c8d" />
                    <Text style={styles.reportLabel}>Reported By:</Text>
                    <Text style={styles.reportValue}>{report.reportedBy}</Text>
                  </View>

                  <View style={styles.reportFooter}>
                    <View style={styles.dateContainer}>
                      <Icon name="calendar-clock" size={14} color="#95a5a6" />
                      <Text style={styles.dateText}>
                        Reported: {new Date(report.dateReported).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.dateContainer}>
                      <Icon name="check-circle" size={14} color="#11998e" />
                      <Text style={styles.dateText}>
                        Completed: {new Date(report.dateCompleted).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
                style={styles.emptyGradient}
              >
                <Icon name="inbox" size={64} color="#bdc3c7" />
                <Text style={styles.emptyText}>No completed reports found</Text>
              </LinearGradient>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
            style={styles.footerGradient}
          >
            <Icon name="shield-check" size={20} color="#667eea" />
            <Text style={styles.footerText}>© 2025 Philippine Coast Guard Management System</Text>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.4,
    opacity: 0.5,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 999,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  sidebarGradient: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(79, 172, 254, 0.3)',
  },
  pcgLogo: {
    width: 45,
    height: 45,
    marginRight: 12,
  },
  sidebarHeaderText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sidebarMenu: {
    flex: 1,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    borderLeftWidth: 4,
    borderLeftColor: '#4facfe',
  },
  sidebarItemText: {
    color: '#ecf0f1',
    fontSize: 16,
    marginLeft: 16,
    flex: 1,
    fontWeight: '500',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    borderRadius: 12,
    marginBottom: 16,
  },
  userEmail: {
    color: '#ecf0f1',
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
  },
  logoutBtn: {
    backgroundColor: '#e74c3c',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#e74c3c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  logoutBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  hamburger: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    zIndex: 998,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  hamburgerGradient: {
    padding: 14,
  },
  mainContent: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 40 : 10,
  },
  header: {
    marginHorizontal: 20,
    marginTop: 70,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#11998e',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  headerGradient: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(17, 153, 142, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  statsCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#11998e',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  statsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  statsIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  statsContent: {
    flex: 1,
  },
  statsLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  statsValue: {
    color: '#fff',
    fontSize: 42,
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  chartCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  chartGradient: {
    padding: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
    marginTop: 8,
  },
  reportCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  reportGradient: {
    padding: 20,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(236, 240, 241, 0.5)',
  },
  reportTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 121, 167, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reportType: {
    color: '#4E79A7',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  deleteBtn: {
    padding: 8,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    marginLeft: 8,
    marginRight: 8,
  },
  reportValue: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
  },
  reportFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(236, 240, 241, 0.5)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#95a5a6',
    marginLeft: 6,
  },
  emptyState: {
    marginTop: 40,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  emptyGradient: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 16,
    textAlign: 'center',
  },
  footer: {
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 16,
    overflow: 'hidden',
  },
  footerGradient: {
    padding: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#7f8c8d',
    marginLeft: 8,
    textAlign: 'center',
  },
});

export default PCGCompleted;