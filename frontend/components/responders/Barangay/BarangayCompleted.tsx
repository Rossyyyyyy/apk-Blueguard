import React, { useEffect, useState, useRef } from 'react';
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
import { PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// API Base URL
const API_BASE_URL = 'http://10.120.221.103:5000';

// Colors for the chart
const CHART_COLORS = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC949', '#AF7AA1', '#FF9DA7'];

interface Report {
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
  legendFontColor: string;
  legendFontSize: number;
}

// Enhanced Sidebar Component
const BarangaySidebar = ({ isOpen, setIsOpen, userEmail, onLogout }: any) => {
  const navigation = useNavigation<any>();
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeRoute, setActiveRoute] = useState('BarangayCompleted');

  const navItems = [
    { label: 'Dashboard', icon: 'tachometer', route: 'Barangay' },
    { label: 'Reports', icon: 'file-text', route: 'BarangayReports' },
    { label: 'Ongoing Reports', icon: 'spinner', route: 'BarangayOngoing' },
    { label: 'Completed', icon: 'check-circle', route: 'BarangayCompleted' },
    { label: 'Cancelled', icon: 'times-circle', route: 'BarangayCancelled' },
    { label: 'Settings', icon: 'cog', route: 'BarangaySettings' },
    { label: 'Messages', icon: 'envelope', route: 'Messages' },
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
        {/* Header */}
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

// Main Component
const BarangayCompleted = () => {
  const navigation = useNavigation<any>();
  const [completedReports, setCompletedReports] = useState<Report[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    checkAuth();
    fetchCompletedReports();
  }, []);

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

  const fetchCompletedReports = async () => {
    try {
      console.log('Fetching Barangay completed reports...');
      
      // FIXED: Use the new dedicated endpoint for Barangay
      const response = await fetch(`${API_BASE_URL}/api/completed-reports-barangay`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      
      // Handle both array and object responses
      const reportsArray = Array.isArray(data) ? data : [];
      
      setCompletedReports(reportsArray);

      // Process chart data
      const reportCounts: { [key: string]: number } = {};
      reportsArray.forEach((report: Report) => {
        reportCounts[report.type] = (reportCounts[report.type] || 0) + 1;
      });

      const processedChartData = Object.keys(reportCounts).map((type, index) => ({
        name: type,
        value: reportCounts[type],
        color: CHART_COLORS[index % CHART_COLORS.length],
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      }));

      setChartData(processedChartData);
    } catch (error) {
      console.error('Error fetching completed reports:', error);
      Alert.alert('Error', 'Failed to fetch completed reports');
      setCompletedReports([]);
      setChartData([]);
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
              // FIXED: Use the new dedicated endpoint for Barangay
              const response = await fetch(`${API_BASE_URL}/api/completed-reports-barangay/${id}`, {
                method: 'DELETE',
              });

              const result = await response.json();
              if (response.ok) {
                setCompletedReports((prevReports) =>
                  prevReports.filter((report) => report._id !== id)
                );
                Alert.alert('Success', 'Report deleted successfully');
                // Refresh chart data
                fetchCompletedReports();
              } else {
                Alert.alert('Error', result.message || 'Failed to delete report');
              }
            } catch (error) {
              console.error('Error deleting:', error);
              Alert.alert('Error', 'Error deleting report. Please try again.');
            }
          },
        },
      ]
    );
  };

  const downloadPDF = () => {
    Alert.alert('Info', 'PDF download is available on web version');
  };

  const downloadExcel = () => {
    Alert.alert('Info', 'Excel download is available on web version');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userEmail', 'responderType']);
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
          <View style={styles.pageHeader}>
            <Icon name="check-circle" size={28} color="#4CAF50" />
            <Text style={styles.pageTitle}>Completed Reports</Text>
          </View>

          {/* Download Buttons */}
          <View style={styles.downloadButtons}>
            <TouchableOpacity style={styles.downloadBtn} onPress={downloadPDF} activeOpacity={0.8}>
              <Icon name="file-pdf-o" size={16} color="#fff" />
              <Text style={styles.downloadBtnText}>Download PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.downloadBtn} onPress={downloadExcel} activeOpacity={0.8}>
              <Icon name="file-excel-o" size={16} color="#fff" />
              <Text style={styles.downloadBtnText}>Download Excel</Text>
            </TouchableOpacity>
          </View>

          {/* Completed Reports Card */}
          <View style={styles.completedCard}>
            <View style={styles.cardIconContainer}>
              <Icon name="check-circle" size={40} color="#fff" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Total Completed Reports</Text>
              <Text style={styles.cardValue}>{completedReports.length}</Text>
            </View>
          </View>

          {/* Pie Chart */}
          {chartData.length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Report Distribution</Text>
              <PieChart
                data={chartData}
                width={width - 60}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="value"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          )}

          {/* Statistics Cards */}
          <View style={styles.statsContainer}>
            {chartData.slice(0, 3).map((item, index) => (
              <View key={index} style={[styles.statCard, { borderLeftColor: item.color }]}>
                <Text style={styles.statType}>{item.name}</Text>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>reports</Text>
              </View>
            ))}
          </View>

          {/* Table Section */}
          <View style={styles.tableSection}>
            <Text style={styles.tableSectionTitle}>Completed Reports Details</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={styles.table}>
                {/* Table Header */}
                <View style={styles.tableRow}>
                  <Text style={[styles.tableHeader, styles.colType]}>Type</Text>
                  <Text style={[styles.tableHeader, styles.colDesc]}>Description</Text>
                  <Text style={[styles.tableHeader, styles.colAddress]}>Address</Text>
                  <Text style={[styles.tableHeader, styles.colComment]}>Comment</Text>
                  <Text style={[styles.tableHeader, styles.colLaw]}>Predicted Law</Text>
                  <Text style={[styles.tableHeader, styles.colReported]}>Reported By</Text>
                  <Text style={[styles.tableHeader, styles.colDate]}>Date Reported</Text>
                  <Text style={[styles.tableHeader, styles.colDate]}>Date Completed</Text>
                  <Text style={[styles.tableHeader, styles.colAction]}>Actions</Text>
                </View>

                {/* Table Body */}
                {completedReports.length > 0 ? (
                  completedReports.map((report, index) => (
                    <View 
                      key={report._id} 
                      style={[
                        styles.tableRow, 
                        styles.tableDataRow,
                        index % 2 === 0 && styles.evenRow
                      ]}
                    >
                      <Text style={[styles.tableCell, styles.colType]}>{report.type}</Text>
                      <Text style={[styles.tableCell, styles.colDesc]}>{report.description}</Text>
                      <Text style={[styles.tableCell, styles.colAddress]}>{report.address}</Text>
                      <Text style={[styles.tableCell, styles.colComment]}>{report.comment}</Text>
                      <Text style={[styles.tableCell, styles.colLaw]}>{report.predictedLaw}</Text>
                      <Text style={[styles.tableCell, styles.colReported]}>{report.reportedBy}</Text>
                      <Text style={[styles.tableCell, styles.colDate]}>{formatDate(report.dateReported)}</Text>
                      <Text style={[styles.tableCell, styles.colDate]}>{formatDate(report.dateCompleted)}</Text>
                      <View style={[styles.tableCell, styles.colAction]}>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(report._id)}
                          activeOpacity={0.8}
                        >
                          <Icon name="trash" size={16} color="#fff" />
                          <Text style={styles.deleteBtnText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.noDataContainer}>
                    <Icon name="inbox" size={48} color="#ccc" />
                    <Text style={styles.noDataText}>No completed reports found.</Text>
                  </View>
                )}
              </View>
            </ScrollView>
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
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 12,
  },
  downloadButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  downloadBtn: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  completedCard: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  cardIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statType: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6c757d',
  },
  tableSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  table: {
    minWidth: isWeb ? '100%' : 1400,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tableDataRow: {
    minHeight: 60,
  },
  evenRow: {
    backgroundColor: '#f8f9fa',
  },
  tableHeader: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    padding: 12,
    textAlign: 'center',
  },
  tableCell: {
    padding: 12,
    fontSize: 13,
    color: '#495057',
    textAlign: 'center',
  },
  colType: {
    width: 120,
  },
  colDesc: {
    width: 180,
  },
  colAddress: {
    width: 150,
  },
  colComment: {
    width: 150,
  },
  colLaw: {
    width: 150,
  },
  colReported: {
    width: 120,
  },
  colDate: {
    width: 160,
  },
  colAction: {
    width: 120,
  },
  deleteBtn: {
    backgroundColor: '#E15759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 6,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

export default BarangayCompleted;