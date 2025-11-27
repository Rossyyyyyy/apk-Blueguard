// components/responders/Admin/AdminFlagged.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  Login: undefined;
  ResLogin: undefined;
  Admin: undefined;
  AdminDetect: undefined;
  AdminSchedule: undefined;
  AdminDonations: undefined;
  AdminUsers: undefined;
  AdminResponders: undefined;
  AdminDeactivated: undefined;
  AdminFlagged: undefined;
  AdminMessages: undefined;
};

type AdminFlaggedNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminFlagged'>;

interface AdminFlaggedProps {
  navigation: AdminFlaggedNavigationProp;
}

interface FlaggedReport {
  _id: string;
  name: string;
  boatName: string;
  eventDescription: string;
  address: string;
  incidentType: string;
  reportTo: string[];
  createdAt: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  reportedBy: string;
}

interface IncidentStats {
  type: string;
  count: number;
  percentage: number;
}

interface TimelineData {
  date: string;
  count: number;
}

const AdminFlagged: React.FC<AdminFlaggedProps> = ({ navigation }) => {
  const [flaggedReports, setFlaggedReports] = useState<FlaggedReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<FlaggedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<FlaggedReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [sidebarAnimation] = useState(new Animated.Value(-280));
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterIncident, setFilterIncident] = useState<string>('all');

  const API_URL = Platform.OS === 'web' ? 'http://localhost:5000' : 'http://10.120.221.103:5000';

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = dimensions.width >= 768;

  const showAlert = (title: string, message: string, buttons?: any[]) => {
    if (Platform.OS === 'web') {
      if (title === 'Logout') {
        setShowLogoutConfirm(true);
      } else {
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  useEffect(() => {
    Animated.timing(sidebarAnimation, {
      toValue: isSidebarOpen ? 0 : -280,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isSidebarOpen]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const responderType = await AsyncStorage.getItem('responderType');
        const email = await AsyncStorage.getItem('userEmail');
        const name = await AsyncStorage.getItem('userName');

        if (!token || responderType !== 'admin') {
          showAlert('Access Denied', 'You must be an admin to access this page.', [
            { text: 'OK', onPress: () => navigation.navigate('ResLogin') },
          ]);
        }

        if (email) setUserEmail(email);
        if (name) setUserName(name);
      } catch (error) {
        console.error('Error checking authentication:', error);
      }
    };

    checkAuth();
  }, [navigation]);

  useEffect(() => {
    fetchFlaggedReports();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterPriority, filterIncident, flaggedReports]);

  const fetchFlaggedReports = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/get-reported`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      
      const data = await response.json();
      console.log('Fetched data:', data);
      
      // Handle both array and object responses
      const reportsArray = Array.isArray(data) ? data : [];
      
      // Add priority based on incident type and age
      const reportsWithPriority = reportsArray.map((report: any) => ({
        ...report,
        priority: determinePriority(report)
      }));
      
      setFlaggedReports(reportsWithPriority);
      setFilteredReports(reportsWithPriority);
    } catch (error) {
      console.error('Error fetching flagged reports:', error);
      showAlert('Error', 'Failed to fetch flagged reports');
      // Set empty arrays on error
      setFlaggedReports([]);
      setFilteredReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  const determinePriority = (report: any): 'low' | 'medium' | 'high' | 'critical' => {
    const ageInDays = (Date.now() - new Date(report.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const criticalTypes = ['Illegal Fishing', 'Oil Spill', 'Chemical Waste'];
    
    if (criticalTypes.includes(report.incidentType) || ageInDays > 7) return 'critical';
    if (ageInDays > 3) return 'high';
    if (ageInDays > 1) return 'medium';
    return 'low';
  };

  const applyFilters = () => {
    let filtered = [...flaggedReports];

    if (searchQuery) {
      filtered = filtered.filter(report =>
        report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.boatName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(report => report.priority === filterPriority);
    }

    if (filterIncident !== 'all') {
      filtered = filtered.filter(report => report.incidentType === filterIncident);
    }

    setFilteredReports(filtered);
  };

  const getIncidentStats = (): IncidentStats[] => {
    const stats: { [key: string]: number } = {};
    flaggedReports.forEach(report => {
      stats[report.incidentType] = (stats[report.incidentType] || 0) + 1;
    });

    const total = flaggedReports.length;
    return Object.entries(stats).map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    })).sort((a, b) => b.count - a.count);
  };

  const getTimelineData = (): TimelineData[] => {
    const last7Days: TimelineData[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const count = flaggedReports.filter(report => {
        const reportDate = new Date(report.createdAt);
        return reportDate.toDateString() === date.toDateString();
      }).length;

      last7Days.push({ date: dateStr, count });
    }
    return last7Days;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#D32F2F';
      case 'high': return '#F57C00';
      case 'medium': return '#FBC02D';
      case 'low': return '#388E3C';
      default: return '#999';
    }
  };

  const getIncidentIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'Illegal Fishing': 'fish',
      'Plastic Waste': 'trash',
      'Oil Spill': 'water',
      'Chemical Waste': 'flask',
      'Ghost Nets': 'net',
      'Marine Debris': 'boat'
    };
    return icons[type] || 'alert-circle';
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

  const menuItems = [
    { icon: 'home', label: 'Dashboard', route: 'Admin', color: '#0A5EB0' },
    { icon: 'people', label: 'Users', route: 'AdminUsers', color: '#0A5EB0' },
    { icon: 'shield-checkmark', label: 'Responders', route: 'AdminResponders', color: '#0A5EB0' },
    { icon: 'close-circle', label: 'Deactivated', route: 'AdminDeactivated', color: '#0A5EB0' },
    { icon: 'flag', label: 'Flagged Reports', route: null, color: '#0A5EB0' },
    { icon: 'mail', label: 'Messages', route: 'AdminMessages', color: '#0A5EB0' },
  ];

  const incidentStats = getIncidentStats();
  const timelineData = getTimelineData();
  const maxTimelineCount = Math.max(...timelineData.map(d => d.count), 1);

  const priorityCounts = {
    critical: flaggedReports.filter(r => r.priority === 'critical').length,
    high: flaggedReports.filter(r => r.priority === 'high').length,
    medium: flaggedReports.filter(r => r.priority === 'medium').length,
    low: flaggedReports.filter(r => r.priority === 'low').length,
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0A5EB0" />
        <Text style={styles.loadingText}>Loading flagged reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setIsSidebarOpen(true)}
        >
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="flag" size={32} color="white" />
          <Text style={styles.headerTitle}>FLAGGED REPORTS</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications" size={24} color="white" />
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>{flaggedReports.length}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[
          styles.contentContainer,
          isWeb && isLargeScreen && styles.webContentContainer
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.innerContent,
          isWeb && isLargeScreen && styles.webInnerContent
        ]}>
          {/* Stats Overview */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: '#D32F2F' }]}>
              <MaterialCommunityIcons name="alert-octagon" size={28} color="#D32F2F" />
              <Text style={styles.statNumber}>{priorityCounts.critical}</Text>
              <Text style={styles.statLabel}>Critical</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#F57C00' }]}>
              <Ionicons name="warning" size={28} color="#F57C00" />
              <Text style={styles.statNumber}>{priorityCounts.high}</Text>
              <Text style={styles.statLabel}>High</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#FBC02D' }]}>
              <Ionicons name="alert" size={28} color="#FBC02D" />
              <Text style={styles.statNumber}>{priorityCounts.medium}</Text>
              <Text style={styles.statLabel}>Medium</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#388E3C' }]}>
              <Ionicons name="checkmark-circle" size={28} color="#388E3C" />
              <Text style={styles.statNumber}>{priorityCounts.low}</Text>
              <Text style={styles.statLabel}>Low</Text>
            </View>
          </View>

          {/* Search and Filters */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search reports..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, filterPriority === 'all' && styles.filterChipActive]}
                onPress={() => setFilterPriority('all')}
              >
                <Text style={[styles.filterText, filterPriority === 'all' && styles.filterTextActive]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filterPriority === 'critical' && styles.filterChipActive]}
                onPress={() => setFilterPriority('critical')}
              >
                <Text style={[styles.filterText, filterPriority === 'critical' && styles.filterTextActive]}>Critical</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filterPriority === 'high' && styles.filterChipActive]}
                onPress={() => setFilterPriority('high')}
              >
                <Text style={[styles.filterText, filterPriority === 'high' && styles.filterTextActive]}>High</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filterPriority === 'medium' && styles.filterChipActive]}
                onPress={() => setFilterPriority('medium')}
              >
                <Text style={[styles.filterText, filterPriority === 'medium' && styles.filterTextActive]}>Medium</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filterPriority === 'low' && styles.filterChipActive]}
                onPress={() => setFilterPriority('low')}
              >
                <Text style={[styles.filterText, filterPriority === 'low' && styles.filterTextActive]}>Low</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Charts Section */}
          <View style={isLargeScreen ? styles.twoColumnLayout : null}>
            {/* Timeline Chart */}
            <View style={[styles.section, isLargeScreen && styles.halfWidth]}>
              <Text style={styles.sectionTitle}>Reports Timeline (Last 7 Days)</Text>
              <View style={styles.chartCard}>
                <View style={styles.timelineChart}>
                  {timelineData.map((item, index) => (
                    <View key={index} style={styles.timelineBar}>
                      <View style={styles.timelineBarContainer}>
                        <View 
                          style={[
                            styles.timelineBarFill,
                            { height: `${(item.count / maxTimelineCount) * 100}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.timelineCount}>{item.count}</Text>
                      <Text style={styles.timelineLabel}>{item.date}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Incident Distribution */}
            <View style={[styles.section, isLargeScreen && styles.halfWidth]}>
              <Text style={styles.sectionTitle}>Incident Distribution</Text>
              <View style={styles.chartCard}>
                {incidentStats.map((stat, index) => (
                  <View key={index} style={styles.distributionRow}>
                    <View style={styles.distributionLeft}>
                      <MaterialCommunityIcons 
                        name={getIncidentIcon(stat.type) as any} 
                        size={24} 
                        color="#0A5EB0" 
                      />
                      <Text style={styles.distributionLabel}>{stat.type}</Text>
                    </View>
                    <View style={styles.distributionRight}>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill,
                            { width: `${stat.percentage}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.distributionCount}>{stat.count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Reports List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Flagged Reports</Text>
              <Text style={styles.sectionSubtitle}>{filteredReports.length} reports</Text>
            </View>
            {filteredReports.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={80} color="#E0E0E0" />
                <Text style={styles.emptyText}>No flagged reports found</Text>
              </View>
            ) : (
              filteredReports.map((report, index) => (
                <TouchableOpacity
                  key={report._id}
                  style={styles.reportCard}
                  onPress={() => {
                    setSelectedReport(report);
                    setShowDetailModal(true);
                  }}
                >
                  <View style={styles.reportHeader}>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(report.priority!) + '20' }]}>
                      <Text style={[styles.priorityText, { color: getPriorityColor(report.priority!) }]}>
                        {report.priority?.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.reportDate}>
                      {new Date(report.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.reportName}>{report.name}</Text>
                  <View style={styles.reportDetail}>
                    <MaterialCommunityIcons name={getIncidentIcon(report.incidentType) as any} size={16} color="#666" />
                    <Text style={styles.reportDetailText}>{report.incidentType}</Text>
                  </View>
                  <View style={styles.reportDetail}>
                    <Ionicons name="location" size={16} color="#666" />
                    <Text style={styles.reportDetailText}>{report.address}</Text>
                  </View>
                  <View style={styles.reportFooter}>
                    <View style={styles.reportTags}>
                      {report.reportTo.map((responder, idx) => (
                        <View key={idx} style={styles.responderTag}>
                          <Text style={styles.responderTagText}>{responder}</Text>
                        </View>
                      ))}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#0A5EB0" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sidebar Modal */}
      <Modal visible={isSidebarOpen} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.sidebarOverlay}
          activeOpacity={1}
          onPress={() => setIsSidebarOpen(false)}
        >
          <Animated.View
            style={[
              styles.modernSidebar,
              { transform: [{ translateX: sidebarAnimation }] },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sidebarHeader}>
              <View style={styles.profileSection}>
                <View style={styles.profileAvatar}>
                  <MaterialCommunityIcons name="shield-account" size={40} color="white" />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{userName || 'Admin'}</Text>
                  <Text style={styles.profileEmail}>{userEmail}</Text>
                </View>
              </View>
            </View>

            <ScrollView style={styles.sidebarMenu} showsVerticalScrollIndicator={false}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => {
                    if (item.route) {
                      navigation.navigate(item.route as any);
                    }
                    setIsSidebarOpen(false);
                  }}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text style={styles.menuText}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.sidebarFooter}>
              <TouchableOpacity style={styles.logoutMenuItem} onPress={handleLogout}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="log-out" size={22} color="#FF4444" />
                </View>
                <Text style={[styles.menuText, { color: '#FF4444' }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Report Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModal, isWeb && isLargeScreen && styles.detailModalWeb]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {selectedReport && (
                <>
                  <View style={[styles.priorityBadgeLarge, { backgroundColor: getPriorityColor(selectedReport.priority!) + '20' }]}>
                    <Text style={[styles.priorityTextLarge, { color: getPriorityColor(selectedReport.priority!) }]}>
                      {selectedReport.priority?.toUpperCase()} PRIORITY
                    </Text>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Reporter Name</Text>
                    <Text style={styles.detailValue}>{selectedReport.name}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Boat Name</Text>
                    <Text style={styles.detailValue}>{selectedReport.boatName}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Incident Type</Text>
                    <View style={styles.incidentBadge}>
                      <MaterialCommunityIcons 
                        name={getIncidentIcon(selectedReport.incidentType) as any} 
                        size={20} 
                        color="#0A5EB0" 
                      />
                      <Text style={styles.incidentBadgeText}>{selectedReport.incidentType}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{selectedReport.address}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailValue}>{selectedReport.eventDescription}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Reported To</Text>
                    <View style={styles.respondersList}>
                      {selectedReport.reportTo.map((responder, idx) => (
                        <View key={idx} style={styles.responderBadge}>
                          <Ionicons name="shield-checkmark" size={16} color="#0A5EB0" />
                          <Text style={styles.responderBadgeText}>{responder}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Report Date</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedReport.createdAt).toLocaleString()}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutConfirm} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="log-out" size={50} color="#FF4444" />
            </View>
            <Text style={styles.confirmTitle}>Confirm Logout</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to logout from your admin account?
            </Text>
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
    </View>
  );
};

export default AdminFlagged;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A5EB0',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuButton: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  webContentContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  innerContent: {
    width: '100%',
  },
  webInnerContent: {
    maxWidth: 1400,
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  searchSection: {
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#0A5EB0',
    borderColor: '#0A5EB0',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  twoColumnLayout: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
  },
  halfWidth: {
    flex: 1,
    minWidth: 300,
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timelineChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
    paddingTop: 20,
  },
  timelineBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 4,
  },
  timelineBarContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  timelineBarFill: {
    width: '100%',
    backgroundColor: '#0A5EB0',
    borderRadius: 8,
  },
  timelineCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  timelineLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  distributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  distributionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  distributionLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  distributionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 2,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0A5EB0',
    borderRadius: 4,
  },
  distributionCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 30,
    textAlign: 'right',
  },
  reportCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
  },
  reportName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  reportDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  reportDetailText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  reportTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  responderTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  responderTagText: {
    fontSize: 11,
    color: '#0A5EB0',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: 'white',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modernSidebar: {
    width: 280,
    height: '100%',
    backgroundColor: '#FFFFFF',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  sidebarHeader: {
    backgroundColor: '#0A5EB0',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sidebarMenu: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 20,
  },
  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' && {
      justifyContent: 'center',
      alignItems: 'center',
    }),
  },
  detailModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  detailModalWeb: {
    borderRadius: 24,
    height: 700,
    width: '90%',
    maxWidth: 800,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  priorityBadgeLarge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
  },
  priorityTextLarge: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  incidentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  incidentBadgeText: {
    fontSize: 14,
    color: '#0A5EB0',
    fontWeight: '600',
  },
  respondersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  responderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  responderBadgeText: {
    fontSize: 13,
    color: '#0A5EB0',
    fontWeight: '500',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  confirmIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
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
});