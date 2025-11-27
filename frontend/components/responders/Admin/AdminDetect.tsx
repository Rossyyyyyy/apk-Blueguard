import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = "https://apk-blueguard-rosssyyy.onrender.com";

interface DetectionResult {
  recyclable?: string[];
  non_recyclable?: string[];
  hazardous?: string[];
  saved_image?: string;
}

interface AdminDetectProps {
  navigation: any;
}

export default function AdminDetect({ navigation }: AdminDetectProps) {
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Request permissions on mount
  React.useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
          Alert.alert(
            "Permission Required",
            "Sorry, we need camera roll permissions to make this work!"
          );
        }
      }
    })();
  }, []);

  const showAlert = (title: string, message: string, buttons?: any[]) => {
    if (Platform.OS === 'web') {
      if (title === 'Logout') {
        setShowLogoutConfirm(true);
      } else {
        const shouldNavigate = window.confirm(`${title}\n\n${message}`);
        if (shouldNavigate && buttons && buttons[0]?.onPress) {
          buttons[0].onPress();
        }
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  const handleFileChange = async () => {
    try {
      if (Platform.OS === "web") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (file) {
            setSelectedFile({
              uri: URL.createObjectURL(file),
              name: file.name,
              type: file.type,
            });
          }
        };
        input.click();
      } else {
        const pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 1,
        });

        if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
          const asset = pickerResult.assets[0];
          const uriParts = asset.uri.split('/');
          const fileName = uriParts[uriParts.length - 1] || "image.jpg";
          
          let fileType = "image/jpeg";
          if (fileName.toLowerCase().endsWith('.png')) {
            fileType = "image/png";
          } else if (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')) {
            fileType = "image/jpeg";
          } else if (fileName.toLowerCase().endsWith('.gif')) {
            fileType = "image/gif";
          } else if (fileName.toLowerCase().endsWith('.webp')) {
            fileType = "image/webp";
          }
          
          setSelectedFile({
            uri: asset.uri,
            name: fileName,
            type: fileType,
          });
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Error selecting image. Please try again.");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert("No Image", "Please select an image first");
      return;
    }

    setLoading(true);
    setResult(null);
    setImageURL(null);

    try {
      const formData = new FormData();

      if (Platform.OS === "web") {
        const response = await fetch(selectedFile.uri);
        const blob = await response.blob();
        formData.append("file", blob, selectedFile.name);
      } else {
        const fileUri = selectedFile.uri;
        const fileType = selectedFile.type || "image/jpeg";
        const fileName = selectedFile.name || "upload.jpg";

        formData.append("file", {
          uri: fileUri,
          type: fileType,
          name: fileName,
        } as any);
      }

      const response = await fetch(`${API_URL}/detect/`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Detection Response:", data);

      setResult(data);

      if (data.saved_image) {
        setImageURL(`${API_URL}${data.saved_image}`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      Alert.alert(
        "Error",
        "Error processing image. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('responderType');
          await AsyncStorage.removeItem('userEmail');
          await AsyncStorage.removeItem('userName');
          await AsyncStorage.removeItem('responderId');
          navigation.navigate('ResLogin');
        },
      },
    ]);
  };

  const confirmLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('responderType');
    await AsyncStorage.removeItem('userEmail');
    await AsyncStorage.removeItem('userName');
    await AsyncStorage.removeItem('responderId');
    setShowLogoutConfirm(false);
    navigation.navigate('ResLogin');
  };

  return (
    <View style={styles.container}>
      {/* Header with Menu Icon */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)}>
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🌊 WASTE DETECTION</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* File Upload Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="trash-can" size={24} color="#0A5EB0" />
            <Text style={styles.cardTitle}>Upload Image for Trash Detection</Text>
          </View>

          <TouchableOpacity
            style={styles.selectButton}
            onPress={handleFileChange}
          >
            <Ionicons name="cloud-upload" size={32} color="#4a5568" />
            <Text style={styles.selectButtonText}>
              {selectedFile ? "Change Image" : "Select Image"}
            </Text>
          </TouchableOpacity>

          {selectedFile && (
            <View style={styles.selectedFileInfo}>
              <Ionicons name="checkmark-circle" size={20} color="#28A745" />
              <Text style={styles.selectedFileName}>
                {selectedFile.name}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.detectButton,
              (loading || !selectedFile) && styles.detectButtonDisabled,
            ]}
            onPress={handleUpload}
            disabled={loading || !selectedFile}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="search" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.detectButtonText}>Upload & Detect</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Results Section */}
        {result && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="analytics" size={24} color="#0A5EB0" />
              <Text style={styles.cardTitle}>Detection Result</Text>
            </View>

            {/* Uploaded Image */}
            {selectedFile && (
              <View style={styles.imageContainer}>
                <Text style={styles.imageLabel}>📷 Uploaded Image:</Text>
                <Image
                  source={{ uri: selectedFile.uri }}
                  style={styles.image}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Processed Image */}
            {imageURL && (
              <View style={styles.imageContainer}>
                <Text style={styles.imageLabel}>🔍 Processed Image:</Text>
                <Image
                  source={{ uri: imageURL }}
                  style={styles.image}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Detected Objects */}
            <View style={styles.detectionInfo}>
              <Text style={styles.detectionInfoTitle}>Detected Objects:</Text>

              <View style={[styles.detectionRow, styles.recyclableRow]}>
                <View style={styles.detectionLabelContainer}>
                  <Text style={styles.detectionIcon}>♻️</Text>
                  <Text style={styles.detectionLabel}>Recyclable:</Text>
                </View>
                <Text style={styles.detectionValue}>
                  {result.recyclable?.join(", ") || "None"}
                </Text>
              </View>

              <View style={[styles.detectionRow, styles.nonRecyclableRow]}>
                <View style={styles.detectionLabelContainer}>
                  <Text style={styles.detectionIcon}>🗑️</Text>
                  <Text style={styles.detectionLabel}>Non-Recyclable:</Text>
                </View>
                <Text style={styles.detectionValue}>
                  {result.non_recyclable?.join(", ") || "None"}
                </Text>
              </View>

              <View style={[styles.detectionRow, styles.hazardousRow]}>
                <View style={styles.detectionLabelContainer}>
                  <Text style={styles.detectionIcon}>⚠️</Text>
                  <Text style={styles.detectionLabel}>Hazardous:</Text>
                </View>
                <Text style={styles.detectionValue}>
                  {result.hazardous?.join(", ") || "None"}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutConfirm} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Logout</Text>
            <Text style={styles.confirmMessage}>Are you sure you want to logout?</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.logoutButton]}
                onPress={confirmLogout}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sidebar Modal */}
      <Modal visible={isSidebarOpen} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.sidebarOverlay}
          activeOpacity={1}
          onPress={() => setIsSidebarOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <MaterialCommunityIcons name="shield-account" size={40} color="#0A5EB0" />
              <Text style={styles.sidebarTitle}>Admin Menu</Text>
            </View>

            <TouchableOpacity 
              style={styles.sidebarItem}
              onPress={() => {
                setIsSidebarOpen(false);
                navigation.navigate('Admin');
              }}
            >
              <Ionicons name="home" size={24} color="#0A5EB0" />
              <Text style={styles.sidebarText}>Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sidebarItem, styles.sidebarItemActive]}
              onPress={() => setIsSidebarOpen(false)}
            >
              <MaterialCommunityIcons name="trash-can" size={24} color="#0A5EB0" />
              <Text style={styles.sidebarText}>Trash Detection</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sidebarItem}
              onPress={() => {
                setIsSidebarOpen(false);
                navigation.navigate('AdminSchedule');
              }}
            >
              <Ionicons name="calendar" size={24} color="#0A5EB0" />
              <Text style={styles.sidebarText}>Pickup Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sidebarItem}
              onPress={() => {
                setIsSidebarOpen(false);
                navigation.navigate('AdminDonations');
              }}
            >
              <MaterialCommunityIcons name="hand-heart" size={24} color="#0A5EB0" />
              <Text style={styles.sidebarText}>Donations</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem}>
              <Ionicons name="settings" size={24} color="#0A5EB0" />
              <Text style={styles.sidebarText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={handleLogout}>
              <Ionicons name="log-out" size={24} color="#FF4444" />
              <Text style={[styles.sidebarText, { color: '#FF4444' }]}>Logout</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A5EB0',
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 10,
  },
  selectButton: {
    backgroundColor: "#e2e8f0",
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#cbd5e0",
    borderStyle: "dashed",
    alignItems: "center",
    marginBottom: 16,
  },
  selectButtonText: {
    color: "#4a5568",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  selectedFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#e6f7ed",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#28A745',
  },
  selectedFileName: {
    color: "#28A745",
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  detectButton: {
    backgroundColor: "#0A5EB0",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: 'row',
    minHeight: 52,
    shadowColor: '#0A5EB0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  detectButtonDisabled: {
    backgroundColor: "#a0aec0",
    shadowOpacity: 0,
  },
  detectButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  imageContainer: {
    marginBottom: 20,
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  detectionInfo: {
    marginTop: 20,
  },
  detectionInfoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  detectionRow: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
  },
  recyclableRow: {
    backgroundColor: '#e6f7ed',
    borderLeftWidth: 4,
    borderLeftColor: '#28A745',
  },
  nonRecyclableRow: {
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  hazardousRow: {
    backgroundColor: '#ffe6e6',
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  detectionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  detectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2d3748",
  },
  detectionValue: {
    fontSize: 15,
    color: "#4a5568",
    lineHeight: 22,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF4444',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    width: 280,
    backgroundColor: 'white',
    height: '100%',
    padding: 20,
  },
  sidebarHeader: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0A5EB0',
    marginTop: 10,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  sidebarItemActive: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  sidebarText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
});