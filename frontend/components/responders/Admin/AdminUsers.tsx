import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';

// Type-safe imports for Expo modules
let FileSystem: any;
let Sharing: any;

if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system/legacy');
  Sharing = require('expo-sharing');
}

type RootStackParamList = {
  Login: undefined;
  ResLogin: undefined;
  Admin: undefined;
  AdminUsers: undefined;
  AdminResponders: undefined;
  AdminDeactivated: undefined;
  AdminFlagged: undefined;
  AdminMessages: undefined;
  AdminDetect: undefined;
  AdminSchedule: undefined;
  AdminDonations: undefined;
};

type AdminUsersNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface User {
  _id: string;
  name: string;
  email: string;
  status: 'active' | 'deactivated';
  role: string;
  gender?: string;
  createdAt?: string;
  isVerified?: boolean;
}

interface MenuItem {
  icon: string;
  label: string;
  route: keyof RootStackParamList | null;
  color: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  deactivatedUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  maleUsers: number;
  femaleUsers: number;
  nonBinaryUsers: number;
  newUsersThisMonth: number;
  growthRate: number;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarAnimation] = useState(new Animated.Value(-280));
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const navigation = useNavigation<AdminUsersNavigationProp>();

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = dimensions.width >= 768;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const showAlert = (title: string, message: string, buttons?: any[]) => {
    if (Platform.OS === 'web') {
      if (title === 'Logout') {
        setShowLogoutConfirm(true);
      } else {
        const shouldNavigate = window.confirm(`${title}\n\n${message}`);
        if (shouldNavigate && buttons && buttons[0]?.onPress) {
          buttons[0].onPress();
        }
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  useEffect(() => {
    Animated.timing(sidebarAnimation, {
      toValue: isSidebarOpen ? 0 : -280,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isSidebarOpen]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

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
      console.error('Error checking auth:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const apiUrl = Platform.OS === 'web' ? 'https://apk-blueguard-rosssyyy.onrender.com' : 'https://apk-blueguard-rosssyyy.onrender.com';
      const response = await fetch(`${apiUrl}/api/users`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // ONLY use data that comes from the server - no mock data
      if (Array.isArray(data)) {
        setUsers(data);
        calculateUserStats(data);
      } else if (data && Array.isArray(data.users)) {
        setUsers(data.users);
        calculateUserStats(data.users);
      } else {
        console.error('Unexpected data format:', data);
        setUsers([]);
        Alert.alert('Warning', 'Received unexpected data format from server');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      Alert.alert('Error', 'Failed to fetch users. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const calculateUserStats = (usersData: User[]) => {
    // ONLY calculate from actual existing user data from server
    const stats: UserStats = {
      totalUsers: usersData.length,
      activeUsers: usersData.filter(u => u.status === 'active').length,
      deactivatedUsers: usersData.filter(u => u.status === 'deactivated').length,
      verifiedUsers: usersData.filter(u => u.isVerified).length,
      unverifiedUsers: usersData.filter(u => !u.isVerified).length,
      maleUsers: usersData.filter(u => u.gender === 'male').length,
      femaleUsers: usersData.filter(u => u.gender === 'female').length,
      nonBinaryUsers: usersData.filter(u => u.gender === 'non-binary').length,
      newUsersThisMonth: 0,
      growthRate: 0,
    };

    // Only calculate new users if createdAt exists in the data
    if (usersData.length > 0 && usersData[0].createdAt) {
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      stats.newUsersThisMonth = usersData.filter(u => {
        if (!u.createdAt) return false;
        const createdDate = new Date(u.createdAt);
        return createdDate.getMonth() === thisMonth && createdDate.getFullYear() === thisYear;
      }).length;

      // Calculate growth rate only if we have historical data
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
      const lastMonthUsers = usersData.filter(u => {
        if (!u.createdAt) return false;
        const createdDate = new Date(u.createdAt);
        return createdDate.getMonth() === lastMonth && createdDate.getFullYear() === lastMonthYear;
      }).length;

      if (lastMonthUsers > 0) {
        stats.growthRate = ((stats.newUsersThisMonth - lastMonthUsers) / lastMonthUsers) * 100;
      }
    }

    setUserStats(stats);
  };

  const toggleStatus = async (id: string) => {
    try {
      const apiUrl = Platform.OS === 'web' ? 'https://apk-blueguard-rosssyyy.onrender.com' : 'https://apk-blueguard-rosssyyy.onrender.com';
      const response = await fetch(`${apiUrl}/api/users/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user._id === id ? { ...user, status: result.updatedUser.status } : user
          )
        );
        Alert.alert('Success', 'User status updated successfully');
        fetchUsers(); // Refresh stats
      } else {
        Alert.alert('Error', 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'An error occurred');
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

  const handleMenuPress = (route: keyof RootStackParamList | null) => {
    if (route) {
      navigation.navigate(route);
    }
    setIsSidebarOpen(false);
  };

  const menuItems: MenuItem[] = [
    { icon: 'home', label: 'Dashboard', route: 'Admin', color: '#0A5EB0' },
    { icon: 'people', label: 'Users', route: null, color: '#0A5EB0' },
    { icon: 'shield-checkmark', label: 'Responders', route: 'AdminResponders', color: '#0A5EB0' },
    { icon: 'close-circle', label: 'Deactivated', route: 'AdminDeactivated', color: '#0A5EB0' },
    { icon: 'flag', label: 'Flagged Reports', route: 'AdminFlagged', color: '#0A5EB0' },
    { icon: 'mail', label: 'Messages', route: 'AdminMessages', color: '#0A5EB0' },
  ];

  // Chart configurations
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(10, 94, 176, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 0,
  };

  const screenWidth = Math.min(dimensions.width - 40, isLargeScreen ? 800 : dimensions.width - 40);

  // Status Distribution Pie Chart - ONLY REAL DATA
  const statusChartData = [
    {
      name: 'Active',
      population: userStats?.activeUsers || 0,
      color: '#4CAF50',
      legendFontColor: '#333',
      legendFontSize: 14,
    },
    {
      name: 'Deactivated',
      population: userStats?.deactivatedUsers || 0,
      color: '#FF4444',
      legendFontColor: '#333',
      legendFontSize: 14,
    },
  ].filter(item => item.population > 0); // Only show if there's actual data

  // Gender Distribution Pie Chart - ONLY REAL DATA
  const genderChartData = [
    {
      name: 'Male',
      population: userStats?.maleUsers || 0,
      color: '#2196F3',
      legendFontColor: '#333',
      legendFontSize: 14,
    },
    {
      name: 'Female',
      population: userStats?.femaleUsers || 0,
      color: '#E91E63',
      legendFontColor: '#333',
      legendFontSize: 14,
    },
    {
      name: 'Non-Binary',
      population: userStats?.nonBinaryUsers || 0,
      color: '#9C27B0',
      legendFontColor: '#333',
      legendFontSize: 14,
    },
  ].filter(item => item.population > 0); // Only show categories with actual users

  // Verification Status Bar Chart - ONLY REAL DATA
  const verificationBarData = {
    labels: ['Verified', 'Unverified'],
    datasets: [
      {
        data: [
          userStats?.verifiedUsers || 0,
          userStats?.unverifiedUsers || 0,
        ],
      },
    ],
  };

  // User Growth Line Chart (ONLY from actual user creation dates)
  const getMonthlyGrowth = () => {
    const months = [];
    const data = [];
    const now = new Date();
    
    // Only show growth if users have createdAt dates
    if (users.length === 0 || !users[0]?.createdAt) {
      return { 
        labels: ['No Data'], 
        datasets: [{ data: [0] }] 
      };
    }
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(date.toLocaleDateString('en-US', { month: 'short' }));
      
      // Count actual users created in this month from server data
      const monthUsers = users.filter(u => {
        if (!u.createdAt) return false;
        const createdDate = new Date(u.createdAt);
        return createdDate.getMonth() === date.getMonth() && 
               createdDate.getFullYear() === date.getFullYear();
      }).length;
      
      data.push(monthUsers);
    }
    
    return { labels: months, datasets: [{ data }] };
  };

  const growthLineData = getMonthlyGrowth();

  const downloadPDF = async () => {
    try {
      if (!Array.isArray(users) || users.length === 0) {
        Alert.alert('No Data', 'No users to export');
        return;
      }

      if (Platform.OS === 'web') {
        let csvContent = 'Name,Email,Status,Gender,Verified,Created Date\n';
        users.forEach((user) => {
          csvContent += `${user.name},${user.email},${user.status},${user.gender || 'N/A'},${user.isVerified ? 'Yes' : 'No'},${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `user-list-${Date.now()}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        return;
      }

      let csvContent = 'Name,Email,Status,Gender,Verified,Created Date\n';
      users.forEach((user) => {
        csvContent += `${user.name},${user.email},${user.status},${user.gender || 'N/A'},${user.isVerified ? 'Yes' : 'No'},${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}\n`;
      });

      const fileName = `user-list-${Date.now()}.csv`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csvContent);

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Sharing.shareAsync(filePath);
      } else {
        Alert.alert('Success', `File saved to ${filePath}`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Failed to download file');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A5EB0" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

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
          <Ionicons name="people" size={32} color="white" />
          <Text style={styles.headerTitle}>USERS MANAGEMENT</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications" size={24} color="white" />
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>{userStats?.totalUsers || 0}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[
          styles.contentContainer,
          isWeb && isLargeScreen && styles.webContentContainer
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.innerContent, isWeb && isLargeScreen && styles.webInnerContent]}>
          {/* Statistics Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statPrimary]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="people" size={28} color="white" />
              </View>
              <Text style={styles.statNumber}>{userStats?.totalUsers || 0}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
              <Text style={styles.statSubtext}>All registered users</Text>
            </View>

            <View style={[styles.statCard, styles.statSuccess]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="checkmark-circle" size={28} color="white" />
              </View>
              <Text style={styles.statNumber}>{userStats?.activeUsers || 0}</Text>
              <Text style={styles.statLabel}>Active Users</Text>
              <Text style={styles.statSubtext}>Currently active</Text>
            </View>

            <View style={[styles.statCard, styles.statWarning]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FF9800' }]}>
                <Ionicons name="person-add" size={28} color="white" />
              </View>
              <Text style={styles.statNumber}>{userStats?.newUsersThisMonth || 0}</Text>
              <Text style={styles.statLabel}>New This Month</Text>
              <Text style={styles.statSubtext}>
                {userStats?.growthRate ? `${userStats.growthRate > 0 ? '+' : ''}${userStats.growthRate.toFixed(1)}%` : '0%'} growth
              </Text>
            </View>

            <View style={[styles.statCard, styles.statDanger]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FF4444' }]}>
                <Ionicons name="close-circle" size={28} color="white" />
              </View>
              <Text style={styles.statNumber}>{userStats?.deactivatedUsers || 0}</Text>
              <Text style={styles.statLabel}>Deactivated</Text>
              <Text style={styles.statSubtext}>Inactive accounts</Text>
            </View>
          </View>

          {/* Download Buttons */}
          <View style={styles.downloadButtons}>
            <TouchableOpacity style={styles.downloadButton} onPress={downloadPDF}>
              <Feather name="download" size={20} color="white" />
              <Text style={styles.downloadButtonText}>Export to CSV</Text>
            </TouchableOpacity>
          </View>

          {/* Charts Section - ONLY SHOW IF DATA EXISTS */}
          <View style={styles.chartsSection}>
            {/* Status Distribution - Only show if there are users */}
            {statusChartData.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>User Status Distribution</Text>
                <PieChart
                  data={statusChartData}
                  width={screenWidth > 768 ? 350 : screenWidth - 80}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </View>
            )}

            {/* Gender Distribution - Only show if gender data exists */}
            {genderChartData.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Gender Distribution</Text>
                <PieChart
                  data={genderChartData}
                  width={screenWidth > 768 ? 350 : screenWidth - 80}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </View>
            )}

            {/* Verification Status - Only show if verification data exists */}
            {(userStats?.verifiedUsers || 0) + (userStats?.unverifiedUsers || 0) > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Email Verification Status</Text>
                <BarChart
                  data={verificationBarData}
                  width={screenWidth > 768 ? 350 : screenWidth - 80}
                  height={220}
                  chartConfig={chartConfig}
                  verticalLabelRotation={0}
                  showValuesOnTopOfBars
                  fromZero
                  yAxisLabel=""
                  yAxisSuffix=""
                />
              </View>
            )}

            {/* User Growth Trend - Only show if createdAt dates exist */}
            {users.length > 0 && users[0]?.createdAt && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>User Growth (Last 6 Months)</Text>
                <LineChart
                  data={growthLineData}
                  width={screenWidth > 768 ? 350 : screenWidth - 80}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  fromZero
                />
              </View>
            )}
          </View>

          {/* Users List */}
          <View style={styles.usersList}>
            <View style={styles.usersListHeader}>
              <Text style={styles.usersListTitle}>All Users</Text>
              <View style={styles.filterChips}>
                <View style={[styles.chip, styles.chipActive]}>
                  <Text style={styles.chipText}>All ({userStats?.totalUsers || 0})</Text>
                </View>
              </View>
            </View>

            {Array.isArray(users) && users.length > 0 ? (
              users.map((user) => (
                <View key={user._id} style={styles.userItem}>
                  <View style={styles.userInfo}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {user.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <View style={styles.userNameRow}>
                        <Text style={styles.userName}>{user.name}</Text>
                        {user.isVerified && (
                          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        )}
                      </View>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      <View style={styles.userMeta}>
                        {user.gender && (
                          <View style={styles.metaChip}>
                            <Ionicons 
                              name={user.gender === 'male' ? 'male' : user.gender === 'female' ? 'female' : 'transgender'} 
                              size={12} 
                              color="#666" 
                            />
                            <Text style={styles.metaText}>{user.gender}</Text>
                          </View>
                        )}
                        <View style={[
                          styles.statusChip,
                          user.status === 'active' ? styles.statusActive : styles.statusDeactivated
                        ]}>
                          <View style={[
                            styles.statusDot,
                            user.status === 'active' ? styles.dotActive : styles.dotDeactivated
                          ]} />
                          <Text style={[
                            styles.statusText,
                            user.status === 'active' ? styles.statusActiveText : styles.statusDeactivatedText
                          ]}>
                            {user.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      user.status === 'active' ? styles.deactivateButton : styles.activateButton,
                    ]}
                    onPress={() => toggleStatus(user._id)}
                  >
                    <Ionicons 
                      name={user.status === 'active' ? 'close-circle' : 'checkmark-circle'} 
                      size={18} 
                      color="white" 
                    />
                    <Text style={styles.toggleButtonText}>
                      {user.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={60} color="#CCC" />
                <Text style={styles.noUsersText}>No users found.</Text>
              </View>
            )}
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Enhanced Sidebar Modal */}
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

            <ScrollView style={styles.sidebarMenu} showsVerticalScrollIndicator={false}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => handleMenuPress(item.route)}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text style={styles.menuText}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </ScrollView>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
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
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: '#0A5EB0',
  },
  statSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  statWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  statDanger: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#0A5EB0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  statSubtext: {
    fontSize: 11,
    color: '#999',
  },
  downloadButtons: {
    marginBottom: 20,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A5EB0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  chartsSection: {
    marginBottom: 20,
    gap: 20,
  },
  chartCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A5EB0',
    marginBottom: 15,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  usersList: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 30,
  },
  usersListHeader: {
    marginBottom: 20,
  },
  usersListTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0A5EB0',
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  chipActive: {
    backgroundColor: '#E3F2FD',
  },
  chipText: {
    fontSize: 12,
    color: '#0A5EB0',
    fontWeight: '600',
  },
  userItem: {
    backgroundColor: '#F8F9FA',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0A5EB0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  metaText: {
    fontSize: 11,
    color: '#666',
    textTransform: 'capitalize',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusDeactivated: {
    backgroundColor: '#FFEBEE',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#4CAF50',
  },
  dotDeactivated: {
    backgroundColor: '#FF4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusActiveText: {
    color: '#2E7D32',
  },
  statusDeactivatedText: {
    color: '#C62828',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  activateButton: {
    backgroundColor: '#4CAF50',
  },
  deactivateButton: {
    backgroundColor: '#FF4444',
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noUsersText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
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

export default AdminUsers;