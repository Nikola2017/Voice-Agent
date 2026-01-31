'use client';

// Local sentiment analysis without API
// Uses a keyword-based approach for German, English, and Bulgarian

const SENTIMENT_WORDS = {
  positive: {
    de: ['gut', 'super', 'toll', 'wunderbar', 'fantastisch', 'ausgezeichnet', 'perfekt', 'freue', 'glücklich', 'zufrieden', 'erfolgreich', 'positiv', 'genial', 'großartig', 'beste', 'liebe', 'danke', 'schön', 'hervorragend', 'prima', 'klasse', 'spitze', 'begeistert', 'motiviert', 'optimistisch', 'froh', 'erfreut', 'beeindruckt'],
    en: ['good', 'great', 'excellent', 'wonderful', 'fantastic', 'amazing', 'perfect', 'happy', 'pleased', 'successful', 'positive', 'brilliant', 'awesome', 'best', 'love', 'thanks', 'beautiful', 'outstanding', 'incredible', 'superb', 'excited', 'motivated', 'optimistic', 'glad', 'delighted', 'impressed'],
    bg: ['добре', 'страхотно', 'отлично', 'прекрасно', 'фантастично', 'перфектно', 'щастлив', 'доволен', 'успешен', 'положителен', 'гениален', 'най-добър', 'обичам', 'благодаря', 'красив', 'впечатлен', 'мотивиран', 'оптимистичен']
  },
  negative: {
    de: ['schlecht', 'schrecklich', 'furchtbar', 'problematisch', 'fehler', 'falsch', 'traurig', 'enttäuscht', 'frustriert', 'ärgerlich', 'negativ', 'schwierig', 'kompliziert', 'unmöglich', 'stress', 'angst', 'sorge', 'kritisch', 'mangelhaft', 'unzufrieden', 'wütend', 'verärgert', 'besorgt', 'nervös'],
    en: ['bad', 'terrible', 'awful', 'problematic', 'error', 'wrong', 'sad', 'disappointed', 'frustrated', 'angry', 'negative', 'difficult', 'complicated', 'impossible', 'stress', 'fear', 'worry', 'critical', 'poor', 'dissatisfied', 'upset', 'anxious', 'nervous', 'annoyed', 'hate', 'fail', 'failed', 'failure'],
    bg: ['лошо', 'ужасно', 'проблематично', 'грешка', 'грешен', 'тъжен', 'разочарован', 'фрустриран', 'ядосан', 'негативен', 'труден', 'сложен', 'невъзможен', 'стрес', 'страх', 'загриженост', 'критичен', 'недоволен']
  }
};

const INTENSITY_MODIFIERS = {
  de: { strong: ['sehr', 'extrem', 'total', 'absolut', 'unglaublich', 'wirklich', 'echt'], weak: ['etwas', 'bisschen', 'leicht', 'vielleicht'] },
  en: { strong: ['very', 'extremely', 'totally', 'absolutely', 'incredibly', 'really', 'truly'], weak: ['somewhat', 'slightly', 'a bit', 'maybe', 'perhaps'] },
  bg: { strong: ['много', 'изключително', 'напълно', 'абсолютно', 'невероятно', 'наистина'], weak: ['малко', 'леко', 'може би'] }
};

export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0-100
  score: number; // -1 to 1
  details: {
    positiveWords: string[];
    negativeWords: string[];
    positiveCount: number;
    negativeCount: number;
  };
}

export function analyzeSentiment(text: string, language: 'de' | 'en' | 'bg' = 'de'): SentimentResult {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);

  const positiveWords: string[] = [];
  const negativeWords: string[] = [];

  // Find positive and negative words
  SENTIMENT_WORDS.positive[language].forEach(word => {
    if (lowerText.includes(word)) {
      positiveWords.push(word);
    }
  });

  SENTIMENT_WORDS.negative[language].forEach(word => {
    if (lowerText.includes(word)) {
      negativeWords.push(word);
    }
  });

  // Check for intensity modifiers
  let positiveScore = positiveWords.length;
  let negativeScore = negativeWords.length;

  const modifiers = INTENSITY_MODIFIERS[language];

  // Strong modifiers increase the score
  modifiers.strong.forEach(mod => {
    if (lowerText.includes(mod)) {
      if (positiveScore > 0) positiveScore *= 1.5;
      if (negativeScore > 0) negativeScore *= 1.5;
    }
  });

  // Weak modifiers decrease the score
  modifiers.weak.forEach(mod => {
    if (lowerText.includes(mod)) {
      if (positiveScore > 0) positiveScore *= 0.75;
      if (negativeScore > 0) negativeScore *= 0.75;
    }
  });

  // Check for negation (reverses sentiment)
  const negationWords = language === 'de'
    ? ['nicht', 'kein', 'keine', 'niemals', 'nie']
    : language === 'bg'
      ? ['не', 'никога', 'няма']
      : ['not', 'no', 'never', 'none', "don't", "doesn't", "didn't", "won't", "can't"];

  let hasNegation = negationWords.some(neg => lowerText.includes(neg));

  // Calculate final score (-1 to 1)
  const totalScore = positiveScore - negativeScore;
  const maxPossibleScore = Math.max(positiveScore + negativeScore, 1);
  let normalizedScore = totalScore / maxPossibleScore;

  // Apply negation
  if (hasNegation && Math.abs(normalizedScore) > 0.2) {
    normalizedScore *= -0.5; // Partial reversal due to negation
  }

  // Clamp score between -1 and 1
  normalizedScore = Math.max(-1, Math.min(1, normalizedScore));

  // Determine sentiment
  let sentiment: 'positive' | 'neutral' | 'negative';
  if (normalizedScore > 0.15) {
    sentiment = 'positive';
  } else if (normalizedScore < -0.15) {
    sentiment = 'negative';
  } else {
    sentiment = 'neutral';
  }

  // Calculate confidence (0-100)
  const wordDensity = (positiveWords.length + negativeWords.length) / Math.max(words.length, 1);
  const confidence = Math.min(100, Math.round((Math.abs(normalizedScore) * 50) + (wordDensity * 100)));

  return {
    sentiment,
    confidence,
    score: normalizedScore,
    details: {
      positiveWords: [...new Set(positiveWords)],
      negativeWords: [...new Set(negativeWords)],
      positiveCount: positiveWords.length,
      negativeCount: negativeWords.length,
    }
  };
}

// Get emoji for sentiment
export function getSentimentEmoji(sentiment: 'positive' | 'neutral' | 'negative'): string {
  switch (sentiment) {
    case 'positive': return '😊';
    case 'negative': return '😞';
    default: return '😐';
  }
}

// Get color for sentiment
export function getSentimentColor(sentiment: 'positive' | 'neutral' | 'negative'): string {
  switch (sentiment) {
    case 'positive': return 'text-green-400';
    case 'negative': return 'text-red-400';
    default: return 'text-zinc-400';
  }
}

// Get background color for sentiment badge
export function getSentimentBgColor(sentiment: 'positive' | 'neutral' | 'negative'): string {
  switch (sentiment) {
    case 'positive': return 'bg-green-500/20';
    case 'negative': return 'bg-red-500/20';
    default: return 'bg-zinc-500/20';
  }
}
