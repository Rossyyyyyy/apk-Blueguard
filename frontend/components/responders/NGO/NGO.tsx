import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ImageBackground,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// API Base URL
const API_BASE_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

// Updated NGO Sidebar Component
const NGOSidebar = ({ isOpen, setIsOpen, userEmail, onLogout }: any) => {
  const navigation = useNavigation<any>();

  const navItems = [
    { label: 'Dashboard', icon: 'tachometer', route: 'NGO' },
    { label: 'Reports', icon: 'file-text', route: 'NGOReports' },
    { label: 'Ongoing Reports', icon: 'spinner', route: 'NGOOngoing' },
    { label: 'Completed', icon: 'check-circle', route: 'NGOCompleted' },
    { label: 'Settings', icon: 'cog', route: 'NGOSettings' },
    { label: 'Messages', icon: 'envelope', route: 'NGOMessages' },
  ];

  const handleNavigation = (route: string) => {
    navigation.navigate(route);
    setIsOpen(false);
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsOpen(false)}
    >
      <TouchableOpacity 
        style={styles.sidebarOverlay}
        activeOpacity={1}
        onPress={() => setIsOpen(false)}
      >
        <View style={styles.overlayBackground} />
      </TouchableOpacity>

      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Icon name="life-ring" size={28} color="#fff" />
          <Text style={styles.sidebarTitle}>NGO Management</Text>
        </View>

        <ScrollView 
          style={styles.sidebarMenu}
          showsVerticalScrollIndicator={false}
        >
          {navItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => handleNavigation(item.route)}
              activeOpacity={0.7}
            >
              <Icon name={item.icon} size={20} color="#fff" />
              <Text style={styles.menuText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {userEmail && (
          <View style={styles.userEmailContainer}>
            <Text style={styles.userEmailLabel}>Logged in as:</Text>
            <Text style={styles.userEmailText} numberOfLines={1}>
              {userEmail}
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <Icon name="sign-out" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// Main NGO Component
const NGO = () => {
  const navigation = useNavigation<any>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [allReports, setAllReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [mapKey, setMapKey] = useState(0);

  // Sample data for NGO reporting
  const ngoData = [
    { name: 'Education', reports: 40, color: '#4E79A7', legendFontColor: '#495057', legendFontSize: 13 },
    { name: 'Health', reports: 30, color: '#F28E2B', legendFontColor: '#495057', legendFontSize: 13 },
    { name: 'Environment', reports: 20, color: '#E15759', legendFontColor: '#495057', legendFontSize: 13 },
    { name: 'Disaster Relief', reports: 10, color: '#76B7B2', legendFontColor: '#495057', legendFontSize: 13 },
  ];

  const reportTrends = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [12, 15, 10, 18, 20, 25],
      },
    ],
  };

  const barChartData = {
    labels: ['Education', 'Health', 'Environment', 'Disaster'],
    datasets: [
      {
        data: [40, 30, 20, 10],
      },
    ],
  };

  const recentActivities = [
    { id: 1, activity: 'Report submitted for Education project', date: '2023-10-01' },
    { id: 2, activity: 'Health campaign launched', date: '2023-10-05' },
    { id: 3, activity: 'Environment cleanup drive completed', date: '2023-10-10' },
    { id: 4, activity: 'Disaster relief funds allocated', date: '2023-10-15' },
  ];

  const upcomingEvents = [
    { id: 1, event: 'Education workshop', date: '2023-11-01' },
    { id: 2, event: 'Health awareness camp', date: '2023-11-05' },
    { id: 3, event: 'Tree plantation drive', date: '2023-11-10' },
  ];

  useEffect(() => {
    checkAuth();
    fetchAllNGOReports();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const responderType = await AsyncStorage.getItem('responderType');
      const email = await AsyncStorage.getItem('userEmail');

      if (!token || responderType !== 'ngo') {
        Alert.alert('Access Denied', 'You must be an NGO responder to access this page.');
        navigation.replace('Login');
        return;
      }

      if (email) {
        setUserEmail(email);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const fetchAllNGOReports = async () => {
    try {
      setIsLoadingReports(true);
      const token = await AsyncStorage.getItem('authToken');

      // Fetch pending reports
      const pendingResponse = await fetch(`${API_BASE_URL}/api/ngo-reports`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Fetch ongoing reports
      const ongoingResponse = await fetch(`${API_BASE_URL}/api/ongoing-reports?responderType=NGO`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Fetch completed reports
      const completedResponse = await fetch(`${API_BASE_URL}/api/completed-reports-ngo`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const pendingData = await pendingResponse.json();
      const ongoingData = await ongoingResponse.json();
      const completedData = await completedResponse.json();

      // Combine all reports with status tags
      const pending = Array.isArray(pendingData) ? pendingData.map((r: any) => ({ ...r, status: 'Pending' })) : [];
      const ongoing = Array.isArray(ongoingData) ? ongoingData.map((r: any) => ({ ...r, status: 'Ongoing' })) : [];
      const completed = Array.isArray(completedData) ? completedData.map((r: any) => ({ ...r, status: 'Completed' })) : [];

      const combined = [...pending, ...ongoing, ...completed];
      
      // DEBUG: Log the actual structure of reports
      console.log('📊 TOTAL REPORTS:', combined.length);
      if (combined.length > 0) {
        console.log('🔍 SAMPLE REPORT STRUCTURE:', JSON.stringify(combined[0], null, 2));
        console.log('🗝️ REPORT KEYS:', Object.keys(combined[0]));
      }
      
      // Geocode addresses to get coordinates (with delay to avoid rate limiting)
      const reportsWithCoords = [];
      for (let i = 0; i < combined.length; i++) {
        const report = combined[i];
        
        // Check for existing coordinates
        const lat = report.latitude || report.lat || report.location?.latitude || report.location?.lat;
        const lng = report.longitude || report.lng || report.location?.longitude || report.location?.lng;
        
        if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
          console.log('✅ Report has coordinates:', report.type || report.incidentType);
          reportsWithCoords.push({
            ...report,
            latitude: parseFloat(lat),
            longitude: parseFloat(lng)
          });
          continue;
        }
        
        // If no coordinates, try to geocode the address
        if (report.address && report.address.trim()) {
          console.log(`🔄 Geocoding address ${i + 1}/${combined.length}:`, report.address);
          try {
            // Add delay to respect rate limits (1 second between requests)
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Try Nominatim first (no API key needed)
            let coords = await geocodeWithNominatim(report.address);
            
            if (coords) {
              console.log('✅ Geocoded successfully:', coords);
              reportsWithCoords.push({
                ...report,
                latitude: coords.lat,
                longitude: coords.lng
              });
            } else {
              console.warn('⚠️ Geocoding failed, using Taguig center');
              reportsWithCoords.push({
                ...report,
                latitude: 14.5176,
                longitude: 121.0509
              });
            }
          } catch (error) {
            console.error('❌ Geocoding failed for:', report.address, error);
            // Use Taguig center as fallback
            reportsWithCoords.push({
              ...report,
              latitude: 14.5176,
              longitude: 121.0509
            });
          }
        } else {
          console.warn('⚠️ No address for report:', report._id);
          reportsWithCoords.push(report);
        }
      }
      
      // Filter reports that have valid coordinates
      const validReports = reportsWithCoords.filter(r => 
        r.latitude && r.longitude && 
        !isNaN(r.latitude) && !isNaN(r.longitude)
      );
      
      // Add slight offsets to markers with identical coordinates so they're all visible
      const offsetAmount = 0.0015; // About 150 meters
      const coordsCount: { [key: string]: number } = {};
      
      const reportsWithOffsets = validReports.map(report => {
        const coordKey = `${report.latitude.toFixed(4)},${report.longitude.toFixed(4)}`;
        
        if (coordsCount[coordKey] === undefined) {
          coordsCount[coordKey] = 0;
        } else {
          coordsCount[coordKey]++;
          // Apply offset in a circular pattern
          const angle = (coordsCount[coordKey] * Math.PI * 2) / 8; // Divide circle into 8 sections
          const latOffset = Math.cos(angle) * offsetAmount;
          const lngOffset = Math.sin(angle) * offsetAmount;
          
          console.log(`🎯 Applying offset to marker #${coordsCount[coordKey]} at ${coordKey}`);
          
          return {
            ...report,
            latitude: report.latitude + latOffset,
            longitude: report.longitude + lngOffset
          };
        }
        
        return report;
      });
      
      console.log(`📍 Final count: ${reportsWithOffsets.length} reports with valid coordinates`);
      setAllReports(reportsWithOffsets);
      setMapKey(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching NGO reports:', error);
      Alert.alert('Error', 'Failed to load reports for map');
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Geocode using OpenStreetMap Nominatim (no API key required)
  const geocodeWithNominatim = async (address: string): Promise<{lat: number, lng: number} | null> => {
    try {
      // Clean address
      let cleanAddress = address.trim();
      
      // Try to geocode the FULL address first for better accuracy
      const encodedAddress = encodeURIComponent(cleanAddress);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=ph`;
      
      console.log('🌐 Nominatim URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NGO-Reports-App/1.0',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('❌ Nominatim HTTP error:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const location = data[0];
        console.log('✅ Nominatim geocoded:', { lat: parseFloat(location.lat), lng: parseFloat(location.lon) });
        return {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lon)
        };
      }
      
      // If full address fails, try with just city as fallback
      if (cleanAddress.toLowerCase().includes('taguig')) {
        console.log('🔄 Trying with city only...');
        const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=Taguig,Metro Manila,Philippines&limit=1&countrycodes=ph`;
        const fallbackResponse = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'NGO-Reports-App/1.0',
            'Accept': 'application/json'
          }
        });
        
        const fallbackData = await fallbackResponse.json();
        if (fallbackData && fallbackData.length > 0) {
          const location = fallbackData[0];
          return {
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lon)
          };
        }
      }
      
      console.warn('⚠️ Nominatim: No results found');
      return null;
    } catch (error) {
      console.error('❌ Nominatim error:', error);
      return null;
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userEmail', 'responderType']);
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Generate enhanced map HTML with Google Maps
  const getMapHTML = () => {
    if (allReports.length === 0) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .placeholder {
              text-align: center;
              color: white;
              padding: 20px;
            }
            .placeholder h3 {
              font-size: 24px;
              margin-bottom: 10px;
            }
            .placeholder p {
              font-size: 16px;
              opacity: 0.9;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="placeholder">
            <div class="icon">📍</div>
            <h3>No Reports Yet</h3>
            <p>Reports will appear on the map once submitted</p>
          </div>
        </body>
        </html>
      `;
    }

    // Calculate center point - use Philippines center as fallback
    const avgLat = allReports.reduce((sum, r) => sum + r.latitude, 0) / allReports.length || 14.5995;
    const avgLng = allReports.reduce((sum, r) => sum + r.longitude, 0) / allReports.length || 120.9842;

    const markersData = allReports.map(report => ({
      lat: report.latitude,
      lng: report.longitude,
      status: report.status || 'Pending',
      type: report.type || report.incidentType || 'Unknown',
      address: report.address || 'Unknown location',
      reportedBy: report.reportedBy || 'Anonymous',
      date: report.dateReported || report.createdAt ? new Date(report.dateReported || report.createdAt).toLocaleDateString() : 'Unknown'
    }));

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
          crossorigin=""/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
          crossorigin=""></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { height: 100%; width: 100%; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          
          .leaflet-popup-content-wrapper {
            border-radius: 12px;
            box-shadow: 0 3px 14px rgba(0,0,0,0.4);
          }
          
          .leaflet-popup-content {
            margin: 15px;
            font-size: 14px;
            line-height: 1.6;
            min-width: 200px;
          }
          
          .popup-header {
            font-weight: bold;
            color: #0077b6;
            margin-bottom: 10px;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .popup-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            color: white;
            text-transform: uppercase;
            margin-bottom: 10px;
          }
          
          .status-pending { background: #FF9800; }
          .status-ongoing { background: #2196F3; }
          .status-completed { background: #4CAF50; }
          
          .popup-info {
            font-size: 13px;
            line-height: 1.8;
            color: #333;
          }
          
          .popup-info strong {
            color: #0077b6;
          }

          /* Custom marker styles */
          .custom-marker {
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 3px 10px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }
          
          .marker-pending { background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); }
          .marker-ongoing { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); }
          .marker-completed { background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%); }
          
          .marker-icon {
            width: 14px;
            height: 14px;
            transform: rotate(45deg);
            background: white;
            border-radius: 50%;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          console.log('Initializing Leaflet map...');
          
          // Create map
          const map = L.map('map').setView([${avgLat}, ${avgLng}], 13);
          
          // Add OpenStreetMap tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            minZoom: 3
          }).addTo(map);

          // Markers data
          const markersData = ${JSON.stringify(markersData)};
          console.log('Total markers to add:', markersData.length);

          // Add markers
          const bounds = [];
          markersData.forEach((marker, index) => {
            const statusClass = marker.status.toLowerCase();
            
            // Create custom icon
            const icon = L.divIcon({
              className: 'custom-div-icon',
              html: \`
                <div class="custom-marker marker-\${statusClass}">
                  <div class="marker-icon"></div>
                </div>
              \`,
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32]
            });

            // Create popup content
            const popupContent = \`
              <div>
                <div class="popup-header">
                  📍 \${marker.type}
                </div>
                <span class="popup-status status-\${statusClass}">\${marker.status}</span>
                <div class="popup-info">
                  <strong>📍 Location:</strong><br>
                  \${marker.address}<br><br>
                  <strong>👤 Reported by:</strong><br>
                  \${marker.reportedBy}<br><br>
                  <strong>📅 Date:</strong><br>
                  \${marker.date}
                </div>
              </div>
            \`;

            // Add marker
            const leafletMarker = L.marker([marker.lat, marker.lng], { icon: icon })
              .addTo(map)
              .bindPopup(popupContent);

            bounds.push([marker.lat, marker.lng]);
            
            console.log(\`Added marker \${index + 1}: \${marker.type} at [\${marker.lat}, \${marker.lng}]\`);
          });

          // Fit map to show all markers
          if (bounds.length > 0) {
            const leafletBounds = L.latLngBounds(bounds);
            map.fitBounds(leafletBounds, { 
              padding: [50, 50],
              maxZoom: 15
            });
          }

          // Force map to invalidate size after load
          setTimeout(() => {
            map.invalidateSize();
            console.log('✅ Map initialized successfully with', markersData.length, 'markers');
          }, 100);
        </script>
      </body>
      </html>
    `;
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 119, 182, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#0077b6',
    },
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.hamburger}
        onPress={() => setIsSidebarOpen(true)}
        activeOpacity={0.7}
      >
        <Icon name="bars" size={24} color="#0077b6" />
      </TouchableOpacity>

      <NGOSidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      <ScrollView style={styles.main}>
        <ImageBackground
          source={require('../../../assets/ocean-bg.jpg')}
          style={styles.backgroundImage}
          imageStyle={{ opacity: 0.3 }}
        >
          <View style={styles.content}>
            <Text style={styles.title}>NGO Analytics Dashboard</Text>

            {/* Reports Map Section */}
            <View style={styles.mapCard}>
              <View style={styles.chartHeader}>
                <Icon name="map-marker" size={20} color="#0077b6" />
                <Text style={styles.chartTitle}>NGO Reports Map (OpenStreetMap)</Text>
              </View>
              
              {/* Legend */}
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                  <Text style={styles.legendText}>Pending</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
                  <Text style={styles.legendText}>Ongoing</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.legendText}>Completed</Text>
                </View>
              </View>

              {isLoadingReports ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0077b6" />
                  <Text style={styles.loadingText}>Loading reports map...</Text>
                </View>
              ) : (
                <View style={styles.mapContainer}>
                  <WebView
                    key={mapKey}
                    source={{ html: getMapHTML() }}
                    style={styles.webViewMap}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    originWhitelist={['*']}
                    mixedContentMode="always"
                    onError={(syntheticEvent) => {
                      const { nativeEvent } = syntheticEvent;
                      console.error('WebView error:', nativeEvent);
                    }}
                    onMessage={(event) => {
                      console.log('WebView message:', event.nativeEvent.data);
                    }}
                    onLoad={() => console.log('Map WebView loaded')}
                    startInLoadingState={true}
                    renderLoading={() => (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0077b6" />
                      </View>
                    )}
                  />
                </View>
              )}
              
              <Text style={styles.mapSubtext}>
                📍 Total: {allReports.length} | 
                Pending: {allReports.filter(r => r.status === 'Pending').length} | 
                Ongoing: {allReports.filter(r => r.status === 'Ongoing').length} | 
                Completed: {allReports.filter(r => r.status === 'Completed').length}
              </Text>
            </View>

            {/* Quick Stats Section */}
            <View style={styles.quickStats}>
              <View style={[styles.statCard, { backgroundColor: '#d4edda' }]}>
                <View style={styles.statIcon}>
                  <Icon name="file-text" size={28} color="#28a745" />
                </View>
                <Text style={styles.statValue}>{allReports.length}</Text>
                <Text style={styles.statLabel}>Total Reports</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#d1ecf1' }]}>
                <View style={styles.statIcon}>
                  <Icon name="folder-open" size={28} color="#17a2b8" />
                </View>
                <Text style={styles.statValue}>15</Text>
                <Text style={styles.statLabel}>Active Projects</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#fff3cd' }]}>
                <View style={styles.statIcon}>
                  <Icon name="calendar" size={28} color="#ffc107" />
                </View>
                <Text style={styles.statValue}>3</Text>
                <Text style={styles.statLabel}>Upcoming Events</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#f8d7da' }]}>
                <View style={styles.statIcon}>
                  <Icon name="users" size={28} color="#dc3545" />
                </View>
                <Text style={styles.statValue}>50</Text>
                <Text style={styles.statLabel}>Volunteers</Text>
              </View>
            </View>

            {/* Report Distribution Pie Chart */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Icon name="pie-chart" size={20} color="#0077b6" />
                <Text style={styles.chartTitle}>Report Distribution by Category</Text>
              </View>
              <PieChart
                data={ngoData}
                width={width - 60}
                height={220}
                chartConfig={chartConfig}
                accessor="reports"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
              />
            </View>

            {/* Reports by Category Bar Chart */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Icon name="bar-chart" size={20} color="#0077b6" />
                <Text style={styles.chartTitle}>Reports by Category</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={barChartData}
                  width={Math.max(width - 60, 400)}
                  height={220}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  fromZero
                  showValuesOnTopOfBars
                  yAxisLabel=""
                  yAxisSuffix=""
                />
              </ScrollView>
            </View>

            {/* Monthly Report Trends Line Chart */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Icon name="line-chart" size={20} color="#0077b6" />
                <Text style={styles.chartTitle}>Monthly Report Trends</Text>
              </View>
              <LineChart
                data={reportTrends}
                width={width - 60}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={true}
                yAxisLabel=""
                yAxisSuffix=""
              />
            </View>

            {/* Recent Activities Section */}
            <View style={styles.activitiesCard}>
              <View style={styles.sectionHeader}>
                <Icon name="history" size={20} color="#0077b6" />
                <Text style={styles.sectionTitle}>Recent Activities</Text>
              </View>
              <View style={styles.activityList}>
                {recentActivities.map((activity) => (
                  <View key={activity.id} style={styles.activityItem}>
                    <View style={styles.activityDot} />
                    <View style={styles.activityContent}>
                      <Text style={styles.activityText}>{activity.activity}</Text>
                      <Text style={styles.activityDate}>{activity.date}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Upcoming Events Section */}
            <View style={styles.eventsCard}>
              <View style={styles.sectionHeader}>
                <Icon name="calendar-check-o" size={20} color="#0077b6" />
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
              </View>
              <View style={styles.eventList}>
                {upcomingEvents.map((event) => (
                  <View key={event.id} style={styles.eventItem}>
                    <View style={styles.eventDateContainer}>
                      <Icon name="calendar" size={16} color="#0077b6" />
                      <Text style={styles.eventDate}>{event.date}</Text>
                    </View>
                    <Text style={styles.eventText}>{event.event}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={[styles.actionCard, { backgroundColor: '#e3f2fd' }]}
                  onPress={() => navigation.navigate('NGOReports')}
                  activeOpacity={0.8}
                >
                  <Icon name="plus-circle" size={32} color="#2196F3" />
                  <Text style={styles.actionText}>New Report</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, { backgroundColor: '#f3e5f5' }]}
                  onPress={() => navigation.navigate('NGOProjects')}
                  activeOpacity={0.8}
                >
                  <Icon name="folder-open" size={32} color="#9C27B0" />
                  <Text style={styles.actionText}>View Projects</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, { backgroundColor: '#e8f5e9' }]}
                  onPress={() => navigation.navigate('NGOEvents')}
                  activeOpacity={0.8}
                >
                  <Icon name="calendar" size={32} color="#4CAF50" />
                  <Text style={styles.actionText}>Manage Events</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, { backgroundColor: '#fff3e0' }]}
                  onPress={() => navigation.navigate('NGOVolunteers')}
                  activeOpacity={0.8}
                >
                  <Icon name="users" size={32} color="#FF9800" />
                  <Text style={styles.actionText}>Volunteers</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ImageBackground>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  hamburger: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 100,
    padding: 12,
    backgroundColor: 'transparent',
    borderRadius: 5,
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: '#000957',
    zIndex: 100,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  sidebarMenu: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  menuText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 10,
  },
  userEmailContainer: {
    marginBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  userEmailLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 5,
  },
  userEmailText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 5,
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 10,
  },
  main: {
    flex: 1,
    marginTop: 60,
  },
  backgroundImage: {
    flex: 1,
    minHeight: height,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0077b6',
    textAlign: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapContainer: {
    width: '100%',
    height: 450,
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 10,
    borderWidth: 2,
    borderColor: '#0077b6',
    backgroundColor: '#f5f5f5',
  },
  webViewMap: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    height: 450,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginVertical: 10,
  },
  loadingText: {
    marginTop: 10,
    color: '#0077b6',
    fontSize: 14,
    fontWeight: '600',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  mapSubtext: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  quickStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 56) / 2,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '600',
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0077b6',
    marginLeft: 8,
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
  },
  activitiesCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0077b6',
    marginLeft: 8,
  },
  activityList: {
    gap: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0077b6',
    marginRight: 12,
    marginTop: 4,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 13,
    color: '#6c757d',
  },
  eventsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventList: {
    gap: 16,
  },
  eventItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  eventDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 13,
    color: '#6c757d',
    marginLeft: 8,
  },
  eventText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
  quickActions: {
    marginBottom: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  actionCard: {
    width: (width - 56) / 2,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default NGO;