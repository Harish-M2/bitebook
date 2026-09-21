-- Phase 4.3: Saved/Favorites
-- Track restaurants that users have saved for later

CREATE TABLE saved_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

-- Indexes for performance
CREATE INDEX idx_saved_restaurants_user ON saved_restaurants(user_id);
CREATE INDEX idx_saved_restaurants_restaurant ON saved_restaurants(restaurant_id);
CREATE INDEX idx_saved_restaurants_created ON saved_restaurants(created_at DESC);

-- Row-Level Security (RLS)
ALTER TABLE saved_restaurants ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view all saved restaurants
CREATE POLICY "Users can view all saved restaurants" ON saved_restaurants
  FOR SELECT USING (true);

-- Policy: Users can only save restaurants for themselves
CREATE POLICY "Users can save restaurants" ON saved_restaurants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only unsave their own saves
CREATE POLICY "Users can unsave restaurants" ON saved_restaurants
  FOR DELETE USING (auth.uid() = user_id);
