using GymManagementDAL.Entities;

namespace GymManagementDAL.Data.Configurations
{
    internal class TrainerConfigurations : GymUserConfigurations<Trainer>
    {
        protected override string TableName => "Trainers";
    }
}
