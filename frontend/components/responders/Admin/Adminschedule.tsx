// components/responders/Admin/AdminSchedule.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

// Define navigation types
type RootStackParamList = {
  Login: undefined;
  ResLogin: undefined;
  Admin: undefined;
  AdminDetect: undefined;
  AdminSchedule: undefined;
  AdminDonations: undefined;
  AdminUsers: undefined;
  AdminResponders: undefined;
  AdminDeactivated: undefined;
  AdminFlagged: undefined;
  AdminMessages: undefined;
};

type AdminScheduleNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminSchedule'>;

interface AdminScheduleProps {
  navigation: AdminScheduleNavigationProp;
}

interface Schedule {
  _id: string;
  userName: string;
  email: string;
  pickupDate: string;
  pickupTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

const Adminschedule: React.FC<AdminScheduleProps> = ({ navigation }) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [sidebarAnimation] = useState(new Animated.Value(-280));
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Update dimensions on resize
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = dimensions.width >= 768;

  // Platform-specific alert function
  const showAlert = (title: string, message: string, buttons?: any[]) => {
    if (Platform.OS === 'web') {
      if (title === 'Logout') {
        setShowLogoutConfirm(true);
      } else {
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  // Animate sidebar
  useEffect(() => {
    Animated.timing(sidebarAnimation, {
      toValue: isSidebarOpen ? 0 : -280,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isSidebarOpen]);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const responderType = await AsyncStorage.getItem('responderType');
        const email = await AsyncStorage.getItem('userEmail');
        const name = await AsyncStorage.getItem('userName');

        if (!token || responderType !== 'admin') {
          showAlert('Access Denied', 'You must be an admin to access this page.', [
            { text: 'OK', onPress: () => navigation.navigate('ResLogin') },
          ]);
        }

        if (email) setUserEmail(email);
        if (name) setUserName(name);
      } catch (error) {
        console.error('Error checking authentication:', error);
      }
    };

    checkAuth();
  }, [navigation]);

  // Fetch schedules from the API
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setIsLoading(true);
        const apiUrl = 'https://apk-blueguard-rosssyyy.onrender.com';
        const response = await fetch(`${apiUrl}/api/schedules`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch schedules');
        }
        
        const data = await response.json();
        setSchedules(data);
      } catch (error) {
        console.error('Error fetching schedules:', error);
        showAlert('Error', 'Failed to load schedules. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  // Handle status update
  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const apiUrl = 'https://apk-blueguard-rosssyyy.onrender.com';
      const response = await fetch(`${apiUrl}/api/schedules/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update the local state to reflect the change
        setSchedules((prevSchedules) =>
          prevSchedules.map((schedule) =>
            schedule._id === id ? { ...schedule, status: newStatus as any } : schedule
          )
        );
        showAlert('Success', 'Status updated successfully!');
        setShowStatusModal(false);
      } else {
        showAlert('Error', 'Failed to update status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showAlert('Error', 'An error occurred while updating status.');
    }
  };

  const handleLogout = async () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('responderType');
          await AsyncStorage.removeItem('userEmail');
          await AsyncStorage.removeItem('userName');
          await AsyncStorage.removeItem('responderId');
          navigation.navigate('ResLogin');
        },
      },
    ]);
  };

  const confirmLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('responderType');
    await AsyncStorage.removeItem('userEmail');
    await AsyncStorage.removeItem('userName');
    await AsyncStorage.removeItem('responderId');
    setShowLogoutConfirm(false);
    navigation.navigate('ResLogin');
  };

  const menuItems = [
    { icon: 'home', label: 'Dashboard', route: 'Admin', color: '#0A5EB0' },
    { icon: 'people', label: 'Users', route: 'AdminUsers', color: '#0A5EB0' },
    { icon: 'shield-checkmark', label: 'Responders', route: 'AdminResponders', color: '#0A5EB0' },
    { icon: 'close-circle', label: 'Deactivated', route: 'AdminDeactivated', color: '#0A5EB0' },
    { icon: 'flag', label: 'Flagged Reports', route: 'AdminFlagged', color: '#0A5EB0' },
    { icon: 'mail', label: 'Messages', route: 'AdminMessages', color: '#0A5EB0' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'confirmed':
        return '#0A5EB0';
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#FF4444';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'completed':
        return 'checkmark-done-circle';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setIsSidebarOpen(true)}
        >
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="calendar" size={32} color="white" />
          <Text style={styles.headerTitle}>SCHEDULED PICKUPS</Text>
        </View>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('Admin')}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          isWeb && isLargeScreen && styles.webContentContainer
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.innerContent,
          isWeb && isLargeScreen && styles.webInnerContent
        ]}>
          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.miniStatCard, { borderLeftColor: '#FFA500' }]}>
              <Ionicons name="time-outline" size={24} color="#FFA500" />
              <Text style={styles.miniStatNumber}>
                {schedules.filter(s => s.status === 'pending').length}
              </Text>
              <Text style={styles.miniStatLabel}>Pending</Text>
            </View>
            <View style={[styles.miniStatCard, { borderLeftColor: '#0A5EB0' }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#0A5EB0" />
              <Text style={styles.miniStatNumber}>
                {schedules.filter(s => s.status === 'confirmed').length}
              </Text>
              <Text style={styles.miniStatLabel}>Confirmed</Text>
            </View>
            <View style={[styles.miniStatCard, { borderLeftColor: '#4CAF50' }]}>
              <Ionicons name="checkmark-done-circle" size={24} color="#4CAF50" />
              <Text style={styles.miniStatNumber}>
                {schedules.filter(s => s.status === 'completed').length}
              </Text>
              <Text style={styles.miniStatLabel}>Completed</Text>
            </View>
          </View>

          {/* Schedule Table */}
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableTitle}>All Schedules</Text>
              <View style={styles.tableBadge}>
                <Text style={styles.tableBadgeText}>{schedules.length} Total</Text>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0A5EB0" />
                <Text style={styles.loadingText}>Loading schedules...</Text>
              </View>
            ) : schedules.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={80} color="#E0E0E0" />
                <Text style={styles.emptyText}>No scheduled pickups available</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.table}>
                  {/* Table Header */}
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableHeaderCell, styles.usernameColumn]}>Username</Text>
                    <Text style={[styles.tableHeaderCell, styles.emailColumn]}>Email</Text>
                    <Text style={[styles.tableHeaderCell, styles.dateColumn]}>Pickup Date</Text>
                    <Text style={[styles.tableHeaderCell, styles.timeColumn]}>Pickup Time</Text>
                    <Text style={[styles.tableHeaderCell, styles.statusColumn]}>Status</Text>
                  </View>

                  {/* Table Body */}
                  {schedules.map((schedule, index) => (
                    <View 
                      key={schedule._id} 
                      style={[
                        styles.tableRow, 
                        styles.dataRow,
                        index % 2 === 0 && styles.evenRow
                      ]}
                    >
                      <Text style={[styles.tableCell, styles.usernameColumn]}>
                        {schedule.userName}
                      </Text>
                      <Text style={[styles.tableCell, styles.emailColumn, styles.emailText]}>
                        {schedule.email}
                      </Text>
                      <Text style={[styles.tableCell, styles.dateColumn]}>
                        {schedule.pickupDate}
                      </Text>
                      <Text style={[styles.tableCell, styles.timeColumn]}>
                        {schedule.pickupTime}
                      </Text>
                      <TouchableOpacity
                        style={[styles.tableCell, styles.statusColumn]}
                        onPress={() => {
                          setSelectedSchedule(schedule);
                          setShowStatusModal(true);
                        }}
                      >
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(schedule.status) }
                        ]}>
                          <Ionicons 
                            name={getStatusIcon(schedule.status) as any} 
                            size={16} 
                            color="white" 
                          />
                          <Text style={styles.statusText}>
                            {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sidebar Modal */}
      <Modal visible={isSidebarOpen} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.sidebarOverlay}
          activeOpacity={1}
          onPress={() => setIsSidebarOpen(false)}
        >
          <Animated.View
            style={[
              styles.modernSidebar,
              { transform: [{ translateX: sidebarAnimation }] },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Sidebar Header */}
            <View style={styles.sidebarHeader}>
              <View style={styles.profileSection}>
                <View style={styles.profileAvatar}>
                  <MaterialCommunityIcons name="shield-account" size={40} color="white" />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{userName || 'Admin'}</Text>
                  <Text style={styles.profileEmail}>{userEmail}</Text>
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <ScrollView style={styles.sidebarMenu} showsVerticalScrollIndicator={false}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => {
                    if (item.route) {
                      navigation.navigate(item.route as any);
                    }
                    setIsSidebarOpen(false);
                  }}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text style={styles.menuText}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Sidebar Footer */}
            <View style={styles.sidebarFooter}>
              <TouchableOpacity style={styles.logoutMenuItem} onPress={handleLogout}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="log-out" size={22} color="#FF4444" />
                </View>
                <Text style={[styles.menuText, { color: '#FF4444' }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Status Change Modal */}
      <Modal visible={showStatusModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.statusModal}>
            <View style={styles.statusModalHeader}>
              <Text style={styles.statusModalTitle}>Update Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedSchedule && (
              <>
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleInfoLabel}>User:</Text>
                  <Text style={styles.scheduleInfoValue}>{selectedSchedule.userName}</Text>
                </View>
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleInfoLabel}>Date:</Text>
                  <Text style={styles.scheduleInfoValue}>
                    {selectedSchedule.pickupDate} at {selectedSchedule.pickupTime}
                  </Text>
                </View>

                <Text style={styles.statusSelectLabel}>Select New Status:</Text>
                <View style={styles.statusOptions}>
                  {['pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        selectedSchedule.status === status && styles.statusOptionActive
                      ]}
                      onPress={() => {
                        handleStatusUpdate(selectedSchedule._id, status);
                      }}
                    >
                      <Ionicons 
                        name={getStatusIcon(status) as any} 
                        size={24} 
                        color={getStatusColor(status)} 
                      />
                      <Text style={[
                        styles.statusOptionText,
                        { color: getStatusColor(status) }
                      ]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutConfirm} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="log-out" size={50} color="#FF4444" />
            </View>
            <Text style={styles.confirmTitle}>Confirm Logout</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to logout from your admin account?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.logoutButton]}
                onPress={confirmLogout}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Adminschedule;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A5EB0',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuButton: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  webContentContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  innerContent: {
    width: '100%',
  },
  webInnerContent: {
    maxWidth: 1400,
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
  },
  miniStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  miniStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tableTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tableBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tableBadgeText: {
    fontSize: 12,
    color: '#0A5EB0',
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  table: {
    minWidth: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dataRow: {
    minHeight: 60,
  },
  evenRow: {
    backgroundColor: '#F9FAFB',
  },
  tableHeaderCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontWeight: 'bold',
    fontSize: 13,
    color: '#0A5EB0',
    backgroundColor: '#E3F2FD',
  },
  tableCell: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#333',
    justifyContent: 'center',
  },
  usernameColumn: {
    width: 150,
  },
  emailColumn: {
    width: 200,
  },
  dateColumn: {
    width: 120,
  },
  timeColumn: {
    width: 100,
  },
  statusColumn: {
    width: 140,
    alignItems: 'center',
  },
  emailText: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modernSidebar: {
    width: 280,
    height: '100%',
    backgroundColor: '#FFFFFF',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  sidebarHeader: {
    backgroundColor: '#0A5EB0',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sidebarMenu: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 20,
  },
  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  statusModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scheduleInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  scheduleInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    width: 60,
  },
  scheduleInfoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  statusSelectLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 16,
  },
  statusOptions: {
    gap: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  statusOptionActive: {
    borderColor: '#0A5EB0',
    backgroundColor: '#F0F7FF',
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  confirmIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF4444',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});