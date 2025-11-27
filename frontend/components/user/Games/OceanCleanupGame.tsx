import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface GameItem {
  id: number;
  type: string;
  emoji: string;
  points: number;
  x: number;
  y: number;
  speed: number;
}

interface ItemType {
  type: string;
  emoji: string;
  points: number;
  speed: number;
}

type Difficulty = 'easy' | 'medium' | 'hard';

interface Props {
  navigation: any;
}

const OceanCleanupGame: React.FC<Props> = ({ navigation }) => {
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [level, setLevel] = useState(1);
  const [debris, setDebris] = useState<GameItem[]>([]);
  const [marineLife, setMarineLife] = useState<GameItem[]>([]);
  const [factIndex, setFactIndex] = useState(0);
  const [showFact, setShowFact] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [isMuted, setIsMuted] = useState(false);

  const scoreAnimation = useRef(new Animated.Value(1)).current;
  const waterAnimation = useRef(new Animated.Value(0)).current;
  
  const bgSound = useRef<Audio.Sound | null>(null);
  const collectSound = useRef<Audio.Sound | null>(null);
  const errorSound = useRef<Audio.Sound | null>(null);
  const completeSound = useRef<Audio.Sound | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debrisRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const marineRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<number | null>(null);

  const facts = [
    "8 million tons of plastic enter oceans yearly.",
    "By 2050, more plastic than fish by weight.",
    "Plastic bags take 1,000 years to decompose.",
    "Oceans produce 50% of Earth's oxygen.",
    "Marine debris kills 100,000+ animals yearly.",
    "Avoid single-use plastics to help oceans."
  ];

  const debrisTypes: ItemType[] = [
    { type: 'bottle', emoji: '🍾', points: 10, speed: 1 },
    { type: 'bag', emoji: '🛍️', points: 15, speed: 1.2 },
    { type: 'net', emoji: '🥅', points: 20, speed: 0.8 },
    { type: 'can', emoji: '🥫', points: 5, speed: 1.5 },
    { type: 'straw', emoji: '🥤', points: 5, speed: 1.7 },
    { type: 'cup', emoji: '🥡', points: 10, speed: 0.9 }
  ];

  const marineTypes: ItemType[] = [
    { type: 'fish', emoji: '🐟', points: 15, speed: 1.3 },
    { type: 'turtle', emoji: '🐢', points: 20, speed: 1 },
    { type: 'jellyfish', emoji: '🪼', points: 10, speed: 0.8 },
    { type: 'octopus', emoji: '🐙', points: 25, speed: 0.7 },
    { type: 'crab', emoji: '🦀', points: 15, speed: 1.2 }
  ];

  useEffect(() => {
    loadSounds();
    Animated.loop(
      Animated.sequence([
        Animated.timing(waterAnimation, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(waterAnimation, { toValue: 0, duration: 2000, useNativeDriver: false })
      ])
    ).start();
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => t - 1);
        if (Math.random() < 0.05 && !showFact) {
          setFactIndex(Math.floor(Math.random() * facts.length));
          setShowFact(true);
          setTimeout(() => setShowFact(false), 3000);
        }
      }, 1000);
    } else if (timeLeft === 0 && gameActive) endGame();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameActive, timeLeft]);

  useEffect(() => {
    if (gameActive) {
      const rates: Record<Difficulty, [number, number]> = {
        easy: [2000, 3000],
        medium: [1500, 2500],
        hard: [1000, 2000]
      };
      const speedMult: Record<Difficulty, number> = { easy: 1, medium: 1.3, hard: 1.6 };
      const [debrisRate, marineRate] = rates[difficulty];

      debrisRef.current = setInterval(() => {
        const type = debrisTypes[Math.floor(Math.random() * debrisTypes.length)];
        setDebris(d => [...d, {
          id: Date.now() + Math.random(),
          type: type.type,
          emoji: type.emoji,
          points: type.points,
          x: Math.random() * (width - 60),
          y: -80,
          speed: type.speed * speedMult[difficulty]
        }]);
      }, debrisRate);

      marineRef.current = setInterval(() => {
        if (Math.random() < 0.7) {
          const type = marineTypes[Math.floor(Math.random() * marineTypes.length)];
          setMarineLife(m => [...m, {
            id: Date.now() + Math.random(),
            type: type.type,
            emoji: type.emoji,
            points: type.points,
            x: Math.random() * (width - 60),
            y: -80,
            speed: type.speed * speedMult[difficulty] * 0.9
          }]);
        }
      }, marineRate);
    }
    return () => {
      if (debrisRef.current) clearInterval(debrisRef.current);
      if (marineRef.current) clearInterval(marineRef.current);
    };
  }, [gameActive, difficulty]);

  useEffect(() => {
    if (gameActive) {
      const animate = () => {
        setDebris(d => d.map(i => ({ ...i, y: i.y + i.speed * 3 })).filter(i => i.y < height));
        setMarineLife(m => m.map(i => ({ ...i, y: i.y + i.speed * 2.5 })).filter(i => i.y < height));
        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [gameActive]);

  useEffect(() => {
    if (score >= level * 100 && level < 5) {
      setLevel(l => l + 1);
      setTimeLeft(t => t + 15);
      playSound(completeSound.current);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(`Level ${level} Complete!`, `Level ${level + 1}! +15 seconds.`);
    }
  }, [score, level]);

  const loadSounds = async () => {
    try {
      const { sound: bg } = await Audio.Sound.createAsync(
        require('../../../assets/ocean_quiz_music.mp3'),
        { isLooping: true, volume: 0.3 }
      );
      bgSound.current = bg;

      const { sound: collect } = await Audio.Sound.createAsync(
        require('../../../assets/collect_item.mp3'),
        { volume: 0.7 }
      );
      collectSound.current = collect;

      const { sound: error } = await Audio.Sound.createAsync(
        require('../../../assets/error_sound.mp3'),
        { volume: 0.7 }
      );
      errorSound.current = error;

      const { sound: complete } = await Audio.Sound.createAsync(
        require('../../../assets/quiz_complete_sound.mp3'),
        { volume: 1.0 }
      );
      completeSound.current = complete;
    } catch (error) {
      console.error('Sound loading error:', error);
    }
  };

  const cleanup = () => {
    setGameActive(false);
    [timerRef, debrisRef, marineRef].forEach(ref => {
      if (ref.current) clearInterval(ref.current);
    });
    if (animRef.current) cancelAnimationFrame(animRef.current);
    [bgSound, collectSound, errorSound, completeSound].forEach(async (ref) => {
      if (ref.current) {
        try {
          await ref.current.stopAsync();
          await ref.current.unloadAsync();
        } catch (e) {}
      }
    });
  };

  const playSound = async (sound: Audio.Sound | null) => {
    if (sound && !isMuted) {
      try {
        await sound.replayAsync();
      } catch (e) {}
    }
  };

  const toggleSound = async () => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    if (bgSound.current) await bgSound.current.setVolumeAsync(newMute ? 0 : 0.3);
  };

  const startGame = () => {
    setDebris([]);
    setMarineLife([]);
    setScore(0);
    setLevel(1);
    setTimeLeft({ easy: 60, medium: 50, hard: 40 }[difficulty]);
    setGameActive(true);
    setGameOver(false);
    setTutorial(false);
    if (bgSound.current && !isMuted) bgSound.current.playAsync();
  };

  const endGame = () => {
    setGameActive(false);
    setGameOver(true);
    cleanup();
    playSound(completeSound.current);
  };

  const handlePress = (item: GameItem, isDebris: boolean) => {
    if (!gameActive) return;
    
    if (isDebris) {
      setDebris(d => d.filter(i => i.id !== item.id));
      setScore(s => s + item.points);
      Animated.sequence([
        Animated.timing(scoreAnimation, { toValue: 1.2, duration: 100, useNativeDriver: true }),
        Animated.timing(scoreAnimation, { toValue: 1, duration: 100, useNativeDriver: true })
      ]).start();
      playSound(collectSound.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      setMarineLife(m => m.filter(i => i.id !== item.id));
      setScore(s => Math.max(0, s - item.points));
      playSound(errorSound.current);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Oops!', `That's a ${item.type}! -${item.points} points.`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="water" size={30} color="white" />
        <Text style={styles.headerTitle}>BlueGuard</Text>
        <TouchableOpacity onPress={toggleSound}>
          <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>SCORE</Text>
          <Animated.Text style={[styles.statusValue, { transform: [{ scale: scoreAnimation }] }]}>
            {score}
          </Animated.Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>LEVEL</Text>
          <Text style={styles.statusValue}>{level}/5</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>TIME</Text>
          <Text style={[styles.statusValue, timeLeft <= 10 && styles.warningText]}>
            {timeLeft}s
          </Text>
        </View>
      </View>

      <View style={styles.gameArea}>
        <Animated.View style={[styles.waterBg, {
          top: waterAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -20]
          })
        }]} />

        {debris.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.item, { left: item.x, top: item.y }]}
            onPress={() => handlePress(item, true)}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
          </TouchableOpacity>
        ))}

        {marineLife.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.item, { left: item.x, top: item.y }]}
            onPress={() => handlePress(item, false)}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
          </TouchableOpacity>
        ))}

        {!gameActive && !gameOver && (
          <View style={styles.overlay}>
            <Text style={styles.logo}>🌊 Ocean Cleanup 🌊</Text>
            <Text style={styles.desc}>Remove plastic debris while protecting marine life!</Text>
            
            <View style={styles.diffSelector}>
              <Text style={styles.diffTitle}>Select Difficulty:</Text>
              <View style={styles.diffButtons}>
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.diffBtn, difficulty === d && styles.diffBtnActive]}
                    onPress={() => setDifficulty(d)}
                  >
                    <Text style={[styles.diffText, difficulty === d && styles.diffTextActive]}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={startGame}>
              <Text style={styles.startBtnText}>Start Cleaning!</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setTutorial(true)}>
              <Text style={styles.tutorialLink}>How to Play</Text>
            </TouchableOpacity>
          </View>
        )}

        {showFact && (
          <View style={styles.factPopup}>
            <Text style={styles.factTitle}>Ocean Fact:</Text>
            <Text style={styles.factText}>{facts[factIndex]}</Text>
          </View>
        )}
      </View>

      {gameActive && (
        <View style={styles.progress}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { 
              width: `${Math.min(100, (score / (level * 100)) * 100)}%` 
            }]} />
          </View>
          <Text style={styles.progressText}>Next: {score}/{level * 100}</Text>
        </View>
      )}

      <View style={styles.footer}>
        {[
          { name: 'Home', icon: 'home', screen: 'Dash' },
          { name: 'Quiz', icon: 'help-circle', screen: 'OceanQuizGame' },
          { name: 'Reports', icon: 'document-text', screen: 'Reports' },
          { name: 'Rewards', icon: 'trophy', screen: 'Rewards' }
        ].map((item, i) => (
          <TouchableOpacity key={i} style={styles.navBtn} onPress={() => {
            cleanup();
            navigation.navigate(item.screen);
          }}>
            <Ionicons name={item.icon as any} size={24} color="white" />
            <Text style={styles.navText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal transparent visible={tutorial} animationType="fade" onRequestClose={() => setTutorial(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>How to Play</Text>
            <Text style={styles.modalText}>
              Tap debris to clean the ocean. Avoid marine life or lose points!
            </Text>
            <View style={styles.examples}>
              <View style={styles.exampleItem}>
                <Text style={styles.exampleEmoji}>🍾</Text>
                <Text style={styles.exampleText}>Tap! ✅</Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={styles.exampleEmoji}>🐟</Text>
                <Text style={styles.exampleText}>Avoid! ❌</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setTutorial(false)}>
              <Text style={styles.modalBtnText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={gameOver} animationType="fade" onRequestClose={() => setGameOver(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Game Over!</Text>
            <View style={styles.scoreCircle}>
              <Text style={styles.finalScore}>{score}</Text>
              <Text style={styles.pointsLabel}>points</Text>
            </View>
            <Text style={styles.levelText}>Level: {level}</Text>
            <Text style={styles.message}>
              {score < 100 ? "Keep practicing!" : score < 300 ? "Good job!" : "Amazing work!"}
            </Text>
            <View style={styles.gameOverBtns}>
              <TouchableOpacity style={[styles.gameBtn, styles.retryBtn]} onPress={() => {
                setGameOver(false);
                startGame();
              }}>
                <Text style={styles.gameBtnText}>Play Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.gameBtn, styles.homeBtn]} onPress={() => {
                setGameOver(false);
                cleanup();
                navigation.navigate('Dash');
              }}>
                <Text style={styles.gameBtnText}>Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A5EB0' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#000957', justifyContent: 'space-between' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', flex: 1, textAlign: 'center' },
  statusBar: { flexDirection: 'row', backgroundColor: 'rgba(0,9,87,0.8)', padding: 10, justifyContent: 'space-between' },
  statusItem: { alignItems: 'center', flex: 1 },
  statusLabel: { color: '#009990', fontWeight: 'bold', fontSize: 12 },
  statusValue: { color: '#FFF', fontWeight: 'bold', fontSize: 22 },
  warningText: { color: '#FF3B30' },
  gameArea: { flex: 1, position: 'relative', overflow: 'hidden' },
  waterBg: { position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 1.2, backgroundColor: '#0A5EB0' },
  item: { position: 'absolute', width: 60, height: 60, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 50 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,9,87,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  logo: { fontSize: 26, fontWeight: 'bold', color: '#FFD700', textAlign: 'center', marginBottom: 15 },
  desc: { fontSize: 14, color: '#FFF', textAlign: 'center', marginBottom: 25 },
  diffSelector: { width: '100%', marginBottom: 25 },
  diffTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginBottom: 10 },
  diffButtons: { flexDirection: 'row', justifyContent: 'space-around' },
  diffBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, minWidth: 70 },
  diffBtnActive: { backgroundColor: '#009990' },
  diffText: { color: '#FFF', fontWeight: '500', textAlign: 'center' },
  diffTextActive: { fontWeight: 'bold' },
  startBtn: { backgroundColor: '#FF9F00', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25, marginBottom: 15 },
  startBtnText: { color: '#000957', fontSize: 16, fontWeight: 'bold' },
  tutorialLink: { color: '#87CEFA', fontSize: 14, textDecorationLine: 'underline' },
  progress: { padding: 10, backgroundColor: 'rgba(0,9,87,0.8)' },
  progressBar: { height: 10, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#5FC65B' },
  progressText: { color: '#FFF', textAlign: 'center', marginTop: 5, fontSize: 11 },
  factPopup: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 15 },
  factTitle: { fontSize: 14, fontWeight: 'bold', color: '#023E8A', marginBottom: 5 },
  factText: { fontSize: 12, color: '#333' },
  footer: { flexDirection: 'row', backgroundColor: '#000957', padding: 10, justifyContent: 'space-between' },
  navBtn: { alignItems: 'center', flex: 1 },
  navText: { color: '#FFF', fontSize: 9, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#0A5EB0', padding: 20, borderRadius: 15, width: '90%', maxWidth: 400, alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFD700', marginBottom: 15, textAlign: 'center' },
  modalText: { fontSize: 14, color: '#FFF', textAlign: 'center', marginBottom: 20 },
  examples: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20 },
  exampleItem: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 10, width: '45%' },
  exampleEmoji: { fontSize: 50, marginBottom: 10 },
  exampleText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  modalBtn: { backgroundColor: '#FF9F00', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 20 },
  modalBtnText: { color: '#000957', fontSize: 14, fontWeight: 'bold' },
  scoreCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#00699C', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 3, borderColor: '#87CEFA' },
  finalScore: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
  pointsLabel: { fontSize: 12, color: '#BFE9FF' },
  levelText: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginBottom: 10 },
  message: { fontSize: 14, color: '#FFF', textAlign: 'center', marginBottom: 20 },
  gameOverBtns: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  gameBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, minWidth: 110, alignItems: 'center' },
  retryBtn: { backgroundColor: '#5FC65B', marginRight: 10 },
  homeBtn: { backgroundColor: '#FF9F00', marginLeft: 10 },
  gameBtnText: { color: '#000957', fontSize: 14, fontWeight: 'bold' }
});

export default OceanCleanupGame;