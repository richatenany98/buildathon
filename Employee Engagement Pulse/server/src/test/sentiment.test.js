// Test cases for sentiment analysis functionality
// These tests demonstrate the core functionality as specified in the PRD

import { analyzeTextSentiment, analyzeEmojiSentiment, getMessageSentiment, extractThemes } from '../services/sentimentService.js';

// Test case 1: Analyze text "Great job!" → positive score returned
console.log('Test 1: Positive text sentiment');
const positiveResult = analyzeTextSentiment("Great job!");
console.log('Input: "Great job!"');
console.log('Output:', positiveResult);
console.log('Expected: Positive score');
console.log('Actual score:', positiveResult.score, positiveResult.comparative);
console.log('Pass:', positiveResult.score > 0, '\n');

// Test case 2: Analyze text "This is terrible" → negative score returned
console.log('Test 2: Negative text sentiment');
const negativeResult = analyzeTextSentiment("This is terrible");
console.log('Input: "This is terrible"');
console.log('Output:', negativeResult);
console.log('Expected: Negative score');
console.log('Actual score:', negativeResult.score, negativeResult.comparative);
console.log('Pass:', negativeResult.score < 0, '\n');

// Test case 3: Message with only 😡 → negative sentiment assigned
console.log('Test 3: Emoji sentiment analysis');
const angryEmoji = analyzeEmojiSentiment([{ emoji: '😡', count: 1 }]);
console.log('Input: [{ emoji: "😡", count: 1 }]');
console.log('Expected: Negative score');
console.log('Actual score:', angryEmoji);
console.log('Pass:', angryEmoji < 0, '\n');

// Test case 4: Combined message sentiment
console.log('Test 4: Combined message sentiment');
const combinedResult = getMessageSentiment("Great work team!", [{ emoji: '👍', count: 3 }]);
console.log('Input: "Great work team!" with 👍 reactions');
console.log('Output:', combinedResult);
console.log('Expected: Positive combined score');
console.log('Actual combined score:', combinedResult.combinedScore);
console.log('Pass:', combinedResult.combinedScore > 0, '\n');

// Test case 5: Theme extraction
console.log('Test 5: Theme extraction');
const messages = [
  "We have too much work and tight deadlines",
  "The workload is overwhelming this week",
  "Great job on the project, excellent collaboration",
  "Frustrated with the bugs in the system",
  "Deadline pressure is really high"
];
const themes = extractThemes(messages);
console.log('Input messages about workload, deadlines, collaboration, frustration');
console.log('Extracted themes:', themes);
console.log('Expected: workload, deadlines, frustration themes');
console.log('Pass:', themes.includes('workload') || themes.includes('deadlines') || themes.includes('frustration'), '\n');

// Test case 6: Neutral sentiment
console.log('Test 6: Neutral text sentiment');
const neutralResult = analyzeTextSentiment("The meeting is at 2pm");
console.log('Input: "The meeting is at 2pm"');
console.log('Output:', neutralResult);
console.log('Expected: Neutral/low score');
console.log('Actual score:', neutralResult.score, neutralResult.comparative);
console.log('Pass:', Math.abs(neutralResult.score) <= 1, '\n');

// Test case 7: Multiple emoji reactions
console.log('Test 7: Multiple emoji sentiment');
const mixedEmojis = analyzeEmojiSentiment([
  { emoji: '😍', count: 2 },
  { emoji: '👍', count: 1 },
  { emoji: '😢', count: 1 }
]);
console.log('Input: 😍 x2, 👍 x1, 😢 x1');
console.log('Expected: Slightly positive (more positive emojis)');
console.log('Actual score:', mixedEmojis);
console.log('Pass:', mixedEmojis > 0, '\n');

// Test case 8: Empty/null inputs
console.log('Test 8: Edge cases - empty inputs');
const emptyTextResult = analyzeTextSentiment("");
const emptyEmojiResult = analyzeEmojiSentiment([]);
const emptyMessageResult = getMessageSentiment("", []);
console.log('Empty text result:', emptyTextResult.score);
console.log('Empty emoji result:', emptyEmojiResult);
console.log('Empty message result:', emptyMessageResult.combinedScore);
console.log('Pass:', emptyTextResult.score === 0 && emptyEmojiResult === 0 && emptyMessageResult.combinedScore === 0, '\n');

console.log('=== Sentiment Analysis Tests Complete ===');
console.log('These tests validate the core sentiment analysis functionality');
console.log('as specified in the PRD unit test cases.');

