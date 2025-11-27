import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  Linking,
  ActivityIndicator,
  ListRenderItem
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// API Base URL
const API_BASE_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

// NewsAPI Key
const NEWS_API_KEY = '6f020c7649674b828d326bde01d0e3ff';

// Type definitions
type RootStackParamList = {
  OceanNews: undefined;
  Dash: undefined;
  Notifications: undefined;
  Reports: undefined;
  Rewards: undefined;
  Knowledge: undefined;
  Profile: undefined;
};

type OceanNewsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OceanNews'>;

interface OceanNewsProps {
  navigation: OceanNewsNavigationProp;
}

interface NewsArticle {
  title: string;
  description: string;
  imageUrl: string;
  source: string;
  url: string;
  publishedAt: string;
}

interface NewsApiArticle {
  title: string;
  description: string;
  urlToImage: string;
  source: {
    name: string;
  };
  url: string;
  publishedAt: string;
}

interface NewsApiResponse {
  articles: NewsApiArticle[];
}

interface NavItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: keyof RootStackParamList;
}

const OceanNews: React.FC<OceanNewsProps> = ({ navigation }) => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch marine biology and ocean conservation news
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=marine+biology+ocean+conservation&sortBy=publishedAt&language=en&apiKey=${NEWS_API_KEY}`
      );
      
      const data: NewsApiResponse = await response.json();
      
      if (data.articles) {
        // Filter and format articles
        const formattedNews: NewsArticle[] = data.articles
          .filter((article: NewsApiArticle) => article.urlToImage) // Ensure image exists
          .slice(0, 10) // Limit to 10 articles
          .map((article: NewsApiArticle) => ({
            title: article.title,
            description: article.description,
            imageUrl: article.urlToImage,
            source: article.source.name,
            url: article.url,
            publishedAt: new Date(article.publishedAt).toLocaleDateString()
          }));
        
        setNews(formattedNews);
      }
    } catch (err) {
      // Fallback news data if API fails
      console.error('News fetch error:', err);
      setError('Could not fetch news. Please check your internet connection.');
      setNews([
        {
          title: 'Marine Conservation Update',
          description: 'Latest developments in ocean protection efforts',
          imageUrl: 'https://example.com/marine-image.jpg',
          source: 'Ocean Insights',
          url: 'https://example.com/news',
          publishedAt: new Date().toLocaleDateString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openNewsLink = (url: string): void => {
    Linking.openURL(url);
  };

  const renderNewsItem: ListRenderItem<NewsArticle> = ({ item }) => (
    <TouchableOpacity 
      style={styles.newsCard} 
      onPress={() => openNewsLink(item.url)}
    >
      <Image 
        source={{ uri: item.imageUrl }} 
        style={styles.newsImage} 
        defaultSource={require('../../assets/OceanNews.jpg')}
      />
      <View style={styles.newsContent}>
        <Text style={styles.newsTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.newsDescription} numberOfLines={3}>
          {item.description}
        </Text>
        <View style={styles.newsFooter}>
          <View style={styles.newsMetadata}>
            <Text style={styles.newsSource}>{item.source}</Text>
            <Text style={styles.newsDate}>{item.publishedAt}</Text>
          </View>
          <Ionicons name="open-outline" size={16} color="#009990" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const navigationItems: NavItem[] = [
    { name: 'Dashboard', icon: 'home', screen: 'Dash' },
    { name: 'Notifications', icon: 'notifications', screen: 'Notifications' },
    { name: 'My Reports', icon: 'document-text', screen: 'Reports' },
    { name: 'Rewards', icon: 'trophy', screen: 'Rewards' },
    { name: 'Knowledge', icon: 'book', screen: 'Knowledge' },
    { name: 'Profile', icon: 'person', screen: 'Profile' }
  ];

  if (loading && news.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#009990" />
        <Text style={styles.loadingText}>Loading ocean news...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ocean News</Text>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <FlatList
        data={news}
        renderItem={renderNewsItem}
        keyExtractor={(item: NewsArticle, index: number) => `${item.url}-${index}`}
        contentContainerStyle={styles.newsList}
        refreshing={loading}
        onRefresh={fetchNews}
        showsVerticalScrollIndicator={false}
      />

      {/* Sticky Footer */}
      <View style={styles.footer}>
        {navigationItems.map((item: NavItem, index: number) => (
          <TouchableOpacity 
            key={index} 
            style={styles.navButton} 
            onPress={() => navigation.navigate(item.screen)}
          >
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
    backgroundColor: '#0A5EB0',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000957',
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 15,
  },
  newsList: {
    padding: 15,
    paddingBottom: 100,
  },
  newsCard: {
    backgroundColor: '#000957',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newsImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#1a1a2e',
  },
  newsContent: {
    padding: 15,
  },
  newsTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  newsDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsMetadata: {
    flex: 1,
  },
  newsSource: {
    color: '#009990',
    fontSize: 12,
    marginBottom: 3,
    fontWeight: '600',
  },
  newsDate: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
  },
  errorContainer: {
    padding: 15,
    backgroundColor: 'rgba(255,0,0,0.1)',
    margin: 15,
    borderRadius: 8,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#000957',
    width: '100%',
    padding: 10,
    position: 'absolute',
    bottom: 0,
    paddingBottom: 20,
  },
  navButton: {
    alignItems: 'center',
  },
  navText: {
    color: 'white',
    fontSize: 10,
    marginTop: 4,
  },
});

export default OceanNews;