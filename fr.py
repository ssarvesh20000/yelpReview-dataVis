import os
import json
from serpapi import GoogleSearch
from pymongo import MongoClient

# SerpAPI key and MongoDB connection string
SERP_API_KEY = 'de65dd2835925cf6b83f0c60fa0e65c92d7d4621b1ae1a39df5e14a0608d69fa'
MONGODB_URI = 'mongodb+srv://ssarvesh20000:<db_password>@cluster0.rbw81.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

# Connect to MongoDB
client = MongoClient(MONGODB_URI)
db = client['reviewsDB']
collection = db['yelpReviews']

def fetch_yelp_reviews(query, location):
    # Yelp search parameters
    params = {
        'api_key': SERP_API_KEY,
        'engine': 'yelp',
        'find_desc': query,
        'find_loc': location,
        'start': 0
    }

    search = GoogleSearch(params)
    results = search.get_dict()

    # Extract place titles and place IDs from results
    organic_results_data = [
        (result['title'], result['place_ids'][0])
        for result in results.get('organic_results', [])
    ]

    yelp_reviews = []

    for title, place_id in organic_results_data:
        reviews_params = {
            'api_key': SERP_API_KEY,
            'engine': 'yelp_reviews',
            'place_id': place_id,
            'start': 0
        }

        reviews_search = GoogleSearch(reviews_params)
        reviews = []

        # Fetch reviews with pagination
        while True:
            new_reviews_page_results = reviews_search.get_dict()

            if 'error' in new_reviews_page_results:
                break

            reviews.extend(new_reviews_page_results.get('reviews', []))
            reviews_params['start'] += 10  # Pagination step

        yelp_reviews.append({
            'title': title,
            'place_id': place_id,
            'reviews': reviews
        })

        # Store reviews in MongoDB
        for review in reviews:
            review_document = {
                'business_name': title,
                'review_text': review.get('text', ''),
                'rating': review.get('rating', None),
                'user_name': review.get('user', {}).get('name', 'Anonymous'),
                'date': review.get('time_created', ''),
                'place_id': place_id
            }
            # Insert review into MongoDB
            collection.insert_one(review_document)

    print(json.dumps(yelp_reviews, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    business_query = "Coffee"
    location = "New York, NY, USA"
    fetch_yelp_reviews(business_query, location)
