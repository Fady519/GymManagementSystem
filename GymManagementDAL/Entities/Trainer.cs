using GymManagementDAL.Entities.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementDAL.Entities
{
    public class Trainer:GymUser
    {
        //HireDate==CreatedAt
        public Specialities Specialities { get; set; }

        #region Trainer-Session


        public ICollection<Session> Sessions { get; set; }
        #endregion
    }
}
