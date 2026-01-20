
using TravelKanjanuburi.ML;

public interface IModelTrainingService
{
    Task<(bool ok, int rows, string? message)> RetrainNowAsync(int days, int minRows, CancellationToken ct);
}

public sealed class ModelTrainingService : IModelTrainingService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IModelStore _store;
    private readonly string _modelPath;

    private static readonly SemaphoreSlim _lock = new(1, 1);

    private readonly TrainingState _trainingState;

    public ModelTrainingService(IServiceScopeFactory scopeFactory, IModelStore store, TrainingState trainingState)
    {
        _scopeFactory = scopeFactory;
        _store = store;
        _modelPath = store.ModelPath;
        _trainingState = trainingState;
    }

    public async Task<(bool ok, int rows, string? message)> RetrainNowAsync(int days, int minRows, CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        _trainingState.IsTraining = true;
        _trainingState.LastAttemptUtc = DateTime.UtcNow;
        _trainingState.LastMessage = null;
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var sw = System.Diagnostics.Stopwatch.StartNew();
            var rows = await InteractionBuilder.BuildAsync(db, days, ct);
            var buildMs = sw.ElapsedMilliseconds;

            if (rows.Count < minRows)
            {
                _trainingState.IsTraining = false;
                _trainingState.LastRows = rows.Count;
                _trainingState.LastMessage = $"ข้อมูลไม่พอสำหรับเทรน (rows < {minRows}) build={buildMs}ms";
                return (false, rows.Count, _trainingState.LastMessage);
            }

            var trainer = new MlTrainer();
            var tmp = _modelPath + ".tmp";

            sw.Restart();
            trainer.TrainAndSave(rows, tmp);
            var fitAndSaveMs = sw.ElapsedMilliseconds;

            File.Copy(tmp, _modelPath, overwrite: true);
            File.Delete(tmp);

            _store.ReloadIfChanged();

            _trainingState.IsTraining = false;
            _trainingState.LastSuccessUtc = DateTime.UtcNow;
            _trainingState.LastRows = rows.Count;
            _trainingState.LastMessage = $"OK build={buildMs}ms train={fitAndSaveMs}ms";

            return (true, rows.Count, _trainingState.LastMessage);
        }
        catch (Exception ex)
        {
            _trainingState.IsTraining = false;
            _trainingState.LastMessage = ex.Message;
            return (false, 0, ex.Message);
        }
        finally
        {
            _trainingState.IsTraining = false;
            _lock.Release();
        }
    }

}
