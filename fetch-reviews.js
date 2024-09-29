const axios = require('axios');
const { MongoClient } = require('mongodb');

// SerpAPI key and MongoDB connection string
const SERP_API_KEY = 'de65dd2835925cf6b83f0c60fa0e65c92d7d4621b1ae1a39df5e14a0608d69fa';  // Replace with your actual SerpAPI API key
const MONGODB_URI = 'mongodb+srv://ssarvesh20000:DYL0X8ncmkcW30Na@cluster0.rbw81.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Function to fetch Yelp business place_id using SerpAPI
async function fetchYelpPlaceId(businessName, location) {
  const url = `https://serpapi.com/search.json?engine=yelp&find_desc=${businessName}&find_loc=${location}&api_key=${SERP_API_KEY}`;

  try {
    const response = await axios.get(url);
    
    // Check if we have organic results
    const organicResults = response.data.organic_results || [];
    
    if (organicResults.length === 0) {
      console.log('No businesses found for the given name and location.');
      return null;
    }
    
    // Extract the place_id of the first result
    const business = organicResults[0];
    const placeId = business.place_ids ? business.place_ids[0] : null;

    if (placeId) {
      console.log(`Found place_id for ${business.title}: ${placeId}`);
      return placeId;
    } else {
      console.log('No place_id found for the business.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching Yelp business from SerpAPI:', error);
    return null;
  }
}

async function fetchYelpReviews(placeId) {
  const reviews = [];
  let start = 0;

  try {
    while (true) {
      const url = `https://serpapi.com/search.json?engine=yelp_reviews&place_id=${placeId}&start=${start}&api_key=${SERP_API_KEY}`;
      const response = await axios.get(url);

      // Log the full response to inspect the structure
      console.log('Response from SerpAPI:', JSON.stringify(response.data, null, 2));

      const reviewResults = response.data.reviews || [];
      if (reviewResults.length === 0) {
        break;  // Break if no more reviews
      }

      reviews.push(...reviewResults);
      start += 10;  // Pagination step

      // Break if no more pages available
      if (!response.data.next) {
        break;
      }
    }
  } catch (error) {
    console.error(`Error fetching reviews for place_id ${placeId}:`, error);
  }

  return reviews;
}

// Function to store reviews in MongoDB
async function storeReviewsInMongoDB(reviews, businessName, location) {
  const client = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const database = client.db('reviewsDB');
    const collection = database.collection('yelpReviews');

    // Insert each review into MongoDB
    for (const review of reviews) {
      // Log the structure of each review before insertion
      console.log('Review to be inserted:', JSON.stringify(review, null, 2));

      const reviewDocument = {
        business_name: businessName,
        review_text: review.comment.text || review.snippet || 'No review text available',  // Adjust based on the actual field name
        rating: review.rating || 'No rating available',
        user_name: review.user && review.user.name ? review.user.name : 'Anonymous',
        date: review.date || review.time_created || 'No date available',  // Adjust based on the actual field name
        location: location,
        place_id: review.place_id || 'No place ID available'
      };

      // Log the final document to be inserted into MongoDB
      console.log('Document to be inserted into MongoDB:', JSON.stringify(reviewDocument, null, 2));

      try {
        await collection.insertOne(reviewDocument);
        console.log('Inserted successfully:', JSON.stringify(reviewDocument, null, 2));
      } catch (insertError) {
        console.error('Error inserting document into MongoDB:', insertError);
      }
    }

    console.log(`${reviews.length} reviews inserted into MongoDB.`);
  } catch (error) {
    console.error('Error connecting to MongoDB or inserting reviews:', error);
  } finally {
    await client.close();
  }
}

// Main function to fetch reviews and store them in MongoDB
async function main() {
  const businessName = 'Donhao';  // Name of the business
  const location = 'Danville, CA';  // Location of the business

  // Step 1: Fetch Yelp business place_id
  const placeId = await fetchYelpPlaceId(businessName, location);

  if (!placeId) {
    console.log('Place ID not found. Exiting.');
    return;
  }

  // Step 2: Fetch Yelp reviews for the business
  const reviews = await fetchYelpReviews(placeId);

  if (reviews.length === 0) {
    console.log('No reviews found.');
    return;
  }

  // Step 3: Store the reviews in MongoDB
  await storeReviewsInMongoDB(reviews, businessName, location);

  console.log('Reviews successfully fetched and stored.');
}

main().catch(console.error);
