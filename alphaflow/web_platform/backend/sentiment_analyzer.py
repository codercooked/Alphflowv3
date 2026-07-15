"""
Sentiment Analyzer for AlphaFlow
=================================
This module provides sentiment analysis for text, such as news headlines.
It uses a pre-trained model to classify text as positive, negative, or neutral.
"""

# Using a simple, lightweight approach for demonstration.
# For a production system, a more sophisticated library like NLTK with VADER,
# or a transformer-based model (e.g., from Hugging Face) would be better.

class SentimentAnalyzer:
    def __init__(self):
        # Simple keyword-based sentiment scoring
        self.positive_words = [
            'up', 'gains', 'rises', 'surges', 'strong', 'profit', 'beat', 'upgrade',
            'optimistic', 'record', 'high', 'launches', 'expansion', 'growth'
        ]
        self.negative_words = [
            'down', 'falls', 'drops', 'plunges', 'weak', 'loss', 'miss', 'downgrade',
            'pessimistic', 'low', 'halts', 'slump', 'decline', 'fears', 'concerns'
        ]

    def analyze(self, text):
        """
        Analyzes the sentiment of a given text.
        
        :param text: The input string (e.g., a news headline).
        :return: A dictionary with sentiment score and classification.
        """
        text = text.lower()
        score = 0
        
        for word in self.positive_words:
            if word in text:
                score += 1
        
        for word in self.negative_words:
            if word in text:
                score -= 1
                
        # Classify sentiment
        if score > 0:
            sentiment = 'Positive'
        elif score < 0:
            sentiment = 'Negative'
        else:
            sentiment = 'Neutral'
            
        # Normalize score to be between -1 and 1 (simplistic)
        normalized_score = score / max(1, len(text.split()))
        normalized_score = max(-1, min(1, normalized_score))

        return {
            'sentiment': sentiment,
            'score': normalized_score
        }

if __name__ == '__main__':
    analyzer = SentimentAnalyzer()
    
    headlines = [
        "TCS reports record profits, stock surges 5%",
        "Auto sector slumps on fears of rising interest rates",
        "Reliance launches new green energy initiative",
        "Market remains flat ahead of central bank meeting"
    ]
    
    for headline in headlines:
        result = analyzer.analyze(headline)
        print(f"Headline: '{headline}'")
        print(f"  -> Sentiment: {result['sentiment']}, Score: {result['score']:.2f}\n")
