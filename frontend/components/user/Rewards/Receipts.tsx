import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';

interface ReceiptsProps {
  navigation: any;
}

interface Claim {
  _id: string;
  claimId: string;
  rewardTitle: string;
  pointsClaimed: number;
  claimDate: string;
  expiryDate: string;
  status: string;
  userName: string;
  userEmail: string;
}

const Receipts: React.FC<ReceiptsProps> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);

  const fetchClaims = async (): Promise<void> => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        setError('Not authenticated');
        Alert.alert('Session Expired', 'Please log in again', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
        return;
      }

      const response = await axios.get<{ success: boolean; claims: Claim[] }>(
        'http://10.120.221.103:5000/user-claims',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        // Sort by claim date, newest first
        const sortedClaims = response.data.claims.sort(
          (a, b) => new Date(b.claimDate).getTime() - new Date(a.claimDate).getTime()
        );
        setClaims(sortedClaims);
      }
    } catch (err: any) {
      console.error('Error fetching claims:', err);
      setError('Failed to load receipts: ' + (err.response?.data?.message || err.message));
      
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        Alert.alert('Authentication Error', 'Please log in again', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const onRefresh = (): void => {
    setRefreshing(true);
    fetchClaims();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isExpired = (expiryDate: string): boolean => {
    return new Date(expiryDate) < new Date();
  };

  const getStatusColor = (status: string, expiryDate: string): string => {
    if (isExpired(expiryDate)) return '#FF6347';
    switch (status.toLowerCase()) {
      case 'claimed':
        return '#4CAF50';
      case 'pending':
        return '#FFA500';
      case 'expired':
        return '#FF6347';
      default:
        return '#999999';
    }
  };

  const getStatusText = (status: string, expiryDate: string): string => {
    if (isExpired(expiryDate)) return 'Expired';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const toggleExpand = (claimId: string): void => {
    setExpandedClaimId(expandedClaimId === claimId ? null : claimId);
  };

  const generateQRData = (claim: Claim): string => {
    return JSON.stringify({
      claimId: claim.claimId,
      rewardTitle: claim.rewardTitle,
      userName: claim.userName,
      claimDate: claim.claimDate,
      expiryDate: claim.expiryDate
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Ionicons name="document-text" size={30} color="white" />
        <Text style={styles.headerTitle}>My Receipts</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Loading receipts...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#FF6347" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              fetchClaims();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : claims.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color="#CCCCCC" />
          <Text style={styles.emptyText}>No receipts yet</Text>
          <Text style={styles.emptySubtext}>
            Claim rewards to see your receipts here
          </Text>
          <TouchableOpacity
            style={styles.goToRewardsButton}
            onPress={() => navigation.navigate('Rewards')}
          >
            <Text style={styles.goToRewardsText}>Go to Rewards</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="white"
              colors={['white']}
            />
          }
        >
          <Text style={styles.totalText}>Total Claims: {claims.length}</Text>

          {claims.map((claim, index) => (
            <Animatable.View
              key={claim._id}
              animation="fadeInUp"
              delay={index * 100}
              style={styles.receiptCard}
            >
              <TouchableOpacity
                onPress={() => toggleExpand(claim.claimId)}
                activeOpacity={0.7}
              >
                <View style={styles.receiptHeader}>
                  <View style={styles.receiptTitleContainer}>
                    <Ionicons name="gift" size={24} color="#0A5EB0" />
                    <View style={styles.receiptTitleInfo}>
                      <Text style={styles.receiptTitle}>{claim.rewardTitle}</Text>
                      <Text style={styles.receiptPoints}>
                        {claim.pointsClaimed} points
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={expandedClaimId === claim.claimId ? "chevron-up" : "chevron-down"}
                    size={24}
                    color="#666666"
                  />
                </View>

                <View style={styles.receiptInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Claimed:</Text>
                    <Text style={styles.infoValue}>{formatDate(claim.claimDate)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(claim.status, claim.expiryDate) }
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {getStatusText(claim.status, claim.expiryDate)}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>

              {expandedClaimId === claim.claimId && (
                <Animatable.View
                  animation="fadeIn"
                  duration={300}
                  style={styles.expandedContent}
                >
                  <View style={styles.divider} />
                  
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsTitle}>Receipt Details</Text>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Claim ID:</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>
                        {claim.claimId}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Expiry Date:</Text>
                      <Text style={[
                        styles.detailValue,
                        isExpired(claim.expiryDate) && styles.expiredText
                      ]}>
                        {formatDate(claim.expiryDate)}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Claimed By:</Text>
                      <Text style={styles.detailValue}>{claim.userName}</Text>
                    </View>
                  </View>

                  {!isExpired(claim.expiryDate) && claim.status.toLowerCase() === 'pending' && (
                    <>
                      <Text style={styles.qrTitle}>Show this QR code to collect:</Text>
                      <View style={styles.qrContainer}>
                        <QRCode
                          value={generateQRData(claim)}
                          size={200}
                          color="#000"
                          backgroundColor="white"
                        />
                      </View>
                      <Text style={styles.instructionText}>
                        Present this QR code at our office to collect your reward
                      </Text>
                    </>
                  )}
                </Animatable.View>
              )}
            </Animatable.View>
          ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        {[
          { name: 'Dashboard', icon: 'home', screen: 'Dash' },
          { name: 'Notifications', icon: 'notifications', screen: 'Notifications' },
          { name: 'My Reports', icon: 'document-text', screen: 'Reports' },
          { name: 'Rewards', icon: 'trophy', screen: 'Rewards' },
          { name: 'Knowledge', icon: 'book', screen: 'Knowledge' },
          { name: 'Profile', icon: 'person', screen: 'Profile' },
        ].map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.navButton}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Ionicons name={item.icon as any} size={24} color="white" />
            <Text style={styles.navText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
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
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  placeholder: {
    width: 34,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'white',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#28A745',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#CCCCCC',
    marginTop: 10,
    textAlign: 'center',
  },
  goToRewardsButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#28A745',
    borderRadius: 8,
  },
  goToRewardsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
    paddingBottom: 80,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  receiptCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  receiptTitleInfo: {
    marginLeft: 12,
    flex: 1,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000957',
  },
  receiptPoints: {
    fontSize: 14,
    color: '#FFD700',
    marginTop: 2,
  },
  receiptInfo: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  expandedContent: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 16,
  },
  detailsSection: {
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000957',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  expiredText: {
    color: '#FF6347',
  },
  qrTitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 12,
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  instructionText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000957',
    width: '100%',
    padding: 10,
  },
  navButton: {
    alignItems: 'center',
  },
  navText: {
    color: 'white',
    fontSize: 12,
  },
});

export default Receipts;