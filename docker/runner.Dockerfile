FROM mcr.microsoft.com/dotnet/runtime:8.0

WORKDIR /app

COPY services/bot-runner-dotnet ./

ENTRYPOINT ["dotnet", "BotRunner.dll"]

