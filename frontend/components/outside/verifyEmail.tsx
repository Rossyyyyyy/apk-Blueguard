// components/outside/verifyEmail.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Alert, StatusBar } from 'react-native';
import axios, { AxiosError } from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

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
  VerifyEmail: {
    token: string;
    name: string;
  };
};

type VerifyEmailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'VerifyEmail'>;
type VerifyEmailScreenRouteProp = RouteProp<RootStackParamList, 'VerifyEmail'>;

type Props = {
  navigation: VerifyEmailScreenNavigationProp;
  route: VerifyEmailScreenRouteProp;
};

interface VerifyResponse {
  success: boolean;
  message?: string;
}

interface ErrorResponse {
  message?: string;
}

const VerifyEmail = ({ route, navigation }: Props) => {
  const { token, name } = route.params;
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await axios.get<VerifyResponse>(
          `http://10.120.221.103:5000/verify-email?token=${token}`
        );
        
        if (response.data.success) {
          setIsVerified(true);
        } else {
          Alert.alert('Error', response.data.message || 'Email verification failed.');
        }
      } catch (error) {
        const axiosError = error as AxiosError<ErrorResponse>;
        console.error('Verification error:', axiosError.response?.data || axiosError.message);
        Alert.alert('Error', axiosError.response?.data?.message || 'There was an issue verifying your email.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token]);

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000957" />
      
      {/* Header matching register component */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="water" size={32} color="#FFD700" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>BlueGuard GUARDIANS</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.contentContainer}>
          {isLoading ? (
            <>
              <ActivityIndicator size="large" color="#0A5EB0" style={styles.loader} />
              <Text style={styles.loadingText}>Verifying your email...</Text>
            </>
          ) : isVerified ? (
            <>
              <View style={styles.iconContainer}>
                <Ionicons name="checkmark-circle" size={100} color="#4CAF50" />
              </View>
              <Text style={styles.welcomeText}>Hello, {name}!</Text>
              <Text style={styles.messageText}>
                Welcome to <Text style={styles.highlight}>Ocean Guardians</Text>, where you can report incidents, report trash, gain knowledge about the ocean, and more. Together, let's protect and preserve our oceans for future generations!
              </Text>
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleLogin}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Proceed to Login</Text>
                <Ionicons name="arrow-forward" size={22} color="white" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.iconContainer}>
                <Ionicons name="close-circle" size={100} color="#FF4444" />
              </View>
              <Text style={styles.errorText}>Email verification failed. Please try again.</Text>
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Back to Register</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#0A5EB0',
    fontWeight: '500',
  },
  iconContainer: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000957',
    marginBottom: 20,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  highlight: {
    color: '#0A5EB0',
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 18,
    color: '#FF4444',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#0A5EB0',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginRight: 8,
  },
  secondaryButton: {
    backgroundColor: '#666',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default VerifyEmail;