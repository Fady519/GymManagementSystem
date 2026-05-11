using AutoMapper;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Helpers;
using GymManagementBLL.View_Models;
using GymManagementBLL.View_Models.MemberVm;
using GymManagementDAL.Data.Contexts;
using GymManagementDAL.Entities;
using GymManagementDAL.Repositories.Implementation;
using GymManagementDAL.Repositories.Interfaces;
using GymManagementDAL.UnitOfWorkPattern;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class MemberService : IMemberService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly IAttachementService _attachementService;

        //Ask CLR To inject object from class Implement interface IUnit of Workk Pattern
        public MemberService(IUnitOfWork unitOfWork,IMapper mapper,IAttachementService attachementService)
        {
            _unitOfWork = unitOfWork;
          _mapper = mapper;
           _attachementService = attachementService;
        }

        public bool CreateMember(CreateMemberViewModel createMember)
        {

            //Email or Phone not Exist
          

            if(IsEmailExist(createMember.Email)||IsPhoneExist(createMember.Phone))
                return false;


            //CreateMemberViewModel=>Member

            #region Manual Mapping
            //var member = new Member
            //{
            //    Name = createMember.Name,
            //    Email = createMember.Email,
            //    Phone = createMember.Phone,
            //    Gender = createMember.Gender,
            //    DateOfBirth = createMember.DateOfBirth,
            //    Address = new Address
            //    {
            //        BuildingNumber = createMember.BuildingNumber,
            //        City = createMember.City,
            //        Street = createMember.Street,
            //    },
            //    HealthRecord = new HealthRecord
            //    {
            //        Height = createMember.HealthRecord.Hieght,
            //        Weight = createMember.HealthRecord.Wieght,
            //        BloodType = createMember.HealthRecord.BloodType,
            //        Note = createMember.HealthRecord.Note,
            //    }
            //}; 
            #endregion

            //Create Member in Database
         var photoName= _attachementService.Upload("members", createMember.PhotoFile);

            if(string.IsNullOrEmpty(photoName)) 
                return false;



            var member=_mapper.Map<CreateMemberViewModel,Member>(createMember);
            member.HealthRecord = _mapper.Map<HealthRecordViewModel, HealthRecord>(createMember.HealthRecordViewModel);
            member.Photo=photoName;
            _unitOfWork.GetRepository<Member>().Add(member);
   
           var isCreated= _unitOfWork.SaveChanges()>0;

            if(!isCreated)
            {
                //Rollback
                _attachementService.Delete(photoName, "members");
                return false;
            }

            return isCreated;

        }

        public IEnumerable<MemberViewModel> GetAllMembers()
        {
            var members = _unitOfWork.GetRepository<Member>().GetAll();

            if(members is null||!members.Any() ) return [];



            #region Manual Mapping First Way
            //var listOfMembersViewModel=new List<MemberViewModel>();

            //foreach (var member in members)
            //{
            //    var memberViewModel = new MemberViewModel
            //    {
            //        Id = member.Id,
            //        Name = member.Name,
            //        Phone = member.Phone,
            //        Photo = member.Photo,
            //        Email = member.Email,
            //        Gender = member.Gender.ToString(),
            //    };

            //    listOfMembersViewModel.Add(memberViewModel);
            //}

            //return listOfMembersViewModel; 
            #endregion


            #region Manual Mapping
            //var membersViewModel = members.Select(M => new MemberViewModel
            //{
            //    Id = M.Id,
            //    Name = M.Name,
            //    Email = M.Email,
            //    Phone = M.Phone,
            //    Photo = M.Photo,
            //    Gender = M.Gender.ToString(),
            //});


            //return membersViewModel; 
            #endregion

            return _mapper.Map< IEnumerable<MemberViewModel>>(members);

        }

        public MemberViewModel? GetMemberDetails(int memberId)
        {
           var member=_unitOfWork.GetRepository<Member>().GetById(memberId);
            if(member is null) return null;

            #region Manual Mapping
            //var memberViewModel = new MemberViewModel
            //{
            //    Name = member.Name,
            //    Email = member.Email,
            //    Phone = member.Phone,
            //    Gender = member.Gender.ToString(),
            //    DateOfBirth = member.DateOfBirth.ToShortDateString(),
            //    Address = $"{member.Address.BuildingNumber}-{member.Address.Street}-{member.Address.City}",
            //    Photo = member.Photo,

            //}; 
            #endregion

            var memberViewModel=_mapper.Map<MemberViewModel>(member);
            //Active Membership

            var memberShip=_unitOfWork.GetRepository<Membership>().GetAll(X=>X.MemberId==memberId&&X.Status=="Active")
                      .FirstOrDefault();

            if(memberShip is not null)
            {
                memberViewModel.MembershipStartDate=memberShip.CreatedAt.ToShortDateString();
                memberViewModel.MembershipEndDate=memberShip.EndDate.ToShortDateString();

                var plan = _unitOfWork.GetRepository<Plan>().GetById(memberShip.PlanId);

                memberViewModel.PlanName = plan?.Name;
            }

            return memberViewModel;
        }

        public MemberToUpdateViewModel? GetMemberDetailsToUpdate(int memberId)
        {

            var member=_unitOfWork.GetRepository<Member>().GetById(memberId);

            if (member is null) return null;

            #region Manual Mapping
            //return new MemberToUpdateViewModel
            //{
            //    Email = member.Email,
            //    Phone = member.Phone,
            //    Photo = member.Photo,
            //    Name = member.Name,
            //    BuildingNumber = member.Address.BuildingNumber,
            //    City = member.Address.City,
            //    Street = member.Address.Street,
            //}; 
            #endregion

            return _mapper.Map<MemberToUpdateViewModel>(member);

        }

        public HealthRecordViewModel? GetMemberHealthDetails(int memberId)
        {
            var memberHealthRecord=_unitOfWork.GetRepository<HealthRecord>().GetById(memberId);

            if( memberHealthRecord is null) return null;
            #region Manual Mapping

            //return new HealthRecordViewModel
            //{
            //    Wieght = memberHealthRecord.Weight,
            //    Hieght = memberHealthRecord.Height,
            //    BloodType = memberHealthRecord.BloodType,
            //    Note = memberHealthRecord.Note,
            //}; 
            #endregion

            return _mapper.Map<HealthRecordViewModel>(memberHealthRecord);

        }

        public bool RemoveMember(int memberId)
        {
            try
            {
                var memberRepo = _unitOfWork.GetRepository<Member>();
                var member = memberRepo.GetById(memberId);
                if (member is null) return false;

                var memberSessionsIds = _unitOfWork.GetRepository<MemberSession>()
                    .GetAll(X => X.MemberId == memberId)
                    .Select(X => X.SessionId);     // 1 5 8

                var hasFutureSessions = _unitOfWork.GetRepository<Session>().GetAll(
                   S => memberSessionsIds.Contains(S.Id) && S.StartDate > DateTime.Now).Any();

                if (hasFutureSessions)
                    return false;


                var membershipRepo = _unitOfWork.GetRepository<Membership>();
                var memberShips = membershipRepo.GetAll(X => X.MemberId == memberId);

                if (memberShips.Any())
                {
                    foreach (var membership in memberShips)
                    {
                        membershipRepo.Delete(membership);  //Transaction
                    }
                }

                memberRepo.Delete(member); //Transaction

               var isDeleted= _unitOfWork.SaveChanges()>0;
                if(isDeleted)
                {
                    _attachementService.Delete(member.Photo, "members");
                }

                return isDeleted;
            }
            catch (Exception)
            {

                return false;
            }

        }

        public bool UpdateMember(int memberId, MemberToUpdateViewModel memberToUpdate)
        {
            try
            {
                var memberRepo = _unitOfWork.GetRepository<Member>();

                var emailExist = _unitOfWork.GetRepository<Member>().GetAll(X => X.Email == memberToUpdate.Email && X.Id != memberId).Any();
                var phoneExist = _unitOfWork.GetRepository<Member>().GetAll(X => X.Phone == memberToUpdate.Phone && X.Id != memberId).Any();

                var member =memberRepo. GetById(memberId);

                if (member is null) return false;
                #region Manual Mapping

                //member.Email = memberToUpdate.Email;
                //member.Phone = memberToUpdate.Phone;
                //member.Address.BuildingNumber = memberToUpdate.BuildingNumber;
                //member.Address.City = memberToUpdate.City;
                //member.Address.Street = memberToUpdate.Street;
                //member.UpdatedAt = DateTime.Now; 
                #endregion

                _mapper.Map(memberToUpdate, member);

                memberRepo.Update(member);

               return _unitOfWork.SaveChanges()>0;
            }
            catch (Exception)
            {

                return false;
            }
        }

        private bool IsEmailExist(string email)
        {
            return _unitOfWork.GetRepository<Member>().GetAll(X=>X.Email == email).Any();
        }

        private bool IsPhoneExist(string phone)
        {
            return _unitOfWork.GetRepository<Member>().GetAll(X=>X.Phone== phone).Any();
        }
    }
}
