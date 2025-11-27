// components/TopicCard.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Topic {
  id: string;
  title: string;
  description: string;
  image: any; // Could use ImageSourcePropType from react-native
  tags: string[];
}

interface TopicCardProps {
  topic: Topic;
  onPress: () => void;
  isBookmarked: boolean;
  toggleBookmark: () => void;
  compact?: boolean;
}

const TopicCard: React.FC<TopicCardProps> = ({ 
  topic, 
  onPress, 
  isBookmarked, 
  toggleBookmark, 
  compact = false 
}) => {
  const handleBookmarkPress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    toggleBookmark();
  };

  return (
    <TouchableOpacity 
      style={[styles.card, compact && styles.compactCard]} 
      onPress={onPress}
      accessibilityLabel={`Topic: ${topic.title}`}
      accessibilityHint={`Learn about ${topic.title}`}
    >
      <Image 
        source={topic.image} 
        style={[styles.image, compact && styles.compactImage]} 
        accessibilityLabel={`Image for ${topic.title}`}
      />
      
      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>{topic.title}</Text>
          {!compact && (
            <Text style={styles.description} numberOfLines={2}>
              {topic.description}
            </Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.bookmarkButton}
          onPress={handleBookmarkPress}
          accessibilityLabel={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          accessibilityHint={isBookmarked ? "Removes this topic from bookmarks" : "Adds this topic to bookmarks"}
        >
          <Ionicons 
            name={isBookmarked ? "bookmark" : "bookmark-outline"} 
            size={24} 
            color={isBookmarked ? "#009990" : "white"} 
          />
        </TouchableOpacity>
      </View>
      
      {!compact && (
        <View style={styles.tagRow}>
          {topic.tags.slice(0, 2).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
          {topic.tags.length > 2 && (
            <Text style={styles.moreTagsText}>+{topic.tags.length - 2}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
  },
  compactCard: {
    flexDirection: 'row',
    height: 80,
  },
  image: {
    width: '100%',
    height: 150,
  },
  compactImage: {
    width: 80,
    height: 80,
  },
  contentContainer: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  bookmarkButton: {
    padding: 5,
  },
  tagRow: {
    flexDirection: 'row',
    padding: 15,
    paddingTop: 0,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  tagText: {
    color: 'white',
    fontSize: 12,
  },
  moreTagsText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    alignSelf: 'center',
  }
});

export default TopicCard;