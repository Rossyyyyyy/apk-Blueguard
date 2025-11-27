import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  Image, 
  ActivityIndicator, 
  Alert, 
  ScrollView,
  RefreshControl,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
  Modal,
  FlatList,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'http://10.120.221.103:5000';

// Type definitions
interface User {
  _id: string;
  name: string;
  email: string;
  bio?: string;
  phone?: string;
  profilePicture?: string;
  role?: string;
  gender?: string;
  followersCount?: number;
  followingCount?: number;
  createdAt?: string;
}

interface FormData {
  name: string;
  email: string;
  bio: string;
  phone: string;
  profilePictureUpdated?: boolean;
  profilePictureData?: string;
}

interface FollowUser {
  _id: string;
  name: string;
  email: string;
  gender: string;
  followersCount: number;
  followingCount: number;
}

interface Activity {
  id: string;
  type: 'cleanup' | 'report' | 'donation';
  title: string;
  description: string;
  date: string;
  icon: string;
  color: string;
}

interface RouteParams {
  userId?: string;
}

const Profile: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const routeParams = route.params as RouteParams;
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    bio: '',
    phone: ''
  });

  // Modal states
  const [showFollowersModal, setShowFollowersModal] = useState<boolean>(false);
  const [showFollowingModal, setShowFollowingModal] = useState<boolean>(false);
  const [showActivityModal, setShowActivityModal] = useState<boolean>(false);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState<boolean>(false);
  const [loadingFollowing, setLoadingFollowing] = useState<boolean>(false);

  // Check if viewing own profile or another user's profile
  const isOwnProfile = !routeParams?.userId || routeParams.userId === currentUserId;

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Fetch unread notifications count
  const fetchUnreadNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      console.log('📬 Fetching unread notifications count...');
      
      const response = await fetch(`${API_BASE_URL}/notifications`, {
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

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        if (data.success) {
          setCurrentUserId(data.user._id);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();
  }, []);

  const fetchUser = async (): Promise<void> => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      navigation.replace('Home');
      return;
    }

    try {
      setLoading(true);
      
      // If viewing another user's profile
      if (routeParams?.userId && routeParams.userId !== currentUserId) {
        const response = await fetch(`${API_BASE_URL}/api/user/${routeParams.userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
          if (data.user.profilePicture) {
            setProfilePicture(data.user.profilePicture);
          }
          // Check if following this user
          checkFollowStatus(routeParams.userId);
        }
      } else {
        // Fetch own profile
        const response = await fetch(`${API_BASE_URL}/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
          setFormData({
            name: data.user.name || '',
            email: data.user.email || '',
            bio: data.user.bio || '',
            phone: data.user.phone || ''
          });
          if (data.user.profilePicture) {
            setProfilePicture(data.user.profilePicture);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      Alert.alert('Error', 'Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Check if current user is following this profile
  const checkFollowStatus = async (userId: string): Promise<void> => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/is-following/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setIsFollowing(data.isFollowing);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  // Handle follow/unfollow
  const handleFollowToggle = async (): Promise<void> => {
    if (!user) return;
    
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const response = await fetch(`${API_BASE_URL}/api/unfollow/${user._id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        if (data.success) {
          setIsFollowing(false);
          setUser(prev => prev ? {...prev, followersCount: (prev.followersCount || 0) - 1} : null);
          Alert.alert('Success', 'Unfollowed successfully');
        }
      } else {
        // Follow
        const response = await fetch(`${API_BASE_URL}/api/follow/${user._id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        if (data.success) {
          setIsFollowing(true);
          setUser(prev => prev ? {...prev, followersCount: (prev.followersCount || 0) + 1} : null);
          Alert.alert('Success', 'Following successfully');
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  // Fetch user activities (cleanups, reports, donations)
  const fetchActivities = async (): Promise<void> => {
    if (!user) return;
    
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      // Fetch cleanups
      const cleanupsResponse = await fetch(`${API_BASE_URL}/cleanups?email=${user.email}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const cleanupsData = await cleanupsResponse.json();

      // Fetch reports
      const reportsResponse = await fetch(`${API_BASE_URL}/reports/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const reportsData = await reportsResponse.json();

      // Combine and format activities
      const combinedActivities: Activity[] = [];

      if (cleanupsData.success && cleanupsData.cleanups) {
        cleanupsData.cleanups.forEach((cleanup: any) => {
          combinedActivities.push({
            id: cleanup._id,
            type: 'cleanup',
            title: 'Beach Cleanup',
            description: `Earned ${cleanup.score} points`,
            date: new Date(cleanup.createdAt).toLocaleDateString(),
            icon: 'trash-bin',
            color: '#32CD32'
          });
        });
      }

      if (reportsData.success && reportsData.reports) {
        reportsData.reports.forEach((report: any) => {
          combinedActivities.push({
            id: report._id,
            type: 'report',
            title: report.incidentType || 'Environmental Report',
            description: report.eventDescription?.substring(0, 50) + '...',
            date: new Date(report.createdAt).toLocaleDateString(),
            icon: 'alert-circle',
            color: '#FF6B6B'
          });
        });
      }

      // Sort by date (newest first)
      combinedActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setActivities(combinedActivities.slice(0, 10)); // Show last 10 activities
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchFollowers = async (): Promise<void> => {
    if (!user) return;
    
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      setLoadingFollowers(true);
      const response = await fetch(`${API_BASE_URL}/api/followers/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setFollowers(data.followers);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const fetchFollowing = async (): Promise<void> => {
    if (!user) return;
    
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      setLoadingFollowing(true);
      const response = await fetch(`${API_BASE_URL}/api/following/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setFollowing(data.following);
      }
    } catch (error) {
      console.error('Error fetching following:', error);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleUnfollow = async (userId: string): Promise<void> => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    Alert.alert(
      'Unfollow',
      'Are you sure you want to unfollow this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfollow',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/unfollow/${userId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              const data = await response.json();
              if (data.success) {
                fetchFollowing();
                fetchUser();
                Alert.alert('Success', 'Unfollowed successfully');
              }
            } catch (error) {
              console.error('Error unfollowing:', error);
              Alert.alert('Error', 'Failed to unfollow user');
            }
          }
        }
      ]
    );
  };

  // Navigate to another user's profile
  const navigateToUserProfile = (userId: string): void => {
    if (userId === currentUserId) {
      navigation.navigate('Profile');
    } else {
      navigation.push('Profile', { userId });
    }
    setShowFollowersModal(false);
    setShowFollowingModal(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchUser();
      fetchUnreadNotifications();
    }, [routeParams?.userId])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUser();
    fetchUnreadNotifications();
  }, []);

  const handleLogout = async (): Promise<void> => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('token');
            navigation.replace('Home');
          }
        }
      ]
    );
  };

  const handleImageUpload = async (): Promise<void> => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'You need to grant permission to access your photos');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setProfilePicture(asset.uri);
        
        setFormData(prev => ({
          ...prev,
          profilePictureUpdated: true,
          profilePictureData: `data:image/jpeg;base64,${asset.base64}`
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      navigation.replace('Home');
      return;
    }
    
    try {
      setUpdating(true);
      const response = await fetch(`${API_BASE_URL}/update-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        setEditing(false);
        fetchUser();
        Alert.alert('Success', 'Profile updated successfully! 🎉');
      } else {
        throw new Error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = (): void => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        phone: user.phone || ''
      });
      if (user.profilePicture) {
        setProfilePicture(user.profilePicture);
      }
    }
    setEditing(false);
  };

  const getGenderIcon = (gender?: string) => {
    switch (gender?.toLowerCase()) {
      case 'male': return 'man';
      case 'female': return 'woman';
      default: return 'person';
    }
  };

  const getMemberSince = (dateString?: string) => {
    if (!dateString) return 'Member';
    const date = new Date(dateString);
    const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `Member since ${monthYear}`;
  };

  // Render follower/following item
  const renderUserItem = ({ item, isFollowingList }: { item: FollowUser; isFollowingList: boolean }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => navigateToUserProfile(item._id)}
    >
      <View style={styles.userItemLeft}>
        <View style={styles.userItemAvatar}>
          <Ionicons 
            name={getGenderIcon(item.gender) as any} 
            size={24} 
            color="#0A5EB0" 
          />
        </View>
        <View style={styles.userItemInfo}>
          <Text style={styles.userItemName}>{item.name}</Text>
          <Text style={styles.userItemEmail}>{item.email}</Text>
          <View style={styles.userItemStats}>
            <Text style={styles.userItemStatText}>
              {item.followersCount} followers • {item.followingCount} following
            </Text>
          </View>
        </View>
      </View>
      {isFollowingList && isOwnProfile && (
        <TouchableOpacity
          style={styles.unfollowButton}
          onPress={() => handleUnfollow(item._id)}
        >
          <Text style={styles.unfollowButtonText}>Unfollow</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // Render activity item
  const renderActivityItem = ({ item }: { item: Activity }) => (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as any} size={24} color={item.color} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activityDescription}>{item.description}</Text>
        <Text style={styles.activityDate}>{item.date}</Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <LinearGradient colors={['#0A5EB0', '#000957']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </LinearGradient>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={["#FFD700"]}
              tintColor="#FFD700"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Enhanced Header with Cover Photo Effect */}
          <LinearGradient 
            colors={['#000957', '#0A5EB0', '#4A90E2']} 
            style={styles.coverPhoto}
          >
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {isOwnProfile ? 'My Profile' : 'User Profile'}
              </Text>
              {isOwnProfile && (
                <TouchableOpacity 
                  style={styles.settingsIconButton}
                  onPress={() => navigation.navigate('Settings')}
                >
                  <Ionicons name="settings-outline" size={24} color="white" />
                </TouchableOpacity>
              )}
            </View>

            {/* Decorative Pattern */}
            <View style={styles.coverPattern}>
              {[...Array(6)].map((_, i) => (
                <View key={i} style={[styles.patternCircle, { left: `${i * 20}%` }]} />
              ))}
            </View>
          </LinearGradient>

          <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
            {/* Enhanced Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.imageWrapper}>
                <View style={styles.imageBorder}>
                  <Image
                    source={
                      profilePicture 
                        ? { uri: profilePicture } 
                        : require('../../../assets/default-avatar.jpg')
                    }
                    style={styles.profileImage}
                  />
                </View>
                {editing && isOwnProfile && (
                  <TouchableOpacity 
                    onPress={handleImageUpload} 
                    style={styles.cameraButton}
                  >
                    <LinearGradient 
                      colors={['#FFD700', '#FFA500']} 
                      style={styles.cameraGradient}
                    >
                      <Ionicons name="camera" size={20} color="#000957" />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

              {!editing && user && (
                <View style={styles.userHeaderInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  
                  {user.role && (
                    <View style={styles.roleTag}>
                      <Ionicons name="shield-checkmark" size={14} color="#FFD700" />
                      <Text style={styles.roleText}>{user.role}</Text>
                    </View>
                  )}
                  
                  <Text style={styles.userEmail}>{user.email}</Text>
                  
                  {user.bio && (
                    <Text style={styles.userBio}>{user.bio}</Text>
                  )}

                  <Text style={styles.memberSince}>
                    {getMemberSince(user.createdAt)}
                  </Text>

                  {/* Stats Row */}
                  <View style={styles.statsContainer}>
                    <TouchableOpacity 
                      style={styles.statItem}
                      onPress={() => {
                        setShowFollowersModal(true);
                        fetchFollowers();
                      }}
                    >
                      <Text style={styles.statValue}>{user.followersCount || 0}</Text>
                      <Text style={styles.statLabel}>Followers</Text>
                    </TouchableOpacity>

                    <View style={styles.statDivider} />

                    <TouchableOpacity 
                      style={styles.statItem}
                      onPress={() => {
                        setShowFollowingModal(true);
                        fetchFollowing();
                      }}
                    >
                      <Text style={styles.statValue}>{user.followingCount || 0}</Text>
                      <Text style={styles.statLabel}>Following</Text>
                    </TouchableOpacity>

                    <View style={styles.statDivider} />

                    <TouchableOpacity 
                      style={styles.statItem}
                      onPress={() => {
                        setShowActivityModal(true);
                        fetchActivities();
                      }}
                    >
                      <Text style={styles.statValue}>{activities.length}</Text>
                      <Text style={styles.statLabel}>Activities</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Follow Button (for other users' profiles) */}
                  {!isOwnProfile && (
                    <TouchableOpacity
                      style={styles.followButton}
                      onPress={handleFollowToggle}
                      disabled={followLoading}
                    >
                      <LinearGradient
                        colors={isFollowing ? ['#FF6B6B', '#FF4757'] : ['#32CD32', '#28A428']}
                        style={styles.followButtonGradient}
                      >
                        {followLoading ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <>
                            <Ionicons 
                              name={isFollowing ? "person-remove" : "person-add"} 
                              size={20} 
                              color="white" 
                            />
                            <Text style={styles.followButtonText}>
                              {isFollowing ? 'Unfollow' : 'Follow'}
                            </Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Quick Actions Card (Own Profile Only) */}
            {isOwnProfile && !editing && (
              <View style={styles.quickActionsCard}>
                <Text style={styles.quickActionsTitle}>Quick Actions</Text>
                <View style={styles.quickActionsGrid}>
                  <TouchableOpacity 
                    style={styles.quickActionItem}
                    onPress={() => navigation.navigate('Reports')}
                  >
                    <LinearGradient
                      colors={['#4A90E2', '#357ABD']}
                      style={styles.quickActionGradient}
                    >
                      <Ionicons name="document-text" size={24} color="white" />
                    </LinearGradient>
                    <Text style={styles.quickActionText}>My Reports</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.quickActionItem}
                    onPress={() => navigation.navigate('Rewards')}
                  >
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      style={styles.quickActionGradient}
                    >
                      <Ionicons name="trophy" size={24} color="#000957" />
                    </LinearGradient>
                    <Text style={styles.quickActionText}>Rewards</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.quickActionItem}
                    onPress={() => {
                      setShowActivityModal(true);
                      fetchActivities();
                    }}
                  >
                    <LinearGradient
                      colors={['#32CD32', '#28A428']}
                      style={styles.quickActionGradient}
                    >
                      <Ionicons name="time" size={24} color="white" />
                    </LinearGradient>
                    <Text style={styles.quickActionText}>Activity</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.quickActionItem}
                    onPress={() => navigation.navigate('Knowledge')}
                  >
                    <LinearGradient
                      colors={['#9B59B6', '#8E44AD']}
                      style={styles.quickActionGradient}
                    >
                      <Ionicons name="book" size={24} color="white" />
                    </LinearGradient>
                    <Text style={styles.quickActionText}>Learn</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Edit Mode: Info Cards */}
            {editing && isOwnProfile && (
              <View style={styles.infoCards}>
                <View style={styles.infoCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="person" size={20} color="#0A5EB0" />
                    <Text style={styles.cardLabel}>Full Name</Text>
                  </View>
                  <TextInput
                    style={styles.cardInput}
                    value={formData.name}
                    placeholder="Enter your name"
                    placeholderTextColor="#999"
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="mail" size={20} color="#0A5EB0" />
                    <Text style={styles.cardLabel}>Email Address</Text>
                  </View>
                  <TextInput
                    style={[styles.cardInput, styles.disabledCardInput]}
                    value={formData.email}
                    editable={false}
                  />
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="chatbubble-ellipses" size={20} color="#0A5EB0" />
                    <Text style={styles.cardLabel}>Bio</Text>
                  </View>
                  <TextInput
                    style={[styles.cardInput, styles.textArea]}
                    value={formData.bio}
                    placeholder="Tell us about yourself"
                    placeholderTextColor="#999"
                    multiline={true}
                    numberOfLines={4}
                    onChangeText={(text) => setFormData({ ...formData, bio: text })}
                  />
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="call" size={20} color="#0A5EB0" />
                    <Text style={styles.cardLabel}>Phone Number</Text>
                  </View>
                  <TextInput
                    style={styles.cardInput}
                    value={formData.phone}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  />
                </View>
              </View>
            )}

            {/* Action Buttons */}
            {isOwnProfile && (
              <View style={styles.actionsContainer}>
                {editing ? (
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={handleCancel}
                      disabled={updating}
                    >
                      <Ionicons name="close-circle" size={20} color="#666" />
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleSave}
                      disabled={updating}
                    >
                      <LinearGradient 
                        colors={['#32CD32', '#28A428']} 
                        style={styles.saveBtnGradient}
                      >
                        {updating ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.saveBtnText}>Save Changes</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.staticActions}>
                    <TouchableOpacity
                      style={styles.editProfileBtn}
                      onPress={() => setEditing(true)}
                    >
                      <LinearGradient 
                        colors={['#FFD700', '#FFA500']} 
                        style={styles.editBtnGradient}
                      >
                        <Ionicons name="create" size={20} color="#000957" />
                        <Text style={styles.editBtnText}>Edit Profile</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.logoutBtn} 
                      onPress={handleLogout}
                    >
                      <Ionicons name="log-out" size={20} color="#ff443a" />
                      <Text style={styles.logoutBtnText}>Logout</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* FOLLOWERS MODAL */}
        <Modal
          visible={showFollowersModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFollowersModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Followers</Text>
                <TouchableOpacity onPress={() => setShowFollowersModal(false)}>
                  <Ionicons name="close" size={28} color="#000957" />
                </TouchableOpacity>
              </View>
              
              {loadingFollowers ? (
                <ActivityIndicator size="large" color="#0A5EB0" style={{ marginTop: 20 }} />
              ) : followers.length > 0 ? (
                <FlatList
                  data={followers}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => renderUserItem({ item, isFollowingList: false })}
                  contentContainerStyle={styles.userList}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyStateText}>No followers yet</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* FOLLOWING MODAL */}
        <Modal
          visible={showFollowingModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFollowingModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Following</Text>
                <TouchableOpacity onPress={() => setShowFollowingModal(false)}>
                  <Ionicons name="close" size={28} color="#000957" />
                </TouchableOpacity>
              </View>
              
              {loadingFollowing ? (
                <ActivityIndicator size="large" color="#0A5EB0" style={{ marginTop: 20 }} />
              ) : following.length > 0 ? (
                <FlatList
                  data={following}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => renderUserItem({ item, isFollowingList: true })}
                  contentContainerStyle={styles.userList}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="person-add-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyStateText}>Not following anyone yet</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* ACTIVITY MODAL */}
        <Modal
          visible={showActivityModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowActivityModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Recent Activity</Text>
                <TouchableOpacity onPress={() => setShowActivityModal(false)}>
                  <Ionicons name="close" size={28} color="#000957" />
                </TouchableOpacity>
              </View>
              
              {activities.length > 0 ? (
                <FlatList
                  data={activities}
                  keyExtractor={(item) => item.id}
                  renderItem={renderActivityItem}
                  contentContainerStyle={styles.userList}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyStateText}>No recent activity</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* FOOTER */}
        {isOwnProfile && (
          <View style={styles.footer}>
            {[
              { name: 'Dashboard', icon: 'home' as const, screen: 'Dash' as const },
              { name: 'Notifications', icon: 'notifications' as const, screen: 'Notifications' as const },
              { name: 'My Reports', icon: 'document-text' as const, screen: 'Reports' as const },
              { name: 'Rewards', icon: 'trophy' as const, screen: 'Rewards' as const },
              { name: 'Knowledge', icon: 'book' as const, screen: 'Knowledge' as const },
              { name: 'Profile', icon: 'person' as const, screen: 'Profile' as const }
            ].map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.navButton} 
                onPress={() => navigation.navigate(item.screen)}
              >
                <Ionicons 
                  name={item.icon} 
                  size={24} 
                  color={item.screen === 'Profile' ? "#FFD700" : "white"} 
                />
                <Text 
                  style={[
                    styles.navText, 
                    item.screen === 'Profile' && styles.activeNavText
                  ]}
                >
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
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  coverPhoto: {
    height: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  settingsIconButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  coverPattern: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    flexDirection: 'row',
  },
  patternCircle: {
    position: 'absolute',
    bottom: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  contentWrapper: {
    marginTop: -80,
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
  },
  imageWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  imageBorder: {
    padding: 4,
    borderRadius: 70,
    backgroundColor: 'white',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: '#FFD700',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  cameraGradient: {
    padding: 10,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: 'white',
  },
  userHeaderInfo: {
    alignItems: 'center',
    width: '100%',
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000957',
    marginBottom: 6,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 6,
    gap: 4,
  },
  roleText: {
    color: '#0A5EB0',
    fontSize: 13,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  userBio: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  memberSince: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginTop: 8,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#0A5EB0',
    opacity: 0.2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0A5EB0',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  followButton: {
    marginTop: 16,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  followButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  quickActionsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000957',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    width: '22%',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  infoCards: {
    gap: 16,
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A5EB0',
  },
  cardInput: {
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  disabledCardInput: {
    backgroundColor: '#F0F0F0',
    color: '#888',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionsContainer: {
    marginBottom: 20,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  staticActions: {
    gap: 12,
  },
  editProfileBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  editBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  editBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000957',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#ff443a',
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff443a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000957',
  },
  userList: {
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  userItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userItemAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#0A5EB0',
  },
  userItemInfo: {
    flex: 1,
  },
  userItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000957',
    marginBottom: 4,
  },
  userItemEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  userItemStats: {
    marginTop: 4,
  },
  userItemStatText: {
    fontSize: 12,
    color: '#0A5EB0',
  },
  unfollowButton: {
    backgroundColor: '#ff443a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  unfollowButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  activityIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000957',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 11,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000957',
    width: '100%',
    padding: 10,
    position: 'absolute',
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  navButton: {
    alignItems: 'center',
    position: 'relative',
  },
  navText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
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
});

export default Profile;