// App.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Welcome from './components/outside/welcome';
import About from './components/outside/about';
import Contact from './components/outside/contact';
import Login from './components/outside/login';
import Register from './components/outside/register';
import VerifyEmail from './components/outside/verifyEmail';
import Dash from './components/user/Dash';
import Notifications from './components/user/Notification/Notifications';
import Report from './components/user/Reports/Report';
import MyReports from './components/user/Reports/MyReports';
import Rewards from './components/user/Rewards/Rewards';
import Receipts from './components/user/Rewards/Receipts';
import Knowledge from './components/user/KnowledgeBase/Knowledge';
import Profile from './components/user/Profile/Profile';
import OceanCleanupGame from './components/user/Games/OceanCleanupGame';
import Chat from './components/user/Chat/Chat';
import ChatList from './components/user/Chat/ChatList';
import Cleaning from './components/user/Cleaning';
import DashCharts from './components/user/Reports/DashCharts';
import CompletedReports from './components/user/Reports/CompletedReports';
import PendingReports from './components/user/Reports/PendingReports';
import OceanLife from './components/user/OceanLife';
import OceanNews from './components/user/OceanNews';
import ResLogin from './components/responders/ResLogin';
import ResRegister from './components/responders/ResRegister';
import CheckSchedule from './components/user/Basura/CheckSchedule';
import Schedule from './components/user/Basura/Schedule';
import Donation from './components/user/Basura/Donation';
import OceanMemoryGame from './components/user/Games/OceanMemoryGame';

// Admin Components
import Admin from './components/responders/Admin/Admin';
import AdminDetect from './components/responders/Admin/AdminDetect';
import AdminUsers from './components/responders/Admin/AdminUsers';
import AdminResponders from './components/responders/Admin/AdminResponders';
import AdminDeactivated from './components/responders/Admin/AdminDeactivated';
import AdminFlagged from './components/responders/Admin/AdminFlagged';
import AdminMessages from './components/responders/Admin/AdminMessages';
import Adminschedule from './components/responders/Admin/Adminschedule';
import AdminDonations from './components/responders/Admin/AdminDonations';

// Barangay Components
import Barangay from './components/responders/Barangay/Barangay';
import BarangayReports from './components/responders/Barangay/BarangayReports';
import BarangayOngoing from './components/responders/Barangay/BarangayOngoing';
import BarangayCompleted from './components/responders/Barangay/BarangayCompleted';
import BarangaySettings from './components/responders/Barangay/BarangaySettings';
import BarangayCancelled from './components/responders/Barangay/BarangayCancelled';
import Messages from './components/responders/Barangay/Messages';
import BarangayDonations from './components/responders/Barangay/BarangayDonations';

// NGO Components
import NGO from './components/responders/NGO/NGO';
import NGOCompleted from './components/responders/NGO/NGOCompleted';
import NGOReports from './components/responders/NGO/NGOReports';
import NGOOngoing from './components/responders/NGO/NGOOngoing';
import NGOSettings from './components/responders/NGO/NGOSettings';
import NGOMessages from './components/responders/NGO/NGOMessages';

// PCG Components
import PCG from './components/responders/PCG/PCG';
import PCGReports from './components/responders/PCG/PCGReports';
import PCGCompleted from './components/responders/PCG/PCGCompleted';
import PCGOngoing from './components/responders/PCG/PCGOngoing';
import PCGMessages from './components/responders/PCG/PCGMessages';
import PCGSettings from './components/responders/PCG/PCGSettings';

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }) {
  const handleGetStarted = () => {
    navigation.navigate('Welcome');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌊 OceanProtect</Text>
      <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Welcome" component={Welcome} />
        <Stack.Screen name="About" component={About} />
        <Stack.Screen name="Contact" component={Contact} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmail} />
        <Stack.Screen name="Dash" component={Dash} />
        <Stack.Screen name="DashCharts" component={DashCharts} /> 
        <Stack.Screen name="Notifications" component={Notifications} />
        <Stack.Screen name="Report" component={Report} />
        <Stack.Screen name="Reports" component={MyReports} />
        <Stack.Screen name="PendingReports" component={PendingReports} />
        <Stack.Screen name="CompletedReports" component={CompletedReports} />
        <Stack.Screen name="Rewards" component={Rewards} />
        <Stack.Screen name="Receipts" component={Receipts} />
        <Stack.Screen name="Knowledge" component={Knowledge} />
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="OceanCleanupGame" component={OceanCleanupGame} />
        <Stack.Screen name="OceanMemoryGame" component={OceanMemoryGame} />
        <Stack.Screen name="OceanNews" component={OceanNews} />
        <Stack.Screen name="OceanLife" component={OceanLife} />
        <Stack.Screen name="Chat" component={Chat} />
        <Stack.Screen name="ChatList" component={ChatList} />
        <Stack.Screen name="Cleaning" component={Cleaning} />
        <Stack.Screen name="CheckSchedule" component={CheckSchedule} />
        <Stack.Screen name="Schedule" component={Schedule} />
        <Stack.Screen name="Donation" component={Donation} />

        {/* Responder & Admin Routes */}
        <Stack.Screen name="ResLogin" component={ResLogin} />
        <Stack.Screen name="ResRegister" component={ResRegister} />
        <Stack.Screen name="Admin" component={Admin} />
        <Stack.Screen name="AdminDetect" component={AdminDetect} />
        <Stack.Screen name="AdminUsers" component={AdminUsers} />
        <Stack.Screen name="AdminResponders" component={AdminResponders} /> 
        <Stack.Screen name="AdminDeactivated" component={AdminDeactivated} />
        <Stack.Screen name="AdminDonations" component={AdminDonations} /> 
        <Stack.Screen name="AdminSchedule" component={Adminschedule} />
        <Stack.Screen name="AdminFlagged" component={AdminFlagged} />
        <Stack.Screen name="AdminMessages" component={AdminMessages} />

        {/* Barangay Routes */}
        <Stack.Screen name="Barangay" component={Barangay} />
        <Stack.Screen name="BarangayReports" component={BarangayReports} /> 
        <Stack.Screen name="BarangayOngoing" component={BarangayOngoing} />
        <Stack.Screen name="BarangayCompleted" component={BarangayCompleted} />
        <Stack.Screen name="BarangaySettings" component={BarangaySettings} />
        <Stack.Screen name="BarangayCancelled" component={BarangayCancelled} />
        <Stack.Screen name="Messages" component={Messages} />
        <Stack.Screen name="BarangayDonations" component={BarangayDonations} />
       
        {/* NGO Routes */}
        <Stack.Screen name="NGO" component={NGO} />
        <Stack.Screen name="NGOCompleted" component={NGOCompleted} />
        <Stack.Screen name="NGOReports" component={NGOReports} />
        <Stack.Screen name="NGOOngoing" component={NGOOngoing} />
        <Stack.Screen name="NGOSettings" component={NGOSettings} />
        <Stack.Screen name="NGOMessages" component={NGOMessages} />
      
        {/* PCG Routes */}
        <Stack.Screen name="PCG" component={PCG} />
        <Stack.Screen name="PCGReports" component={PCGReports} />
        <Stack.Screen name="PCGCompleted" component={PCGCompleted} />
        <Stack.Screen name="PCGOngoing" component={PCGOngoing} />
        <Stack.Screen name="PCGMessages" component={PCGMessages} />
        <Stack.Screen name="PCGSettings" component={PCGSettings} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A5EB0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 30,
  },
  button: {
    backgroundColor: 'white',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A5EB0',
  },
});