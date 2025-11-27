//components/outside/about.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define the navigation type
type RootStackParamList = {
  Home: undefined;
  Welcome: undefined;
  About: undefined;
  Contact: undefined;
  Login: undefined;
  Register: undefined;
};

type AboutScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'About'>;

type Props = {
  navigation: AboutScreenNavigationProp;
};

export default function About({ navigation }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const adviser = {
    name: 'Joan C. Mag-isa',
    role: 'Project Adviser',
    department: 'Department Name',
    image: require('../../assets/adviser.jpg')
  };

  const teamMembers = [
    { 
      name: 'Roschel Mae E. Ano-Os', 
      nickname: 'Ros',
      age: 20,
      birthday: 'August 07, 2004',
      education: 'TUP Taguig - IT Student (3rd Year)',
      role: 'Fullstack Developer', 
      image: require('../../assets/anoos.png') 
    },
       { 
      name: 'Zhaira Mhea Cabria', 
      nickname: 'Zhai',
      age: 21,
      birthday: 'October 5, 2003',
      education: 'TUP Taguig - IT Student',
      role: 'Project Documentation Lead & Client Liaison', 
      image: require('../../assets/cabria.png') 
    },
    { 
      name: 'John Aldy Delariman', 
      nickname: 'Aldy',
      age: 22,
      birthday: 'July 10, 2002',
      education: 'TUP Taguig - IT Student',
      role: 'Ass. Frontend/AI Developer', 
      image: require('../../assets/aldy.png') 
    },
    { 
      name: 'John Meynard Legayada', 
      nickname: 'JM',
      age: 20,
      birthday: 'June 15, 2004',
      education: 'TUP Taguig - IT Student',
      role: 'Documentation Assistant & Client Support', 
      image: require('../../assets/Jm.png') 
    }
  ];

  const openModal = (member: any) => {
    setSelectedMember(member);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="earth" size={30} color="white" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>BlueGuard</Text>
      </View>

      <ScrollView style={styles.body}>
        <View style={styles.missionContainer}>
          <Text style={styles.missionTitle}>Our Mission</Text>
          <Text style={styles.missionText}>
            We are committed to ocean conservation by leveraging technology to
            drive awareness, engagement, and action towards protecting marine
            ecosystems.
          </Text>
        </View>

        {/* Meet Our Team Section */}
        <View style={styles.teamHeader}>
          <Ionicons name="people" size={30} color="white" />
          <Text style={styles.teamTitle}>Meet Our Team</Text>
        </View>

        <View style={styles.teamContainer}>
          {teamMembers.map((member, index) => (
            <TouchableOpacity key={index} onPress={() => openModal(member)} style={styles.teamCard}>
              <Image source={member.image} style={styles.image} />
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Our Adviser Section */}
        <View style={styles.adviserHeader}>
          <Ionicons name="school" size={30} color="white" />
          <Text style={styles.adviserTitle}>Our TA</Text>
        </View>

        <View style={styles.adviserContainer}>
          <TouchableOpacity onPress={() => openModal(adviser)} style={styles.adviserCard}>
            <Image source={adviser.image} style={styles.adviserImage} />
            <Text style={styles.adviserName}>{adviser.name}</Text>
            <Text style={styles.adviserRole}>{adviser.role}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal for Member Details */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedMember && (
              <>
                <Image source={selectedMember.image} style={styles.modalImage} />
                <Text style={styles.modalName}>{selectedMember.name}</Text>
                <Text style={styles.modalText}>Nickname: {selectedMember.nickname}</Text>
                <Text style={styles.modalText}>Age: {selectedMember.age}</Text>
                <Text style={styles.modalText}>Birthday: {selectedMember.birthday}</Text>
                <Text style={styles.modalText}>Education: {selectedMember.education}</Text>
                <Text style={styles.modalText}>Role: {selectedMember.role}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Navbar */}
      <View style={styles.footer}>
        {[
          { name: 'Home', icon: 'home', screen: 'Welcome' },
          { name: 'About Us', icon: 'information-circle', screen: 'About' },
          { name: 'Contact Us', icon: 'call', screen: 'Contact' },
          { name: 'Login', icon: 'log-in', screen: 'Login' },
          { name: 'Register', icon: 'person-add', screen: 'Register' }
        ].map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.navButton} 
            onPress={() => navigation.navigate(item.screen as keyof RootStackParamList)}
          >
            <Ionicons name={item.icon as any} size={24} color="white" />
            <Text style={styles.navText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

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
    justifyContent: 'center',
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    padding: 20,
  },
  missionContainer: {
    backgroundColor: '#004A7C',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  missionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  missionText: {
    fontSize: 16,
    color: '#D1E8FF',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  teamTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  teamContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  teamCard: {
    backgroundColor: '#004A7C',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  memberRole: {
    fontSize: 14,
    color: '#D1E8FF',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '80%',
  },
  modalImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  modalName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000957',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  closeButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#000957',
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000957',
    padding: 10,
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  navButton: {
    alignItems: 'center',
  },
  navText: {
    color: 'white',
    fontSize: 12,
  },
  adviserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  adviserTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  adviserContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  adviserCard: {
    backgroundColor: '#004A7C',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: '70%',
  },
  adviserImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  adviserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  adviserRole: {
    fontSize: 16,
    color: '#D1E8FF',
    textAlign: 'center',
  },
});