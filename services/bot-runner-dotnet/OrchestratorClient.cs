using System.Net.Http.Json;
using System.Net.NetworkInformation;
using System.Security.Cryptography;
using System.Text;

public sealed class OrchestratorClient
{
    private readonly HttpClient _httpClient;
    private readonly RunnerConfiguration _configuration;
    private RunnerIdentity _identity = new();

    public OrchestratorClient()
    {
        _httpClient = new HttpClient();
        _configuration = RunnerConfiguration.Load();

        if (!string.IsNullOrWhiteSpace(_configuration.OrchestratorUrl))
        {
            _httpClient.BaseAddress = new Uri(_configuration.OrchestratorUrl.TrimEnd('/') + "/");
        }
    }

    public async Task RegisterAgent(CancellationToken cancellationToken)
    {
        _identity.Fingerprint = BuildFingerprint();

        if (string.IsNullOrWhiteSpace(_configuration.OrchestratorUrl))
        {
            Console.WriteLine("Bot Runner is missing ORCHESTRATOR_URL.");
            return;
        }

        if (string.IsNullOrWhiteSpace(_configuration.TenantId))
        {
            Console.WriteLine("Bot Runner is missing BOT_RUNNER_TENANT_ID.");
            return;
        }

        var request = new RegisterRunnerRequest
        {
            TenantId = _configuration.TenantId,
            Hostname = ResolveHostname(),
            OsType = ResolveOsType(),
            OsVersion = Environment.OSVersion.VersionString,
            IpAddress = ResolveIpAddress(),
            MacAddress = ResolveMacAddress(),
            Fingerprint = _identity.Fingerprint,
            AgentVersion = _configuration.AgentVersion,
            RunnerMode = _configuration.RunnerMode,
            ActivationToken = _configuration.ActivationToken,
        };

        var response = await _httpClient.PostAsJsonAsync(
            "api/bot-runner/register",
            request,
            cancellationToken);

        var payload = await response.Content.ReadFromJsonAsync<RegisterRunnerResponse>(cancellationToken: cancellationToken);
        if (payload is null)
        {
            Console.WriteLine("Bot Runner registration returned an empty response.");
            return;
        }

        if (!response.IsSuccessStatusCode)
        {
            Console.WriteLine($"Bot Runner registration failed: {payload.Message ?? payload.Code}");
            return;
        }

        _identity.BotHostId = payload.BotHostId;
        _identity.SessionId = payload.SessionId;
        _identity.CertificateId = payload.CertificateId;
        _identity.CertificatePem = payload.Certificate;

        if (payload.RegistrationState == "PENDING_ACTIVATION")
        {
            Console.WriteLine($"Bot Runner registered and is waiting for activation. Host ID: {_identity.BotHostId}");
            if (payload.Activation is not null)
            {
                Console.WriteLine($"Portal path: {payload.Activation.PortalPath}");
                Console.WriteLine($"Activation token: {payload.Activation.ActivationToken}");
                Console.WriteLine(payload.Activation.Message);
            }
            return;
        }

        Console.WriteLine($"Bot Runner active. Host ID: {_identity.BotHostId} Session ID: {_identity.SessionId}");
    }

    public async Task<RunnerJob?> FetchJob(CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_identity.BotHostId))
        {
            return null;
        }

        var response = await _httpClient.PostAsJsonAsync(
            "api/bot-runner/jobs/next",
            new NextJobRequest
            {
                BotHostId = _identity.BotHostId!,
                SessionId = _identity.SessionId,
                Fingerprint = _identity.Fingerprint,
                AgentVersion = _configuration.AgentVersion,
            },
            cancellationToken);

        var payload = await response.Content.ReadFromJsonAsync<NextJobResponse>(cancellationToken: cancellationToken);
        if (payload is null || !response.IsSuccessStatusCode)
        {
            return null;
        }

        _identity.SessionId = payload.SessionId ?? _identity.SessionId;
        return payload.Job;
    }

    private static string ResolveHostname()
    {
        return Environment.GetEnvironmentVariable("BOT_RUNNER_HOSTNAME")
            ?? Environment.MachineName;
    }

    private static string ResolveOsType()
    {
        if (OperatingSystem.IsMacOS()) return "macOS";
        if (OperatingSystem.IsWindows()) return "Windows";
        if (OperatingSystem.IsLinux()) return "Linux";
        return "Unknown";
    }

    private static string? ResolveIpAddress()
    {
        try
        {
            return NetworkInterface.GetAllNetworkInterfaces()
                .Where(nic => nic.OperationalStatus == OperationalStatus.Up)
                .SelectMany(nic => nic.GetIPProperties().UnicastAddresses)
                .Select(ip => ip.Address)
                .Where(address => !System.Net.IPAddress.IsLoopback(address) && address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                .Select(address => address.ToString())
                .FirstOrDefault();
        }
        catch
        {
            return null;
        }
    }

    private static string? ResolveMacAddress()
    {
        try
        {
            return NetworkInterface.GetAllNetworkInterfaces()
                .Where(nic => nic.OperationalStatus == OperationalStatus.Up)
                .Select(nic => nic.GetPhysicalAddress()?.ToString())
                .FirstOrDefault(address => !string.IsNullOrWhiteSpace(address));
        }
        catch
        {
            return null;
        }
    }

    private static string BuildFingerprint()
    {
        var seed = string.Join("|", new[]
        {
            ResolveHostname(),
            ResolveOsType(),
            Environment.OSVersion.VersionString,
            Environment.GetEnvironmentVariable("BOT_RUNNER_TENANT_ID") ?? "",
            Environment.GetEnvironmentVariable("BOT_RUNNER_FINGERPRINT_SEED") ?? "",
        });

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(seed));
        return Convert.ToHexString(hash);
    }

    private sealed class RunnerConfiguration
    {
        public string OrchestratorUrl { get; init; } = "";
        public string TenantId { get; init; } = "";
        public string? ActivationToken { get; init; }
        public string RunnerMode { get; init; } = "VM";
        public string AgentVersion { get; init; } = "0.1.0";

        public static RunnerConfiguration Load()
        {
            return new RunnerConfiguration
            {
                OrchestratorUrl = Environment.GetEnvironmentVariable("ORCHESTRATOR_URL") ?? "",
                TenantId = Environment.GetEnvironmentVariable("BOT_RUNNER_TENANT_ID") ?? "",
                ActivationToken = Environment.GetEnvironmentVariable("BOT_RUNNER_ACTIVATION_TOKEN"),
                RunnerMode = Environment.GetEnvironmentVariable("RUNNER_MODE") ?? "VM",
                AgentVersion = Environment.GetEnvironmentVariable("BOT_RUNNER_VERSION") ?? "0.1.0",
            };
        }
    }

    private sealed class RunnerIdentity
    {
        public string? BotHostId { get; set; }
        public string? SessionId { get; set; }
        public string? CertificateId { get; set; }
        public string? CertificatePem { get; set; }
        public string Fingerprint { get; set; } = "";
    }

    private sealed class RegisterRunnerRequest
    {
        public string TenantId { get; set; } = "";
        public string Hostname { get; set; } = "";
        public string OsType { get; set; } = "";
        public string? OsVersion { get; set; }
        public string? IpAddress { get; set; }
        public string? MacAddress { get; set; }
        public string Fingerprint { get; set; } = "";
        public string AgentVersion { get; set; } = "";
        public string? RunnerMode { get; set; }
        public string? ActivationToken { get; set; }
    }

    private sealed class ActivationInstructions
    {
        public string PortalPath { get; set; } = "";
        public string Message { get; set; } = "";
        public string BotHostId { get; set; } = "";
        public string ActivationToken { get; set; } = "";
    }

    private sealed class RegisterRunnerResponse
    {
        public string? Code { get; set; }
        public string? Message { get; set; }
        public string? RegistrationState { get; set; }
        public string? BotHostId { get; set; }
        public string? SessionId { get; set; }
        public string? Certificate { get; set; }
        public string? CertificateId { get; set; }
        public ActivationInstructions? Activation { get; set; }
    }

    private sealed class NextJobRequest
    {
        public string BotHostId { get; set; } = "";
        public string? SessionId { get; set; }
        public string Fingerprint { get; set; } = "";
        public string AgentVersion { get; set; } = "";
    }

    private sealed class NextJobResponse
    {
        public string? SessionId { get; set; }
        public RunnerJob? Job { get; set; }
    }
}
