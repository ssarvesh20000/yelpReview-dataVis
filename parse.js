const { MongoClient } = require('mongodb');
const fs = require('fs');  // File System module

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://ssarvesh20000:DYL0X8ncmkcW30Na@cluster0.rbw81.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Function to read and parse reviews from MongoDB
async function readReviewsFromMongoDB() {
  const client = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const database = client.db('reviewsDB');
    const collection = database.collection('yelpReviews');

    // Query to fetch all reviews
    const reviewsCursor = collection.find({});

    // Parse the reviews into an array
    const reviews = [];
    await reviewsCursor.forEach(review => {
      // Extract review text and rating
      const parsedReview = {
        business_name: review.business_name,
        review_text: review.review_text || 'No review text available',
        rating: review.rating || 'No rating available',
        user_name: review.user_name || 'Anonymous',
        date: review.date || 'No date available',
        location: review.location || 'No location available',
        place_id: review.place_id || 'No place ID available'
      };

      // Push the parsed review into the array
      reviews.push(parsedReview);
    });

    // Return the reviews as a JSON object (not string)
    return reviews;
  } catch (error) {
    console.error('Error reading from MongoDB:', error);
  } finally {
    await client.close();
  }
}

// Function to save reviews to a JSON file
async function saveReviewsToFile(filePath, data) {
  try {
    // Write the JSON data to the specified file path
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');  // Pretty-printing with 2 spaces
    console.log(`Reviews saved to ${filePath}`);
  } catch (error) {
    console.error(`Error writing to file: ${filePath}`, error);
  }
}

// Main function to read reviews and save them to a file
async function main() {
  const reviews = await readReviewsFromMongoDB();

  if (reviews.length === 0) {
    console.log('No reviews found.');
    return;
  }

  // Define the file path where you want to save the reviews
  const filePath = './yelp_reviews.json';  // This will save the file in the current directory

  // Save the reviews to a JSON file
  await saveReviewsToFile(filePath, reviews);
}

main().catch(console.error);
