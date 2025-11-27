import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Image, Alert, 
  ActivityIndicator, TextInput, Modal, Platform, ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define navigation types
type RootStackParamList = {
  Login: undefined;
  Dash: undefined;
  Donation: undefined;
  Notifications: undefined;
  Reports: undefined;
  Rewards: undefined;
  Knowledge: undefined;
  Profile: undefined;
};

type DonationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Donation'>;

type Props = {
  navigation: DonationScreenNavigationProp;
};

interface NavItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: keyof RootStackParamList;
}

// Define the available waste types for the selection grid
const WASTE_TYPES = ['Plastic', 'Glass', 'Metal', 'Paper', 'E-Waste', 'Others'];

const Donation: React.FC<Props> = ({ navigation }) => {
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null); // ✅ NEW: Store base64
  const [loading, setLoading] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("Kaibigan");
  const [wasteType, setWasteType] = useState<string>("");
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [otherWasteText, setOtherWasteText] = useState<string>("");

  const API_BASE_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

  // Helper function to get the appropriate icon for the waste type
  const getWasteIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'Plastic':
        return 'trash-outline'; 
      case 'Glass':
        return 'flask-outline';
      case 'Metal':
        return 'settings-outline'; 
      case 'Paper':
        return 'document-text-outline';
      case 'E-Waste':
        return 'desktop-outline'; 
      default:
        return 'leaf-outline';
    }
  };

  // ✅ NEW: Function to convert image URI to base64
  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Remove the data URL prefix to get just the base64 string
          const base64 = base64data.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  };

  // Fetch the user's name
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

        const data = await response.json();
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

  // ✅ FIXED: Image picker with base64 conversion
  const pickImage = async () => {
    if (loading) return;
    
    try {
      // Request media library permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Sorry, we need gallery permissions to upload images.');
        return;
      }

      setLoading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7, // Reduced quality for smaller file size
        base64: true, // ✅ Enable base64 in picker
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        
        console.log('📸 Image selected:', {
          uri: selectedImage.uri,
          hasBase64: !!selectedImage.base64,
          width: selectedImage.width,
          height: selectedImage.height
        });

        // Set display URI
        setImage(selectedImage.uri);

        // ✅ Convert to base64 with data URL prefix
        let base64String: string;
        
        if (selectedImage.base64) {
          // Use base64 from picker if available
          base64String = `data:image/jpeg;base64,${selectedImage.base64}`;
        } else {
          // Fallback: convert URI to base64
          const base64 = await convertImageToBase64(selectedImage.uri);
          base64String = `data:image/jpeg;base64,${base64}`;
        }

        setImageBase64(base64String);
        console.log('✅ Image converted to base64, length:', base64String.length);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Submit donation with base64 image
  const submitDonation = async () => {
    const finalWasteType = wasteType === 'Others' ? otherWasteText : wasteType;

    if (!imageBase64 || !finalWasteType) {
      Alert.alert("Error", "Please upload an image and specify the type of waste.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const userResponse = await fetch(`${API_BASE_URL}/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const userData = await userResponse.json();
      if (!userResponse.ok) {
        Alert.alert("Error", "Could not verify user. Please log in again.");
        navigation.replace('Login');
        return;
      }

      const userEmail = userData.user?.email || "unknown@example.com";

      console.log('📤 Submitting donation:', {
        userName,
        userEmail,
        wasteType: finalWasteType,
        imageLength: imageBase64.length,
        imagePrefix: imageBase64.substring(0, 50)
      });

      // ✅ Prepare the donation data with base64 image
      const donationData = {
        userName: userName,
        email: userEmail,
        image: imageBase64, // ✅ Send base64 instead of file URI
        wasteType: finalWasteType,
      };

      // Send the donation data to the backend
      const saveResponse = await fetch(`${API_BASE_URL}/save-donation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(donationData),
      });

      const saveResult = await saveResponse.json();
      
      if (saveResponse.ok) {
        console.log('✅ Donation submitted successfully');
        
        Alert.alert(
          'Success! 🥳',
          `Awesome job, ${userName}! Your donation of ${finalWasteType} has been submitted. Every bit helps! 🌍💙`
        );
        
        // Reset state after successful submission
        setImage(null);
        setImageBase64(null);
        setWasteType("");
        setOtherWasteText("");
        setCurrentStep(1);
      } else {
        console.error('❌ Donation submission failed:', saveResult);
        Alert.alert("Error", saveResult.message || "Failed to save donation data. Please try again.");
      }
    } catch (error) {
      console.error('❌ Error submitting donation:', error);
      Alert.alert("Error", "An unexpected error occurred. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDonation = () => {
    const finalWasteType = wasteType === 'Others' ? otherWasteText : wasteType;
    if (imageBase64 && finalWasteType) {
        setShowWarning(true);
    } else {
        Alert.alert("Hold On", "Please complete all steps (select waste type and upload image) before submitting.");
    }
  };

  const confirmDonation = async () => {
    setShowWarning(false);
    await submitDonation();
  };

  // --- UI Rendering Helpers ---

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      <View style={[styles.stepLine, currentStep > 1 && styles.activeStepLine]} />
      <View style={[styles.stepLine, currentStep > 2 && styles.activeStepLine]} />
      {[1, 2, 3].map((step) => (
        <View key={step} style={[
          styles.stepCircle,
          step <= currentStep && styles.activeStepCircle
        ]}>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </View>
  );

  const renderContent = () => {
    const finalWasteType = wasteType === 'Others' ? otherWasteText : wasteType;

    switch (currentStep) {
      case 1:
        return (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>1. Select Waste Category</Text>
            <View style={styles.wasteTypeGrid}>
              {WASTE_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeButton, wasteType === type && styles.selectedTypeButton]}
                  onPress={() => { 
                    setWasteType(type);
                    if (type !== 'Others') setOtherWasteText("");
                  }}
                >
                  <Ionicons 
                    name={getWasteIcon(type)} 
                    size={30} 
                    color={wasteType === type ? 'white' : '#009990'} 
                  />
                  <Text style={[styles.typeButtonText, wasteType === type && styles.selectedTypeButtonText]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {wasteType === 'Others' && (
              <TextInput
                style={[styles.input, {marginTop: 10}]}
                placeholder="Specify the type of waste here..."
                placeholderTextColor="#999"
                value={otherWasteText}
                onChangeText={setOtherWasteText}
              />
            )}
            <TouchableOpacity
              style={[styles.nextStepButton, (!finalWasteType) && styles.disabledButton]}
              onPress={() => finalWasteType && setCurrentStep(2)}
              disabled={!finalWasteType}
            >
              <Text style={styles.submitText}>Next: Upload Photo <Ionicons name="arrow-forward" size={16} color="white" /></Text>
            </TouchableOpacity>
          </View>
        );
      case 2:
        return (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>2. Upload Waste Photo</Text>
            
            {image ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image }} style={styles.image} />
                <TouchableOpacity style={styles.changeImageButton} onPress={pickImage} disabled={loading}>
                  <Ionicons name="repeat-outline" size={20} color="white" />
                  <Text style={styles.changeImageText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={30} color="white" />
                    <Text style={styles.uploadText}>Select Image from Gallery</Text>
                    <Text style={styles.uploadHint}>Tap here to choose your recyclable waste photo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.nextStepButton, !imageBase64 && styles.disabledButton]}
              onPress={() => imageBase64 && setCurrentStep(3)}
              disabled={!imageBase64}
            >
              <Text style={styles.submitText}>Next: Review & Submit <Ionicons name="arrow-forward" size={16} color="white" /></Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep(1)}>
              <Text style={styles.backButtonText}><Ionicons name="arrow-back" size={14} color="#0A5EB0" /> Back to Step 1</Text>
            </TouchableOpacity>
          </View>
        );
      case 3:
        return (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>3. Review & Submit</Text>
            <View style={styles.reviewBox}>
              <Text style={styles.reviewLabel}>Donor:</Text>
              <Text style={styles.reviewValue}>{userName}</Text>
              
              <Text style={styles.reviewLabel}>Waste Type:</Text>
              <Text style={styles.reviewValue}>{finalWasteType}</Text>
              
              <Text style={styles.reviewLabel}>Image Preview:</Text>
              {image && <Image source={{ uri: image }} style={styles.imageReview} />}
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitDonation}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitText}>CONFIRM & SUBMIT DONATION</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep(2)}>
              <Text style={styles.backButtonText}><Ionicons name="arrow-back" size={14} color="#0A5EB0" /> Back to Image Upload</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
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
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="earth" size={30} color="white" />
        <Text style={styles.headerTitle}>BlueGuard</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false}>
        {/* Card Container */}
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Ionicons name="leaf-outline" size={50} color="#009990" />
            <Text style={styles.cardTitle}>Recycling Donation</Text>
            <Text style={styles.cardSubtitle}>Help the environment and earn rewards!</Text>
            
            {/* Step Indicator */}
            {renderStepIndicator()}
            
            {/* Dynamic Content */}
            {renderContent()}

          </View>
        </View>
      </ScrollView>

      {/* WARNING MODAL */}
      <Modal
        visible={showWarning}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWarning(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="alert-circle" size={40} color="#FF9800" style={{marginBottom: 10}} />
            <Text style={styles.modalTitle}>Commitment to Genuineness</Text>
            <Text style={styles.modalText}>
              Please ensure your submission is for **real recyclable waste** that can help our community. 
              Donations must be genuine and not a form of play. Misuse may result in penalties. 
              Thank you for being serious about helping the world! ♻️
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={confirmDonation}>
              <Text style={styles.modalButtonText}>I Confirm My Donation is Real</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalCancelButton]} 
              onPress={() => setShowWarning(false)}
            >
              <Text style={styles.modalButtonText}>Cancel / Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <View style={styles.footer}>
        {navItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.navButton} 
            onPress={() => navigation.navigate(item.screen as any)}
          >
            <Ionicons name={item.icon} size={24} color={item.screen === 'Donation' ? '#009990' : 'white'} />
            <Text style={[styles.navText, item.screen === 'Donation' && styles.activeNavText]}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0A5EB0' 
  },
  scrollContainer: {
    paddingBottom: 100, 
    flexGrow: 1,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
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
    paddingHorizontal: 15, 
    paddingVertical: 20,
  },
  card: { 
    backgroundColor: 'white', 
    borderRadius: 15, 
    padding: 25, 
    alignItems: 'center', 
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cardTitle: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#006666', 
    marginBottom: 5, 
    textAlign: 'center',
    marginTop: 10
  },
  cardSubtitle: { 
    fontSize: 14, 
    color: '#555', 
    textAlign: 'center', 
    marginBottom: 20 
  },

  // --- Step Indicator ---
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '90%',
    marginBottom: 30,
    marginTop: 10,
    position: 'relative',
  },
  stepCircle: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    zIndex: 10,
  },
  activeStepCircle: {
    backgroundColor: '#0A5EB0', 
  },
  stepText: {
    color: 'white',
    fontWeight: 'bold',
  },
  stepLine: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#ddd',
    top: 15.5,
    width: '33%',
  },
  activeStepLine: {
    backgroundColor: '#0A5EB0',
  },

  // --- Step Content ---
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000957',
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#eee',
    paddingBottom: 5,
    width: '100%',
    textAlign: 'center',
  },

  // Step 1: Waste Type Grid
  wasteTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
  },
  typeButton: {
    width: '30%', 
    aspectRatio: 1, 
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0faff', 
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#eee',
    padding: 5,
    elevation: 1,
  },
  selectedTypeButton: {
    backgroundColor: '#009990', 
    borderColor: '#006666', 
    shadowColor: '#006666',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  typeButtonText: {
    fontSize: 12,
    marginTop: 5,
    fontWeight: '600',
    color: '#009990',
    textAlign: 'center',
  },
  selectedTypeButtonText: {
    color: 'white',
  },

  // Step 2: Image Upload
  uploadButton: { 
    backgroundColor: '#009990', 
    borderRadius: 15, 
    paddingVertical: 30, 
    alignItems: 'center', 
    width: '100%',
    marginBottom: 15,
    borderStyle: 'dashed',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
    elevation: 3,
  },
  uploadText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 18,
    marginTop: 5,
  },
  uploadHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  image: { 
    width: '100%', 
    height: 180, 
    borderRadius: 10, 
    borderWidth: 4, 
    borderColor: '#009990', 
    resizeMode: 'cover',
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#006666',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginTop: -20, 
    zIndex: 10,
    elevation: 5,
  },
  changeImageText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 12,
  },

  // Step 3: Review & Submit
  reviewBox: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f0faff',
    borderLeftWidth: 5,
    borderLeftColor: '#0A5EB0',
    marginBottom: 20,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 5,
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000957',
    marginBottom: 10,
  },
  imageReview: {
    width: 100,
    height: 100,
    borderRadius: 5,
    marginTop: 5,
    borderColor: '#ccc',
    borderWidth: 1,
  },

  // General Buttons/Inputs
  input: { 
    width: '100%', 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 10, 
    padding: 12, 
    marginBottom: 15,
    fontSize: 14,
    backgroundColor: '#f8f8f8',
  },
  nextStepButton: {
    backgroundColor: '#0A5EB0', 
    paddingVertical: 14, 
    borderRadius: 10, 
    alignItems: 'center', 
    width: '100%',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButton: { 
    backgroundColor: '#006666', 
    paddingVertical: 14, 
    borderRadius: 10, 
    alignItems: 'center', 
    width: '100%',
  },
  submitText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 16,
    marginHorizontal: 5,
  },
  disabledButton: { 
    backgroundColor: '#888' 
  },
  backButton: {
    marginTop: 15,
  },
  backButtonText: {
    color: '#0A5EB0', 
    fontSize: 14,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000957',
    width: '100%',
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#1A1A57',
  },
  navButton: { 
    alignItems: 'center' 
  },
  navText: { 
    color: 'white', 
    fontSize: 12 
  },
  activeNavText: {
    color: '#009990',
    fontWeight: 'bold',
  },

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    elevation: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000957',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    color: '#444',
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#009990',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalCancelButton: {
    backgroundColor: '#666',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Donation;