-- Seeding Lookup Tables for MSSQL
USE master;

-- Industries
IF NOT EXISTS (SELECT * FROM LookupIndustry)
INSERT INTO LookupIndustry (id, label, isActive) VALUES 
('ind-1', 'Banking', 1),
('ind-2', 'Healthcare', 1),
('ind-3', 'Logistics', 1),
('ind-4', 'Retail', 1),
('ind-5', 'Energy', 1);

-- Regions
IF NOT EXISTS (SELECT * FROM LookupRegion)
INSERT INTO LookupRegion (id, label, isActive) VALUES 
('reg-1', 'US East', 1),
('reg-2', 'US West', 1),
('reg-3', 'Europe (London)', 1),
('reg-4', 'APAC (Sydney)', 1),
('reg-5', 'Canada', 1);

-- Classifications
IF NOT EXISTS (SELECT * FROM LookupClassification)
INSERT INTO LookupClassification (id, label, isActive) VALUES 
('class-1', 'General', 1),
('class-2', 'High Priority', 1),
('class-3', 'Security', 1),
('class-4', 'Financial', 1);

-- Priorities
IF NOT EXISTS (SELECT * FROM LookupPriority)
INSERT INTO LookupPriority (id, label, isActive) VALUES 
('pri-1', 'Low', 1),
('pri-2', 'Standard', 1),
('pri-3', 'High', 1),
('pri-4', 'Critical', 1);

GO
