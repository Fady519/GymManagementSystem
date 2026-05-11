using AutoMapper;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.View_Models.TrainerVm;
using GymManagementDAL.Entities;
using GymManagementDAL.UnitOfWorkPattern;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class TrainerService : ITrainerService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public TrainerService(IUnitOfWork unitOfWork,IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }
        public bool CreateTrainer(CreateTrainerViewModel createTrainer)
        {
            if (createTrainer is null || IsEmailExist(createTrainer.Email)
                || IsPhoneExist(createTrainer.Phone))
                return false;
            #region Manual Mapping

            //var trainer = new Trainer
            //{
            //    Name = createTrainer.Name,
            //    Email = createTrainer.Email,
            //    Phone = createTrainer.Phone,
            //    DateOfBirth = createTrainer.DateOfBirth,
            //    Gender = createTrainer.Gender,
            //    Address = new Address
            //    {
            //        BuildingNumber = createTrainer.BuildingNumber,
            //        City = createTrainer.City,
            //        Street = createTrainer.Street,
            //    },
            //    Specialities = createTrainer.Specialities,
            //}; 
            #endregion

            var trainer=_mapper.Map<CreateTrainerViewModel,Trainer>(createTrainer);


            try
            {
                _unitOfWork.GetRepository<Trainer>().Add(trainer);

                return _unitOfWork.SaveChanges() > 0;
            }
            catch (Exception)
            {

                return false;
            }


        }


        public IEnumerable<TrainerViewModel> GetAllTrainers()
        {
            var trainers = _unitOfWork.GetRepository<Trainer>().GetAll();

            if (trainers is null || !trainers.Any())
                return [];

            #region Manual Mapping
            //return trainers.Select(T => new TrainerViewModel
            //{
            //    Id = T.Id,
            //    Name = T.Name,
            //    Email = T.Email,
            //    Phone = T.Phone,
            //    Specialities = T.Specialities.ToString(),
            //});
            #endregion

            return _mapper.Map<IEnumerable<TrainerViewModel>>(trainers);

        }


        public bool DeleteTrainer(int trainerId)
        {
            var trainerRepo = _unitOfWork.GetRepository<Trainer>();

            var trainer = trainerRepo.GetById(trainerId);
            if (trainer is null || HasFutureSessions(trainerId))
                return false;
            try
            {

                trainerRepo.Delete(trainer);

                return _unitOfWork.SaveChanges() > 0;
            }
            catch (Exception)
            {

                return false;
            }

        }


        public TrainerViewModel? GetTrainerDetails(int trainerId)
        {
            var trainer = _unitOfWork.GetRepository<Trainer>().GetById(trainerId);
            if (trainer is null) return null;

            #region Manual Mapping
            //return new TrainerViewModel
            //{
            //    Name = trainer.Name,
            //    Email = trainer.Email,
            //    Phone = trainer.Phone,
            //    DateOfBirth = trainer.DateOfBirth.ToShortDateString(),
            //    Gender = trainer.Gender.ToString(),
            //    Address = $"{trainer.Address.BuildingNumber}-{trainer.Address.Street}-{trainer.Address.City}",
            //    Specialities = trainer.Specialities.ToString(),
            //}; 
            #endregion

            return _mapper.Map<TrainerViewModel>(trainer);
        }

        public TrainerToUpdateViewModel? GetTrainerToUpdate(int trainerId)
        {
            var trainer = _unitOfWork.GetRepository<Trainer>().GetById(trainerId);
            if (trainer is null) return null;

            #region Manual Mapping
            //return new TrainerToUpdateViewModel
            //{
            //    Name = trainer.Name,
            //    Email = trainer.Email,
            //    Phone = trainer.Phone,
            //    Specialities = trainer.Specialities,
            //    BuildingNumber = trainer.Address.BuildingNumber,
            //    City = trainer.Address.City,
            //    Street = trainer.Address.Street,
            //}; 
            #endregion

            return _mapper.Map<TrainerToUpdateViewModel>(trainer);
        }

        public bool UpdateTrainer(int id, TrainerToUpdateViewModel trainerToUpdate)
        {
            var trainerRepo = _unitOfWork.GetRepository<Trainer>();

            var EmailExistForAnotherOldTrainer = trainerRepo
                 .GetAll(X => X.Email == trainerToUpdate.Email && X.Id != id)
                 .Any();

            var phoneExistForAnotherOldTrainer = trainerRepo
                .GetAll(X => X.Phone == trainerToUpdate.Phone && X.Id != id)
                .Any();

            if (EmailExistForAnotherOldTrainer || phoneExistForAnotherOldTrainer || trainerToUpdate is null)
                return false;


            var trainer = trainerRepo.GetById(id);

            if (trainer is null) return false;

            #region Manual Mapping
            //trainer.Email = trainerToUpdate.Email;
            //trainer.Phone = trainerToUpdate.Phone;
            //trainer.Address.BuildingNumber = trainerToUpdate.BuildingNumber;
            //trainer.Address.City = trainerToUpdate.City;
            //trainer.Address.Street = trainerToUpdate.Street;
            //trainer.Specialities = trainerToUpdate.Specialities;


            //trainer.UpdatedAt = DateTime.Now; 
            #endregion

            _mapper.Map(trainerToUpdate, trainer);


            try
            {
                trainerRepo.Update(trainer);

                return _unitOfWork.SaveChanges() > 0;
            }
            catch
            {
                return false;
            }


        }


        #region HelperMethod

        private bool IsEmailExist(string email)
        {
            return _unitOfWork.GetRepository<Trainer>().GetAll(X => X.Email == email).Any();
        }

        private bool IsPhoneExist(string phone)
        {
            return _unitOfWork.GetRepository<Trainer>().GetAll(X => X.Phone == phone).Any();
        }


        private bool HasFutureSessions(int trainerId)
        {
            return _unitOfWork.GetRepository<Session>()
                .GetAll(S => S.TrainerId == trainerId && S.StartDate > DateTime.Now)
                .Any();
        }
        #endregion

    }
}
