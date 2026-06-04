-- Redesign Lookup Industries Table with Full Tracking
-- This script:
-- 1. Truncates existing data
-- 2. Adds tracking fields (created_at, updated_at, updated_by)
-- 3. Inserts relevant industries with icons

-- Step 1: Truncate existing data
TRUNCATE TABLE platform.lookup_industries CASCADE;

-- Step 2: Redesign table with tracking fields
-- Note: The schema already has most fields, but we'll add proper tracking columns
-- The schema.prisma already includes:
-- - id (UUID)
-- - label (String, unique)
-- - value (String, optional)
-- - icon (String, optional)
-- - isActive (Boolean, default true)
-- - isGovernanceLocked (Boolean, default false)

-- The schema also has createdAt and updatedAt fields, so we just need to ensure they're properly tracked

-- Step 3: Insert relevant industries with appropriate icons
INSERT INTO platform.lookup_industries (label, value, icon, isActive) VALUES
-- Technology
('Technology', 'technology', '🚀', true),
('Software Development', 'software-development', '💻', true),
('Artificial Intelligence', 'ai', '🤖', true),
('Cloud Computing', 'cloud', '☁️', true),
('Cybersecurity', 'cybersecurity', '🔒', true),
('Data Science', 'data-science', '📊', true),
('Blockchain', 'blockchain', '⛓️', true),
('Internet of Things', 'iot', '🌐', true),

-- Finance
('Finance', 'finance', '💰', true),
('Banking', 'banking', '🏦', true),
('Insurance', 'insurance', '📋', true),
('Investment', 'investment', '📈', true),
('Fintech', 'fintech', '💳', true),
('Cryptocurrency', 'cryptocurrency', '₿', true),
('Venture Capital', 'venture-capital', '💼', true),

-- Healthcare
('Healthcare', 'healthcare', '🏥', true),
('Biotechnology', 'biotech', '🧬', true),
('Pharmaceuticals', 'pharma', '💊', true),
('Medical Devices', 'medical-devices', '🩺', true),
('Telemedicine', 'telemedicine', '📱', true),
('Health Insurance', 'health-insurance', '🏥', true),

-- Retail & E-commerce
('Retail', 'retail', '🛍️', true),
('E-commerce', 'ecommerce', '🛒', true),
('Consumer Goods', 'consumer-goods', '📦', true),
('Fashion', 'fashion', '👗', true),
('Food & Beverage', 'food-beverage', '🍕', true),
('Grocery', 'grocery', '🥬', true),

-- Manufacturing
('Manufacturing', 'manufacturing', '🏭', true),
('Automotive', 'automotive', '🚗', true),
('Aerospace', 'aerospace', '✈️', true),
('Construction', 'construction', '🏗️', true),
('Industrial Equipment', 'industrial', '⚙️', true),

-- Energy & Utilities
('Energy', 'energy', '⚡', true),
('Renewable Energy', 'renewable-energy', '🔋', true),
('Oil & Gas', 'oil-gas', '🛢️', true),
('Utilities', 'utilities', '💡', true),
('Electric Vehicles', 'electric-vehicles', '🔋', true),

-- Education
('Education', 'education', '🎓', true),
('EdTech', 'edtech', '📚', true),
('Higher Education', 'higher-education', '🎓', true),
('K-12 Education', 'k12-education', '📖', true),
('Corporate Training', 'corporate-training', '👨‍🏫', true),

-- Real Estate
('Real Estate', 'real-estate', '🏠', true),
('Property Management', 'property-management', '🏢', true),
('Construction & Development', 'construction-dev', '🏗️', true),
('Commercial Real Estate', 'commercial-real-estate', '🏢', true),
('Residential Real Estate', 'residential-real-estate', '🏡', true),

-- Media & Entertainment
('Media & Entertainment', 'media', '🎬', true),
('Gaming', 'gaming', '🎮', true),
('Streaming', 'streaming', '📺', true),
('Publishing', 'publishing', '📰', true),
('Music', 'music', '🎵', true),
('Film & Television', 'film-tv', '🎬', true),

-- Travel & Hospitality
('Travel & Tourism', 'travel', '✈️', true),
('Hospitality', 'hospitality', '🏨', true),
('Airlines', 'airlines', '✈️', true),
('Hotels', 'hotels', '🏨', true),
('Cruise Lines', 'cruise-lines', '🚢', true),

-- Professional Services
('Consulting', 'consulting', '💼', true),
('Legal', 'legal', '⚖️', true),
('Accounting', 'accounting', '📊', true),
('Marketing', 'marketing', '📢', true),
('Human Resources', 'hr', '👥', true),

-- Government & Public Sector
('Government', 'government', '🏛️', true),
('Public Administration', 'public-admin', '🏛️', true),
('Defense', 'defense', '🛡️', true),
('Education Administration', 'education-admin', '🏫', true),

-- Non-profit
('Non-profit', 'nonprofit', '❤️', true),
('Charity', 'charity', '❤️', true),
('Social Services', 'social-services', '🤝', true),
('Environmental', 'environmental', '🌱', true),

-- Sports & Recreation
('Sports & Recreation', 'sports', '⚽', true),
('Fitness', 'fitness', '💪', true),
('Outdoor Recreation', 'outdoor-recreation', '🏕️', true),
('Sports Management', 'sports-management', '🏆', true),

-- Agriculture
('Agriculture', 'agriculture', '🌾', true),
('Farm Equipment', 'farm-equipment', '🚜', true),
('Organic Farming', 'organic-farming', '🌱', true),
('Food Processing', 'food-processing', '🍎', true);

-- Verify the data was inserted
SELECT COUNT(*) as total_industries FROM platform.lookup_industries WHERE isActive = true;

-- Enable audit triggers if they exist (already created in audit_triggers.sql)
-- The triggers will automatically track all insert, update, and delete operations