import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  Image,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const API_URL = 'http://10.120.221.103:5000';

interface StatisticCard {
  title: string;
  value: string;
  icon: string;
  gradient: readonly [string, string];
  trend: string;
  trendUp: boolean;
}

interface Activity {
  id: number;
  activity: string;
  timestamp: string;
  type: 'resolved' | 'new' | 'assigned' | 'escalated';
  location?: string;
}

interface QuickAction {
  title: string;
  icon: string;
  route: string;
  gradient: readonly [string, string];
  description: string;
}

const PCG: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));
  const navigation = useNavigation<any>();

  useEffect(() => {
    checkAuth();
    startPulseAnimation();
  }, []);

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

  const statistics: StatisticCard[] = [
    { 
      title: 'Total Reports', 
      value: '1,234', 
      icon: 'file-document-multiple', 
      gradient: ['#667eea', '#764ba2'] as const,
      trend: '+12%',
      trendUp: true
    },
    { 
      title: 'Resolved Cases', 
      value: '789', 
      icon: 'check-circle', 
      gradient: ['#11998e', '#38ef7d'] as const,
      trend: '+24%',
      trendUp: true
    },
    { 
      title: 'Ongoing Cases', 
      value: '123', 
      icon: 'progress-clock', 
      gradient: ['#f093fb', '#f5576c'] as const,
      trend: '-8%',
      trendUp: false
    },
    { 
      title: 'New Reports', 
      value: '45', 
      icon: 'alert-circle', 
      gradient: ['#4facfe', '#00f2fe'] as const,
      trend: '+5%',
      trendUp: true
    },
  ];

  const recentActivities: Activity[] = [
    { id: 1, activity: 'Maritime incident resolved', timestamp: '2 hours ago', type: 'resolved', location: 'Manila Bay' },
    { id: 2, activity: 'Emergency distress call', timestamp: '5 hours ago', type: 'new', location: 'Subic Bay' },
    { id: 3, activity: 'Search & rescue assigned', timestamp: '1 day ago', type: 'assigned', location: 'Cebu Strait' },
    { id: 4, activity: 'Oil spill incident escalated', timestamp: '2 days ago', type: 'escalated', location: 'Davao Gulf' },
  ];

  const quickActions: QuickAction[] = [
    { 
      title: 'Ongoing Cases', 
      icon: 'clock-outline', 
      route: 'PCGOngoing', 
      gradient: ['#f093fb', '#f5576c'] as const,
      description: 'View active cases'
    },
    { 
      title: 'Completed', 
      icon: 'check-all', 
      route: 'PCGCompleted', 
      gradient: ['#11998e', '#38ef7d'] as const,
      description: 'Review closed cases'
    },
    { 
      title: 'Settings', 
      icon: 'cog', 
      route: 'PCGSettings', 
      gradient: ['#4facfe', '#00f2fe'] as const,
      description: 'Manage preferences'
    },
  ];

  const sidebarItems = [
    { title: 'Dashboard', icon: 'view-dashboard', route: 'PCG' },
    { title: 'Reports', icon: 'file-document', route: 'PCGReports' },
    { title: 'Ongoing', icon: 'progress-clock', route: 'PCGOngoing' },
    { title: 'Completed', icon: 'check-circle', route: 'PCGCompleted' },
    { title: 'Messages', icon: 'message-text', route: 'PCGMessages' },
    { title: 'Settings', icon: 'cog', route: 'PCGSettings' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'resolved': return 'check-circle';
      case 'new': return 'alert-octagon';
      case 'assigned': return 'account-check';
      case 'escalated': return 'fire';
      default: return 'information';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'resolved': return '#11998e';
      case 'new': return '#4facfe';
      case 'assigned': return '#667eea';
      case 'escalated': return '#f5576c';
      default: return '#95a5a6';
    }
  };

  // Enhanced Chart Data
  const barChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [65, 59, 80, 81, 56, 85],
      },
    ],
  };

  const lineChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [12, 19, 30, 25, 40, 45],
        color: (opacity = 1) => `rgba(17, 153, 142, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const pieChartData = [
    {
      name: 'Resolved',
      population: 789,
      color: '#11998e',
      legendFontColor: '#2c3e50',
      legendFontSize: 14,
    },
    {
      name: 'Ongoing',
      population: 123,
      color: '#f5576c',
      legendFontColor: '#2c3e50',
      legendFontSize: 14,
    },
    {
      name: 'New',
      population: 45,
      color: '#4facfe',
      legendFontColor: '#2c3e50',
      legendFontSize: 14,
    },
  ];

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#f8f9fa',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#667eea',
    },
  };

  return (
    <View style={styles.container}>
      {/* Animated Background */}
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
                  style={styles.sidebarItem}
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

      {/* Hamburger Menu with Glass Effect */}
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
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* Hero Header with Glassmorphism */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
            style={styles.heroGradient}
          >
            <View style={styles.headerLogoContainer}>
              <Animated.Image
                source={require('../../../assets/Philippine_Coast_Guard_(PCG).svg.png')}
                style={[styles.headerLogo, { transform: [{ scale: pulseAnim }] }]}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.heroTitle}>Welcome Back, Commander! 🌊</Text>
            <Text style={styles.heroSubtitle}>
              Philippine Coast Guard Command Center
            </Text>
            <Text style={styles.heroDescription}>
              Monitor and manage maritime operations in real-time
            </Text>
          </LinearGradient>
        </View>

        {/* Statistics Cards with Enhanced Design */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.statisticsScroll}
        >
          <View style={styles.statisticsGrid}>
            {statistics.map((stat, index) => (
              <TouchableOpacity key={index} activeOpacity={0.9}>
                <LinearGradient
                  colors={stat.gradient}
                  style={styles.statCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.statHeader}>
                    <View style={styles.statIconContainer}>
                      <Icon name={stat.icon} size={28} color="#fff" />
                    </View>
                    <View style={[styles.trendBadge, { backgroundColor: stat.trendUp ? 'rgba(56, 239, 125, 0.3)' : 'rgba(245, 87, 108, 0.3)' }]}>
                      <Icon name={stat.trendUp ? 'trending-up' : 'trending-down'} size={14} color="#fff" />
                      <Text style={styles.trendText}>{stat.trend}</Text>
                    </View>
                  </View>
                  <Text style={styles.statTitle}>{stat.title}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <View style={styles.statFooter}>
                    <Text style={styles.statFooterText}>vs last month</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Quick Actions with Enhanced Cards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.sectionIconBadge}
            >
              <Icon name="lightning-bolt" size={20} color="#fff" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.9}
                onPress={() => navigation.navigate(action.route)}
              >
                <LinearGradient
                  colors={action.gradient}
                  style={styles.actionCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.actionHeader}>
                    <View style={styles.actionIconContainer}>
                      <Icon name={action.icon} size={32} color="#fff" />
                    </View>
                    <Icon name="arrow-top-right" size={20} color="rgba(255,255,255,0.7)" />
                  </View>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionDescription}>{action.description}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Charts Section with Glass Cards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.sectionIconBadge}
            >
              <Icon name="chart-line" size={20} color="#fff" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Analytics Dashboard</Text>
          </View>
          
          <View style={styles.chartCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
              style={styles.chartGradient}
            >
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitle}>Monthly Reports</Text>
                  <Text style={styles.chartSubtitle}>Last 6 months overview</Text>
                </View>
                <View style={styles.chartIconBadge}>
                  <Icon name="trending-up" size={20} color="#667eea" />
                </View>
              </View>
              <BarChart
                data={barChartData}
                width={SCREEN_WIDTH - 60}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
                }}
                verticalLabelRotation={0}
                style={styles.chart}
                showValuesOnTopOfBars
              />
            </LinearGradient>
          </View>

          <View style={styles.chartCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
              style={styles.chartGradient}
            >
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitle}>Resolution Trends</Text>
                  <Text style={styles.chartSubtitle}>Cases resolved over time</Text>
                </View>
                <View style={[styles.chartIconBadge, { backgroundColor: 'rgba(17, 153, 142, 0.1)' }]}>
                  <Icon name="chart-timeline-variant" size={20} color="#11998e" />
                </View>
              </View>
              <LineChart
                data={lineChartData}
                width={SCREEN_WIDTH - 60}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(17, 153, 142, ${opacity})`,
                }}
                bezier
                style={styles.chart}
              />
            </LinearGradient>
          </View>

          <View style={styles.chartCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
              style={styles.chartGradient}
            >
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitle}>Case Distribution</Text>
                  <Text style={styles.chartSubtitle}>Current status breakdown</Text>
                </View>
                <View style={[styles.chartIconBadge, { backgroundColor: 'rgba(245, 87, 108, 0.1)' }]}>
                  <Icon name="chart-pie" size={20} color="#f5576c" />
                </View>
              </View>
              <PieChart
                data={pieChartData}
                width={SCREEN_WIDTH - 60}
                height={220}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
              />
            </LinearGradient>
          </View>
        </View>

        {/* Recent Activities with Enhanced Design */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.sectionIconBadge}
            >
              <Icon name="history" size={20} color="#fff" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Live Activity Feed</Text>
          </View>
          <View style={styles.activitiesCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
              style={styles.activitiesGradient}
            >
              {recentActivities.map((activity, index) => (
                <TouchableOpacity
                  key={activity.id}
                  activeOpacity={0.8}
                  style={[styles.activityItem, index === recentActivities.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <LinearGradient
                    colors={[getActivityColor(activity.type) + '20', getActivityColor(activity.type) + '10']}
                    style={styles.activityIconBadge}
                  >
                    <Icon name={getActivityIcon(activity.type)} size={22} color={getActivityColor(activity.type)} />
                  </LinearGradient>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>{activity.activity}</Text>
                    <View style={styles.activityMeta}>
                      <Icon name="map-marker" size={12} color="#95a5a6" />
                      <Text style={styles.activityLocation}>{activity.location}</Text>
                      <Icon name="clock-outline" size={12} color="#95a5a6" style={{ marginLeft: 12 }} />
                      <Text style={styles.activityTimestamp}>{activity.timestamp}</Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={20} color="#bdc3c7" />
                </TouchableOpacity>
              ))}
            </LinearGradient>
          </View>
        </View>

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
    backgroundColor: '#0a0e27',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.4,
    opacity: 0.5,
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
    ...Platform.select({
      ios: {
        shadowColor: '#e74c3c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
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
    marginTop: Platform.OS === 'ios' ? 40 : 10,
  },
  heroSection: {
    marginHorizontal: 20,
    marginTop: 70,
    marginBottom: 30,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  heroGradient: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  headerLogoContainer: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 100,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  headerLogo: {
    width: 100,
    height: 100,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
  statisticsScroll: {
    marginBottom: 30,
    paddingLeft: 20,
  },
  statisticsGrid: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  statCard: {
    width: 180,
    height: 200,
    padding: 20,
    borderRadius: 20,
    marginRight: 16,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  statValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  statFooter: {
    marginTop: 8,
  },
  statFooterText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    minHeight: 160,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  actionDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  chartCard: {
    marginBottom: 24,
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
  chartGradient: {
    padding: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  chartIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: {
    borderRadius: 16,
    marginTop: 8,
  },
  activitiesCard: {
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
  activitiesGradient: {
    padding: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(236, 240, 241, 0.5)',
  },
  activityIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
    marginBottom: 6,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityLocation: {
    fontSize: 13,
    color: '#95a5a6',
    marginLeft: 4,
  },
  activityTimestamp: {
    fontSize: 13,
    color: '#95a5a6',
    marginLeft: 4,
  },
  footer: {
    marginHorizontal: 20,
    marginBottom: 40,
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

export default PCG;