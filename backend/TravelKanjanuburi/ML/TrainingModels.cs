namespace TravelKanjanuburi.ML
{
    public class TrainingModels
    {
        public sealed class TrainingState
        {
            public DateTime? LastAttemptUtc { get; set; }
            public DateTime? LastSuccessUtc { get; set; }
            public int? LastRows { get; set; }
            public string? LastMessage { get; set; }
            public bool IsTraining { get; set; }
        }
        public sealed class TrainingOptions
        {
            // เวลาไทยที่จะให้เริ่มเทรนทุกวัน (เช่น 02:00)
            public int Hour { get; set; } = 2;
            public int Minute { get; set; } = 0;

            // ใช้ข้อมูลย้อนหลังสำหรับเทรนกี่วัน (dev 3650, prod 90/180)
            public int DaysBack { get; set; } = 3650;

            // 최소 rows ก่อนให้เทรน (dev 3/5, prod 50/200)
            public int MinRows { get; set; } = 3;
        }
    }
}
