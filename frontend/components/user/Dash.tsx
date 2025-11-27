import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Image imports using require for TypeScript compatibility
const plasticPollutionImg = require('../../assets/plastic_pollution.jpg');
const oceanProtectionImg = require('../../assets/ocean_protection.jpg');
const marineLifeImg = require('../../assets/marine_life.jpg');
const illegalFishingImg = require('../../assets/illegal_fishing.jpg');
const virtualCleaningImg1 = require('../../assets/virtual_cleaning_1.jpg');
const virtualCleaningImg2 = require('../../assets/virtual_cleaning_2.jpg');
const virtualCleaningImg3 = require('../../assets/virtual_cleaning_3.jpg');
const virtualCleaningImg4 = require('../../assets/virtual_cleaning_4.jpg');
const donationImg = require('../../assets/donation.jpg');
const scheduleImg = require('../../assets/schedule.jpg');
const reportImg = require('../../assets/report.jpg');
const cuteGif = require('../../assets/cute1.jpg');

// Define navigation types
type RootStackParamList = {
  Login: undefined;
  Dash: undefined;
  Report: undefined;
  Cleaning: undefined;
  Donation: undefined;
  Schedule: undefined;
  PendingReports: undefined;
  CheckSchedule: undefined;
  TrashLevel: undefined;
  DashCharts: undefined;
  TrashDetect: undefined;
  CompletedReports: undefined;
  OceanNews: undefined;
  OceanLife: undefined;
  ChatList: undefined;
  Notifications: undefined;
  Reports: undefined;
  Rewards: undefined;
  Knowledge: undefined;
  Profile: undefined;
  OceanCleanupGame: undefined;
  Game: undefined;
  OceanMemoryGame: undefined;
};

type DashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dash'>;

type Props = {
  navigation: DashScreenNavigationProp;
};

// Define types for state objects
interface User {
  _id: string;
  name: string;
  email: string;
}

interface OceanStats {
  reportsThisMonth: number;
  trashCollected: string;
  activeCleanups: number;
  volunteerHours: number;
}

interface UserImpact {
  reportsFiled: number;
  cleanupsJoined: number;
  pointsEarned: number;
}

interface ImageCardItem {
  img: any;
  label: string;
  desc: string;
}

interface NavItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: keyof RootStackParamList;
}

interface SuggestedUser {
  _id: string;
  name: string;
  email: string;
  gender: string;
  followersCount: number;
  followingCount: number;
  createdAt: string;
}

const Dash: React.FC<Props> = ({ navigation }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [oceanStats, setOceanStats] = useState<OceanStats>({
    reportsThisMonth: 0,
    trashCollected: '0 kg',
    activeCleanups: 0,
    volunteerHours: 0
  });
  const [userImpact, setUserImpact] = useState<UserImpact>({
    reportsFiled: 0,
    cleanupsJoined: 0,
    pointsEarned: 0
  });
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followingStatus, setFollowingStatus] = useState<{ [key: string]: boolean }>({});
  const [loadingFollow, setLoadingFollow] = useState<{ [key: string]: boolean }>({});
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const fetchUserData = async () => {
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

        const data = await response.json();
        if (response.ok) {
          setUser(data.user);
          await fetchRealStats(token, data.user.email);
          await fetchSuggestedUsers(token);
          await fetchUnreadNotifications(token);
        } else {
          console.error('Error fetching user:', data.message);
          navigation.replace('Login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchRealStats = async (token: string, userEmail: string) => {
      try {
        const [reportsRes, schedulesRes, cleanupRes] = await Promise.all([
          fetch('https://apk-blueguard-rosssyyy.onrender.com/get-reported', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('https://apk-blueguard-rosssyyy.onrender.com/api/schedules'),
          fetch(`https://apk-blueguard-rosssyyy.onrender.com/cleanups?email=${encodeURIComponent(userEmail)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const reportsData = await reportsRes.json();
        const schedulesData = await schedulesRes.json();
        const cleanupData = await cleanupRes.json();

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const reportsThisMonth = Array.isArray(reportsData) 
          ? reportsData.filter((report: any) => {
              const reportDate = new Date(report.createdAt);
              return reportDate.getMonth() === currentMonth && 
                     reportDate.getFullYear() === currentYear;
            }).length
          : 0;

        const activeCleanups = Array.isArray(schedulesData)
          ? schedulesData.filter((schedule: any) => 
              schedule.status === 'confirmed' || schedule.status === 'pending'
            ).length
          : 0;

        const userCleanups = Array.isArray(cleanupData?.cleanups) ? cleanupData.cleanups : [];
        const totalScore = userCleanups.reduce((sum: number, cleanup: any) => sum + (cleanup.score || 0), 0);
        const trashKg = Math.round(totalScore * 0.5);

        const completedSchedules = Array.isArray(schedulesData)
          ? schedulesData.filter((s: any) => s.status === 'completed').length
          : 0;
        const volunteerHours = (completedSchedules + userCleanups.length) * 2;

        setOceanStats({
          reportsThisMonth,
          trashCollected: `${trashKg.toLocaleString()} kg`,
          activeCleanups,
          volunteerHours
        });

        const userReports = Array.isArray(reportsData)
          ? reportsData.filter((r: any) => r.reportedBy === userEmail || r.email === userEmail)
          : [];
        
        const userPoints = userCleanups.reduce((sum: number, c: any) => sum + (c.score || 0), 0);

        setUserImpact({
          reportsFiled: userReports.length,
          cleanupsJoined: userCleanups.length,
          pointsEarned: userPoints
        });

      } catch (error) {
        console.error('Error fetching real stats:', error);
      }
    };

    fetchUserData();
  }, [navigation]);

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

  const fetchSuggestedUsers = async (token: string) => {
    try {
      const response = await fetch('https://apk-blueguard-rosssyyy.onrender.com/api/suggested-users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuggestedUsers(data.users);
        
        const statusPromises = data.users.map((user: SuggestedUser) =>
          fetch(`https://apk-blueguard-rosssyyy.onrender.com/api/is-following/${user._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }).then(res => res.json())
        );
        
        const statuses = await Promise.all(statusPromises);
        const statusMap: { [key: string]: boolean } = {};
        data.users.forEach((user: SuggestedUser, index: number) => {
          statusMap[user._id] = statuses[index].isFollowing || false;
        });
        setFollowingStatus(statusMap);
      }
    } catch (error) {
      console.error('Error fetching suggested users:', error);
    }
  };

  const handleFollowToggle = async (userId: string, currentlyFollowing: boolean) => {
    try {
      setLoadingFollow({ ...loadingFollow, [userId]: true });
      
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const url = currentlyFollowing 
        ? `https://apk-blueguard-rosssyyy.onrender.com/api/unfollow/${userId}`
        : `https://apk-blueguard-rosssyyy.onrender.com/api/follow/${userId}`;
      
      const method = currentlyFollowing ? 'DELETE' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setFollowingStatus({
          ...followingStatus,
          [userId]: !currentlyFollowing
        });

        setSuggestedUsers(suggestedUsers.map(user => 
          user._id === userId 
            ? { ...user, followersCount: data.followersCount }
            : user
        ));

        Alert.alert(
          'Success',
          currentlyFollowing ? 'Unfollowed successfully' : 'Following successfully'
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to update follow status');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setLoadingFollow({ ...loadingFollow, [userId]: false });
    }
  };

  const getGenderIcon = (gender: string) => {
    switch (gender.toLowerCase()) {
      case 'male':
        return 'man';
      case 'female':
        return 'woman';
      default:
        return 'person';
    }
  };

  const imageGridData: ImageCardItem[] = [
    { img: plasticPollutionImg, label: 'Plastic Pollution', desc: 'Learn about the impact of plastics on marine ecosystems' },
    { img: oceanProtectionImg, label: 'Ocean Protection', desc: 'Discover efforts to create marine protected areas' },
    { img: marineLifeImg, label: 'Marine Life', desc: 'Explore the rich biodiversity of our oceans' },
    { img: illegalFishingImg, label: 'Illegal Fishing', desc: 'Understand the threats of unsustainable fishing practices' }
  ];

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
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="earth" size={30} color="white" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>BlueGuard</Text>
      </View>

      {/* Display User Name at the Top */}
      {loading ? (
        <ActivityIndicator size="large" color="white" style={styles.loadingIndicator} />
      ) : (
        user && (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Welcome, {user.name}!</Text>
          </View>
        )
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Dashboard Section */}
        <View style={styles.dashboardSection}>
          <Text style={styles.dashboardTitle}>Dashboard</Text>
          <Text style={styles.subtitle}>
            A Platform for Reporting Illegal Activities, Educating the Public, and Promoting Ocean Conservation
          </Text>
          
          {/* Ocean Impact Stats */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Community Impact</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="document-text" size={24} color="#009990" />
                <Text style={styles.statValue}>{oceanStats.reportsThisMonth}</Text>
                <Text style={styles.statLabel}>Reports This Month</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="trash" size={24} color="#009990" />
                <Text style={styles.statValue}>{oceanStats.trashCollected}</Text>
                <Text style={styles.statLabel}>Trash Collected</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="people" size={24} color="#009990" />
                <Text style={styles.statValue}>{oceanStats.activeCleanups}</Text>
                <Text style={styles.statLabel}>Active Cleanups</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="time" size={24} color="#009990" />
                <Text style={styles.statValue}>{oceanStats.volunteerHours}</Text>
                <Text style={styles.statLabel}>Volunteer Hours</Text>
              </View>
            </View>
          </View>

          {/* Report Illegal Activities Section */}
          <Text style={styles.sectionTitle}>Report Illegal Activities</Text>
          <View style={styles.reportInfoContainer}>
            <Text style={styles.reportInfoText}>
              Spotted illegal fishing, dumping, or other harmful activities? Help protect our oceans by submitting a detailed report with photos and location.
            </Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Report')}>
            <Text style={styles.buttonText}>📝 START A REPORT</Text>
          </TouchableOpacity>

          {/* Learn About Marine Conservation Section */}
          <Text style={styles.sectionTitle}>Learn About Marine Conservation</Text>
          <Text style={styles.sectionDescription}>
            Explore educational resources on crucial marine conservation topics. Tap any card to learn more.
          </Text>
          <View style={styles.imageGrid}>
            {imageGridData.map((item, index) => (
              <TouchableOpacity key={index} style={styles.imageCard}>
                <Image source={item.img} style={styles.image} />
                <Text style={styles.imageLabel}>{item.label}</Text>
                <Text style={styles.imageDescription}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Games & Activities Section */}
          <Text style={styles.sectionTitle}>Games & Activities</Text>
          <Text style={styles.sectionDescription}>
            Have fun while learning about ocean conservation through these interactive games and activities.
          </Text>
          <View style={styles.gameButtonsContainer}>
            <TouchableOpacity 
              style={styles.gameButton} 
              onPress={() => navigation.navigate('OceanCleanupGame')}
            >
              <View style={styles.gameButtonIcon}>
                <Ionicons name="game-controller" size={24} color="#000957" />
              </View>
              <Text style={styles.gameButtonText}>Cleanup Game</Text>
              <Text style={styles.gameButtonDescription}>Identify and report trash in your area</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.gameButton} 
              onPress={() => navigation.navigate('Game')}
            >
              <View style={styles.gameButtonIcon}>
                <Ionicons name="grid" size={24} color="#000957" />
              </View>
              <Text style={styles.gameButtonText}>Memory Game</Text>
              <Text style={styles.gameButtonDescription}>Test your memory with ocean creatures</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.gameButton} 
              onPress={() => navigation.navigate('OceanMemoryGame')}
            >
              <View style={styles.gameButtonIcon}>
                <Ionicons name="help-circle" size={24} color="#000957" />
              </View>
              <Text style={styles.gameButtonText}>Ocean Quiz</Text>
              <Text style={styles.gameButtonDescription}>Test your knowledge about oceans</Text>
            </TouchableOpacity>
          </View>

          {/* Virtual Cleaning Section */}
          <Text style={styles.sectionTitle}>Virtual Cleaning</Text>
          <Text style={styles.sectionDescription}>
            Experience the impact of ocean cleanup efforts through our virtual cleaning simulator. Track your progress and earn rewards!
          </Text>
          <View style={styles.collage}>
            {[virtualCleaningImg1, virtualCleaningImg2, virtualCleaningImg3, virtualCleaningImg4].map((img, index) => (
              <Image key={index} source={img} style={styles.collageImage} />
            ))}
          </View>

          {/* Virtual Cleaning Benefits */}
          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>Virtual Cleaning Benefits:</Text>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={18} color="#009990" />
              <Text style={styles.benefitText}>Learn cleanup techniques</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={18} color="#009990" />
              <Text style={styles.benefitText}>Earn points toward real-world rewards</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={18} color="#009990" />
              <Text style={styles.benefitText}>Track your environmental impact</Text>
            </View>
          </View>
          
          {/* New Section for Donation, Schedule, and Pending Reports */}
          <Text style={styles.sectionTitle}>Take Action</Text>
          <Text style={styles.sectionDescription}>
            Make a real difference by contributing to ocean conservation efforts in these meaningful ways.
          </Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Donation')}>
              <Image source={donationImg} style={styles.actionImage} />
              <Text style={styles.actionText}>💰 Donate Now</Text>
              <Text style={styles.actionDescription}>Support our cause by making a donation. 100% of funds go directly to cleanup efforts.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Schedule')}>
              <Image source={scheduleImg} style={styles.actionImage} />
              <Text style={styles.actionText}>🗓️ Schedule Pickup</Text>
              <Text style={styles.actionDescription}>Schedule a trash pickup in your area. We provide all necessary equipment.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('PendingReports')}>
              <Image source={reportImg} style={styles.actionImage} />
              <Text style={styles.actionText}>📋 Pending Reports</Text>
              <Text style={styles.actionDescription}>View your pending reports and track their investigation status.</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Action Buttons */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionDescription}>
            Access key features quickly to manage your ocean conservation activities.
          </Text>
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.quickActionButton} 
              onPress={() => navigation.navigate('Cleaning')}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="water" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionText}>Virtual Cleaning</Text>
              <Text style={styles.quickActionDescription}>Start your ocean cleanup simulation</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton} 
              onPress={() => navigation.navigate('CheckSchedule')}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="calendar" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionText}>Pickup Schedules</Text>
              <Text style={styles.quickActionDescription}>Check upcoming cleanup schedules</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionButton} 
              onPress={() => navigation.navigate('DashCharts')}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="pie-chart" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionText}>Reports Charts</Text>
              <Text style={styles.quickActionDescription}>View detailed analytics and insights</Text>
            </TouchableOpacity>
          </View>

          {/* Your Impact Section */}
          <View style={styles.impactContainer}>
            <Text style={styles.impactTitle}>Your Impact</Text>
            <View style={styles.impactContent}>
              <View style={styles.impactStats}>
                <View style={styles.impactStatItem}>
                  <Text style={styles.impactStatValue}>{userImpact.reportsFiled}</Text>
                  <Text style={styles.impactStatLabel}>Reports Filed</Text>
                </View>
                <View style={styles.impactStatItem}>
                  <Text style={styles.impactStatValue}>{userImpact.cleanupsJoined}</Text>
                  <Text style={styles.impactStatLabel}>Cleanups Joined</Text>
                </View>
                <View style={styles.impactStatItem}>
                  <Text style={styles.impactStatValue}>{userImpact.pointsEarned}</Text>
                  <Text style={styles.impactStatLabel}>Points Earned</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.impactButton} onPress={() => navigation.navigate('Profile')}>
                <Text style={styles.impactButtonText}>View Full Impact Report</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* PEOPLE YOU MAY KNOW SECTION */}
          {suggestedUsers.length > 0 && (
            <View style={styles.peopleSection}>
              <View style={styles.peopleSectionHeader}>
                <Ionicons name="people" size={24} color="#009990" />
                <Text style={styles.sectionTitle}>People You May Know</Text>
              </View>
              <Text style={styles.sectionDescription}>
                Connect with other ocean guardians and expand your conservation network
              </Text>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.peopleScrollContainer}
              >
                {suggestedUsers.map((suggestedUser) => (
                  <View key={suggestedUser._id} style={styles.userCard}>
                    <View style={styles.userCardHeader}>
                      <View style={styles.userAvatar}>
                        <Ionicons 
                          name={getGenderIcon(suggestedUser.gender) as any} 
                          size={40} 
                          color="#009990" 
                        />
                      </View>
                    </View>
                    
                    <Text style={styles.userName} numberOfLines={1}>
                      {suggestedUser.name}
                    </Text>
                    
                    <View style={styles.userStats}>
                      <View style={styles.userStatItem}>
                        <Text style={styles.userStatValue}>
                          {suggestedUser.followersCount}
                        </Text>
                        <Text style={styles.userStatLabel}>Followers</Text>
                      </View>
                      <View style={styles.userStatDivider} />
                      <View style={styles.userStatItem}>
                        <Text style={styles.userStatValue}>
                          {suggestedUser.followingCount}
                        </Text>
                        <Text style={styles.userStatLabel}>Following</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.followButton,
                        followingStatus[suggestedUser._id] && styles.followingButton
                      ]}
                      onPress={() => handleFollowToggle(
                        suggestedUser._id, 
                        followingStatus[suggestedUser._id]
                      )}
                      disabled={loadingFollow[suggestedUser._id]}
                    >
                      {loadingFollow[suggestedUser._id] ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons 
                            name={followingStatus[suggestedUser._id] ? "checkmark-circle" : "person-add"} 
                            size={16} 
                            color="#FFFFFF" 
                          />
                          <Text style={styles.followButtonText}>
                            {followingStatus[suggestedUser._id] ? 'Following' : 'Follow'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Explore More Section */}
          <Text style={styles.sectionTitle}>Explore More</Text>
          <Text style={styles.sectionDescription}>
            Dive deeper into ocean conservation through reports, multimedia, and community insights.
          </Text>
          <View style={styles.exploreButtonsContainer}>
            <TouchableOpacity 
              style={styles.exploreButton} 
              onPress={() => navigation.navigate('CompletedReports')}
            >
              <View style={styles.exploreButtonIconContainer}>
                <Ionicons name="checkmark-done" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.exploreButtonText}>Completed Reports</Text>
              <Text style={styles.exploreButtonDescription}>View resolved environmental reports</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.exploreButton} 
              onPress={() => navigation.navigate('OceanNews')}
            >
              <View style={styles.exploreButtonIconContainer}>
                <Ionicons name="newspaper" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.exploreButtonText}>Ocean News</Text>
              <Text style={styles.exploreButtonDescription}>Latest marine conservation updates</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.exploreButton} 
              onPress={() => navigation.navigate('OceanLife')}
            >
              <View style={styles.exploreButtonIconContainer}>
                <Ionicons name="play" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.exploreButtonText}>Ocean Life</Text>
              <Text style={styles.exploreButtonDescription}>Educational marine conservation videos</Text>
            </TouchableOpacity>
          </View>

          {/* News and Updates Section */}
          <Text style={styles.sectionTitle}>News & Updates</Text>
          <View style={styles.newsContainer}>
            <View style={styles.newsItem}>
              <View style={styles.newsDate}>
                <Text style={styles.newsDateText}>MAR 15</Text>
              </View>
              <View style={styles.newsContent}>
                <Text style={styles.newsTitle}>Beach Cleanup Results: 500kg Removed</Text>
                <Text style={styles.newsDescription}>Last weekend's volunteer event was a huge success with record participation.</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllButtonText}>View All News</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Floating Messenger Button */}
      <TouchableOpacity 
        style={styles.messengerButton} 
        onPress={() => navigation.navigate('ChatList')}
      >
        <Image 
          source={cuteGif} 
          style={styles.messengerButtonGif}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Sticky Footer with Notification Badge */}
      <View style={styles.footer}>
        {navItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={[
              styles.navButton,
              item.screen === 'Dash' && styles.activeNavButton
            ]} 
            onPress={() => navigation.navigate(item.screen)}
          >
            <Ionicons 
              name={item.icon} 
              size={24} 
              color={item.screen === 'Dash' ? "#FFD700" : "white"} 
            />
            <Text style={[
              styles.navText,
              item.screen === 'Dash' && styles.activeNavText
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
    </View>
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
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  messengerButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 100,
    overflow: 'hidden',
  },
  messengerButtonGif: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
  },
  exploreButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  exploreButton: {
    width: '31%',
    backgroundColor: '#000957',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#009990',
  },
  exploreButtonIconContainer: {
    backgroundColor: '#009990',
    borderRadius: 50,
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  exploreButtonDescription: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 5,
  },
  welcomeContainer: {
    backgroundColor: '#FFD700',
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignItems: 'center',
    borderRadius: 5,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000957',
    textAlign: 'center'
  },
  loadingIndicator: {
    marginTop: 20,
  },
  scrollContent: {
    paddingBottom: 100,
    alignItems: 'center',
  },
  dashboardSection: {
    width: '90%',
    marginTop: 10,
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#009990',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: 'white',
    marginBottom: 20,
  },
  statsContainer: {
    backgroundColor: '#000957',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#009990',
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: 'white',
    marginBottom: 15,
  },
  reportInfoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  reportInfoText: {
    fontSize: 14,
    color: 'white',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#009990',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#000957',
    fontWeight: 'bold',
    fontSize: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  imageCard: {
    width: '45%',
    marginBottom: 15,
    alignItems: 'center',
    backgroundColor: '#000957',
    borderRadius: 10,
    padding: 10,
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 10,
  },
  imageLabel: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  imageDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 3,
  },
  collage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  collageImage: {
    width: '45%',
    height: 100,
    borderRadius: 8,
    marginBottom: 10,
  },
  benefitsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  benefitText: {
    fontSize: 14,
    color: 'white',
    marginLeft: 8,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  actionCard: {
    width: '30%',
    marginBottom: 15,
    alignItems: 'center',
    backgroundColor: '#000957',
    borderRadius: 10,
    padding: 10,
  },
  actionImage: {
    width: '100%',
    height: 80,
    borderRadius: 10,
  },
  actionText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  actionDescription: {
    fontSize: 12,
    color: 'white',
    textAlign: 'center',
  },
  impactContainer: {
    backgroundColor: '#000957',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  impactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  impactContent: {
    alignItems: 'center',
  },
  impactStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 15,
  },
  impactStatItem: {
    alignItems: 'center',
  },
  impactStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#009990',
  },
  impactStatLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 5,
  },
  impactButton: {
    backgroundColor: '#009990',
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  impactButtonText: {
    color: '#000957',
    fontSize: 14,
    fontWeight: 'bold',
  },
  newsContainer: {
    marginBottom: 30,
  },
  newsItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  newsDate: {
    backgroundColor: '#009990',
    borderRadius: 5,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    height: 50,
    width: 50,
  },
  newsDateText: {
    color: '#000957',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  newsContent: {
    flex: 1,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  newsDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  viewAllButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#009990',
    borderRadius: 5,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  viewAllButtonText: {
    color: '#009990',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000957',
    width: '100%',
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
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
  gameButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  gameButton: {
    width: '31%',
    backgroundColor: '#009990',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 10,
  },
  gameButtonIcon: {
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gameButtonText: {
    color: '#000957',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  gameButtonDescription: {
    fontSize: 10,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 5,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  quickActionButton: {
    width: '31%',
    backgroundColor: '#000957',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#009990',
  },
  quickActionIconContainer: {
    backgroundColor: '#009990',
    borderRadius: 50,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 5,
  },
  quickActionDescription: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  peopleSection: {
    marginBottom: 30,
  },
  peopleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  peopleScrollContainer: {
    paddingVertical: 10,
  },
  userCard: {
    width: 160,
    backgroundColor: '#000957',
    borderRadius: 15,
    padding: 15,
    marginRight: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#009990',
  },
  userCardHeader: {
    marginBottom: 10,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 153, 144, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#009990',
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  userStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  userStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  userStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#009990',
  },
  userStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  followButton: {
    backgroundColor: '#009990',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  followingButton: {
    backgroundColor: '#4A5568',
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default Dash;
