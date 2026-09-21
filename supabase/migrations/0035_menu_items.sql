-- Migration: Add menu_items and menu_fetch_log tables for Spoonacular API integration

-- Table to store cached menu items from Spoonacular API
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  external_id TEXT,  -- Spoonacular restaurant ID
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  currency TEXT,
  image_url TEXT,
  nutrition JSONB,  -- Store nutrition info as JSON
  source TEXT DEFAULT 'spoonacular',
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_restaurant FOREIGN KEY (restaurant_id) 
    REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant 
  ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_expires 
  ON menu_items(expires_at);
CREATE INDEX IF NOT EXISTS idx_menu_items_external_id 
  ON menu_items(external_id);

-- Table to track API costs and usage
CREATE TABLE IF NOT EXISTS menu_fetch_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  restaurant_id TEXT NOT NULL,
  restaurant_name TEXT,
  external_restaurant_id TEXT,
  success BOOLEAN DEFAULT TRUE,
  api_used TEXT DEFAULT 'spoonacular',
  cost DECIMAL(10, 4) DEFAULT 0.01,  -- Default Spoonacular cost
  response_size INT,
  error_message TEXT,
  cached BOOLEAN DEFAULT FALSE,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_restaurant_log FOREIGN KEY (restaurant_id) 
    REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_menu_fetch_log_restaurant 
  ON menu_fetch_log(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_fetch_log_fetched_at 
  ON menu_fetch_log(fetched_at);
CREATE INDEX IF NOT EXISTS idx_menu_fetch_log_success 
  ON menu_fetch_log(success);

-- Table to track monthly budget and spending
CREATE TABLE IF NOT EXISTS menu_budget (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  month TEXT NOT NULL,  -- Format: 'YYYY-MM'
  total_requests INT DEFAULT 0,
  total_cost DECIMAL(10, 2) DEFAULT 0,
  cache_hits INT DEFAULT 0,
  cache_misses INT DEFAULT 0,
  average_cache_hit_rate DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(month)
);

-- Index for budget tracking
CREATE INDEX IF NOT EXISTS idx_menu_budget_month 
  ON menu_budget(month);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON menu_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON menu_fetch_log TO authenticated;
GRANT SELECT ON menu_budget TO authenticated;

-- RLS Policies (temporary - can be updated based on your security model)
-- For now, users can see menu items for all restaurants (public data)
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all menu items" ON menu_items
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert menu items" ON menu_items
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

ALTER TABLE menu_fetch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fetch logs" ON menu_fetch_log
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert fetch logs" ON menu_fetch_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Function to calculate monthly budget
CREATE OR REPLACE FUNCTION update_menu_budget()
RETURNS void AS $$
DECLARE
  current_month TEXT;
  total_api_calls INT;
  total_api_cost DECIMAL;
  total_cache_hits INT;
  total_cache_misses INT;
  cache_rate DECIMAL;
BEGIN
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Calculate totals for current month
  SELECT 
    COUNT(*),
    SUM(CASE WHEN success THEN cost ELSE 0 END)::DECIMAL,
    COUNT(*) FILTER (WHERE cached),
    COUNT(*) FILTER (WHERE NOT cached)
  INTO 
    total_api_calls,
    total_api_cost,
    total_cache_hits,
    total_cache_misses
  FROM menu_fetch_log
  WHERE DATE_TRUNC('month', fetched_at) = DATE_TRUNC('month', NOW());
  
  -- Calculate cache hit rate
  IF total_api_calls > 0 THEN
    cache_rate := (total_cache_hits::DECIMAL / total_api_calls::DECIMAL) * 100;
  ELSE
    cache_rate := 0;
  END IF;
  
  -- Insert or update monthly budget
  INSERT INTO menu_budget (month, total_requests, total_cost, cache_hits, cache_misses, average_cache_hit_rate)
  VALUES (current_month, total_api_calls, COALESCE(total_api_cost, 0), total_cache_hits, total_cache_misses, cache_rate)
  ON CONFLICT (month) DO UPDATE SET
    total_requests = total_api_calls,
    total_cost = COALESCE(total_api_cost, 0),
    cache_hits = total_cache_hits,
    cache_misses = total_cache_misses,
    average_cache_hit_rate = cache_rate,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update budget on fetch log changes
CREATE TRIGGER trigger_update_menu_budget
AFTER INSERT ON menu_fetch_log
FOR EACH STATEMENT
EXECUTE FUNCTION update_menu_budget();
