using Microsoft.ML;
using Microsoft.ML.Trainers;
using TravelKanjanuburi.ML;

public sealed class MlTrainer
{
    private readonly MLContext _ml = new(seed: 42);

    public void TrainAndSave(IEnumerable<InteractionRow> data, string modelPath)
    {
        var dv = _ml.Data.LoadFromEnumerable(data);

        var pipeline =
            _ml.Transforms.Conversion.MapValueToKey("userIdEncoded", nameof(InteractionRow.UserId))
              .Append(_ml.Transforms.Conversion.MapValueToKey("placeIdEncoded", nameof(InteractionRow.PlaceId)))
              .Append(_ml.Recommendation().Trainers.MatrixFactorization(new MatrixFactorizationTrainer.Options
              {
                  MatrixColumnIndexColumnName = "userIdEncoded",
                  MatrixRowIndexColumnName = "placeIdEncoded",
                  LabelColumnName = nameof(InteractionRow.Label),

                  // ปรับได้ตามขนาดข้อมูล
                  NumberOfIterations = 150,
                  ApproximationRank = 128,
                  LearningRate = 0.05
              }));

        var model = pipeline.Fit(dv);
        _ml.Model.Save(model, dv.Schema, modelPath);
    }
}
