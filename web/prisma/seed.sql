-- Improved Seed script for MSSQL
USE master;

-- Roles
IF NOT EXISTS (SELECT * FROM AppRole WHERE name = 'Super Admin')
INSERT INTO AppRole (id, name, isSystem, permissions) VALUES ('role-super-admin', 'Super Admin', 1, '["GLOBAL_ADMIN"]');

IF NOT EXISTS (SELECT * FROM AppRole WHERE name = 'Admin User')
INSERT INTO AppRole (id, name, isSystem, permissions) VALUES ('role-admin-user', 'Admin User', 1, '["CUSTOMER_ADMIN"]');

IF NOT EXISTS (SELECT * FROM AppRole WHERE name = 'Tenant Admin')
INSERT INTO AppRole (id, name, isSystem, permissions) VALUES ('role-tenant-admin', 'Tenant Admin', 1, '["TENANT_ADMIN"]');

-- Customers with slugs to avoid unique constraint issues
IF NOT EXISTS (SELECT * FROM Customer WHERE id = '1')
INSERT INTO Customer (id, companyName, slug, industry, location, status, createdAt, updatedAt) 
VALUES ('1', 'Apex Financial', 'apex-financial', 'Banking', 'New York, USA', 'Active', GETDATE(), GETDATE());

IF NOT EXISTS (SELECT * FROM Customer WHERE id = '2')
INSERT INTO Customer (id, companyName, slug, industry, location, status, createdAt, updatedAt) 
VALUES ('2', 'Global Health Inc', 'global-health-inc', 'Healthcare', 'London, UK', 'Active', GETDATE(), GETDATE());

-- Tenants
IF NOT EXISTS (SELECT * FROM Tenant WHERE id = 'tenant-apex-nyc')
INSERT INTO Tenant (id, name, customerId, createdAt, updatedAt) 
VALUES ('tenant-apex-nyc', 'Apex NYC Region', '1', GETDATE(), GETDATE());

-- Users
IF NOT EXISTS (SELECT * FROM AppUser WHERE email = 'ratheesh@zohomail.ca')
INSERT INTO AppUser (id, email, fullName, status, authMethod, isEmailVerified, createdAt, updatedAt)
VALUES ('user-global-admin', 'ratheesh@zohomail.ca', 'Global Admin (Ratheesh)', 'Protected', 'local', 1, GETDATE(), GETDATE());

IF NOT EXISTS (SELECT * FROM AppUser WHERE email = 'apex.admin@financial.com')
INSERT INTO AppUser (id, email, fullName, customerId, status, authMethod, isEmailVerified, createdAt, updatedAt)
VALUES ('user-apex-admin', 'apex.admin@financial.com', 'Apex Fin Regional Admin', '1', 'active', 'local', 1, GETDATE(), GETDATE());

IF NOT EXISTS (SELECT * FROM AppUser WHERE email = 'health.admin@global.com')
INSERT INTO AppUser (id, email, fullName, customerId, status, authMethod, isEmailVerified, createdAt, updatedAt)
VALUES ('user-health-admin', 'health.admin@global.com', 'Global Health Admin', '2', 'active', 'local', 1, GETDATE(), GETDATE());

GO
