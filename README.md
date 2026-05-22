<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:16A34A,50:15803D,100:14532D&height=220&section=header&text=Gym%20Management%20System&fontSize=52&fontColor=ffffff&fontAlignY=38&desc=ASP.NET%20Core%20MVC%20%7C%20EF%20Core%20%7C%20SQL%20Server%20%7C%20ASP.NET%20Identity&descSize=16&descAlignY=58&descColor=ffffff" width="100%"/>

</div>

<div align="center">

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-Visit%20Now-16A34A?style=for-the-badge)](http://gymmanagementsystem54.runasp.net/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Source%20Code-181717?style=for-the-badge&logo=github)](https://github.com/Fady519/GymManagementSystem)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Fady%20Kaiser-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/fady-kaiser/)

</div>

---

<div align="center">

## 🏋️ A production-ready Gym Management System — not just CRUD.

3-Layer Architecture. Role-Based Access Control. Real-Time Analytics.  
Built to handle real gym operations with enterprise-level code quality.

</div>

---

## 🖥️ Live Preview

<div align="center">

> 🔗 **[gymmanagementsystem54.runasp.net](http://gymmanagementsystem54.runasp.net/)**

> _Add screenshots here_

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🏗️ **3-Layer Architecture** | Clean DAL / BLL / Presentation separation of concerns |
| 🔐 **Role-Based Access Control** | 3 roles — Super Admin, Admin, Member — across 12+ controller actions |
| 📊 **Analytics Dashboard** | Real-time membership KPIs and session metrics |
| 🗃️ **Repository Pattern + Unit of Work** | Atomic transactions and clean data access abstraction |
| 🔄 **AutoMapper + DI** | 60%+ reduction in object-mapping boilerplate |
| 👤 **ASP.NET Identity** | Claims-based RBAC restricting sensitive operations by role |
| 🛡️ **Data Integrity** | Multi-step operations handled atomically via Unit of Work |

---

## 🏗️ Architecture

This system follows a strict **3-Layer Architecture** to enforce separation of concerns and maximize maintainability:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│   ASP.NET Core MVC · Controllers        │
│   Views · ViewModels · Identity Auth    │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Business Logic Layer            │
│   Services · Analytics Service          │
│   AutoMapper Profiles · DTOs            │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Data Access Layer               │
│   EF Core · Generic Repository          │
│   Unit of Work · SQL Server             │
└─────────────────────────────────────────┘
```

---

## 👥 User Roles & Permissions

| Role | Permissions |
|---|---|
| **Super Admin** | Full system access — manage admins, members, all settings |
| **Admin** | Manage memberships, sessions, view analytics dashboard |
| **Member** | View own profile, membership status, session history |

> Access is enforced via **ASP.NET Identity** with claims-based RBAC across **12+ controller actions**.

---

## 📊 Analytics Service

The built-in **Analytics Service** surfaces real-time KPIs for gym administrators:

```
✦ Active memberships count
✦ New member registrations (weekly / monthly)
✦ Session attendance metrics
✦ Revenue & membership plan breakdown
```

> Replaces manual reporting workflows — data is always live, never stale.

---

## 🛠️ Tech Stack

<div align="center">

![C#](https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=csharp&logoColor=white)
![ASP.NET Core MVC](https://img.shields.io/badge/ASP.NET%20Core%20MVC-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![EF Core](https://img.shields.io/badge/EF%20Core-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![SQL Server](https://img.shields.io/badge/SQL%20Server-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)
![ASP.NET Identity](https://img.shields.io/badge/ASP.NET%20Identity-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![AutoMapper](https://img.shields.io/badge/AutoMapper-BE0000?style=for-the-badge)
![LINQ](https://img.shields.io/badge/LINQ-239120?style=for-the-badge&logo=csharp&logoColor=white)

**Architecture & Patterns**

![3-Layer](https://img.shields.io/badge/3--Layer%20Architecture-16A34A?style=for-the-badge)
![Repository Pattern](https://img.shields.io/badge/Repository%20Pattern-15803D?style=for-the-badge)
![Unit of Work](https://img.shields.io/badge/Unit%20of%20Work-14532D?style=for-the-badge)
![SOLID](https://img.shields.io/badge/SOLID%20Principles-166534?style=for-the-badge)
![DI](https://img.shields.io/badge/Dependency%20Injection-16A34A?style=for-the-badge)

</div>

---

## 📁 Project Structure

```
GymManagementSystem/
│
├── DAL/                          # Data Access Layer
│   ├── Data/
│   │   └── AppDbContext.cs
│   ├── Entities/                 # Domain models
│   ├── Repositories/             # Generic + specific repositories
│   └── UnitOfWork/
│
├── BLL/                          # Business Logic Layer
│   ├── Services/
│   ├── Analytics/                # Analytics Service
│   ├── DTOs/
│   └── AutoMapper/               # Mapping profiles
│
└── GymManagementSystem/          # Presentation Layer
    ├── Controllers/              # 12+ secured controller actions
    ├── Views/
    ├── ViewModels/
    └── Program.cs                # DI, Identity, EF config
```

---

## ⚙️ Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- SQL Server (LocalDB or full instance)
- Visual Studio 2022 or VS Code

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/Fady519/GymManagementSystem.git
cd GymManagementSystem

# 2. Update connection string in appsettings.json
"ConnectionStrings": {
  "DefaultConnection": "Your SQL Server Connection String"
}

# 3. Apply migrations
dotnet ef database update

# 4. Run the app
dotnet run
```

### Default Seeded Accounts

| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@gym.com | Admin@123 |
| Admin | admin@gym.com | Admin@123 |
| Member | member@gym.com | Member@123 |

> ⚠️ Update these credentials after first login.

---

## 📬 Contact

<div align="center">

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Fady%20Kaiser-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/fady-kaiser/)
[![GitHub](https://img.shields.io/badge/GitHub-Fady519-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Fady519)
[![Portfolio](https://img.shields.io/badge/Portfolio-Live%20Now-6366F1?style=for-the-badge)](https://fady519.github.io/MyPortfolio2/)

</div>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:16A34A,50:15803D,100:14532D&height=100&section=footer" width="100%"/>

**⭐ If this project impressed you, drop a star — it means a lot!**

</div>
