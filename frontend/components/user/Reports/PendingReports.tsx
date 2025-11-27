import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define types for the navigation
type RootStackParamList = {
  Login: undefined;
  Dash: undefined;
  Notifications: undefined;
  Reports: undefined;
  Rewards: undefined;
  Knowledge: undefined;
  Profile: undefined;
};

type PendingReportsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PendingReportsProps {
  navigation: PendingReportsNavigationProp;
}

interface Report {
  _id: string;
  type?: string;
  description?: string;
  predictedLaw?: string;
  address?: string;
  dateReported: string;
  comment?: string;
  reportTo?: string | string[];
  reportedBy: string;
  responderType?: string;
}

interface UserData {
  user?: {
    name?: string;
    email?: string;
  };
}

const API_BASE_URL = 'http://10.120.221.103:5000';

const PendingReports: React.FC<PendingReportsProps> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("Kaibigan");
  const [reports, setReports] = useState<Report[]>([]);

  const fetchUserData = async (): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: UserData = await response.json();
      if (response.ok) {
        const name = data.user?.name || data.user?.email || "Kaibigan";
        setUserName(name);
        // After getting user data, fetch the reports
        fetchReports(token, name);
      } else {
        console.error('Error fetching user:', data);
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchReports = async (token: string, userName: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/get-reported`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: Report[] = await response.json();
      if (response.ok) {
        // Filter reports to only show those reported by the current user
        const userReports = data.filter(report => report.reportedBy === userName);
        console.log('User reports:', userReports); // Debug: log filtered reports
        setReports(userReports);
      } else {
        console.error('Error fetching reports:', data);
      }
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    fetchUserData();
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (responderType?: string): string => {
    switch(responderType) {
      case 'Barangay':
        return '#FFB347'; // Orange
      case 'NGO':
        return '#64B5F6'; // Light Blue
      case 'PCG':
        return '#FF6961'; // Red
      default:
        return '#888888'; // Gray
    }
  };

  const renderReportItem = ({ item }: { item: Report }) => (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle}>{item.type || "Untitled Report"}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.responderType) }]}>
          <Text style={styles.statusText}>{item.responderType || "PENDING"}</Text>
        </View>
      </View>
      
      <Text style={styles.reportDescription} numberOfLines={2}>
        {item.description || "No description provided."}
      </Text>
      
      <View style={styles.lawSection}>
        <Text style={styles.lawLabel}>Predicted Law:</Text>
        <Text style={styles.lawText}>{item.predictedLaw || "No law prediction available"}</Text>
      </View>
      
      <View style={styles.reportFooter}>
        <View style={styles.reportDetail}>
          <Ionicons name="location" size={16} color="#009990" />
          <Text style={styles.reportDetailText}>{item.address || "Unknown Location"}</Text>
        </View>
        <View style={styles.reportDetail}>
          <Ionicons name="calendar" size={16} color="#009990" />
          <Text style={styles.reportDetailText}>{formatDate(item.dateReported)}</Text>
        </View>
      </View>
      
      {item.comment && (
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>Comment:</Text>
          <Text style={styles.commentText}>{item.comment}</Text>
        </View>
      )}
      
      <View style={styles.reportToSection}>
        <Text style={styles.reportToLabel}>Reported To:</Text>
        <Text style={styles.reportToText}>
          {Array.isArray(item.reportTo) ? item.reportTo.join(", ") : item.reportTo || "Unknown"}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="earth" size={30} color="white" />
        <Text style={styles.headerTitle}>BlueGuard</Text>
      </View>

      <View style={styles.titleContainer}>
        <Ionicons name="document-text" size={24} color="#009990" />
        <Text style={styles.pageTitle}>My Pending Reports</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#009990" />
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item._id || Math.random().toString()}
          contentContainerStyle={styles.reportsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#009990']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={60} color="#aaa" />
              <Text style={styles.emptyText}>No pending reports found</Text>
            </View>
          }
        />
      )}

      {/* Spacer to ensure content isn't hidden behind the footer */}
      <View style={{ height: 80 }} />
      
      {/* Footer */}
      <View style={styles.footer}>
        {[
          { name: 'Dashboard', icon: 'home' as const, screen: 'Dash' as const },
          { name: 'Notifications', icon: 'notifications' as const, screen: 'Notifications' as const },
          { name: 'My Reports', icon: 'document-text' as const, screen: 'Reports' as const },
          { name: 'Rewards', icon: 'trophy' as const, screen: 'Rewards' as const },
          { name: 'Knowledge', icon: 'book' as const, screen: 'Knowledge' as const },
          { name: 'Profile', icon: 'person' as const, screen: 'Profile' as const }
        ].map((item, index) => (
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
    backgroundColor: '#F5F5F5',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#000957', 
    justifyContent: 'center' 
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FFFFFF', 
    marginLeft: 10 
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportsList: {
    padding: 15,
    paddingBottom: 100,
  },
  reportCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  reportDescription: {
    color: '#666',
    marginBottom: 10,
  },
  lawSection: {
    marginVertical: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  lawLabel: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#333',
  },
  lawText: {
    fontSize: 14,
    color: '#009990',
    marginTop: 2,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  reportDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  commentSection: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  commentLabel: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#333',
  },
  commentText: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  reportToSection: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportToLabel: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#333',
    marginRight: 5,
  },
  reportToText: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyText: {
    marginTop: 10,
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
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

export default PendingReports;