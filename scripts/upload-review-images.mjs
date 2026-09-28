#!/usr/bin/env node
/**
 * Upload food images to Bitebook reviews
 * Run with: node scripts/upload-review-images.mjs
 */

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = 'bd698dd9-015c-4275-a3c1-a981f2cac822'; // Your user ID

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Food images from Unsplash
const reviewImages = [
  {
    dish: 'Oysters Rockefeller',
    imageUrl: 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=800&h=800&fit=crop',
  },
  {
    dish: 'Roasted Chicken',
    imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&h=800&fit=crop',
  },
  {
    dish: 'Smoked Beet',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=800&fit=crop',
  },
];

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      })
      .on('error', reject);
  });
}

async function uploadReviewImages() {
  console.log('🖼️  Uploading food images to reviews...\n');

  try {
    for (const { dish, imageUrl } of reviewImages) {
      console.log(`📸 Processing: ${dish}`);

      // Get the review for this dish
      const { data: review } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', userId)
        .eq('review_text', '')
        .order('created_at', { ascending: false })
        .limit(1);

      // Actually, let's get it by joining with dishes
      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, dish:dishes(name)')
        .eq('user_id', userId);

      const targetReview = reviews?.find((r) => r.dish?.name === dish);
      if (!targetReview) {
        console.log(`  ⚠️  Review not found for ${dish}\n`);
        continue;
      }

      const reviewId = targetReview.id;
      console.log(`  Found review: ${reviewId}`);

      // Download image
      console.log(`  📥 Downloading image...`);
      const imageBuffer = await downloadImage(imageUrl);

      // Upload to storage
      const fileName = `${uuidv4()}.jpg`;
      const storagePath = `${userId}/${reviewId}/${fileName}`;

      console.log(`  📤 Uploading to storage: ${storagePath}`);
      const { error: uploadError } = await supabase.storage
        .from('review-photos')
        .upload(storagePath, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error(`  ❌ Upload failed: ${uploadError.message}`);
        continue;
      }

      // Add to review_photos table
      const { error: dbError } = await supabase.from('review_photos').insert({
        review_id: reviewId,
        storage_path: storagePath,
        position: 0,
      });

      if (dbError) {
        console.error(`  ❌ Database insert failed: ${dbError.message}`);
      } else {
        console.log(`  ✅ Image uploaded and linked!\n`);
      }
    }

    console.log('✅ All images uploaded successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

uploadReviewImages();
