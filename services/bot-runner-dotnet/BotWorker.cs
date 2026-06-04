using Microsoft.Extensions.Hosting;

public sealed class BotWorker : BackgroundService
{
    private readonly OrchestratorClient _client;
    private readonly JobProcessor _processor;

    public BotWorker(OrchestratorClient client, JobProcessor processor)
    {
        _client = client;
        _processor = processor;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _client.RegisterAgent(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            var job = await _client.FetchJob(stoppingToken);

            if (job is not null)
            {
                await _processor.Execute(job, stoppingToken);
            }

            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
    }
}

