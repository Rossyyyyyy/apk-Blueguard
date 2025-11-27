import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
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

type ContactScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Contact'>;

type Props = {
  navigation: ContactScreenNavigationProp;
};

type ContactInfoItem = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  action: (() => void) | null;
};

type SocialMediaItem = {
  name: string;
  color: string;
  url: string;
};

type NavItem = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: keyof RootStackParamList;
};

export default function Contact({ navigation }: Props) {
  const [message, setMessage] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');

  // Function to handle opening links
  const openLink = (url: string) => {
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Cannot open URL', 'Please try again later.');
      }
    });
  };

  // Alternative to clipboard - just show info in an alert
  const showInfo = (text: string) => {
    Alert.alert('Contact Information', text);
  };

  // Function to handle form submission
  const handleSubmit = () => {
    if (!name || !email || !message) {
      Alert.alert('Missing Information', 'Please fill out all fields.');
      return;
    }
    
    Alert.alert(
      'Message Sent',
      'Thank you for contacting us. We will get back to you soon!',
      [{ text: 'OK', onPress: () => {
        setName('');
        setEmail('');
        setMessage('');
      }}]
    );
  };

  // Contact information data
  const contactInfo: ContactInfoItem[] = [
    { icon: 'call', text: '+1 234 567 890', action: () => Linking.openURL('tel:+1234567890') },
    { icon: 'mail', text: 'contact@protectoceans.com', action: () => Linking.openURL('mailto:contact@protectoceans.com') },
    { icon: 'location', text: '123 Ocean St, Marine City, CA 90210', action: () => openLink('https://maps.google.com/?q=123+Ocean+St,+Marine+City') },
    { icon: 'time', text: 'Support Hours: 9 AM - 6 PM (EST)', action: null },
    { icon: 'globe', text: 'www.protectoceans.com', action: () => openLink('https://www.protectoceans.com') },
  ];

  // Social media data
  const socialMedia: SocialMediaItem[] = [
    { name: 'facebook', color: '#3b5998', url: 'https://facebook.com/protectoceans' },
    { name: 'instagram', color: '#E4405F', url: 'https://instagram.com/protectoceans' },
    { name: 'twitter', color: '#1DA1F2', url: 'https://twitter.com/protectoceans' },
    { name: 'youtube', color: '#FF0000', url: 'https://youtube.com/protectoceans' },
    { name: 'linkedin', color: '#0077B5', url: 'https://linkedin.com/company/protectoceans' },
  ];

  // Navigation items
  const navItems: NavItem[] = [
    { name: 'Home', icon: 'home', screen: 'Welcome' },
    { name: 'About', icon: 'information-circle', screen: 'About' },
    { name: 'Contact', icon: 'call', screen: 'Contact' },
    { name: 'Login', icon: 'log-in', screen: 'Login' },
    { name: 'Register', icon: 'person-add', screen: 'Register' }
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="call" size={30} color="white" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Contact Us</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get In Touch</Text>
          <Text style={styles.sectionDescription}>
            Have questions about our ocean conservation efforts? Reach out to us through any of these channels:
          </Text>
          
          {contactInfo.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.contactBox}
              onPress={item.action || undefined}
              onLongPress={() => showInfo(item.text)}
            >
              <Ionicons name={item.icon} size={30} color="#D1E8FF" />
              <Text style={styles.contactText}>{item.text}</Text>
              {item.action && <MaterialIcons name="chevron-right" size={24} color="#D1E8FF" style={styles.arrowIcon} />}
            </TouchableOpacity>
          ))}
          
          <Text style={styles.clipboardHint}>Tip: Long press any contact info to view in a dialog</Text>
        </View>

        {/* Message Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send Us a Message</Text>
          <Text style={styles.sectionDescription}>
            Fill out the form below and we'll get back to you as soon as possible.
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#8BB0DD"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Your Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              placeholderTextColor="#8BB0DD"
              keyboardType="email-address"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Your Message</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Type your message here..."
              placeholderTextColor="#8BB0DD"
              multiline={true}
              numberOfLines={4}
            />
          </View>
          
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>
        
        {/* Social Media Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow Our Conservation Efforts</Text>
          <Text style={styles.sectionDescription}>
            Join our community and stay updated on our latest ocean conservation initiatives.
          </Text>
          
          <View style={styles.socialContainer}>
            {socialMedia.map((platform, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.socialButton}
                onPress={() => openLink(platform.url)}
              >
                <FontAwesome5 name={platform.name as any} size={30} color={platform.color} />
                <Text style={styles.socialText}>{platform.name.charAt(0).toUpperCase() + platform.name.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Map Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Location</Text>
          <TouchableOpacity 
            style={styles.mapContainer}
            onPress={() => openLink('https://maps.google.com/?q=123+Ocean+St,+Marine+City')}
          >
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map" size={60} color="#D1E8FF" />
              <Text style={styles.mapText}>Tap to view our location on Google Maps</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Business Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Office Hours</Text>
          <View style={styles.hoursContainer}>
            <View style={styles.hourRow}>
              <Text style={styles.dayText}>Monday - Friday:</Text>
              <Text style={styles.timeText}>9:00 AM - 6:00 PM</Text>
            </View>
            <View style={styles.hourRow}>
              <Text style={styles.dayText}>Saturday:</Text>
              <Text style={styles.timeText}>10:00 AM - 4:00 PM</Text>
            </View>
            <View style={styles.hourRow}>
              <Text style={styles.dayText}>Sunday:</Text>
              <Text style={styles.timeText}>Closed</Text>
            </View>
          </View>
        </View>
        
        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <TouchableOpacity style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How can I volunteer for beach cleanups?</Text>
            <MaterialIcons name="expand-more" size={24} color="#D1E8FF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How are donations used?</Text>
            <MaterialIcons name="expand-more" size={24} color="#D1E8FF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Do you have educational programs for schools?</Text>
            <MaterialIcons name="expand-more" size={24} color="#D1E8FF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How can I report ocean pollution?</Text>
            <MaterialIcons name="expand-more" size={24} color="#D1E8FF" />
          </TouchableOpacity>
        </View>
        
        {/* Information Callout */}
        <View style={styles.section}>
          <View style={styles.calloutContainer}>
            <Ionicons name="information-circle" size={40} color="#D1E8FF" />
            <Text style={styles.calloutTitle}>Emergency Marine Wildlife Rescue</Text>
            <Text style={styles.calloutText}>
              If you encounter injured marine wildlife or observe illegal fishing activities,
              please call our 24/7 emergency hotline immediately:
            </Text>
            <TouchableOpacity 
              style={styles.emergencyButton}
              onPress={() => Linking.openURL('tel:+18889876543')}
            >
              <Ionicons name="call" size={20} color="white" />
              <Text style={styles.emergencyButtonText}>+1 888 987 6543</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Newsletter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscribe to Our Newsletter</Text>
          <Text style={styles.sectionDescription}>
            Get monthly updates on our conservation efforts, upcoming events, and educational resources.
          </Text>
          
          <View style={styles.newsletterContainer}>
            <TextInput
              style={styles.newsletterInput}
              placeholder="Enter your email address"
              placeholderTextColor="#8BB0DD"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.newsletterButton}>
              <Text style={styles.newsletterButtonText}>Subscribe</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Footer Space */}
        <View style={styles.footerSpace} />
      </ScrollView>

      {/* Bottom Navbar */}
      <View style={styles.footer}>
        {navItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={[styles.navButton, item.screen === 'Contact' && styles.activeNavButton]} 
            onPress={() => navigation.navigate(item.screen)}
          >
            <Ionicons 
              name={item.icon} 
              size={24} 
              color={item.screen === 'Contact' ? "#4BB4FF" : "white"} 
            />
            <Text style={[styles.navText, item.screen === 'Contact' && styles.activeNavText]}>
              {item.name}
            </Text>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#D1E8FF',
    marginBottom: 20,
    lineHeight: 22,
  },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#004A7C',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    marginBottom: 10,
  },
  contactText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#D1E8FF',
    flex: 1,
  },
  arrowIcon: {
    marginLeft: 'auto' as any,
  },
  clipboardHint: {
    fontSize: 12,
    color: '#D1E8FF',
    fontStyle: 'italic',
    marginTop: 5,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
    width: '100%',
  },
  inputLabel: {
    fontSize: 16,
    color: '#D1E8FF',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#004A7C',
    padding: 15,
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 16,
  },
  textarea: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#00B4D8',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  socialContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  socialButton: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#004A7C',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  socialText: {
    color: '#D1E8FF',
    marginTop: 5,
    fontSize: 12,
  },
  mapContainer: {
    marginTop: 10,
    width: '100%',
    height: 200,
    backgroundColor: '#004A7C',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    color: '#D1E8FF',
    marginTop: 10,
    fontSize: 16,
  },
  hoursContainer: {
    backgroundColor: '#004A7C',
    padding: 15,
    borderRadius: 12,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0A5EB0',
  },
  dayText: {
    fontSize: 16,
    color: '#D1E8FF',
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 16,
    color: '#D1E8FF',
  },
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#004A7C',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  faqQuestion: {
    fontSize: 16,
    color: '#D1E8FF',
    flex: 1,
  },
  calloutContainer: {
    backgroundColor: '#005F99',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#00B4D8',
  },
  calloutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 10,
  },
  calloutText: {
    fontSize: 14,
    color: '#D1E8FF',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  emergencyButton: {
    backgroundColor: '#EC4646',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 25,
    width: '80%',
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  newsletterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsletterInput: {
    backgroundColor: '#004A7C',
    padding: 15,
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  newsletterButton: {
    backgroundColor: '#00B4D8',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsletterButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerSpace: {
    height: 70,
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
  activeNavButton: {
    borderTopWidth: 3,
    borderTopColor: '#4BB4FF',
    paddingTop: 3,
  },
  navText: {
    color: 'white',
    fontSize: 12,
  },
  activeNavText: {
    color: '#4BB4FF',
    fontWeight: 'bold',
  },
});