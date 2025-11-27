import React, { useEffect, useState } from 'react';
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

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// API Base URL
const API_BASE_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

const STATUS_OPTIONS = ['Ongoing', 'Completed', 'Cancelled'];

// Define types
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

interface NGOSidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  userEmail: string;
  onLogout: () => void;
}

// NGO Sidebar Component
const NGOSidebar = ({ isOpen, setIsOpen, userEmail, onLogout }: NGOSidebarProps) => {
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

// Main NGO Ongoing Component
const NGOOngoing = () => {
  const navigation = useNavigation<any>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [ongoingReports, setOngoingReports] = useState<OngoingReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchOngoingReports();
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

  const fetchOngoingReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/ongoing-reports`);
      const data = await response.json();
      
      // Filter reports with responderType "NGO"
      const ngoReports = data.filter((report: OngoingReport) => report.responderType === 'NGO');
      setOngoingReports(ngoReports);
    } catch (error) {
      console.error('Error fetching ongoing reports:', error);
      Alert.alert('Error', 'Failed to fetch ongoing reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    Alert.alert(
      'Confirm Update',
      `Are you sure you want to mark this report as "${newStatus}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/api/ongoing-reports/${reportId}/status`,
                {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: newStatus }),
                }
              );

              if (response.ok) {
                // Remove from ongoingReports when completed or cancelled
                setOngoingReports((prevReports) =>
                  prevReports.filter((report) => report._id !== reportId)
                );
                Alert.alert('Success', `Report status updated to "${newStatus}" successfully!`);
              } else {
                Alert.alert('Error', 'Failed to update report status.');
              }
            } catch (error) {
              console.error('Error updating status:', error);
              Alert.alert('Error', 'Error updating status. Please try again.');
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const renderStatusPicker = (report: OngoingReport) => {
    return (
      <View style={styles.statusPickerContainer}>
        {STATUS_OPTIONS.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.statusButton,
              report.status === status && styles.statusButtonActive,
            ]}
            onPress={() => handleStatusChange(report._id, status)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.statusButtonText,
                report.status === status && styles.statusButtonTextActive,
              ]}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
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
          imageStyle={{ opacity: 0.3 }}
        >
          <View style={styles.content}>
            <View style={styles.pageHeader}>
              <Icon name="spinner" size={24} color="#0077b6" />
              <Text style={styles.title}>NGO Ongoing Reports</Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0077b6" />
                <Text style={styles.loadingText}>Loading ongoing reports...</Text>
              </View>
            ) : ongoingReports.length > 0 ? (
              <View style={styles.reportsContainer}>
                {ongoingReports.map((report) => (
                  <View key={report._id} style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                      <View style={styles.reportTypeContainer}>
                        <Icon name="flag" size={16} color="#0077b6" />
                        <Text style={styles.reportType}>{report.type}</Text>
                      </View>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>{report.status}</Text>
                      </View>
                    </View>

                    <View style={styles.reportSection}>
                      <Text style={styles.reportLabel}>Description:</Text>
                      <Text style={styles.reportValue}>{report.description}</Text>
                    </View>

                    <View style={styles.reportSection}>
                      <Text style={styles.reportLabel}>Address:</Text>
                      <Text style={styles.reportValue}>{report.address}</Text>
                    </View>

                    {report.comment && (
                      <View style={styles.reportSection}>
                        <Text style={styles.reportLabel}>Comment:</Text>
                        <Text style={styles.reportValue}>{report.comment}</Text>
                      </View>
                    )}

                    {report.predictedLaw && (
                      <View style={styles.reportSection}>
                        <Text style={styles.reportLabel}>Predicted Law:</Text>
                        <Text style={styles.reportValue}>{report.predictedLaw}</Text>
                      </View>
                    )}

                    <View style={styles.reportSection}>
                      <Text style={styles.reportLabel}>Reported By:</Text>
                      <Text style={styles.reportValue}>{report.reportedBy}</Text>
                    </View>

                    <View style={styles.dateContainer}>
                      <View style={styles.dateItem}>
                        <Icon name="calendar" size={14} color="#6c757d" />
                        <Text style={styles.dateLabel}>Reported:</Text>
                        <Text style={styles.dateValue}>{formatDate(report.dateReported)}</Text>
                      </View>
                      <View style={styles.dateItem}>
                        <Icon name="clock-o" size={14} color="#6c757d" />
                        <Text style={styles.dateLabel}>Ongoing:</Text>
                        <Text style={styles.dateValue}>{formatDate(report.dateOngoing)}</Text>
                      </View>
                    </View>

                    <View style={styles.actionSection}>
                      <Text style={styles.actionLabel}>Update Status:</Text>
                      {renderStatusPicker(report)}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Icon name="inbox" size={64} color="#ccc" />
                <Text style={styles.noDataText}>No ongoing reports found.</Text>
                <Text style={styles.noDataSubtext}>
                  Ongoing reports will appear here when assigned.
                </Text>
              </View>
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
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0077b6',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#495057',
  },
  reportsContainer: {
    gap: 16,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
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
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
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
  statusBadge: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  reportSection: {
    marginBottom: 12,
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
    lineHeight: 22,
  },
  dateContainer: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: isWeb ? 1 : undefined,
  },
  dateLabel: {
    fontSize: 13,
    color: '#6c757d',
    marginLeft: 6,
    marginRight: 4,
  },
  dateValue: {
    fontSize: 13,
    color: '#212529',
    fontWeight: '500',
  },
  actionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  statusPickerContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusButton: {
    flex: isWeb ? 1 : undefined,
    minWidth: isWeb ? undefined : 100,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#dee2e6',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#0077b6',
    borderColor: '#0077b6',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  noDataContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginTop: 16,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default NGOOngoing;