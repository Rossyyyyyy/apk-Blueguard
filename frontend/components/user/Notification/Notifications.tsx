import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState, useCallback } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Notification {
  _id: string;
  userName: string;
  userEmail: string;
  title?: string;
  message: string;
  type: string;
  reportId?: string;
  read: boolean;
  seen?: boolean;
  priority?: string;
  createdAt: string;
  readAt?: string;
}

interface GroupedNotifications {
  [key: string]: Notification[];
}

type RootStackParamList = {
  Login: undefined;
  Dash: undefined;
  Notifications: undefined;
  Reports: undefined;
  Rewards: undefined;
  Knowledge: undefined;
  Profile: undefined;
};

interface NotificationsProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Notifications'>;
}

// ============================================
// MAIN COMPONENT
// ============================================

const Notifications: React.FC<NotificationsProps> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedNotifications, setGroupedNotifications] = useState<GroupedNotifications>({});
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    fetchUserData();
  }, []);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchNotifications();
      }
    }, [user])
  );

  // ============================================
  // FETCH USER DATA
  // ============================================

  const fetchUserData = async (): Promise<void> => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('⚠️ No token found, redirecting to login');
        navigation.replace('Login');
        return;
      }

      console.log('👤 Fetching user data...');

      const response = await fetch('http://10.120.221.103:5000/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ User data fetched:', data.user.name);
        setUser(data.user);
        await fetchNotifications(data.user.name);
      } else {
        console.error('❌ Failed to fetch user:', data.message);
        setError(data.message || 'Failed to fetch user data');
        
        if (response.status === 401) {
          Alert.alert('Session Expired', 'Please login again.');
          navigation.replace('Login');
        }
      }
    } catch (error: any) {
      console.error('❌ Error fetching user:', error);
      setError('Network error. Please check your connection.');
    }
  };

  // ============================================
  // FETCH NOTIFICATIONS
  // ============================================

  const fetchNotifications = async (userName?: string): Promise<void> => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('⚠️ No token found');
        navigation.replace('Login');
        return;
      }

      console.log('📬 Fetching notifications...');

      const response = await fetch('http://10.120.221.103:5000/notifications', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log(`✅ Received ${data.notifications.length} notifications`);
        console.log(`📊 Unread count: ${data.unreadCount}`);
        
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        groupNotificationsByDate(data.notifications || []);
      } else {
        console.error('❌ Error fetching notifications:', data.message);
        
        if (response.status === 401) {
          Alert.alert('Session Expired', 'Please login again.');
          navigation.replace('Login');
        } else {
          setError(data.message || 'Failed to fetch notifications');
        }
      }
    } catch (error: any) {
      console.error('❌ Network error fetching notifications:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ============================================
  // GROUP NOTIFICATIONS BY DATE
  // ============================================

  const groupNotificationsByDate = (notificationList: Notification[]): void => {
    const grouped = notificationList.reduce<GroupedNotifications>((groups, notification) => {
      const date = new Date(notification.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey: string;
      
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else if (today.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
        groupKey = 'This Week';
      } else if (today.getTime() - date.getTime() < 30 * 24 * 60 * 60 * 1000) {
        groupKey = 'This Month';
      } else {
        groupKey = 'Earlier';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
      return groups;
    }, {});
    
    setGroupedNotifications(grouped);
  };

  // ============================================
  // REFRESH HANDLER
  // ============================================

  const onRefresh = useCallback(() => {
    console.log('🔄 Refreshing notifications...');
    setRefreshing(true);
    
    if (user) {
      fetchNotifications(user.name);
    } else {
      fetchUserData();
    }
  }, [user]);

  // ============================================
  // OPEN NOTIFICATION MODAL
  // ============================================

  const openModal = (notification: Notification): void => {
    console.log('📖 Opening notification:', notification._id);
    
    // Mark as read when opened
    if (!notification.read) {
      markAsRead(notification._id);
    }
    
    setSelectedNotification(notification);
    setModalVisible(true);
  };

  // ============================================
  // MARK SINGLE NOTIFICATION AS READ
  // ============================================

  const markAsRead = async (notificationId: string): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      console.log(`📖 Marking notification ${notificationId} as read`);

      const response = await fetch(
        `http://10.120.221.103:5000/api/notifications/${notificationId}/read`, 
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        console.log('✅ Notification marked as read');
        
        // Update local state immediately for better UX
        setNotifications(prevNotifications => {
          const updated = prevNotifications.map(n => 
            n._id === notificationId ? { ...n, read: true } : n
          );
          
          // Update grouped notifications
          groupNotificationsByDate(updated);
          
          // Update unread count
          const newUnreadCount = updated.filter(n => !n.read).length;
          setUnreadCount(newUnreadCount);
          
          return updated;
        });
      } else {
        console.error('❌ Failed to mark notification as read');
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  // ============================================
  // MARK ALL NOTIFICATIONS AS READ
  // ============================================

  const markAllAsRead = async (): Promise<void> => {
    const unreadNotifications = notifications.filter(n => !n.read);
    
    if (unreadNotifications.length === 0) {
      Alert.alert('Info', 'No unread notifications to mark.');
      return;
    }

    Alert.alert(
      'Mark All as Read',
      `Are you sure you want to mark all ${unreadNotifications.length} notifications as read?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          style: 'default',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) return;

              console.log('📖 Marking all notifications as read...');

              const response = await fetch(
                'http://10.120.221.103:5000/api/notifications/read-all', 
                {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );

              const data = await response.json();

              if (response.ok && data.success) {
                console.log(`✅ Marked ${data.count} notifications as read`);
                
                // Update all notifications to read
                const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
                setNotifications(updatedNotifications);
                setUnreadCount(0);
                groupNotificationsByDate(updatedNotifications);
                
                Alert.alert('Success', `${data.count} notifications marked as read.`);
              } else {
                Alert.alert('Error', data.message || 'Failed to mark notifications as read.');
              }
            } catch (error) {
              console.error('❌ Error marking all notifications as read:', error);
              Alert.alert('Error', 'Network error. Please try again.');
            }
          }
        }
      ]
    );
  };

  // ============================================
  // DELETE NOTIFICATION
  // ============================================

  const deleteNotification = async (notificationId: string): Promise<void> => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) {
                navigation.replace('Login');
                return;
              }

              console.log(`🗑️ Deleting notification ${notificationId}`);

              const response = await fetch(
                `http://10.120.221.103:5000/api/notifications/${notificationId}`, 
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );

              const data = await response.json();

              if (response.ok && data.success) {
                console.log('✅ Notification deleted');
                
                // Update notifications list
                const updatedNotifications = notifications.filter(n => n._id !== notificationId);
                setNotifications(updatedNotifications);
                
                // Update grouped notifications
                groupNotificationsByDate(updatedNotifications);
                
                // Update unread count
                const newUnreadCount = updatedNotifications.filter(n => !n.read).length;
                setUnreadCount(newUnreadCount);
                
                setModalVisible(false);
                Alert.alert('Success', 'Notification deleted successfully.');
              } else {
                Alert.alert('Error', data.message || 'Failed to delete notification');
                console.error('❌ Failed to delete notification:', data.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Network error. Please try again.');
              console.error('❌ Error deleting notification:', error);
            }
          }
        }
      ]
    );
  };

  // ============================================
  // CLEAR ALL READ NOTIFICATIONS
  // ============================================

  const clearAllReadNotifications = async (): Promise<void> => {
    const readNotifications = notifications.filter(n => n.read);
    
    if (readNotifications.length === 0) {
      Alert.alert('Info', 'No read notifications to clear.');
      return;
    }

    Alert.alert(
      'Clear Read Notifications',
      `Are you sure you want to delete all ${readNotifications.length} read notifications?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) return;

              console.log('🧹 Clearing all read notifications...');

              const response = await fetch(
                'http://10.120.221.103:5000/api/notifications/clear-read', 
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );

              const data = await response.json();

              if (response.ok && data.success) {
                console.log(`✅ Cleared ${data.count} read notifications`);
                
                // Keep only unread notifications
                const updatedNotifications = notifications.filter(n => !n.read);
                setNotifications(updatedNotifications);
                groupNotificationsByDate(updatedNotifications);
                
                Alert.alert('Success', `${data.count} read notifications cleared.`);
              } else {
                Alert.alert('Error', 'Failed to clear notifications.');
              }
            } catch (error) {
              console.error('❌ Error clearing notifications:', error);
              Alert.alert('Error', 'Network error. Please try again.');
            }
          }
        }
      ]
    );
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const getNotificationIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      'report': 'document-text',
      'schedule': 'calendar',
      'reward': 'trophy',
      'follow': 'person-add',
      'cleanup': 'trash',
      'donation': 'gift',
      'alert': 'alert-circle',
      'info': 'information-circle',
      'success': 'checkmark-circle',
      'warning': 'warning'
    };
    
    return iconMap[type.toLowerCase()] || 'notifications';
  };

  const getNotificationColor = (type: string, read: boolean): string => {
    if (read) return '#6C757D';
    
    const colorMap: { [key: string]: string } = {
      'report': '#007BFF',
      'schedule': '#28A745',
      'reward': '#FFD700',
      'follow': '#17A2B8',
      'cleanup': '#20C997',
      'donation': '#FFC107',
      'alert': '#DC3545',
      'warning': '#FD7E14',
      'success': '#28A745',
      'info': '#17A2B8'
    };
    
    return colorMap[type.toLowerCase()] || '#000957';
  };

  const formatNotificationTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getPriorityBadge = (priority?: string): React.ReactElement | null => {
    if (!priority || priority === 'medium') return null;
    
    const priorityConfig = {
      urgent: { color: '#DC3545', text: 'URGENT' },
      high: { color: '#FD7E14', text: 'HIGH' },
      low: { color: '#6C757D', text: 'LOW' }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    if (!config) return null;
    
    return (
      <View style={[styles.priorityBadge, { backgroundColor: config.color }]}>
        <Text style={styles.priorityText}>{config.text}</Text>
      </View>
    );
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderHeader = (): React.ReactElement => (
    <>
      <View style={styles.header}>
        <Ionicons name="notifications" size={30} color="white" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>Welcome, {user ? user.name : 'Guest'}!</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount} unread</Text>
          </View>
        )}
      </View>
      
      {notifications.length > 0 && (
        <View style={styles.actionBar}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.actionButton} onPress={markAllAsRead}>
              <Ionicons name="checkmark-done" size={18} color="white" />
              <Text style={styles.actionButtonText}>Mark All Read</Text>
            </TouchableOpacity>
          )}
          
          {notifications.filter(n => n.read).length > 0 && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.clearButton]} 
              onPress={clearAllReadNotifications}
            >
              <Ionicons name="trash-outline" size={18} color="white" />
              <Text style={styles.actionButtonText}>Clear Read</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );

  const renderNotification = (notification: Notification, index: number): React.ReactElement => {
    const iconColor = getNotificationColor(notification.type, notification.read);
    
    return (
      <TouchableOpacity key={notification._id} onPress={() => openModal(notification)}>
        <Animatable.View 
          style={[
            styles.notificationContainer, 
            !notification.read && styles.unreadNotification
          ]} 
          animation="fadeInUp" 
          delay={index * 50}
        >
          <View style={[
            styles.iconContainer, 
            !notification.read && styles.unreadIconContainer,
            { backgroundColor: `${iconColor}20` }
          ]}>
            <Ionicons 
              name={getNotificationIcon(notification.type)} 
              size={24} 
              color={iconColor} 
            />
          </View>
          
          <View style={styles.notificationTextContainer}>
            <View style={styles.notificationHeader}>
              <Text style={[styles.notificationType, !notification.read && styles.unreadText]}>
                {notification.title || notification.type}
              </Text>
              {!notification.read && <View style={styles.unreadDot} />}
              {getPriorityBadge(notification.priority)}
            </View>
            
            <Text style={[styles.notificationText, !notification.read && styles.boldText]} numberOfLines={2}>
              {notification.message}
            </Text>
            
            <Text style={styles.notificationTime}>
              {formatNotificationTime(notification.createdAt)}
            </Text>
          </View>
          
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </Animatable.View>
      </TouchableOpacity>
    );
  };

  const renderErrorState = (): React.ReactElement => (
    <View style={styles.centerContainer}>
      <Ionicons name="alert-circle" size={60} color="#FFD700" />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
        <Ionicons name="refresh" size={20} color="#000957" />
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = (): React.ReactElement => (
    <View style={styles.centerContainer}>
      <Ionicons name="notifications-off-outline" size={80} color="rgba(255,255,255,0.5)" />
      <Text style={styles.noNotificationsText}>No notifications yet</Text>
      <Text style={styles.noNotificationsSubtext}>
        You'll be notified when there's activity on your account
      </Text>
    </View>
  );

  const renderLoadingState = (): React.ReactElement => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#FFD700" />
      <Text style={styles.loadingText}>Loading notifications...</Text>
    </View>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      {error ? renderErrorState() : (
        <ScrollView 
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={["#FFD700"]}
              tintColor="#FFD700"
            />
          }
        >
          {loading ? renderLoadingState() : (
            notifications.length === 0 ? renderEmptyState() : (
              Object.keys(groupedNotifications)
                .sort((a, b) => {
                  const order = ['Today', 'Yesterday', 'This Week', 'This Month', 'Earlier'];
                  return order.indexOf(a) - order.indexOf(b);
                })
                .map((dateGroup) => (
                  groupedNotifications[dateGroup].length > 0 && (
                    <View key={dateGroup}>
                      <View style={styles.dateGroupHeaderContainer}>
                        <Text style={styles.dateGroupHeader}>{dateGroup}</Text>
                        <Text style={styles.dateGroupCount}>
                          {groupedNotifications[dateGroup].length}
                        </Text>
                      </View>
                      {groupedNotifications[dateGroup].map((notification, index) => 
                        renderNotification(notification, index)
                      )}
                    </View>
                  )
                ))
            )
          )}
        </ScrollView>
      )}

      {/* NOTIFICATION DETAIL MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animatable.View style={styles.modalContent} animation="zoomIn" duration={300}>
            <TouchableOpacity 
              style={styles.modalCloseIcon}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close-circle" size={30} color="#999" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Notification Details</Text>
            
            {selectedNotification && (
              <>
                <View style={[
                  styles.modalIconContainer,
                  { backgroundColor: `${getNotificationColor(selectedNotification.type, false)}20` }
                ]}>
                  <Ionicons 
                    name={getNotificationIcon(selectedNotification.type)} 
                    size={40} 
                    color={getNotificationColor(selectedNotification.type, false)} 
                  />
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>Type:</Text>
                  <View style={styles.modalTypeContainer}>
                    <Text style={styles.modalTypeText}>{selectedNotification.title || selectedNotification.type}</Text>
                    {getPriorityBadge(selectedNotification.priority)}
                  </View>
                </View>

                <View style={styles.modalMessageContainer}>
                  <Text style={styles.modalMessage}>{selectedNotification.message}</Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>Received:</Text>
                  <Text style={styles.modalValue}>
                    {new Date(selectedNotification.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>

                {selectedNotification.read && selectedNotification.readAt && (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>Read:</Text>
                    <Text style={styles.modalValue}>
                      {new Date(selectedNotification.readAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                )}

                <View style={styles.modalButtonsContainer}>
                  <TouchableOpacity 
                    onPress={() => deleteNotification(selectedNotification._id)} 
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash" size={20} color="white" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => setModalVisible(false)} 
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animatable.View>
        </View>
      </Modal>

      {/* FOOTER NAVIGATION */}
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
            style={[styles.navButton, item.screen === 'Notifications' && styles.activeNavButton]} 
            onPress={() => navigation.navigate(item.screen)}
          >
            <Ionicons 
              name={item.icon} 
              size={24} 
              color={item.screen === 'Notifications' ? "#FFD700" : "white"} 
            />
            <Text style={[styles.navText, item.screen === 'Notifications' && styles.activeNavText]}>
              {item.name}
            </Text>
            {item.screen === 'Notifications' && unreadCount > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0A5EB0' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#000957',
    justifyContent: 'center',
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: 'white',
  },
  welcomeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  welcomeText: { 
    fontSize: 18, 
    fontWeight: '500', 
    color: 'white',
  },
  unreadBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  unreadBadgeText: {
    color: '#000957',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    gap: 6,
  },
  clearButton: {
    backgroundColor: 'rgba(220,53,69,0.3)',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  contentContainer: { 
    padding: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
    paddingHorizontal: 40,
  },
  dateGroupHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  dateGroupHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  dateGroupCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  notificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#6C757D',
  },
  unreadNotification: {
    borderLeftColor: '#FFD700',
    backgroundColor: '#FFFDF5',
    shadowOpacity: 0.15,
    elevation: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  unreadIconContainer: {
    shadowColor: '#FFD700',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  notificationTextContainer: { 
    flex: 1,
    gap: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  notificationType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  unreadText: {
    color: '#000957',
  },
  boldText: {
    fontWeight: '600',
    color: '#333',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5733',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  notificationText: { 
    fontSize: 15, 
    color: '#555',
    lineHeight: 20,
  },
  notificationTime: { 
    fontSize: 12, 
    color: '#999',
    marginTop: 2,
  },
  noNotificationsText: { 
    fontSize: 18, 
    fontWeight: '600',
    color: 'white', 
    textAlign: 'center', 
    marginTop: 16,
  },
  noNotificationsSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: 'white',
    marginTop: 12,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8,
  },
  retryButtonText: {
    color: '#000957',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',  
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalCloseIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000957',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modalValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modalTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTypeText: {
    fontSize: 14,
    color: '#000957',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  modalMessageContainer: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  modalMessage: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'center',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  deleteButton: {
    backgroundColor: '#DC3545',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#6C757D',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000957',
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
});

export default Notifications;