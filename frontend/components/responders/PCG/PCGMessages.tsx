import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  Animated,
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const API_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

interface Message {
  _id: string;
  sender: string;
  text: string;
  timestamp: string;
  replies?: Reply[];
  hasReplies?: boolean;
}

interface Reply {
  _id: string;
  text: string;
  timestamp: string;
}

interface GroupChat {
  groupName: string;
  messages: Message[];
}

interface SidebarItem {
  title: string;
  icon: string;
  route: string;
}

const PCGMessages: React.FC = () => {
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
  const [userEmail, setUserEmail] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));
  const scrollViewRef = useRef<ScrollView>(null);
  const navigation = useNavigation<any>();

  useEffect(() => {
    checkAuth();
    startPulseAnimation();
    fetchPCGGroupChat();
    
    const intervalId = setInterval(fetchPCGGroupChat, 30000);
    return () => clearInterval(intervalId);
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

  const fetchPCGGroupChat = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pcg-groupchat`);
      setGroupChat(response.data);
      setLoading(false);
      setTimeout(scrollToBottom, 100);
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
        const response = await axios.post(`${API_URL}/api/reply-to-message`, {
          messageId: replyingTo._id,
          replyText: newMessage
        });
        
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
        const response = await axios.post(`${API_URL}/api/send-pcg-message`, {
          messageText: newMessage,
          senderName: 'PCG'
        });
        
        setGroupChat(prev => ({
          ...prev,
          messages: [...prev.messages, response.data.newMessage]
        }));
      }
      
      setNewMessage('');
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

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

  const sidebarItems: SidebarItem[] = [
    { title: 'Dashboard', icon: 'view-dashboard', route: 'PCG' },
    { title: 'Reports', icon: 'file-document', route: 'PCGReports' },
    { title: 'Ongoing', icon: 'progress-clock', route: 'PCGOngoing' },
    { title: 'Completed', icon: 'check-circle', route: 'PCGCompleted' },
    { title: 'Messages', icon: 'message-text', route: 'PCGMessages' },
    { title: 'Settings', icon: 'cog', route: 'PCGSettings' },
  ];

  const groupedMessages = groupMessagesByDate();

  const renderMessage = (message: Message) => (
    <View key={message._id} style={styles.messageContainer}>
      <View style={[
        styles.messageBubble,
        message.sender === 'PCG' ? styles.pcgMessage : styles.userMessage
      ]}>
        <Text style={[
          styles.messageSender,
          message.sender === 'PCG' ? styles.pcgText : styles.userText
        ]}>
          {message.sender}
        </Text>
        <Text style={[
          styles.messageText,
          message.sender === 'PCG' ? styles.pcgText : styles.userText
        ]}>
          {message.text}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[
            styles.messageTime,
            message.sender === 'PCG' ? styles.pcgText : styles.userText
          ]}>
            {getMessageTime(message.timestamp)}
          </Text>
          <TouchableOpacity 
            style={styles.replyButton}
            onPress={() => startReply(message)}
          >
            <Icon 
              name="reply" 
              size={18} 
              color={message.sender === 'PCG' ? '#fff' : '#004d98'} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {message.replies && message.replies.map(reply => (
        <View key={reply._id} style={styles.replyMessage}>
          <View style={styles.replyHeader}>
            <Text style={styles.replyTo}>Replying to {message.sender}</Text>
          </View>
          <Text style={styles.replyText}>{reply.text}</Text>
          <Text style={styles.replyTime}>{getMessageTime(reply.timestamp)}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
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

      {/* Hamburger Menu */}
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

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#004d98" />
            <Text style={styles.loadingText}>Loading group chat...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Icon name="alert-circle" size={60} color="#f44336" />
            <Text style={styles.errorTitle}>Error Loading Group Chat</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setLoading(true);
                setError(null);
                fetchPCGGroupChat();
              }}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.chatContainer}>
            {/* Header */}
            <LinearGradient
              colors={['#004d98', '#003366']}
              style={styles.header}
            >
              <View style={styles.headerLeft}>
                <Icon name="account-group" size={24} color="#fff" />
                <Text style={styles.headerTitle}>{groupChat.groupName}</Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.memberCount}>
                  {groupChat.messages.reduce((unique: string[], msg) => 
                    unique.includes(msg.sender) ? unique : [...unique, msg.sender], []).length} members
                </Text>
              </View>
            </LinearGradient>

            {/* Messages */}
            <ScrollView 
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={scrollToBottom}
            >
              {Object.entries(groupedMessages).map(([date, messages]) => (
                <View key={date}>
                  <View style={styles.dateDivider}>
                    <View style={styles.dateDividerLine} />
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateText}>{date}</Text>
                    </View>
                  </View>
                  {messages.map(message => renderMessage(message))}
                </View>
              ))}
            </ScrollView>

            {/* Input Area */}
            <View style={styles.inputContainer}>
              {replyingTo && (
                <View style={styles.replyPreview}>
                  <View style={styles.replyInfo}>
                    <Text style={styles.replyIndicator}>Replying to </Text>
                    <Text style={styles.replyName}>{replyingTo.sender}</Text>
                    <Text style={styles.replyPreviewText} numberOfLines={1}>
                      : {replyingTo.text}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={cancelReply} style={styles.cancelReply}>
                    <Icon name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
                  placeholderTextColor="#999"
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
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Icon name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.3,
    opacity: 0.3,
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
  content: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 100 : 70,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#004d98',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  headerRight: {},
  memberCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  messagesContent: {
    padding: 20,
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  dateDividerLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dateBadge: {
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateText: {
    fontSize: 13,
    color: '#666',
  },
  messageContainer: {
    marginBottom: 12,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  pcgMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#004d98',
    borderBottomRightRadius: 4,
  },
  userMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderBottomLeftRadius: 4,
  },
  messageSender: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  pcgText: {
    color: '#fff',
  },
  userText: {
    color: '#333',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginVertical: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.8,
  },
  replyButton: {
    padding: 4,
  },
  replyMessage: {
    maxWidth: '70%',
    marginLeft: 40,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderLeftWidth: 3,
    borderLeftColor: '#004d98',
    marginTop: 4,
  },
  replyHeader: {
    marginBottom: 4,
  },
  replyTo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  replyText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 4,
  },
  replyTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 15,
  },
  replyPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f6fb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#004d98',
  },
  replyInfo: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  replyIndicator: {
    fontSize: 13,
    color: '#666',
  },
  replyName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#004d98',
  },
  replyPreviewText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  cancelReply: {
    padding: 4,
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
    maxHeight: 100,
    fontSize: 15,
    color: '#333',
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#004d98',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#b0b0b0',
  },
});

export default PCGMessages;