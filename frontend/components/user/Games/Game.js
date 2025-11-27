import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

// You'll need to add these images to your assets folder
import cardBackImg from '../../assets/card_back.jpg';
import oceanImg1 from '../../assets/ocean_1.jpg';
import oceanImg2 from '../../assets/ocean_2.jpg';
import oceanImg3 from '../../assets/ocean_3.jpg';
import oceanImg4 from '../../assets/ocean_4.jpg';
import oceanImg5 from '../../assets/ocean_5.jpg';
import oceanImg6 from '../../assets/ocean_6.jpg';
import oceanImg7 from '../../assets/ocean_7.jpg'; // Add more ocean images
import oceanImg8 from '../../assets/ocean_8.jpg'; // for harder levels
import oceanImg9 from '../../assets/ocean_9.jpg';
import oceanImg10 from '../../assets/ocean_10.jpg';

// Pre-define audio assets to avoid undefined module errors
const AUDIO_ASSETS = {
  background: require('../../assets/ocean_background_music.mp3'),
  flip: require('../../assets/card_flip.mp3'),
  match: require('../../assets/match_sound.mp3'),
  success: require('../../assets/success_sound.mp3'),
  fail: require('../../assets/incorrect_answer_sound.mp3')
};

const { width } = Dimensions.get('window');

const Game = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState('easy'); // 'easy', 'medium', 'hard'
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [gameActive, setGameActive] = useState(false);
  const [highScores, setHighScores] = useState({
    easy: 0,
    medium: 0,
    hard: 0
  });
  
  // Sound states
  const [backgroundSound, setBackgroundSound] = useState(null);
  const [flipSound, setFlipSound] = useState(null);
  const [matchSound, setMatchSound] = useState(null);
  const [successSound, setSuccessSound] = useState(null);
  const [failSound, setFailSound] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [soundsLoaded, setSoundsLoaded] = useState(false);

  // Get card size based on difficulty
  const getCardSize = () => {
    switch(difficulty) {
      case 'easy': return (width - 80) / 3;
      case 'medium': return (width - 80) / 4;
      case 'hard': return (width - 80) / 5;
      default: return (width - 80) / 3;
    }
  };

  const cardSize = getCardSize();

  // Array of card images based on difficulty
  const getCardImages = () => {
    switch(difficulty) {
      case 'easy':
        return [oceanImg1, oceanImg2, oceanImg3, oceanImg4, oceanImg5, oceanImg6];
      case 'medium':
        return [oceanImg1, oceanImg2, oceanImg3, oceanImg4, oceanImg5, oceanImg6, oceanImg7, oceanImg8];
      case 'hard':
        return [oceanImg1, oceanImg2, oceanImg3, oceanImg4, oceanImg5, oceanImg6, oceanImg7, oceanImg8, oceanImg9, oceanImg10];
      default:
        return [oceanImg1, oceanImg2, oceanImg3, oceanImg4, oceanImg5, oceanImg6];
    }
  };

  // Get initial time based on difficulty
  const getInitialTime = () => {
    switch(difficulty) {
      case 'easy': return 120; // 2 minutes
      case 'medium': return 90; // 1.5 minutes
      case 'hard': return 60; // 1 minute
      default: return 120;
    }
  };

  // Initialize game
  useEffect(() => {
    fetchUserData();
    loadHighScores();
    return () => {
      unloadSounds();
    };
  }, []);

  // Load sounds
  useEffect(() => {
    const loadSoundsAsync = async () => {
      try {
        await loadSounds();
      } catch (error) {
        console.error('Error in loadSoundsAsync:', error);
      }
    };
    
    loadSoundsAsync();
  }, []);

  // Check for matches whenever flippedIndices changes
  useEffect(() => {
    checkForMatch();
  }, [flippedIndices]);

  // Check if game is completed
  useEffect(() => {
    const cardImages = getCardImages();
    if (matchedPairs.length === cardImages.length && cards.length > 0) {
      gameCompletedHandler();
    }
  }, [matchedPairs, cards]);

  // Timer countdown effect
  useEffect(() => {
    let timer;
    if (gameActive && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (gameActive && timeLeft === 0) {
      handleTimeUp();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, gameActive]);

  // Add this near the top of your component where other useEffect hooks are
  useEffect(() => {
    // Set up a listener for when the screen is blurred (user navigates away)
    const unsubscribe = navigation.addListener('blur', () => {
      // When navigating away, stop all sounds immediately
      if (backgroundSound) {
        backgroundSound.stopAsync().catch(error => 
          console.error('Error stopping background sound:', error)
        );
      }
      unloadSounds();
    });

    // Cleanup function to remove the listener
    return unsubscribe;
  }, [navigation, backgroundSound]);

  const loadHighScores = async () => {
    try {
      const scores = await AsyncStorage.getItem('oceanGameHighScores');
      if (scores) {
        setHighScores(JSON.parse(scores));
      }
    } catch (error) {
      console.error('Error loading high scores:', error);
    }
  };

  const saveHighScore = async (newScore) => {
    try {
      if (newScore > highScores[difficulty]) {
        const newHighScores = { ...highScores, [difficulty]: newScore };
        await AsyncStorage.setItem('oceanGameHighScores', JSON.stringify(newHighScores));
        setHighScores(newHighScores);
        return true; // New high score
      }
      return false; // Not a new high score
    } catch (error) {
      console.error('Error saving high score:', error);
      return false;
    }
  };

  const handleTimeUp = async () => {
    setGameActive(false);
    // Play fail sound
    if (failSound) {
      await playSound(failSound);
    }
    
    // Show all cards briefly before restarting
    const newCards = [...cards];
    newCards.forEach(card => {
      card.flipped = true;
    });
    setCards(newCards);
    
    setTimeout(() => {
      initializeGame();
    }, 3000);
  };

  const loadSounds = async () => {
    try {
      console.log("Starting to load sounds...");
      
      // Load background music with better error handling
      try {
        const { sound: bgSound } = await Audio.Sound.createAsync(
          AUDIO_ASSETS.background,
          { isLooping: true, volume: 0.5 }
        );
        setBackgroundSound(bgSound);
        if (!isMuted) {
          await bgSound.playAsync();
        }
        console.log("Background sound loaded successfully");
      } catch (error) {
        console.error("Failed to load background sound:", error);
      }
      
      // Load card flip sound
      try {
        const { sound: cardFlipSound } = await Audio.Sound.createAsync(
          AUDIO_ASSETS.flip,
          { volume: 0.7 }
        );
        setFlipSound(cardFlipSound);
        console.log("Flip sound loaded successfully");
      } catch (error) {
        console.error("Failed to load flip sound:", error);
      }
      
      // Load match sound
      try {
        const { sound: pairMatchSound } = await Audio.Sound.createAsync(
          AUDIO_ASSETS.match,
          { volume: 0.7 }
        );
        setMatchSound(pairMatchSound);
        console.log("Match sound loaded successfully");
      } catch (error) {
        console.error("Failed to load match sound:", error);
      }
      
      // Load success sound
      try {
        const { sound: gameSuccessSound } = await Audio.Sound.createAsync(
          AUDIO_ASSETS.success,
          { volume: 1.0 }
        );
        setSuccessSound(gameSuccessSound);
        console.log("Success sound loaded successfully");
      } catch (error) {
        console.error("Failed to load success sound:", error);
      }
      
      // Load fail sound
      try {
        const { sound: gameFailSound } = await Audio.Sound.createAsync(
          AUDIO_ASSETS.fail,
          { volume: 1.0 }
        );
        setFailSound(gameFailSound);
        console.log("Fail sound loaded successfully");
      } catch (error) {
        console.error("Failed to load fail sound:", error);
      }
      
      setSoundsLoaded(true);
    } catch (error) {
      console.error('Error in main loadSounds function:', error);
    }
  };

  const unloadSounds = async () => {
    try {
      if (backgroundSound) {
        try {
          await backgroundSound.stopAsync();
          await backgroundSound.unloadAsync();
        } catch (error) {
          console.error('Error stopping/unloading background sound:', error);
        }
      }
      
      if (flipSound) {
        try {
          await flipSound.unloadAsync();
        } catch (error) {
          console.error('Error unloading flip sound:', error);
        }
      }
      
      if (matchSound) {
        try {
          await matchSound.unloadAsync();
        } catch (error) {
          console.error('Error unloading match sound:', error);
        }
      }
      
      if (successSound) {
        try {
          await successSound.unloadAsync();
        } catch (error) {
          console.error('Error unloading success sound:', error);
        }
      }
      
      if (failSound) {
        try {
          await failSound.unloadAsync();
        } catch (error) {
          console.error('Error unloading fail sound:', error);
        }
      }
      
      // Reset sound states
      setBackgroundSound(null);
      setFlipSound(null);
      setMatchSound(null);
      setSuccessSound(null);
      setFailSound(null);
      setSoundsLoaded(false);
    } catch (error) {
      console.error('Error in unloadSounds:', error);
    }
  };
  
  const toggleSound = async () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    if (backgroundSound) {
      try {
        if (newMuteState) {
          await backgroundSound.pauseAsync();
        } else {
          await backgroundSound.playAsync();
        }
      } catch (error) {
        console.error('Error toggling sound:', error);
      }
    }
  };

  const playSound = async (soundObject) => {
    if (soundObject && !isMuted) {
      try {
        // Need to use replayAsync to make sure the sound plays from beginning each time
        await soundObject.stopAsync().catch(err => console.log("Error stopping sound:", err));
        await soundObject.setPositionAsync(0).catch(err => console.log("Error setting position:", err));
        await soundObject.playAsync().catch(err => console.log("Error playing sound:", err));
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    }
  };

  const changeDifficulty = (level) => {
    setDifficulty(level);
    setShowLevelModal(false);
    initializeGame(level);
  };

  const gameCompletedHandler = async () => {
    setGameActive(false);
    setGameCompleted(true);
    
    // Calculate score based on moves, remaining time, and difficulty multiplier
    const difficultyMultiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
    const timeBonus = timeLeft * 5;
    const calculatedScore = Math.max((1000 - (moves * 10) + timeBonus) * difficultyMultiplier, 100);
    setScore(calculatedScore);
    
    // Save high score
    const isNewHighScore = await saveHighScore(calculatedScore);
    
    // Play success sound
    if (successSound) {
      await playSound(successSound);
    }
  };

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      // Update the API URL to your actual server address
      const apiUrl = 'http://10.120.221.103:5000/me';
      console.log(`Fetching user data from: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok) {
        console.log('User data fetched successfully:', data.user);
        setUser(data.user);
      } else {
        console.error('Error fetching user:', data.message);
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
      // Show level selection modal when data is loaded
      setShowLevelModal(true);
    }
  };

  const initializeGame = (level = difficulty) => {
    // Get selected images based on difficulty
    const cardImages = getCardImages();
    
    // Create pairs of cards
    const cardPairs = [...cardImages, ...cardImages].map((image, index) => ({
      id: index,
      image,
      flipped: false,
      matched: false
    }));
    
    // Shuffle the cards
    const shuffledCards = shuffleArray(cardPairs);
    setCards(shuffledCards);
    setFlippedIndices([]);
    setMatchedPairs([]);
    setMoves(0);
    setGameCompleted(false);
    setScore(0);
    
    // Set timer based on difficulty
    setTimeLeft(getInitialTime());
    // Start the game
    setGameActive(true);
  };

  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleCardPress = async (index) => {
    // Prevent flipping if game is not active
    if (!gameActive) return;
    
    // Prevent flipping if card is already flipped or matched
    if (
      flippedIndices.length === 2 || 
      flippedIndices.includes(index) || 
      cards[index].matched
    ) {
      return;
    }

    // Play flip sound
    if (flipSound) {
      await playSound(flipSound);
    }

    // Flip the card
    const newCards = [...cards];
    newCards[index].flipped = true;
    setCards(newCards);

    // Add to flipped indices
    setFlippedIndices([...flippedIndices, index]);

    // If this is the second card flipped, increment moves
    if (flippedIndices.length === 1) {
      setMoves(moves + 1);
    }
  };

  const checkForMatch = async () => {
    if (flippedIndices.length === 2) {
      const [firstIndex, secondIndex] = flippedIndices;
      
      // Check if the cards match
      if (cards[firstIndex].image === cards[secondIndex].image) {
        // Play match sound
        if (matchSound) {
          await playSound(matchSound);
        }
        
        // Mark cards as matched
        setTimeout(() => {
          const newCards = [...cards];
          newCards[firstIndex].matched = true;
          newCards[secondIndex].matched = true;
          setCards(newCards);
          setMatchedPairs([...matchedPairs, cards[firstIndex].image]);
          setFlippedIndices([]);
        }, 500);
      } else {
        // Flip cards back after a delay
        setTimeout(() => {
          const newCards = [...cards];
          newCards[firstIndex].flipped = false;
          newCards[secondIndex].flipped = false;
          setCards(newCards);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderCard = (card, index) => {
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.card,
          { width: cardSize, height: cardSize },
          card.flipped && styles.cardFlipped,
          card.matched && styles.cardMatched
        ]}
        onPress={() => handleCardPress(index)}
        disabled={card.flipped || card.matched || !gameActive}
      >
        {card.flipped || card.matched ? (
          <Image source={card.image} style={styles.cardImage} />
        ) : (
          <Image source={cardBackImg} style={styles.cardImage} />
        )}
      </TouchableOpacity>
    );
  };

  const renderDifficultyBadge = () => {
    const badgeColor = difficulty === 'easy' ? '#4CAF50' : difficulty === 'medium' ? '#FFC107' : '#F44336';
    return (
      <View style={[styles.difficultyBadge, { backgroundColor: badgeColor }]}>
        <Text style={styles.difficultyText}>
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Level Selection Modal */}
      <Modal
        visible={showLevelModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Difficulty Level</Text>
            <TouchableOpacity 
              style={[styles.levelButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => changeDifficulty('easy')}
            >
              <Text style={styles.levelButtonText}>Easy (6 pairs)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.levelButton, { backgroundColor: '#FFC107' }]}
              onPress={() => changeDifficulty('medium')}
            >
              <Text style={styles.levelButtonText}>Medium (8 pairs)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.levelButton, { backgroundColor: '#F44336' }]}
              onPress={() => changeDifficulty('hard')}
            >
              <Text style={styles.levelButtonText}>Hard (10 pairs)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header with sound control */}
      <View style={styles.header}>
        <Ionicons name="earth" size={30} color="white" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>BlueGuard</Text>
        <TouchableOpacity onPress={toggleSound} style={styles.soundButton}>
          <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Display User Name at the Top */}
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
        {/* Game Section */}
        <View style={styles.gameSection}>
          <View style={styles.titleRow}>
            <Text style={styles.gameTitle}>Ocean Memory Game</Text>
            {renderDifficultyBadge()}
            <TouchableOpacity 
              style={styles.changeLevelButton}
              onPress={() => setShowLevelModal(true)}
            >
              <Text style={styles.changeLevelText}>Change</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.subtitle}>
            Test your memory and learn about marine life while having fun!
          </Text>

          {/* Game Status */}
          <View style={styles.gameStatus}>
            <Text style={styles.statusText}>Moves: {moves}</Text>
            <Text style={styles.statusText}>
              Time: {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
            </Text>
            <Text style={styles.statusText}>
              Pairs: {matchedPairs.length}/{getCardImages().length}
            </Text>
          </View>

          {/* Game Board */}
          <View style={styles.gameBoard}>
            {cards.map((card, index) => renderCard(card, index))}
          </View>

          {/* Game Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#009990' }]} 
              onPress={initializeGame}
            >
              <Text style={styles.buttonText}>🔄 New Game</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#FFC107' }]} 
              onPress={() => setShowLevelModal(true)}
            >
              <Text style={styles.buttonText}>📊 Change Level</Text>
            </TouchableOpacity>
          </View>

          {/* High Scores */}
          <View style={styles.highScoresSection}>
            <Text style={styles.sectionTitle}>High Scores</Text>
            <View style={styles.highScoreRow}>
              <Text style={styles.highScoreLabel}>Easy:</Text>
              <Text style={styles.highScoreValue}>{highScores.easy}</Text>
            </View>
            <View style={styles.highScoreRow}>
              <Text style={styles.highScoreLabel}>Medium:</Text>
              <Text style={styles.highScoreValue}>{highScores.medium}</Text>
            </View>
            <View style={styles.highScoreRow}>
              <Text style={styles.highScoreLabel}>Hard:</Text>
              <Text style={styles.highScoreValue}>{highScores.hard}</Text>
            </View>
          </View>

          {/* Game Completed Banner */}
          {gameCompleted && (
            <View style={styles.completedBanner}>
              <Text style={styles.completedText}>Game Completed!</Text>
              <Text style={styles.scoreText}>Score: {score}</Text>
              <Text style={styles.completedSubtext}>
                You found all {getCardImages().length} pairs in {moves} moves!
              </Text>
              {score === highScores[difficulty] && (
                <Text style={styles.newHighScoreText}>🏆 NEW HIGH SCORE! 🏆</Text>
              )}
            </View>
          )}

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <Text style={styles.sectionTitle}>Ocean Conservation Tips</Text>
            <Text style={styles.tipText}>• Reduce plastic use to prevent ocean pollution</Text>
            <Text style={styles.tipText}>• Choose sustainable seafood options</Text>
            <Text style={styles.tipText}>• Participate in beach clean-ups</Text>
            <Text style={styles.tipText}>• Support marine conservation organizations</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {[
          { name: 'Dashboard', icon: 'home', screen: 'Dash' },
          { name: 'Notifications', icon: 'notifications', screen: 'Notifications' },
          { name: 'My Reports', icon: 'document-text', screen: 'Reports' },
          { name: 'Rewards', icon: 'trophy', screen: 'Rewards' },
          { name: 'Knowledge', icon: 'book', screen: 'Knowledge' },
          { name: 'Profile', icon: 'person', screen: 'Profile' }
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
    elevation: 5
  },
  bannerText: {
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#000', 
    textAlign: 'center'
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#009990',
    textAlign: 'center',
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginLeft: 10,
  },
  difficultyText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  changeLevelButton: {
    marginLeft: 5,
    padding: 5,
  },
  changeLevelText: {
    color: 'white',
    textDecorationLine: 'underline',
    fontSize: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: 'white',
    marginBottom: 20,
  },
  gameStatus: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: '#000957',
    padding: 10,
    borderRadius: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gameBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  card: {
    margin: 5,
    borderRadius: 10,
    backgroundColor: '#000957',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cardFlipped: {
    backgroundColor: '#009990',
    transform: [{ rotateY: '180deg' }],
  },
  cardMatched: {
    backgroundColor: '#4CAF50',
    opacity: 0.8,
  },
  cardImage: {
    width: '90%',
    height: '90%',
    borderRadius: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#000957',
    fontWeight: 'bold',
    fontSize: 16,
  },
  highScoresSection: {
    backgroundColor: '#000957',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  highScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  highScoreLabel: {
    color: 'white',
    fontSize: 16,
  },
  highScoreValue: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedBanner: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 20,
  },
  completedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 5,
  },
  completedSubtext: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
  },
  newHighScoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#009990',
    marginBottom: 10,
  },
  tipsSection: {
    backgroundColor: '#000957',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  tipText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
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
    alignItems: 'center',
  },
  navText: {
    color: 'white',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000957',
    marginBottom: 20,
  },
  levelButton: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  levelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default Game;
