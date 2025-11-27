import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  Alert,
  RefreshControl,
  TextInput,
  Platform,
  Dimensions,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

const API_BASE_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

interface Donation {
  _id: string;
  userName: string;
  email: string;
  image: string;
  wasteType: string;
  status: 'Pending' | 'Ready to Pickup' | 'On the Way' | 'Pickup Completed';
  statusHistory?: Array<{
    status: string;
    timestamp: Date;
    updatedBy: string;
  }>;
  pickupAddress?: string;
  contactNumber?: string;
  notes?: string;
  readyToPickupTime?: Date;
  onTheWayTime?: Date;
  actualPickupTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Sidebar Component
const BarangaySidebar = ({ isOpen, setIsOpen, userEmail, onLogout }: any) => {
  const navigation = useNavigation<any>();
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeRoute, setActiveRoute] = useState('BarangayDonations');

  const navItems = [
    { label: 'Dashboard', icon: 'tachometer', route: 'Barangay' },
    { label: 'Reports', icon: 'file-text', route: 'BarangayReports' },
    { label: 'Ongoing Reports', icon: 'spinner', route: 'BarangayOngoing' },
    { label: 'Completed', icon: 'check-circle', route: 'BarangayCompleted' },
    { label: 'Donations', icon: 'heart', route: 'BarangayDonations' },
    { label: 'Settings', icon: 'cog', route: 'BarangaySettings' },
    { label: 'Messages', icon: 'envelope', route: 'Messages' },
  ];

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const handleNavigation = (route: string) => {
    setActiveRoute(route);
    navigation.navigate(route);
    setIsOpen(false);
  };

  return (
    <Modal
      visible={isOpen}
      animationType="none"
      transparent={true}
      onRequestClose={() => setIsOpen(false)}
    >
      <TouchableOpacity 
        style={styles.sidebarOverlay}
        activeOpacity={1}
        onPress={() => setIsOpen(false)}
      >
        <Animated.View 
          style={[styles.overlayBackground, { opacity: fadeAnim }]}
        />
      </TouchableOpacity>

      <Animated.View 
        style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}
      >
        <View style={styles.sidebarHeader}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Icon name="recycle" size={28} color="#fff" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.sidebarTitle}>Barangay</Text>
              <Text style={styles.sidebarSubtitle}>Donation Portal</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => setIsOpen(false)}>
            <Icon name="times" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {userEmail && (
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Icon name="user" size={20} color="#0077b6" />
            </View>
            <View style={styles.userInfoContainer}>
              <Text style={styles.userLabel}>Logged in as</Text>
              <Text style={styles.userEmailText} numberOfLines={1}>{userEmail}</Text>
            </View>
          </View>
        )}

        <ScrollView style={styles.sidebarMenu} showsVerticalScrollIndicator={false}>
          <Text style={styles.menuSectionTitle}>NAVIGATION</Text>
          {navItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, activeRoute === item.route && styles.menuItemActive]}
              onPress={() => handleNavigation(item.route)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <View style={[styles.iconContainer, activeRoute === item.route && styles.iconContainerActive]}>
                  <Icon name={item.icon} size={18} color={activeRoute === item.route ? '#0077b6' : '#64748b'} />
                </View>
                <Text style={[styles.menuText, activeRoute === item.route && styles.menuTextActive]}>{item.label}</Text>
              </View>
              {activeRoute === item.route && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sidebarFooter}>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
            <Icon name="sign-out" size={18} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const BarangayDonations = () => {
  const navigation = useNavigation<any>();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [filteredDonations, setFilteredDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [updating, setUpdating] = useState(false);

  const [stats, setStats] = useState({
    totalDonors: 0,
    totalWeight: 0,
    projectsSupported: 0,
  });

  const statusColors = {
    'Pending': '#FFA726',
    'Ready to Pickup': '#42A5F5',
    'On the Way': '#FF7043',
    'Pickup Completed': '#66BB6A',
  };

  const statusIcons = {
    'Pending': 'clock-o',
    'Ready to Pickup': 'check-circle',
    'On the Way': 'truck',
    'Pickup Completed': 'check-circle-o',
  };

  useEffect(() => {
    checkAuth();
    fetchDonations();
  }, []);

  useEffect(() => {
    filterDonations();
    calculateStats();
  }, [donations, filterStatus, searchQuery]);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const responderType = await AsyncStorage.getItem('responderType');
      const email = await AsyncStorage.getItem('userEmail');

      if (!token || responderType !== 'barangay') {
        Alert.alert('Access Denied', 'You must be a barangay responder to access this page.');
        navigation.replace('Login');
        return;
      }

      if (email) setUserEmail(email);
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/donations/all`);
      const data = await response.json();

      if (data.success) {
        setDonations(data.donations);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch donations');
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
      Alert.alert('Error', 'Failed to fetch donations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterDonations = () => {
    let filtered = donations;
    if (filterStatus !== 'All') filtered = filtered.filter(d => d.status === filterStatus);
    if (searchQuery) {
      filtered = filtered.filter(d =>
        d.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.wasteType.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredDonations(filtered);
  };

  const calculateStats = () => {
    const uniqueDonors = new Set(donations.map(d => d.email)).size;
    const completedDonations = donations.filter(d => d.status === 'Pickup Completed').length;
    const estimatedWeight = completedDonations * 3.5;
    const projectsSupported = Math.floor(estimatedWeight / 50);

    setStats({
      totalDonors: uniqueDonors,
      totalWeight: Math.round(estimatedWeight),
      projectsSupported: projectsSupported || 1,
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDonations();
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userEmail', 'responderType']);
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const openStatusModal = (donation: Donation) => {
    setSelectedDonation(donation);
    setSelectedStatus(donation.status);
    setNotes('');
    setShowStatusModal(true);
  };

  const openDetailsModal = (donation: Donation) => {
    setSelectedDonation(donation);
    setShowDetailsModal(true);
  };

  const updateDonationStatus = async () => {
    if (!selectedDonation || !selectedStatus) {
      Alert.alert('Error', 'Please select a status');
      return;
    }

    setUpdating(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/donations/${selectedDonation._id}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: selectedStatus,
            updatedBy: 'Barangay Admin',
            notes,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', data.message);
        setShowStatusModal(false);
        fetchDonations();
      } else {
        Alert.alert('Error', data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const deleteDonation = async (id: string) => {
    Alert.alert('Confirm Deletion', 'Are you sure you want to delete this donation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/api/donations/${id}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
              Alert.alert('Success', 'Donation deleted successfully');
              fetchDonations();
            } else {
              Alert.alert('Error', data.message || 'Failed to delete donation');
            }
          } catch (error) {
            console.error('Error deleting donation:', error);
            Alert.alert('Error', 'Failed to delete donation');
          }
        },
      },
    ]);
  };

  const formatDateTime = (date: Date | string | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const renderDonationCard = (donation: Donation) => (
    <View key={donation._id} style={styles.donationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.avatarCircle}>
            <Icon name="user" size={18} color="#0077b6" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>{donation.userName}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{donation.email}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.infoButton} onPress={() => openDetailsModal(donation)}>
          <Icon name="info-circle" size={22} color="#0077b6" />
        </TouchableOpacity>
      </View>

      {donation.image && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: donation.image }} style={styles.donationImage} resizeMode="cover" />
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.wasteTypeRow}>
          <View style={styles.wasteTypeTag}>
            <Icon name="recycle" size={14} color="#4CAF50" />
            <Text style={styles.wasteTypeText}>{donation.wasteType}</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusColors[donation.status] + '20' }]}>
          <Icon name={statusIcons[donation.status]} size={14} color={statusColors[donation.status]} />
          <Text style={[styles.statusText, { color: statusColors[donation.status] }]}>{donation.status}</Text>
        </View>

        <View style={styles.metadataContainer}>
          <View style={styles.metadataRow}>
            <Icon name="calendar" size={12} color="#94A3B8" />
            <Text style={styles.metadataText}>
              Created: {new Date(donation.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          {donation.readyToPickupTime && (
            <View style={styles.metadataRow}>
              <Icon name="check-circle" size={12} color="#42A5F5" />
              <Text style={[styles.metadataText, { color: '#42A5F5' }]}>
                Ready: {formatDateTime(donation.readyToPickupTime)}
              </Text>
            </View>
          )}

          {donation.onTheWayTime && (
            <View style={styles.metadataRow}>
              <Icon name="truck" size={12} color="#FF7043" />
              <Text style={[styles.metadataText, { color: '#FF7043' }]}>
                Dispatched: {formatDateTime(donation.onTheWayTime)}
              </Text>
            </View>
          )}

          {donation.actualPickupTime && (
            <View style={styles.metadataRow}>
              <Icon name="check-circle-o" size={12} color="#66BB6A" />
              <Text style={[styles.metadataText, { color: '#66BB6A' }]}>
                Completed: {formatDateTime(donation.actualPickupTime)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => openStatusModal(donation)}>
          <Icon name="edit" size={16} color="#fff" />
          <Text style={styles.primaryButtonText}>Update Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={() => deleteDonation(donation._id)}>
          <Icon name="trash" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077b6" />
        <Text style={styles.loadingText}>Loading donations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.hamburger} onPress={() => setIsSidebarOpen(true)} activeOpacity={0.7}>
        <Icon name="bars" size={22} color="#fff" />
      </TouchableOpacity>

      <BarangaySidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} userEmail={userEmail} onLogout={handleLogout} />

      <View style={styles.headerSection}>
        <View style={styles.headerGradient}>
          <View style={styles.headerContentMain}>
            <Text style={styles.headerTitle}>Donation Management</Text>
            <Text style={styles.headerSubtitle}>Track and manage community recyclable donations</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
            <Icon name="users" size={22} color="#2196F3" />
          </View>
          <Text style={styles.statValue}>{stats.totalDonors}</Text>
          <Text style={styles.statLabel}>Total Donors</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
            <Icon name="balance-scale" size={22} color="#4CAF50" />
          </View>
          <Text style={styles.statValue}>{stats.totalWeight}kg</Text>
          <Text style={styles.statLabel}>Collected</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
            <Icon name="leaf" size={22} color="#FF9800" />
          </View>
          <Text style={styles.statValue}>{stats.projectsSupported}</Text>
          <Text style={styles.statLabel}>Projects</Text>
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search donations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="times-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filter by Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {['All', 'Pending', 'Ready to Pickup', 'On the Way', 'Pickup Completed'].map((status) => {
            const count = status === 'All' ? donations.length : donations.filter(d => d.status === status).length;
            const iconName = status === 'All' ? 'list' : statusIcons[status as keyof typeof statusIcons] || 'circle';
            const isActive = filterStatus === status;
            
            return (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilterStatus(status)}
                activeOpacity={0.7}
              >
                <View style={[styles.filterIconCircle, isActive && styles.filterIconCircleActive]}>
                  <Icon 
                    name={iconName} 
                    size={16} 
                    color={isActive ? '#fff' : (status === 'All' ? '#64748B' : statusColors[status as keyof typeof statusColors])} 
                  />
                </View>
                <View style={styles.filterTextContainer}>
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{status}</Text>
                  <Text style={[styles.filterCount, isActive && styles.filterCountActive]}>{count} items</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.contentSection}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredDonations.length > 0 ? (
          filteredDonations.map(renderDonationCard)
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Icon name="inbox" size={56} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyTitle}>No donations found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search terms' : filterStatus !== 'All' ? `No ${filterStatus.toLowerCase()} donations available` : 'No donations available at the moment'}
            </Text>
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Status Update Modal */}
      <Modal visible={showStatusModal} transparent animationType="slide" onRequestClose={() => setShowStatusModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)} style={styles.modalCloseButton}>
                <Icon name="times" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Select Status</Text>
              <Text style={styles.inputHint}>The timestamp will be automatically recorded when you update the status.</Text>
              
              <View style={styles.statusOptionsContainer}>
                {['Pending', 'Ready to Pickup', 'On the Way', 'Pickup Completed'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusOptionCard, selectedStatus === status && styles.statusOptionCardActive]}
                    onPress={() => setSelectedStatus(status)}
                  >
                    <View style={styles.statusOptionLeft}>
                      <View style={[
                        styles.statusOptionIcon,
                        selectedStatus === status && { backgroundColor: statusColors[status as keyof typeof statusColors] }
                      ]}>
                        <Icon
                          name={statusIcons[status as keyof typeof statusIcons]}
                          size={18}
                          color={selectedStatus === status ? '#fff' : statusColors[status as keyof typeof statusColors]}
                        />
                      </View>
                      <Text style={[styles.statusOptionLabel, selectedStatus === status && styles.statusOptionLabelActive]}>{status}</Text>
                    </View>
                    {selectedStatus === status && <Icon name="check-circle" size={20} color={statusColors[status as keyof typeof statusColors]} />}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 20 }]}>Notes (Optional)</Text>
              <TextInput
                style={styles.textAreaInput}
                placeholder="Add any additional notes..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                placeholderTextColor="#94A3B8"
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitButton, updating && styles.submitButtonDisabled]}
                onPress={updateDonationStatus}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="check" size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>Update Status</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal visible={showDetailsModal} transparent animationType="fade" onRequestClose={() => setShowDetailsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Donation Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)} style={styles.modalCloseButton}>
                <Icon name="times" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedDonation && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {selectedDonation.image && (
                  <View style={styles.detailImageContainer}>
                    <Image source={{ uri: selectedDonation.image }} style={styles.detailImage} resizeMode="cover" />
                  </View>
                )}

                <View style={styles.detailSection}>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconWrapper}><Icon name="user" size={16} color="#0077b6" /></View>
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Donor Name</Text>
                      <Text style={styles.detailValue}>{selectedDonation.userName}</Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIconWrapper}><Icon name="envelope" size={16} color="#0077b6" /></View>
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={styles.detailValue}>{selectedDonation.email}</Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIconWrapper}><Icon name="recycle" size={16} color="#0077b6" /></View>
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Waste Type</Text>
                      <Text style={styles.detailValue}>{selectedDonation.wasteType}</Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIconWrapper}><Icon name="info-circle" size={16} color="#0077b6" /></View>
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <View style={[styles.detailStatusBadge, { backgroundColor: statusColors[selectedDonation.status] }]}>
                        <Text style={styles.detailStatusText}>{selectedDonation.status}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIconWrapper}><Icon name="calendar" size={16} color="#0077b6" /></View>
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Created At</Text>
                      <Text style={styles.detailValue}>{formatDateTime(selectedDonation.createdAt)}</Text>
                    </View>
                  </View>

                  {selectedDonation.readyToPickupTime && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconWrapper}><Icon name="check-circle" size={16} color="#42A5F5" /></View>
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>Ready to Pickup</Text>
                        <Text style={styles.detailValue}>{formatDateTime(selectedDonation.readyToPickupTime)}</Text>
                      </View>
                    </View>
                  )}

                  {selectedDonation.onTheWayTime && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconWrapper}><Icon name="truck" size={16} color="#FF7043" /></View>
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>On the Way</Text>
                        <Text style={styles.detailValue}>{formatDateTime(selectedDonation.onTheWayTime)}</Text>
                      </View>
                    </View>
                  )}

                  {selectedDonation.actualPickupTime && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconWrapper}><Icon name="check-circle-o" size={16} color="#66BB6A" /></View>
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>Pickup Completed</Text>
                        <Text style={styles.detailValue}>{formatDateTime(selectedDonation.actualPickupTime)}</Text>
                      </View>
                    </View>
                  )}

                  {selectedDonation.notes && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconWrapper}><Icon name="sticky-note" size={16} color="#0077b6" /></View>
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>Notes</Text>
                        <Text style={styles.detailValue}>{selectedDonation.notes}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {selectedDonation.statusHistory && selectedDonation.statusHistory.length > 0 && (
                  <View style={styles.historySection}>
                    <Text style={styles.historySectionTitle}>Status History</Text>
                    {selectedDonation.statusHistory.map((history, index) => (
                      <View key={index} style={styles.historyItem}>
                        <View style={styles.historyDot} />
                        <View style={styles.historyItemContent}>
                          <Text style={styles.historyStatus}>{history.status}</Text>
                          <Text style={styles.historyDate}>{formatDateTime(history.timestamp)}</Text>
                          <Text style={styles.historyUpdatedBy}>Updated by: {history.updatedBy}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  hamburger: { position: 'absolute', top: 16, left: 16, zIndex: 100, width: 48, height: 48, backgroundColor: '#0077b6', borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  sidebarOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 },
  overlayBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 280, backgroundColor: '#ffffff', zIndex: 100, shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 16 },
  sidebarHeader: { backgroundColor: '#0077b6', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logoContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTextContainer: { flex: 1 },
  sidebarTitle: { color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: 0.3 },
  sidebarSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2, fontWeight: '400' },
  closeButton: { padding: 8, borderRadius: 8 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', marginHorizontal: 16, marginTop: 16, marginBottom: 8, padding: 12, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#0077b6' },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userInfoContainer: { flex: 1 },
  userLabel: { fontSize: 11, color: '#64748B', marginBottom: 2, fontWeight: '500' },
  userEmailText: { fontSize: 13, color: '#1E293B', fontWeight: '600' },
  sidebarMenu: { flex: 1, paddingHorizontal: 16 },
  menuSectionTitle: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 16, marginBottom: 12, letterSpacing: 1.2, paddingHorizontal: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, marginBottom: 4, borderRadius: 10, backgroundColor: 'transparent' },
  menuItemActive: { backgroundColor: '#E7F3FF' },
  menuItemContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  iconContainerActive: { backgroundColor: '#ffffff' },
  menuText: { fontSize: 15, color: '#475569', fontWeight: '500' },
  menuTextActive: { color: '#0077b6', fontWeight: '600' },
  activeIndicator: { width: 4, height: 20, backgroundColor: '#0077b6', borderRadius: 2 },
  sidebarFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  logoutBtn: { backgroundColor: '#DC2626', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  logoutText: { color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 8 },
  headerSection: { backgroundColor: '#0077b6', paddingTop: 80, paddingBottom: 24, paddingHorizontal: 20 },
  headerGradient: {},
  headerContentMain: {},
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 6, letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '400', lineHeight: 20 },
  statsSection: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: -32, marginBottom: 20, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', paddingVertical: 20, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  statIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', textAlign: 'center' },
  searchSection: { paddingHorizontal: 16, marginBottom: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 12 },
  searchInput: { flex: 1, fontSize: 15, color: '#1E293B', padding: 0 },
  filterSection: { paddingHorizontal: 16, marginBottom: 20 },
  filterTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 12, letterSpacing: 0.3, textTransform: 'uppercase' },
  filterContent: { gap: 12, paddingRight: 16 },
  filterChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 18, 
    backgroundColor: '#fff', 
    borderRadius: 14, 
    borderWidth: 2, 
    borderColor: '#E2E8F0', 
    gap: 12,
    minWidth: 140,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 4, 
    elevation: 2 
  },
  filterChipActive: { 
    backgroundColor: '#0077b6', 
    borderColor: '#0077b6', 
    shadowColor: '#0077b6', 
    shadowOpacity: 0.25, 
    shadowRadius: 8, 
    elevation: 6,
  },
  filterIconCircle: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#F1F5F9', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  filterIconCircleActive: { 
    backgroundColor: 'rgba(255,255,255,0.25)' 
  },
  filterTextContainer: { 
    flex: 1 
  },
  filterChipText: { 
    fontSize: 14, 
    color: '#1E293B', 
    fontWeight: '700', 
    marginBottom: 2 
  },
  filterChipTextActive: { 
    color: '#fff' 
  },
  filterCount: { 
    fontSize: 11, 
    color: '#94A3B8', 
    fontWeight: '600' 
  },
  filterCountActive: { 
    color: 'rgba(255,255,255,0.85)' 
  },
  contentSection: { flex: 1 },
  contentContainer: { paddingHorizontal: 16, paddingTop: 8 },
  donationCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E7F3FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userDetails: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  userEmail: { fontSize: 13, color: '#64748B', fontWeight: '400' },
  infoButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#F8FAFC' },
  imageContainer: { width: '100%', height: 200, backgroundColor: '#F1F5F9' },
  donationImage: { width: '100%', height: '100%' },
  cardBody: { padding: 16 },
  wasteTypeRow: { marginBottom: 12 },
  wasteTypeTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#F0FDF4', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#BBF7D0', gap: 6 },
  wasteTypeText: { fontSize: 14, fontWeight: '600', color: '#16A34A' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginBottom: 16, gap: 6 },
  statusText: { fontSize: 13, fontWeight: '600' },
  metadataContainer: { gap: 8 },
  metadataRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metadataText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9', padding: 12, gap: 8 },
  primaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0077b6', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, gap: 8 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  dangerButton: { backgroundColor: '#DC2626', width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyIconContainer: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#475569', marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { fontSize: 16, color: '#64748B', marginTop: 16, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  modalCloseButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 24 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  inputHint: { fontSize: 12, color: '#94A3B8', marginBottom: 16, fontStyle: 'italic' },
  statusOptionsContainer: { gap: 10 },
  statusOptionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0' },
  statusOptionCardActive: { backgroundColor: '#F0F9FF', borderColor: '#0077b6' },
  statusOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusOptionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  statusOptionLabel: { fontSize: 15, fontWeight: '600', color: '#475569' },
  statusOptionLabelActive: { color: '#0077b6' },
  textAreaInput: { padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15, color: '#475569', minHeight: 100, textAlignVertical: 'top' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16A34A', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, marginTop: 24, gap: 8, shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitButtonDisabled: { backgroundColor: '#94A3B8' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  detailImageContainer: { width: '100%', height: 220, borderRadius: 12, overflow: 'hidden', marginBottom: 20, backgroundColor: '#F1F5F9' },
  detailImage: { width: '100%', height: '100%' },
  detailSection: { gap: 0 },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E7F3FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  detailTextContainer: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 15, color: '#1E293B', fontWeight: '500', lineHeight: 22 },
  detailStatusBadge: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, marginTop: 4 },
  detailStatusText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  historySection: { marginTop: 24, padding: 20, backgroundColor: '#F8FAFC', borderRadius: 12 },
  historySectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  historyItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, paddingLeft: 4 },
  historyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0077b6', marginRight: 12, marginTop: 6 },
  historyItemContent: { flex: 1 },
  historyStatus: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  historyDate: { fontSize: 13, color: '#64748B', marginBottom: 2, fontWeight: '500' },
  historyUpdatedBy: { fontSize: 12, color: '#94A3B8', fontWeight: '400' },
});

export default BarangayDonations;