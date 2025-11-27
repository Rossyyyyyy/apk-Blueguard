// components/responders/Admin/Admin.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

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

type AdminNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResLogin'>;

interface AdminProps {
  navigation: AdminNavigationProp;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  deactivatedUsers: number;
  totalResponders: number;
  totalReports: number;
  completedReports: number;
  pendingReports: number;
  totalSchedules: number;
  pendingSchedules: number;
  confirmedSchedules: number;
  completedSchedules: number;
  totalDonations: number;
}

interface ResponderCounts {
  [key: string]: number;
}

interface TopPerformer {
  userName: string;
  email: string;
  score: number;
}

const Admin: React.FC<AdminProps> = ({ navigation }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [responderCounts, setResponderCounts] = useState<ResponderCounts>({});
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [sidebarAnimation] = useState(new Animated.Value(-280));
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [isChatLoading, setIsChatLoading] = useState(false);

  const API_URL = Platform.OS === 'web' ? 'https://apk-blueguard-rosssyyy.onrender.com' : 'https://apk-blueguard-rosssyyy.onrender.com';

  // Update dimensions on resize
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = dimensions.width >= 768;
  const isExtraLargeScreen = dimensions.width >= 1200;

  // Platform-specific alert function
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

  // Fetch all dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch admin stats
      const statsResponse = await fetch(`${API_URL}/api/admin/stats`);
      const statsData = await statsResponse.json();

      // Fetch schedule stats
      const scheduleStatsResponse = await fetch(`${API_URL}/api/schedules/stats`);
      const scheduleStatsData = await scheduleStatsResponse.json();

      // Fetch donation stats
      const donationStatsResponse = await fetch(`${API_URL}/api/donations/stats`);
      const donationStatsData = await donationStatsResponse.json();

      // Fetch responder counts
      const responderResponse = await fetch(`${API_URL}/api/responder`);
      const responderData = await responderResponse.json();

      // Fetch top performers (from cleanups)
      const topPerformersResponse = await fetch(`${API_URL}/api/top-performers`);
      let topPerformersData: TopPerformer[] = [];
      
      if (topPerformersResponse.ok) {
        const data = await topPerformersResponse.json();
        topPerformersData = data.topPerformers || [];
      }

      // Combine all stats
      const combinedStats: DashboardStats = {
        totalUsers: statsData.stats.totalUsers || 0,
        activeUsers: statsData.stats.activeUsers || 0,
        deactivatedUsers: statsData.stats.deactivatedUsers || 0,
        totalResponders: statsData.stats.totalResponders || 0,
        totalReports: statsData.stats.totalReports || 0,
        completedReports: statsData.stats.completedReports || 0,
        pendingReports: statsData.stats.pendingReports || 0,
        totalSchedules: scheduleStatsData.stats?.total || 0,
        pendingSchedules: scheduleStatsData.stats?.pending || 0,
        confirmedSchedules: scheduleStatsData.stats?.confirmed || 0,
        completedSchedules: scheduleStatsData.stats?.completed || 0,
        totalDonations: donationStatsData.stats?.totalDonations || 0,
      };

      setStats(combinedStats);
      setResponderCounts(responderData);
      setTopPerformers(topPerformersData);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle chat with AI
 const handleSend = async () => {
  if (!input.trim()) return;

  const newMessages: Message[] = [...messages, { role: 'user', content: input }];
  setMessages(newMessages);
  setInput('');
  setIsChatLoading(true);

  try {
    // Use your OpenAI chatbot endpoint
    const response = await axios.post(`${API_URL}/api/chatbot`, {
      message: input,
      conversationHistory: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    });

    if (response.data.success && response.data.response) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: response.data.response },
      ]);
    } else {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: "Sorry, I couldn't process your request." },
      ]);
    }
  } catch (error) {
    console.error('Error fetching chatbot response:', error);
    setMessages([
      ...newMessages,
      { 
        role: 'assistant', 
        content: "I'm having trouble connecting right now. Here are some ocean conservation tips: Reduce plastic use, participate in beach cleanups, and report ocean pollution through our app!" 
      },
    ]);
  } finally {
    setIsChatLoading(false);
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

  // Calculate responsive columns for stats grid
  const getStatsColumns = () => {
    if (isExtraLargeScreen) return 4;
    if (isLargeScreen) return 2;
    return 2;
  };

  const statsColumns = getStatsColumns();
  const containerWidth = isWeb && isLargeScreen ? Math.min(dimensions.width - 40, 1400) : dimensions.width;
  const statCardWidth = isWeb && isLargeScreen 
    ? (containerWidth - 40 - (statsColumns - 1) * 12) / statsColumns 
    : (dimensions.width - 44) / 2;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0A5EB0" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
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
          <MaterialCommunityIcons name="shield-account" size={32} color="white" />
          <Text style={styles.headerTitle}>ADMIN PORTAL</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications" size={24} color="white" />
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>{stats?.pendingReports || 0}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Content with responsive container */}
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
          {/* Welcome Card */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeContent}>
              <Text style={[styles.welcomeTitle, isLargeScreen && styles.welcomeTitleLarge]}>
                Welcome back, {userName || 'Admin'}! 👋
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Manage and monitor your ocean protection platform
              </Text>
            </View>
            <View style={styles.welcomeIcon}>
              <MaterialCommunityIcons name="waves" size={60} color="#0A5EB0" opacity={0.2} />
            </View>
          </View>

          {/* Stats Grid */}
          <View style={[styles.statsGrid, { flexDirection: isLargeScreen ? 'row' : 'row', flexWrap: 'wrap' }]}>
            <View style={[styles.statCard, styles.statBlue, { width: statCardWidth }]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="document-text" size={28} color="white" />
              </View>
              <Text style={styles.statNumber}>{stats?.totalReports || 0}</Text>
              <Text style={styles.statLabel}>Total Reports</Text>
              <View style={styles.statTrend}>
                <Text style={styles.trendSubtext}>
                  {stats?.completedReports || 0} completed
                </Text>
              </View>
            </View>

            <View style={[styles.statCard, styles.statGreen, { width: statCardWidth }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="people" size={28} color="white" />
              </View>
              <Text style={styles.statNumber}>{stats?.activeUsers || 0}</Text>
              <Text style={styles.statLabel}>Active Users</Text>
              <View style={styles.statTrend}>
                <Text style={styles.trendSubtext}>
                  {stats?.totalUsers || 0} total users
                </Text>
              </View>
            </View>

            <View style={[styles.statCard, styles.statOrange, { width: statCardWidth }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FF9800' }]}>
                <Ionicons name="flag" size={28} color="white" />
              </View>
              <Text style={styles.statNumber}>{stats?.pendingReports || 0}</Text>
              <Text style={styles.statLabel}>Pending Reports</Text>
              <View style={styles.statTrend}>
                <Text style={styles.trendSubtext}>
                  Needs attention
                </Text>
              </View>
            </View>

            <View style={[styles.statCard, styles.statPurple, { width: statCardWidth }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#9C27B0' }]}>
                <MaterialCommunityIcons name="hand-heart" size={28} color="white" />
              </View>
              <Text style={styles.statNumber}>{stats?.totalDonations || 0}</Text>
              <Text style={styles.statLabel}>Donations</Text>
              <View style={styles.statTrend}>
                <Text style={styles.trendSubtext}>
                  Items donated
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={[styles.quickActionsGrid, isLargeScreen && styles.quickActionsGridLarge]}>
              <TouchableOpacity
                style={[styles.actionCard, isLargeScreen && styles.actionCardLarge]}
                onPress={() => navigation.navigate('AdminDetect')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                  <MaterialCommunityIcons name="camera-iris" size={32} color="#0A5EB0" />
                </View>
                <Text style={styles.actionTitle}>AI Detection</Text>
                <Text style={styles.actionDesc}>Identify waste types</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, isLargeScreen && styles.actionCardLarge]}
                onPress={() => navigation.navigate('AdminSchedule')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="calendar" size={32} color="#FF9800" />
                </View>
                <Text style={styles.actionTitle}>Schedules</Text>
                <Text style={styles.actionDesc}>
                  {stats?.pendingSchedules || 0} pending
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, isLargeScreen && styles.actionCardLarge]}
                onPress={() => navigation.navigate('AdminDonations')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
                  <MaterialCommunityIcons name="hand-heart" size={32} color="#9C27B0" />
                </View>
                <Text style={styles.actionTitle}>Donations</Text>
                <Text style={styles.actionDesc}>
                  {stats?.totalDonations || 0} total
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Two Column Layout for larger screens */}
          <View style={isLargeScreen ? styles.twoColumnLayout : null}>
            {/* System Overview */}
            <View style={[styles.section, isLargeScreen && styles.halfWidth]}>
              <Text style={styles.sectionTitle}>System Overview</Text>
              <View style={styles.analyticsCard}>
                <View style={styles.analyticsRow}>
                  <Ionicons name="calendar" size={24} color="#FF9800" />
                  <View style={styles.analyticsText}>
                    <Text style={styles.analyticsLabel}>Schedules</Text>
                    <Text style={styles.analyticsValue}>{stats?.totalSchedules || 0}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{stats?.pendingSchedules || 0} pending</Text>
                  </View>
                </View>

                <View style={styles.analyticsRow}>
                  <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
                  <View style={styles.analyticsText}>
                    <Text style={styles.analyticsLabel}>Responders</Text>
                    <Text style={styles.analyticsValue}>{stats?.totalResponders || 0}</Text>
                  </View>
                </View>

                <View style={styles.analyticsRow}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <View style={styles.analyticsText}>
                    <Text style={styles.analyticsLabel}>Completed Reports</Text>
                    <Text style={styles.analyticsValue}>{stats?.completedReports || 0}</Text>
                  </View>
                </View>

                <View style={styles.analyticsRow}>
                  <MaterialCommunityIcons name="account-off" size={24} color="#FF4444" />
                  <View style={styles.analyticsText}>
                    <Text style={styles.analyticsLabel}>Deactivated Accounts</Text>
                    <Text style={styles.analyticsValue}>{stats?.deactivatedUsers || 0}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Responder Types */}
            <View style={[styles.section, isLargeScreen && styles.halfWidth]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Responder Types</Text>
                <TouchableOpacity onPress={() => navigation.navigate('AdminResponders')}>
                  <Text style={styles.viewAllText}>View All →</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.leaderboardCard}>
                {Object.entries(responderCounts).map(([type, count], index) => (
                  <View key={index} style={styles.leaderboardRow}>
                    <View style={styles.leaderboardLeft}>
                      <View style={[styles.responderIcon, { backgroundColor: getResponderColor(type) + '20' }]}>
                        <Ionicons name="shield-checkmark" size={24} color={getResponderColor(type)} />
                      </View>
                      <View style={styles.leaderboardInfo}>
                        <Text style={styles.leaderboardName}>{type.toUpperCase()}</Text>
                        <Text style={styles.leaderboardReports}>{count} responder{count !== 1 ? 's' : ''}</Text>
                      </View>
                    </View>
                    <View style={[styles.rankBadge, { backgroundColor: getResponderColor(type) }]}>
                      <Text style={styles.rankText}>{count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Floating AI Assistant */}
      <TouchableOpacity 
        style={styles.floatingButton} 
        onPress={() => setIsModalOpen(true)}
        activeOpacity={0.8}
      >
        <Image source={require('../../../assets/cute.gif')} style={styles.floatingGif} />
        <View style={styles.floatingTextContainer}>
          <Text style={styles.floatingText}>Ask Sharkie</Text>
        </View>
      </TouchableOpacity>

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

      {/* Chat Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[
            styles.chatModal,
            isWeb && isLargeScreen && styles.chatModalWeb
          ]}>
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                <Image source={require('../../../assets/cute.gif')} style={styles.chatAvatar} />
                <View>
                  <Text style={styles.chatTitle}>Sharkie AI</Text>
                  <Text style={styles.chatSubtitle}>Your Ocean Guardian Assistant</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.chatBox} showsVerticalScrollIndicator={false}>
              {messages.length === 0 && (
                <View style={styles.emptyChat}>
                  <MaterialCommunityIcons name="robot-happy" size={80} color="#E0E0E0" />
                  <Text style={styles.emptyChatText}>
                    Hi! I'm Sharkie. Ask me anything about ocean protection!
                  </Text>
                </View>
              )}
              {messages.map((msg, index) => (
                <View
                  key={index}
                  style={msg.role === 'user' ? styles.userMessage : styles.botMessage}
                >
                  <View style={msg.role === 'user' ? styles.userBubble : styles.botBubble}>
                    <Text style={[styles.messageText, msg.role === 'user' && { color: 'white' }]}>
                      {msg.content}
                    </Text>
                  </View>
                </View>
              ))}
              {isChatLoading && (
                <View style={styles.loadingContainer}>
                  <View style={styles.typingIndicator}>
                    <View style={styles.typingDot} />
                    <View style={[styles.typingDot, { animationDelay: '0.2s' }]} />
                    <View style={[styles.typingDot, { animationDelay: '0.4s' }]} />
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                value={input}
                onChangeText={setInput}
                placeholder="Type your message..."
                placeholderTextColor="#999"
                multiline
              />
              <TouchableOpacity 
                style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]} 
                onPress={handleSend}
                disabled={!input.trim()}
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
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

// Helper function to get color for responder types
const getResponderColor = (type: string): string => {
  const colors: { [key: string]: string } = {
    'admin': '#0A5EB0',
    'barangay': '#4CAF50',
    'ngo': '#9C27B0',
    'pcg': '#2196F3',
  };
  return colors[type.toLowerCase()] || '#0A5EB0';
};

export default Admin;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
  welcomeCard: {
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
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  welcomeTitleLarge: {
    fontSize: 28,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  welcomeIcon: {
    marginLeft: 15,
  },
  statsGrid: {
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
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
  statOrange: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  statPurple: {
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
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
    marginBottom: 8,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '600',
  },
  trendSubtext: {
    fontSize: 11,
    color: '#999',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#0A5EB0',
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionsGridLarge: {
    flexWrap: 'wrap',
  },
  actionCard: {
    flex: 1,
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
  actionCardLarge: {
    minWidth: 200,
    maxWidth: 300,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionDesc: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  twoColumnLayout: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
  },
  halfWidth: {
    flex: 1,
    minWidth: 300,
  },
  analyticsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  analyticsText: {
    flex: 1,
  },
  analyticsLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '600',
  },
  leaderboardCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  leaderboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  leaderboardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  responderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderboardMedal: {
    fontSize: 32,
  },
  leaderboardInfo: {
    gap: 2,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  leaderboardReports: {
    fontSize: 12,
    color: '#666',
  },
  rankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  floatingGif: {
    width: 50,
    height: 50,
  },
  floatingTextContainer: {
    backgroundColor: '#0A5EB0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft: 8,
  },
  floatingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
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
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' && {
      justifyContent: 'center',
      alignItems: 'center',
    }),
  },
  chatModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  chatModalWeb: {
    borderRadius: 24,
    height: 600,
    width: '90%',
    maxWidth: 800,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A5EB0',
  },
  chatSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  chatBox: {
    flex: 1,
    padding: 16,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyChatText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  userMessage: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  botMessage: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#0A5EB0',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 14,
    maxWidth: '80%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  botBubble: {
    backgroundColor: '#F0F0F0',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 14,
    maxWidth: '80%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  typingIndicator: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 14,
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999',
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0A5EB0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
    elevation: 0,
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