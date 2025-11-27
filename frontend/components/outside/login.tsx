//components/outside/login.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, StatusBar, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';

// Define the navigation type
type RootStackParamList = {
  Home: undefined;
  Welcome: undefined;
  About: undefined;
  Contact: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Dash: undefined;
};

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

type Props = {
  navigation: LoginScreenNavigationProp;
};

type NavItem = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: keyof RootStackParamList;
};

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: any;
  message?: string;
  accountStatus?: string;
  supportEmail?: string;
}

interface ErrorResponse {
  message?: string;
  accountStatus?: string;
  supportEmail?: string;
}

// API URL configuration - use localhost for web, IP for mobile
const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'https://apk-blueguard-rosssyyy.onrender.com';
  }
  return 'https://apk-blueguard-rosssyyy.onrender.com';
};

export default function Login({ navigation }: Props) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleContactSupport = (supportEmail: string) => {
    const subject = 'Account Deactivation - Support Request';
    const body = `Hello,\n\nMy account (${email}) has been deactivated. I would like to understand the reason and discuss reactivation.\n\nThank you.`;
    const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(mailtoUrl).catch(err => {
      console.error('Error opening email client:', err);
      if (Platform.OS === 'web') {
        alert(`Please email support at: ${supportEmail}`);
      } else {
        Alert.alert('Contact Support', `Please email support at: ${supportEmail}`);
      }
    });
  };

  const showDeactivatedAccountAlert = (supportEmail: string) => {
    if (Platform.OS === 'web') {
      const shouldContact = window.confirm(
        '⛔ Account Deactivated\n\n' +
        'Your account has been deactivated due to policy violations or rule violations in the system.\n\n' +
        'Please contact admin support for assistance:\n' +
        `📧 ${supportEmail}\n\n` +
        'Would you like to compose an email now?'
      );
      
      if (shouldContact) {
        handleContactSupport(supportEmail);
      }
    } else {
      Alert.alert(
        '⛔ Account Deactivated',
        `Your account has been deactivated due to policy violations or rule violations in the system.\n\n` +
        `Please contact admin support for assistance:\n📧 ${supportEmail}`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Contact Support',
            onPress: () => handleContactSupport(supportEmail)
          }
        ],
        { cancelable: true }
      );
    }
  };

  const handleLogin = async () => {
    console.log('=== LOGIN ATTEMPT START ===');
    console.log('Platform:', Platform.OS);
    console.log('Email:', email);
    console.log('Password length:', password.length);

    if (!email || !password) {
      if (Platform.OS === 'web') {
        alert('Please enter both email and password.');
      } else {
        Alert.alert('Error', 'Please enter both email and password.');
      }
      return;
    }

    setLoading(true);
    const apiUrl = getApiUrl();
    console.log('API URL:', apiUrl);

    try {
      console.log('Sending login request...');
      console.log('Request URL:', `${apiUrl}/login`);
      console.log('Request payload:', { email, password: '***' });
      
      const response = await axios.post<LoginResponse>(
        `${apiUrl}/login`, 
        { email, password },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      );

      console.log('Response status:', response.status);
      console.log('Response data:', response.data);

      if (response.data.success && response.data.token) {
        console.log('✅ Login successful!');
        console.log('Token received:', response.data.token ? 'Yes' : 'No');
        console.log('User data:', response.data.user);
        
        // Check account status
        if (response.data.user?.status === 'deactivated') {
          console.log('⛔ Account is deactivated');
          const supportEmail = response.data.supportEmail || 'roschelmaeanoos@gmail.com';
          showDeactivatedAccountAlert(supportEmail);
          return;
        }
        
        // Save token and user data
        try {
          await AsyncStorage.setItem('token', response.data.token);
          await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
          console.log('✅ Token and user data saved to AsyncStorage');
        } catch (storageError) {
          console.error('❌ AsyncStorage error:', storageError);
        }
        
        console.log('Attempting navigation to Dash...');
        
        // Navigate first, then show success message
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Dash' }],
          })
        );
        
        console.log('✅ Navigation dispatch completed');
        
        // Show success message after a brief delay
        setTimeout(() => {
          if (Platform.OS === 'web') {
            console.log('Login successful - redirecting to dashboard');
          } else {
            Alert.alert('Success', 'Login successful!');
          }
        }, 100);
        
      } else {
        console.log('❌ Login failed - invalid response');
        console.log('Response:', response.data);
        const errorMsg = response.data.message || 'Login failed. Please try again.';
        if (Platform.OS === 'web') {
          alert(errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      
      // Check if error is due to deactivated account (403 status)
      if (axiosError.response?.status === 403) {
        const errorData = axiosError.response.data;
        const supportEmail = errorData?.supportEmail || 'roschelmaeanoos@gmail.com';
        showDeactivatedAccountAlert(supportEmail);
        setLoading(false);
        return;
      }
      
      // Only log actual errors (not account status issues)
      console.error('=== LOGIN ERROR ===');
      
      // Detailed error logging
      if (axiosError.response) {
        console.error('❌ Server responded with error');
        console.error('Status:', axiosError.response.status);
        console.error('Data:', axiosError.response.data);
      } else if (axiosError.request) {
        console.error('❌ No response received from server');
        console.error('This usually means CORS issue on web or network connectivity issue');
      } else {
        console.error('❌ Error setting up request');
        console.error('Error message:', axiosError.message);
      }
      
      console.error('Error code:', axiosError.code);

      let errorMessage = 'Login failed. Please try again.';

      // Determine specific error message
      if (axiosError.response?.data?.message) {
        errorMessage = axiosError.response.data.message;
      } else if (axiosError.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection.';
      } else if (axiosError.code === 'ERR_NETWORK' || !axiosError.response) {
        if (Platform.OS === 'web') {
          errorMessage = 'Cannot connect to server. Make sure the server is running on localhost:5000. Check the console for CORS errors.';
        } else {
          errorMessage = 'Cannot connect to server. Please check your network connection.';
        }
      }

      console.error('Final error message:', errorMessage);

      // Show error message
      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      console.log('=== LOGIN ATTEMPT END ===');
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const navItems: NavItem[] = [
    { name: 'Home', icon: 'home', screen: 'Welcome' },
    { name: 'About', icon: 'information-circle', screen: 'About' },
    { name: 'Contact', icon: 'call', screen: 'Contact' },
    { name: 'Login', icon: 'log-in', screen: 'Login' },
    { name: 'Register', icon: 'person-add', screen: 'Register' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000957" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="water" size={32} color="#FFD700" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>BlueGuard GUARDIANS</Text>
        </View>
      </View>

      {/* Login Form */}
      <View style={styles.body}>
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Welcome Back!</Text>
          <Text style={styles.subheadingText}>Log in to continue your ocean conservation journey</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#0A5EB0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="#A0A0A0"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#0A5EB0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#A0A0A0"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.showButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#0A5EB0" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.forgotPasswordButton} 
            onPress={handleForgotPassword}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, loading && styles.disabledButton]} 
            onPress={handleLogin} 
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Text style={styles.buttonText}>Log In</Text>
                <Ionicons name="arrow-forward" size={22} color="white" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.registerSection}>
            <Text style={styles.noAccountText}>Don't have an account?</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Register')}
              disabled={loading}
            >
              <Text style={styles.registerText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bottom Navbar */}
      <View style={styles.footer}>
        {navItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={[styles.navButton, item.screen === 'Login' && styles.activeNavButton]} 
            onPress={() => navigation.navigate(item.screen)}
            disabled={loading}
          >
            <Ionicons 
              name={item.icon} 
              size={22} 
              color={item.screen === 'Login' ? "#FFD700" : "white"} 
            />
            <Text style={[styles.navText, item.screen === 'Login' && styles.activeNavText]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A5EB0',
  },
  header: {
    backgroundColor: '#000957',
    padding: 16,
    paddingTop: 22,
    elevation: 5,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  body: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...(Platform.OS === 'web' && {
      maxWidth: 500,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000957',
    marginBottom: 5,
    textAlign: 'center',
  },
  subheadingText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 25,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    backgroundColor: '#FAFBFF',
    overflow: 'hidden',
  },
  inputIcon: {
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  showButton: {
    padding: 10,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#0A5EB0',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#0A5EB0',
    padding: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#7AA3D0',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginRight: 8,
  },
  registerSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAccountText: {
    fontSize: 16,
    color: '#555',
  },
  registerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0A5EB0',
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000957',
    width: '100%',
    padding: 10,
    ...(Platform.OS === 'web' ? {} : { position: 'absolute', bottom: 0 }),
    elevation: 8,
  },
  navButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  activeNavButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
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
});