import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

// You'll need to add these images to your assets folder
import quizBgImg from '../../assets/quiz_background.jpg';
import correctImg from '../../assets/correct_answer.jpg';
import incorrectImg from '../../assets/incorrect_answer.jpg';

const { width } = Dimensions.get('window');

const OceanQuizGame = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [timerActive, setTimerActive] = useState(false);
  const [difficulty, setDifficulty] = useState('easy');
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  
  // Sound states
  const [backgroundSound, setBackgroundSound] = useState(null);
  const [correctSound, setCorrectSound] = useState(null);
  const [incorrectSound, setIncorrectSound] = useState(null);
  const [successSound, setSuccessSound] = useState(null);
  const [clockSound, setClockSound] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  // Quiz questions by difficulty
  const questions = {
    easy: [
      {
        question: "What percentage of Earth's surface is covered by oceans?",
        options: ["50%", "60%", "70%", "80%"],
        correctAnswer: "70%",
        explanation: "Oceans cover approximately 70% of Earth's surface and contain about 97% of Earth's water."
      },
      {
        question: "Which of these is NOT a major cause of ocean pollution?",
        options: ["Plastic waste", "Oil spills", "Acid rain", "Volcanic eruptions"],
        correctAnswer: "Volcanic eruptions",
        explanation: "While volcanic eruptions can affect oceans, they're natural events and not considered a major source of pollution compared to human activities."
      },
      {
        question: "Which marine animal can live for over 200 years?",
        options: ["Blue Whale", "Giant Squid", "Greenland Shark", "Sea Turtle"],
        correctAnswer: "Greenland Shark",
        explanation: "Greenland Sharks are among the longest-living vertebrates, with some estimated to be over 400 years old."
      },
      {
        question: "What is coral bleaching primarily caused by?",
        options: ["Ocean acidification", "Rising water temperatures", "Plastic pollution", "Overfishing"],
        correctAnswer: "Rising water temperatures",
        explanation: "Coral bleaching occurs when corals expel their symbiotic algae due to stress, primarily caused by increased water temperatures."
      },
      {
        question: "Approximately how many species live in the ocean?",
        options: ["About 50,000", "About 230,000", "About 1 million", "About 2 million"],
        correctAnswer: "About 230,000",
        explanation: "Scientists have identified about 230,000 marine species, but estimate that millions more remain undiscovered."
      },
      {
        question: "Which of these is NOT one of the world's five oceans?",
        options: ["Arctic Ocean", "Southern Ocean", "Mediterranean Ocean", "Indian Ocean"],
        correctAnswer: "Mediterranean Ocean",
        explanation: "The Mediterranean is a sea, not an ocean. The world's five oceans are the Pacific, Atlantic, Indian, Southern, and Arctic Oceans."
      },
      {
        question: "What percentage of marine life remains undiscovered?",
        options: ["Around 30%", "Around 50%", "Around 70%", "Around 90%"],
        correctAnswer: "Around 90%",
        explanation: "Scientists estimate that about 90% of marine species remain undiscovered, particularly in the deep sea."
      },
      {
        question: "What is the most common type of marine debris?",
        options: ["Fishing gear", "Plastic bags", "Cigarette butts", "Food containers"],
        correctAnswer: "Cigarette butts",
        explanation: "Cigarette butts are the most common type of marine debris, with billions discarded annually. They contain toxic chemicals and microplastics."
      },
      {
        question: "Which of these marine animals is NOT a mammal?",
        options: ["Dolphin", "Whale", "Seal", "Shark"],
        correctAnswer: "Shark",
        explanation: "Sharks are fish with cartilaginous skeletons. Dolphins, whales, and seals are all marine mammals that breathe air and nurse their young."
      },
      {
        question: "How much of the ocean floor has been mapped in detail?",
        options: ["Less than 20%", "About 35%", "About 50%", "More than 80%"],
        correctAnswer: "Less than 20%",
        explanation: "Less than 20% of the ocean floor has been mapped in detail, making it less explored than the surface of Mars."
      }
      
    ],
    medium: [
      {
        question: "Which ocean is the largest and deepest?",
        options: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"],
        correctAnswer: "Pacific Ocean",
        explanation: "The Pacific Ocean is the largest and deepest ocean, covering about 63 million square miles and reaching depths of over 36,000 feet in the Mariana Trench."
      },
      {
        question: "What is the Great Pacific Garbage Patch?",
        options: ["A landfill near the ocean", "A marine conservation zone", "A concentration of marine debris", "A man-made island"],
        correctAnswer: "A concentration of marine debris",
        explanation: "The Great Pacific Garbage Patch is a collection of marine debris (mostly plastics) in the North Pacific Ocean, formed by ocean currents."
      },
      {
        question: "Which of these fish is most threatened by overfishing?",
        options: ["Atlantic Cod", "Tuna", "Bluefin Tuna", "Salmon"],
        correctAnswer: "Bluefin Tuna",
        explanation: "Bluefin Tuna populations have declined by over 97% due to overfishing, as they're highly prized for sushi."
      },
      {
        question: "What percentage of the world's oxygen is produced by marine plants?",
        options: ["10-20%", "30-40%", "50-70%", "80-90%"],
        correctAnswer: "50-70%",
        explanation: "Marine plants, particularly phytoplankton, produce between 50-70% of the world's oxygen through photosynthesis."
      },
      {
        question: "What is the primary cause of ocean acidification?",
        options: ["Agricultural runoff", "Increased carbon dioxide", "Plastic pollution", "Oil spills"],
        correctAnswer: "Increased carbon dioxide",
        explanation: "Ocean acidification occurs when the ocean absorbs atmospheric CO2, leading to a decrease in pH and affecting marine life, especially shell-forming organisms."
      },
      {
        question: "What is the deepest known point in Earth's oceans?",
        options: ["Tonga Trench", "Puerto Rico Trench", "Mariana Trench", "Java Trench"],
        correctAnswer: "Mariana Trench",
        explanation: "The Mariana Trench in the western Pacific Ocean reaches a depth of approximately 36,000 feet (10,994 meters) at its deepest point, called the Challenger Deep."
      },
      {
        question: "Which of these is a major contributor to oceanic dead zones?",
        options: ["Microplastics", "Agricultural runoff", "Oil spills", "Desalination plants"],
        correctAnswer: "Agricultural runoff",
        explanation: "Agricultural runoff containing fertilizers causes algal blooms that deplete oxygen in the water, creating 'dead zones' where marine life cannot survive."
      },
      {
        question: "What is the average temperature of the deep ocean?",
        options: ["Around 0°C (32°F)", "Around 4°C (39°F)", "Around 10°C (50°F)", "Around 15°C (59°F)"],
        correctAnswer: "Around 4°C (39°F)",
        explanation: "The deep ocean maintains a fairly constant temperature of about 4°C (39°F), regardless of the surface temperature or geographic location."
      },
      {
        question: "Which marine animal has the largest brain of any creature on Earth?",
        options: ["Blue Whale", "Giant Squid", "Sperm Whale", "Orca (Killer Whale)"],
        correctAnswer: "Sperm Whale",
        explanation: "The Sperm Whale has the largest brain of any animal on Earth, weighing up to 20 pounds (9 kg), though the brain-to-body ratio is smaller than in humans."
      },
      {
        question: "What is the primary factor affecting global sea level rise?",
        options: ["Melting sea ice", "Thermal expansion", "Melting glaciers and ice sheets", "Increased rainfall"],
        correctAnswer: "Melting glaciers and ice sheets",
        explanation: "While thermal expansion (water expanding as it warms) contributes, the melting of land-based ice from glaciers and ice sheets in Greenland and Antarctica is the primary driver of sea level rise."
      }
    ],
    hard: [
      {
        question: "What is the thermohaline circulation?",
        options: ["Underwater volcanic activity", "The global ocean conveyor belt", "Tropical storm formation", "Coral spawning events"],
        correctAnswer: "The global ocean conveyor belt",
        explanation: "The thermohaline circulation is a global ocean circulation pattern driven by differences in temperature and salinity, acting like a conveyor belt to distribute heat worldwide."
      },
      {
        question: "Which ecosystem is known as the 'rainforest of the sea'?",
        options: ["Kelp forests", "Coral reefs", "Mangroves", "Seagrass meadows"],
        correctAnswer: "Coral reefs",
        explanation: "Coral reefs are called the 'rainforests of the sea' because they support about 25% of all marine species despite covering less than 1% of the ocean floor."
      },
      {
        question: "What is the average depth of the world's oceans?",
        options: ["1,500 meters", "2,300 meters", "3,700 meters", "5,500 meters"],
        correctAnswer: "3,700 meters",
        explanation: "The average depth of the world's oceans is about 3,700 meters (12,100 feet), which highlights how much of the ocean remains unexplored."
      },
      {
        question: "Which of these is NOT a true statement about marine snow?",
        options: ["It's primarily composed of organic matter", "It's an important food source in the deep sea", "It's actual frozen water particles", "It helps transport carbon to deep ocean"],
        correctAnswer: "It's actual frozen water particles",
        explanation: "Marine snow isn't frozen water but rather a continuous shower of mostly organic detritus falling from upper waters to the deep ocean."
      },
      {
        question: "What percentage of marine plastic pollution comes from land-based sources?",
        options: ["About 30%", "About 50%", "About 70%", "About 80%"],
        correctAnswer: "About 80%",
        explanation: "Approximately 80% of marine plastic pollution originates from land-based sources, including litter, industrial discharge, and inadequate waste management."
      },
      {
        question: "What is upwelling in ocean systems?",
        options: ["Underwater volcanic activity", "Rising of deep, cold water to the surface", "Tidal wave formation", "Ocean current reversal"],
        correctAnswer: "Rising of deep, cold water to the surface",
        explanation: "Upwelling occurs when deep, cold, nutrient-rich water rises to the surface, usually replacing warmer, nutrient-depleted surface water, creating highly productive marine ecosystems."
      },
      {
        question: "What is the approximate salt content (salinity) of ocean water?",
        options: ["About 2%", "About 3.5%", "About 5%", "About 7%"],
        correctAnswer: "About 3.5%",
        explanation: "The average salinity of ocean water is about 3.5%, which means there are approximately 35 grams of salt in 1 liter of seawater."
      },
      {
        question: "Which oceanic zone receives enough sunlight for photosynthesis?",
        options: ["Hadal zone", "Bathyal zone", "Abyssal zone", "Euphotic zone"],
        correctAnswer: "Euphotic zone",
        explanation: "The euphotic (or epipelagic) zone extends to about 200 meters deep and receives enough sunlight for photosynthesis, supporting most marine photosynthetic life."
      },
      {
        question: "What causes the distinctive bioluminescence seen in some ocean waters?",
        options: ["Chemical reactions with salt", "Bacterial colonies", "Plankton and other organisms", "Reflected moonlight"],
        correctAnswer: "Plankton and other organisms",
        explanation: "Bioluminescent displays in oceans are primarily caused by dinoflagellates (a type of plankton) and other marine organisms that produce light through chemical reactions within their bodies."
      },
      {
        question: "Which statement about ocean acidification is accurate?",
        options: ["It primarily affects deep-sea environments", "It increases calcium carbonate availability", "It's caused by decreasing atmospheric CO2", "It hinders shell formation in marine organisms"],
        correctAnswer: "It hinders shell formation in marine organisms",
        explanation: "Ocean acidification makes it harder for shell-forming organisms like corals, mollusks, and some plankton to build their calcium carbonate structures, threatening marine ecosystems and food webs."
      }
    ]
  };

  // Initialize game
  useEffect(() => {
    fetchUserData();
    initializeGame('easy');
    
    // Set up navigation event listeners for both focus and blur
    const unsubscribeFocus = navigation.addListener('focus', () => {
      loadSounds();
    });
    
    const unsubscribeBlur = navigation.addListener('blur', () => {
      stopAndUnloadSounds();
    });
    
    // Handle when the component is unmounted
    return () => {
      stopAndUnloadSounds();
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    let interval;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        if (timeLeft <= 5 && !isMuted && clockSound) {
          playSound(clockSound);
        }
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      handleTimeUp();
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // Safe sound handler for navigation
  const stopAndUnloadSounds = async () => {
    try {
      // Create an array of all sound objects
      const soundObjects = [
        backgroundSound,
        correctSound,
        incorrectSound,
        successSound,
        clockSound
      ];
      
      // Safely stop and unload each sound
      for (const sound of soundObjects) {
        if (sound) {
          try {
            // First try to stop the sound if it's playing
            const status = await sound.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
              await sound.stopAsync();
            }
            
            // Then unload the sound
            if (status.isLoaded) {
              await sound.unloadAsync();
            }
          } catch (soundError) {
            // Log error but continue with other sounds
            console.log('Error handling sound:', soundError);
          }
        }
      }
      
      // Reset all sound states to null
      setBackgroundSound(null);
      setCorrectSound(null);
      setIncorrectSound(null);
      setSuccessSound(null);
      setClockSound(null);
    } catch (error) {
      console.error('Error in stopAndUnloadSounds:', error);
    }
  };
  const loadSounds = async () => {
    try {
      // First make sure all previous sounds are unloaded
      await stopAndUnloadSounds();
      
      // Load background music
      const { sound: bgSound } = await Audio.Sound.createAsync(
        require('../../assets/ocean_quiz_music.mp3'),
        { isLooping: true, shouldPlay: !isMuted, volume: isMuted ? 0 : 0.3 }
      );
      setBackgroundSound(bgSound);
      
      // Load correct answer sound
      const { sound: correctAnswerSound } = await Audio.Sound.createAsync(
        require('../../assets/correct_answer_sound.mp3'),
        { volume: isMuted ? 0 : 0.7 }
      );
      setCorrectSound(correctAnswerSound);
      
      // Load incorrect answer sound
      const { sound: incorrectAnswerSound } = await Audio.Sound.createAsync(
        require('../../assets/incorrect_answer_sound.mp3'),
        { volume: isMuted ? 0 : 0.7 }
      );
      setIncorrectSound(incorrectAnswerSound);
      
      // Load success sound
      const { sound: gameSuccessSound } = await Audio.Sound.createAsync(
        require('../../assets/quiz_complete_sound.mp3'),
        { volume: isMuted ? 0 : 1.0 }
      );
      setSuccessSound(gameSuccessSound);
      
      // Load clock ticking sound
      const { sound: tickingSound } = await Audio.Sound.createAsync(
        require('../../assets/clock_tick.mp3'),
        { volume: isMuted ? 0 : 0.5 }
      );
      setClockSound(tickingSound);
      
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
      
      // Update volumes for other sounds
      if (correctSound) await correctSound.setVolumeAsync(newMuteState ? 0 : 0.7);
      if (incorrectSound) await incorrectSound.setVolumeAsync(newMuteState ? 0 : 0.7);
      if (successSound) await successSound.setVolumeAsync(newMuteState ? 0 : 1.0);
      if (clockSound) await clockSound.setVolumeAsync(newMuteState ? 0 : 0.5);
    } catch (error) {
      console.error('Error toggling sound:', error);
    }
  };

  const playSound = async (soundObject) => {
    if (soundObject && !isMuted) {
      try {
        // Check if the sound is loaded before playing
        const status = await soundObject.getStatusAsync();
        if (status.isLoaded) {
          await soundObject.replayAsync();
        } else {
          console.log('Cannot play sound: Sound is not loaded');
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
        navigation.replace('Login');
        return;
      }

      const response = await fetch('http://10.120.221.103:5000/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
      } else {
        console.error('Error fetching user:', data.message);
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeGame = (selectedDifficulty) => {
    setDifficulty(selectedDifficulty);
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setQuizCompleted(false);
    setFeedbackVisible(false);
    
    // Set timer based on difficulty
    let timer = 20;
    if (selectedDifficulty === 'medium') timer = 15;
    if (selectedDifficulty === 'hard') timer = 10;
    
    setTimeLeft(timer);
    setTimerActive(true);
  };

  const handleTimeUp = () => {
    setTimerActive(false);
    setIsAnswerCorrect(false);
    setFeedbackVisible(true);
    playSound(incorrectSound);
    
    setTimeout(() => {
      goToNextQuestion();
    }, 2000);
  };

  const handleAnswerSelect = (answer) => {
    if (selectedAnswer !== null) return; // Prevent selecting multiple answers
    
    setTimerActive(false);
    setSelectedAnswer(answer);
    
    const currentQuiz = questions[difficulty];
    const isCorrect = answer === currentQuiz[currentQuestion].correctAnswer;
    setIsAnswerCorrect(isCorrect);
    setFeedbackVisible(true);
    
    if (isCorrect) {
    setScore(score + 1);
    playSound(correctSound);
  } else {
    playSound(incorrectSound);
  }
      
  // Move to next question after delay
  setTimeout(() => {
    goToNextQuestion();
  }, 2000);
  };
  
  const goToNextQuestion = () => {
    setFeedbackVisible(false);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    
    const currentQuiz = questions[difficulty];
    if (currentQuestion < currentQuiz.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      
      // Reset timer based on difficulty
      let timer = 20;
      if (difficulty === 'medium') timer = 15;
      if (difficulty === 'hard') timer = 10;
      
      setTimeLeft(timer);
      setTimerActive(true);
    } else {
      // Quiz completed
      setQuizCompleted(true);
      playSound(successSound);
    }
  };
  
  const calculateQuizScore = () => {
    const totalQuestions = questions[difficulty].length;
    return Math.round((score / totalQuestions) * 100);
  };
  
  const getScoreMessage = () => {
    const percentage = calculateQuizScore();
    if (percentage >= 80) return "Excellent! You're an ocean expert!";
    if (percentage >= 60) return "Good job! You know a lot about our oceans!";
    if (percentage >= 40) return "Not bad! Keep learning about ocean conservation!";
    return "Keep trying! Our oceans need knowledgeable defenders!";
  };
  
  const renderQuestion = () => {
    const currentQuiz = questions[difficulty];
    if (currentQuiz && currentQuiz[currentQuestion]) {
      return (
        <View style={styles.questionContainer}>
          {/* Question Counter */}
          <View style={styles.questionCounter}>
            <Text style={styles.counterText}>
              Question {currentQuestion + 1}/{currentQuiz.length}
            </Text>
            <View style={styles.timer}>
              <Ionicons name="time-outline" size={24} color={timeLeft <= 5 ? "#FF3B30" : "white"} />
              <Text style={[styles.timerText, timeLeft <= 5 && styles.timerWarning]}>
                {timeLeft}s
              </Text>
            </View>
          </View>
          
          {/* Question */}
          <Text style={styles.questionText}>{currentQuiz[currentQuestion].question}</Text>
          
          {/* Answer Options */}
          <View style={styles.optionsContainer}>
            {currentQuiz[currentQuestion].options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  selectedAnswer === option && styles.selectedOption,
                  feedbackVisible && option === currentQuiz[currentQuestion].correctAnswer && styles.correctOption,
                  feedbackVisible && selectedAnswer === option && option !== currentQuiz[currentQuestion].correctAnswer && styles.incorrectOption
                ]}
                onPress={() => handleAnswerSelect(option)}
                disabled={selectedAnswer !== null}
              >
                <Text style={[
                  styles.optionText,
                  (feedbackVisible && option === currentQuiz[currentQuestion].correctAnswer) || 
                  (selectedAnswer === option && isAnswerCorrect) ? styles.correctOptionText : null,
                  feedbackVisible && selectedAnswer === option && !isAnswerCorrect ? styles.incorrectOptionText : null
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Feedback */}
          {feedbackVisible && (
            <View style={styles.feedbackContainer}>
              <Text style={[styles.feedbackText, isAnswerCorrect ? styles.correctFeedback : styles.incorrectFeedback]}>
                {isAnswerCorrect ? "Correct!" : "Incorrect!"}
              </Text>
              <Text style={styles.explanationText}>
                {currentQuiz[currentQuestion].explanation}
              </Text>
            </View>
          )}
        </View>
      );
    }
    return null;
  };
  
  const renderQuizResults = () => {
    const percentage = calculateQuizScore();
    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultTitle}>Quiz Completed!</Text>
        
        <View style={styles.scoreCircle}>
          <Text style={styles.scorePercentage}>{percentage}%</Text>
          <Text style={styles.scoreDetail}>
            {score} out of {questions[difficulty].length} correct
          </Text>
        </View>
        
        <Text style={styles.scoreMessage}>{getScoreMessage()}</Text>
        
        <View style={styles.factContainer}>
          <Text style={styles.factTitle}>Did You Know?</Text>
          <Text style={styles.factText}>
            Taking action to protect our oceans helps preserve marine biodiversity, stabilize climate patterns, and ensure sustainable food sources for millions of people worldwide.
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
              // Stop all sounds before navigating away
              stopAndUnloadSounds();
              navigation.navigate('Dash');
            }}
          >
            <Text style={styles.buttonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {/* Header with sound control */}
      <View style={styles.header}>
        <Ionicons name="earth" size={30} color="white" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>BlueGuard QUIZ CHALLENGE</Text>
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
          {!quizCompleted && !loading && (
            <>
              {/* Difficulty Selector - Only shown before starting the quiz */}
              {currentQuestion === 0 && selectedAnswer === null && !feedbackVisible && (
                <View style={styles.difficultySelector}>
                  <Text style={styles.sectionTitle}>Select Difficulty:</Text>
                  <View style={styles.difficultyButtons}>
                    {['easy', 'medium', 'hard'].map((level) => (
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
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
  
              {/* Quiz Question */}
              {renderQuestion()}
            </>
          )}
  
          {/* Quiz Results */}
          {quizCompleted && renderQuizResults()}
  
          {/* Ocean Facts Section */}
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
          { name: 'Dashboard', icon: 'home', screen: 'Dash' },
          { name: 'Notifications', icon: 'notifications', screen: 'Notifications' },
          { name: 'My Reports', icon: 'document-text', screen: 'Reports' },
          { name: 'Rewards', icon: 'trophy', screen: 'Rewards' },
          { name: 'Knowledge', icon: 'book', screen: 'Knowledge' },
          { name: 'Profile', icon: 'person', screen: 'Profile' }
        ].map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.navButton} 
            onPress={() => {
              // Stop all sounds before navigating away
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
    questionContainer: {
      backgroundColor: '#000957',
      padding: 20,
      borderRadius: 15,
      marginBottom: 20,
    },
    questionCounter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    counterText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    },
    timer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 15,
    },
    timerText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
      marginLeft: 5,
    },
    timerWarning: {
      color: '#FF3B30',
    },
    questionText: {
      color: 'white',
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    optionsContainer: {
      marginBottom: 15,
    },
    optionButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
    },
    selectedOption: {
      backgroundColor: '#4A90E2',
    },
    correctOption: {
      backgroundColor: '#4CAF50',
    },
    incorrectOption: {
      backgroundColor: '#FF3B30',
    },
    optionText: {
      color: 'white',
      fontSize: 16,
    },
    correctOptionText: {
      color: 'white',
      fontWeight: 'bold',
    },
    incorrectOptionText: {
      color: 'white',
      fontWeight: 'bold',
    },
    feedbackContainer: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: 15,
      borderRadius: 10,
      marginTop: 10,
    },
    feedbackText: {
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 10,
    },
    correctFeedback: {
      color: '#4CAF50',
    },
    incorrectFeedback: {
      color: '#FF3B30',
    },
    explanationText: {
      color: 'white',
      fontSize: 14,
      textAlign: 'center',
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
    scorePercentage: {
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
    export default OceanQuizGame;  
