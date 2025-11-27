import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  Dimensions,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// API Base URL
const API_BASE_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

// Color palette for bars
const BAR_COLORS = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC949', '#AF7AA1', '#FF9DA7'];

const STATUS_OPTIONS = ['Pending', 'Ongoing', 'Completed'];

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
}

interface ChartData {
  name: string;
  count: number;
  color: string;
}

// Enhanced Sidebar Component
const BarangaySidebar = ({ isOpen, setIsOpen, userEmail, onLogout }: any) => {
  const navigation = useNavigation<any>();
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeRoute, setActiveRoute] = useState('BarangayReports');

  const navItems = [
    { label: 'Dashboard', icon: 'tachometer', route: 'Barangay', gradient: ['#667eea', '#764ba2'] },
    { label: 'Reports', icon: 'file-text', route: 'BarangayReports', gradient: ['#f093fb', '#f5576c'] },
    { label: 'Ongoing Reports', icon: 'spinner', route: 'BarangayOngoing', gradient: ['#4facfe', '#00f2fe'] },
    { label: 'Completed', icon: 'check-circle', route: 'BarangayCompleted', gradient: ['#43e97b', '#38f9d7'] },
    { label: 'Settings', icon: 'cog', route: 'BarangaySettings', gradient: ['#fa709a', '#fee140'] },
    { label: 'Messages', icon: 'envelope', route: 'Messages', gradient: ['#30cfd0', '#330867'] },
  ];

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const handleNavigation = (route: string) => {
    setActiveRoute(route);
    navigation.navigate(route);
    setIsOpen(false);
  };

  return (
    <Modal
      visible={isOpen}
      animationType="none"
      transparent={true}
      onRequestClose={() => setIsOpen(false)}
    >
      <TouchableOpacity
        style={styles.sidebarOverlay}
        activeOpacity={1}
        onPress={() => setIsOpen(false)}
      >
        <Animated.View
          style={[
            styles.overlayBackground,
            { opacity: fadeAnim }
          ]}
        />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.sidebar,
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        {/* Gradient Header */}
        <View style={styles.sidebarHeader}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Icon name="tint" size={32} color="#fff" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.sidebarTitle}>Barangay</Text>
              <Text style={styles.sidebarSubtitle}>Management Portal</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsOpen(false)}
          >
            <Icon name="times" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* User Info Card */}
        {userEmail && (
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Icon name="user" size={24} color="#0077b6" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userLabel}>Logged in as</Text>
              <Text style={styles.userEmailText} numberOfLines={1}>
                {userEmail}
              </Text>
            </View>
          </View>
        )}

        {/* Navigation Menu */}
        <ScrollView
          style={styles.sidebarMenu}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.menuSectionTitle}>NAVIGATION</Text>
          {navItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                activeRoute === item.route && styles.menuItemActive
              ]}
              onPress={() => handleNavigation(item.route)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <View style={[
                  styles.iconContainer,
                  activeRoute === item.route && styles.iconContainerActive
                ]}>
                  <Icon
                    name={item.icon}
                    size={20}
                    color={activeRoute === item.route ? '#0077b6' : '#64748b'}
                  />
                </View>
                <Text style={[
                  styles.menuText,
                  activeRoute === item.route && styles.menuTextActive
                ]}>
                  {item.label}
                </Text>
              </View>
              {activeRoute === item.route && (
                <View style={styles.activeIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Logout Button */}
        <View style={styles.sidebarFooter}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={onLogout}
            activeOpacity={0.8}
          >
            <Icon name="sign-out" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

// Simple Bar Chart Component
const SimpleBarChart = ({ data }: { data: ChartData[] }) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <View style={styles.chartWrapper}>
      <Text style={styles.chartTitle}>Reports by Type</Text>
      <View style={styles.barsContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.barItem}>
            <View style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  {
                    height: (item.count / maxCount) * 200,
                    backgroundColor: item.color
                  }
                ]}
              />
            </View>
            <Text style={styles.barLabel} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.barCount}>{item.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Status Picker Component
const StatusPicker = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.statusButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.statusButtonText}>{value || 'Pending'}</Text>
        <Icon name="chevron-down" size={12} color="#0077b6" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>Select Status</Text>
            {STATUS_OPTIONS.map((status) => (
              <TouchableOpacity
                key={status}
                style={styles.pickerOption}
                onPress={() => {
                  onChange(status);
                  setVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerOptionText}>{status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// Main Component
const BarangayReports = () => {
  const navigation = useNavigation<any>();
  const [reports, setReports] = useState<Report[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Process reports into chart data format
  const processChartData = useCallback((data: Report[]) => {
    const reportCounts: { [key: string]: number } = {};
    data.forEach(report => {
      reportCounts[report.type] = (reportCounts[report.type] || 0) + 1;
    });

    const formattedData: ChartData[] = Object.keys(reportCounts).map((type, index) => ({
      name: type,
      count: reportCounts[type],
      color: BAR_COLORS[index % BAR_COLORS.length]
    }));

    setChartData(formattedData);
  }, []);

  // Fetch reports
  const fetchReports = useCallback(async () => {
    try {
      console.log('Fetching reports from:', `${API_BASE_URL}/api/barangay-reports`);
      const response = await fetch(`${API_BASE_URL}/api/barangay-reports`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      
      // Handle both array and object responses
      const reportsArray = Array.isArray(data) ? data : (data.reports || []);
      
      setReports(reportsArray);
      processChartData(reportsArray);
    } catch (error) {
      console.error('Error fetching reports:', error);
      Alert.alert('Error', 'Failed to fetch reports. Please check your connection.');
    }
  }, [processChartData]);

  useEffect(() => {
    checkAuth();
    fetchReports();
  }, [fetchReports]);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const responderType = await AsyncStorage.getItem('responderType');
      const email = await AsyncStorage.getItem('userEmail');

      if (!token || responderType !== 'barangay') {
        Alert.alert('Access Denied', 'You must be a barangay responder to access this page.');
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

  // Update status
  const handleStatusChange = async (reportId: string, newStatus: string) => {
    Alert.alert(
      'Confirm Update',
      'Are you sure you want to update the report status?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
              });

              if (response.ok) {
                setReports((prevReports) =>
                  prevReports.map((report) =>
                    report._id === reportId ? { ...report, status: newStatus } : report
                  )
                );
                Alert.alert('Success', 'Report status updated successfully!');
              } else {
                Alert.alert('Error', 'Failed to update report status.');
              }
            } catch (error) {
              console.error('Error updating status:', error);
              Alert.alert('Error', 'Error updating status. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Delete report
  const handleDeleteReport = async (reportId: string) => {
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
              const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                setReports((prevReports) => prevReports.filter((report) => report._id !== reportId));
                Alert.alert('Success', 'Report deleted successfully!');
              } else {
                Alert.alert('Error', 'Failed to delete report.');
              }
            } catch (error) {
              console.error('Error deleting report:', error);
              Alert.alert('Error', 'Error deleting report. Please try again.');
            }
          }
        }
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

  return (
    <View style={styles.container}>
      {/* Hamburger Menu */}
      <TouchableOpacity
        style={styles.hamburger}
        onPress={() => setIsSidebarOpen(true)}
        activeOpacity={0.7}
      >
        <Icon name="bars" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Sidebar */}
      <BarangaySidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      <ScrollView style={styles.main}>
        <View style={styles.content}>
          <Text style={styles.pageTitle}>📊 Barangay Reports</Text>

          {/* Chart Section */}
          <View style={styles.chartContainer}>
            <SimpleBarChart data={chartData} />
          </View>

          {/* Reports List */}
          <View style={styles.reportsListContainer}>
            <Text style={styles.sectionTitle}>All Reports</Text>
            {reports.length > 0 ? (
              reports.map((report) => (
                <View key={report._id} style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportType}>{report.type}</Text>
                    <StatusPicker
                      value={report.status || 'Pending'}
                      onChange={(newStatus) => handleStatusChange(report._id, newStatus)}
                    />
                  </View>

                  <View style={styles.reportRow}>
                    <Icon name="file-text-o" size={14} color="#6c757d" />
                    <Text style={styles.reportLabel}>Description:</Text>
                    <Text style={styles.reportValue}>{report.description}</Text>
                  </View>

                  <View style={styles.reportRow}>
                    <Icon name="map-marker" size={14} color="#6c757d" />
                    <Text style={styles.reportLabel}>Address:</Text>
                    <Text style={styles.reportValue}>{report.address}</Text>
                  </View>

                  <View style={styles.reportRow}>
                    <Icon name="comment" size={14} color="#6c757d" />
                    <Text style={styles.reportLabel}>Comment:</Text>
                    <Text style={styles.reportValue}>{report.comment}</Text>
                  </View>

                  <View style={styles.reportRow}>
                    <Icon name="gavel" size={14} color="#6c757d" />
                    <Text style={styles.reportLabel}>Predicted Law:</Text>
                    <Text style={styles.reportValue}>{report.predictedLaw}</Text>
                  </View>

                  <View style={styles.reportRow}>
                    <Icon name="user" size={14} color="#6c757d" />
                    <Text style={styles.reportLabel}>Reported By:</Text>
                    <Text style={styles.reportValue}>{report.reportedBy}</Text>
                  </View>

                  <View style={styles.reportRow}>
                    <Icon name="calendar" size={14} color="#6c757d" />
                    <Text style={styles.reportLabel}>Date:</Text>
                    <Text style={styles.reportValue}>
                      {new Date(report.dateReported).toLocaleString()}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteReport(report._id)}
                    activeOpacity={0.7}
                  >
                    <Icon name="trash" size={16} color="#fff" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="inbox" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No reports found.</Text>
              </View>
            )}
          </View>
        </View>
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
    backgroundColor: '#0077b6',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#ffffff',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  sidebarHeader: {
    backgroundColor: '#0077b6',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sidebarSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0077b6',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userLabel: {
    fontSize: 11,
    color: '#6c757d',
    marginBottom: 2,
  },
  userEmailText: {
    fontSize: 13,
    color: '#212529',
    fontWeight: '600',
  },
  sidebarMenu: {
    flex: 1,
    paddingHorizontal: 16,
  },
  menuSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6c757d',
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  menuItemActive: {
    backgroundColor: '#e7f3ff',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerActive: {
    backgroundColor: '#fff',
  },
  menuText: {
    fontSize: 15,
    color: '#495057',
    fontWeight: '500',
  },
  menuTextActive: {
    color: '#0077b6',
    fontWeight: '600',
  },
  activeIndicator: {
    width: 4,
    height: 24,
    backgroundColor: '#0077b6',
    borderRadius: 2,
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  logoutBtn: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  main: {
    flex: 1,
    marginTop: 60,
  },
  content: {
    padding: 20,
  },
  pageTitle: {
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
  chartContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  chartWrapper: {
    width: '100%',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 20,
    textAlign: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 250,
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  barWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 200,
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  barLabel: {
    fontSize: 11,
    color: '#495057',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  barCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 4,
  },
  reportsListContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0077b6',
    marginBottom: 16,
  },
  reportCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  reportType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0077b6',
    flex: 1,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0077b6',
  },
  statusButtonText: {
    fontSize: 13,
    color: '#0077b6',
    fontWeight: '600',
    marginRight: 6,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reportLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginLeft: 8,
    marginRight: 6,
  },
  reportValue: {
    fontSize: 13,
    color: '#212529',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: width * 0.8,
    maxWidth: 300,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#212529',
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});

export default BarangayReports;