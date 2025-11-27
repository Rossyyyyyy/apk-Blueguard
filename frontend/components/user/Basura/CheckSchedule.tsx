import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  ActivityIndicator, Dimensions, Platform, Animated, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const screenWidth = Dimensions.get('window').width;

// API Base URL
const API_BASE_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

// Define navigation types
type RootStackParamList = {
  Login: undefined;
  Dash: undefined;
  Schedule: undefined;
  Notifications: undefined;
  Reports: undefined;
  Rewards: undefined;
  Knowledge: undefined;
  Profile: undefined;
};

type CheckScheduleNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dash'>;

type Props = {
  navigation: CheckScheduleNavigationProp;
};

// Define types for state objects
interface User {
  _id: string;
  name?: string;
  email: string;
}

interface Schedule {
  _id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  pickupDate: string;
  wasteType?: string;
  quantity?: number;
}

interface StatusCounts {
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

interface MonthlyActivity {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

interface ApiResponse {
  message?: string;
  user?: User;
  schedules?: Schedule[];
}

const CheckSchedule: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [scheduleData, setScheduleData] = useState<Schedule[] | null>(null);
  const [userName, setUserName] = useState<string>("Kaibigan");
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0
  });
  const [monthlyActivity, setMonthlyActivity] = useState<MonthlyActivity>({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      data: [0, 0, 0, 0, 0, 0],
    }]
  });
  
  // Animation values using standard React Native Animated
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(50)).current;

  // Helper function to safely parse JSON responses
  const handleApiResponse = async (response: Response): Promise<ApiResponse> => {
    const responseText = await response.text();
    
    try {
      // Try to parse the response as JSON
      const data: ApiResponse = JSON.parse(responseText);
      
      // If response is not OK, throw the error message
      if (!response.ok) {
        throw new Error(data.message || 'Unknown API error');
      }
      
      return data;
    } catch (err) {
      // If we can't parse the JSON, it might be HTML or another format
      console.error('API Response Error:', responseText.substring(0, 200) + '...');
      throw new Error(`Server returned invalid JSON. Status: ${response.status}`);
    }
  };

  // Fetch the user's data and schedules
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          navigation.replace('Login');
          return;
        }

        // Fetch user info with improved error handling
        try {
          const userResponse = await fetch(`${API_BASE_URL}/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          const userData = await handleApiResponse(userResponse);
          setUserName(userData.user?.name || userData.user?.email || "Kaibigan");
        } catch (userError: any) {
          console.error('Error fetching user:', userError.message);
          Alert.alert(
            "User Data Error", 
            `Could not fetch user information: ${userError.message}`,
            [{ text: "OK" }]
          );
          
          // Don't navigate away immediately for user errors
          // Just continue with default username
        }

        // Fetch schedules with improved error handling
        try {
          const scheduleResponse = await fetch(`${API_BASE_URL}/get-schedules`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          const scheduleResult = await handleApiResponse(scheduleResponse);
          setScheduleData(scheduleResult.schedules || []);
          processScheduleData(scheduleResult.schedules || []);
        } catch (scheduleError: any) {
          console.error('Error fetching schedules:', scheduleError.message);
          Alert.alert(
            "Schedule Data Error", 
            `Could not fetch schedule information: ${scheduleError.message}`,
            [{ text: "OK" }]
          );
          
          // Continue with empty schedule data
          setScheduleData([]);
          processScheduleData([]);
        }
      } catch (error: any) {
        console.error('Error in data fetching process:', error);
        Alert.alert(
          "Connection Error",
          "There was a problem connecting to the server. Please check your network and try again.",
          [{ text: "OK" }]
        );
      } finally {
        setLoading(false);
        
        // Start animations after data loads
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
          }),
          Animated.spring(translateAnim, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true
          })
        ]).start();
      }
    };

    fetchData();
  }, [fadeAnim, translateAnim, navigation]);

  // Process schedule data for charts
  const processScheduleData = (schedules: Schedule[]) => {
    if (!Array.isArray(schedules)) {
      console.error('Expected schedules to be an array, got:', typeof schedules);
      schedules = []; // Fallback to empty array
    }
    
    // Count schedules by status
    const counts: StatusCounts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    
    schedules.forEach(schedule => {
      if (schedule && counts.hasOwnProperty(schedule.status)) {
        counts[schedule.status]++;
      } else if (schedule) {
        counts.pending++;
      }
    });
    setStatusCounts(counts);

    // Process monthly activity data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    // Get last 6 months
    const last6Months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      last6Months.push(months[monthIndex]);
    }

    // Count schedules per month
    const monthlyData = Array(6).fill(0);

    schedules.forEach(schedule => {
      if (!schedule || !schedule.pickupDate) return;
      
      try {
        const scheduleDate = new Date(schedule.pickupDate);
        if (isNaN(scheduleDate.getTime())) {
          console.warn('Invalid date format:', schedule.pickupDate);
          return;
        }
        
        const scheduleMonth = months[scheduleDate.getMonth()];
        const monthIndex = last6Months.indexOf(scheduleMonth);
        
        if (monthIndex !== -1) {
          monthlyData[monthIndex]++;
        }
      } catch (err) {
        console.error('Error processing schedule date:', err);
      }
    });

    setMonthlyActivity({
      labels: last6Months,
      datasets: [
        {
          data: monthlyData,
          color: (opacity = 1) => `rgba(10, 94, 176, ${opacity})`,
          strokeWidth: 2
        }
      ]
    });
  };

  // Chart configurations
  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    decimalPlaces: 0,
    useShadowColorFromDataset: false,
    style: {
      borderRadius: 16
    },
    propsForLabels: {
      fontWeight: "bold" as const,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
    }
  };

  // Data for pie chart
  const pieData = [
    {
      name: "Pending",
      population: statusCounts.pending,
      color: "#FFB347",
      legendFontColor: "#7F7F7F",
      legendFontSize: 12
    },
    {
      name: "Confirmed",
      population: statusCounts.confirmed,
      color: "#77DD77",
      legendFontColor: "#7F7F7F",
      legendFontSize: 12
    },
    {
      name: "Completed",
      population: statusCounts.completed,
      color: "#0A5EB0",
      legendFontColor: "#7F7F7F",
      legendFontSize: 12
    },
    {
      name: "Cancelled",
      population: statusCounts.cancelled,
      color: "#FF6961",
      legendFontColor: "#7F7F7F",
      legendFontSize: 12
    }
  ];

  // Animation style for charts
  const animatedStyle = {
    opacity: fadeAnim,
    transform: [{ translateY: translateAnim }]
  };

  // Handle retry if network/fetch fails
  const handleRetry = () => {
    setLoading(true);
    // Reset animation values
    fadeAnim.setValue(0);
    translateAnim.setValue(50);
    // Reload data by triggering useEffect again
    navigation.setParams({ refresh: Date.now() } as any);
  };

  // Navigation items matching Dash.tsx
  const navItems: Array<{
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    screen: keyof RootStackParamList;
  }> = [
    { name: 'Dashboard', icon: 'home', screen: 'Dash' },
    { name: 'Notifications', icon: 'notifications', screen: 'Notifications' },
    { name: 'My Reports', icon: 'document-text', screen: 'Reports' },
    { name: 'Rewards', icon: 'trophy', screen: 'Rewards' },
    { name: 'Knowledge', icon: 'book', screen: 'Knowledge' },
    { name: 'Profile', icon: 'person', screen: 'Profile' }
  ];

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="stats-chart" size={30} color="white" />
          <Text style={styles.headerTitle}>SCHEDULE ANALYTICS</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#009990" />
            <Text style={styles.loadingText}>Loading schedule data...</Text>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            <Text style={styles.greeting}>Hello, {userName}!</Text>
            <Text style={styles.subtitle}>Here's an overview of your collection schedules</Text>
            
            {/* Retry button in case of network errors */}
            {!scheduleData && (
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
            
            {/* Status Distribution Chart */}
            <Animated.View style={[styles.chartCard, animatedStyle]}>
              <Text style={styles.chartTitle}>Schedule Status Distribution</Text>
              {Object.values(statusCounts).reduce((a, b) => a + b) > 0 ? (
                <PieChart
                  data={pieData}
                  width={screenWidth - 60}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  center={[10, 0]}
                  absolute
                />
              ) : (
                <Text style={styles.noDataText}>No schedule data available</Text>
              )}
              
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: "#FFB347" }]} />
                  <Text style={styles.legendText}>Pending: {statusCounts.pending}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: "#77DD77" }]} />
                  <Text style={styles.legendText}>Confirmed: {statusCounts.confirmed}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: "#0A5EB0" }]} />
                  <Text style={styles.legendText}>Completed: {statusCounts.completed}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: "#FF6961" }]} />
                  <Text style={styles.legendText}>Cancelled: {statusCounts.cancelled}</Text>
                </View>
              </View>
            </Animated.View>

            {/* Monthly Activity Chart */}
            <Animated.View style={[styles.chartCard, animatedStyle]}>
              <Text style={styles.chartTitle}>Monthly Schedule Activity</Text>
              {Object.values(statusCounts).reduce((a, b) => a + b) > 0 ? (
                <LineChart
                  data={monthlyActivity}
                  width={screenWidth - 60}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    backgroundGradientFrom: "#ffffff",
                    backgroundGradientTo: "#ffffff",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(10, 94, 176, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: "6",
                      strokeWidth: "2",
                      stroke: "#0A5EB0"
                    }
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16
                  }}
                />
              ) : (
                <Text style={styles.noDataText}>No schedule data available</Text>
              )}
            </Animated.View>

            {/* Summary Statistics */}
            <Animated.View style={[styles.summaryCard, animatedStyle]}>
              <Text style={styles.summaryTitle}>Schedule Summary</Text>
              <View style={styles.summaryContent}>
                <View style={styles.summaryItem}>
                  <Ionicons name="calendar" size={24} color="#009990" />
                  <Text style={styles.summaryLabel}>Total Schedules</Text>
                  <Text style={styles.summaryValue}>
                    {Object.values(statusCounts).reduce((a, b) => a + b, 0)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Ionicons name="checkmark-circle" size={24} color="#77DD77" />
                  <Text style={styles.summaryLabel}>Completion Rate</Text>
                  <Text style={styles.summaryValue}>
                    {Object.values(statusCounts).reduce((a, b) => a + b, 0) > 0
                      ? `${Math.round((statusCounts.completed / Object.values(statusCounts).reduce((a, b) => a + b, 0)) * 100)}%`
                      : "0%"
                    }
                  </Text>
                </View>
              </View>
            </Animated.View>
            
            <TouchableOpacity 
              style={styles.scheduleButton}
              onPress={() => navigation.navigate('Schedule')}
            >
              <Ionicons name="add-circle" size={24} color="white" />
              <Text style={styles.scheduleButtonText}>Create New Schedule</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Spacer to ensure content isn't hidden behind the footer */}
        <View style={{ height: 80 }} />
      </View>
      
      {/* Footer - matching Dash.tsx */}
      <View style={styles.footer}>
        {navItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.navButton} 
            onPress={() => navigation.navigate(item.screen)}
          >
            <Ionicons name={item.icon} size={24} color="white" />
            <Text style={styles.navText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0A5EB0',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#000957', 
    justifyContent: 'center' 
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FFFFFF', 
    marginLeft: 10 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#009990',
    marginBottom: 15,
    textAlign: 'center'
  },
  noDataText: {
    textAlign: 'center',
    color: '#888',
    marginVertical: 30,
    fontSize: 16
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingHorizontal: 10
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 10
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5
  },
  legendText: {
    fontSize: 12,
    color: '#555'
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#009990',
    marginBottom: 15,
    textAlign: 'center'
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  summaryItem: {
    alignItems: 'center',
    padding: 10
  },
  summaryLabel: {
    fontSize: 14,
    color: '#555',
    marginTop: 5
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#009990',
    marginTop: 5
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6961',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignSelf: 'center'
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#009990',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 10
  },
  scheduleButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10
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

export default CheckSchedule;