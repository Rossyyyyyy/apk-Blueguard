import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define navigation types
type RootStackParamList = {
  Login: undefined;
  Dash: undefined;
  Report: undefined;
  Notifications: undefined;
  Reports: undefined;
  Rewards: undefined;
  Knowledge: undefined;
  Profile: undefined;
};

type ReportScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Report'>;

type Props = {
  navigation: ReportScreenNavigationProp;
};

interface User {
  _id: string;
  name: string;
  email: string;
}

interface LocationState {
  latitude: number;
  longitude: number;
}

interface NavItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: keyof RootStackParamList;
}

const Report: React.FC<Props> = ({ navigation }) => {
  const [reportDetails, setReportDetails] = useState<string>("");
  const [boatName, setBoatName] = useState<string>("");
  const [comments, setComments] = useState<string>("");
  const [location, setLocation] = useState<LocationState | null>(null);
  const [address, setAddress] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          navigation.replace('Login');
          return;
        }

        const response = await fetch('http://10.120.221.103:5000/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        if (response.ok) {
          setUser(data.user);
        } else {
          console.error('Error fetching user:', data.message);
          navigation.replace('Login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigation]);

  const getLocation = async (): Promise<void> => {
    if (Platform.OS === 'web') {
      // Web geolocation
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
          getAddress(latitude, longitude);
        },
        (error) => {
          alert('Error getting location: ' + error.message);
        }
      );
    } else {
      // Mobile geolocation
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return; 
      }
      let userLocation = await Location.getCurrentPositionAsync({});
      setLocation({ 
        latitude: userLocation.coords.latitude, 
        longitude: userLocation.coords.longitude 
      });
      getAddress(userLocation.coords.latitude, userLocation.coords.longitude);
    }
  };

  const getAddress = async (latitude: number, longitude: number): Promise<void> => {
    try {
      // Use OpenStreetMap for both platforms (more reliable)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();
      setAddress(data.display_name);
    } catch (error) {
      console.error("Error fetching address: ", error);
    }
  };

  const handleReportSubmit = async (): Promise<void> => {
    if (!reportDetails.trim()) {
      alert("⚠️ Please describe the event before submitting.");
      return;
    }
  
    setIsLoading(true);
  
    let incidentType: string = "Other Illegal Activities";
    const incidents: Record<string, string[]> = {
      "Dynamite Fishing": ["dynamite", "blast", "explosion", "bomb", "exploding", "detonation"],
      "Overfishing": ["overfishing", "too many fish", "excessive catch"],
      "Poison Fishing": ["poison", "toxic", "cyanide"],
      "Illegal Net Fishing": ["fine mesh net", "illegal net", "small fish caught"],
      "Coral Destruction": ["coral damage", "reef destruction", "coral broken"],
      "Oil Spill": ["oil spill", "oil", "black water", "petroleum"],
      "Marine Debris Dumping": ["trash", "garbage", "waste in ocean"],
      "Unauthorized Fishing": ["foreign boat", "no permit", "unregistered boat"],
    };
  
    for (const [type, keywords] of Object.entries(incidents)) {
      if (keywords.some((keyword) => reportDetails.toLowerCase().includes(keyword))) {
        incidentType = type;
        break;
      }
    }
  
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('http://10.120.221.103:5000/submit-report', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          boatName,
          eventDescription: reportDetails,
          comments,
          address,
          incidentType
        })
      });
  
      const data = await response.json();
      
      if (response.ok) {
        alert(`🚨 Report submitted successfully!\n\n📌 Incident Type: ${incidentType}`);
        setReportDetails('');
        setBoatName('');
        setComments('');
        setAddress('');
        setLocation(null);
      } else {
        alert(`⚠️ Error: ${data.message}`);
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("⚠️ An error occurred while submitting the report.");
    } finally {
      setIsLoading(false);
    }
  };

  const openInGoogleMaps = () => {
    if (location) {
      const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      if (Platform.OS === 'web') {
        (window as any).open(url, '_blank');
      }
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

  // Render map based on platform
  const renderMap = () => {
    if (!location) {
      return <Text style={styles.placeholder}>📍 Location not set</Text>;
    }

    return (
      <View style={styles.webMapContainer}>
        <View style={styles.coordsWrapper}>
          <Ionicons name="location-sharp" size={24} color="#FFD700" />
          <View style={styles.coordsTextContainer}>
            <Text style={styles.coordsText}>
              📍 Lat: {location.latitude.toFixed(6)}
            </Text>
            <Text style={styles.coordsText}>
              📍 Lng: {location.longitude.toFixed(6)}
            </Text>
          </View>
        </View>
        
        {/* OpenStreetMap Embed - No API Key Required */}
        <iframe
          title="Location Map"
          width="100%"
          height="250"
          style={{ border: 0, borderRadius: '10px', marginTop: '10px' }}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude-0.01},${location.latitude-0.01},${location.longitude+0.01},${location.latitude+0.01}&layer=mapnik&marker=${location.latitude},${location.longitude}`}
          allowFullScreen
        />

        <TouchableOpacity 
          style={styles.viewMapButton}
          onPress={openInGoogleMaps}
        >
          <Ionicons name="open-outline" size={18} color="white" />
          <Text style={styles.buttonText}> Open in Google Maps</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.gradientBackground} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Ionicons name="earth" size={30} color="white" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Marine Watch Report</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FFD700" style={styles.loadingIndicator} />
      ) : (
        user && (
          <View style={styles.topBanner}>
            <Text style={styles.bannerText}>Welcome, {user.name}!</Text>
            <Text style={styles.bannerSubtext}>Help protect our marine ecosystem</Text>
          </View>
        )
      )}

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <View style={styles.formCard}>
            <View style={styles.formSection}>
              <View style={styles.labelContainer}>
                <Ionicons name="document-text" size={20} color="#009990" />
                <Text style={styles.label}> Event Description *</Text>
              </View>
              <TextInput 
                style={styles.input} 
                placeholder="Describe the marine incident in detail" 
                placeholderTextColor="#A9A9A9"
                multiline 
                numberOfLines={4}
                value={reportDetails} 
                onChangeText={setReportDetails} 
              />
            </View>

            <View style={styles.formSection}>
              <View style={styles.labelContainer}>
                <Ionicons name="boat" size={20} color="#009990" />
                <Text style={styles.label}> Boat Details</Text>
              </View>
              <TextInput 
                style={styles.input} 
                placeholder="Boat name or identifier (optional)" 
                placeholderTextColor="#A9A9A9"
                value={boatName} 
                onChangeText={setBoatName} 
              />
            </View>

            <View style={styles.formSection}>
              <View style={styles.labelContainer}>
                <Ionicons name="chatbox-ellipses" size={20} color="#009990" />
                <Text style={styles.label}> Additional Comments</Text>
              </View>
              <TextInput 
                style={styles.input} 
                placeholder="Any extra information (optional)" 
                placeholderTextColor="#A9A9A9"
                multiline 
                numberOfLines={3}
                value={comments} 
                onChangeText={setComments} 
              />
            </View>

            <View style={styles.formSection}>
              <View style={styles.labelContainer}>
                <Ionicons name="location" size={20} color="#009990" />
                <Text style={styles.label}> Location</Text>
              </View>
              
              {renderMap()}
              
              <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
                <Ionicons name="navigate" size={18} color="white" />
                <Text style={styles.buttonText}> Get Current Location</Text>
              </TouchableOpacity>

              {address && (
                <View style={styles.addressContainer}>
                  <Ionicons name="pin" size={18} color="#FFD700" />
                  <Text style={styles.address}> {address}</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleReportSubmit}
            disabled={isLoading}
          >
            <Ionicons name="alert-circle" size={24} color="white" />
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Submitting...' : 'Submit Marine Incident Report'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Analyzing incident...</Text>
        </View>
      )}

      <View style={styles.footer}>
        {navItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.navButton} onPress={() => navigation.navigate(item.screen)}>
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
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A5EB0',
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#000957',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  backButton: {
    marginRight: 15,
  },
  headerIcon: {
    marginLeft: 0,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
    flex: 1,
  },
  loadingIndicator: {
    marginTop: 20,
  },
  topBanner: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)', 
    paddingVertical: 15, 
    paddingHorizontal: 20, 
    alignItems: 'center', 
    borderRadius: 10, 
    marginHorizontal: 20, 
    marginTop: 15, 
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  bannerText: {
    fontSize: 22, 
    fontWeight: 'bold', 
    color: 'white',
  },
  bannerSubtext: {
    fontSize: 14,
    color: '#FFD700',
    marginTop: 5,
  },
  scrollContent: { 
    paddingBottom: 100, 
    paddingHorizontal: 20 
  },
  formContainer: { 
    width: '100%' 
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  formSection: {
    marginBottom: 15,
  },
  labelContainer: {
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8
  },
  label: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: 'white' 
  },
  input: {
    borderWidth: 1,
    borderColor: '#009990',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 10,
    color: '#000',
    fontSize: 16,
    minHeight: 50,
  },
  webMapContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  coordsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  coordsTextContainer: {
    marginLeft: 10,
  },
  coordsText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 4,
  },
  viewMapButton: {
    flexDirection: 'row',
    backgroundColor: '#009990',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  placeholder: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    marginTop: 10,
  },
  locationButton: {
    flexDirection: 'row',
    backgroundColor: '#4cc9c0',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  addressContainer: {
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 10,
  },
  address: { 
    color: 'white', 
    fontSize: 14,
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: { 
    color: '#000957', 
    fontWeight: 'bold', 
    fontSize: 18,
    marginLeft: 10,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
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

export default Report;