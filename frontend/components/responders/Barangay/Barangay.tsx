import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// API Base URL
const API_BASE_URL = 'http://10.120.221.103:5000';

// Mood data
const moods = [
  { label: 'Happy 😊', emoji: '😊' },
  { label: 'Neutral 😐', emoji: '😐' },
  { label: 'Sad 😔', emoji: '😔' },
  { label: 'Stressed 😩', emoji: '😩' },
  { label: 'Excited 😃', emoji: '😃' },
];

const getMoodColor = (mood: string) => {
  switch (mood) {
    case 'Happy 😊':
      return '#4CAF50';
    case 'Neutral 😐':
      return '#FFC107';
    case 'Sad 😔':
      return '#F44336';
    case 'Stressed 😩':
      return '#9C27B0';
    case 'Excited 😃':
      return '#2196F3';
    default:
      return '#e0e0e0';
  }
};

// Enhanced Sidebar Component with Animations
const BarangaySidebar = ({ isOpen, setIsOpen, userEmail, onLogout }: any) => {
  const navigation = useNavigation<any>();
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeRoute, setActiveRoute] = useState('Barangay');

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

// Main Barangay Component
const Barangay = () => {
  const navigation = useNavigation<any>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMoodTracker, setShowMoodTracker] = useState(false);
  const [showMoodHistory, setShowMoodHistory] = useState(false);
  const [showTimeHistory, setShowTimeHistory] = useState(false);
  const [mood, setMood] = useState('');
  const [moodHistory, setMoodHistory] = useState<any[]>([]);
  const [isTimedIn, setIsTimedIn] = useState(false);
  const [timeInTime, setTimeInTime] = useState<string | null>(null);
  const [timeOutTime, setTimeOutTime] = useState<string | null>(null);
  const [timeHistory, setTimeHistory] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState('');

  // Donation Statistics
  const [donationStats, setDonationStats] = useState({
    totalDonors: 0,
    totalWeight: 0,
    projectsSupported: 0,
  });

  const [reportsData] = useState({
    completed: 50,
    pending: 30,
    rejected: 5,
    types: {
      'Dynamite Fishing': 20,
      'Illegal Logging': 15,
      'Pollution': 25,
      'Overfishing': 20,
    },
  });

  useEffect(() => {
    checkAuth();
    loadMoodData();
    loadTimeData();
    fetchDonationStats();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const responderType = await AsyncStorage.getItem('responderType');
      const email = await AsyncStorage.getItem('userEmail');

      if (!token || responderType !== 'barangay') {
        Alert.alert('Access Denied', 'You must be a barangay responder to access this page.');
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

  const fetchDonationStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/donations/all`);
      const data = await response.json();

      if (data.success) {
        const donations = data.donations;
        
        // Count unique donors
        const uniqueDonors = new Set(donations.map((d: any) => d.email)).size;
        
        // Estimate total weight (kg) - each completed donation ≈ 2-5kg
        const completedDonations = donations.filter((d: any) => d.status === 'Pickup Completed').length;
        const estimatedWeight = completedDonations * 3.5; // Average 3.5kg per donation
        
        // Projects supported (1 project per 50kg of recyclables)
        const projectsSupported = Math.floor(estimatedWeight / 50) || 1;

        setDonationStats({
          totalDonors: uniqueDonors,
          totalWeight: Math.round(estimatedWeight),
          projectsSupported,
        });
      }
    } catch (error) {
      console.error('Error fetching donation stats:', error);
    }
  };

  const loadMoodData = async () => {
    try {
      const lastMoodEntry = await AsyncStorage.getItem('lastMoodEntry');
      const today = new Date().toDateString();

      if (!lastMoodEntry || JSON.parse(lastMoodEntry).date !== today) {
        setShowMoodTracker(true);
      } else {
        setMood(JSON.parse(lastMoodEntry).mood);
      }

      const savedMoods = await AsyncStorage.getItem('moodHistory');
      if (savedMoods) {
        setMoodHistory(JSON.parse(savedMoods));
      }
    } catch (error) {
      console.error('Load mood error:', error);
    }
  };

  const loadTimeData = async () => {
    try {
      const timeData = await AsyncStorage.getItem('timeData');
      if (timeData) {
        const parsed = JSON.parse(timeData);
        setIsTimedIn(parsed.isTimedIn || false);
        setTimeInTime(parsed.timeInTime || null);
        setTimeOutTime(parsed.timeOutTime || null);
      }

      const savedTimeHistory = await AsyncStorage.getItem('timeHistory');
      if (savedTimeHistory) {
        setTimeHistory(JSON.parse(savedTimeHistory));
      }
    } catch (error) {
      console.error('Load time error:', error);
    }
  };

  const submitMood = async (selectedMood: string) => {
    try {
      const today = new Date().toDateString();
      const newMoodEntry = { date: today, mood: selectedMood };

      await AsyncStorage.setItem('lastMoodEntry', JSON.stringify(newMoodEntry));

      const updatedMoodHistory = [
        ...moodHistory.filter((entry) => entry.date !== today),
        newMoodEntry,
      ];
      await AsyncStorage.setItem('moodHistory', JSON.stringify(updatedMoodHistory));

      setMoodHistory(updatedMoodHistory);
      setMood(selectedMood);
      setShowMoodTracker(false);
    } catch (error) {
      console.error('Submit mood error:', error);
    }
  };

  const handleTimeIn = async () => {
    try {
      const today = new Date().toDateString();
      const now = new Date().toLocaleString();

      const hasTimedInToday = timeHistory.some(
        (entry) => entry.date === today && entry.type === 'Time In'
      );

      if (hasTimedInToday) {
        Alert.alert('Already Timed In', 'You can only Time In once per day.');
        return;
      }

      setIsTimedIn(true);
      setTimeInTime(now);
      setTimeOutTime(null);

      const newTimeEntry = { date: today, time: now, type: 'Time In' };
      const updatedTimeHistory = [...timeHistory, newTimeEntry];
      await AsyncStorage.setItem('timeHistory', JSON.stringify(updatedTimeHistory));
      setTimeHistory(updatedTimeHistory);

      const timeData = { isTimedIn: true, timeInTime: now, timeOutTime: null };
      await AsyncStorage.setItem('timeData', JSON.stringify(timeData));
    } catch (error) {
      console.error('Time in error:', error);
    }
  };

  const handleTimeOut = async () => {
    try {
      const today = new Date().toDateString();
      const now = new Date().toLocaleString();

      setIsTimedIn(false);
      setTimeOutTime(now);

      const newTimeEntry = { date: today, time: now, type: 'Time Out' };
      const updatedTimeHistory = [...timeHistory, newTimeEntry];
      await AsyncStorage.setItem('timeHistory', JSON.stringify(updatedTimeHistory));
      setTimeHistory(updatedTimeHistory);

      const timeData = { isTimedIn: false, timeInTime, timeOutTime: now };
      await AsyncStorage.setItem('timeData', JSON.stringify(timeData));
    } catch (error) {
      console.error('Time out error:', error);
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

  const totalIncidents = Object.values(reportsData.types).reduce((a, b) => a + b, 0);

  // Chart configurations
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 119, 182, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#0077b6',
    },
  };

  // Prepare chart data
  const reportsChartData = {
    labels: Object.keys(reportsData.types),
    datasets: [
      {
        data: Object.values(reportsData.types),
      },
    ],
  };

  const statusPieData = [
    {
      name: 'Completed',
      count: reportsData.completed,
      color: '#4CAF50',
      legendFontColor: '#495057',
      legendFontSize: 13,
    },
    {
      name: 'Pending',
      count: reportsData.pending,
      color: '#FFC107',
      legendFontColor: '#495057',
      legendFontSize: 13,
    },
    {
      name: 'Rejected',
      count: reportsData.rejected,
      color: '#F44336',
      legendFontColor: '#495057',
      legendFontSize: 13,
    },
  ];

  // Mood trend data (last 7 days)
  const moodTrendData = {
    labels: moodHistory.slice(-7).map(entry => {
      const date = new Date(entry.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        data: moodHistory.slice(-7).map(entry => {
          const moodMap: any = {
            'Happy 😊': 5,
            'Excited 😃': 4,
            'Neutral 😐': 3,
            'Sad 😔': 2,
            'Stressed 😩': 1,
          };
          return moodMap[entry.mood] || 3;
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
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

      <ScrollView style={styles.main}>
        <ImageBackground
          source={require('../../../assets/ocean-bg.jpg')}
          style={styles.backgroundImage}
          imageStyle={{ opacity: 0.3 }}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Barangay Analytics Dashboard</Text>

            {/* Mood Tracker Modal */}
            <Modal visible={showMoodTracker} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setShowMoodTracker(false)}
                  >
                    <Icon name="times-circle" size={28} color="#999" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>How are you feeling today?</Text>
                  <Text style={styles.modalSubtitle}>Select your current mood</Text>
                  <View style={styles.emojiContainer}>
                    {moods.map((m, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.emojiBtn,
                          { backgroundColor: getMoodColor(m.label) },
                        ]}
                        onPress={() => submitMood(m.label)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.emoji}>{m.emoji}</Text>
                        <Text style={styles.moodLabel}>{m.label.split(' ')[0]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </Modal>

            {/* KPI Cards Row */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { backgroundColor: '#d4edda' }]}>
                <View style={styles.kpiIcon}>
                  <Icon name="check-circle" size={28} color="#28a745" />
                </View>
                <Text style={styles.kpiValue}>{reportsData.completed}</Text>
                <Text style={styles.kpiLabel}>Completed</Text>
                <Text style={styles.kpiChange}>↑ 12% vs last week</Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: '#fff3cd' }]}>
                <View style={styles.kpiIcon}>
                  <Icon name="clock-o" size={28} color="#ffc107" />
                </View>
                <Text style={styles.kpiValue}>{reportsData.pending}</Text>
                <Text style={styles.kpiLabel}>Pending</Text>
                <Text style={styles.kpiChange}>↓ 5% vs last week</Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: '#d1ecf1' }]}>
                <View style={styles.kpiIcon}>
                  <Icon name="exclamation-triangle" size={28} color="#17a2b8" />
                </View>
                <Text style={styles.kpiValue}>{totalIncidents}</Text>
                <Text style={styles.kpiLabel}>Total Reports</Text>
                <Text style={styles.kpiChange}>↑ 8% vs last week</Text>
              </View>
            </View>

            {/* Reports by Type Chart */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Icon name="bar-chart" size={20} color="#0077b6" />
                <Text style={styles.chartTitle}>Incidents by Type</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={reportsChartData}
                  width={Math.max(width - 60, 400)}
                  height={220}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  fromZero
                  showValuesOnTopOfBars
                  yAxisLabel=""
                  yAxisSuffix=""
                />
              </ScrollView>
            </View>

            {/* Status Distribution Pie Chart */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Icon name="pie-chart" size={20} color="#0077b6" />
                <Text style={styles.chartTitle}>Report Status Distribution</Text>
              </View>
              <PieChart
                data={statusPieData}
                width={width - 60}
                height={200}
                chartConfig={chartConfig}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
              />
            </View>

            {/* Mood Trend Chart */}
            {moodHistory.length >= 2 && (
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Icon name="line-chart" size={20} color="#0077b6" />
                  <Text style={styles.chartTitle}>Mood Trend (Last 7 Days)</Text>
                </View>
                <LineChart
                  data={moodTrendData}
                  width={width - 60}
                  height={200}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withInnerLines={false}
                  withOuterLines={true}
                  yAxisLabel=""
                  yAxisSuffix=""
                  fromZero
                />
                <View style={styles.moodLegend}>
                  <Text style={styles.legendText}>5 = Happy | 4 = Excited | 3 = Neutral | 2 = Sad | 1 = Stressed</Text>
                </View>
              </View>
            )}

            {/* Current Mood Display */}
            {!showMoodTracker && mood && (
              <View style={styles.currentMood}>
                <View style={styles.moodHeader}>
                  <Icon name="smile-o" size={24} color="#0077b6" />
                  <Text style={styles.moodText}>Today's Mood</Text>
                </View>
                <Text style={styles.moodDisplay}>{mood}</Text>
                <View style={styles.moodButtons}>
                  <TouchableOpacity
                    style={styles.updateMoodBtn}
                    onPress={() => setShowMoodTracker(true)}
                    activeOpacity={0.8}
                  >
                    <Icon name="edit" size={16} color="#fff" />
                    <Text style={styles.btnText}>Update</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.viewHistoryBtn}
                    onPress={() => setShowMoodHistory(true)}
                    activeOpacity={0.8}
                  >
                    <Icon name="history" size={16} color="#fff" />
                    <Text style={styles.btnText}>History</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Mood History Modal */}
            <Modal visible={showMoodHistory} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setShowMoodHistory(false)}
                  >
                    <Icon name="times-circle" size={28} color="#999" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Mood History</Text>
                  <Text style={styles.modalSubtitle}>Your recent mood entries</Text>
                  {moodHistory.length > 0 ? (
                    <ScrollView style={styles.historyScroll}>
                      {moodHistory.slice(-5).reverse().map((entry, index) => (
                        <View
                          key={index}
                          style={[
                            styles.historyCard,
                            { borderLeftColor: getMoodColor(entry.mood) },
                          ]}
                        >
                          <Text style={styles.historyDate}>{entry.date}</Text>
                          <Text style={styles.historyMood}>{entry.mood}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyState}>
                      <Icon name="inbox" size={48} color="#ccc" />
                      <Text style={styles.emptyText}>No time entries yet</Text>
                    </View>
                  )}
                </View>
              </View>
            </Modal>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={[styles.actionCard, { backgroundColor: '#e3f2fd' }]}
                  onPress={() => navigation.navigate('ReportTrashIncident')}
                  activeOpacity={0.8}
                >
                  <Icon name="plus-circle" size={32} color="#2196F3" />
                  <Text style={styles.actionText}>New Report</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, { backgroundColor: '#f3e5f5' }]}
                  onPress={() => navigation.navigate('BarangayReports')}
                  activeOpacity={0.8}
                >
                  <Icon name="file-text" size={32} color="#9C27B0" />
                  <Text style={styles.actionText}>View Reports</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, { backgroundColor: '#e8f5e9' }]}
                  onPress={() => navigation.navigate('BarangayCompleted')}
                  activeOpacity={0.8}
                >
                  <Icon name="check-circle" size={32} color="#4CAF50" />
                  <Text style={styles.actionText}>Completed</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, { backgroundColor: '#fff3e0' }]}
                  onPress={() => navigation.navigate('BarangayOngoing')}
                  activeOpacity={0.8}
                >
                  <Icon name="spinner" size={32} color="#FF9800" />
                  <Text style={styles.actionText}>Ongoing</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.activitySection}>
              <View style={styles.sectionHeader}>
                <Icon name="history" size={20} color="#0077b6" />
                <Text style={styles.sectionTitle}>Recent Activity</Text>
              </View>
              <View style={styles.activityList}>
                <View style={styles.activityItem}>
                  <View style={[styles.activityDot, { backgroundColor: '#4CAF50' }]} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>Report Completed</Text>
                    <Text style={styles.activityDesc}>Pollution incident at Beach Area</Text>
                    <Text style={styles.activityTime}>2 hours ago</Text>
                  </View>
                </View>
                <View style={styles.activityItem}>
                  <View style={[styles.activityDot, { backgroundColor: '#2196F3' }]} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>New Report Filed</Text>
                    <Text style={styles.activityDesc}>Dynamite fishing reported</Text>
                    <Text style={styles.activityTime}>5 hours ago</Text>
                  </View>
                </View>
                <View style={styles.activityItem}>
                  <View style={[styles.activityDot, { backgroundColor: '#FFC107' }]} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>Status Update</Text>
                    <Text style={styles.activityDesc}>Investigation ongoing</Text>
                    <Text style={styles.activityTime}>1 day ago</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Warnings */}
            <View style={styles.warningsSection}>
              <View style={styles.warningsHeader}>
                <Icon name="warning" size={24} color="#856404" />
                <Text style={styles.warningsTitle}>Important Reminders</Text>
              </View>
              <View style={styles.warningItem}>
                <Icon name="circle" size={8} color="#856404" />
                <Text style={styles.warningText}>
                  Review and respond to pending reports within 24 hours
                </Text>
              </View>
              <View style={styles.warningItem}>
                <Icon name="circle" size={8} color="#856404" />
                <Text style={styles.warningText}>
                  Monitor high-priority incidents for immediate action
                </Text>
              </View>
              <View style={styles.warningItem}>
                <Icon name="circle" size={8} color="#856404" />
                <Text style={styles.warningText}>
                  Update system regularly with latest field data
                </Text>
              </View>
            </View>

            {/* Updated Donation Section */}
            <View style={styles.donationSection}>
              <View style={styles.donationHeader}>
                <Icon name="recycle" size={28} color="#4CAF50" />
                <View style={styles.donationHeaderText}>
                  <Text style={styles.donationTitle}>Community Donations</Text>
                  <Text style={styles.donationSubtitle}>
                    Recyclable materials supporting barangay projects
                  </Text>
                </View>
              </View>
              
              <View style={styles.donationContent}>
                <View style={styles.donationStats}>
                  <View style={styles.donationStatItem}>
                    <Icon name="users" size={20} color="#0077b6" />
                    <Text style={styles.donationStatValue}>{donationStats.totalDonors}</Text>
                    <Text style={styles.donationStatLabel}>Donors</Text>
                  </View>
                  <View style={styles.donationStatItem}>
                    <Icon name="balance-scale" size={20} color="#0077b6" />
                    <Text style={styles.donationStatValue}>{donationStats.totalWeight}kg</Text>
                    <Text style={styles.donationStatLabel}>Collected</Text>
                  </View>
                  <View style={styles.donationStatItem}>
                    <Icon name="leaf" size={20} color="#0077b6" />
                    <Text style={styles.donationStatValue}>{donationStats.projectsSupported}</Text>
                    <Text style={styles.donationStatLabel}>Projects</Text>
                  </View>
                </View>

                <View style={styles.donationBenefits}>
                  <Text style={styles.benefitsTitle}>How donations help:</Text>
                  <View style={styles.benefitItem}>
                    <Icon name="check-circle" size={16} color="#28a745" />
                    <Text style={styles.benefitText}>
                      Recyclables converted to funds for projects
                    </Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Icon name="check-circle" size={16} color="#28a745" />
                    <Text style={styles.benefitText}>
                      Support barangay infrastructure improvements
                    </Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Icon name="check-circle" size={16} color="#28a745" />
                    <Text style={styles.benefitText}>
                      Fund environmental programs & cleanups
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.donateButton}
                  onPress={() => navigation.navigate('BarangayDonations')}
                  activeOpacity={0.8}
                >
                  <Icon name="eye" size={22} color="#fff" />
                  <Text style={styles.donateButtonText}>View Donations</Text>
                  <Icon name="arrow-right" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
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
  },
  backgroundImage: {
    flex: 1,
    minHeight: height,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0077b6',
    textAlign: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  kpiIcon: {
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '600',
    marginBottom: 4,
  },
  kpiChange: {
    fontSize: 11,
    color: '#6c757d',
  },
  chartCard: {
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
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0077b6',
    marginLeft: 8,
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
  },
  moodLegend: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  legendText: {
    fontSize: 11,
    color: '#6c757d',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 16,
    width: width * 0.9,
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 24,
    textAlign: 'center',
  },
  emojiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiBtn: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  currentMood: {
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
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moodText: {
    fontSize: 16,
    color: '#6c757d',
    marginLeft: 8,
  },
  moodDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0077b6',
    marginBottom: 16,
  },
  moodButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  updateMoodBtn: {
    backgroundColor: '#0077b6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  viewHistoryBtn: {
    backgroundColor: '#6c757d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  btnText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  historyScroll: {
    maxHeight: 320,
  },
  historyCard: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    borderLeftColor: '#0077b6',
  },
  historyDate: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 6,
  },
  historyMood: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  timeHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  timeTracker: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0077b6',
    marginLeft: 8,
  },
  timeButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  timeInBtn: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  timeOutBtn: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  timeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  timeStatus: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 8,
    flex: 1,
  },
  quickActions: {
    marginBottom: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 64) / 2,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginTop: 8,
    textAlign: 'center',
  },
  activitySection: {
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
  activityList: {
    gap: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 4,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  activityDesc: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#adb5bd',
  },
  warningsSection: {
    backgroundColor: '#fff3cd',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginLeft: 8,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingLeft: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  donationSection: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  donationHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  donationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  donationSubtitle: {
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 18,
  },
  donationContent: {
    gap: 20,
  },
  donationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  donationStatItem: {
    alignItems: 'center',
    gap: 6,
  },
  donationStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0077b6',
  },
  donationStatLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  donationBenefits: {
    gap: 12,
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
  },
  donateButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  donateButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});

export default Barangay;