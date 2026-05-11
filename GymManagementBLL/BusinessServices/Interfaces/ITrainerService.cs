using GymManagementBLL.View_Models.TrainerVm;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementBLL.BusinessServices.Interfaces
{
    public interface ITrainerService
    {

        IEnumerable<TrainerViewModel> GetAllTrainers();

        bool CreateTrainer(CreateTrainerViewModel createTrainer);

        TrainerViewModel? GetTrainerDetails(int trainerId);

        TrainerToUpdateViewModel? GetTrainerToUpdate(int trainerId);

        bool UpdateTrainer(int id,TrainerToUpdateViewModel trainerToUpdate);

        bool DeleteTrainer(int trainerId);


    }
}
