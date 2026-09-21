-- Migration: Add social features (following and activity)

-- Table to track user connections
CREATE TABLE IF NOT EXISTS following (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Table to track user activity (reviews, follows, etc)
CREATE TABLE IF NOT EXISTS activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  review_id UUID REFERENCES public.reviews(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_following_follower 
  ON following(follower_id);
CREATE INDEX IF NOT EXISTS idx_following_following_id 
  ON following(following_id);
CREATE INDEX IF NOT EXISTS idx_activity_user 
  ON activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created 
  ON activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type 
  ON activity(activity_type);

-- Enable RLS
ALTER TABLE following ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for following
CREATE POLICY "Anyone can view following relationships" ON following
  FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON following
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON following
  FOR DELETE USING (auth.uid() = follower_id);

-- RLS Policies for activity
CREATE POLICY "Anyone can view activity" ON activity
  FOR SELECT USING (true);

CREATE POLICY "Only service_role can create activity" ON activity
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update activity" ON activity
  FOR UPDATE USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON following TO authenticated;
GRANT SELECT ON activity TO authenticated;
