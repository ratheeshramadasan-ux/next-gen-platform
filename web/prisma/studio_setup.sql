/**
 * Next-Gen Automation Studio - MSSQL Setup Script
 * High performance folder hierarchy + Granular RBAC + IDE Schema
 */

-- 1. Folders with hierarchyid support
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Folders')
BEGIN
    CREATE TABLE Folders (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Name NVARCHAR(255) NOT NULL,
        ParentId UNIQUEIDENTIFIER NULL,
        WorkspaceId UNIQUEIDENTIFIER NOT NULL,
        Path hierarchyid NOT NULL,
        CreatedBy UNIQUEIDENTIFIER,
        CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
        IsArchived BIT DEFAULT 0
    );
    CREATE INDEX IX_Folders_ParentId ON Folders(ParentId);
    CREATE INDEX IX_Folders_Path ON Folders(Path);
END

-- 2. Granular Folder Permissions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FolderPermissions')
BEGIN
    CREATE TABLE FolderPermissions (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        FolderId UNIQUEIDENTIFIER NOT NULL,
        PrincipalType NVARCHAR(10), -- USER / GROUP
        PrincipalId UNIQUEIDENTIFIER,
        CanView BIT DEFAULT 0,
        CanCreate BIT DEFAULT 0,
        CanEdit BIT DEFAULT 0,
        CanDelete BIT DEFAULT 0,
        CanManage BIT DEFAULT 0,
        IsInherited BIT DEFAULT 0
    );
    CREATE INDEX IX_FolderPermissions_FolderId ON FolderPermissions(FolderId);
    CREATE INDEX IX_FolderPermissions_Principal ON FolderPermissions(PrincipalId);
END

-- 3. Projects (Linked to Folders)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Projects')
BEGIN
    CREATE TABLE Projects (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX),
        FolderId UNIQUEIDENTIFIER NULL,
        WorkspaceId UNIQUEIDENTIFIER NOT NULL,
        CreatedBy UNIQUEIDENTIFIER,
        CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
        Metadata NVARCHAR(MAX) -- JSON
    );
    CREATE INDEX IX_Projects_FolderId ON Projects(FolderId);
END

-- 4. Studio Assets (Secure and Global)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StudioAssets')
BEGIN
    CREATE TABLE StudioAssets (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ProjectId UNIQUEIDENTIFIER NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Type NVARCHAR(50), -- TEXT, CREDENTIAL, JSON
        Value NVARCHAR(MAX),
        IsSecure BIT DEFAULT 1
    );
END

-- 5. Studio Variables & Arguments
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StudioVariables')
BEGIN
    CREATE TABLE StudioVariables (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ProjectId UNIQUEIDENTIFIER NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        DataType NVARCHAR(50), -- String, Boolean, Int, DataTable, AIObject
        DefaultValue NVARCHAR(MAX),
        Scope NVARCHAR(50) -- GLOBAL, WORKFLOW
    );
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StudioArguments')
BEGIN
    CREATE TABLE StudioArguments (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ProjectId UNIQUEIDENTIFIER NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Direction NVARCHAR(10), -- IN, OUT, INOUT
        DataType NVARCHAR(50),
        DefaultValue NVARCHAR(MAX)
    );
END

-- 6. Node-based Workflows (IDE Core)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StudioWorkflows')
BEGIN
    CREATE TABLE StudioWorkflows (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ProjectId UNIQUEIDENTIFIER NOT NULL,
        Name NVARCHAR(255),
        Description NVARCHAR(MAX),
        Version NVARCHAR(20) DEFAULT '1.0.0',
        Status NVARCHAR(20) DEFAULT 'READY',
        FlowJson NVARCHAR(MAX), -- Fallback for faster retrieval
        UpdatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
    );
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StudioNodes')
BEGIN
    CREATE TABLE StudioNodes (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        WorkflowId UNIQUEIDENTIFIER NOT NULL,
        NodeType NVARCHAR(50), -- UI_CLICK, API_CALL, LOGIC_IF, AI_AGENT
        Name NVARCHAR(255),
        ConfigJson NVARCHAR(MAX),
        PositionX FLOAT,
        PositionY FLOAT
    );
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StudioConnections')
BEGIN
    CREATE TABLE StudioConnections (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        WorkflowId UNIQUEIDENTIFIER NOT NULL,
        FromNodeId UNIQUEIDENTIFIER NOT NULL,
        ToNodeId UNIQUEIDENTIFIER NOT NULL,
        Label NVARCHAR(100) -- YES, NO, ON_ERROR
    );
END
GO
