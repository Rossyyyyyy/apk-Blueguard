import React, { useState, useEffect } from 'react';
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
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// API Base URL
const API_BASE_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

// Define types
interface NGOInfo {
  name: string;
  address: string;
  contactNumber: string;
  email: string;
}

interface Passwords {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
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

// Main NGO Settings Component
const NGOSettings = () => {
  const navigation = useNavigation<any>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  const [ngoInfo, setNgoInfo] = useState<NGOInfo>({
    name: '',
    address: '',
    contactNumber: '',
    email: '',
  });

  const [passwords, setPasswords] = useState<Passwords>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    checkAuth();
    loadDarkMode();
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
        fetchNgoInfo(email);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const loadDarkMode = async () => {
    try {
      const savedDarkMode = await AsyncStorage.getItem('darkMode');
      if (savedDarkMode === 'true') {
        setDarkMode(true);
      }
    } catch (error) {
      console.error('Error loading dark mode:', error);
    }
  };

  const fetchNgoInfo = async (email: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/ngo-settings?email=${email}`);
      const data = await response.json();
      setNgoInfo(data);
    } catch (error) {
      console.error('Error fetching NGO info:', error);
      Alert.alert('Error', 'Failed to fetch NGO information.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (field: keyof NGOInfo, value: string) => {
    setNgoInfo({ ...ngoInfo, [field]: value });
  };

  const updateProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ngo-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ngoInfo),
      });

      if (response.ok) {
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', 'Failed to update profile.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Error updating profile. Please try again.');
    }
  };

  const handlePasswordChange = (field: keyof Passwords, value: string) => {
    setPasswords({ ...passwords, [field]: value });
  };

  const updatePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match!');
      return;
    }

    if (passwords.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/ngo-settings/password`, {
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
        Alert.alert('Error', 'Failed to update password. Please check your current password.');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      Alert.alert('Error', 'Error updating password. Please try again.');
    }
  };

  const toggleDarkMode = async () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    try {
      await AsyncStorage.setItem('darkMode', String(newDarkMode));
    } catch (error) {
      console.error('Error saving dark mode:', error);
    }
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    // You can save this to AsyncStorage if needed
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userEmail', 'responderType']);
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const containerStyle = darkMode ? [styles.container, styles.darkContainer] : styles.container;
  const cardStyle = darkMode ? [styles.card, styles.darkCard] : styles.card;
  const inputStyle = darkMode ? [styles.input, styles.darkInput] : styles.input;
  const textStyle = darkMode ? [styles.text, styles.darkText] : styles.text;

  return (
    <View style={containerStyle}>
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
              <Icon name="cog" size={24} color="#0077b6" />
              <Text style={[styles.title, darkMode && styles.darkText]}>NGO System Settings</Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0077b6" />
                <Text style={styles.loadingText}>Loading settings...</Text>
              </View>
            ) : (
              <>
                {/* Profile Settings */}
                <View style={cardStyle}>
                  <View style={styles.sectionHeader}>
                    <Icon name="user" size={20} color="#0077b6" />
                    <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>
                      NGO Profile
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, darkMode && styles.darkText]}>NGO Name</Text>
                    <TextInput
                      style={inputStyle}
                      value={ngoInfo.name}
                      onChangeText={(value) => handleProfileChange('name', value)}
                      placeholder="Enter NGO name"
                      placeholderTextColor={darkMode ? '#999' : '#666'}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, darkMode && styles.darkText]}>Address</Text>
                    <TextInput
                      style={inputStyle}
                      value={ngoInfo.address}
                      onChangeText={(value) => handleProfileChange('address', value)}
                      placeholder="Enter address"
                      placeholderTextColor={darkMode ? '#999' : '#666'}
                      multiline
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, darkMode && styles.darkText]}>Contact Number</Text>
                    <TextInput
                      style={inputStyle}
                      value={ngoInfo.contactNumber}
                      onChangeText={(value) => handleProfileChange('contactNumber', value)}
                      placeholder="Enter contact number"
                      placeholderTextColor={darkMode ? '#999' : '#666'}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, darkMode && styles.darkText]}>Email Address</Text>
                    <TextInput
                      style={[inputStyle, styles.disabledInput]}
                      value={ngoInfo.email}
                      placeholder="Email address"
                      placeholderTextColor={darkMode ? '#999' : '#666'}
                      editable={false}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.button}
                    onPress={updateProfile}
                    activeOpacity={0.8}
                  >
                    <Icon name="save" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Update Profile</Text>
                  </TouchableOpacity>
                </View>

                {/* Password Settings */}
                <View style={cardStyle}>
                  <View style={styles.sectionHeader}>
                    <Icon name="lock" size={20} color="#0077b6" />
                    <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>
                      Change Password
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, darkMode && styles.darkText]}>Current Password</Text>
                    <TextInput
                      style={inputStyle}
                      value={passwords.currentPassword}
                      onChangeText={(value) => handlePasswordChange('currentPassword', value)}
                      placeholder="Enter current password"
                      placeholderTextColor={darkMode ? '#999' : '#666'}
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, darkMode && styles.darkText]}>New Password</Text>
                    <TextInput
                      style={inputStyle}
                      value={passwords.newPassword}
                      onChangeText={(value) => handlePasswordChange('newPassword', value)}
                      placeholder="Enter new password"
                      placeholderTextColor={darkMode ? '#999' : '#666'}
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, darkMode && styles.darkText]}>Confirm New Password</Text>
                    <TextInput
                      style={inputStyle}
                      value={passwords.confirmPassword}
                      onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
                      placeholder="Confirm new password"
                      placeholderTextColor={darkMode ? '#999' : '#666'}
                      secureTextEntry
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={updatePassword}
                    activeOpacity={0.8}
                  >
                    <Icon name="key" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Change Password</Text>
                  </TouchableOpacity>
                </View>

                {/* System Preferences */}
                <View style={cardStyle}>
                  <View style={styles.sectionHeader}>
                    <Icon name="sliders" size={20} color="#0077b6" />
                    <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>
                      System Preferences
                    </Text>
                  </View>

                  <View style={styles.preferenceItem}>
                    <View style={styles.preferenceLeft}>
                      <Icon
                        name={darkMode ? 'moon-o' : 'sun-o'}
                        size={20}
                        color={darkMode ? '#ffd700' : '#ff9800'}
                      />
                      <View style={styles.preferenceTextContainer}>
                        <Text style={[styles.preferenceTitle, darkMode && styles.darkText]}>
                          Dark Mode
                        </Text>
                        <Text style={[styles.preferenceSubtitle, darkMode && styles.darkSubtext]}>
                          {darkMode ? 'Dark mode is enabled' : 'Dark mode is disabled'}
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

                  <View style={styles.preferenceItem}>
                    <View style={styles.preferenceLeft}>
                      <Icon
                        name="bell"
                        size={20}
                        color={notificationsEnabled ? '#2196F3' : '#999'}
                      />
                      <View style={styles.preferenceTextContainer}>
                        <Text style={[styles.preferenceTitle, darkMode && styles.darkText]}>
                          Notifications
                        </Text>
                        <Text style={[styles.preferenceSubtitle, darkMode && styles.darkSubtext]}>
                          {notificationsEnabled
                            ? 'Receive alerts and updates'
                            : 'Notifications are disabled'}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={notificationsEnabled}
                      onValueChange={toggleNotifications}
                      trackColor={{ false: '#ccc', true: '#4CAF50' }}
                      thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                </View>
              </>
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
  darkContainer: {
    backgroundColor: '#181818',
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#495057',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkCard: {
    backgroundColor: '#1e1e1e',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0077b6',
    marginLeft: 10,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#212529',
  },
  darkInput: {
    backgroundColor: '#333',
    borderColor: '#444',
    color: '#fff',
  },
  disabledInput: {
    opacity: 0.6,
  },
  button: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonSecondary: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
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
  preferenceSubtitle: {
    fontSize: 13,
    color: '#6c757d',
  },
  text: {
    color: '#212529',
  },
  darkText: {
    color: '#ffffff',
  },
  darkSubtext: {
    color: '#999',
  },
});

export default NGOSettings;