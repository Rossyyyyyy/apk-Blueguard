import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';
import * as Animatable from 'react-native-animatable';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RewardClaimReceipt from './RewardClaimReceipt';

const screenWidth = Dimensions.get('window').width;

interface UserData {
  _id: string;
  name?: string;
  email: string;
  [key: string]: any;
}

interface Reward {
  id: number;
  title: string;
  points: number;
  color: string;
  icon: string;
}

interface Cleanup {
  score?: number;
  [key: string]: any;
}

interface Claim {
  pointsClaimed: number;
  [key: string]: any;
}

interface RewardsProps {
  navigation: any;
}

interface DonutDataItem {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

interface BarDataset {
  data: number[];
}

interface BarData {
  labels: string[];
  datasets: BarDataset[];
}

const Rewards: React.FC<RewardsProps> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userScore, setUserScore] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [claimedPoints, setClaimedPoints] = useState<number>(0);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const rewards: Reward[] = [
    { id: 1, title: '3 Kilos of Rice', points: 800, color: '#FF6384', icon: 'fast-food' },
    { id: 2, title: 'Eco-Friendly Tote Bag', points: 500, color: '#36A2EB', icon: 'bag' },
    { id: 3, title: 'Cap', points: 500, color: '#FFCE56', icon: 'shirt' },
  ];

  const getPointsNeeded = (rewardPoints: number): number => {
    return Math.max(0, rewardPoints - (userScore - claimedPoints));
  };

  const hasEarnedReward = (rewardPoints: number): boolean => {
    return (userScore - claimedPoints) >= rewardPoints;
  };

  const calculateProgressPercentage = (rewardPoints: number): number => {
    if ((userScore - claimedPoints) >= rewardPoints) return 100;
    return Math.min(100, Math.round(((userScore - claimedPoints) / rewardPoints) * 100));
  };

  const getBarData = (): BarData => {
    return {
      labels: rewards.map((reward) => reward.title),
      datasets: [
        {
          data: rewards.map((reward) => {
            const progress = calculateProgressPercentage(reward.points);
            return progress;
          }),
        },
      ],
    };
  };

  const getDonutData = (): DonutDataItem[] => {
    const availablePoints = userScore - claimedPoints;
    const highestRewardPoints = Math.max(...rewards.map(r => r.points));
    const remainingToHighest = Math.max(0, highestRewardPoints - availablePoints);

    return [
      {
        name: 'Available Points',
        population: availablePoints,
        color: '#28A745',
        legendFontColor: '#FFFFFF',
        legendFontSize: 12,
      },
      {
        name: 'Claimed Points',
        population: claimedPoints,
        color: '#FF6384',
        legendFontColor: '#FFFFFF',
        legendFontSize: 12,
      },
      {
        name: 'Needed for Highest Reward',
        population: remainingToHighest,
        color: '#FFCE56',
        legendFontColor: '#FFFFFF',
        legendFontSize: 12,
      },
    ];
  };

  const fetchUnreadNotifications = async (token: string) => {
    try {
      console.log('📬 Fetching unread notifications count...');
      
      const response = await fetch('https://apk-blueguard-rosssyyy.onrender.com/notifications', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setUnreadCount(data.unreadCount || 0);
        console.log(`✅ Unread notifications count: ${data.unreadCount}`);
      } else {
        console.error('❌ Error fetching notifications:', data.message);
      }
    } catch (error) {
      console.error('❌ Error fetching unread notifications:', error);
    }
  };

  useEffect(() => {
    const fetchUserData = async (): Promise<void> => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          Alert.alert('Session Expired', 'Please log in again', [
            { text: 'OK', onPress: () => navigation.replace('Login') }
          ]);
          return;
        }

        console.log('Fetching user data with token:', token.substring(0, 10) + '...');

        try {
          const userResponse = await axios.get<{ success: boolean; user: UserData }>('https://apk-blueguard-rosssyyy.onrender.com/me', {
            headers: { Authorization: `Bearer ${token}` }
          });

          console.log('User data response:', userResponse.data);

          if (userResponse.data.success) {
            setUserData(userResponse.data.user);
            
            // Fetch unread notifications
            await fetchUnreadNotifications(token);
            
            try {
              const cleanupResponse = await axios.get<{ success: boolean; cleanups: Cleanup[] }>('https://apk-blueguard-rosssyyy.onrender.com/cleanups', {
                headers: { Authorization: `Bearer ${token}` },
                params: { email: userResponse.data.user.email }
              });

              console.log('Cleanup response:', cleanupResponse.data);

              if (cleanupResponse.data.success && cleanupResponse.data.cleanups.length > 0) {
                const totalScore = cleanupResponse.data.cleanups.reduce(
                  (sum, cleanup) => sum + (cleanup.score || 0), 
                  0
                );
                setUserScore(totalScore);
              }
            } catch (cleanupErr) {
              console.error('Error fetching cleanups:', cleanupErr);
            }

            try {
              const claimsResponse = await axios.get<{ success: boolean; claims: Claim[] }>('https://apk-blueguard-rosssyyy.onrender.com/user-claims', {
                headers: { Authorization: `Bearer ${token}` }
              });

              console.log('Claims response:', claimsResponse.data);

              if (claimsResponse.data.success) {
                const totalClaimedPoints = claimsResponse.data.claims.reduce(
                  (sum, claim) => sum + claim.pointsClaimed,
                  0
                );
                setClaimedPoints(totalClaimedPoints);
              }
            } catch (claimsErr) {
              console.error('Error fetching claims:', claimsErr);
            }
          }
        } catch (userErr: any) {
          console.error('Error fetching user data:', userErr.response?.data || userErr.message);
          setError('Failed to load user data: ' + (userErr.response?.data?.message || userErr.message));
          
          if (userErr.response && (userErr.response.status === 401 || userErr.response.status === 403)) {
            Alert.alert('Authentication Error', 'Please log in again', [
              { text: 'OK', onPress: () => navigation.replace('Login') }
            ]);
          }
        }
      } catch (err: any) {
        console.error('General error:', err);
        setError(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigation]);

  const claimReward = (reward: Reward): void => {
    if (hasEarnedReward(reward.points)) {
      setSelectedReward(reward);
      setShowReceipt(true);
    } else {
      const pointsNeeded = getPointsNeeded(reward.points);
      Alert.alert(
        'Not Enough Points',
        `You need ${pointsNeeded} more points to claim this reward.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handlePointsUpdated = (newScore: number): void => {
    if (selectedReward) {
      setClaimedPoints(claimedPoints + selectedReward.points);
    }
    setShowReceipt(false);
  };

  const availablePoints = userScore - claimedPoints;
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="trophy" size={30} color="white" />
        <Text style={styles.headerTitle}>Rewards</Text>
      </View>
  
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Loading rewards...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#FF6347" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.replace('Rewards')}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {userData && (
            <View style={styles.topBanner}>
              <Text style={styles.bannerText}>Welcome, {userData.name || 'Eco Warrior'}!</Text>
            </View>
          )}
          
          <View style={styles.contentContainer}>
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer}>
              <Animatable.View 
                animation="fadeIn" 
                duration={1000} 
                style={styles.pointsSummary}
              >
                <View style={styles.pointsContainer}>
                  <Text style={styles.pointsLabel}>Available Points:</Text>
                  <Text style={styles.pointsValue}>{availablePoints}</Text>
                </View>
                <View style={styles.pointsContainer}>
                  <Text style={styles.pointsLabel}>Total Points Earned:</Text>
                  <Text style={styles.pointsValue}>{userScore}</Text>
                </View>
                <View style={styles.pointsContainer}>
                  <Text style={styles.pointsLabel}>Points Claimed:</Text>
                  <Text style={styles.pointsValue}>{claimedPoints}</Text>
                </View>
              </Animatable.View>
              
              <Animatable.View 
                animation="fadeIn" 
                delay={200}
                style={styles.chartsContainer}
              >
                <Text style={styles.sectionTitle}>Points Distribution</Text>
                <View style={styles.chartWrapper}>
                  <PieChart
                    data={getDonutData()}
                    width={screenWidth - 40}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#000957',
                      backgroundGradientFrom: '#000957',
                      backgroundGradientTo: '#0A5EB0',
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      style: {
                        borderRadius: 16,
                      },
                    }}
                    style={styles.chart}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    center={[10, 0]}
                    absolute
                    hasLegend={true}
                  />
                </View>
              </Animatable.View>
      
              <Animatable.View 
                animation="fadeIn" 
                delay={400}
                style={styles.chartsContainer}
              >
                <Text style={styles.sectionTitle}>Your Progress</Text>
                <View style={styles.chartWrapper}>
                  <BarChart
                    data={getBarData()}
                    width={screenWidth - 40}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#000957',
                      backgroundGradientFrom: '#000957',
                      backgroundGradientTo: '#0A5EB0',
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      style: {
                        borderRadius: 16,
                      },
                      barPercentage: 0.8,
                    }}
                    style={styles.chart}
                    yAxisSuffix="%"
                    yAxisLabel=""
                    fromZero
                  />
                </View>
              </Animatable.View>
      
              <Text style={styles.sectionTitle}>Available Rewards</Text>
              {rewards.map((reward, index) => (
                <Animatable.View
                  key={reward.id}  
                  animation="fadeInUp"
                  delay={600 + (index * 200)}
                  style={styles.rewardCard}
                >
                  <View style={styles.rewardInfo}>
                    <View style={[styles.iconContainer, { backgroundColor: reward.color }]}>
                      <Ionicons name={reward.icon as any} size={24} color="#FFF" />
                    </View>
                    <View style={styles.rewardDetails}>
                      <Text style={styles.rewardTitle}>{reward.title}</Text>
                      <Text style={styles.rewardPoints}>{reward.points} points</Text>
                      
                      <View style={styles.progressBarContainer}>
                        <View 
                          style={[
                            styles.progressBar, 
                            { 
                              width: `${calculateProgressPercentage(reward.points)}%`,
                              backgroundColor: hasEarnedReward(reward.points) ? '#28A745' : '#0A5EB0'
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {hasEarnedReward(reward.points) 
                          ? 'Ready to claim!' 
                          : `${getPointsNeeded(reward.points)} points needed`}
                      </Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.claimButton,
                      !hasEarnedReward(reward.points) && styles.disabledButton
                    ]}
                    onPress={() => claimReward(reward)}
                    disabled={!hasEarnedReward(reward.points)}
                  >
                    <Text style={styles.claimButtonText}>
                      {hasEarnedReward(reward.points) ? 'Claim' : 'Not Enough'}
                    </Text>
                  </TouchableOpacity>
                </Animatable.View>
              ))}

              <Animatable.View
                animation="fadeInUp"
                delay={800}
                style={styles.receiptsButtonContainer}
              >
                <TouchableOpacity
                  style={styles.receiptsButton}
                  onPress={() => navigation.navigate('Receipts')}
                >
                  <Ionicons name="document-text" size={24} color="white" />
                  <Text style={styles.receiptsButtonText}>View All Receipts</Text>
                </TouchableOpacity>
              </Animatable.View>
            </ScrollView>
          </View>
        </>
      )}
  
      <Modal
        visible={showReceipt}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReceipt(false)}
      >
        <RewardClaimReceipt
          reward={selectedReward}
          userData={userData}
          onClose={() => setShowReceipt(false)}
          onPointsUpdated={handlePointsUpdated}
        />
      </Modal>

      {/* Footer with Notification Badge */}
      <View style={styles.footer}>
        {[
          { name: 'Dashboard', icon: 'home', screen: 'Dash' },
          { name: 'Notifications', icon: 'notifications', screen: 'Notifications' },
          { name: 'My Reports', icon: 'document-text', screen: 'Reports' },
          { name: 'Rewards', icon: 'trophy', screen: 'Rewards' },
          { name: 'Knowledge', icon: 'book', screen: 'Knowledge' },
          { name: 'Profile', icon: 'person', screen: 'Profile' },
        ].map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.navButton,
              item.screen === 'Rewards' && styles.activeNavButton
            ]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Ionicons 
              name={item.icon as any} 
              size={24} 
              color={item.screen === 'Rewards' ? "#FFD700" : "white"} 
            />
            <Text style={[
              styles.navText,
              item.screen === 'Rewards' && styles.activeNavText
            ]}>
              {item.name}
            </Text>
            {item.screen === 'Notifications' && unreadCount > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
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
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  topBanner: {
    backgroundColor: '#000957',
    padding: 10,
    alignItems: 'center',
  },
  bannerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'white',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#28A745',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
    paddingBottom: 80,
  },
  pointsSummary: {
    backgroundColor: '#000957',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  pointsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  pointsLabel: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#28A745',
  },
  chartsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  chartWrapper: {
    alignItems: 'center',
    marginVertical: 10,
  },
  chart: {
    borderRadius: 12,
    marginVertical: 8,
    paddingRight: 20,
  },
  rewardCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rewardDetails: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000957',
    marginBottom: 4,
  },
  rewardPoints: {
    fontSize: 16,
    color: '#FFD700',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    marginBottom: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#555555',
  },
  claimButton: {
    backgroundColor: '#28A745',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#555555',
  },
  claimButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000957',
    width: '100%',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  navButton: { 
    alignItems: 'center',
    paddingVertical: 5,
    position: 'relative',
  },
  activeNavButton: {
    borderBottomWidth: 3,
    borderBottomColor: '#FFD700',
  },
  navText: { 
    color: 'white', 
    fontSize: 12,
    marginTop: 2,
  },
  activeNavText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#FF5733',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  navBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  receiptsButtonContainer: {
    marginTop: 15,
    marginBottom: 20,
  },
  receiptsButton: {
    backgroundColor: '#28A745',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
  },
  receiptsButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default Rewards;