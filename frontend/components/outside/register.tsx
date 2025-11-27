//components/outside/register.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios, { AxiosError } from 'axios';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

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

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

type Props = {
  navigation: RegisterScreenNavigationProp;
};

type NavItem = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: keyof RootStackParamList;
};

type GenderType = 'male' | 'female' | 'non-binary' | '';

interface RegisterResponse {
  success: boolean;
  message?: string;
}

interface ErrorResponse {
  message?: string;
}

interface GenderOptionProps {
  label: string;
  value: GenderType;
  icon: keyof typeof Ionicons.glyphMap;
  gender: GenderType;
  setGender: (value: GenderType) => void;
}

// Gender option component
const GenderOption = ({ label, value, icon, gender, setGender }: GenderOptionProps) => (
  <TouchableOpacity
    style={[
      styles.genderOption,
      gender === value && styles.genderSelected
    ]}
    onPress={() => setGender(value)}
  >
    <Ionicons name={icon} size={24} color={gender === value ? '#000957' : 'white'} />
    <Text style={[
      styles.genderText,
      gender === value && styles.genderTextSelected
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function Register({ navigation }: Props) {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [gender, setGender] = useState<GenderType>('');

  // Password requirements
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password === confirmPassword;

  const handleRegister = async () => {
    if (!name || !email || !password || !gender) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      Alert.alert('Error', 'Password does not meet the requirements.');
      return;
    }
  
    if (!passwordsMatch) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
  
    try {
      const response = await axios.post<RegisterResponse>('http://10.120.221.103:5000/register', {
        name,
        email,
        password,
        gender,
      });
  
      if (response.data.success) {
        Alert.alert('Success', 'Registered successfully! Please check your email to verify your account.');
        navigation.navigate('Login');
      } else {
        Alert.alert('Error', response.data.message || 'Registration failed.');
      }
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      console.error('Registration error:', axiosError.response?.data || axiosError.message);
      Alert.alert('Error', axiosError.response?.data?.message || 'There was an issue registering the user.');
    }
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
      
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="water" size={32} color="#FFD700" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>BlueGuard GUARDIANS</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Create Your Account</Text>
          <Text style={styles.subheadingText}>Join our community of ocean lovers</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#0A5EB0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#A0A0A0"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#0A5EB0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="#A0A0A0"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.genderOptions}>
              <GenderOption label="Male" value="male" icon="male" gender={gender} setGender={setGender} />
              <GenderOption label="Female" value="female" icon="female" gender={gender} setGender={setGender} />
              <GenderOption label="Non-binary" value="non-binary" icon="person" gender={gender} setGender={setGender} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#0A5EB0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Create a strong password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#A0A0A0"
              />
              <TouchableOpacity
                style={styles.showButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#0A5EB0" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#0A5EB0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholderTextColor="#A0A0A0"
              />
            </View>
          </View>

          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <View style={styles.requirementsList}>
              <Text style={[styles.requirementText, hasMinLength ? styles.requirementMet : styles.requirementNotMet]}>
                <Ionicons name={hasMinLength ? "checkmark-circle" : "close-circle"} size={16} color={hasMinLength ? "#4CAF50" : "#FF4444"} />
                {" "}At least 6 characters
              </Text>
              <Text style={[styles.requirementText, hasUppercase ? styles.requirementMet : styles.requirementNotMet]}>
                <Ionicons name={hasUppercase ? "checkmark-circle" : "close-circle"} size={16} color={hasUppercase ? "#4CAF50" : "#FF4444"} />
                {" "}At least one uppercase letter
              </Text>
              <Text style={[styles.requirementText, hasLowercase ? styles.requirementMet : styles.requirementNotMet]}>
                <Ionicons name={hasLowercase ? "checkmark-circle" : "close-circle"} size={16} color={hasLowercase ? "#4CAF50" : "#FF4444"} />
                {" "}At least one lowercase letter
              </Text>
              <Text style={[styles.requirementText, hasNumber ? styles.requirementMet : styles.requirementNotMet]}>
                <Ionicons name={hasNumber ? "checkmark-circle" : "close-circle"} size={16} color={hasNumber ? "#4CAF50" : "#FF4444"} />
                {" "}At least one number
              </Text>
              {confirmPassword && (
                <Text style={[styles.requirementText, passwordsMatch ? styles.requirementMet : styles.requirementNotMet]}>
                  <Ionicons name={passwordsMatch ? "checkmark-circle" : "close-circle"} size={16} color={passwordsMatch ? "#4CAF50" : "#FF4444"} />
                  {" "}Passwords match
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleRegister}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Create Account</Text>
            <Ionicons name="arrow-forward" size={22} color="white" />
          </TouchableOpacity>

          <View style={styles.loginSection}>
            <Text style={styles.haveAccountText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {navItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={[styles.navButton, item.screen === 'Register' && styles.activeNavButton]} 
            onPress={() => navigation.navigate(item.screen)}
          >
            <Ionicons 
              name={item.icon} 
              size={22} 
              color={item.screen === 'Register' ? "#FFD700" : "white"} 
            />
            <Text style={[styles.navText, item.screen === 'Register' && styles.activeNavText]}>
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
    padding: 20,
    paddingBottom: 80,
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
  genderOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0A5EB0',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  genderSelected: {
    backgroundColor: '#FFD700',
  },
  genderText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 6,
  },
  genderTextSelected: {
    color: '#000957',
  },
  requirementsContainer: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0A5EB0',
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0A5EB0',
    marginBottom: 8,
  },
  requirementsList: {
    marginLeft: 2,
  },
  requirementText: {
    fontSize: 14,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  requirementMet: {
    color: '#4CAF50',
  },
  requirementNotMet: {
    color: '#FF4444',
  },
  button: {
    backgroundColor: '#0A5EB0',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginRight: 8,
  },
  loginSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  haveAccountText: {
    fontSize: 16,
    color: '#555',
  },
  loginText: {
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
    position: 'absolute',
    bottom: 0,
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