// components/responders/Barangay/BarangayMessages.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  Animated,
  KeyboardAvoidingView,
  ActivityIndicator,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Conditional import for vector icons
let Ionicons: any;
try {
  const VectorIcons = require('@expo/vector-icons');
  Ionicons = VectorIcons.Ionicons;
} catch (e) {
  console.warn('Expo vector icons not available, using fallback');
}

// Define navigation types
type RootStackParamList = {
  Login: undefined;
  ResLogin: undefined;
  Barangay: undefined;
  BarangayReports: undefined;
  BarangayOngoing: undefined;
  BarangayCompleted: undefined;
  BarangaySettings: undefined;
  BarangayMessages: undefined;
  BarangayCancelled: undefined;
  ReportTrashIncident: undefined;
};

interface MessagesProps {
  navigation: any;
}

interface Reply {
  _id: string;
  text: string;
  timestamp: string;
  sender: string;
}

interface Message {
  _id: string;
  sender: string;
  text: string;
  timestamp: string;
  replies?: Reply[];
  hasReplies?: boolean;
}

interface GroupChat {
  groupName: string;
  messages: Message[];
}

const API_URL = 'http://10.120.221.103:5000';

// Icon Component Fallback
const IconFallback = ({ name, size = 24, color = '#000', style = {} }: any) => {
  const iconMap: any = {
    'menu': '☰',
    'water': '💧',
    'close': '✕',
    'person': '👤',
    'home': '🏠',
    'document-text': '📄',
    'time': '⏰',
    'checkmark-circle': '✓',
    'settings': '⚙️',
    'mail': '✉️',
    'log-out': '⎋',
    'people': '👥',
    'arrow-undo': '↩',
    'alert-circle': '⚠',
    'send': '➤',
  };
  
  return (
    <Text style={[{ fontSize: size * 0.8, color }, style]}>
      {iconMap[name] || '•'}
    </Text>
  );
};

const Icon = Ionicons || IconFallback;

// Enhanced Sidebar Component with Animations
const BarangaySidebar = ({ isOpen, setIsOpen, userEmail, onLogout, navigation }: any) => {
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeRoute, setActiveRoute] = useState('BarangayMessages');

  const navItems = [
    { label: 'Dashboard', icon: 'home', route: 'Barangay', color: '#4a6741' },
    { label: 'Reports', icon: 'document-text', route: 'BarangayReports', color: '#4a6741' },
    { label: 'Ongoing Reports', icon: 'time', route: 'BarangayOngoing', color: '#4a6741' },
    { label: 'Completed', icon: 'checkmark-circle', route: 'BarangayCompleted', color: '#4a6741' },
    { label: 'Settings', icon: 'settings', route: 'BarangaySettings', color: '#4a6741' },
    { label: 'Messages', icon: 'mail', route: null, color: '#4a6741' },
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
        onStartShouldSetResponder={() => true}
      >
        {/* Gradient Header */}
        <View style={styles.sidebarHeader}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Icon name="water" size={32} color="#fff" />
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
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* User Info Card */}
        {userEmail && (
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Icon name="person" size={24} color="#4a6741" />
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
                (!item.route || activeRoute === item.route) && styles.menuItemActive
              ]}
              onPress={() => {
                if (item.route) {
                  handleNavigation(item.route);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <View style={[
                  styles.iconContainer,
                  (!item.route || activeRoute === item.route) && styles.iconContainerActive
                ]}>
                  <Icon 
                    name={item.icon} 
                    size={20} 
                    color={(!item.route || activeRoute === item.route) ? '#4a6741' : '#64748b'} 
                  />
                </View>
                <Text style={[
                  styles.menuText,
                  (!item.route || activeRoute === item.route) && styles.menuTextActive
                ]}>
                  {item.label}
                </Text>
              </View>
              {(!item.route || activeRoute === item.route) && (
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
            <Icon name="log-out" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

// Main Barangay Messages Component
const BarangayMessages: React.FC<MessagesProps> = ({ navigation }) => {
  const [groupChat, setGroupChat] = useState<GroupChat>({
    groupName: "USERS GROUPCHAT",
    messages: []
  });
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  
  const messagesEndRef = useRef<ScrollView>(null);
  const messageInputRef = useRef<TextInput>(null);

  const isWeb = Platform.OS === 'web';

  // Update dimensions on resize
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Platform-specific alert function
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      if (title === 'Logout') {
        setShowLogoutConfirm(true);
      } else {
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      Alert.alert(title, message);
    }
  };

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const responderType = await AsyncStorage.getItem('responderType');
        const email = await AsyncStorage.getItem('userEmail');

        console.log('Auth check:', { token: !!token, responderType, email });

        if (!token || responderType !== 'barangay') {
          showAlert('Access Denied', 'You must be a barangay responder to access this page.');
          navigation.replace('ResLogin');
          return;
        }

        if (email) setUserEmail(email);
      } catch (error) {
        console.error('Error checking authentication:', error);
      }
    };

    checkAuth();
  }, []);

  const fetchBarangayGroupChat = async () => {
    try {
      console.log('Fetching barangay group chat...');
      const response = await axios.get(`${API_URL}/api/barangay-groupchat`);
      console.log('Group chat fetched:', response.data);
      setGroupChat(response.data);
      setLoading(false);
      scrollToBottom();
    } catch (err: any) {
      console.error('Error fetching group chat:', err);
      setError(err.message || 'Failed to fetch group chat');
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    try {
      if (replyingTo) {
        // Send a reply
        const response = await axios.post(`${API_URL}/api/reply-to-message`, {
          messageId: replyingTo._id,
          replyText: newMessage
        });
        
        // Update local state
        setGroupChat(prev => {
          const updatedMessages = prev.messages.map(msg => {
            if (msg._id === replyingTo._id) {
              return {
                ...msg,
                replies: [...(msg.replies || []), response.data.reply],
                hasReplies: true
              };
            }
            return msg;
          });
          
          return {
            ...prev,
            messages: updatedMessages
          };
        });
        
        setReplyingTo(null);
      } else {
        // Send a new message
        const response = await axios.post(`${API_URL}/api/send-barangay-message`, {
          messageText: newMessage
        });
        
        setGroupChat(prev => ({
          ...prev,
          messages: [...prev.messages, response.data.newMessage]
        }));
      }
      
      setNewMessage('');
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      showAlert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    fetchBarangayGroupChat();
    
    const intervalId = setInterval(fetchBarangayGroupChat, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [groupChat.messages]);

  useEffect(() => {
    if (replyingTo && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [replyingTo]);

  const getMessageTime = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageDate = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const startReply = (message: Message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };
  
  // Group messages by date
  const groupMessagesByDate = () => {
    const grouped: { [key: string]: Message[] } = {};
    
    groupChat.messages.forEach(message => {
      const date = getMessageDate(message.timestamp);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });
    
    return grouped;
  };
  
  const groupedMessages = groupMessagesByDate();

  const handleLogout = async () => {
    showAlert('Logout', 'Are you sure you want to logout?');
  };

  const confirmLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('responderType');
    await AsyncStorage.removeItem('userEmail');
    setShowLogoutConfirm(false);
    navigation.replace('ResLogin');
  };

  const renderMessage = (message: Message) => (
    <View key={message._id}>
      <View 
        style={[
          styles.messageBubble,
          message.sender === 'Barangay' ? styles.barangayMessage : styles.userMessage
        ]}
      >
        <Text style={styles.messageSender}>{message.sender}</Text>
        <Text style={[
          styles.messageText,
          message.sender === 'Barangay' && styles.barangayMessageText
        ]}>{message.text}</Text>
        <View style={styles.messageFooter}>
          <Text style={[
            styles.messageTime,
            message.sender === 'Barangay' && styles.barangayMessageTime
          ]}>
            {getMessageTime(message.timestamp)}
          </Text>
          <TouchableOpacity 
            style={styles.replyButton}
            onPress={() => startReply(message)}
          >
            <Icon 
              name="arrow-undo" 
              size={16} 
              color={message.sender === 'Barangay' ? 'white' : '#666'} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Render replies if they exist */}
      {message.replies && message.replies.map(reply => (
        <View 
          key={reply._id} 
          style={styles.replyMessage}
        >
          <View style={styles.replyHeader}>
            <Text style={styles.replyTo}>Replying to {message.sender}</Text>
          </View>
          <Text style={styles.messageText}>{reply.text}</Text>
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>
              {getMessageTime(reply.timestamp)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with Hamburger */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.hamburger}
          onPress={() => setIsSidebarOpen(true)}
          activeOpacity={0.7}
        >
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Icon name="people" size={28} color="white" />
          <Text style={styles.headerTitle}>GROUP CHAT</Text>
        </View>
        
        <View style={styles.headerRight}>
          <Text style={styles.memberCount}>
            {groupChat.messages.reduce((unique: string[], msg) => 
              unique.includes(msg.sender) ? unique : [...unique, msg.sender], []).length} members
          </Text>
        </View>
      </View>

      {/* Enhanced Sidebar */}
      <BarangaySidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        userEmail={userEmail}
        onLogout={handleLogout}
        navigation={navigation}
      />

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a6741" />
          <Text style={styles.loadingText}>Loading group chat...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={60} color="#f44336" />
          <Text style={styles.errorTitle}>Error Loading Group Chat</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setError(null);
              fetchBarangayGroupChat();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView 
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Messages */}
          <ScrollView 
            ref={messagesEndRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(groupedMessages).map(([date, messages]) => (
              <View key={date}>
                <View style={styles.dateDivider}>
                  <View style={styles.dateDividerLine} />
                  <Text style={styles.dateDividerText}>{date}</Text>
                  <View style={styles.dateDividerLine} />
                </View>
                {messages.map(message => renderMessage(message))}
              </View>
            ))}
          </ScrollView>

          {/* Message Input */}
          <View style={styles.messageInputContainer}>
            {replyingTo && (
              <View style={styles.replyPreview}>
                <View style={styles.replyInfo}>
                  <Text style={styles.replyIndicator}>Replying to </Text>
                  <Text style={styles.replyName}>{replyingTo.sender}</Text>
                  <Text style={styles.replyText} numberOfLines={1}>
                    : {replyingTo.text.substring(0, 30)}{replyingTo.text.length > 30 ? '...' : ''}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.cancelReply} 
                  onPress={cancelReply}
                >
                  <Icon name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputWrapper}>
              <TextInput
                ref={messageInputRef}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
                placeholderTextColor="#999"
                style={styles.textInput}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[
                  styles.sendButton,
                  (!newMessage.trim() || sending) && styles.sendButtonDisabled
                ]}
                onPress={sendMessage}
                disabled={!newMessage.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Icon name="send" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutConfirm} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconContainer}>
              <Icon name="log-out" size={50} color="#dc3545" />
            </View>
            <Text style={styles.confirmTitle}>Confirm Logout</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to logout from your barangay account?
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

export default BarangayMessages;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4a6741',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  hamburger: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    justifyContent: 'center',
    marginRight: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
  },
  headerRight: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  memberCount: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  messagesContent: {
    padding: 16,
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dateDividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  barangayMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4a6741',
    borderBottomRightRadius: 4,
  },
  userMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderBottomLeftRadius: 4,
  },
  replyMessage: {
    marginLeft: 40,
    marginTop: -5,
    maxWidth: '65%',
    backgroundColor: '#f5f5f5',
    borderLeftWidth: 3,
    borderLeftColor: '#4a6741',
    padding: 12,
    marginBottom: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  messageSender: {
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 4,
    color: '#333',
  },
  messageText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
    marginVertical: 4,
  },
  barangayMessageText: {
    color: 'white',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#666',
    opacity: 0.8,
  },
  barangayMessageTime: {
    color: 'white',
  },
  replyButton: {
    padding: 4,
    borderRadius: 12,
  },
  replyHeader: {
    marginBottom: 4,
  },
  replyTo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  messageInputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 12,
  },
  replyPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f5ed',
    padding: 10,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4a6741',
  },
  replyInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyIndicator: {
    fontSize: 13,
    color: '#666',
  },
  replyName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a6741',
  },
  replyText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  cancelReply: {
    padding: 4,
    borderRadius: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f0f2f5',
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4a6741',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#b0b0b0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4a6741',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
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
    backgroundColor: '#4a6741',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
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
    borderLeftColor: '#4a6741',
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
    backgroundColor: '#e7f3ed',
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
    color: '#4a6741',
    fontWeight: '600',
  },
  activeIndicator: {
    width: 4,
    height: 24,
    backgroundColor: '#4a6741',
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
    backgroundColor: '#dc3545',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});