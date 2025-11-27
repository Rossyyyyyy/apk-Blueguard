import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';

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
  coords: {
    latitude: number;
    longitude: number;
  };
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
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access location was denied');
      return; 
    }
    let userLocation = await Location.getCurrentPositionAsync({});
    setLocation(userLocation);
    getAddress(userLocation.coords.latitude, userLocation.coords.longitude);
  };

  const getAddress = async (latitude: number, longitude: number): Promise<void> => {
    try {
      // Try Expo Location first
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result.length > 0) {
        const { city, region, country, street, name, postalCode } = result[0];
        const fullAddress = `${street || ''} ${name || ''}, ${city || ''}, ${region || ''}, ${country || ''}, ${postalCode || ''}`;
        setAddress(fullAddress);
      }
    } catch (error) {
      console.log("Expo geocoding failed, using fallback...");
      // Fallback to OpenStreetMap Nominatim API
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'MarineWatchApp/1.0'
            }
          }
        );
        const data = await response.json();
        
        if (data && data.display_name) {
          setAddress(data.display_name);
        } else {
          setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
      } catch (fallbackError) {
        console.error("Error fetching address from fallback: ", fallbackError);
        // Last resort: just show coordinates
        setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
    }
  };

 const handleReportSubmit = async (): Promise<void> => {
    if (!reportDetails.trim()) {
      alert("⚠️ Please describe the event before submitting.");
      return;
    }

    if (!location) {
      alert("⚠️ Please set the danger zone location on the map.");
      return;
    }
  
    setIsLoading(true);
  
    // Use AI to detect incident type
    let incidentType: string = "Other Illegal Activities";
    
    try {
      console.log('🤖 Analyzing incident type with AI...');
      const token = await AsyncStorage.getItem('token');
      
      const aiResponse = await fetch('http://10.120.221.103:5000/detect-incident-type', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventDescription: reportDetails,
          boatName: boatName,
          comments: comments
        })
      });

      const aiData = await aiResponse.json();
      
      if (aiData.success && aiData.incidentType) {
        incidentType = aiData.incidentType;
        console.log('✅ AI detected incident type:', incidentType);
      } else {
        console.log('⚠️ AI detection failed, using fallback');
        // Fallback to keyword matching
        const incidents: Record<string, string[]> = {
          "Dynamite Fishing": ["dynamite", "blast", "explosion", "bomb", "exploading", "detonation"],
          "Overfishing": ["overfishing", "too many fish", "excessive catch"],
          "Poison Fishing": ["poison", "toxic", "cyanide"],
          "Illegal Net Fishing": ["fine mesh net", "illegal net", "small fish caught"],
          "Coral Destruction": ["coral damage", "reef destruction", "coral broken"],
          "Oil Spill": ["oil spill", "Oil", "black water", "petroleum"],
          "Marine Debris Dumping": ["trash", "garbage", "waste in ocean"],
          "Unauthorized Fishing": ["foreign boat", "no permit", "unregistered boat"],
        };
      
        for (const [type, keywords] of Object.entries(incidents)) {
          if (keywords.some((keyword) => reportDetails.toLowerCase().includes(keyword))) {
            incidentType = type;
            break;
          }
        }
      }
    } catch (aiError) {
      console.error('❌ Error calling AI detection:', aiError);
      // Use fallback keyword matching
      const incidents: Record<string, string[]> = {
        "Dynamite Fishing": ["dynamite", "blast", "explosion", "bomb", "exploading", "detonation"],
        "Overfishing": ["overfishing", "too many fish", "excessive catch"],
        "Poison Fishing": ["poison", "toxic", "cyanide"],
        "Illegal Net Fishing": ["fine mesh net", "illegal net", "small fish caught"],
        "Coral Destruction": ["coral damage", "reef destruction", "coral broken"],
        "Oil Spill": ["oil spill", "Oil", "black water", "petroleum"],
        "Marine Debris Dumping": ["trash", "garbage", "waste in ocean"],
        "Unauthorized Fishing": ["foreign boat", "no permit", "unregistered boat"],
      };
    
      for (const [type, keywords] of Object.entries(incidents)) {
        if (keywords.some((keyword) => reportDetails.toLowerCase().includes(keyword))) {
          incidentType = type;
          break;
        }
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
          incidentType,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
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

  // Generate HTML for interactive map
  const getMapHTML = () => {
    if (!location) return '';
    
    const { latitude, longitude } = location.coords;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; }
          .custom-danger-marker {
            background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
            width: 40px;
            height: 40px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 8px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .danger-icon {
            width: 24px;
            height: 24px;
            transform: rotate(45deg);
            fill: white;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${latitude}, ${longitude}], 15);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);
          
          const dangerIcon = L.divIcon({
            className: 'custom-danger-marker',
            html: \`
              <div style="
                background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
                width: 40px;
                height: 40px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 4px 8px rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <svg class="danger-icon" viewBox="0 0 24 24">
                  <path d="M12 2L2 22h20L12 2zm0 5.5l6.5 12h-13L12 7.5z"/>
                  <circle cx="12" cy="17" r="1"/>
                  <rect x="11" y="11" width="2" height="4"/>
                </svg>
              </div>
            \`,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
          });
          
          const marker = L.marker([${latitude}, ${longitude}], {
            draggable: true,
            icon: dangerIcon
          }).addTo(map);
          
          marker.bindPopup(\`
            <div style="text-align: center; font-family: sans-serif;">
              <strong style="color: #cc0000; font-size: 16px;">⚠️ Danger Zone</strong>
              <p style="margin: 5px 0; font-size: 12px;">Drag to relocate</p>
            </div>
          \`).openPopup();
          
          marker.on('dragend', function(e) {
            const newLatLng = e.target.getLatLng();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'locationUpdate',
              latitude: newLatLng.lat,
              longitude: newLatLng.lng
            }));
          });
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationUpdate') {
        const newLocation: LocationState = {
          coords: {
            latitude: data.latitude,
            longitude: data.longitude
          }
        };
        setLocation(newLocation);
        getAddress(data.latitude, data.longitude);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
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
      <View style={styles.gradientBackground} />

      {/* Header */}
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
            {/* Event Description */}
            <View style={styles.formSection}>
              <View style={styles.labelContainer}>
                <Ionicons name="document-text" size={20} color="#009990" />
                <Text style={styles.label}> Event Description</Text>
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

            {/* Boat Details */}
            <View style={styles.formSection}>
              <View style={styles.labelContainer}>
                <Ionicons name="boat" size={20} color="#009990" />
                <Text style={styles.label}> Boat Details</Text>
              </View>
              <TextInput 
                style={styles.input} 
                placeholder="Boat name or identifier" 
                placeholderTextColor="#A9A9A9"
                value={boatName} 
                onChangeText={setBoatName} 
              />
            </View>

            {/* Additional Comments */}
            <View style={styles.formSection}>
              <View style={styles.labelContainer}>
                <Ionicons name="chatbox-ellipses" size={20} color="#009990" />
                <Text style={styles.label}> Additional Comments</Text>
              </View>
              <TextInput 
                style={styles.input} 
                placeholder="Any extra information" 
                placeholderTextColor="#A9A9A9"
                multiline 
                numberOfLines={3}
                value={comments} 
                onChangeText={setComments} 
              />
            </View>

            {/* Location & Map Section */}
            <View style={styles.formSection}>
              <View style={styles.labelContainer}>
                <Ionicons name="location" size={20} color="#009990" />
                <Text style={styles.label}> Danger Zone Location</Text>
              </View>
              
              <View style={styles.instructionBox}>
                <Ionicons name="information-circle" size={18} color="#FFD700" />
                <Text style={styles.instructionText}>
                  Click button below, then drag the red danger marker to exact incident location
                </Text>
              </View>

              {/* Interactive Map */}
              {location ? (
                <View style={styles.mapContainer}>
                  <WebView
                    source={{ html: getMapHTML() }}
                    style={styles.webViewMap}
                    onMessage={handleWebViewMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                  />
                </View>
              ) : (
                <View style={styles.placeholderContainer}>
                  <Ionicons name="map-outline" size={48} color="rgba(255, 255, 255, 0.5)" />
                  <Text style={styles.placeholder}>
                    No location selected - Click button below to start
                  </Text>
                </View>
              )}
              
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
            <Ionicons name="alert-circle" size={24} color={isLoading ? "#666" : "white"} />
            <Text style={[styles.submitButtonText, isLoading && styles.submitButtonTextDisabled]}>
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

      {/* Footer */}
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
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  instructionText: {
    flex: 1,
    color: '#FFD700',
    fontSize: 13,
    lineHeight: 18,
  },
  mapContainer: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#000',
  },
  webViewMap: {
    flex: 1,
  },
  placeholderContainer: {
    width: '100%',
    height: 250,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  placeholder: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  locationButton: {
    flexDirection: 'row',
    backgroundColor: '#009990',
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
    backgroundColor: '#999',
  },
  submitButtonText: { 
    color: '#000957', 
    fontWeight: 'bold', 
    fontSize: 18,
    marginLeft: 10,
  },
  submitButtonTextDisabled: {
    color: '#666',
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