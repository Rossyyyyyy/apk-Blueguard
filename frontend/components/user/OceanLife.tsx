import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  SafeAreaView, 
  TextInput,
  ImageSourcePropType 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// API Base URL
const API_BASE_URL = 'https://apk-blueguard-rosssyyy.onrender.com';

// Type definitions
type RootStackParamList = {
  OceanLife: undefined;
  // Add other routes as needed
};

type OceanLifeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OceanLife'>;

interface OceanLifeProps {
  navigation: OceanLifeNavigationProp;
}

interface OceanCreature {
  id: number;
  name: string;
  scientificName: string;
  categories: string[];
  description: string;
  lifespan: string;
  habitat: string;
  depth: string;
  funFact: string;
  threatLevel: string;
  imageSource: ImageSourcePropType;
}

type Category = 'All' | 'Fish' | 'Mammals' | 'Invertebrates' | 'Deep Sea' | 'Coral Reef' | 'Endangered';

const OceanLife: React.FC<OceanLifeProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  // Categories for filtering
  const categories: Category[] = ['All', 'Fish', 'Mammals', 'Invertebrates', 'Deep Sea', 'Coral Reef', 'Endangered'];

  // List of ocean creatures and phenomena with details
  const oceanCreatures: OceanCreature[] = [
    {
      id: 1,
      name: "Blue Whale",
      scientificName: "Balaenoptera musculus",
      categories: ["Mammals", "Endangered"],
      description: "The largest animal ever known to have existed, the blue whale can grow up to 100 feet long and weigh up to 200 tons.",
      lifespan: "80-90 years",
      habitat: "All major oceans",
      depth: "Surface to 500m",
      funFact: "A blue whale's heart is the size of a small car and can be heard beating from over 2 miles away.",
      threatLevel: "Endangered",
      imageSource: require('../../assets/bluewhale.jpg')
    },
    {
      id: 2,
      name: "Giant Squid",
      scientificName: "Architeuthis dux",
      categories: ["Invertebrates", "Deep Sea"],
      description: "A deep-ocean dwelling squid that can grow to 43 feet in length. They remain one of the most elusive large animals on Earth.",
      lifespan: "3-5 years",
      habitat: "Deep ocean worldwide",
      depth: "300-1000m",
      funFact: "Giant squids have the largest eyes in the animal kingdom, measuring up to 10 inches in diameter.",
      threatLevel: "Data Deficient",
      imageSource: require('../../assets/Giant.jpg')
    },
    {
      id: 3,
      name: "Blobfish",
      scientificName: "Psychrolutes marcidus",
      categories: ["Fish", "Deep Sea"],
      description: "Known for its peculiar appearance when removed from its natural habitat's pressure, the blobfish looks like a normal fish in deep water.",
      lifespan: "Unknown",
      habitat: "Deep waters off Australia and Tasmania",
      depth: "600-1200m",
      funFact: "The blobfish was voted the world's ugliest animal in 2013 by the Ugly Animal Preservation Society.",
      threatLevel: "Vulnerable",
      imageSource: require('../../assets/Blobfish.jpg')
    },
    {
      id: 5,
      name: "Leafy Sea Dragon",
      scientificName: "Phycodurus eques",
      categories: ["Fish", "Endangered"],
      description: "A marine fish related to seahorses that has leaf-like appendages for camouflage in seaweed and kelp forests.",
      lifespan: "5-7 years",
      habitat: "Southern and western coasts of Australia",
      depth: "4-30m",
      funFact: "Like seahorses, male leafy sea dragons carry and incubate the eggs until they hatch.",
      threatLevel: "Near Threatened",
      imageSource: require('../../assets/Leafy.jpg')
    },
    {
      id: 6,
      name: "Narwhal",
      scientificName: "Monodon monoceros",
      categories: ["Mammals", "Endangered"],
      description: "A medium-sized toothed whale with a large tusk from a protruding canine tooth, often called the 'unicorn of the sea'.",
      lifespan: "30-40 years",
      habitat: "Arctic waters",
      depth: "Surface to 1500m",
      funFact: "The narwhal's tusk is actually a sensory organ with millions of nerve endings.",
      threatLevel: "Near Threatened",
      imageSource: require('../../assets/Narwhal.jpg')
    },
    {
      id: 7,
      name: "Colossal Squid",
      scientificName: "Mesonychoteuthis hamiltoni",
      categories: ["Invertebrates", "Deep Sea"],
      description: "The largest squid by mass, with the largest recorded specimen weighing nearly 500 kg.",
      lifespan: "Unknown",
      habitat: "Antarctic waters",
      depth: "1000-2000m",
      funFact: "They have the largest eyes of any animal, up to 11 inches across, and their beaks are so powerful they can cut through steel cables.",
      threatLevel: "Least Concern",
      imageSource: require('../../assets/Colossal.jpg')
    },
    {
      id: 8,
      name: "Yeti Crab",
      scientificName: "Kiwa hirsuta",
      categories: ["Invertebrates", "Deep Sea"],
      description: "A crustacean covered in silky blonde setae (hair-like bristles), discovered near hydrothermal vents in 2005.",
      lifespan: "Unknown",
      habitat: "Hydrothermal vents in the South Pacific Ocean",
      depth: "Around 2200m",
      funFact: "The 'hair' on yeti crabs contains bacteria which they farm for food by waving their claws over methane and hydrogen sulfide from hydrothermal vents.",
      threatLevel: "Not Evaluated",
      imageSource: require('../../assets/Yeti.jpg')
    },
    {
      id: 9,
      name: "Mola Mola (Ocean Sunfish)",
      scientificName: "Mola mola",
      categories: ["Fish"],
      description: "The heaviest known bony fish in the world, can weigh up to 2,200 pounds. Has a distinctive flattened body and tiny mouth.",
      lifespan: "Up to 10 years",
      habitat: "Temperate and tropical oceans worldwide",
      depth: "Surface to 600m",
      funFact: "Female sunfish can produce up to 300 million eggs at once, more than any other vertebrate.",
      threatLevel: "Vulnerable",
      imageSource: require('../../assets/Mola.jpg')
    },
    {
      id: 10,
      name: "Anglerfish",
      scientificName: "Family Lophiidae",
      categories: ["Fish", "Deep Sea"],
      description: "Deep-sea fish known for the luminescent lure that extends from the female's forehead, used to attract prey.",
      lifespan: "Up to 24 years",
      habitat: "Deep ocean worldwide",
      depth: "200-1000m",
      funFact: "Male anglerfish permanently fuse to females, essentially becoming parasites that provide sperm when needed.",
      threatLevel: "Not Evaluated",
      imageSource: require('../../assets/Anglerfish.jpg')
    },
    {
      id: 11,
      name: "Chambered Nautilus",
      scientificName: "Nautilus pompilius",
      categories: ["Invertebrates", "Endangered"],
      description: "A living fossil that has remained largely unchanged for 450 million years, with a distinctive spiral shell.",
      lifespan: "15-20 years",
      habitat: "Indo-Pacific Ocean",
      depth: "90-300m",
      funFact: "They have up to 90 tentacles, more than any other cephalopod, and use them to catch prey and scavenge for food.",
      threatLevel: "Critically Endangered",
      imageSource: require('../../assets/Chambered.jpg')
    },
    {
      id: 12,
      name: "Frilled Shark",
      scientificName: "Chlamydoselachus anguineus",
      categories: ["Fish", "Deep Sea"],
      description: "A primitive shark species often called a 'living fossil', with a snake-like appearance and 300 trident-shaped teeth.",
      lifespan: "Up to 25 years",
      habitat: "Deep oceans worldwide",
      depth: "50-1500m",
      funFact: "They have been around for 80 million years and have changed very little during that time.",
      threatLevel: "Least Concern",
      imageSource: require('../../assets/Frilled.jpg')
    },
    {
      id: 13,
      name: "Mimic Octopus",
      scientificName: "Thaumoctopus mimicus",
      categories: ["Invertebrates", "Coral Reef"],
      description: "Can impersonate at least 15 different marine species by changing color, shape, and behavior.",
      lifespan: "9-24 months",
      habitat: "Indo-Pacific region",
      depth: "0-30m",
      funFact: "It can mimic toxic flatfish, lionfish, sea snakes, and jellyfish to deter predators.",
      threatLevel: "Not Evaluated",
      imageSource: require('../../assets/Mimic.jpg')
    },
    {
      id: 14,
      name: "Immortal Jellyfish",
      scientificName: "Turritopsis dohrnii",
      categories: ["Invertebrates"],
      description: "Can revert to an earlier stage of its life cycle when threatened, essentially becoming biologically immortal.",
      lifespan: "Potentially immortal",
      habitat: "Worldwide tropical waters",
      depth: "0-300m",
      funFact: "When stressed, it can transform back into a polyp (earlier life stage) and begin its life cycle again.",
      threatLevel: "Not Evaluated",
      imageSource: require('../../assets/Immortal.jpg')
    },
    {
      id: 15,
      name: "Goblin Shark",
      scientificName: "Mitsukurina owstoni",
      categories: ["Fish", "Deep Sea"],
      description: "A rare, deep-sea shark with a distinctive profile due to its elongated, flattened snout and protrusible jaw.",
      lifespan: "Unknown",
      habitat: "Deep ocean worldwide",
      depth: "100-1300m",
      funFact: "Its jaws can snap forward at incredible speeds to catch prey, similar to the creature from the 'Alien' movies.",
      threatLevel: "Least Concern",
      imageSource: require('../../assets/Goblin.jpg')
    },
    {
      id: 16,
      name: "Coelacanth",
      scientificName: "Latimeria chalumnae",
      categories: ["Fish", "Endangered"],
      description: "A prehistoric fish thought extinct until one was discovered in 1938. Has fleshy fins that resemble primitive limbs.",
      lifespan: "Up to 60 years",
      habitat: "Deep waters off Africa and Indonesia",
      depth: "150-700m",
      funFact: "Often called a 'living fossil,' they've remained virtually unchanged for 400 million years.",
      threatLevel: "Critically Endangered",
      imageSource: require('../../assets/Coelacanth.jpg')
    },
    {
      id: 17,
      name: "Vampire Squid",
      scientificName: "Vampyroteuthis infernalis",
      categories: ["Invertebrates", "Deep Sea"],
      description: "Despite its name, neither a vampire nor a squid, but a unique order of cephalopod. Can turn itself inside out for protection.",
      lifespan: "Unknown",
      habitat: "Extreme deep ocean worldwide",
      depth: "600-900m",
      funFact: "Its scientific name means 'vampire squid from hell,' but it's actually a gentle detritivore that consumes marine snow.",
      threatLevel: "Least Concern",
      imageSource: require('../../assets/Vampire.jpg')
    },
    {
      id: 18,
      name: "Christmas Tree Worm",
      scientificName: "Spirobranchus giganteus",
      categories: ["Invertebrates", "Coral Reef"],
      description: "A small, tube-building polychaete worm with two spiral plumes that resemble a Christmas tree.",
      lifespan: "Up to 40 years",
      habitat: "Tropical coral reefs worldwide",
      depth: "0-30m",
      funFact: "They live embedded in coral and can quickly retract their colorful crowns when threatened.",
      threatLevel: "Not Evaluated",
      imageSource: require('../../assets/Christmas.jpg')
    },
    {
      id: 19,
      name: "Vaquita Porpoise",
      scientificName: "Phocoena sinus",
      categories: ["Mammals", "Endangered"],
      description: "The world's most rare marine mammal, with fewer than 10 individuals remaining. It's the smallest cetacean.",
      lifespan: "Up to 21 years",
      habitat: "Northern Gulf of California, Mexico",
      depth: "Surface to 50m",
      funFact: "They have distinctive dark rings around their eyes and mouth, giving them a unique appearance.",
      threatLevel: "Critically Endangered",
      imageSource: require('../../assets/Vaquita.jpg')
    },
    {
      id: 20,
      name: "Flamingo Tongue Snail",
      scientificName: "Cyphoma gibbosum",
      categories: ["Invertebrates", "Coral Reef"],
      description: "A small sea snail with a brightly colored mantle that covers its shell. Feeds exclusively on sea fans and other soft corals.",
      lifespan: "Up to 3 years",
      habitat: "Caribbean Sea and western Atlantic Ocean",
      depth: "0-30m",
      funFact: "Their bright colors warn predators of their toxicity, which they get from the corals they eat.",
      threatLevel: "Least Concern",
      imageSource: require('../../assets/Flamingo.jpg')
    },
    {
      id: 21,
      name: "Axolotl",
      scientificName: "Ambystoma mexicanum",
      categories: ["Fish", "Endangered"],
      description: "A neotenic salamander that retains its juvenile features, including external gills, throughout adulthood.",
      lifespan: "10-15 years",
      habitat: "Lake Xochimilco, Mexico",
      depth: "0-10m",
      funFact: "They can regenerate entire limbs, parts of their brain, and heart tissue.",
      threatLevel: "Critically Endangered",
      imageSource: require('../../assets/Axolotl.jpg')
    },
    {
      id: 22,
      name: "Ghost Shark",
      scientificName: "Chimaera monstrosa",
      categories: ["Fish", "Deep Sea"],
      description: "Also known as chimaeras or ratfish, these ancient fish are actually the closest living relatives of sharks and rays.",
      lifespan: "Up to 30 years",
      habitat: "Deep waters worldwide",
      depth: "200-2000m",
      funFact: "They have a venomous spine in front of their dorsal fin and use electrosensory organs to detect prey.",
      threatLevel: "Near Threatened",
      imageSource: require('../../assets/Ghost.jpg')
    },
    {
      id: 23,
      name: "Dumbo Octopus",
      scientificName: "Grimpoteuthis",
      categories: ["Invertebrates", "Deep Sea"],
      description: "A genus of deep-sea umbrella octopuses with ear-like fins that resemble Disney's elephant character Dumbo.",
      lifespan: "3-5 years",
      habitat: "Deep ocean worldwide",
      depth: "3000-4000m",
      funFact: "They are the deepest-living octopuses known, found at depths of up to 7,000 meters (23,000 feet).",
      threatLevel: "Not Evaluated",
      imageSource: require('../../assets/Dumbo.jpg')
    },
    {
      id: 24,
      name: "Peacock Mantis Shrimp",
      scientificName: "Odontodactylus scyllarus",
      categories: ["Invertebrates", "Coral Reef"],
      description: "Known for its powerful striking claws and complex eyes. Can strike with the force of a .22 caliber bullet.",
      lifespan: "3-6 years",
      habitat: "Indo-Pacific region",
      depth: "0-40m",
      funFact: "They can see polarized light and may have the most complex vision system in the animal kingdom, with 16 types of color receptors (humans have 3).",
      threatLevel: "Least Concern",
      imageSource: require('../../assets/Peacock.jpg')
    },
    {
      id: 25,
      name: "Sea Pig",
      scientificName: "Scotoplanes globosa",
      categories: ["Invertebrates", "Deep Sea"],
      description: "Deep-sea sea cucumbers that use tube feet to walk along the ocean floor. They have pig-like appearances with translucent skin.",
      lifespan: "Unknown",
      habitat: "Abyssal plains worldwide",
      depth: "1000-6000m",
      funFact: "They can sometimes be found in large herds of hundreds of individuals feeding on the seafloor.",
      threatLevel: "Not Evaluated",
      imageSource: require('../../assets/Sea Pig.jpg')
    },
    {
      id: 26,
      name: "Sarcastic Fringehead",
      scientificName: "Neoclinus blanchardi",
      categories: ["Fish"],
      description: "A small but aggressive fish that defends its territory by opening its large colorful mouth to intimidate intruders.",
      lifespan: "Unknown",
      habitat: "Pacific Ocean off California",
      depth: "3-73m",
      funFact: "When two males compete, they press their open mouths against each other (known as 'mouth wrestling') to determine dominance.",
      threatLevel: "Not Evaluated",
      imageSource: require('../../assets/Sarcastic.jpg')
    },
    {
      id: 27,
      name: "Basket Star",
      scientificName: "Order Euryalida",
      categories: ["Invertebrates", "Deep Sea"],
      description: "A type of brittle star with highly branched arms that create a basket-like appearance when extended for feeding.",
      lifespan: "Up to 35 years",
      habitat: "Deep waters worldwide",
      depth: "50-2000m",
      funFact: "They can have up to 5,000 arm branches and use them to catch plankton and small crustaceans.",
      threatLevel: "Not Evaluated",
      imageSource: require('../../assets/Basket.jpg')
    },
    {
      id: 28,
      name: "Sea Bunny",
      scientificName: "Jorunna parva",
      categories: ["Invertebrates", "Coral Reef"],
      description: "A type of sea slug that looks like a tiny white bunny with rabbit-ear-like rhinophores and a fluffy texture.",
      lifespan: "Up to 1 year",
      habitat: "Waters around Japan and the Philippines",
      depth: "0-20m",
      funFact: "Their 'fuzzy' appearance comes from tiny rods called caryophyllidia that cover their body.",
      threatLevel: "Not Evaluated",
      imageSource: require('../../assets/Sea Bunny.jpg')
    },
    {
      id: 29,
      name: "Barreleye Fish",
      scientificName: "Macropinna microstoma",
      categories: ["Fish", "Deep Sea"],
      description: "Has a transparent head filled with fluid and barrel-shaped, tubular eyes that point upward to detect prey's silhouettes.",
      lifespan: "Unknown",
      habitat: "Pacific Ocean depths",
      depth: "600-800m",
      funFact: "Their eyes can rotate within their transparent dome to look forward when needed.",
      threatLevel: "Not Evaluated",
      imageSource: require('../../assets/Barreleye.jpg')
    },
    {
      id: 30,
      name: "Dugong",
      scientificName: "Dugong dugon",
      categories: ["Mammals", "Endangered"],
      description: "A marine mammal related to manatees but with a fluked tail. Believed to have inspired mermaid legends.",
      lifespan: "70+ years",
      habitat: "Indo-Pacific shallow waters",
      depth: "0-10m",
      funFact: "They are the only strictly marine herbivorous mammals and can consume up to 40kg of seagrass daily.",
      threatLevel: "Vulnerable",
      imageSource: require('../../assets/Dugong.jpg')
    },
    {
      id: 31,
      name: "Bobbit Worm",
      scientificName: "Eunice aphroditois",
      categories: ["Invertebrates"],
      description: "A large predatory sea worm that can grow up to 3 meters long. Hides in the ocean floor with only its antennae exposed.",
      lifespan: "Up to 5 years",
      habitat: "Warmer oceans worldwide",
      depth: "10-40m",
      funFact: "They can strike with such speed that they sometimes cut fish in half, and their bite injects a toxin that stuns or kills prey.",
      threatLevel: "Not Evaluated",
      imageSource: require('../../assets/Bobbit.jpg')
    },
    {
      id: 32,
      name: "Flamboyant Cuttlefish",
      scientificName: "Metasepia pfefferi",
      categories: ["Invertebrates", "Coral Reef"],
      description: "Known for its brilliant color displays and unusual walking behavior along the sea floor rather than swimming.",
      lifespan: "18-24 months",
      habitat: "Indo-Pacific region",
      depth: "3-86m",
      funFact: "It's one of three known poisonous cuttlefish species, with toxins similar to those in blue-ringed octopuses.",
      threatLevel: "Near Threatened",
      imageSource: require('../../assets/Flamboyant.jpg')
    }
  ];

  // Filter creatures based on search query and selected category
  const filteredCreatures = oceanCreatures.filter((creature: OceanCreature) => {
    const matchesSearch = creature.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          creature.scientificName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || creature.categories.includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

  const getThreatLevelIcon = (threatLevel: string): keyof typeof Ionicons.glyphMap => {
    if (threatLevel.includes("Endangered") || threatLevel.includes("Vulnerable")) {
      return "warning-outline";
    }
    return "shield-checkmark-outline";
  };

  const getThreatLevelColor = (threatLevel: string): string => {
    if (threatLevel.includes("Critically")) {
      return "#FF3B30";
    }
    if (threatLevel.includes("Endangered") || threatLevel.includes("Vulnerable")) {
      return "#FF9500";
    }
    return "#34C759";
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ocean Life</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#009990" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search marine life..."
          placeholderTextColor="#7A7A7A"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map((category: Category, index: number) => (
          <TouchableOpacity 
            key={index} 
            style={[
              styles.categoryButton, 
              activeCategory === category && styles.categoryButtonActive
            ]}
            onPress={() => setActiveCategory(category)}
          >
            <Text 
              style={[
                styles.categoryText, 
                activeCategory === category && styles.categoryTextActive
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main Content */}
      <ScrollView style={styles.contentContainer}>
        <Text style={styles.sectionTitle}>Fascinating Ocean Life</Text>
        <Text style={styles.sectionDescription}>
          Explore the incredible diversity of marine species that inhabit our oceans, from the surface to the deepest trenches.
        </Text>

        {filteredCreatures.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={50} color="#009990" />
            <Text style={styles.noResultsText}>No marine life matches your search</Text>
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={() => {
                setSearchQuery('');
                setActiveCategory('All');
              }}
            >
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.creatureGrid}>
            {filteredCreatures.map((creature: OceanCreature) => (
              <View key={creature.id} style={styles.creatureCard}>
                <Image 
                  source={creature.imageSource} 
                  style={styles.creatureImage} 
                  resizeMode="cover"
                />
                
                <View style={styles.creatureInfo}>
                  <Text style={styles.creatureName}>{creature.name}</Text>
                  <Text style={styles.scientificName}>{creature.scientificName}</Text>
                  
                  <View style={styles.categoriesContainer}>
                    {creature.categories.map((category: string, index: number) => (
                      <View key={index} style={styles.categoryTag}>
                        <Text style={styles.categoryTagText}>{category}</Text>
                      </View>
                    ))}
                  </View>
                  
                  <Text style={styles.creatureDescription}>{creature.description}</Text>
                  
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Ionicons name="time-outline" size={16} color="#009990" />
                      <Text style={styles.statLabel}>Lifespan: </Text>
                      <Text style={styles.statValue}>{creature.lifespan}</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Ionicons name="location-outline" size={16} color="#009990" />
                      <Text style={styles.statLabel}>Habitat: </Text>
                      <Text style={styles.statValue}>{creature.habitat}</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Ionicons name="water-outline" size={16} color="#009990" />
                      <Text style={styles.statLabel}>Depth: </Text>
                      <Text style={styles.statValue}>{creature.depth}</Text>
                    </View>
                    
                    {creature.threatLevel && (
                      <View style={styles.statItem}>
                        <Ionicons 
                          name={getThreatLevelIcon(creature.threatLevel)} 
                          size={16} 
                          color={getThreatLevelColor(creature.threatLevel)} 
                        />
                        <Text style={styles.statLabel}>Status: </Text>
                        <Text 
                          style={[
                            styles.statValue, 
                            { color: getThreatLevelColor(creature.threatLevel) }
                          ]}
                        >
                          {creature.threatLevel}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.funFactContainer}>
                    <Ionicons name="bulb-outline" size={16} color="#FFD700" />
                    <Text style={styles.funFactLabel}>Fun Fact: </Text>
                    <Text style={styles.funFactText}>{creature.funFact}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        
        {/* Conservation Information */}
        <View style={styles.conservationContainer}>
          <Text style={styles.conservationTitle}>Ocean Conservation</Text>
          <Text style={styles.conservationText}>
            Our oceans cover 71% of the Earth's surface and contain 97% of the planet's water. 
            Marine biodiversity is critical to the health of people and our planet. 
            Many of these incredible species are threatened by human activities including 
            overfishing, pollution, habitat destruction, and climate change.
          </Text>
          <TouchableOpacity style={styles.learnMoreButton}>
            <Text style={styles.learnMoreButtonText}>Learn How You Can Help</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    padding: 15,
    backgroundColor: '#000957',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    margin: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: 'white',
    paddingVertical: 8,
  },
  categoryContainer: {
    maxHeight: 50,
    marginBottom: 10,
  },
  categoryContent: {
    paddingHorizontal: 10,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryButtonActive: {
    backgroundColor: '#009990',
  },
  categoryText: {
    color: 'white',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#000957',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000957',
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  creatureGrid: {
    flex: 1,
  },
  creatureCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  creatureImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E0E0E0',
  },
  creatureInfo: {
    padding: 15,
  },
  creatureName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000957',
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 10,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  categoryTag: {
    backgroundColor: '#E0F7FA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryTagText: {
    color: '#00838F',
    fontSize: 12,
    fontWeight: '600',
  },
  creatureDescription: {
    fontSize: 15,
    color: '#333',
    lineHeight: 21,
    marginBottom: 15,
  },
  statsContainer: {
    marginBottom: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  statValue: {
    fontSize: 14,
    color: '#666',
  },
  funFactContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E0',
    padding: 10,
    borderRadius: 8,
  },
  funFactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  funFactText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  noResultsText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: '#009990',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  conservationContainer: {
    backgroundColor: '#E8F5FF',
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
  },
  conservationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000957',
    marginBottom: 10,
  },
  conservationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 15,
  },
  learnMoreButton: {
    backgroundColor: '#000957',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  learnMoreButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default OceanLife;