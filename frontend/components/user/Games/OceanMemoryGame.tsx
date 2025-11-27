import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

interface User {
  name: string;
  email: string;
}

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface OceanMemoryGameProps {
  navigation: any;
}

const OceanMemoryGame: React.FC<OceanMemoryGameProps> = ({ navigation }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [moves, setMoves] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  
  // Sound states
  const [backgroundSound, setBackgroundSound] = useState<Audio.Sound | null>(null);
  const [matchSound, setMatchSound] = useState<Audio.Sound | null>(null);
  const [flipSound, setFlipSound] = useState<Audio.Sound | null>(null);
  const [successSound, setSuccessSound] = useState<Audio.Sound | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Ocean emojis
  const oceanEmojis = ['🐠', '🐋', '🐬', '🐢', '🐙', '🦀', '🦈', '🐚', '🪸', '⭐'];

  // Grid dimensions based on difficulty
  const gridConfig = {
    easy: { pairs: 6, columns: 3, cardSize: (width - 80) / 3 },
    medium: { pairs: 8, columns: 4, cardSize: (width - 100) / 4 },
    hard: { pairs: 10, columns: 4, cardSize: (width - 100) / 4 }
  };

  useEffect(() => {
    fetchUserData();
    
    const unsubscribeFocus = navigation.addListener('focus', () => {
      loadSounds();
    });
    
    const unsubscribeBlur = navigation.addListener('blur', () => {
      stopAndUnloadSounds();
    });
    
    return () => {
      stopAndUnloadSounds();
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameStarted && !gameCompleted) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStarted, gameCompleted]);

  useEffect(() => {
    if (matchedPairs > 0 && matchedPairs === gridConfig[difficulty].pairs) {
      handleGameComplete();
    }
  }, [matchedPairs]);

  const stopAndUnloadSounds = async () => {
    try {
      const soundObjects = [backgroundSound, matchSound, flipSound, successSound];
      
      for (const sound of soundObjects) {
        if (sound) {
          try {
            const status = await sound.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
              await sound.stopAsync();
            }
            if (status.isLoaded) {
              await sound.unloadAsync();
            }
          } catch (soundError) {
            console.log('Error handling sound:', soundError);
          }
        }
      }
      
      setBackgroundSound(null);
      setMatchSound(null);
      setFlipSound(null);
      setSuccessSound(null);
    } catch (error) {
      console.error('Error in stopAndUnloadSounds:', error);
    }
  };

  const loadSounds = async () => {
    try {
      await stopAndUnloadSounds();
      
      // Try to load background music - optional
      try {
        const { sound: bgSound } = await Audio.Sound.createAsync(
          require('../../assets/ocean_quiz_music.mp3'),
          { isLooping: true, shouldPlay: !isMuted, volume: isMuted ? 0 : 0.3 }
        );
        setBackgroundSound(bgSound);
      } catch (e) {
        console.log('Background music not found - continuing without it');
      }
      
      // Try to load match sound - optional
      try {
        const { sound: correctAnswerSound } = await Audio.Sound.createAsync(
          require('../../assets/correct_answer_sound.mp3'),
          { volume: isMuted ? 0 : 0.7 }
        );
        setMatchSound(correctAnswerSound);
      } catch (e) {
        console.log('Match sound not found - continuing without it');
      }
      
      // Try to load flip sound - optional
      try {
        const { sound: incorrectAnswerSound } = await Audio.Sound.createAsync(
          require('../../assets/incorrect_answer_sound.mp3'),
          { volume: isMuted ? 0 : 0.5 }
        );
        setFlipSound(incorrectAnswerSound);
      } catch (e) {
        console.log('Flip sound not found - continuing without it');
      }
      
      // Try to load success sound - optional
      try {
        const { sound: gameSuccessSound } = await Audio.Sound.createAsync(
          require('../../assets/quiz_complete_sound.mp3'),
          { volume: isMuted ? 0 : 1.0 }
        );
        setSuccessSound(gameSuccessSound);
      } catch (e) {
        console.log('Success sound not found - continuing without it');
      }
      
    } catch (error) {
      console.error('Error loading sounds:', error);
    }
  };

  const toggleSound = async () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    try {
      if (backgroundSound) {
        await backgroundSound.setVolumeAsync(newMuteState ? 0 : 0.3);
      }
      if (matchSound) await matchSound.setVolumeAsync(newMuteState ? 0 : 0.7);
      if (flipSound) await flipSound.setVolumeAsync(newMuteState ? 0 : 0.5);
      if (successSound) await successSound.setVolumeAsync(newMuteState ? 0 : 1.0);
    } catch (error) {
      console.error('Error toggling sound:', error);
    }
  };

  const playSound = async (soundObject: Audio.Sound | null) => {
    if (soundObject && !isMuted) {
      try {
        const status = await soundObject.getStatusAsync();
        if (status.isLoaded) {
          await soundObject.replayAsync();
        }
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    }
  };

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found, redirecting to login');
        navigation.replace('Login');
        return;
      }

      console.log('Fetching user data...');
      const response = await fetch('https://apk-blueguard-rosssyyy.onrender.com/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
        console.log('User data loaded:', data.user.name);
      } else {
        console.error('Invalid user data received');
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      // Don't redirect on network error - show user anyway with cached data
      setUser({ name: 'Player', email: 'player@ocean.com' }); // Fallback user
    } finally {
      setLoading(false);
    }
  };

  const initializeGame = (selectedDifficulty: 'easy' | 'medium' | 'hard') => {
    setDifficulty(selectedDifficulty);
    const { pairs } = gridConfig[selectedDifficulty];
    
    const selectedEmojis = oceanEmojis.slice(0, pairs);
    const gameCards: Card[] = [];
    
    selectedEmojis.forEach((emoji, index) => {
      gameCards.push(
        { id: index * 2, emoji, isFlipped: false, isMatched: false },
        { id: index * 2 + 1, emoji, isFlipped: false, isMatched: false }
      );
    });
    
    const shuffledCards = gameCards.sort(() => Math.random() - 0.5);
    
    setCards(shuffledCards);
    setFlippedCards([]);
    setMatchedPairs(0);
    setMoves(0);
    setTimeElapsed(0);
    setGameStarted(true);
    setGameCompleted(false);
  };

  const handleCardPress = (cardId: number) => {
    if (flippedCards.length === 2 || flippedCards.includes(cardId)) return;
    
    const card = cards.find(c => c.id === cardId);
    if (card?.isMatched) return;
    
    playSound(flipSound);
    
    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);
    
    const updatedCards = cards.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    );
    setCards(updatedCards);
    
    if (newFlippedCards.length === 2) {
      setMoves(moves + 1);
      checkForMatch(newFlippedCards);
    }
  };

  const checkForMatch = (flippedCardIds: number[]) => {
    const [firstId, secondId] = flippedCardIds;
    const firstCard = cards.find(c => c.id === firstId);
    const secondCard = cards.find(c => c.id === secondId);
    
    if (firstCard?.emoji === secondCard?.emoji) {
      playSound(matchSound);
      
      setTimeout(() => {
        setCards(cards.map(c => 
          c.id === firstId || c.id === secondId 
            ? { ...c, isMatched: true } 
            : c
        ));
        setMatchedPairs(matchedPairs + 1);
        setFlippedCards([]);
      }, 500);
    } else {
      setTimeout(() => {
        setCards(cards.map(c => 
          c.id === firstId || c.id === secondId 
            ? { ...c, isFlipped: false } 
            : c
        ));
        setFlippedCards([]);
      }, 1000);
    }
  };

  const handleGameComplete = () => {
    setGameCompleted(true);
    setGameStarted(false);
    playSound(successSound);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPerformanceRating = (): string => {
    const { pairs } = gridConfig[difficulty];
    const perfectMoves = pairs;
    const ratio = moves / perfectMoves;
    
    if (ratio <= 1.5) return "🏆 Perfect! Memory Master!";
    if (ratio <= 2.5) return "⭐ Excellent! Great Memory!";
    if (ratio <= 3.5) return "👍 Good Job! Keep Practicing!";
    return "💪 Nice Try! You Can Do Better!";
  };

  const renderCard = (card: Card) => {
    const { cardSize } = gridConfig[difficulty];
    
    return (
      <TouchableOpacity
        key={card.id}
        style={[
          styles.card,
          { width: cardSize - 10, height: cardSize - 10 },
          card.isFlipped && styles.cardFlipped,
          card.isMatched && styles.cardMatched
        ]}
        onPress={() => handleCardPress(card.id)}
        disabled={card.isMatched || flippedCards.length === 2}
      >
        <Text style={card.isFlipped || card.isMatched ? styles.cardEmoji : styles.cardBack}>
          {card.isFlipped || card.isMatched ? card.emoji : '🌊'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderGame = () => {
    return (
      <View style={styles.gameContainer}>
        <View style={styles.gameStats}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={20} color="white" />
            <Text style={styles.statText}>{formatTime(timeElapsed)}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="hand-left-outline" size={20} color="white" />
            <Text style={styles.statText}>{moves}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-done-outline" size={20} color="white" />
            <Text style={styles.statText}>{matchedPairs}/{gridConfig[difficulty].pairs}</Text>
          </View>
        </View>
        
        <View style={styles.grid}>
          {cards.map(card => renderCard(card))}
        </View>
      </View>
    );
  };

  const renderGameResults = () => {
    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultTitle}>Game Completed! 🎉</Text>
        
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreTime}>{formatTime(timeElapsed)}</Text>
          <Text style={styles.scoreDetail}>{moves} moves</Text>
        </View>
        
        <Text style={styles.scoreMessage}>{getPerformanceRating()}</Text>
        
        <View style={styles.factContainer}>
          <Text style={styles.factTitle}>Ocean Fact 🌊</Text>
          <Text style={styles.factText}>
            Every piece of plastic ever made still exists today. By playing games like this and learning about our oceans, you're helping spread awareness about marine conservation!
          </Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.retryButton]}
            onPress={() => initializeGame(difficulty)}
          >
            <Text style={styles.buttonText}>Play Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.homeButton]}
            onPress={() => {
              stopAndUnloadSounds();
              navigation.navigate('Dash');
            }}
          >
            <Text style={styles.buttonText}>Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="earth" size={30} color="white" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Ocean Memory Challenge</Text>
        <TouchableOpacity onPress={toggleSound} style={styles.soundButton}>
          <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={24} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="white" style={styles.loadingIndicator} />
      ) : (
        user && (
          <View style={styles.topBanner}>
            <Text style={styles.bannerText}>Welcome, {user.name}!</Text>
          </View>
        )
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.gameSection}>
          {!gameStarted && !gameCompleted && (
            <View style={styles.difficultySelector}>
              <Text style={styles.sectionTitle}>Select Difficulty:</Text>
              <View style={styles.difficultyButtons}>
                {(['easy', 'medium', 'hard'] as const).map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.difficultyButton,
                      difficulty === level && styles.selectedDifficulty
                    ]}
                    onPress={() => initializeGame(level)}
                  >
                    <Text style={[
                      styles.difficultyButtonText,
                      difficulty === level && styles.selectedDifficultyText
                    ]}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                    <Text style={styles.difficultyInfo}>
                      {gridConfig[level].pairs} pairs
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {gameStarted && !gameCompleted && renderGame()}
          {gameCompleted && renderGameResults()}

          <View style={styles.factsSection}>
            <Text style={styles.sectionTitle}>Ocean Conservation Facts</Text>
            <Text style={styles.factText}>• Over 8 million tons of plastic enter our oceans every year</Text>
            <Text style={styles.factText}>• By 2050, there could be more plastic than fish in the sea (by weight)</Text>
            <Text style={styles.factText}>• About 50% of coral reefs have already been destroyed</Text>
            <Text style={styles.factText}>• A single reusable bottle can replace 1,825 plastic bottles over 5 years</Text>
          </View>
        </View>
      </ScrollView>

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
            style={styles.navButton} 
            onPress={() => {
              stopAndUnloadSounds();
              navigation.navigate(item.screen);
            }}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000957',
    justifyContent: 'space-between',
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  soundButton: {
    padding: 5,
  },
  topBanner: {
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  bannerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  loadingIndicator: {
    marginTop: 20,
  },
  scrollContent: {
    paddingBottom: 100,
    alignItems: 'center',
  },
  gameSection: {
    width: '90%',
    marginTop: 20,
  },
  difficultySelector: {
    backgroundColor: '#000957',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  difficultyButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#0A5EB0',
    borderRadius: 8,
    margin: 5,
    alignItems: 'center',
  },
  selectedDifficulty: {
    backgroundColor: '#009990',
  },
  difficultyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  selectedDifficultyText: {
    color: '#000957',
  },
  difficultyInfo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 5,
  },
  gameContainer: {
    backgroundColor: '#000957',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  card: {
    backgroundColor: '#0A5EB0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#009990',
  },
  cardFlipped: {
    backgroundColor: '#FFFFFF',
  },
  cardMatched: {
    backgroundColor: '#4CAF50',
    opacity: 0.6,
  },
  cardEmoji: {
    fontSize: 40,
  },
  cardBack: {
    fontSize: 50,
  },
  resultsContainer: {
    backgroundColor: '#000957',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#009990',
    marginBottom: 20,
  },
  scoreCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#0A5EB0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 5,
    borderColor: '#009990',
  },
  scoreTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  scoreDetail: {
    color: 'white',
    fontSize: 14,
  },
  scoreMessage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
  },
  factContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  factTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#009990',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    flex: 1,
    margin: 5,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#009990',
  },
  homeButton: {
    backgroundColor: '#4A90E2',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  factsSection: {
    backgroundColor: '#000957',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#009990',
    marginBottom: 10,
  },
  factText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000957',
    flexDirection: 'row',
    height: 70,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    color: 'white',
    fontSize: 10,
    marginTop: 4,
  },
});

export default OceanMemoryGame;