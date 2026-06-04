#define MyAppName "Bot Runner"
#ifndef MyAppVersion
  #define MyAppVersion "0.1.0"
#endif
#ifndef SourcePublishDir
  #define SourcePublishDir "..\\..\\..\\.release\\bot-runner\\windows\\publish"
#endif
#ifndef OutputDir
  #define OutputDir "..\\..\\..\\artifacts\\bot-runner\\windows"
#endif

[Setup]
AppId={{F4E1B666-6D35-493F-8EFA-8A27BAF8E8A1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=NextGen Platform
DefaultDirName={autopf}\NextGen\Bot Runner
DefaultGroupName=NextGen Bot Runner
OutputDir={#OutputDir}
OutputBaseFilename=BotRunnerSetup-win-x64
Compression=lzma
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=admin
WizardStyle=modern
UninstallDisplayIcon={app}\BotRunner.dll

[Files]
Source: "{#SourcePublishDir}\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion
Source: "..\shared\bot-runner.env"; DestDir: "{app}"; Flags: ignoreversion onlyifdoesntexist

[Icons]
Name: "{group}\Bot Runner"; Filename: "{app}\BotRunner.dll"

[Run]
Filename: "sc.exe"; Parameters: "create ""BotRunner"" binPath= ""{app}\BotRunner.exe"" start= auto"; Flags: runhidden waituntilterminated; Check: FileExists(ExpandConstant('{app}\BotRunner.exe'))
Filename: "sc.exe"; Parameters: "start ""BotRunner"""; Flags: runhidden waituntilterminated skipifsilent; Check: FileExists(ExpandConstant('{app}\BotRunner.exe'))

[UninstallRun]
Filename: "sc.exe"; Parameters: "stop ""BotRunner"""; Flags: runhidden waituntilterminated skipifdoesntexist
Filename: "sc.exe"; Parameters: "delete ""BotRunner"""; Flags: runhidden waituntilterminated skipifdoesntexist

