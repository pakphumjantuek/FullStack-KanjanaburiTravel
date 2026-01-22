using Microsoft.ML;

public interface IModelStore
{
    string ModelPath { get; }
    DateTime? LastTrainedAtUtc { get; }
    DateTime? LastModelWriteTimeUtc { get; }
    bool ModelExists { get; }

    PredictionEngine<InteractionRow, ScorePrediction> CreateEngine();
    void ReloadIfChanged();
}

public sealed class ModelStore : IModelStore
{
    private readonly string _modelPath;
    private readonly MLContext _ml = new();
    private readonly ReaderWriterLockSlim _lock = new();
    private ITransformer? _model;
    private DateTime? _lastWriteUtc;

    public string ModelPath => _modelPath;
    public bool ModelExists => File.Exists(_modelPath);
    public DateTime? LastModelWriteTimeUtc => File.Exists(_modelPath) ? File.GetLastWriteTimeUtc(_modelPath) : null;
    public DateTime? LastTrainedAtUtc { get; private set; }

    public ModelStore(string modelPath)
    {
        _modelPath = modelPath;
        LoadIfExists();
    }

    public void ReloadIfChanged()
    {
        if (!File.Exists(_modelPath)) return;

        var writeUtc = File.GetLastWriteTimeUtc(_modelPath);
        if (_lastWriteUtc.HasValue && writeUtc <= _lastWriteUtc.Value) return;

        _lock.EnterWriteLock();
        try
        {
            using var fs = File.OpenRead(_modelPath);
            _model = _ml.Model.Load(fs, out _);
            _lastWriteUtc = writeUtc;
            LastTrainedAtUtc = DateTime.UtcNow;
        }
        finally { _lock.ExitWriteLock(); }
    }

    public PredictionEngine<InteractionRow, ScorePrediction> CreateEngine()
    {
        ReloadIfChanged();

        _lock.EnterReadLock();
        try
        {
            if (_model == null)
                throw new InvalidOperationException("Model ยังไม่พร้อมใช้งาน (ยังไม่เคยเทรน หรือหาไฟล์ไม่เจอ)");

            // PredictionEngine ไม่ thread-safe → สร้างใหม่ทุกครั้ง
            return _ml.Model.CreatePredictionEngine<InteractionRow, ScorePrediction>(_model);
        }
        finally { _lock.ExitReadLock(); }
    }

    private void LoadIfExists()
    {
        if (!File.Exists(_modelPath)) return;

        _lock.EnterWriteLock();
        try
        {
            using var fs = File.OpenRead(_modelPath);
            _model = _ml.Model.Load(fs, out _);
            _lastWriteUtc = File.GetLastWriteTimeUtc(_modelPath);
            LastTrainedAtUtc = DateTime.UtcNow;
        }
        finally { _lock.ExitWriteLock(); }
    }
}
