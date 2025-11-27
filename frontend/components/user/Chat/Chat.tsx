import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Animated,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, RouteProp, ParamListBase } from '@react-navigation/native';

// Types
interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  isUser: boolean;
  status?: 'sending' | 'sent' | 'failed' | 'typing';
  color?: string;
}

interface Responder {
  name: string;
  type: string;
}

interface RouteParams {
  responder?: Responder;
  reportId?: string;
  responderType?: string;
  responderName?: string;
}

interface UserData {
  user?: {
    name?: string;
    email?: string;
  };
  message?: string;
}

interface ChatHistoryResponse {
  chatHistory?: Message[];
}

interface SendMessageResponse {
  messageId?: string;
  message?: string;
}

// Extend ParamListBase to include replace method
interface NavigationWithReplace extends NavigationProp<ParamListBase> {
  replace: (screen: string, params?: any) => void;
}

interface ChatProps {
  route: RouteProp<{ Chat: RouteParams }, 'Chat'>;
  navigation: NavigationWithReplace;
}

// Array of vibrant colors for user avatars
const AVATAR_COLORS: string[] = [
  '#FF5733', // Coral
  '#33A1FF', // Bright Blue
  '#33FF57', // Bright Green
  '#B033FF', // Purple
  '#FF33A8', // Pink
  '#FF9F33', // Orange
  '#33FFEC', // Turquoise
  '#FFDE33', // Yellow
  '#4CAF50', // Material Green
  '#9C27B0', // Material Purple
  '#E91E63', // Material Pink
  '#3F51B5'  // Indigo
];

// API Base URL
const API_BASE_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

const Chat: React.FC<ChatProps> = ({ route, navigation }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [userName, setUserName] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);
  const [responder, setResponder] = useState<Responder | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const flatListRef = useRef<FlatList<Message>>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputHeight = useRef(new Animated.Value(50)).current;

  // Get the responder from route params if available
  useEffect(() => {
    if (route.params?.responder) {
      setResponder(route.params.responder);
    }
  }, [route.params]);

  // Fetch user data and chat history on component mount
  useEffect(() => {
    const fetchUserData = async (): Promise<void> => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (!storedToken) {
          navigation.replace('Login');
          return;
        }

        setToken(storedToken);

        const response = await fetch(`${API_BASE_URL}/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json'
          }
        });

        const data: UserData = await response.json();
        if (response.ok) {
          const fetchedUserName = data.user?.name || data.user?.email || 'User';
          setUserName(fetchedUserName);
          fetchChatHistory(storedToken, fetchedUserName, route.params?.reportId);
        } else {
          console.error('Error fetching user:', data.message);
          navigation.replace('Login');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
    
    // Clean up typing animation timers
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  // Function to generate a color based on the name
  const getColorFromName = (name: string): string => {
    if (!name) return AVATAR_COLORS[0];
    
    // Sum the character codes to create a deterministic but pseudo-random index
    const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = sum % AVATAR_COLORS.length;
    
    return AVATAR_COLORS[index];
  };

  // Function to fetch chat history - MODIFIED to show ALL messages
  const fetchChatHistory = async (
    token: string, 
    userName: string, 
    reportId?: string
  ): Promise<void> => {
    const finalReportId = reportId || route.params?.reportId || 'general';
    const finalResponderType = responder?.type || route.params?.responderType || 'Admin';
  
    if (!finalReportId || !finalResponderType || !userName) {
      console.error('Missing required parameters for chat history');
      return;
    }
  
    try {
      const response = await fetch(`${API_BASE_URL}/chat-history`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          userName,
          responderType: finalResponderType,
          reportId: finalReportId
        })
      });
  
      const data: ChatHistoryResponse = await response.json();
  
      if (response.ok && data.chatHistory) {
        // No filtering - show all messages
        const allMessages: Message[] = data.chatHistory.map(msg => ({
          ...msg,
          isUser: msg.sender === userName,  // Mark as user message if sender is current user
          color: msg.sender === userName ? '#009990' : getColorFromName(msg.sender)
        }));
        
        setMessages(allMessages);
      } else {
        console.warn('No chat history found or error:', data);
        setMessages([]);
      }
    } catch (error) {
      console.error('Detailed Error fetching chat history:', error);
      setMessages([]);
    }
  };

  // New function to delete a message
  const deleteMessage = async (messageId: string): Promise<void> => {
    try {
      // Optimistically remove the message from local state
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== messageId)
      );

      // Send delete request to server
      const response = await fetch(`${API_BASE_URL}/delete-message`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          messageId,
          reportId: route.params?.reportId || 'general'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // If deletion fails, restore the message
        Alert.alert('Deletion Failed', data.message || 'Could not delete message');
        if (token) {
          fetchChatHistory(token, userName, route.params?.reportId);
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message. Please try again.');
      // Restore messages from server
      if (token) {
        fetchChatHistory(token, userName, route.params?.reportId);
      }
    }
  };

  // Handler for long press on a message
  const handleLongPressMessage = (message: Message): void => {
    // Only allow deletion of user's own messages
    if (message.sender !== userName) return;

    Alert.alert(
      'Delete Message', 
      'Are you sure you want to delete this message?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMessage(message.id)
        }
      ]
    );
  };

  // Handle input text change with typing animation
  const handleInputChange = (text: string): void => {
    setInputText(text);
    
    // Animate input height based on content
    const numberOfLines = text.split('\n').length;
    const newHeight = Math.min(120, Math.max(50, 20 + numberOfLines * 20));
    
    Animated.timing(inputHeight, {
      toValue: newHeight,
      duration: 100,
      useNativeDriver: false
    }).start();
    
    // Show "typing" indicator
    setIsTyping(text.length > 0);
    
    // Clear previous timeout
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    
    // Set timeout to hide typing indicator after 2 seconds of inactivity
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000) as any;
  };

  const sendMessage = async (): Promise<void> => {
    if (inputText.trim() === '') return;
  
    const payload = {
      text: inputText.trim(),
      sender: userName,
      reportId: route.params?.reportId || 'general',
      responderType: responder?.type || route.params?.responderType || 'Admin',
    };
  
    const temporaryMessage: Message = {
      id: `temp-${Date.now()}`,
      text: inputText.trim(),
      sender: userName,
      timestamp: new Date().toISOString(),
      isUser: true,
      status: 'sending',
      color: '#009990' // User's color
    };
  
    setMessages(prevMessages => [...prevMessages, temporaryMessage]);
    setInputText('');
    setIsTyping(false);
    
    // Reset input height
    Animated.timing(inputHeight, {
      toValue: 50,
      duration: 100,
      useNativeDriver: false
    }).start();
  
    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  
    try {
      const response = await fetch(`${API_BASE_URL}/send-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
  
      const responseData: SendMessageResponse = await response.json();
  
      if (response.ok) {
        // Update the message status to sent and replace temporary ID if server provides one
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === temporaryMessage.id 
              ? { ...msg, status: 'sent', id: responseData.messageId || msg.id }
              : msg
          )
        );
        
        // Simulate an automated response
        simulateResponse();
      } else {
        // Handle sending failure
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === temporaryMessage.id 
              ? { ...msg, status: 'failed' }
              : msg
          )
        );
        
        Alert.alert('Send Failed', 'Message could not be sent. Please try again.');
      }
    } catch (error) {
      console.error('Detailed network error:', error);
      
      // Handle network error
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === temporaryMessage.id 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
      
      Alert.alert('Network Error', 'Unable to send message. Please check your connection.');
    }
  };

  // Simulate an automated response for demonstration
  const simulateResponse = (): void => {
    // Show typing indicator for responder
    setTimeout(() => {
      setMessages(prevMessages => [
        ...prevMessages, 
        {
          id: `typing-${Date.now()}`,
          text: '',
          sender: responder?.name || route.params?.responderName || 'Responder',
          timestamp: new Date().toISOString(),
          isUser: false,
          status: 'typing',
          color: getColorFromName(responder?.name || route.params?.responderName || 'Responder')
        }
      ]);
      
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 500);

    // After "typing" delay, show actual response
    setTimeout(() => {
      const responderName = responder?.name || route.params?.responderName || 'Responder';
      const responderColor = getColorFromName(responderName);
      
      // Remove typing indicator and add real message
      setMessages(prevMessages => {
        const filtered = prevMessages.filter(msg => msg.status !== 'typing');
        
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            text: `Thank you for your message. This is ${responderName} from ${responder?.type || route.params?.responderType || 'Admin'}. We've received your report and will be in touch shortly. How can we assist you further?`,
            sender: responderName,
            timestamp: new Date().toISOString(),
            isUser: false,
            color: responderColor
          }
        ];
      });
      
      // Auto scroll to bottom when new message is added
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 2500);
  };

  // Handle back navigation
  const handleBack = (): void => {
    navigation.goBack();
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUserMessage = item.sender === userName || item.isUser;
    const messageDateTime = new Date(item.timestamp);
    const avatarColor = item.color || (isUserMessage ? '#009990' : getColorFromName(item.sender));

    // Typing indicator
    if (item.status === 'typing') {
      return (
        <View style={[
          styles.messageContainer,
          styles.responderMessageContainer
        ]}>
          <View style={[
            styles.profileIconContainer, 
            { backgroundColor: avatarColor }
          ]}>
            <Text style={styles.profileIconText}>
              {item.sender ? item.sender.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>

          <View style={[
            styles.messageBubbleContainer,
            styles.responderMessageBubbleContainer
          ]}>
            <Text style={styles.senderName}>{item.sender}</Text>
            <View style={[
              styles.messageBubble,
              styles.responderMessageBubble,
              styles.typingBubble
            ]}>
              <View style={styles.typingIndicator}>
                <View style={styles.typingDot} />
                <View style={[styles.typingDot, styles.typingDotMiddle]} />
                <View style={styles.typingDot} />
              </View>
            </View>
          </View>
        </View>
      );
    }

    const formattedDateTime = messageDateTime.toLocaleString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return (
      <TouchableOpacity 
        onLongPress={() => handleLongPressMessage(item)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={[
          styles.messageContainer,
          isUserMessage ? styles.userMessageContainer : styles.responderMessageContainer
        ]}>
          {/* Profile Icon */}
          <View style={[
            styles.profileIconContainer, 
            { backgroundColor: avatarColor }
          ]}>
            <Text style={styles.profileIconText}>
              {item.sender ? item.sender.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>

          <View style={[
            styles.messageBubbleContainer,
            isUserMessage ? styles.userMessageBubbleContainer : styles.responderMessageBubbleContainer
          ]}>
            {/* Sender Name */}
            <Text style={[
              styles.senderName, 
              { color: avatarColor }
            ]}>
              {item.sender}
            </Text>

            <View style={[
              styles.messageBubble,
              isUserMessage ? [styles.userMessageBubble, { backgroundColor: avatarColor }] : styles.responderMessageBubble,
              item.status === 'failed' && styles.failedMessageBubble
            ]}>
              <Text style={[
                styles.messageText, 
                isUserMessage && styles.userMessageText
              ]}>
                {item.text}
              </Text>
              <View style={styles.messageFooter}>
                <Text style={[
                  styles.messageTime, 
                  isUserMessage && styles.userMessageTime
                ]}>
                  {formattedDateTime}
                </Text>
                {isUserMessage && item.status === 'sending' && (
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.sendingIndicator} />
                )}
                {isUserMessage && item.status === 'failed' && (
                  <Ionicons name="alert-circle" size={16} color="red" />
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {responder?.name || route.params?.responderName || 'Responder'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {responder?.type || route.params?.responderType || 'Admin'}
            </Text>
          </View>
          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="ellipsis-vertical" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#009990" />
            <Text style={styles.loadingText}>Loading chat...</Text>
          </View>
        ) : (
          <>
            {/* Messages List */}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={() => (
                <View style={styles.emptyChat}>
                  <Image 
source={require('../../../assets/chat-icon.png')}                    style={styles.emptyChatIcon}
                  />
                  <Text style={styles.emptyChatText}>
                    No messages yet. Start the conversation!
                  </Text>
                </View>
              )}
            />

            {/* Input Area */}
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
              style={styles.inputContainer}
            >
              <Animated.View style={[styles.inputWrapper, { height: inputHeight }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Type a message..."
                  placeholderTextColor="#888"
                  value={inputText}
                  onChangeText={handleInputChange}
                  multiline
                />
                <TouchableOpacity style={styles.attachButton}>
                  <Ionicons name="attach" size={24} color="#888" />
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity 
                style={[
                  styles.sendButton,
                  !inputText.trim() && styles.sendButtonDisabled
                ]} 
                onPress={sendMessage}
                disabled={!inputText.trim()}
              >
                <Ionicons name="send" size={24} color="white" />
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000957',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#000957',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#CCC',
  },
  headerAction: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  loadingText: {
    marginTop: 10,
    color: '#009990',
    fontWeight: '500',
  },
  messagesList: {
    padding: 10,
    paddingBottom: 20,
  },
  messageContainer: {
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  responderMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    padding: 12,
    paddingBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  userMessageBubble: {
    backgroundColor: '#009990',
    borderBottomRightRadius: 4,
  },
  responderMessageBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  messageTime: {
    fontSize: 10,
    color: '#777',
    alignSelf: 'flex-end',
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 24,
    paddingRight: 10,
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 16,
  },
  attachButton: {
    padding: 5,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#009990',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#B0BEC5',
    elevation: 0,
    shadowOpacity: 0,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyChatIcon: {
    width: 120,
    height: 120,
    tintColor: '#009990',
    opacity: 0.5,
    marginBottom: 20,
  },
  emptyChatText: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
    fontWeight: '500',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  sendingIndicator: {
    marginLeft: 5,
  },
  failedMessageBubble: {
    backgroundColor: '#FF6B6B', 
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  profileIconText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  messageBubbleContainer: {
    maxWidth: '85%',
  },
  userMessageBubbleContainer: {
    alignItems: 'flex-end',
  },
  responderMessageBubbleContainer: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  typingBubble: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    minHeight: 45,
    justifyContent: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#888',
    marginHorizontal: 3,
    opacity: 0.7,
  },
  typingDotMiddle: {
    transform: [{ translateY: -5 }],
  }
});

export default Chat;