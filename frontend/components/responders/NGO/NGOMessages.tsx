// components/responders/NGO/NGOMessages.tsx
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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Define navigation types
type RootStackParamList = {
  Login: undefined;
  ResLogin: undefined;
  NGO: undefined;
  NGOReports: undefined;
  NGOOngoing: undefined;
  NGOCompleted: undefined;
  NGOSettings: undefined;
  NGOMessages: undefined;
};

type MessagesNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NGOMessages'>;

interface MessagesProps {
  navigation: MessagesNavigationProp;
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

const NGOMessages: React.FC<MessagesProps> = ({ navigation }) => {
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
  const [userName, setUserName] = useState('');
  const [sidebarAnimation] = useState(new Animated.Value(-280));
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  
  const messagesEndRef = useRef<ScrollView>(null);
  const messageInputRef = useRef<TextInput>(null);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = dimensions.width >= 768;

  // Update dimensions on resize
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Animate sidebar
  useEffect(() => {
    Animated.timing(sidebarAnimation, {
      toValue: isSidebarOpen ? 0 : -280,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isSidebarOpen]);

  // Platform-specific alert function
  const showAlert = (title: string, message: string, buttons?: any[]) => {
    if (Platform.OS === 'web') {
      if (title === 'Logout') {
        setShowLogoutConfirm(true);
      } else {
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const responderType = await AsyncStorage.getItem('responderType');
        const email = await AsyncStorage.getItem('userEmail');
        const name = await AsyncStorage.getItem('userName');

        if (!token || responderType !== 'ngo') {
          showAlert('Access Denied', 'You must be an NGO responder to access this page.');
          navigation.navigate('ResLogin');
        }

        if (email) setUserEmail(email);
        if (name) setUserName(name);
      } catch (error) {
        console.error('Error checking authentication:', error);
      }
    };

    checkAuth();
  }, [navigation]);

  const fetchNGOGroupChat = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ngo-groupchat`);
      setGroupChat(response.data);
      setLoading(false);
      scrollToBottom();
    } catch (err: any) {
      console.error('Error fetching NGO group chat:', err);
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
        const response = await axios.post(`${API_URL}/api/send-ngo-message`, {
          messageText: newMessage,
          senderName: userName || 'NGO'
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
    fetchNGOGroupChat();
    
    const intervalId = setInterval(fetchNGOGroupChat, 30000);
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
    await AsyncStorage.removeItem('userName');
    await AsyncStorage.removeItem('responderId');
    setShowLogoutConfirm(false);
    navigation.navigate('ResLogin');
  };

  const menuItems = [
    { icon: 'tachometer', label: 'Dashboard', route: 'NGO', color: '#0A5EB0' },
    { icon: 'file-text', label: 'Reports', route: 'NGOReports', color: '#0A5EB0' },
    { icon: 'spinner', label: 'Ongoing Reports', route: 'NGOOngoing', color: '#0A5EB0' },
    { icon: 'check-circle', label: 'Completed', route: 'NGOCompleted', color: '#0A5EB0' },
    { icon: 'cog', label: 'Settings', route: 'NGOSettings', color: '#0A5EB0' },
    { icon: 'mail', label: 'Messages', route: null, color: '#0A5EB0' },
  ];

  const renderMessage = (message: Message) => (
    <View key={message._id}>
      <View 
        style={[
          styles.messageBubble,
          message.sender === 'NGO' || message.sender === userName ? styles.ngoMessage : styles.userMessage
        ]}
      >
        <Text style={styles.messageSender}>{message.sender}</Text>
        <Text style={[
          styles.messageText,
          (message.sender === 'NGO' || message.sender === userName) && styles.ngoMessageText
        ]}>{message.text}</Text>
        <View style={styles.messageFooter}>
          <Text style={[
            styles.messageTime,
            (message.sender === 'NGO' || message.sender === userName) && styles.ngoMessageTime
          ]}>
            {getMessageTime(message.timestamp)}
          </Text>
          <TouchableOpacity 
            style={styles.replyButton}
            onPress={() => startReply(message)}
          >
            <Ionicons 
              name="arrow-undo" 
              size={16} 
              color={(message.sender === 'NGO' || message.sender === userName) ? 'white' : '#666'} 
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setIsSidebarOpen(true)}
        >
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="chatbubbles" size={28} color="white" />
          <Text style={styles.headerTitle}>NGO GROUP CHAT</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.memberCount}>
            {groupChat.messages.reduce((unique: string[], msg) => 
              unique.includes(msg.sender) ? unique : [...unique, msg.sender], []).length} members
          </Text>
        </View>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00a99d" />
          <Text style={styles.loadingText}>Loading group chat...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#f44336" />
          <Text style={styles.errorTitle}>Error Loading Group Chat</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setError(null);
              fetchNGOGroupChat();
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
                  <Ionicons name="close" size={20} color="#666" />
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
                  <Ionicons name="send" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Sidebar Modal */}
      <Modal visible={isSidebarOpen} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.sidebarOverlay}
          activeOpacity={1}
          onPress={() => setIsSidebarOpen(false)}
        >
          <Animated.View
            style={[
              styles.modernSidebar,
              { transform: [{ translateX: sidebarAnimation }] },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Sidebar Header */}
            <View style={styles.sidebarHeader}>
              <View style={styles.profileSection}>
                <View style={styles.profileAvatar}>
                  <MaterialCommunityIcons name="hand-heart" size={40} color="white" />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{userName || 'NGO'}</Text>
                  <Text style={styles.profileEmail}>{userEmail}</Text>
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <ScrollView style={styles.sidebarMenu} showsVerticalScrollIndicator={false}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    !item.route && styles.activeMenuItem
                  ]}
                  onPress={() => {
                    if (item.route) {
                      navigation.navigate(item.route as any);
                    }
                    setIsSidebarOpen(false);
                  }}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text style={styles.menuText}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Sidebar Footer */}
            <View style={styles.sidebarFooter}>
              <TouchableOpacity style={styles.logoutMenuItem} onPress={handleLogout}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="log-out" size={22} color="#FF4444" />
                </View>
                <Text style={[styles.menuText, { color: '#FF4444' }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutConfirm} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="log-out" size={50} color="#FF4444" />
            </View>
            <Text style={styles.confirmTitle}>Confirm Logout</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to logout from your NGO account?
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

export default NGOMessages;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#00a99d',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuButton: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  ngoMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#00a99d',
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
    borderLeftColor: '#00a99d',
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
  ngoMessageText: {
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
  ngoMessageTime: {
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
    backgroundColor: '#f0f9f8',
    padding: 10,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00a99d',
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
    color: '#00a99d',
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
    backgroundColor: '#00a99d',
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
    backgroundColor: '#00a99d',
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
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modernSidebar: {
    width: 280,
    height: '100%',
    backgroundColor: '#FFFFFF',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  sidebarHeader: {
    backgroundColor: '#000957',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sidebarMenu: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  activeMenuItem: {
    backgroundColor: '#F0F9FF',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 20,
  },
  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    backgroundColor: '#FF4444',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});