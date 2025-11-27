import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Image, ScrollView,
  Alert, ActivityIndicator, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// API Base URL
const API_BASE_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

// Define navigation types
type RootStackParamList = {
  Login: undefined;
  Dash: undefined;
  Schedule: undefined;
  Notifications: undefined;
  Reports: undefined;
  Rewards: undefined;
  Knowledge: undefined;
  Profile: undefined;
};

type ScheduleNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Schedule'>;

type Props = {
  navigation: ScheduleNavigationProp;
};

// Define types for state objects
interface User {
  _id: string;
  name?: string;
  email: string;
}

interface UserDataResponse {
  user?: User;
  message?: string;
}

interface ScheduleData {
  userName: string;
  email: string;
  image: string;
  pickupDate: string;
  pickupTime: string;
}

interface ScheduleResponse {
  status?: string;
  message?: string;
}

const Schedule: React.FC<Props> = ({ navigation }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("Kaibigan");
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');

  // Fetch the user's name or email
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          navigation.replace('Login');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data: UserDataResponse = await response.json();
        if (response.ok) {
          setUserName(data.user?.name || data.user?.email || "Kaibigan");
        } else {
          console.error('Error fetching user:', data.message);
          navigation.replace('Login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUserData();
  }, [navigation]);

// Function to pick an image from the gallery
const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 1,
  });

  // Fix: Check both canceled and assets existence
  if (!result.canceled && result.assets && result.assets.length > 0) {
    setImage(result.assets[0].uri);
  }
};
  // Function to handle date change
  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  // Function to handle time change
  const handleTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    const currentTime = selectedTime || time;
    setShowTimePicker(Platform.OS === 'ios');
    setTime(currentTime);
  };

  // Function to get status color
  const getStatusColor = (statusValue: string): string => {
    switch(statusValue) {
      case 'pending':
        return '#FFB347'; // Orange
      case 'confirmed':
        return '#77DD77'; // Green
      case 'completed':
        return '#0A5EB0'; // Blue
      case 'cancelled':
        return '#FF6961'; // Red
      default:
        return '#888888'; // Gray
    }
  };

  // Function to submit the schedule
  const submitSchedule = async () => {
    if (!image) {
      Alert.alert("Error", "Please upload an image of the trash.");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const userData: UserDataResponse = await response.json();
      if (!response.ok) {
        console.error('Error fetching user:', userData.message);
        navigation.replace('Login');
        return;
      }

      const userEmail = userData.user?.email || "unknown@example.com";

      // Prepare the schedule data
      const scheduleData: ScheduleData = {
        userName: userName,
        email: userEmail,
        image: image,
        pickupDate: date.toISOString().split('T')[0], // Format: YYYY-MM-DD
        pickupTime: time.toTimeString().split(' ')[0], // Format: HH:MM:SS
      };

      // Send the schedule data to the backend
      const saveResponse = await fetch(`${API_BASE_URL}/save-schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleData),
      });

      const saveResult: ScheduleResponse = await saveResponse.json();
      if (saveResponse.ok) {
        setStatus(saveResult.status || 'pending');
        Alert.alert(
          'Success!',
          `Thank you, ${userName}! Your garbage collection schedule has been submitted with status: PENDING. We will notify you before the pickup. 🌍💙`
        );
        setImage(null);
        setDate(new Date());
        setTime(new Date());
      } else {
        Alert.alert("Error", "Failed to save schedule data. Please try again.");
      }
    } catch (error) {
      console.error('Error submitting schedule:', error);
      Alert.alert("Error", "An error occurred while submitting schedule data. Please try again.");
    }
    setLoading(false);
  };

  // Navigation items matching Dash.tsx
  const navItems: Array<{
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    screen: keyof RootStackParamList;
  }> = [
    { name: 'Dashboard', icon: 'home', screen: 'Dash' },
    { name: 'Notifications', icon: 'notifications', screen: 'Notifications' },
    { name: 'My Reports', icon: 'document-text', screen: 'Reports' },
    { name: 'Rewards', icon: 'trophy', screen: 'Rewards' },
    { name: 'Knowledge', icon: 'book', screen: 'Knowledge' },
    { name: 'Profile', icon: 'person', screen: 'Profile' }
  ];

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="earth" size={30} color="white" />
          <Text style={styles.headerTitle}>BlueGuard</Text>
        </View>

        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Ionicons name="calendar-outline" size={50} color="#009990" />
            <Text style={styles.cardTitle}>Schedule Pickup</Text>
            <Text style={styles.cardSubtitle}>Upload an image of the trash and schedule a pickup.</Text>

            {image && <Image source={{ uri: image }} style={styles.image} />}

            {loading ? <ActivityIndicator size="large" color="#009990" /> : (
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Ionicons name="camera" size={24} color="white" />
                <Text style={styles.uploadText}>Upload Image</Text>
              </TouchableOpacity>
            )}

            {/* Date Picker */}
            <TouchableOpacity style={styles.dateTimeButton} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar" size={24} color="#009990" />
              <Text style={styles.dateTimeText}>Pickup Date: {date.toDateString()}</Text>
            </TouchableOpacity>

            {/* Time Picker */}
            <TouchableOpacity style={styles.dateTimeButton} onPress={() => setShowTimePicker(true)}>
              <Ionicons name="time" size={24} color="#009990" />
              <Text style={styles.dateTimeText}>Pickup Time: {time.toLocaleTimeString()}</Text>
            </TouchableOpacity>

            {/* Conditionally render pickers */}
            {showDatePicker && (
              <DateTimePicker
                testID="datePicker"
                value={date}
                mode="date"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                testID="timePicker"
                value={time}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            )}

            <TouchableOpacity
              style={[styles.submitButton, !image && styles.disabledButton]}
              onPress={submitSchedule}
              disabled={!image}
            >
              <Text style={styles.submitText}>Schedule Pickup</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Spacer to ensure content isn't hidden behind the footer */}
        <View style={{ height: 80 }} />
      </View>
      
      {/* Footer - matching Dash.tsx */}
      <View style={styles.footer}>
        {navItems.map((item, index) => (
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
    </ScrollView>
  );
};

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
    justifyContent: 'center' 
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FFFFFF', 
    marginLeft: 10 
  },
  cardContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  card: { 
    backgroundColor: 'white', 
    borderRadius: 15, 
    padding: 20, 
    alignItems: 'center', 
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#009990', 
    marginBottom: 5, 
    textAlign: 'center' 
  },
  cardSubtitle: { 
    fontSize: 14, 
    color: '#555', 
    textAlign: 'center', 
    marginBottom: 15 
  },
  image: { 
    width: 150, 
    height: 150, 
    borderRadius: 10, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#ccc' 
  },
  uploadButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#009990', 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: 10, 
    marginBottom: 15 
  },
  uploadText: { 
    color: 'white', 
    fontWeight: 'bold', 
    marginLeft: 10 
  },
  dateTimeButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: 10, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#009990',
    width: '100%',
  },
  dateTimeText: { 
    color: '#009990', 
    fontWeight: 'bold', 
    marginLeft: 10 
  },
  submitButton: { 
    backgroundColor: '#009990', 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderRadius: 10, 
    alignItems: 'center', 
    width: '100%' 
  },
  submitText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  disabledButton: { 
    backgroundColor: '#888' 
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000957',
    width: '100%',
    padding: 10,
    position: 'absolute',
    bottom: 0,
  },
  navButton: { 
    alignItems: 'center' 
  },
  navText: { 
    color: 'white', 
    fontSize: 12 
  },
});

export default Schedule;