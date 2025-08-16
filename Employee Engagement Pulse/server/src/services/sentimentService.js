import Sentiment from 'sentiment';

const sentiment = new Sentiment();

// Emoji sentiment mapping (basic set)
const emojiScores = {
  '😀': 2, '😃': 2, '😄': 2, '😁': 2, '😆': 2, '😅': 1, '🤣': 2, '😂': 2,
  '🙂': 1, '😉': 1, '😊': 2, '😇': 2, '🥰': 3, '😍': 3, '🤩': 3, '😘': 2,
  '😗': 1, '☺️': 1, '😚': 1, '😙': 1, '🥲': 0, '😋': 1, '😛': 1, '😜': 1,
  '🤪': 1, '😝': 1, '🤑': 1, '🤗': 2, '🤭': 0, '🤫': 0, '🤔': 0, '🤐': 0,
  '🤨': -1, '😐': 0, '😑': -1, '😶': 0, '😏': 0, '😒': -1, '🙄': -2,
  '😬': -1, '🤥': -1, '😔': -2, '😕': -1, '🙁': -2, '☹️': -2, '😣': -2,
  '😖': -2, '😫': -3, '😩': -3, '🥺': -1, '😢': -3, '😭': -4, '😤': -2,
  '😠': -3, '😡': -4, '🤬': -4, '🤯': -2, '😳': -1, '🥵': -1, '🥶': -1,
  '😱': -3, '😨': -3, '😰': -3, '😥': -2, '😓': -2, '🤗': 2, '🙃': 0,
  '👍': 2, '👎': -2, '👌': 1, '✌️': 1, '🤞': 1, '🤟': 1, '🤘': 1,
  '👏': 2, '🙌': 2, '👐': 1, '🤲': 1, '🤝': 2, '🙏': 1, '✊': 1, '👊': 0,
  '🔥': 2, '💯': 3, '💪': 2, '🎉': 3, '🎊': 2, '❤️': 3, '💖': 3, '💕': 2,
  '💓': 2, '💗': 2, '💝': 2, '💘': 2, '💞': 2, '💟': 2, '☮️': 1, '✝️': 1,
  '☪️': 1, '🕉️': 1, '☸️': 1, '✡️': 1, '🔯': 1, '🕎': 1, '☯️': 1, '☦️': 1,
  '💚': 2, '💙': 2, '💜': 2, '🖤': 0, '🤍': 1, '🤎': 0, '💔': -4, '❣️': 2,
  '💋': 1, '💀': -3, '☠️': -4, '💩': -3, '🤡': -1, '👻': -1, '👽': 0,
  '🤖': 0, '😈': -2, '👿': -3, '💰': 1, '💎': 2, '⚡': 1, '🌟': 2, '✨': 2,
  '💫': 1, '🌈': 2, '☀️': 2, '🌤️': 1, '⛅': 0, '🌦️': -1, '🌧️': -2,
  '⛈️': -2, '🌩️': -2, '❄️': 0, '☃️': 1, '⛄': 1, '🌪️': -3, '🌊': 0
};

/**
 * Analyze text sentiment
 * @param {string} text - The text to analyze
 * @returns {object} - Sentiment analysis result
 */
export const analyzeTextSentiment = (text) => {
  if (!text || typeof text !== 'string') {
    return { score: 0, comparative: 0, tokens: [], words: [], positive: [], negative: [] };
  }

  const result = sentiment.analyze(text);
  return {
    score: result.score,
    comparative: result.comparative,
    tokens: result.tokens,
    words: result.words,
    positive: result.positive,
    negative: result.negative
  };
};

/**
 * Analyze emoji sentiment
 * @param {Array} reactions - Array of reaction objects with emoji and count
 * @returns {number} - Emoji sentiment score
 */
export const analyzeEmojiSentiment = (reactions) => {
  if (!reactions || !Array.isArray(reactions) || reactions.length === 0) {
    return 0;
  }

  let totalScore = 0;
  let totalCount = 0;

  reactions.forEach(reaction => {
    const { emoji, count } = reaction;
    const emojiScore = emojiScores[emoji] || 0;
    totalScore += emojiScore * count;
    totalCount += count;
  });

  return totalCount > 0 ? totalScore / totalCount : 0;
};

/**
 * Get overall sentiment score for a message
 * @param {string} text - The message text
 * @param {Array} reactions - Array of reaction objects
 * @returns {object} - Combined sentiment analysis
 */
export const getMessageSentiment = (text, reactions = []) => {
  const textAnalysis = analyzeTextSentiment(text);
  const emojiScore = analyzeEmojiSentiment(reactions);

  // Weight text sentiment more heavily than emoji sentiment
  const textWeight = 0.7;
  const emojiWeight = 0.3;

  const combinedScore = (textAnalysis.comparative * textWeight) + (emojiScore * emojiWeight);

  return {
    textSentiment: textAnalysis,
    emojiSentiment: emojiScore,
    combinedScore: combinedScore,
    classification: classifySentiment(combinedScore)
  };
};

/**
 * Classify sentiment based on score
 * @param {number} score - The sentiment score
 * @returns {string} - Classification (positive, negative, neutral)
 */
export const classifySentiment = (score) => {
  if (score > 0.1) return 'positive';
  if (score < -0.1) return 'negative';
  return 'neutral';
};

/**
 * Extract themes from text using simple keyword matching
 * @param {Array} messages - Array of message texts
 * @returns {Array} - Array of identified themes
 */
export const extractThemes = (messages) => {
  const themeKeywords = {
    'workload': ['busy', 'overwhelmed', 'too much', 'overworked', 'stress', 'pressure', 'deadline', 'rush'],
    'deadlines': ['deadline', 'due', 'urgent', 'asap', 'rush', 'time', 'late', 'behind'],
    'collaboration': ['team', 'together', 'help', 'support', 'collaborate', 'meeting', 'discuss'],
    'recognition': ['great job', 'well done', 'awesome', 'excellent', 'thanks', 'appreciate', 'kudos'],
    'frustration': ['frustrated', 'annoying', 'stuck', 'blocked', 'problem', 'issue', 'bug', 'broken'],
    'communication': ['unclear', 'confusing', 'understand', 'explain', 'clarify', 'meeting', 'discuss'],
    'progress': ['done', 'finished', 'completed', 'progress', 'milestone', 'achievement', 'success'],
    'planning': ['plan', 'strategy', 'roadmap', 'future', 'next', 'upcoming', 'schedule']
  };

  const themeScores = {};
  const allText = messages.join(' ').toLowerCase();

  Object.entries(themeKeywords).forEach(([theme, keywords]) => {
    let score = 0;
    keywords.forEach(keyword => {
      const matches = (allText.match(new RegExp(keyword, 'g')) || []).length;
      score += matches;
    });
    if (score > 0) {
      themeScores[theme] = score;
    }
  });

  // Return top themes sorted by frequency
  return Object.entries(themeScores)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([theme]) => theme);
};

export default {
  analyzeTextSentiment,
  analyzeEmojiSentiment,
  getMessageSentiment,
  classifySentiment,
  extractThemes
};
