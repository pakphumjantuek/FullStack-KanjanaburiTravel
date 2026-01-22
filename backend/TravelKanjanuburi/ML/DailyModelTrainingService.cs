using static TravelKanjanuburi.ML.TrainingModels;

public sealed class DailyModelTrainingHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DailyModelTrainingHostedService> _logger;
    private readonly TrainingOptions _opt;
    private readonly TrainingState _state;

    private static readonly TimeZoneInfo ThaiTz =
        TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");

    public DailyModelTrainingHostedService(
        IServiceScopeFactory scopeFactory,
        IOptions<TrainingOptions> opt,
        TrainingState state,
        ILogger<DailyModelTrainingHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _opt = opt.Value;
        _state = state;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = GetDelayUntilNextThaiTime(_opt.Hour, _opt.Minute);
            _logger.LogInformation("[ML] Next training in {Delay}. (Thai {H:D2}:{M:D2})",
                delay, _opt.Hour, _opt.Minute);

            try { await Task.Delay(delay, stoppingToken); }
            catch (TaskCanceledException) { break; }

            await RunOnceSafe(stoppingToken);
        }
    }

    private async Task RunOnceSafe(CancellationToken ct)
    {
        _state.IsTraining = true;
        _state.LastAttemptUtc = DateTime.UtcNow;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var trainer = scope.ServiceProvider.GetRequiredService<IModelTrainingService>();

            _logger.LogInformation("[ML] Training started. DaysBack={DaysBack}, MinRows={MinRows}",
                _opt.DaysBack, _opt.MinRows);

            var (ok, rows, message) = await trainer.RetrainNowAsync(_opt.DaysBack, _opt.MinRows, ct);

            _state.LastRows = rows;
            _state.LastMessage = message;

            if (!ok)
            {
                _logger.LogWarning("[ML] Training skipped/failed: {Message} (rows={Rows})", message, rows);
                return;
            }

            _state.LastSuccessUtc = DateTime.UtcNow;
            _logger.LogInformation("[ML] Training success. rows={Rows}", rows);
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            _state.LastMessage = ex.Message;
            _logger.LogError(ex, "[ML] Training crashed");
        }
        finally
        {
            _state.IsTraining = false;
        }
    }

    private static TimeSpan GetDelayUntilNextThaiTime(int hour, int minute)
    {
        var nowUtc = DateTime.UtcNow;
        var nowThai = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, ThaiTz);

        var nextThai = new DateTime(nowThai.Year, nowThai.Month, nowThai.Day, hour, minute, 0);
        if (nowThai >= nextThai) nextThai = nextThai.AddDays(1);

        var nextUtc = TimeZoneInfo.ConvertTimeToUtc(nextThai, ThaiTz);
        var delay = nextUtc - nowUtc;

        return delay < TimeSpan.Zero ? TimeSpan.Zero : delay;
    }
}
