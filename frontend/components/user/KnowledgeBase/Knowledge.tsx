import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Share, 
  AccessibilityInfo,
  useWindowDimensions,
  FlatList,
  ImageSourcePropType
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { topics } from './topicData';
import { educationalContent } from './educationalContent';
import TopicCard from './TopicCard';
import SearchBar from './SearchBar';

import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

// Type definitions
type Topic = {
  id: string;
  title: string;
  description: string;
  image: ImageSourcePropType;
  tags: string[];
};

type EducationalContentKey = 
  | 'Laws of the Ocean' 
  | 'Types of Incidents' 
  | 'Overfishing' 
  | 'Dynamite Fishing' 
  | 'Unique Marine Life' 
  | 'Coral Reefs';

type EducationalContent = {
  [key in EducationalContentKey]: string;
};

type NavigationProp = {
  navigate: (screen: string) => void;
};

interface KnowledgeProps {
  navigation: NavigationProp;
}

const Knowledge: React.FC<KnowledgeProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string>("");
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [readMore, setReadMore] = useState<boolean>(false);
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState<number>(1);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { width } = useWindowDimensions();
  
  useEffect(() => {
    const checkScreenReader = async () => {
      const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setScreenReaderEnabled(isEnabled);
    };
    
    checkScreenReader();
    
    const listener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (isEnabled: boolean) => setScreenReaderEnabled(isEnabled)
    );
    
    return () => {
      listener.remove();
    };
  }, []);

  const fetchUnreadNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      console.log('📬 Fetching unread notifications count...');
      
      const response = await fetch('https://apk-blueguard-rosssyyy.onrender.com/notifications', {
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
  
  useFocusEffect(
    useCallback(() => {
      const loadBookmarks = async () => {
        try {
          const storedBookmarks = await AsyncStorage.getItem('oceanKnowledgeBookmarks');
          if (storedBookmarks) {
            setBookmarks(JSON.parse(storedBookmarks));
          }
        } catch (error) {
          console.error('Error loading bookmarks:', error);
        }
      };
      
      loadBookmarks();
      fetchUnreadNotifications();
    }, [])
  );
  
  useEffect(() => {
    const saveBookmarks = async () => {
      try {
        await AsyncStorage.setItem('oceanKnowledgeBookmarks', JSON.stringify(bookmarks));
      } catch (error) {
        console.error('Error saving bookmarks:', error);
      }
    };
    
    if (bookmarks.length > 0) {
      saveBookmarks();
    }
  }, [bookmarks]);
  
  const handleSearch = (): void => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = topics.filter((topic: Topic) => 
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    setSearchResults(results);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const filterTopics = (topicsToFilter: Topic[]): Topic[] => {
    if (activeFilters.length === 0) return topicsToFilter;
    
    return topicsToFilter.filter((topic: Topic) => 
      topic.tags.some((tag: string) => activeFilters.includes(tag))
    );
  };
  
  const handleFilterToggle = (filter: string): void => {
    setActiveFilters(prev => {
      if (prev.includes(filter)) {
        return prev.filter(f => f !== filter);
      } else {
        return [...prev, filter];
      }
    });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const getTopicContent = (topic: Topic): void => {
    setLoading(true);
    trackRecentView(topic.id);
    
    setTimeout(() => {
      const content = (educationalContent as Record<string, string>)[topic.title] || 
        `${topic.title} is an important aspect of ocean conservation and marine knowledge. Learn more about this topic through our educational resources and community initiatives.`;
      
      setAiResponse(content);
      setLoading(false);
    }, 1000);
  };
  
  const trackRecentView = async (topicId: string): Promise<void> => {
    try {
      const recentViews = await AsyncStorage.getItem('recentViews') || '[]';
      const parsedViews: string[] = JSON.parse(recentViews);
      
      const filteredViews = parsedViews.filter(id => id !== topicId);
      filteredViews.unshift(topicId);
      
      const updatedViews = filteredViews.slice(0, 10);
      
      await AsyncStorage.setItem('recentViews', JSON.stringify(updatedViews));
    } catch (error) {
      console.error('Error tracking recent view:', error);
    }
  };
  
  const handleTopicPress = (topic: Topic): void => {
    setSelectedTopic(topic);
    getTopicContent(topic);
    setReadMore(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  
  const handleBackPress = (): void => {
    setSelectedTopic(null);
    setAiResponse("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const toggleBookmark = (topic: Topic): void => {
    setBookmarks(prev => {
      if (prev.includes(topic.id)) {
        return prev.filter(id => id !== topic.id);
      } else {
        return [...prev, topic.id];
      }
    });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  
  const isBookmarked = (topicId: string): boolean => {
    return bookmarks.includes(topicId);
  };
  
  const handleShare = async (): Promise<void> => {
    if (!selectedTopic) return;
    
    try {
      await Share.share({
        message: `Check out this information about ${selectedTopic.title}:\n\n${aiResponse}\n\nShared from Ocean Guardian App`,
        title: `Ocean Knowledge: ${selectedTopic.title}`
      });
    } catch (error) {
      console.error('Error sharing content:', error);
    }
  };
  
  const renderTopicDetail = (): React.ReactElement => {
    if (!selectedTopic) return <View />;
    
    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBackPress}
            accessibilityLabel="Back to topics"
            accessibilityHint="Returns to the topic list"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          
          <View style={styles.detailActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => toggleBookmark(selectedTopic)}
              accessibilityLabel={isBookmarked(selectedTopic.id) ? "Remove bookmark" : "Add bookmark"}
              accessibilityHint={isBookmarked(selectedTopic.id) ? "Removes this topic from bookmarks" : "Adds this topic to bookmarks"}
            >
              <Ionicons 
                name={isBookmarked(selectedTopic.id) ? "bookmark" : "bookmark-outline"} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleShare}
              accessibilityLabel="Share topic"
              accessibilityHint="Opens sharing options for this topic"
            >
              <Ionicons name="share-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView style={styles.detailScroll}>
          <Image 
            source={selectedTopic.image} 
            style={styles.detailImage} 
            accessibilityLabel={`Image of ${selectedTopic.title}`}
          />
          
          <Text style={[styles.detailTitle, { fontSize: 24 * fontSizeMultiplier }]}>
            {selectedTopic.title}
          </Text>
          
          <Text style={[styles.detailDescription, { fontSize: 16 * fontSizeMultiplier }]}>
            {selectedTopic.description}
          </Text>
          
          <View style={styles.tagContainer}>
            {selectedTopic.tags.map((tag: string, index: number) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.aiContentContainer}>
            <View style={styles.aiContentHeader}>
              <Text style={[styles.aiContentTitle, { fontSize: 18 * fontSizeMultiplier }]}>
                Expert Knowledge
              </Text>
              
              <TouchableOpacity 
                onPress={() => setFontSizeMultiplier(prev => prev === 1 ? 1.3 : 1)}
                accessibilityLabel="Adjust text size"
                accessibilityHint="Toggles between normal and larger text"
              >
                <MaterialCommunityIcons 
                  name="format-font-size-increase" 
                  size={24} 
                  color="#000957" 
                />
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#009990" />
                <Text style={styles.loadingText}>Loading additional information...</Text>
              </View>
            ) : (
              <View>
                <Text 
                  style={[styles.aiContent, { fontSize: 15 * fontSizeMultiplier }]}
                  accessibilityLabel={`Information about ${selectedTopic.title}`}
                >
                  {readMore ? aiResponse : aiResponse.substring(0, 300) + (aiResponse.length > 300 ? '...' : '')}
                </Text>
                
                {aiResponse.length > 300 && (
                  <TouchableOpacity 
                    onPress={() => setReadMore(!readMore)}
                    style={styles.readMoreButton}
                    accessibilityLabel={readMore ? "Show less" : "Read more"}
                    accessibilityHint={readMore ? "Collapses the text" : "Expands the text to show more"}
                  >
                    <Text style={styles.readMoreText}>
                      {readMore ? 'Show less' : 'Read more'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionCardButton}
              accessibilityLabel="Start quiz"
              accessibilityHint="Take a quiz about this topic"
            >
              <Ionicons name="help-circle-outline" size={24} color="#009990" />
              <Text style={styles.actionCardText}>Take Quiz</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCardButton}
              accessibilityLabel="Explore related topics"
              accessibilityHint="Shows topics related to this one"
            >
              <Ionicons name="git-network-outline" size={24} color="#009990" />
              <Text style={styles.actionCardText}>Related Topics</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };
  
  const renderTopicsGrid = (): React.ReactElement => {
    const topicsToShow = searchResults.length > 0 ? searchResults : topics;
    const filteredTopics = filterTopics(topicsToShow);
    
    const renderItem = ({ item }: { item: Topic }) => (
      <TopicCard 
        topic={item} 
        onPress={() => handleTopicPress(item)}
        isBookmarked={isBookmarked(item.id)}
        toggleBookmark={() => toggleBookmark(item)}
      />
    );
    
    return (
      <>
        <SearchBar 
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmit={handleSearch}
          placeholder="Search topics..."
        />
        
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setIsFilterOpen(!isFilterOpen)}
            accessibilityLabel="Toggle filters"
            accessibilityHint="Opens or closes the filter menu"
          >
            <Ionicons name="filter" size={20} color="#0A5EB0" />
            <Text style={styles.filterButtonText}>
              Filter {activeFilters.length > 0 ? `(${activeFilters.length})` : ''}
            </Text>
          </TouchableOpacity>
          
          {isFilterOpen && (
            <View style={styles.filterTags}>
              {['conservation', 'ecosystem', 'biodiversity', 'sustainability', 'pollution'].map((tag: string) => (
                <TouchableOpacity 
                  key={tag}
                  style={[
                    styles.filterTag,
                    activeFilters.includes(tag) && styles.activeFilterTag
                  ]}
                  onPress={() => handleFilterToggle(tag)}
                  accessibilityLabel={`Filter by ${tag}`}
                  accessibilityHint={`${activeFilters.includes(tag) ? 'Removes' : 'Adds'} ${tag} filter`}
                >
                  <Text style={[
                    styles.filterTagText,
                    activeFilters.includes(tag) && styles.activeFilterTagText
                  ]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        {filteredTopics.length > 0 ? (
          <FlatList
            data={filteredTopics}
            renderItem={renderItem}
            keyExtractor={(item: Topic) => item.id}
            contentContainerStyle={styles.topicsGrid}
            numColumns={width > 600 ? 2 : 1}
            key={width > 600 ? 'two-column' : 'one-column'}
          />
        ) : (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={60} color="white" />
            <Text style={styles.noResultsText}>
              No results found for "{searchQuery}"
            </Text>
            <TouchableOpacity 
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
              accessibilityLabel="Clear search"
              accessibilityHint="Clears the search and shows all topics"
            >
              <Text style={styles.clearSearchText}>Clear Search</Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="book" size={30} color="white" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Ocean Knowledge</Text>
      </View>
      
      {selectedTopic ? renderTopicDetail() : renderTopicsGrid()}
      
      {/* Footer with Notification Badge */}
      <View style={styles.footer}>
        {[
          { name: 'Dashboard', icon: 'home' as const, screen: 'Dash' },
          { name: 'Notifications', icon: 'notifications' as const, screen: 'Notifications' },
          { name: 'My Reports', icon: 'document-text' as const, screen: 'Reports' },
          { name: 'Rewards', icon: 'trophy' as const, screen: 'Rewards' },
          { name: 'Knowledge', icon: 'book' as const, screen: 'Knowledge' },
          { name: 'Profile', icon: 'person' as const, screen: 'Profile' }
        ].map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={[
              styles.navButton, 
              item.name === 'Knowledge' && styles.activeNavButton
            ]} 
            onPress={() => navigation.navigate(item.screen)}
            accessibilityLabel={item.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: item.name === 'Knowledge' }}
          >
            <Ionicons 
              name={item.icon} 
              size={24} 
              color={item.name === 'Knowledge' ? "#FFD700" : "white"} 
            />
            <Text style={[
              styles.navText, 
              item.name === 'Knowledge' && styles.activeNavText
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
  container: { 
    flex: 1, 
    backgroundColor: '#0A5EB0' 
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
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  topicsGrid: {
    padding: 15,
    paddingBottom: 100,
  },
  detailContainer: {
    flex: 1,
    paddingBottom: 80,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  detailActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 16,
  },
  detailScroll: {
    paddingHorizontal: 15,
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  detailDescription: {
    fontSize: 16,
    color: 'white',
    marginBottom: 15,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: 'white',
    fontSize: 14,
  },
  aiContentContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  aiContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiContentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000957',
  },
  aiContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  readMoreButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    color: '#009990',
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  actionCardButton: {
    backgroundColor: 'white',
    flex: 0.48,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  actionCardText: {
    color: '#000957',
    marginTop: 8,
    fontWeight: 'bold',
  },
  filterContainer: {
    padding: 15,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  filterButtonText: {
    color: '#0A5EB0',
    marginLeft: 5,
    fontWeight: '500',
  },
  filterTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  filterTag: {
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  activeFilterTag: {
    backgroundColor: '#009990',
  },
  filterTagText: {
    color: '#0A5EB0',
  },
  activeFilterTagText: {
    color: 'white',
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#000957',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  navButton: {
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 5,
    position: 'relative',
  },
  activeNavButton: {
    borderBottomWidth: 3,
    borderBottomColor: '#FFD700',
  },
  navText: {
    color: 'white',
    fontSize: 10,
    marginTop: 3,
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
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  noResultsText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  clearSearchButton: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  clearSearchText: {
    color: '#0A5EB0',
    fontWeight: 'bold',
  },
});

export default Knowledge;