// components/responders/Admin/Responders.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Only import on mobile, not on web - using legacy API for compatibility
const FileSystem = Platform.OS !== 'web' ? require('expo-file-system/legacy') : null;
const Sharing = Platform.OS !== 'web' ? require('expo-sharing') : null;

// Define navigation types
type RootStackParamList = {
  Login: undefined;
  ResLogin: undefined;
  AdminDetect: undefined;
  AdminSchedule: undefined;
  AdminDonations: undefined;
  AdminUsers: undefined;
  AdminResponders: undefined;
  AdminDeactivated: undefined;
  AdminFlagged: undefined;
  AdminMessages: undefined;
};

type RespondersNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminResponders'>;

interface RespondersProps {
  navigation: RespondersNavigationProp;
}

interface Responder {
  _id: string;
  fullName: string;
  email: string;
  responderType: string;
  isActive: boolean;
}

interface ResponderCounts {
  [key: string]: number;
}

const Responders: React.FC<RespondersProps> = ({ navigation }) => {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarAnimation] = useState(new Animated.Value(-280));
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = dimensions.width >= 768;

  // Update dimensions on resize
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Platform-specific alert function
  const showAlert = (title: string, message: string, buttons?: any[]) => {
    if (Platform.OS === 'web') {
      if (title === 'Logout') {
        setShowLogoutConfirm(true);
      } else {
        const shouldProceed = window.confirm(`${title}\n\n${message}`);
        if (shouldProceed && buttons && buttons.length > 1 && buttons[1]?.onPress) {
          buttons[1].onPress();
        }
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

  // Check authentication
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
          return;
        }

        if (email) setUserEmail(email);
        if (name) setUserName(name);
      } catch (error) {
        console.error('Error checking authentication:', error);
      }
    };

    checkAuth();
  }, [navigation]);

  // Fetch responders
  useEffect(() => {
    const fetchResponders = async () => {
      try {
        setIsLoading(true);
        const apiUrl = 'http://10.120.221.103:5000';
        const response = await fetch(`${apiUrl}/api/responders`);
        const data = await response.json();
        setResponders(data);
      } catch (error) {
        console.error('Error fetching responders:', error);
        showAlert('Error', 'Failed to fetch responders. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResponders();
  }, []);

  // Toggle responder status
  const toggleResponderStatus = async (id: string) => {
    showAlert(
      'Confirm Action',
      "Are you sure you want to change this responder's status?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const apiUrl = 'http://10.120.221.103:5000';
              const response = await fetch(`${apiUrl}/api/responders/${id}/toggle-status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
              });

              const data = await response.json();
              if (response.ok) {
                showAlert('Success', data.message);
                setResponders(
                  responders.map((responder) =>
                    responder._id === id
                      ? { ...responder, isActive: !responder.isActive }
                      : responder
                  )
                );
              } else {
                showAlert('Error', 'Failed to update responder: ' + data.message);
              }
            } catch (error) {
              console.error('Error updating responder:', error);
              showAlert('Error', 'Error updating responder. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Download PDF (Web only for now)
  const downloadPDF = () => {
    if (Platform.OS === 'web') {
      showAlert('Info', 'PDF download requires additional setup for web. Please use Excel export.');
    } else {
      showAlert('Info', 'PDF export is not available on mobile yet.');
    }
  };

  // Download Excel/CSV
  const downloadExcel = async () => {
    try {
      const csvContent = [
        ['Full Name', 'Email', 'Responder Type', 'Status'].join(','),
        ...responders.map((r) =>
          [r.fullName, r.email, r.responderType, r.isActive ? 'Active' : 'Inactive'].join(',')
        ),
      ].join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'responders-list.csv';
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Mobile export
        if (FileSystem && Sharing) {
          const fileUri = FileSystem.documentDirectory + 'responders-list.csv';
          await FileSystem.writeAsStringAsync(fileUri, csvContent);
          await Sharing.shareAsync(fileUri);
        }
      }

      showAlert('Success', 'File exported successfully!');
    } catch (error) {
      console.error('Error exporting file:', error);
      showAlert('Error', 'Failed to export file.');
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
    { icon: 'home', label: 'Dashboard', route: null, color: '#0A5EB0' },
    { icon: 'people', label: 'Users', route: 'AdminUsers', color: '#0A5EB0' },
    { icon: 'shield-checkmark', label: 'Responders', route: 'AdminResponders', color: '#0A5EB0' },
    { icon: 'close-circle', label: 'Deactivated', route: 'AdminDeactivated', color: '#0A5EB0' },
    { icon: 'flag', label: 'Flagged Reports', route: 'AdminFlagged', color: '#0A5EB0' },
    { icon: 'mail', label: 'Messages', route: 'AdminMessages', color: '#0A5EB0' },
  ];

  // Calculate stats
  const activeCount = responders.filter((r) => r.isActive).length;
  const inactiveCount = responders.length - activeCount;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setIsSidebarOpen(true)}>
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="shield-account" size={32} color="white" />
          <Text style={styles.headerTitle}>RESPONDERS</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          isWeb && isLargeScreen && styles.webContentContainer,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.innerContent, isWeb && isLargeScreen && styles.webInnerContent]}>
          {/* Title Card */}
          <View style={styles.titleCard}>
            <MaterialCommunityIcons name="account-group" size={40} color="#0A5EB0" />
            <View style={styles.titleContent}>
              <Text style={styles.titleText}>Responders Dashboard</Text>
              <Text style={styles.subtitleText}>Manage and monitor all responders</Text>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, styles.statBlue]}>
              <Ionicons name="people" size={32} color="#0A5EB0" />
              <Text style={styles.statNumber}>{responders.length}</Text>
              <Text style={styles.statLabel}>Total Responders</Text>
            </View>
            <View style={[styles.statCard, styles.statGreen]}>
              <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
              <Text style={styles.statNumber}>{activeCount}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={[styles.statCard, styles.statRed]}>
              <Ionicons name="close-circle" size={32} color="#dc2626" />
              <Text style={styles.statNumber}>{inactiveCount}</Text>
              <Text style={styles.statLabel}>Inactive</Text>
            </View>
          </View>

          {/* Download Buttons */}
          <View style={styles.downloadContainer}>
            <TouchableOpacity style={[styles.downloadButton, styles.pdfButton]} onPress={downloadPDF}>
              <Ionicons name="document-text" size={20} color="white" />
              <Text style={styles.downloadText}>Download PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.downloadButton, styles.excelButton]}
              onPress={downloadExcel}
            >
              <Ionicons name="document" size={20} color="white" />
              <Text style={styles.downloadText}>Download Excel</Text>
            </TouchableOpacity>
          </View>

          {/* Responders List */}
          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>Responders List</Text>
            {isLoading ? (
              <ActivityIndicator size="large" color="#0A5EB0" style={styles.loader} />
            ) : responders.length > 0 ? (
              responders.map((responder) => (
                <View key={responder._id} style={styles.responderCard}>
                  <View style={styles.responderInfo}>
                    <View style={styles.avatarContainer}>
                      <Ionicons name="person" size={24} color="#0A5EB0" />
                    </View>
                    <View style={styles.responderDetails}>
                      <Text style={styles.responderName}>{responder.fullName}</Text>
                      <Text style={styles.responderEmail}>{responder.email}</Text>
                      <Text style={styles.responderType}>{responder.responderType}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      responder.isActive ? styles.deactivateButton : styles.activateButton,
                    ]}
                    onPress={() => toggleResponderStatus(responder._id)}
                  >
                    <Text style={styles.statusButtonText}>
                      {responder.isActive ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>No responders found</Text>
              </View>
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
            style={[styles.modernSidebar, { transform: [{ translateX: sidebarAnimation }] }]}
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

export default Responders;

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
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
  },
  notificationButton: {
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
    maxWidth: 1200,
    width: '100%',
  },
  titleCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  titleContent: {
    flex: 1,
  },
  titleText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statBlue: {
    borderLeftWidth: 4,
    borderLeftColor: '#0A5EB0',
  },
  statGreen: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  statRed: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  downloadContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  downloadButton: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pdfButton: {
    backgroundColor: '#dc2626',
  },
  excelButton: {
    backgroundColor: '#28a745',
  },
  downloadText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  loader: {
    marginVertical: 40,
  },
  responderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  responderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  responderDetails: {
    flex: 1,
  },
  responderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  responderEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  responderType: {
    fontSize: 12,
    color: '#0A5EB0',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  activateButton: {
    backgroundColor: '#0077b6',
  },
  deactivateButton: {
    backgroundColor: '#dc2626',
  },
  statusButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
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