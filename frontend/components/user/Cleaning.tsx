import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosResponse } from 'axios';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define types for navigation
type RootStackParamList = {
  Login: undefined;
  Dash: undefined;
  Notifications: undefined;
  Reports: undefined;
  Rewards: undefined;
  Knowledge: undefined;
  Profile: undefined;
};

type CleaningScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CleaningProps {
  navigation: CleaningScreenNavigationProp;
}

interface UserData {
  user?: {
    name?: string;
    email?: string;
  };
  message?: string;
}

interface GeminiResponse {
  success: boolean;
  isGarbage: boolean;
  garbageType?: string;
  confidence?: string;
  score?: number;
  message?: string;
}

interface CleanupData {
  userName: string;
  email: string;
  image: string;
  score: number;
  garbageType?: string;
}

interface NavItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: keyof RootStackParamList;
}

const API_BASE_URL = 'http://10.120.221.103:5000';

const Cleaning: React.FC<CleaningProps> = ({ navigation }) => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("Kaibigan");
  const [detectedGarbageType, setDetectedGarbageType] = useState<string>('');
  const [detectionScore, setDetectionScore] = useState<number>(0);

  useEffect(() => {
    const fetchUserData = async (): Promise<void> => {
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

        const data: UserData = await response.json();
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

  // ✅ OPTIMIZED: Compress image before upload
  const compressImage = async (uri: string): Promise<string> => {
    try {
      console.log('🔧 Compressing image...');
      
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }], // Resize to max width 800px
        { 
          compress: 0.7, // 70% quality
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );
      
      console.log('✅ Image compressed successfully');
      return manipResult.uri;
    } catch (error) {
      console.error('⚠️ Image compression failed, using original:', error);
      return uri;
    }
  };

  const pickImage = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7, // Reduced quality for faster upload
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const compressedUri = await compressImage(result.assets[0].uri);
      analyzeImage(compressedUri);
    }
  };

  const analyzeImage = async (imageUri: string): Promise<void> => {
    setLoading(true);
    try {
      console.log('📸 Converting image to base64...');
      
      // Convert image to base64
      const imageBase64 = await fetch(imageUri)
        .then((res) => res.blob())
        .then((blob) => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            console.log(`📦 Base64 size: ${(base64.length / 1024).toFixed(2)} KB`);
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }));

      // Get token for authentication
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert("Error", "Authentication required. Please login again.");
        navigation.replace('Login');
        return;
      }

      console.log('🚀 Sending to Gemini AI...');

      // Send to backend (Gemini AI)
      const response: AxiosResponse<GeminiResponse> = await axios.post(
        `${API_BASE_URL}/api/detect-garbage`,
        { 
          imageBase64: imageBase64 
        },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      console.log('✅ Gemini Response:', response.data);

      if (response.data.success && response.data.isGarbage) {
        const score = response.data.score || Math.floor(Math.random() * 50) + 50;
        const garbageType = response.data.garbageType || 'General Waste';
        
        setDetectedGarbageType(garbageType);
        setDetectionScore(score);
        
        Alert.alert(
          "🎉 Garbage Detected!", 
          `✅ Type: ${garbageType}\n` +
          `🎯 Confidence: ${response.data.confidence || 'High'}\n` +
          `⭐ Points Earned: ${score}\n\n` +
          `Great job cleaning up! 💚`,
          [
            {
              text: "OK",
              onPress: () => {
                setImages([...images, imageUri]);
              }
            }
          ]
        );
      } else {
        Alert.alert(
          "❌ Invalid Picture", 
          response.data.message || "No garbage detected. Please upload a clear image of waste or trash."
        );
      }
    } catch (error) {
      console.error('❌ Garbage detection error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          Alert.alert("⏱️ Timeout", "Request took too long. Please check your internet connection.");
        } else if (error.response?.status === 401) {
          Alert.alert("🔒 Session Expired", "Please login again.");
          navigation.replace('Login');
        } else if (error.response?.status === 413) {
          Alert.alert("📦 Image Too Large", "Please try a smaller image or compress it.");
        } else if (error.response?.status === 500) {
          Alert.alert("🤖 Detection Failed", "AI service temporarily unavailable. Please try again later.");
        } else {
          Alert.alert("❌ Error", error.response?.data?.message || "Failed to analyze image. Please try again.");
        }
      } else {
        Alert.alert("🌐 Network Error", "Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const submitCleanup = async (): Promise<void> => {
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

      const userData: UserData = await response.json();
      if (!response.ok) {
        console.error('Error fetching user:', userData.message);
        navigation.replace('Login');
        return;
      }

      const userEmail = userData.user?.email || "unknown@example.com";

      const cleanupData: CleanupData = {
        userName: userName,
        email: userEmail,
        image: images[0],
        score: detectionScore || Math.floor(Math.random() * 100) + 10,
        garbageType: detectedGarbageType || 'General Waste'
      };

      const saveResponse = await fetch(`${API_BASE_URL}/save-cleanup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanupData),
      });

      const saveResult = await saveResponse.json();
      if (saveResponse.ok) {
        Alert.alert(
          '🎉 Thank You!',
          `Thank you, ${userName}! Your cleanup has been submitted.\n\n` +
          `🗑️ Garbage Type: ${detectedGarbageType}\n` +
          `⭐ Points Earned: ${detectionScore}\n\n` +
          `Let's continue protecting our environment! 💙🌊`,
          [
            {
              text: "OK",
              onPress: () => {
                setImages([]);
                setDetectedGarbageType('');
                setDetectionScore(0);
              }
            }
          ]
        );
      } else {
        Alert.alert("❌ Error", "Failed to save cleanup data. Please try again.");
      }
    } catch (error) {
      console.error('Error submitting cleanup:', error);
      Alert.alert("❌ Error", "An error occurred while submitting cleanup data. Please try again.");
    }
  };

  const navItems: NavItem[] = [
    { name: 'Dashboard', icon: 'home', screen: 'Dash' },
    { name: 'Notifications', icon: 'notifications', screen: 'Notifications' },
    { name: 'My Reports', icon: 'document-text', screen: 'Reports' },
    { name: 'Rewards', icon: 'trophy', screen: 'Rewards' },
    { name: 'Knowledge', icon: 'book', screen: 'Knowledge' },
    { name: 'Profile', icon: 'person', screen: 'Profile' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="earth" size={30} color="white" />
        <Text style={styles.headerTitle}>PROTECT OUR OCEANS</Text>
      </View>

      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Ionicons name="water-outline" size={50} color="#009990" />
          <Text style={styles.cardTitle}>Cleanup Report</Text>
          <Text style={styles.cardSubtitle}>
            🤖 AI will detect garbage type and assign points automatically.
          </Text>

          {detectedGarbageType && (
            <View style={styles.detectionInfo}>
              <Text style={styles.detectionLabel}>🗑️ Detected: {detectedGarbageType}</Text>
              <Text style={styles.detectionLabel}>⭐ Points: {detectionScore}</Text>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageContainer}>
            {images.map((img, index) => (
              <Image key={index} source={{ uri: img }} style={styles.image} />
            ))}
          </ScrollView>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#009990" />
              <Text style={styles.loadingText}>🤖 Analyzing garbage with AI...</Text>
              <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.uploadText}>Upload Image</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.submitButton, images.length === 0 && styles.disabledButton]}
            onPress={submitCleanup}
            disabled={images.length === 0}
          >
            <Text style={styles.submitText}>Submit Cleanup</Text>
          </TouchableOpacity>
        </View>
      </View>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0A5EB0' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#000957', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
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
    paddingVertical: 10
  },
  card: { 
    backgroundColor: 'white', 
    borderRadius: 20, 
    padding: 25, 
    alignItems: 'center', 
    shadowColor: '#009990',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  cardTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#009990', 
    marginBottom: 10, 
    textAlign: 'center' 
  },
  cardSubtitle: { 
    fontSize: 16, 
    color: '#6B7280', 
    textAlign: 'center', 
    marginBottom: 20,
    lineHeight: 22 
  },
  detectionInfo: {
    backgroundColor: '#E6F7F5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    width: '100%',
    borderWidth: 1,
    borderColor: '#009990'
  },
  detectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#009990',
    textAlign: 'center',
    marginVertical: 2
  },
  imageContainer: { 
    flexDirection: 'row', 
    marginBottom: 20,
    maxHeight: 120 
  },
  image: { 
    width: 120, 
    height: 120, 
    borderRadius: 15, 
    marginRight: 15, 
    borderWidth: 2, 
    borderColor: '#009990' 
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#009990',
    fontWeight: '600'
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic'
  },
  uploadButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#009990', 
    paddingVertical: 12, 
    paddingHorizontal: 25, 
    borderRadius: 15, 
    marginBottom: 20,
    width: '100%',
    justifyContent: 'center',
    shadowColor: '#009990',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5
  },
  uploadText: { 
    color: 'white', 
    fontWeight: 'bold', 
    marginLeft: 10,
    fontSize: 16 
  },
  submitButton: { 
    backgroundColor: '#009990', 
    paddingVertical: 15, 
    paddingHorizontal: 25, 
    borderRadius: 15, 
    alignItems: 'center', 
    width: '100%',
    shadowColor: '#009990',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5
  },
  submitText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 18 
  },
  disabledButton: { 
    backgroundColor: '#A0AEC0' 
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
  navButton: { alignItems: 'center' },
  navText: { color: 'white', fontSize: 12 },
});

export default Cleaning;