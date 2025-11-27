// components/responders/ResLogin.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define navigation types
type RootStackParamList = {
  Home: undefined;
  About: undefined;
  Contact: undefined;
  Login: undefined;
  Register: undefined;
  ResLogin: undefined;
  ResRegister: undefined;
  Admin: undefined;
  NGO: undefined;
  Barangay: undefined;
  PCG: undefined;
};

type ResLoginNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResLogin'>;

interface ResLoginProps {
  navigation: ResLoginNavigationProp;
}

const ResLogin: React.FC<ResLoginProps> = ({ navigation }) => {
  const [responderType, setResponderType] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get API URL based on platform
  const getApiUrl = () => {
    if (Platform.OS === 'web') {
      // For web, use localhost or your production URL
      return 'http://10.120.221.103:5000';
    } else {
      // For mobile, use your local IP
      return 'http://10.120.221.103:5000';
    }
  };

  const handleLogin = async () => {
    // Validation
    if (!responderType) {
      if (Platform.OS === 'web') {
        alert('Please select a responder type');
      } else {
        Alert.alert('Error', 'Please select a responder type');
      }
      return;
    }

    if (!email || !password) {
      if (Platform.OS === 'web') {
        alert('Please fill in all fields');
      } else {
        Alert.alert('Error', 'Please fill in all fields');
      }
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (Platform.OS === 'web') {
        alert('Please enter a valid email address');
      } else {
        Alert.alert('Error', 'Please enter a valid email address');
      }
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = getApiUrl();
      console.log('Attempting responder login...');
      console.log('API URL:', apiUrl);
      console.log('Email:', email);
      console.log('Responder Type:', responderType);

      const response = await fetch(`${apiUrl}/api/login-responder`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Received non-JSON response:', text);
        
        if (Platform.OS === 'web') {
          alert('Server error: Invalid response format. Please check if the server is running correctly.');
        } else {
          Alert.alert('Error', 'Server returned an invalid response. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        const errorMessage = data.message || 'Invalid credentials';
        if (Platform.OS === 'web') {
          alert(`Login Failed: ${errorMessage}`);
        } else {
          Alert.alert('Login Failed', errorMessage);
        }
        setIsLoading(false);
        return;
      }

      // Verify that the responder type matches
      if (data.responder && data.responder.responderType !== responderType) {
        const errorMsg = `This account is registered as ${data.responder.responderType}, not ${responderType}`;
        if (Platform.OS === 'web') {
          alert(`Error: ${errorMsg}`);
        } else {
          Alert.alert('Error', errorMsg);
        }
        setIsLoading(false);
        return;
      }

      // Store authentication data
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('responderType', data.responder.responderType);
      await AsyncStorage.setItem('userEmail', data.responder.email);
      await AsyncStorage.setItem('userName', data.responder.fullName);
      await AsyncStorage.setItem('responderId', data.responder.id);

      console.log('Login successful, navigating to dashboard...');

      // Navigate based on responder type
      const navigateToScreen = () => {
        switch (data.responder.responderType) {
          case 'admin':
            navigation.navigate('Admin');
            break;
          case 'ngo':
            navigation.navigate('NGO');
            break;
          case 'barangay':
            navigation.navigate('Barangay');
            break;
          case 'pcg':
            navigation.navigate('PCG');
            break;
          default:
            if (Platform.OS === 'web') {
              alert('Error: Invalid responder type');
            } else {
              Alert.alert('Error', 'Invalid responder type');
            }
        }
      };

      if (Platform.OS === 'web') {
        alert('Login successful!');
        navigateToScreen();
      } else {
        Alert.alert('Success', 'Login successful!', [
          {
            text: 'OK',
            onPress: navigateToScreen,
          },
        ]);
      }
    } catch (error) {
      console.error('Error logging in:', error);
      
      let errorMessage = 'An error occurred. Please check your connection and try again.';
      if (error instanceof Error) {
        errorMessage = `Connection failed: ${error.message}`;
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="shield-account" size={30} color="white" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>BlueGuard</Text>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.loginCard}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="shield-check" size={60} color="#0A5EB0" />
          </View>

          <Text style={styles.welcomeTitle}>WELCOME BACK</Text>
          <Text style={styles.welcomeSubtitle}>Responder Portal</Text>

          {/* Responder Type Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Responder Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={responderType}
                onValueChange={(itemValue) => setResponderType(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select Responder Type" value="" />
                <Picker.Item label="Admin" value="admin" />
                <Picker.Item label="Barangay" value="barangay" />
                <Picker.Item label="PCG (Philippine Coast Guard)" value="pcg" />
                <Picker.Item label="NGO" value="ngo" />
              </Picker>
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="log-in" size={20} color="white" style={styles.buttonIcon} />
                <Text style={styles.loginButtonText}>Login</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('ResRegister')}>
              <Text style={styles.registerLink}>Click here to register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navbar */}
      <View style={styles.footer}>
        {[
          { name: 'Home', icon: 'home' as const, screen: 'Home' as const },
          { name: 'About Us', icon: 'information-circle' as const, screen: 'About' as const },
          { name: 'Contact Us', icon: 'call' as const, screen: 'Contact' as const },
          { name: 'Login', icon: 'log-in' as const, screen: 'Login' as const },
          { name: 'Register', icon: 'person-add' as const, screen: 'Register' as const },
        ].map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.navButton}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Ionicons name={item.icon} size={24} color="white" />
            <Text style={styles.navText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default ResLogin;

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
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  iconContainer: {
    backgroundColor: '#F0F8FF',
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0A5EB0',
    textAlign: 'center',
    marginBottom: 5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 5,
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#0A5EB0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  loginButtonDisabled: {
    backgroundColor: '#6B9DC9',
  },
  buttonIcon: {
    marginRight: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerLink: {
    fontSize: 14,
    color: '#0A5EB0',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000957',
    padding: 10,
  },
  navButton: {
    alignItems: 'center',
  },
  navText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
  },
});
