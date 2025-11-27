import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
  Platform,
  Modal,
  ImageBackground,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// API Base URL
const API_BASE_URL = 'http://10.120.221.103:5000';

// Color palette
const BAR_COLORS = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC949', '#AF7AA1', '#FF9DA7'];
const STATUS_OPTIONS = ["Pending", "Ongoing", "Completed"];

// Status colors
const STATUS_COLORS = {
  Pending: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  Ongoing: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  Completed: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
};

interface Report {
  _id: string;
  type: string;
  description: string;
  address: string;
  comment: string;
  predictedLaw: string;
  reportedBy: string;
  dateReported: string;
  status: string;
}

interface ChartDataItem {
  name: string;
  count: number;
  color: string;
}

// NGO Sidebar Component
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

// Status Modal Component
const StatusModal = ({ visible, currentStatus, reportId, onClose, onStatusChange }: any) => {
  const handleStatusSelect = (newStatus: string) => {
    onClose();
    if (newStatus !== currentStatus) {
      onStatusChange(reportId, newStatus);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalOverlayBg} />
      </TouchableOpacity>

      <View style={styles.statusModalContainer}>
        <View style={styles.statusModalContent}>
          {/* Modal Header */}
          <View style={styles.statusModalHeader}>
            <Icon name="exchange" size={24} color="#0077b6" />
            <Text style={styles.statusModalTitle}>Change Report Status</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="times" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Current Status Display */}
          <View style={styles.currentStatusSection}>
            <Text style={styles.currentStatusLabel}>Current Status:</Text>
            <View style={styles.currentStatusDisplay}>
              {(() => {
                const color = STATUS_COLORS[currentStatus as keyof typeof STATUS_COLORS];
                return (
                  <View style={[styles.currentStatusBadge, { 
                    backgroundColor: color.bg,
                    borderColor: color.border,
                  }]}>
                    <View style={[styles.statusDotLarge, { backgroundColor: color.border }]} />
                    <Text style={[styles.currentStatusText, { color: color.text }]}>
                      {currentStatus}
                    </Text>
                  </View>
                );
              })()}
            </View>
          </View>

          {/* Status Options */}
          <View style={styles.statusOptionsSection}>
            <Text style={styles.statusOptionsLabel}>Select New Status:</Text>
            {STATUS_OPTIONS.map((status) => {
              const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
              const isCurrentStatus = currentStatus === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOptionButton,
                    { 
                      backgroundColor: color.bg,
                      borderColor: color.border,
                    },
                    isCurrentStatus && styles.statusOptionButtonDisabled
                  ]}
                  onPress={() => handleStatusSelect(status)}
                  activeOpacity={0.7}
                  disabled={isCurrentStatus}
                >
                  <View style={styles.statusOptionContent}>
                    <View style={[styles.statusDotLarge, { backgroundColor: color.border }]} />
                    <Text style={[styles.statusOptionText, { color: color.text }]}>
                      {status}
                    </Text>
                    {isCurrentStatus && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>CURRENT</Text>
                      </View>
                    )}
                  </View>
                  <Icon name="chevron-right" size={18} color={color.text} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Status Badge Component
const StatusBadge = ({ currentStatus, reportId, onStatusChange }: any) => {
  const [showModal, setShowModal] = useState(false);
  const statusColor = STATUS_COLORS[currentStatus as keyof typeof STATUS_COLORS] || STATUS_COLORS.Pending;

  return (
    <>
      <TouchableOpacity
        style={[styles.statusBadge, { 
          backgroundColor: statusColor.bg,
          borderColor: statusColor.border,
        }]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
      >
        <View style={styles.statusBadgeContent}>
          <View style={[styles.statusDot, { backgroundColor: statusColor.border }]} />
          <Text style={[styles.statusText, { color: statusColor.text }]}>
            {currentStatus}
          </Text>
          <Icon name="edit" size={10} color={statusColor.text} />
        </View>
      </TouchableOpacity>

      <StatusModal
        visible={showModal}
        currentStatus={currentStatus}
        reportId={reportId}
        onClose={() => setShowModal(false)}
        onStatusChange={onStatusChange}
      />
    </>
  );
};

const NGOReports: React.FC = () => {
  const navigation = useNavigation<any>();
  const [reports, setReports] = useState<Report[]>([]);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');

  const processChartData = useCallback((data: Report[]) => {
    const reportCounts: { [key: string]: number } = {};
    data.forEach(report => {
      reportCounts[report.type] = (reportCounts[report.type] || 0) + 1;
    });

    const formattedData: ChartDataItem[] = Object.keys(reportCounts).map((type, index) => ({
      name: type,
      count: reportCounts[type],
      color: BAR_COLORS[index % BAR_COLORS.length]
    }));

    setChartData(formattedData);
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ngo-reports`);
      const data = await response.json();
      setReports(data);
      processChartData(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      Alert.alert('Error', 'Failed to fetch reports');
    }
  }, [processChartData]);

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

  useEffect(() => {
    checkAuth();
    fetchReports();
  }, [fetchReports]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userEmail', 'responderType']);
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    Alert.alert(
      "Confirm Update",
      `Change status to "${newStatus}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
              });

              if (response.ok) {
                setReports((prevReports) =>
                  prevReports.map((report) =>
                    report._id === reportId ? { ...report, status: newStatus } : report
                  )
                );
                Alert.alert("Success", "Report status updated successfully!");
              } else {
                Alert.alert("Error", "Failed to update report status.");
              }
            } catch (error) {
              console.error("Error updating status:", error);
              Alert.alert("Error", "Error updating status. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleDeleteReport = async (reportId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this report?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
                method: "DELETE",
              });

              if (response.ok) {
                setReports((prevReports) => prevReports.filter((report) => report._id !== reportId));
                processChartData(reports.filter((report) => report._id !== reportId));
                Alert.alert("Success", "Report deleted successfully!");
              } else {
                Alert.alert("Error", "Failed to delete report.");
              }
            } catch (error) {
              console.error("Error deleting report:", error);
              Alert.alert("Error", "Error deleting report. Please try again.");
            }
          }
        }
      ]
    );
  };

  const SimpleBarChart = () => {
    const maxCount = Math.max(...chartData.map(d => d.count), 1);
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Icon name="bar-chart" size={20} color="#0077b6" />
          <Text style={styles.chartTitle}>Reports by Type</Text>
        </View>
        <View style={styles.barsContainer}>
          {chartData.map((item, index) => (
            <View key={index} style={styles.barWrapper}>
              <View style={styles.barColumn}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: `${(item.count / maxCount) * 100}%`,
                      backgroundColor: item.color 
                    }
                  ]}
                />
              </View>
              <Text style={styles.barLabel} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.barCount}>{item.count}</Text>
            </View>
          ))}
        </View>
      </View>
    );
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

      <ScrollView 
        style={styles.mainContent}
        contentContainerStyle={styles.scrollContent}
      >
        <ImageBackground
          source={require('../../../assets/ocean-bg.jpg')}
          style={styles.backgroundImage}
          imageStyle={{ opacity: 0.3 }}
        >
          <View style={styles.content}>
            <Text style={styles.pageTitle}>📊 NGO Reports Management</Text>

            {chartData.length > 0 && <SimpleBarChart />}

            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Icon name="table" size={20} color="#0077b6" />
                <Text style={styles.tableHeaderTitle}>All Reports</Text>
                <View style={styles.statusLegend}>
                  {STATUS_OPTIONS.map((status) => {
                    const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
                    return (
                      <View key={status} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: color.border }]} />
                        <Text style={styles.legendText}>{status}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={styles.tableWrapper}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.headerCell, styles.cellType]}>Type</Text>
                    <Text style={[styles.headerCell, styles.cellDescription]}>Description</Text>
                    <Text style={[styles.headerCell, styles.cellAddress]}>Address</Text>
                    <Text style={[styles.headerCell, styles.cellComment]}>Comment</Text>
                    <Text style={[styles.headerCell, styles.cellLaw]}>Predicted Law</Text>
                    <Text style={[styles.headerCell, styles.cellReportedBy]}>Reported By</Text>
                    <Text style={[styles.headerCell, styles.cellDate]}>Date Reported</Text>
                    <Text style={[styles.headerCell, styles.cellStatus]}>Status</Text>
                    <Text style={[styles.headerCell, styles.cellActions]}>Actions</Text>
                  </View>

                  {reports.length > 0 ? (
                    reports.map((report, index) => (
                      <View 
                        key={report._id} 
                        style={[
                          styles.tableRow,
                          index % 2 === 0 ? styles.evenRow : styles.oddRow
                        ]}
                      >
                        <Text style={[styles.cell, styles.cellType, styles.cellTypeBold]}>{report.type}</Text>
                        <Text style={[styles.cell, styles.cellDescription]} numberOfLines={3}>
                          {report.description}
                        </Text>
                        <Text style={[styles.cell, styles.cellAddress]} numberOfLines={2}>
                          {report.address}
                        </Text>
                        <Text style={[styles.cell, styles.cellComment]} numberOfLines={3}>
                          {report.comment}
                        </Text>
                        <Text style={[styles.cell, styles.cellLaw]} numberOfLines={3}>
                          {report.predictedLaw}
                        </Text>
                        <Text style={[styles.cell, styles.cellReportedBy]}>
                          {report.reportedBy}
                        </Text>
                        <Text style={[styles.cell, styles.cellDate]}>
                          {new Date(report.dateReported).toLocaleString()}
                        </Text>
                        <View style={[styles.cell, styles.cellStatus]}>
                          <StatusBadge
                            currentStatus={report.status || "Pending"}
                            reportId={report._id}
                            onStatusChange={handleStatusChange}
                          />
                        </View>
                        <View style={[styles.cell, styles.cellActions]}>
                          <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={() => handleDeleteReport(report._id)}
                            activeOpacity={0.8}
                          >
                            <Icon name="trash" size={16} color="#fff" />
                            <Text style={styles.deleteButtonText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.noDataContainer}>
                      <Icon name="inbox" size={48} color="#ccc" />
                      <Text style={styles.noDataText}>No reports found.</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
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
  mainContent: {
    flex: 1,
    marginTop: 60,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backgroundImage: {
    flex: 1,
    minHeight: height,
  },
  content: {
    padding: 20,
  },
  pageTitle: {
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
  chartContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0077b6',
    marginLeft: 8,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    paddingHorizontal: 10,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  barColumn: {
    width: '100%',
    height: 150,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    minHeight: 10,
  },
  barLabel: {
    fontSize: 10,
    color: '#333',
    marginTop: 5,
    textAlign: 'center',
  },
  barCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0077b6',
    marginTop: 2,
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 2,
    borderBottomColor: '#0077b6',
    flexWrap: 'wrap',
  },
  tableHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0077b6',
    marginLeft: 8,
  },
  statusLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
  tableWrapper: {
    padding: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#0077b6',
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderRadius: 8,
    marginBottom: 2,
  },
  headerCell: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    borderRadius: 4,
    alignItems: 'center',
  },
  evenRow: {
    backgroundColor: '#f9f9f9',
  },
  oddRow: {
    backgroundColor: '#fff',
  },
  cell: {
    fontSize: 11,
    color: '#333',
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  cellType: { width: 100 },
  cellTypeBold: { fontWeight: '600', color: '#0077b6' },
  cellDescription: { width: 180 },
  cellAddress: { width: 160 },
  cellComment: { width: 180 },
  cellLaw: { width: 180 },
  cellReportedBy: { width: 120 },
  cellDate: { width: 150 },
  cellStatus: { width: 150 },
  cellActions: { width: 120 },
  statusDropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 2,
    minWidth: 110,
  },
  statusBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  statusModalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  statusModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  statusModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  statusModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0077b6',
    flex: 1,
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  currentStatusSection: {
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  currentStatusLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    fontWeight: '600',
  },
  currentStatusDisplay: {
    alignItems: 'flex-start',
  },
  currentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 3,
    gap: 10,
  },
  currentStatusText: {
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusOptionsSection: {
    padding: 20,
  },
  statusOptionsLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    fontWeight: '600',
  },
  statusOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  statusOptionButtonDisabled: {
    opacity: 0.5,
  },
  statusOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  currentBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginLeft: 8,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(0, 0, 0, 0.6)',
    letterSpacing: 0.5,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#777',
    marginTop: 12,
  },
});

export default NGOReports;