#!/usr/bin/env ts-node
/**
 * Seed script to add dummy restaurant reviews and images to Bitebook.
 * Run with: npx ts-node scripts/seed-dummy-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as https from 'https';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Dummy review data with real restaurants and dish names
 */
const dummyReviews = [
  {
    restaurant: 'Balthazar',
    dish: 'Oysters Rockefeller',
    rating: 5,
    review: 'Absolutely stunning oysters with a perfect beurre blanc. The presentation was elegant and the flavors were exquisite.',
    imageUrl:
      'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=400&h=400&fit=crop',
  },
  {
    restaurant: 'Chez Panisse',
    dish: 'Roasted Chicken',
    rating: 4,
    review: 'Classic preparation that highlights the quality of the bird. Perfectly seasoned and moist. Simple but elegant.',
    imageUrl:
      'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=400&fit=crop',
  },
  {
    restaurant: 'Noma',
    dish: 'Aged Duck Breast',
    rating: 5,
    review: 'A masterpiece of technique and flavor. The duck was perfectly cooked with an incredible depth of umami.',
    imageUrl:
      'https://images.unsplash.com/photo-1504674900969-f2df05b3252d?w=400&h=400&fit=crop',
  },
  {
    restaurant: 'Eleven Madison Park',
    dish: 'Smoked Beet',
    rating: 4,
    review: 'Creative and thoughtful approach to a simple vegetable. Beautiful plating and surprising flavors.',
    imageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop',
  },
  {
    restaurant: 'Atelier Crenn',
    dish: 'Langoustine with Caviar',
    rating: 5,
    review: 'Delicate and refined. The langoustine was fresh and the caviar added a luxurious touch.',
    imageUrl:
      'https://images.unsplash.com/photo-1606787620802-c038b90addbe?w=400&h=400&fit=crop',
  },
  {
    restaurant: 'Ko',
    dish: 'Uni and Scallop',
    rating: 5,
    review: 'Omakase experience was outstanding. The sushi was incredibly fresh and the chef was knowledgeable.',
    imageUrl:
      'https://images.unsplash.com/photo-1579271185603-11bde3246ba2?w=400&h=400&fit=crop',
  },
  {
    restaurant: 'Per Se',
    dish: 'Pan-Roasted Halibut',
    rating: 4,
    review: 'Perfectly executed seafood dish. The sauce complemented the fish beautifully.',
    imageUrl:
      'https://images.unsplash.com/photo-1580959375944-abd7e991a971?w=400&h=400&fit=crop',
  },
  {
    restaurant: 'The French Laundry',
    dish: 'Oyster and Pearl Onion Velouté',
    rating: 5,
    review: 'Utterly magical. Each bite was a symphony of flavors. One of the best dishes I\'ve ever had.',
    imageUrl:
      'https://images.unsplash.com/photo-1547521868-14cd169ce205?w=400&h=400&fit=crop',
  },
];

async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      })
      .on('error', reject);
  });
}

async function seedDummyData() {
  console.log('🌱 Starting to seed dummy review data...\n');

  try {
    // Get the current authenticated user (or use a test user)
    const { data: authData } = await supabase.auth.admin.listUsers();
    if (!authData.users || authData.users.length === 0) {
      console.error('❌ No users found. Please create a user account first.');
      process.exit(1);
    }

    const userId = authData.users[0].id;
    console.log(`✅ Using user: ${userId}\n`);

    // Get or create a restaurant (we'll just pick an existing one or create a placeholder)
    // For now, let's fetch existing restaurants
    const { data: restaurants } = await supabase.from('restaurants').select('*').limit(1);

    const restaurantRows = restaurants ?? [];
    if (restaurantRows.length === 0) {
      console.error('❌ No restaurants found. Please add restaurants first.');
      console.log('💡 Tip: Log a dish from the app first to create a restaurant.');
      process.exit(1);
    }

    const restaurant = restaurantRows[0];
    if (!restaurant) {
      throw new Error('No restaurant was returned.');
    }

    const restaurantId = restaurant.id;
    console.log(`✅ Using restaurant: ${restaurant.name}\n`);

    // Add reviews
    for (const review of dummyReviews) {
      console.log(`📝 Adding review: ${review.dish} at ${review.restaurant}...`);

      // Create or find dish
      const { data: existingDish } = await supabase
        .from('dishes')
        .select('id')
        .eq('name', review.dish)
        .eq('restaurant_id', restaurantId)
        .single();

      let dishId: string;
      if (existingDish) {
        dishId = existingDish.id;
      } else {
        const { data: newDish, error: dishError } = await supabase
          .from('dishes')
          .insert({
            name: review.dish,
            restaurant_id: restaurantId,
          })
          .select('id')
          .single();

        if (dishError) {
          console.error(`  ❌ Failed to create dish: ${dishError.message}`);
          continue;
        }
        dishId = newDish.id;
      }

      // Create review
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
          dish_id: dishId,
          rating: review.rating,
          review_text: review.review,
          visibility: 'public',
        })
        .select('id')
        .single();

      if (reviewError) {
        console.error(`  ❌ Failed to create review: ${reviewError.message}`);
        continue;
      }

      const reviewId = reviewData.id;
      console.log(`  ✅ Review created: ${reviewId}`);

      // Download and upload image
      try {
        console.log(`  📸 Downloading image...`);
        const imageBuffer = await downloadImage(review.imageUrl);

        const fileExt = 'jpg';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${reviewId}/${fileName}`;

        console.log(`  📤 Uploading to storage: ${filePath}`);
        const { error: uploadError } = await supabase.storage
          .from('review-photos')
          .upload(filePath, imageBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          console.error(`  ❌ Failed to upload image: ${uploadError.message}`);
        } else {
          console.log(`  ✅ Image uploaded successfully\n`);
        }
      } catch (error) {
        console.error(
          `  ⚠️  Failed to download/upload image: ${error instanceof Error ? error.message : String(error)}\n`,
        );
      }
    }

    console.log('✅ Dummy data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedDummyData();
