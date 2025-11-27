import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Image,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

// Types
interface Responder {
  type: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: [string, string];
  description: string;
}

interface RecentChat {
  responderType: string;
  reportId: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
}

interface UserData {
  user?: {
    name?: string;
    email?: string;
  };
  message?: string;
}

interface RecentChatsResponse {
  conversations?: RecentChat[];
}

interface NavigationWithReplace extends NavigationProp<ParamListBase> {
  replace: (screen: string, params?: any) => void;
}

interface ChatListProps {
  navigation: NavigationWithReplace;
}

// API Base URL
const API_BASE_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

const ChatList: React.FC<ChatListProps> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);

  // Enhanced responders with more detailed information
  const responders: Responder[] = [
    { 
      type: 'Barangay', 
      name: 'Users GC Barangay Officer', 
      icon: 'home-outline', 
      color: ['#4A90E2', '#3A7BD5'], 
      description: 'Local community support' 
    },
    { 
      type: 'NGO', 
      name: 'Users GC Ocean NGO', 
      icon: 'people-outline', 
      color: ['#50C878', '#2E8B57'], 
      description: 'Environmental advocacy' 
    },
    { 
      type: 'PCG', 
      name: 'Users GC Coast Guard', 
      icon: 'boat-outline', 
      color: ['#9370DB', '#7B68EE'], 
      description: 'Maritime safety' 
    }, 
    { 
      type: 'Admin', 
      name: 'Users GC Admin Support', 
      icon: 'person-outline', 
      color: ['#009990', '#007777'], 
      description: 'Central support' 
    }
  ];

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async (): Promise<void> => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (!storedToken) {
        navigation.replace('Login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data: UserData = await response.json();
      if (response.ok) {
        setUserName(data.user?.name || data.user?.email || 'User');
        fetchRecentChats(storedToken);
      } else {
        console.error('Error fetching user:', data.message);
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Render user greeting banner
  const UserGreetingBanner: React.FC = () => {
    const getGreetingMessage = (): string => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good Morning';
      if (hour < 18) return 'Good Afternoon';
      return 'Good Evening';
    };

    return (
      <LinearGradient 
        colors={['#007777', '#009990']} 
        style={styles.userBanner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.userBannerContent}>
          <Ionicons name="chatbubble-ellipses" size={24} color="white" />
          <View style={styles.userBannerTextContainer}>
            <Text style={styles.userBannerGreeting}>
              {getGreetingMessage()}, {userName}
            </Text>
            <Text style={styles.userBannerSubtext}>
              Your marine communication hub
            </Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const fetchRecentChats = async (token: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/recent-chats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: RecentChatsResponse = await response.json();
      if (response.ok) {
        setRecentChats(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching recent chats:', error);
    }
  };

  const onRefresh = (): void => {
    setRefreshing(true);
    fetchUserData();
  };

  const handleChat = (responder: Responder, reportId: string = 'general'): void => {
    navigation.navigate('Chat', {
      responder,
      responderName: responder.name,
      responderType: responder.type,
      reportId
    });
  };

  const getLastChatTime = (timestamp: string): string => {
    if (!timestamp) return '';
    
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Format for full date and time
    const fullDateTimeOptions: Intl.DateTimeFormatOptions = {
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    };
  
    if (diffDays === 0) {
      // Today: show time
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // For any other day, show full date and time
      return messageDate.toLocaleString(undefined, fullDateTimeOptions);
    }
  };

  // Handle back navigation
  const handleBack = (): void => {
    navigation.goBack();
  };

  const renderResponder = ({ item }: { item: Responder }) => {
    return (
      <TouchableOpacity 
        style={styles.responderItem}
        onPress={() => handleChat(item)}
      >
        <LinearGradient 
          colors={item.color} 
          style={styles.responderIconBig}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={item.icon} size={28} color="white" />
        </LinearGradient>
        <Text style={styles.responderNameSmall}>{item.name}</Text>
        <Text style={styles.responderDescription} numberOfLines={1}>
          {item.description}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderChat = ({ item }: { item: RecentChat }) => {
    // Ensure the responder is either from predefined list or a fallback
    const responder = responders.find(r => r.type === item.responderType) || 
                       { 
                         type: item.responderType, 
                         name: item.responderType, 
                         icon: 'chatbubble-outline' as keyof typeof Ionicons.glyphMap, 
                         color: ['#888888', '#666666'] as [string, string],
                         description: 'Chat'
                       };
    
    // Only render if there's a last message
    if (!item.lastMessage) return null;
    
    return (
      <TouchableOpacity 
        style={styles.chatItem}
        onPress={() => handleChat(responder, item.reportId)}
      >
        <LinearGradient 
          colors={responder.color} 
          style={styles.responderIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={responder.icon} size={22} color="white" />
        </LinearGradient>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.responderName}>{responder.name}</Text>
            <Text style={styles.chatTime}>{getLastChatTime(item.lastTimestamp)}</Text>
          </View>
          <View style={styles.chatContent}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Dummy renderItem for the main FlatList since we're only using ListHeaderComponent
  const renderEmptyItem = () => null;

  return (
    <View style={styles.container}>
      <StatusBar 
        backgroundColor="#000957" 
        barStyle="light-content" 
      />
      {/* Header with gradient */}
      <LinearGradient 
        colors={['#000957', '#001674']} 
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
      </LinearGradient>

      {/* Add User Greeting Banner */}
      {userName && <UserGreetingBanner />}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#009990" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={renderEmptyItem}
          ListHeaderComponent={
            <>
              <Text style={styles.sectionTitle}>Chat with Responders</Text>
              <FlatList
                horizontal
                data={responders}
                renderItem={renderResponder}
                keyExtractor={(item) => item.type}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.respondersContainer}
              />
              
              {recentChats.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>Recent Conversations</Text>
                  <FlatList
                    data={recentChats}
                    renderItem={renderChat}
                    keyExtractor={(item, index) => `${item.reportId}-${item.responderType}-${index}`}
                    scrollEnabled={false}
                  />
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Image 
source={require('../../../assets/chat-icon.png')}
                    style={styles.emptyIcon}
                  />
                  <Text style={styles.emptyText}>No recent conversations</Text>
                  <Text style={styles.emptySubText}>
                    Select a responder above to start a new conversation
                  </Text>
                </View>
              )}
            </>
          }
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#009990', '#007777']} 
              tintColor="#009990" 
            />
          }
          keyExtractor={() => 'main-list'}
        />
      )}
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
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  backButton: {
    marginRight: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#009990',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
    color: '#333',
  },
  respondersContainer: {
    paddingHorizontal: 10,
    paddingBottom: 15,
  },
  responderItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 100,
    borderRadius: 15,
    backgroundColor: 'white',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  responderIconBig: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  responderNameSmall: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
    fontWeight: '600',
  },
  responderDescription: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    backgroundColor: 'white',
    marginHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  responderIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  responderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  chatTime: {
    fontSize: 12,
    color: '#888',
  },
  chatContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#009990',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    tintColor: '#009990',
    opacity: 0.5,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    color: '#555',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  // New styles for user banner
  userBanner: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  userBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userBannerTextContainer: {
    marginLeft: 15,
  },
  userBannerGreeting: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userBannerSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 3,
  },
});

export default ChatList;