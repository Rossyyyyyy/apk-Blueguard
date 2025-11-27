import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  Switch,
  Animated,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const API_URL = 'http://10.120.221.103:5000';

interface PCGInfo {
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

interface SidebarItem {
  title: string;
  icon: string;
  route: string;
}

const PCGSettings: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));
  const [pcgInfo, setPcgInfo] = useState<PCGInfo>({
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
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  useEffect(() => {
    checkAuth();
    startPulseAnimation();
    loadPreferences();
  }, []);

  useEffect(() => {
    if (userEmail) {
      fetchPcgInfo();
    }
  }, [userEmail]);

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

  const loadPreferences = async () => {
    try {
      const savedDarkMode = await AsyncStorage.getItem('darkMode');
      const savedNotifications = await AsyncStorage.getItem('notificationsEnabled');
      
      if (savedDarkMode === 'true') {
        setDarkMode(true);
      }
      if (savedNotifications !== null) {
        setNotificationsEnabled(savedNotifications === 'true');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const fetchPcgInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pcg-settings?email=${userEmail}`);
      setPcgInfo(response.data);
    } catch (error) {
      console.error('Error fetching PCG info:', error);
      Alert.alert('Error', 'Failed to load profile information.');
    }
  };

  const handleProfileChange = (name: keyof PCGInfo, value: string) => {
    setPcgInfo({ ...pcgInfo, [name]: value });
  };

  const updateProfile = async () => {
    if (!pcgInfo.name.trim() || !pcgInfo.address.trim() || !pcgInfo.contactNumber.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(`${API_URL}/api/pcg-settings`, pcgInfo);

      if (response.status === 200) {
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (name: keyof Passwords, value: string) => {
    setPasswords({ ...passwords, [name]: value });
  };

  const updatePassword = async () => {
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      Alert.alert('Validation Error', 'Please fill in all password fields.');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      Alert.alert('Password Mismatch', 'New passwords do not match!');
      return;
    }

    if (passwords.newPassword.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(`${API_URL}/api/pcg-settings/password`, {
        ...passwords,
        email: userEmail,
      });

      if (response.status === 200) {
        Alert.alert('Success', 'Password updated successfully!');
        setPasswords({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error: any) {
      console.error('Error updating password:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update password.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = async () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    try {
      await AsyncStorage.setItem('darkMode', newDarkMode.toString());
      Alert.alert('Settings Updated', `Dark mode ${newDarkMode ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
  };

  const toggleNotifications = async () => {
    const newNotifications = !notificationsEnabled;
    setNotificationsEnabled(newNotifications);
    try {
      await AsyncStorage.setItem('notificationsEnabled', newNotifications.toString());
      Alert.alert('Settings Updated', `Notifications ${newNotifications ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error saving notification preference:', error);
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

  const sidebarItems: SidebarItem[] = [
    { title: 'Dashboard', icon: 'view-dashboard', route: 'PCG' },
    { title: 'Reports', icon: 'file-document', route: 'PCGReports' },
    { title: 'Ongoing', icon: 'progress-clock', route: 'PCGOngoing' },
    { title: 'Completed', icon: 'check-circle', route: 'PCGCompleted' },
    { title: 'Messages', icon: 'message-text', route: 'PCGMessages' },
    { title: 'Settings', icon: 'cog', route: 'PCGSettings' },
  ];

  return (
    <View style={styles.container}>
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
                  style={[
                    styles.sidebarItem,
                    item.route === 'PCGSettings' && styles.sidebarItemActive
                  ]}
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
        contentContainerStyle={styles.mainContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
            style={styles.headerGradient}
          >
            <View style={styles.headerIconContainer}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.headerIconBadge}
              >
                <Icon name="cog" size={32} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.headerTitle}>System Settings</Text>
            <Text style={styles.headerSubtitle}>Manage your PCG account and preferences</Text>
          </LinearGradient>
        </View>

        {/* Profile Settings */}
        <View style={styles.settingsCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBadge}>
                <Icon name="account-circle" size={24} color="#667eea" />
              </View>
              <Text style={styles.cardTitle}>PCG Profile</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PCG Name *</Text>
              <View style={styles.inputWrapper}>
                <Icon name="account" size={20} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={pcgInfo.name}
                  onChangeText={(value) => handleProfileChange('name', value)}
                  placeholder="Enter PCG name"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address *</Text>
              <View style={styles.inputWrapper}>
                <Icon name="map-marker" size={20} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={pcgInfo.address}
                  onChangeText={(value) => handleProfileChange('address', value)}
                  placeholder="Enter address"
                  placeholderTextColor="#999"
                  multiline
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Number *</Text>
              <View style={styles.inputWrapper}>
                <Icon name="phone" size={20} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={pcgInfo.contactNumber}
                  onChangeText={(value) => handleProfileChange('contactNumber', value)}
                  placeholder="Enter contact number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrapper, styles.inputDisabled]}>
                <Icon name="email" size={20} color="#bdc3c7" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.disabledText]}
                  value={pcgInfo.email}
                  placeholder="Email address"
                  placeholderTextColor="#999"
                  editable={false}
                />
              </View>
              <Text style={styles.helperText}>Email cannot be changed</Text>
            </View>

            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]}
              onPress={updateProfile}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <Text style={styles.buttonText}>Updating...</Text>
                ) : (
                  <>
                    <Icon name="content-save" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Update Profile</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Password Settings */}
        <View style={styles.settingsCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBadge, { backgroundColor: 'rgba(245, 87, 108, 0.1)' }]}>
                <Icon name="lock-reset" size={24} color="#f5576c" />
              </View>
              <Text style={styles.cardTitle}>Change Password</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password *</Text>
              <View style={styles.inputWrapper}>
                <Icon name="lock" size={20} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={passwords.currentPassword}
                  onChangeText={(value) => handlePasswordChange('currentPassword', value)}
                  placeholder="Enter current password"
                  placeholderTextColor="#999"
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password *</Text>
              <View style={styles.inputWrapper}>
                <Icon name="lock-plus" size={20} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={passwords.newPassword}
                  onChangeText={(value) => handlePasswordChange('newPassword', value)}
                  placeholder="Enter new password"
                  placeholderTextColor="#999"
                  secureTextEntry
                />
              </View>
              <Text style={styles.helperText}>Must be at least 6 characters</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password *</Text>
              <View style={styles.inputWrapper}>
                <Icon name="lock-check" size={20} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={passwords.confirmPassword}
                  onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
                  placeholder="Confirm new password"
                  placeholderTextColor="#999"
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.button, styles.dangerButton]}
              onPress={updatePassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#f093fb', '#f5576c']}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <Text style={styles.buttonText}>Updating...</Text>
                ) : (
                  <>
                    <Icon name="lock-reset" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Change Password</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* System Preferences */}
        <View style={styles.settingsCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBadge, { backgroundColor: 'rgba(79, 172, 254, 0.1)' }]}>
                <Icon name="tune" size={24} color="#4facfe" />
              </View>
              <Text style={styles.cardTitle}>System Preferences</Text>
            </View>

            <View style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <View style={styles.preferenceIconBadge}>
                  <Icon name={darkMode ? "weather-night" : "white-balance-sunny"} size={24} color="#667eea" />
                </View>
                <View style={styles.preferenceInfo}>
                  <Text style={styles.preferenceTitle}>Dark Mode</Text>
                  <Text style={styles.preferenceDescription}>
                    {darkMode ? 'Dark theme enabled' : 'Light theme enabled'}
                  </Text>
                </View>
              </View>
              <Switch
                value={darkMode}
                onValueChange={toggleDarkMode}
                trackColor={{ false: '#e0e0e0', true: '#667eea' }}
                thumbColor={darkMode ? '#fff' : '#f4f3f4'}
                ios_backgroundColor="#e0e0e0"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <View style={styles.preferenceIconBadge}>
                  <Icon name={notificationsEnabled ? "bell" : "bell-off"} size={24} color="#11998e" />
                </View>
                <View style={styles.preferenceInfo}>
                  <Text style={styles.preferenceTitle}>Notifications</Text>
                  <Text style={styles.preferenceDescription}>
                    {notificationsEnabled ? 'Receive push notifications' : 'Notifications disabled'}
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#e0e0e0', true: '#11998e' }}
                thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
                ios_backgroundColor="#e0e0e0"
              />
            </View>
          </LinearGradient>
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
    backgroundColor: '#f0f2f5',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.3,
    opacity: 0.3,
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
    marginTop: Platform.OS === 'ios' ? 100 : 70,
  },
  mainContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 30,
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
  headerGradient: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  headerIconContainer: {
    marginBottom: 16,
  },
  headerIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  settingsCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardGradient: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#d0d0d0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#2c3e50',
  },
  disabledText: {
    color: '#95a5a6',
  },
  helperText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 6,
    marginLeft: 4,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryButton: {},
  dangerButton: {},
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  preferenceInfo: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  footer: {
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

export default PCGSettings;