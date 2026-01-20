namespace TravelKanjanuburi.ML
{
    public sealed class InteractionRow
    {
        public uint UserId { get; set; }
        public uint PlaceId { get; set; }
        public float Label { get; set; } // implicit preference strength
    }

    public sealed class ScorePrediction
    {
        public float Score { get; set; }
    }

}
