// components/responders/Admin/AdminDeactivated.tsx
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
  Platform,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define navigation types
type RootStackParamList = {
  Login: undefined;
  ResLogin: undefined;
  Admin: undefined;
  AdminUsers: undefined;
  AdminResponders: undefined;
  AdminDeactivated: undefined;
  AdminFlagged: undefined;
  AdminMessages: undefined;
};

type AdminDeactivatedNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminDeactivated'>;

interface AdminDeactivatedProps {
  navigation: AdminDeactivatedNavigationProp;
}

interface DeactivatedUser {
  _id: string;
  fullName?: string;
  name?: string;
  email: string;
  responderType?: string;
  isActive: boolean;
}

const AdminDeactivated: React.FC<AdminDeactivatedProps> = ({ navigation }) => {
  const [deactivatedUsers, setDeactivatedUsers] = useState<DeactivatedUser[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarAnimation] = useState(new Animated.Value(-280));
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

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
        const confirmed = window.confirm(`${title}\n\n${message}`);
        if (confirmed && buttons && buttons.length > 1 && buttons[1]?.onPress) {
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

  // Fetch deactivated users
  const fetchDeactivatedUsers = async () => {
    try {
      setIsLoading(true);
      const apiUrl = 'https://apk-blueguard-rosssyyy.onrender.com';
      const response = await fetch(`${apiUrl}/api/deactivated-users-responders`);
      const data = await response.json();
      setDeactivatedUsers(data);
    } catch (error) {
      console.error('Error fetching deactivated users/responders:', error);
      showAlert('Error', 'Failed to fetch deactivated users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeactivatedUsers();
  }, []);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDeactivatedUsers();
    setRefreshing(false);
  };

  // Reactivate user
  const reactivateUser = async (user: DeactivatedUser) => {
    showAlert(
      'Reactivate User',
      `Are you sure you want to reactivate ${user.fullName || user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: async () => {
            try {
              const apiUrl = 'https://apk-blueguard-rosssyyy.onrender.com';
              const url = user.responderType
                ? `${apiUrl}/api/responders/${user._id}/toggle-status`
                : `${apiUrl}/api/users/${user._id}/status`;

              const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
              });

              if (response.ok) {
                showAlert('Success', `${user.fullName || user.name} has been reactivated.`);
                setDeactivatedUsers((prevUsers) => prevUsers.filter(u => u._id !== user._id));
              } else {
                showAlert('Error', 'Failed to reactivate user.');
              }
            } catch (error) {
              console.error('Error reactivating user:', error);
              showAlert('Error', 'An error occurred while reactivating the user.');
            }
          },
        },
      ]
    );
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
    { icon: 'close-circle', label: 'Deactivated', route: null, color: '#0A5EB0' },
    { icon: 'flag', label: 'Flagged Reports', route: 'AdminFlagged', color: '#0A5EB0' },
    { icon: 'mail', label: 'Messages', route: 'AdminMessages', color: '#0A5EB0' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setIsSidebarOpen(true)}
        >
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="close-circle" size={32} color="white" />
          <Text style={styles.headerTitle}>DEACTIVATED</Text>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.innerContent,
          isWeb && isLargeScreen && styles.webInnerContent
        ]}>
          {/* Page Header */}
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderContent}>
              <Text style={styles.pageTitle}>Deactivated Accounts</Text>
              <Text style={styles.pageSubtitle}>
                Manage and reactivate deactivated users and responders
              </Text>
            </View>
            <View style={styles.statsCard}>
              <Text style={styles.statsNumber}>{deactivatedUsers.length}</Text>
              <Text style={styles.statsLabel}>Deactivated</Text>
            </View>
          </View>

          {/* Deactivated Users List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Deactivated Users & Responders</Text>
              <TouchableOpacity onPress={fetchDeactivatedUsers}>
                <Ionicons name="refresh" size={24} color="#0A5EB0" />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0A5EB0" />
                <Text style={styles.loadingText}>Loading deactivated accounts...</Text>
              </View>
            ) : deactivatedUsers.length > 0 ? (
              <View style={styles.usersList}>
                {deactivatedUsers.map((user, index) => (
                  <View key={user._id} style={styles.userCard}>
                    <View style={styles.userIconContainer}>
                      <MaterialCommunityIcons 
                        name={user.responderType ? "shield-account" : "account"} 
                        size={40} 
                        color="#999" 
                      />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {user.fullName || user.name}
                      </Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      <View style={styles.userBadge}>
                        <Text style={styles.badgeText}>
                          {user.responderType ? `${user.responderType} Responder` : 'User'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.reactivateButton}
                      onPress={() => reactivateUser(user)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                      <Text style={styles.reactivateButtonText}>Reactivate</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="account-check" size={80} color="#E0E0E0" />
                <Text style={styles.emptyStateTitle}>No Deactivated Accounts</Text>
                <Text style={styles.emptyStateText}>
                  All users and responders are currently active
                </Text>
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
                  style={[
                    styles.menuItem,
                    !item.route && styles.menuItemActive
                  ]}
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
                  {item.route && <Ionicons name="chevron-forward" size={20} color="#999" />}
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

export default AdminDeactivated;

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
  pageHeader: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pageHeaderContent: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  statsCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
  },
  statsNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  userIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  userBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    color: '#0A5EB0',
    fontWeight: '600',
  },
  reactivateButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reactivateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 60,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
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
  menuItemActive: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 4,
    borderLeftColor: '#0A5EB0',
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