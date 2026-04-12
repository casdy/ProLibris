/**
 * ProLibris Local Genre & Language Mapper
 * Heuristics-based categorization for classic literature
 */

export const Genres = [
  'Fiction', 'Mystery', 'History', 'Science', 
  'Poetry', 'Philosophy', 'Adventure', 'Fantasy', 'Foreign'
] as const;

export type Genre = typeof Genres[number];

interface Rule {
  keywords: string[];
  genre: Genre;
}

const RULES: Rule[] = [
  { 
    genre: 'Mystery', 
    keywords: ['sherlock', 'holmes', 'mystery', 'detective', 'secret', 'case', 'clue', 'murder', 'crime', 'hound'] 
  },
  { 
    genre: 'Philosophy', 
    keywords: ['philosophy', 'ethics', 'socrates', 'plato', 'aristotle', 'meditations', 'reason', 'mind', 'wisdom', 'critique', 'treatise'] 
  },
  { 
    genre: 'History', 
    keywords: ['history', 'roman', 'greek', 'war', 'battle', 'chronicle', 'empire', 'ancient', 'king', 'queen', 'revolution', 'century'] 
  },
  { 
    genre: 'Science', 
    keywords: ['science', 'nature', 'biology', 'physics', 'all about', 'study', 'principles', 'theory', 'geology', 'astronomy', 'coffee'] 
  },
  { 
    genre: 'Poetry', 
    keywords: ['poems', 'poetry', 'verses', 'sonnet', 'ballad', 'anthology', 'lyrics'] 
  },
  { 
    genre: 'Adventure', 
    keywords: ['adventures', 'voyage', 'journey', 'explorer', 'travels', 'ship', 'quest', 'island', 'wilderness', 'finn', 'crusoe'] 
  },
  { 
    genre: 'Fantasy', 
    keywords: ['wonder', 'wonderland', 'magic', 'dragon', 'witch', 'fairy', 'fable', 'legend', 'myth', 'enchanted'] 
  },
  { 
    genre: 'Fiction', 
    keywords: ['story', 'novel', 'tale', 'romance', 'pride', 'prejudice', 'lady', 'gentleman'] 
  }
];

// common non-English articles and words for "Foreign" detection (classic lit context)
const FOREIGN_MARKERS = [
  // French
  ' le ', ' la ', ' les ', ' de ', ' du ', ' des ', ' eue ', ' une ', ' et ', ' dans ',
  // Spanish
  ' el ', ' los ', ' las ', ' por ', ' con ', ' del ', ' una ',
  // German
  ' der ', ' die ', ' das ', ' ein ', ' eine ', ' und ', ' von ', ' im ',
  // Latin / Common
  ' fragmenta ', ' historia ', ' opus ', ' mundi '
];

export function mapTitleToGenre(title: string): Genre[] {
  const t = title.toLowerCase();
  const foundGenres = new Set<Genre>();

  // 1. Check for foreign indicators
  const hasForeignMarkers = FOREIGN_MARKERS.some(marker => t.includes(marker));
  const hasNonAscii = /[^\u0000-\u007f]/.test(title);
  
  if (hasForeignMarkers || hasNonAscii) {
    foundGenres.add('Foreign');
  }

  // 2. Keyword Match
  RULES.forEach(rule => {
    if (rule.keywords.some(k => t.includes(k))) {
      foundGenres.add(rule.genre);
    }
  });

  // 3. Fallback to Fiction if no genre but standard English
  if (foundGenres.size === 0) {
    foundGenres.add('Fiction');
  }

  return Array.from(foundGenres);
}
