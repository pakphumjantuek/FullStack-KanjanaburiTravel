namespace TravelKanjanuburi.Model
{
    public class Role
    {
        public int RoleId { get; set; }            // 1 = User, 2 = Owner, 3 = Admin
        public string RoleName { get; set; } = null!;
        public ICollection<User> Users { get; set; } = new List<User>();
    }
}
