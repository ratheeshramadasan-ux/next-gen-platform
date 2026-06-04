public sealed class JobProcessor
{
    public async Task Execute(RunnerJob job, CancellationToken cancellationToken)
    {
        try
        {
            switch (job.Type)
            {
                case "API":
                    await RunApi(job, cancellationToken);
                    break;
                case "SCRIPT":
                    await RunScript(job, cancellationToken);
                    break;
                case "UI":
                    await RunUiAutomation(job, cancellationToken);
                    break;
                default:
                    await RunAi(job, cancellationToken);
                    break;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Job {job.Id} failed: {ex.Message}");
        }
    }

    private static Task RunApi(RunnerJob job, CancellationToken cancellationToken) =>
        Task.CompletedTask;

    private static Task RunScript(RunnerJob job, CancellationToken cancellationToken) =>
        Task.CompletedTask;

    private static Task RunUiAutomation(RunnerJob job, CancellationToken cancellationToken) =>
        Task.CompletedTask;

    private static Task RunAi(RunnerJob job, CancellationToken cancellationToken) =>
        Task.CompletedTask;
}

