import { ImageSourcePropType } from 'react-native';

export interface Topic {
  id: string;
  title: string;
  description: string;
  image: ImageSourcePropType;
  tags: string[];
}

export const topics: Topic[] = [
  { 
    id: 'laws-ocean',
    title: 'Laws of the Ocean', 
    description: 'Learn about the various laws and regulations that govern the oceans, including maritime boundaries and conservation laws.', 
    image: require('../../../assets/ocean-law.jpg'),
    tags: ['regulation', 'conservation', 'international']
  },
  { 
    id: 'incident-types',
    title: 'Types of Incidents', 
    description: 'Understand different types of ocean-related incidents, including ship collisions, oil spills, and natural disasters.', 
    image: require('../../../assets/ocean-incident.jpg'),
    tags: ['safety', 'disasters', 'pollution']
  },
  { 
    id: 'overfishing',
    title: 'Overfishing', 
    description: 'Discover the dangers of overfishing and its impact on marine ecosystems and biodiversity.', 
    image: require('../../../assets/overfishing.jpg'),
    tags: ['conservation', 'ecosystem', 'sustainability']
  },
  { 
    id: 'dynamite-fishing',
    title: 'Dynamite Fishing', 
    description: 'Explore the harmful practice of dynamite fishing and its devastating effects on coral reefs and marine life.', 
    image: require('../../../assets/dynamite-fishing.jpg'),
    tags: ['illegal', 'coral', 'conservation']
  },
  { 
    id: 'unique-marine',
    title: 'Unique Marine Life', 
    description: 'Learn about the fascinating and unique creatures that inhabit the oceans, from bioluminescent fish to giant squid.', 
    image: require('../../../assets/marine-life.jpg'),
    tags: ['biodiversity', 'species', 'ecosystem']
  },
  { 
    id: 'coral-reefs',
    title: 'Coral Reefs', 
    description: 'Discover the importance of coral reefs to marine biodiversity and how to protect these vital ecosystems.', 
    image: require('../../../assets/coral-reef.jpg'),
    tags: ['ecosystem', 'biodiversity', 'conservation']
  }
];