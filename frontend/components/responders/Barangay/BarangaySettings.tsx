import React, { useState, useEffect, useRef } from 'react';
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
  TextInput,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// API Base URL
const API_BASE_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

// Enhanced Sidebar Component
const BarangaySidebar = ({ isOpen, setIsOpen, userEmail, onLogout }: any) => {
  const navigation = useNavigation<any>();
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeRoute, setActiveRoute] = useState('BarangaySettings');

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

// Main BarangaySettings Component
const BarangaySettings = () => {
  const navigation = useNavigation<any>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  
  const [barangayInfo, setBarangayInfo] = useState({
    name: '',
    address: '',
    contactNumber: '',
    email: '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Fetch logged-in user email
  useEffect(() => {
    fetchUserEmail();
    loadDarkModePreference();
  }, []);

  const fetchUserEmail = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (email) {
        setUserEmail(email);
        fetchBarangayInfo(email);
      }
    } catch (error) {
      console.error('Error fetching user email:', error);
    }
  };

  // Fetch barangay details using the email
  const fetchBarangayInfo = async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/barangay-settings?email=${email}`);
      const data = await response.json();
      setBarangayInfo(data);
    } catch (error) {
      console.error('Error fetching barangay info:', error);
      Alert.alert('Error', 'Failed to fetch barangay information');
    }
  };

  // Handle profile updates
  const handleProfileChange = (field: string, value: string) => {
    setBarangayInfo({ ...barangayInfo, [field]: value });
  };

  const updateProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/barangay-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(barangayInfo),
      });

      if (response.ok) {
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', 'Failed to update profile.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  // Handle password updates
  const handlePasswordChange = (field: string, value: string) => {
    setPasswords({ ...passwords, [field]: value });
  };

  const updatePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match!');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/barangay-settings/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwords),
      });

      if (response.ok) {
        Alert.alert('Success', 'Password updated successfully!');
        setPasswords({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        Alert.alert('Error', 'Failed to update password.');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      Alert.alert('Error', 'Failed to update password.');
    }
  };

  // Load Dark Mode setting
  const loadDarkModePreference = async () => {
    try {
      const savedDarkMode = await AsyncStorage.getItem('darkMode');
      if (savedDarkMode === 'true') {
        setDarkMode(true);
      }
    } catch (error) {
      console.error('Error loading dark mode preference:', error);
    }
  };

  // Toggle Dark Mode and save preference
  const toggleDarkMode = async () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    try {
      await AsyncStorage.setItem('darkMode', String(newDarkMode));
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
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
    <View style={[styles.container, darkMode && styles.containerDark]}>
      {/* Enhanced Hamburger Menu */}
      <TouchableOpacity
        style={styles.hamburger}
        onPress={() => setIsSidebarOpen(true)}
        activeOpacity={0.7}
      >
        <Icon name="bars" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Enhanced Sidebar */}
      <BarangaySidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      <ScrollView style={[styles.main, darkMode && styles.mainDark]}>
        <View style={[styles.content, darkMode && styles.contentDark]}>
          <View style={styles.titleContainer}>
            <Icon name="cog" size={28} color="#0077b6" />
            <Text style={[styles.pageTitle, darkMode && styles.pageTitleDark]}>
              Barangay System Settings
            </Text>
          </View>

          {/* Profile Settings */}
          <View style={[styles.settingsSection, darkMode && styles.settingsSectionDark]}>
            <View style={styles.sectionHeader}>
              <Icon name="user" size={20} color="#0077b6" />
              <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>
                Barangay Profile
              </Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, darkMode && styles.inputLabelDark]}>
                Barangay Name
              </Text>
              <TextInput
                style={[styles.input, darkMode && styles.inputDark]}
                value={barangayInfo.name}
                onChangeText={(value) => handleProfileChange('name', value)}
                placeholder="Enter Barangay Name"
                placeholderTextColor={darkMode ? '#999' : '#666'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, darkMode && styles.inputLabelDark]}>
                Address
              </Text>
              <TextInput
                style={[styles.input, darkMode && styles.inputDark]}
                value={barangayInfo.address}
                onChangeText={(value) => handleProfileChange('address', value)}
                placeholder="Enter Address"
                placeholderTextColor={darkMode ? '#999' : '#666'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, darkMode && styles.inputLabelDark]}>
                Contact Number
              </Text>
              <TextInput
                style={[styles.input, darkMode && styles.inputDark]}
                value={barangayInfo.contactNumber}
                onChangeText={(value) => handleProfileChange('contactNumber', value)}
                placeholder="Enter Contact Number"
                placeholderTextColor={darkMode ? '#999' : '#666'}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, darkMode && styles.inputLabelDark]}>
                Email Address
              </Text>
              <TextInput
                style={[styles.input, styles.inputDisabled, darkMode && styles.inputDark]}
                value={barangayInfo.email}
                editable={false}
                placeholder="Email Address"
                placeholderTextColor={darkMode ? '#999' : '#666'}
              />
            </View>

            <TouchableOpacity
              style={styles.updateBtn}
              onPress={updateProfile}
              activeOpacity={0.8}
            >
              <Icon name="save" size={16} color="#fff" />
              <Text style={styles.btnText}>Update Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Password Settings */}
          <View style={[styles.settingsSection, darkMode && styles.settingsSectionDark]}>
            <View style={styles.sectionHeader}>
              <Icon name="lock" size={20} color="#0077b6" />
              <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>
                Change Password
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, darkMode && styles.inputLabelDark]}>
                Current Password
              </Text>
              <TextInput
                style={[styles.input, darkMode && styles.inputDark]}
                value={passwords.currentPassword}
                onChangeText={(value) => handlePasswordChange('currentPassword', value)}
                placeholder="Enter Current Password"
                placeholderTextColor={darkMode ? '#999' : '#666'}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, darkMode && styles.inputLabelDark]}>
                New Password
              </Text>
              <TextInput
                style={[styles.input, darkMode && styles.inputDark]}
                value={passwords.newPassword}
                onChangeText={(value) => handlePasswordChange('newPassword', value)}
                placeholder="Enter New Password"
                placeholderTextColor={darkMode ? '#999' : '#666'}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, darkMode && styles.inputLabelDark]}>
                Confirm New Password
              </Text>
              <TextInput
                style={[styles.input, darkMode && styles.inputDark]}
                value={passwords.confirmPassword}
                onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
                placeholder="Confirm New Password"
                placeholderTextColor={darkMode ? '#999' : '#666'}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.updateBtn}
              onPress={updatePassword}
              activeOpacity={0.8}
            >
              <Icon name="key" size={16} color="#fff" />
              <Text style={styles.btnText}>Change Password</Text>
            </TouchableOpacity>
          </View>

          {/* System Preferences */}
          <View style={[styles.settingsSection, darkMode && styles.settingsSectionDark]}>
            <View style={styles.sectionHeader}>
              <Icon name="sliders" size={20} color="#0077b6" />
              <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>
                System Preferences
              </Text>
            </View>

            {/* Dark Mode Toggle */}
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <Icon name="moon-o" size={20} color={darkMode ? '#fff' : '#495057'} />
                <View style={styles.preferenceTextContainer}>
                  <Text style={[styles.preferenceTitle, darkMode && styles.preferenceTitleDark]}>
                    Dark Mode
                  </Text>
                  <Text style={[styles.preferenceDesc, darkMode && styles.preferenceDescDark]}>
                    {darkMode ? 'Dark mode is enabled' : 'Enable dark mode for better night viewing'}
                  </Text>
                </View>
              </View>
              <Switch
                value={darkMode}
                onValueChange={toggleDarkMode}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor={darkMode ? '#fff' : '#f4f3f4'}
              />
            </View>

            {/* Notification Toggle */}
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <Icon name="bell-o" size={20} color={darkMode ? '#fff' : '#495057'} />
                <View style={styles.preferenceTextContainer}>
                  <Text style={[styles.preferenceTitle, darkMode && styles.preferenceTitleDark]}>
                    Notifications
                  </Text>
                  <Text style={[styles.preferenceDesc, darkMode && styles.preferenceDescDark]}>
                    {notificationsEnabled ? 'Notifications are enabled' : 'Enable notifications for updates'}
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
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
  containerDark: {
    backgroundColor: '#121212',
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
    backgroundColor: '#f4f4f4',
  },
  mainDark: {
    backgroundColor: '#121212',
  },
  content: {
    padding: 20,
  },
  contentDark: {
    backgroundColor: '#121212',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0077b6',
    marginLeft: 12,
  },
  pageTitleDark: {
    color: '#4fc3f7',
  },
  settingsSection: {
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
  settingsSectionDark: {
    backgroundColor: '#1e1e1e',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginLeft: 10,
  },
  sectionTitleDark: {
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  inputLabelDark: {
    color: '#e0e0e0',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#212529',
  },
  inputDark: {
    backgroundColor: '#333',
    borderColor: '#444',
    color: '#fff',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  updateBtn: {
    backgroundColor: '#0077b6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
    shadowColor: '#0077b6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  preferenceTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  preferenceTitleDark: {
    color: '#fff',
  },
  preferenceDesc: {
    fontSize: 13,
    color: '#6c757d',
  },
  preferenceDescDark: {
    color: '#999',
  },
});

export default BarangaySettings;