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
  ActivityIndicator,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const API_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

const STATUS_OPTIONS = ['Ongoing', 'Completed', 'Cancelled'];

interface OngoingReport {
  _id: string;
  type: string;
  description: string;
  address: string;
  comment: string;
  predictedLaw: string;
  reportedBy: string;
  dateReported: string;
  dateOngoing: string;
  status: string;
  responderType: string;
}

const PCGOngoing: React.FC = () => {
  const [ongoingReports, setOngoingReports] = useState<OngoingReport[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));
  const navigation = useNavigation<any>();

  useEffect(() => {
    checkAuth();
    fetchOngoingReports();
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

  const fetchOngoingReports = async () => {
  try {
    setLoading(true);
    console.log('🔍 Fetching PCG ongoing reports...');
    
    const response = await fetch(`${API_URL}/api/ongoing-reports-pcg`);
    
    // Check if response is OK
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    // Handle different response formats
    let reports = [];
    
    if (Array.isArray(data)) {
      // Data is already an array
      reports = data;
    } else if (data.success && Array.isArray(data.ongoingReports)) {
      // Data wrapped in success object
      reports = data.ongoingReports;
    } else if (data.ongoingReports) {
      // Data has ongoingReports property
      reports = data.ongoingReports;
    } else {
      console.warn('⚠️ Unexpected data format:', data);
      reports = [];
    }
    
    // Filter by PCG responder type (double-check)
    const pcgReports = reports.filter(
      (report: OngoingReport) => report.responderType === 'PCG'
    );
    
    console.log(`✅ Successfully fetched ${pcgReports.length} PCG ongoing reports`);
    setOngoingReports(pcgReports);
    
  } catch (error) {
    console.error('❌ Error fetching ongoing reports:', error);
    
    // Show user-friendly error
    Alert.alert(
      'Connection Error', 
      'Failed to fetch ongoing reports. Please check your internet connection and try again.',
      [
        { text: 'Retry', onPress: () => fetchOngoingReports() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  } finally {
    setLoading(false);
  }
};

// UPDATED handleStatusChange function
const handleStatusChange = async (reportId: string, newStatus: string) => {
  // Don't trigger if status is same
  if (newStatus === 'Ongoing') {
    return; // No need to update if already ongoing
  }
  
  Alert.alert(
    'Confirm Status Update',
    `Are you sure you want to mark this report as "${newStatus}"?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'default',
        onPress: async () => {
          try {
            console.log(`📝 Updating report ${reportId} to ${newStatus}...`);
            
            const response = await fetch(
              `${API_URL}/api/ongoing-reports/${reportId}/status`, 
              {
                method: 'PUT',
                headers: { 
                  'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ status: newStatus }),
              }
            );

            const result = await response.json();
            console.log('📦 Update response:', result);

            if (response.ok && result.success) {
              // Remove from ongoingReports list (since it's now completed/cancelled)
              setOngoingReports((prevReports) => 
                prevReports.filter((report) => report._id !== reportId)
              );
              
              Alert.alert(
                'Success', 
                `Report status updated to "${newStatus}" successfully!`
              );
              
              console.log(`✅ Report ${reportId} moved to ${newStatus}`);
            } else {
              Alert.alert(
                'Error', 
                result.message || 'Failed to update report status.'
              );
            }
          } catch (error) {
            console.error('❌ Error updating status:', error);
            Alert.alert(
              'Error', 
              'Error updating status. Please check your connection and try again.'
            );
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderReportCard = (report: OngoingReport) => (
    <View key={report._id} style={styles.reportCard}>
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
        style={styles.reportCardGradient}
      >
        {/* Header */}
        <View style={styles.reportHeader}>
          <View style={styles.reportTypeContainer}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.reportTypeBadge}
            >
              <Icon name="alert-circle" size={16} color="#fff" />
            </LinearGradient>
            <Text style={styles.reportType}>{report.type}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.reportContent}>
          <View style={styles.reportField}>
            <Icon name="text" size={18} color="#667eea" />
            <View style={styles.reportFieldContent}>
              <Text style={styles.reportFieldLabel}>Description</Text>
              <Text style={styles.reportFieldValue}>{report.description}</Text>
            </View>
          </View>

          <View style={styles.reportField}>
            <Icon name="map-marker" size={18} color="#667eea" />
            <View style={styles.reportFieldContent}>
              <Text style={styles.reportFieldLabel}>Address</Text>
              <Text style={styles.reportFieldValue}>{report.address}</Text>
            </View>
          </View>

          <View style={styles.reportField}>
            <Icon name="comment-text" size={18} color="#667eea" />
            <View style={styles.reportFieldContent}>
              <Text style={styles.reportFieldLabel}>Comment</Text>
              <Text style={styles.reportFieldValue}>{report.comment}</Text>
            </View>
          </View>

          <View style={styles.reportField}>
            <Icon name="gavel" size={18} color="#667eea" />
            <View style={styles.reportFieldContent}>
              <Text style={styles.reportFieldLabel}>Predicted Law</Text>
              <Text style={styles.reportFieldValue}>{report.predictedLaw}</Text>
            </View>
          </View>

          <View style={styles.reportField}>
            <Icon name="account" size={18} color="#667eea" />
            <View style={styles.reportFieldContent}>
              <Text style={styles.reportFieldLabel}>Reported By</Text>
              <Text style={styles.reportFieldValue}>{report.reportedBy}</Text>
            </View>
          </View>

          <View style={styles.reportDatesContainer}>
            <View style={styles.reportDateItem}>
              <Icon name="calendar-clock" size={16} color="#7f8c8d" />
              <View style={styles.dateTextContainer}>
                <Text style={styles.reportDateLabel}>Reported</Text>
                <Text style={styles.reportDateValue}>{formatDate(report.dateReported)}</Text>
              </View>
            </View>

            <View style={styles.reportDateItem}>
              <Icon name="clock-start" size={16} color="#7f8c8d" />
              <View style={styles.dateTextContainer}>
                <Text style={styles.reportDateLabel}>Ongoing Since</Text>
                <Text style={styles.reportDateValue}>{formatDate(report.dateOngoing)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Status Selector */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Update Status:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={report.status}
              onValueChange={(value) => handleStatusChange(report._id, value)}
              style={styles.picker}
            >
              {STATUS_OPTIONS.map((status) => (
                <Picker.Item key={status} label={status} value={status} />
              ))}
            </Picker>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <LinearGradient
        colors={['#0f2027', '#203a43', '#2c5364']}
        style={styles.backgroundGradient}
      />

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {sidebarOpen && (
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
                    item.route === 'PCGOngoing' && styles.sidebarItemActive,
                  ]}
                  onPress={() => {
                    setSidebarOpen(false);
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
                <Text style={styles.userEmail} numberOfLines={1}>
                  {userEmail}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Icon name="logout" size={20} color="#fff" />
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {/* Hamburger Menu */}
      <TouchableOpacity
        style={styles.hamburger}
        onPress={() => setSidebarOpen(!sidebarOpen)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
          style={styles.hamburgerGradient}
        >
          <Icon name={sidebarOpen ? 'close' : 'menu'} size={28} color="#2c3e50" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Main Content */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
            style={styles.pageHeaderGradient}
          >
            <View style={styles.pageHeaderContent}>
              <View style={styles.pageIconContainer}>
                <LinearGradient
                  colors={['#f093fb', '#f5576c']}
                  style={styles.pageIconGradient}
                >
                  <Icon name="progress-clock" size={32} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.pageTitleContainer}>
                <Text style={styles.pageTitle}>Ongoing Reports</Text>
                <Text style={styles.pageSubtitle}>
                  Track and manage active PCG cases
                </Text>
              </View>
            </View>
            <View style={styles.reportCountBadge}>
              <Text style={styles.reportCountText}>{ongoingReports.length}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Reports List */}
        <View style={styles.reportsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#667eea" />
              <Text style={styles.loadingText}>Loading ongoing reports...</Text>
            </View>
          ) : ongoingReports.length > 0 ? (
            ongoingReports.map(renderReportCard)
          ) : (
            <View style={styles.emptyStateCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
                style={styles.emptyStateGradient}
              >
                <Icon name="inbox" size={64} color="#bdc3c7" />
                <Text style={styles.emptyStateTitle}>No Ongoing Reports</Text>
                <Text style={styles.emptyStateText}>
                  There are currently no ongoing reports assigned to PCG.
                </Text>
              </LinearGradient>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
            style={styles.footerGradient}
          >
            <Icon name="shield-check" size={20} color="#667eea" />
            <Text style={styles.footerText}>
              © 2025 Philippine Coast Guard Management System
            </Text>
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
  pageHeader: {
    marginHorizontal: 20,
    marginTop: 70,
    marginBottom: 30,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#f5576c',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  pageHeaderGradient: {
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  pageHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pageIconContainer: {
    marginRight: 16,
  },
  pageIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitleContainer: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  reportCountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 87, 108, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  reportCountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f5576c',
  },
  reportsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  reportCard: {
    marginBottom: 20,
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
  reportCardGradient: {
    padding: 20,
  },
  reportHeader: {
    marginBottom: 20,
  },
  reportTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportTypeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  reportContent: {
    marginBottom: 20,
  },
  reportField: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  reportFieldContent: {
    flex: 1,
    marginLeft: 12,
  },
  reportFieldLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
    fontWeight: '600',
  },
  reportFieldValue: {
    fontSize: 15,
    color: '#2c3e50',
    lineHeight: 22,
  },
  reportDatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(236, 240, 241, 0.5)',
  },
  reportDateItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  dateTextContainer: {
    marginLeft: 8,
  },
  reportDateLabel: {
    fontSize: 11,
    color: '#95a5a6',
    marginBottom: 2,
  },
  reportDateValue: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  statusContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(236, 240, 241, 0.5)',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#2c3e50',
  },
  emptyStateCard: {
    marginTop: 40,
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
  emptyStateGradient: {
    padding: 60,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    marginHorizontal: 20,
    marginBottom: 40,
    marginTop: 20,
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

export default PCGOngoing;