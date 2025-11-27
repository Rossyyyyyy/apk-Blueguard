import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  Image,
  Animated,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const API_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

// Color palette for improved UI
const BAR_COLORS = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC949', '#AF7AA1', '#FF9DA7'];

const STATUS_OPTIONS = ["Pending", "Ongoing", "Completed", "Cancelled"];

interface Report {
  _id: string;
  type: string;
  description: string;
  address: string;
  comment: string;
  predictedLaw: string;
  reportedBy: string;
  dateReported: string;
  status: string;
  responderType: string;
}

interface ChartData {
  name: string;
  count: number;
  color: string;
}

const PCGReports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  useEffect(() => {
    checkAuth();
    startPulseAnimation();
  }, []);

  // ✅ Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReports();
    }, 30000);
    
    return () => clearInterval(interval);
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
      
      // Fetch reports after auth check
      fetchReports();
    } catch (error) {
      console.error('Auth check error:', error);
    }
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

  // Process reports into chart data format
  const processChartData = useCallback((data: Report[]) => {
    console.log('📊 Processing chart data for', data.length, 'reports');
    
    const reportCounts: { [key: string]: number } = {};
    data.forEach(report => {
      reportCounts[report.type] = (reportCounts[report.type] || 0) + 1;
    });

    const formattedData = Object.keys(reportCounts).map((type, index) => ({
      name: type,
      count: reportCounts[type],
      color: BAR_COLORS[index % BAR_COLORS.length]
    }));

    console.log('📊 Chart data processed:', formattedData);
    setChartData(formattedData);
  }, []);

  // ✅ FIXED: Fetch reports with proper error handling
  const fetchReports = useCallback(async () => {
    try {
      console.log('🚀 ===== FETCHING PCG REPORTS =====');
      console.log('📍 API URL:', `${API_URL}/api/pcg-reports-pcg`);
      console.log('🕐 Timestamp:', new Date().toISOString());
      
      setLoading(true);
      
      const response = await fetch(`${API_URL}/api/pcg-reports-pcg`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get response as text first to debug
      const responseText = await response.text();
      console.log('📄 Raw response:', responseText.substring(0, 500));
      
      // Parse JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('✅ Parsed data type:', typeof data);
      console.log('✅ Is array:', Array.isArray(data));
      
      // ✅ CRITICAL FIX: Handle both array and object responses
      let reportsArray: Report[] = [];
      
      if (Array.isArray(data)) {
        reportsArray = data;
        console.log('✅ Data is array, length:', data.length);
      } else if (data && typeof data === 'object') {
        if (data.reports && Array.isArray(data.reports)) {
          reportsArray = data.reports;
          console.log('✅ Data has reports array, length:', data.reports.length);
        } else if (data.success && data.data && Array.isArray(data.data)) {
          reportsArray = data.data;
          console.log('✅ Data has data array, length:', data.data.length);
        } else {
          console.log('⚠️ Unexpected object structure:', Object.keys(data));
          reportsArray = [];
        }
      }
      
      // ✅ Filter for PCG reports (double-check)
      const pcgReports = reportsArray.filter(report => 
        report.responderType === "PCG" || report.responderType === "pcg"
      );
      
      console.log('✅ Filtered PCG reports:', pcgReports.length);
      
      if (pcgReports.length > 0) {
        console.log('📄 First report sample:', {
          id: pcgReports[0]._id,
          type: pcgReports[0].type,
          reportedBy: pcgReports[0].reportedBy,
          status: pcgReports[0].status,
          responderType: pcgReports[0].responderType
        });
      }
      
      setReports(pcgReports);
      processChartData(pcgReports);
      
      console.log('✅ ===== FETCH COMPLETE =====');
      
    } catch (error: unknown) {
      console.error('❌ ===== FETCH ERROR =====');
      console.error('Error details:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      Alert.alert(
        'Error', 
        `Failed to fetch reports: ${errorMessage}\n\nPlease check your connection and try again.`
      );
      
      // Set empty arrays to prevent crashes
      setReports([]);
      setChartData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [processChartData]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    console.log('🔄 Pull to refresh triggered');
    setRefreshing(true);
    fetchReports();
  }, [fetchReports]);

  // Update status with confirmation
  const handleStatusChange = async (reportId: string, newStatus: string) => {
    Alert.alert(
      'Confirm Update',
      `Are you sure you want to update the report status to "${newStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              console.log(`📝 Updating report ${reportId} to ${newStatus}`);
              
              const response = await fetch(`${API_URL}/api/reports/${reportId}/status`, {
                method: "PUT",
                headers: { 
                  "Content-Type": "application/json",
                  "Accept": "application/json"
                },
                body: JSON.stringify({ status: newStatus }),
              });

              if (response.ok) {
                console.log('✅ Status updated successfully');
                
                // Refresh the reports list
                fetchReports();
                
                Alert.alert('Success', `Report status updated to "${newStatus}" successfully!`);
              } else {
                const errorData = await response.json();
                console.error('❌ Update failed:', errorData);
                Alert.alert('Error', errorData.message || 'Failed to update report status.');
              }
            } catch (error) {
              console.error("❌ Error updating status:", error);
              Alert.alert('Error', 'Error updating status. Please try again.');
            }
          },
        },
      ]
    );
  };

  // DELETE REPORT FUNCTION
  const handleDeleteReport = async (reportId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this report? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`🗑️ Deleting report ${reportId}`);
              
              const response = await fetch(`${API_URL}/api/reports/${reportId}`, {
                method: "DELETE",
                headers: {
                  "Accept": "application/json"
                }
              });

              if (response.ok) {
                console.log('✅ Report deleted successfully');
                
                // Refresh the reports list
                fetchReports();
                
                Alert.alert('Success', 'Report deleted successfully!');
              } else {
                const errorData = await response.json();
                console.error('❌ Delete failed:', errorData);
                Alert.alert('Error', errorData.message || 'Failed to delete report.');
              }
            } catch (error) {
              console.error("❌ Error deleting report:", error);
              Alert.alert('Error', 'Error deleting report. Please try again.');
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

  // Prepare chart data for react-native-chart-kit
  const barChartData = {
    labels: chartData.map(item => item.name.substring(0, 8)),
    datasets: [
      {
        data: chartData.length > 0 ? chartData.map(item => item.count) : [0],
      },
    ],
  };

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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Completed':
        return 'rgba(17, 153, 142, 0.2)';
      case 'Ongoing':
        return 'rgba(245, 87, 108, 0.2)';
      case 'Pending':
      default:
        return 'rgba(79, 172, 254, 0.2)';
    }
  };

  // ✅ Loading screen
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <LinearGradient
          colors={['#0f2027', '#203a43', '#2c5364']}
          style={styles.backgroundGradient}
        />
        <ActivityIndicator size="large" color="#4facfe" />
        <Text style={styles.loadingText}>Loading PCG Reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animated Background */}
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
                  style={styles.sidebarItem}
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
      <ScrollView 
        style={styles.mainContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4facfe']}
            tintColor="#4facfe"
          />
        }
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
            style={styles.headerGradient}
          >
            <Icon name="file-document-multiple" size={48} color="#667eea" />
            <Text style={styles.pageTitle}>📊 PCG Reports</Text>
            <Text style={styles.pageSubtitle}>View and manage all submitted reports</Text>
            <Text style={styles.reportCount}>Total Reports: {reports.length}</Text>
          </LinearGradient>
        </View>

        {/* Refresh Button */}
        <View style={styles.refreshButtonContainer}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchReports}
            activeOpacity={0.8}
          >
            <Icon name="refresh" size={20} color="#fff" />
            <Text style={styles.refreshButtonText}>Refresh Data</Text>
          </TouchableOpacity>
        </View>

        {/* Chart Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.sectionIconBadge}
            >
              <Icon name="chart-bar" size={20} color="#fff" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Reports by Type</Text>
          </View>

          <View style={styles.chartCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
              style={styles.chartGradient}
            >
              {chartData.length > 0 ? (
                <BarChart
                  data={barChartData}
                  width={SCREEN_WIDTH - 60}
                  height={260}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={chartConfig}
                  verticalLabelRotation={0}
                  style={styles.chart}
                  showValuesOnTopOfBars
                />
              ) : (
                <View style={styles.noDataContainer}>
                  <Icon name="chart-bar" size={48} color="#bdc3c7" />
                  <Text style={styles.noDataText}>No chart data available</Text>
                  <Text style={styles.noDataSubtext}>Reports will appear here once submitted</Text>
                </View>
              )}
            </LinearGradient>
          </View>
        </View>

        {/* Reports Table Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.sectionIconBadge}
            >
              <Icon name="table" size={20} color="#fff" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>All Reports ({reports.length})</Text>
          </View>

          <View style={styles.tableCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
              style={styles.tableGradient}
            >
              {reports.length > 0 ? (
                reports.map((report, index) => (
                  <View 
                    key={report._id} 
                    style={[
                      styles.reportCard,
                      index === reports.length - 1 && { borderBottomWidth: 0 }
                    ]}
                  >
                    <View style={styles.reportHeader}>
                      <View style={styles.reportTypeBadge}>
                        <Icon name="file-document" size={16} color="#667eea" />
                        <Text style={styles.reportType}>{report.type}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status || 'Pending') }]}>
                        <Text style={styles.statusText}>{report.status || 'Pending'}</Text>
                      </View>
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

                    <View style={styles.reportRow}>
                      <Icon name="comment" size={16} color="#7f8c8d" />
                      <Text style={styles.reportLabel}>Comment:</Text>
                      <Text style={styles.reportValue}>{report.comment}</Text>
                    </View>

                    <View style={styles.reportRow}>
                      <Icon name="gavel" size={16} color="#7f8c8d" />
                      <Text style={styles.reportLabel}>Predicted Law:</Text>
                      <Text style={styles.reportValue}>{report.predictedLaw}</Text>
                    </View>

                    <View style={styles.reportRow}>
                      <Icon name="account" size={16} color="#7f8c8d" />
                      <Text style={styles.reportLabel}>Reported By:</Text>
                      <Text style={styles.reportValue}>{report.reportedBy}</Text>
                    </View>

                    <View style={styles.reportRow}>
                      <Icon name="calendar" size={16} color="#7f8c8d" />
                      <Text style={styles.reportLabel}>Date:</Text>
                      <Text style={styles.reportValue}>
                        {new Date(report.dateReported).toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.reportActions}>
                      <Text style={styles.actionLabel}>Update Status:</Text>
                      <View style={styles.statusButtons}>
                        {STATUS_OPTIONS.map((status) => (
                          <TouchableOpacity
                            key={status}
                            style={[
                              styles.statusButton,
                              report.status === status && styles.statusButtonActive
                            ]}
                            onPress={() => handleStatusChange(report._id, status)}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.statusButtonText,
                              report.status === status && styles.statusButtonTextActive
                            ]}>
                              {status}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteReport(report._id)}
                        activeOpacity={0.8}
                      >
                        <Icon name="delete" size={18} color="#fff" />
                        <Text style={styles.deleteButtonText}>Delete Report</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noDataContainer}>
                  <Icon name="file-document-outline" size={64} color="#bdc3c7" />
                  <Text style={styles.noDataText}>No PCG reports found</Text>
                  <Text style={styles.noDataSubtext}>Reports assigned to PCG will appear here</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={fetchReports}
                    activeOpacity={0.8}
                  >
                    <Icon name="refresh" size={20} color="#fff" />
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </LinearGradient>
          </View>
        </View>

        {/* Footer */}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
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
  headerSection: {
    marginHorizontal: 20,
    marginTop: 70,
    marginBottom: 30,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#667eea',
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
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    textAlign: 'center',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
    textAlign: 'center',
  },
  reportCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
    marginTop: 12,
  },
  refreshButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  chart: {
    borderRadius: 16,
    marginTop: 8,
  },
  tableCard: {
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
  tableGradient: {
    padding: 20,
  },
  reportCard: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(236, 240, 241, 0.5)',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  reportType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
    marginRight: 8,
  },
  reportValue: {
    flex: 1,
    fontSize: 14,
    color: '#7f8c8d',
  },
  reportActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(236, 240, 241, 0.5)',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(149, 165, 166, 0.2)',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#667eea',
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
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
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noDataText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginTop: 16,
    fontWeight: '600',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
    borderRadius: 16,
    overflow: 'hidden',
  },
  footerGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 8,
    textAlign: 'center',
  },
});

export default PCGReports;