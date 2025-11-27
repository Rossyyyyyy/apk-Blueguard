import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Import the chart components
import { ReportDonutChart, ReportBarChart } from './ChartComponents';

// ########## GLOBAL API URL (EASIER TO MANAGE) ##########
const API_URL = 'http://10.120.221.103:5000';

// Type definitions
interface Report {
  _id: string;
  incidentType: string;
  eventDescription: string;
  address: string;
  comments?: string;
  reportedBy?: string;
  createdAt?: string;
}

interface User {
  _id: string;
  name: string;
}

interface ChartDataItem {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

interface BarChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
  }>;
}

type RootStackParamList = {
  Login: undefined;
  Dash: undefined;
  Notifications: undefined;
  Reports: undefined;
  Rewards: undefined;
  Knowledge: undefined;
  Profile: undefined;
};

type ReportsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Reports'>;

interface ReportsProps {
  navigation: ReportsNavigationProp;
}

const Reports: React.FC<ReportsProps> = ({ navigation }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [predictedLaw, setPredictedLaw] = useState<string>('');
  const [language, setLanguage] = useState<'en' | 'fil'>('en');
  const [selectedReports, setSelectedReports] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [chartData, setChartData] = useState<ChartDataItem[] | undefined>(undefined);
  const [barChartData, setBarChartData] = useState<BarChartData | undefined>(undefined);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    fetchUserData();
  }, []);

  // --- Data Fetching Functions ---

  const fetchUserData = async (): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await fetch(`${API_URL}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        fetchReports(data.user._id, token);
        fetchUnreadNotifications(token);
      } else {
        console.error('Error fetching user:', data.message);
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setLoading(false);
    }
  };

  const fetchUnreadNotifications = async (token: string) => {
    try {
      console.log('📬 Fetching unread notifications count...');
      
      const response = await fetch(`${API_URL}/notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setUnreadCount(data.unreadCount || 0);
        console.log(`✅ Unread notifications count: ${data.unreadCount}`);
      } else {
        console.error('❌ Error fetching notifications:', data.message);
      }
    } catch (error) {
      console.error('❌ Error fetching unread notifications:', error);
    }
  };

  const fetchReports = async (userId: string, token: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/reports/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const text = await response.text();
      console.log('Raw Response:', text);

      const data = JSON.parse(text);
      if (data.success) {
        setReports(data.reports);
        prepareChartData(data.reports);
      } else {
        console.error('Failed to fetch reports:', data.message);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- AI Prediction Function (Updated to call local server) ---

  const fetchPredictedLaw = async (incidentType: string, targetLanguage: 'en' | 'fil' = 'en'): Promise<void> => {
    try {
      setPredictedLaw('Loading legal analysis...');
      const response = await axios.post(
        `${API_URL}/predict-law`,
        {
          incidentType: incidentType,
          targetLanguage: targetLanguage
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log('Local Server Prediction Response:', response.data);

      if (response.data.success && response.data.predictedLaw) {
        setPredictedLaw(response.data.predictedLaw);
      } else {
        setPredictedLaw(response.data.message || 'Error predicting law via server.');
      }

    } catch (error: any) {
      console.error('Error fetching predicted law via local server:', error.response?.data || error.message);
      setPredictedLaw('Network Error: Could not connect to AI service.');
    }
  };

  // --- Chart & Utility Functions ---

  const prepareChartData = (reports: Report[]): void => {
    const incidentCounts: { [key: string]: number } = {};
    reports.forEach(report => {
      const type = report.incidentType;
      incidentCounts[type] = (incidentCounts[type] || 0) + 1;
    });

    const donutData: ChartDataItem[] = Object.keys(incidentCounts).map((key, index) => {
      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
      return {
        name: key,
        population: incidentCounts[key],
        color: colors[index % colors.length],
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      };
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyCounts: number[] = Array(12).fill(0);

    reports.forEach(report => {
      const reportDate = new Date(report.createdAt || Date.now());
      const month = reportDate.getMonth();
      monthlyCounts[month]++;
    });

    const barData: BarChartData = {
      labels: months,
      datasets: [
        {
          data: monthlyCounts,
        },
      ],
    };

    setChartData(donutData);
    setBarChartData(barData);
  };

  const toggleLanguage = (): void => {
    const newLang = language === 'en' ? 'fil' : 'en';
    setLanguage(newLang);

    if (selectedReport) {
      fetchPredictedLaw(selectedReport.incidentType, newLang);
    }
  };

  const deleteReport = async (reportId: string, updateUI: boolean = true): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const text = await response.text();
      console.log("Raw response:", text);

      try {
        const data = JSON.parse(text);
        if (data.success) {
          if (updateUI) {
            const updatedReports = reports.filter(report => report._id !== reportId);
            setReports(updatedReports);
            prepareChartData(updatedReports);
            setModalVisible(false);
          }
        } else {
          console.error('Failed to delete report:', data.message);
          Alert.alert("Error", `Failed to delete report: ${data.message}`);
        }
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError, "Raw response:", text);
      }

    } catch (error: any) {
      console.error('Error deleting report:', error.message);
      Alert.alert("Error", "Error deleting report. Please check your network.");
    }
  };

  const handleReportSubmit = async (): Promise<void> => {
    if (!selectedReport) {
      Alert.alert("Error", "No report selected.");
      return;
    }

    if (!selectedReports) {
      Alert.alert("Error", "Please select a responder type (Barangay, NGO, or PCG).");
      return;
    }

    const finalPredictedLaw = predictedLaw.startsWith('Network Error') 
      ? 'Law prediction failed.' 
      : predictedLaw || "No applicable law found";

    const reportData = {
      type: selectedReport.incidentType,
      description: selectedReport.eventDescription,
      address: selectedReport.address,
      comment: selectedReport.comments || "No comment",
      predictedLaw: finalPredictedLaw,
      reportTo: [selectedReports],
      responderType: selectedReports,
      reportedBy: user?.name || "Unknown",
      originalReportId: selectedReport._id
    };

    try {
      const response = await fetch(`${API_URL}/reported`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });

      const text = await response.text();
      console.log("Raw response:", text);

      const data = JSON.parse(text);

      if (data.success) {
        try {
          const token = await AsyncStorage.getItem('token');
          const deleteResponse = await fetch(`${API_URL}/reports/${selectedReport._id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
          });

          const deleteText = await deleteResponse.text();
          console.log("Delete response:", deleteText);

          const deleteData = JSON.parse(deleteText);
          
          if (deleteData.success) {
            console.log(`✅ Report ${selectedReport._id} deleted successfully from Reports collection`);
          } else {
            console.warn(`⚠️ Could not delete report from Reports: ${deleteData.message}`);
          }
        } catch (deleteError: any) {
          console.error('⚠️ Error deleting original report:', deleteError.message);
        }

        const updatedReports = reports.filter(report => report._id !== selectedReport._id);
        setReports(updatedReports);
        prepareChartData(updatedReports);

        Alert.alert("Success", `Report submitted successfully to ${selectedReports}!`);
        setModalVisible(false);
        setSelectedReport(null);
        setSelectedReports('');
        setPredictedLaw('');
        
      } else {
        Alert.alert("Error", "Failed to submit report: " + data.message);
      }
    } catch (error: any) {
      console.error("Error submitting report:", error);
      Alert.alert("Error", "Error submitting report. Please check your internet connection and try again.");
    }
  };

  const openModal = (report: Report): void => {
    setSelectedReport(report);
    setModalVisible(true);
    setLanguage('en');
    setPredictedLaw('');
    fetchPredictedLaw(report.incidentType, 'en');
  };

  // --- Render ---

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="document-text" size={30} color="white" />
        <Text style={styles.headerTitle}>My Reports</Text>
      </View>

      {/* Top Banner */}
      {loading ? (
        <ActivityIndicator size="large" color="white" style={styles.loadingIndicator} />
      ) : (
        user && (
          <View style={styles.topBanner}>
            <Text style={styles.bannerText}>Welcome, **{user.name}**!</Text>
          </View>
        )
      )}

      {/* Reports Data Visualization */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Charts Section */}
        {!loading && reports.length > 0 && chartData && barChartData && (
          <>
            <Text style={styles.sectionTitle}>Incident Statistics</Text>
            <ReportDonutChart data={chartData} />
            <ReportBarChart data={barChartData} />
          </>
        )}

        {/* Reports List Section */}
        <Text style={styles.sectionTitle}>Report List ({reports.length})</Text>
        {loading ? (
          <ActivityIndicator size="large" color="white" />
        ) : reports.length > 0 ? (
          reports.map((report) => (
            <TouchableOpacity
              key={report._id}
              style={styles.reportContainer}
              onPress={() => openModal(report)}
            >
              <Ionicons name="clipboard" size={24} color="#000957" />
              <View style={styles.reportTextContainer}>
                <Text style={styles.reportTitle}>{report.eventDescription}</Text>
                <Text style={styles.reportStatus}>Type: {report.incidentType}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noReportsText}>No reports found</Text>
        )}
      </ScrollView>

      {/* Modal for Report Details */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Incident Details</Text>
            {selectedReport && (
              <>
                <Text style={styles.modalText}><Text style={styles.bold}>Type:</Text> {selectedReport.incidentType}</Text>
                <Text style={styles.modalText}><Text style={styles.bold}>Description:</Text> {selectedReport.eventDescription}</Text>
                <Text style={styles.modalText}><Text style={styles.bold}>Address:</Text> {selectedReport.address}</Text>
                <Text style={styles.modalText}><Text style={styles.bold}>Comment:</Text> {selectedReport.comments || "No comment"}</Text>
                <Text style={[styles.modalText, { marginTop: 10, paddingHorizontal: 10 }]}>
                  <Text style={styles.bold}>Predicted Law ({language.toUpperCase()}):</Text> {predictedLaw || "Loading..."}
                </Text>
                <Text style={styles.modalText}><Text style={styles.bold}>Reported By:</Text> {selectedReport.reportedBy || user?.name || "Unknown"}</Text>
              </>
            )}

            {/* Checkboxes for reporting */}
            <Text style={styles.modalTitle}>Report To:</Text>
            {['Barangay', 'NGO', 'PCG'].map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.radioContainer}
                onPress={() => setSelectedReports(option)}
              >
                <View style={[styles.radioOuter, selectedReports === option && styles.radioOuterSelected]}>
                  {selectedReports === option && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioLabel}>{option}</Text>
              </TouchableOpacity>
            ))}

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.translateButton]}
                onPress={toggleLanguage}
              >
                <Text style={styles.buttonText}>
                  {language === 'en' ? 'Translate to FIL' : 'Translate to ENG'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.deleteButton]}
                onPress={() => {
                  Alert.alert(
                    "Confirm Deletion",
                    "Are you sure you want to permanently delete this report?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => selectedReport && deleteReport(selectedReport._id) }
                    ]
                  );
                }}
              >
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.buttonContainer, { marginTop: 10 }]}>
              <TouchableOpacity
                style={[styles.button, styles.reportButton]}
                onPress={handleReportSubmit}
              >
                <Text style={styles.buttonText}>Submit to Responder</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.closeButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer with Notification Badge */}
      <View style={styles.footer}>
        {[
          { name: 'Dashboard', icon: 'home' as const, screen: 'Dash' as const },
          { name: 'Notifications', icon: 'notifications' as const, screen: 'Notifications' as const },
          { name: 'My Reports', icon: 'document-text' as const, screen: 'Reports' as const },
          { name: 'Rewards', icon: 'trophy' as const, screen: 'Rewards' as const },
          { name: 'Knowledge', icon: 'book' as const, screen: 'Knowledge' as const },
          { name: 'Profile', icon: 'person' as const, screen: 'Profile' as const }
        ].map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={[
              styles.navButton,
              item.screen === 'Reports' && styles.activeNavButton
            ]} 
            onPress={() => navigation.navigate(item.screen)}
          >
            <Ionicons 
              name={item.icon} 
              size={24} 
              color={item.screen === 'Reports' ? "#FFD700" : "white"} 
            />
            <Text style={[
              styles.navText,
              item.screen === 'Reports' && styles.activeNavText
            ]}>
              {item.name}
            </Text>
            {item.screen === 'Notifications' && unreadCount > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A5EB0' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000957',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', marginLeft: 10 },
  contentContainer: { padding: 20, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    marginBottom: 10,
  },
  reportContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  reportTextContainer: { marginLeft: 10, flex: 1 },
  reportTitle: { fontSize: 16, color: '#000957', fontWeight: 'bold' },
  reportStatus: { fontSize: 12, color: '#555' },
  noReportsText: { fontSize: 16, color: 'white', textAlign: 'center', marginTop: 20 },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000957',
    width: '100%',
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  navButton: { 
    alignItems: 'center',
    paddingVertical: 5,
    position: 'relative',
  },
  activeNavButton: {
    borderBottomWidth: 3,
    borderBottomColor: '#FFD700',
  },
  navText: { 
    color: 'white', 
    fontSize: 12,
    marginTop: 2,
  },
  activeNavText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#FF5733',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  navBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000957',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'center',
  },
  bold: {
    fontWeight: 'bold',
  },
  reportButton: {
    backgroundColor: '#28A745',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    width: '100%',
    paddingLeft: 20,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0A5EB0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioOuterSelected: {
    borderColor: '#0A5EB0',
    backgroundColor: '#0A5EB0',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 15,
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buttonText: { fontSize: 14, fontWeight: 'bold', color: 'white' },
  translateButton: { backgroundColor: '#0A5EB0' },
  deleteButton: { backgroundColor: 'red' },
  closeButton: { backgroundColor: '#FFD700' },
  topBanner: {
    backgroundColor: '#000957',
    padding: 10,
    alignItems: 'center',
  },
  bannerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingIndicator: {
    marginTop: 20,
  },
});

export default Reports;