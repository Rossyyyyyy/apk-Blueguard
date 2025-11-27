import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import QRCode from 'react-native-qrcode-svg';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Reward {
  id: number;
  title: string;
  points: number;
  color: string;
  icon: string;
}

interface UserData {
  _id: string;
  email: string;
  name?: string;
  [key: string]: any;
}

interface RewardClaimReceiptProps {
  reward: Reward | null;
  userData: UserData | null;
  onClose: () => void;
  onPointsUpdated: (points: number) => void;
}

interface ClaimData {
  userId: string;
  userEmail: string;
  userName: string;
  rewardId: number;
  rewardTitle: string;
  pointsClaimed: number;
  claimId: string;
  claimDate: string;
  expiryDate: string;
  status: string;
}

interface QRCodeDataObject {
  claimId: string;
  rewardTitle: string;
  userName: string;
  claimDate: string;
  expiryDate: string;
}

// Generate UUID without external package
const generateClaimId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const RewardClaimReceipt: React.FC<RewardClaimReceiptProps> = ({ 
  reward, 
  userData, 
  onClose, 
  onPointsUpdated 
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [claimComplete, setClaimComplete] = useState<boolean>(false);
  const [qrCodeData, setQRCodeData] = useState<string | null>(null);
  
  // Generate a random claim ID
  const claimId = generateClaimId();
  
  // Calculate dates
  const claimDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30); // Set expiry to 30 days from now
  
  const handleConfirmClaim = async (): Promise<void> => {
    if (!reward || !userData) {
      Alert.alert('Error', 'Missing reward or user data');
      return;
    }

    try {
      setLoading(true);
      
      // Get the JWT token from AsyncStorage
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Session Expired', 'Please log in again');
        onClose();
        return;
      }
      
      // Prepare the claim data
      const claimData: ClaimData = {
        userId: userData._id,
        userEmail: userData.email,
        userName: userData.name || 'User',
        rewardId: reward.id,
        rewardTitle: reward.title,
        pointsClaimed: reward.points,
        claimId: claimId,
        claimDate: claimDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        status: 'pending'
      };
      
      // Submit the claim to the server
      const response = await axios.post<{ success: boolean }>(
        'http://10.120.221.103:5000/claim-reward',
        claimData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        // Generate QR code data
        const qrDataObject: QRCodeDataObject = {
          claimId: claimId,
          rewardTitle: reward.title,
          userName: userData.name || 'User',
          claimDate: claimDate.toISOString(),
          expiryDate: expiryDate.toISOString()
        };
        const qrData = JSON.stringify(qrDataObject);
        setQRCodeData(qrData);
        
        setClaimComplete(true);
        // Update the score in the parent component
        onPointsUpdated(reward.points);
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      Alert.alert(
        'Error',
        'Failed to claim reward. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!reward || !userData) {
    return null;
  }

  return (
    <View style={styles.modalContainer}>
      <Animatable.View 
        animation="fadeInUp" 
        duration={500} 
        style={styles.receiptContainer}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reward Claim</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Processing your claim...</Text>
          </View>
        ) : claimComplete ? (
          <ScrollView contentContainerStyle={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            <Text style={styles.successTitle}>Claim Successful!</Text>
            <Text style={styles.successText}>
              You have successfully claimed {reward.title}.
            </Text>
            <Text style={styles.instructionText}>
              Please show this QR code when collecting your reward:
            </Text>
            
            {qrCodeData && (
              <View style={styles.qrContainer}>
                <QRCode
                  value={qrCodeData}
                  size={250}
                  color="#000"
                  backgroundColor="white"
                />
              </View>
            )}
            
            <Text style={styles.instructionText}>
              Please visit our office to collect your reward before:
            </Text>
            <Text style={styles.expiryText}>{formatDate(expiryDate)}</Text>
            <Text style={styles.claimIdText}>Claim ID: {claimId}</Text>
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View style={styles.contentContainer}>
            <Text style={styles.rewardTitle}>{reward.title}</Text>
            <View style={styles.pointsInfo}>
              <Text style={styles.pointsText}>Points to be claimed:</Text>
              <Text style={styles.pointsValue}>{reward.points}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Claim Date:</Text>
                <Text style={styles.detailValue}>{formatDate(claimDate)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Expiry Date:</Text>
                <Text style={styles.detailValue}>{formatDate(expiryDate)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Claim ID:</Text>
                <Text style={styles.detailValue}>{claimId}</Text>
              </View>
            </View>
            
            <View style={styles.warningContainer}>
              <Ionicons name="information-circle" size={24} color="#FFD700" />
              <Text style={styles.warningText}>
                Please note that rewards must be collected within 30 days of claiming.
                Bring your ID when collecting your reward.
              </Text>
            </View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleConfirmClaim}
              >
                <Text style={styles.confirmButtonText}>Confirm Claim</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animatable.View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  receiptContainer: {
    width: '100%',
    backgroundColor: '#1E2A3B',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#253545',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  contentContainer: {
    padding: 20,
  },
  rewardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  pointsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#253545',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  pointsText: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  pointsValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  divider: {
    height: 1,
    backgroundColor: '#3A4B5D',
    marginVertical: 16,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  detailValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    marginLeft: 10,
    color: '#DDDDDD',
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginVertical: 20,
    alignSelf: 'center',
  },
  successContainer: {
    padding: 30,
    alignItems: 'center',
    paddingBottom: 50,
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#AAAAAA',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  expiryText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginVertical: 8,
  },
  claimIdText: {
    fontSize: 14,
    color: '#AAAAAA',
    marginBottom: 24,
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default RewardClaimReceipt;