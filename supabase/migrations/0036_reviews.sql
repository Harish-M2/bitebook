-- Migration: Add reviews and ratings system for Phase 4

-- Table to store restaurant reviews and ratings
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

-- Table to store review photos
CREATE TABLE IF NOT EXISTS review_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant 
  ON reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user 
  ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created 
  ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_photos_review 
  ON review_photos(review_id);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Users can view all reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for review photos
CREATE POLICY "Users can view all review photos" ON review_photos
  FOR SELECT USING (true);

CREATE POLICY "Users can create review photos" ON review_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_photos.review_id
      AND reviews.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete review photos" ON review_photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_photos.review_id
      AND reviews.user_id = auth.uid()
    )
  );

-- Function to update restaurant average rating
CREATE OR REPLACE FUNCTION update_restaurant_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE restaurants
  SET updated_at = NOW()
  WHERE id = NEW.restaurant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update restaurant on review changes
CREATE TRIGGER trigger_update_restaurant_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_restaurant_avg_rating();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON reviews TO authenticated;
GRANT SELECT, INSERT, DELETE ON review_photos TO authenticated;
