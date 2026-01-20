namespace TravelKanjanuburi.ML
{
    public sealed class TrainingState
    {
        public DateTime? LastAttemptUtc { get; set; }
        public DateTime? LastSuccessUtc { get; set; }
        public int? LastRows { get; set; }
        public string? LastMessage { get; set; }
        public bool IsTraining { get; set; }
    }

}
