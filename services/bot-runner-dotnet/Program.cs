using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

Host.CreateDefaultBuilder(args)
    .ConfigureServices(services =>
    {
        services.AddHostedService<BotWorker>();
        services.AddSingleton<JobProcessor>();
        services.AddSingleton<OrchestratorClient>();
    })
    .Build()
    .Run();
