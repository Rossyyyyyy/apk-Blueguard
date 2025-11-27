// components/outside/welcome.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define navigation types
type RootStackParamList = {
  Home: undefined;
  About: undefined;
  Contact: undefined;
  Login: undefined;
  Register: undefined;
  ResLogin: undefined;
  ResRegister: undefined;
};

type WelcomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface WelcomeProps {
  navigation: WelcomeNavigationProp;
}

// Define types for data structures
interface OceanImage {
  image: ImageSourcePropType;
  caption: string;
}

interface CollageItem {
  image: ImageSourcePropType;
  title: string;
  text: string;
  details: string;
}

interface OceanThreat {
  icon: string;
  title: string;
  description: string;
}

// Array of ocean images with captions
const oceanImages: OceanImage[] = [
  { 
    image: require('../../assets/ocean1.jpg'),
    caption: 'Coral reefs support 25% of marine species'
  },
  { 
    image: require('../../assets/ocean2.jpg'),
    caption: 'Oceans absorb 30% of CO2 emissions'
  },
  { 
    image: require('../../assets/ocean3.jpg'),
    caption: 'Only 5% of our oceans have been explored'
  },
  { 
    image: require('../../assets/ocean4.jpg'),
    caption: 'Oceans provide over 50% of our oxygen'
  },
  { 
    image: require('../../assets/ocean5.jpg'),
    caption: 'Blue whales can live up to 90 years'
  },
];

// Array of collage items - expanded with more information
const collageImages: CollageItem[] = [
  {
    image: require('../../assets/collage1.jpg'),
    title: 'Protect Marine Life',
    text: 'Marine animals are vital for ocean balance. Protect them from pollution and habitat destruction.',
    details: 'Marine ecosystems support over 2 million species. Endangered species like sea turtles, whales, and coral reefs face threats from climate change, plastic pollution, and destructive fishing practices. By protecting marine habitats, we ensure biodiversity and ecosystem health.'
  },
  {
    image: require('../../assets/collage2.jpg'),
    title: 'Stop Plastic Pollution',
    text: 'Plastic waste harms marine life. Reduce plastic use and promote recycling.',
    details: 'Over 8 million tons of plastic enter our oceans annually. Marine animals mistake plastic for food, resulting in starvation and death. Microplastics have been found in marine animals and even human food sources. Single-use plastics like bags, bottles, and straws are among the most common ocean pollutants.'
  },
  {
    image: require('../../assets/collage3.jpg'),
    title: 'End Illegal Fishing',
    text: 'Illegal fishing methods like dynamite harm ecosystems. Support sustainable fishing.',
    details: 'Illegal, unreported, and unregulated fishing accounts for up to 26 million tons of fish annually—about 20% of the global catch. Methods like dynamite fishing, cyanide fishing, and bottom trawling destroy coral reefs and seabed habitats. Sustainable practices include hook-and-line fishing, traps, and properly managed aquaculture.'
  },
  {
    image: require('../../assets/collage4.jpg'),
    title: 'Prevent Overfishing',
    text: 'Overfishing depletes marine species. Support responsible seafood choices.',
    details: '33% of global fish stocks are harvested at unsustainable levels. When purchasing seafood, look for certifications like Marine Stewardship Council (MSC) or Aquaculture Stewardship Council (ASC). These ensure the fish was caught or farmed using environmentally responsible methods.'
  },
];

// Ocean threats data
const oceanThreats: OceanThreat[] = [
  {
    icon: 'trash-can',
    title: 'Plastic Pollution',
    description: 'By 2050, there may be more plastic than fish in the ocean by weight. Plastic breaks down into microplastics that enter the food chain.'
  },
  {
    icon: 'chemical-weapon',
    title: 'Chemical Pollution',
    description: 'Fertilizers, pesticides, and industrial chemicals create dead zones where marine life cannot survive. Over 400 dead zones exist worldwide.'
  },
  {
    icon: 'weather-sunny',
    title: 'Climate Change',
    description: 'Rising ocean temperatures cause coral bleaching and disrupt marine ecosystems. Over 50% of the world\'s coral reefs have died in the last 30 years.'
  },
  {
    icon: 'waves',
    title: 'Ocean Acidification',
    description: 'CO2 absorption makes oceans 30% more acidic than pre-industrial times, threatening shellfish and coral reef formation.'
  }
];

const Welcome: React.FC<WelcomeProps> = ({ navigation }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CollageItem | null>(null);
  const [isInfoModalVisible, setInfoModalVisible] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState<OceanThreat | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showResponderModal, setShowResponderModal] = useState(false);
  
  const screenWidth = Dimensions.get('window').width;

  // Auto scroll carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === oceanImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Render enhanced carousel with captions
  const renderCarousel = () => {
    return (
      <View style={styles.carouselWrapper}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
          onMomentumScrollEnd={(event) => {
            const slideWidth = screenWidth - 40;
            const index = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
            setCurrentImageIndex(index);
          }}
        >
          {oceanImages.map((item, index) => (
            <View key={index} style={[styles.carouselItem, {width: screenWidth - 40}]}>
              <Image source={item.image} style={styles.carouselImage} />
              <View style={styles.captionContainer}>
                <Text style={styles.caption}>{item.caption}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={styles.paginationContainer}>
          {oceanImages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                { opacity: currentImageIndex === index ? 1 : 0.5 }
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="earth" size={30} color="white" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>BlueGuard</Text>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {renderCarousel()}

        {/* Main info section */}
        <View style={styles.textSection}>
          <Text style={styles.topicTitle}>
            <FontAwesome5 name="water" size={18} color="white" /> Why Protect Our Oceans?
          </Text>
          <Text style={styles.topicText}>
            Oceans cover 71% of our planet and provide over half of the oxygen we breathe. They are home to diverse marine life and regulate global temperatures. However, pollution, overfishing, and climate change threaten ocean health. Oceans absorb approximately 30% of CO2 produced by humans, reducing climate change impacts but causing ocean acidification.
          </Text>

          {/* Ocean Facts */}
          <View style={styles.factsContainer}>
            <View style={styles.factBox}>
              <Text style={styles.factNumber}>71%</Text>
              <Text style={styles.factText}>of Earth's surface is covered by oceans</Text>
            </View>
            <View style={styles.factBox}>
              <Text style={styles.factNumber}>50%</Text>
              <Text style={styles.factText}>of oxygen comes from ocean plants</Text>
            </View>
            <View style={styles.factBox}>
              <Text style={styles.factNumber}>8M</Text>
              <Text style={styles.factText}>tons of plastic enters oceans yearly</Text>
            </View>
            <View style={styles.factBox}>
              <Text style={styles.factNumber}>1/3</Text>
              <Text style={styles.factText}>of fish stocks are overexploited</Text>
            </View>
          </View>

          <Text style={styles.topicTitle}>
            <Ionicons name="help-circle" size={18} color="white" /> How Can You Help?
          </Text>
          <Text style={styles.topicText}>
            • Reduce plastic waste by using reusable bags and bottles.{"\n"}
            • Support sustainable seafood choices - look for MSC certification.{"\n"}
            • Participate in beach clean-ups and log your trash collection.{"\n"}
            • Reduce your carbon footprint to slow climate change.{"\n"}
            • Report ocean pollution incidents through our app.{"\n"}
            • Conserve water to reduce runoff and pollution.
          </Text>
        </View>

        {/* Major Ocean Threats Section */}
        <View style={styles.threatSection}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="dangerous" size={18} color="white" /> Major Ocean Threats
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.threatScrollView}>
            {oceanThreats.map((threat, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.threatCard}
                onPress={() => {
                  setSelectedThreat(threat);
                  setInfoModalVisible(true);
                }}
              >
                <MaterialCommunityIcons name={threat.icon as any} size={30} color="white" />
                <Text style={styles.threatTitle}>{threat.title}</Text>
                <Text style={styles.threatDescription} numberOfLines={2}>
                  {threat.description}
                </Text>
                <Text style={styles.readMore}>Read more →</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Take Action Collage */}
        <View style={styles.collageCard}>
          <Text style={styles.collageTitle}>Take Action</Text>
          <View style={styles.collageSection}>
            {collageImages.map((item, index) => {
              // Define positions for each collage image
              const positions = [
                { top: 0, left: 0 },
                { top: 0, right: 0 },
                { bottom: 0, left: 0 },
                { bottom: 0, right: 0 },
              ];
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setSelectedItem(item);
                    setModalVisible(true);
                  }}
                  style={[styles.collageImage, positions[index]]}
                >
                  <Image source={item.image} style={styles.collageImageStyle} />
                  <View style={styles.collageOverlay}>
                    <Text style={styles.collageItemTitle} numberOfLines={1}>{item.title}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Upcoming Events */}
        <View style={styles.eventsCard}>
          <Text style={styles.eventsTitle}>
            <Ionicons name="calendar" size={18} color="white" /> Upcoming Events
          </Text>
          <View style={styles.eventItem}>
            <View style={styles.eventDate}>
              <Text style={styles.eventDateNum}>25</Text>
              <Text style={styles.eventDateMonth}>MAR</Text>
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventName}>International Beach Cleanup</Text>
              <Text style={styles.eventLocation}>North Beach, 9:00 AM</Text>
            </View>
            <TouchableOpacity style={styles.eventJoinButton}>
              <Text style={styles.eventJoinText}>Join</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.eventItem}>
            <View style={styles.eventDate}>
              <Text style={styles.eventDateNum}>12</Text>
              <Text style={styles.eventDateMonth}>APR</Text>
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventName}>Ocean Conservation Workshop</Text>
              <Text style={styles.eventLocation}>Marine Center, 2:00 PM</Text>
            </View>
            <TouchableOpacity style={styles.eventJoinButton}>
              <Text style={styles.eventJoinText}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Responders Section */}
        <View style={styles.respondersCard}>
          <View style={styles.respondersIconContainer}>
            <MaterialCommunityIcons name="shield-alert" size={40} color="#4EEAFF" />
          </View>
          <Text style={styles.respondersTitle}>Are You a Responder?</Text>
          <Text style={styles.respondersText}>
            Join our network of emergency responders and help protect our oceans. Be the first to respond to marine incidents and environmental emergencies.
          </Text>
          <TouchableOpacity 
            style={styles.startNowButton}
            onPress={() => setShowResponderModal(true)}
          >
            <MaterialCommunityIcons name="shield-check" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.startNowText}>START NOW</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal for Collage Item */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                <Image source={selectedItem.image} style={styles.modalImage} />
                <Text style={styles.modalTitle}>{selectedItem.title}</Text>
                <Text style={styles.modalSubtitle}>{selectedItem.text}</Text>
                <Text style={styles.modalDetailText}>{selectedItem.details}</Text>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)} 
                  style={styles.modalButtonPrimary}
                >
                  <Text style={styles.modalButtonText}>Learn More</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)} 
                  style={styles.modalButtonSecondary}
                >
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal for Threat Info */}
      <Modal visible={isInfoModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedThreat && (
              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.threatIconContainer}>
                  <MaterialCommunityIcons name={selectedThreat.icon as any} size={50} color="#0A5EB0" />
                </View>
                <Text style={styles.modalTitle}>{selectedThreat.title}</Text>
                <Text style={styles.modalDetailText}>{selectedThreat.description}</Text>
                <TouchableOpacity 
                  onPress={() => setInfoModalVisible(false)} 
                  style={styles.modalButtonSecondary}
                >
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal for Responder Options */}
      <Modal visible={showResponderModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.responderModalIcon}>
              <MaterialCommunityIcons name="shield-account" size={60} color="#0A5EB0" />
            </View>
            <Text style={styles.modalTitle}>Responder Portal</Text>
            <Text style={styles.responderModalText}>
              Choose an option to continue as a responder
            </Text>
            
            <TouchableOpacity 
              style={styles.responderModalButton}
              onPress={() => {
                setShowResponderModal(false);
                navigation.navigate('ResLogin');
              }}
            >
              <Ionicons name="log-in" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.responderModalButtonText}>Login as Responder</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.responderModalButton, styles.responderModalButtonSecondary]}
              onPress={() => {
                setShowResponderModal(false);
                navigation.navigate('ResRegister');
              }}
            >
              <Ionicons name="person-add" size={20} color="#0A5EB0" style={styles.buttonIcon} />
              <Text style={styles.responderModalButtonTextSecondary}>Register as Responder</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowResponderModal(false)} 
              style={styles.modalButtonSecondary}
            >
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Navbar */}
      <View style={styles.footer}>
        {[
          { name: 'Home', icon: 'home' as const, screen: 'Home' as const },
          { name: 'About Us', icon: 'information-circle' as const, screen: 'About' as const },
          { name: 'Contact Us', icon: 'call' as const, screen: 'Contact' as const },
          { name: 'Login', icon: 'log-in' as const, screen: 'Login' as const },
          { name: 'Register', icon: 'person-add' as const, screen: 'Register' as const }
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

export default Welcome;

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
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  carouselWrapper: {
    marginBottom: 20,
  },
  carouselContainer: {
    alignItems: 'center',
  },
  carouselItem: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  carouselImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  caption: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginHorizontal: 4,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 15,
    marginBottom: 10,
  },
  topicText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 15,
  },
  textSection: {
    marginTop: 10,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    padding: 15,
    borderRadius: 10,
  },
  factsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  factBox: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  factNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4EEAFF',
    textAlign: 'center',
  },
  factText: {
    fontSize: 12,
    color: 'white',
    textAlign: 'center',
    marginTop: 5,
  },
  collageCard: {
    backgroundColor: '#004A7C',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
  },
  collageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  collageSection: {
    position: 'relative',
    width: 220,
    height: 220,
    alignSelf: 'center',
  },
  collageImage: {
    position: 'absolute',
  },
  collageImageStyle: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  collageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 5,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  collageItemTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000957',
    padding: 10,
  },
  navButton: {
    alignItems: 'center',
  },
  navText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '85%',
    maxHeight: '80%',
  },
  modalScrollContent: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  modalImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
    color: '#0A5EB0',
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
    color: '#333',
  },
  modalDetailText: {
    fontSize: 15,
    textAlign: 'left',
    marginTop: 15,
    lineHeight: 22,
    color: '#444',
  },
  modalButtonPrimary: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#0A5EB0',
    borderRadius: 5,
    width: '100%',
  },
  modalButtonSecondary: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#DDD',
    borderRadius: 5,
    width: '100%',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  closeText: {
    color: '#555',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  threatSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  threatScrollView: {
    paddingBottom: 10,
  },
  threatCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 15,
    borderRadius: 10,
    width: 200,
    marginRight: 15,
    height: 170,
  },
  threatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
    marginBottom: 5,
  },
  threatDescription: {
    fontSize: 13,
    color: 'white',
    marginBottom: 10,
  },
  readMore: {
    fontSize: 12,
    color: '#4EEAFF',
    fontWeight: '500',
  },
  threatIconContainer: {
    backgroundColor: '#F0F8FF',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  eventsCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  eventDate: {
    backgroundColor: '#0A5EB0',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    width: 50,
  },
  eventDateNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  eventDateMonth: {
    fontSize: 12,
    color: 'white',
  },
  eventInfo: {
    flex: 1,
    marginLeft: 15,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  eventLocation: {
    fontSize: 12,
    color: '#CCC',
    marginTop: 3,
  },
  eventJoinButton: {
    backgroundColor: '#4EEAFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  eventJoinText: {
    color: '#000957',
    fontWeight: 'bold',
  },
  // New Responders Section Styles
  respondersCard: {
    backgroundColor: 'rgba(0, 9, 87, 0.8)',
    padding: 25,
    borderRadius: 15,
    marginTop: 25,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4EEAFF',
    shadowColor: '#4EEAFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  respondersIconContainer: {
    backgroundColor: 'rgba(78, 234, 255, 0.2)',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  respondersTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  respondersText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  startNowButton: {
    flexDirection: 'row',
    backgroundColor: '#4EEAFF',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  startNowText: {
    color: '#000957',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonIcon: {
    marginRight: 8,
  },
  // Responder Modal Styles
  responderModalIcon: {
    backgroundColor: '#F0F8FF',
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  responderModalText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  responderModalButton: {
    flexDirection: 'row',
    backgroundColor: '#0A5EB0',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
  },
  responderModalButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0A5EB0',
  },
  responderModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  responderModalButtonTextSecondary: {
    color: '#0A5EB0',
    fontSize: 16,
    fontWeight: '600',
  },
});