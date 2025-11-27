import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  RefreshControl, Image, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ReportsDistributionChart from './ReportsDistributionChart';
import ReportsTimelineChart from './ReportsTimelineChart';

// Type definitions
interface Stats {
  totalReports: number;
  pendingReports: number;
  completedReports: number;
}

interface Report {
  reportedBy?: string;
  resolved?: boolean;
  [key: string]: any;
}

interface UserData {
  user?: {
    name?: string;
    email?: string;
  };
}

interface NavItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
}

type RootStackParamList = {
  Login: undefined;
  Dash: undefined;
  Chat: undefined;
  ChatList: undefined;
  Report: undefined;
  Reports: undefined;
  Knowledge: undefined;
  Notifications: undefined;
  Rewards: undefined;
  Profile: undefined;
};

type DashChartsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DashChartsProps {
  navigation: DashChartsNavigationProp;
}

const DashCharts: React.FC<DashChartsProps> = ({ navigation }) => {
  const [userName, setUserName] = useState<string>('Kaibigan');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [stats, setStats] = useState<Stats>({
    totalReports: 0,
    pendingReports: 0,
    completedReports: 0
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async (): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await fetch('https://apk-blueguard-rosssyyy.onrender.com/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: UserData = await response.json();
      if (response.ok) {
        setUserName(data.user?.name || data.user?.email || "Kaibigan");
        fetchStats(token);
      } else {
        console.error('Error fetching user:', (data as any).message);
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setLoading(false);
    }
  };

  const fetchStats = async (token: string): Promise<void> => {
    try {
      // Fetch reports for statistics
      const reportsResponse = await fetch('https://apk-blueguard-rosssyyy.onrender.com/get-reported', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const reportsData: Report[] = await reportsResponse.json();
      if (reportsResponse.ok) {
        // Filter reports by current user
        const userReports = reportsData.filter((report: Report) => report.reportedBy === userName);
        
        // Calculate stats
        const totalReports = userReports.length;
        const pendingReports = userReports.filter((report: Report) => !report.resolved).length;
        const completedReports = userReports.filter((report: Report) => report.resolved).length;
        
        setStats({
          totalReports,
          pendingReports,
          completedReports
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    fetchUserData();
  };

  // Function to handle back navigation
  const handleBack = (): void => {
    navigation.goBack();
  };

  const navItems: NavItem[] = [
    { name: 'Dashboard', icon: 'home', screen: 'Dash' },
    { name: 'Notifications', icon: 'notifications', screen: 'Notifications' },
    { name: 'My Reports', icon: 'document-text', screen: 'Reports' },
    { name: 'Rewards', icon: 'trophy', screen: 'Rewards' },
    { name: 'Knowledge', icon: 'book', screen: 'Knowledge' },
    { name: 'Profile', icon: 'person', screen: 'Profile' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Ionicons name="earth" size={30} color="white" />
        <Text style={styles.headerTitle}>BlueGuard</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#009990']}
          />
        }
      >
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Welcome, {userName}!</Text>
          <Text style={styles.subText}>Your ocean protection dashboard</Text>
          <View style={styles.chatButtonsContainer}>
            <TouchableOpacity 
              style={styles.chatButton}
              onPress={() => navigation.navigate('Chat')}
            >
              <Ionicons name="chatbubbles" size={24} color="white" />
              <Text style={styles.chatButtonText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.chatButton}
              onPress={() => navigation.navigate('ChatList')}
            >
              <Ionicons name="list-circle" size={24} color="white" />
              <Text style={styles.chatButtonText}>Chat List</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#009990" style={styles.loader} />
        ) : (
          <>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="document-text" size={24} color="#009990" />
                <Text style={styles.statNumber}>{stats.totalReports}</Text>
                <Text style={styles.statLabel}>Total Reports</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="time" size={24} color="#FFB347" />
                <Text style={styles.statNumber}>{stats.pendingReports}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={24} color="#77DD77" />
                <Text style={styles.statNumber}>{stats.completedReports}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>

            <View style={styles.chartsContainer}>
              <Text style={styles.sectionTitle}>Analytics</Text>
              <ReportsDistributionChart />
              <ReportsTimelineChart />
            </View>

            <View style={styles.actionsContainer}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Report')}
                >
                  <Ionicons name="add-circle" size={32} color="#009990" />
                  <Text style={styles.actionButtonText}>New Report</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Reports')}
                >
                  <Ionicons name="list" size={32} color="#009990" />
                  <Text style={styles.actionButtonText}>View Reports</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Knowledge')}
                >
                  <Ionicons name="book" size={32} color="#009990" />
                  <Text style={styles.actionButtonText}>Learn More</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {navItems.map((item: NavItem, index: number) => (
          <TouchableOpacity 
            key={index} 
            style={styles.navButton} 
            onPress={() => navigation.navigate(item.screen as keyof RootStackParamList)}
          >
            <Ionicons name={item.icon} size={24} color="white" />
            <Text style={styles.navText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F5F5',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#000957', 
    justifyContent: 'center' 
  },
  backButton: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FFFFFF', 
    marginLeft: 10 
  },
  welcomeContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  chatButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  chatButton: {
    backgroundColor: '#009990',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
  },
  chatButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loader: {
    marginTop: 50,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  chartsContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginLeft: 10,
  },
  actionsContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 100, // Add extra padding at the bottom to account for the footer
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: '30%',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000957',
    width: '100%',
    padding: 10,
    position: 'absolute',
    bottom: 0,
  },
  navButton: { 
    alignItems: 'center' 
  },
  navText: { 
    color: 'white', 
    fontSize: 12 
  },
});

export default DashCharts;