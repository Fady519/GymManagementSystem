# 🏋️ Gym Management System

A full-featured **Gym Management Web Application** built with **ASP.NET Core MVC** following clean **3-Layer Architecture**. Supports 3 distinct user roles with real-time analytics, secure access control, and scalable data handling.

🌐 **Live Demo:** [gymmanagementsystem54.runasp.net](http://gymmanagementsystem54.runasp.net)

---

## 📸 Screenshots

> _Add screenshots here_

---

## ✨ Features

- 🔐 **Role-Based Access Control** — 3 roles: Super Admin, Admin, Member with 12+ secured controller actions
- 📊 **Real-Time Analytics Dashboard** — Live KPIs for memberships, sessions, and revenue
- 🗃️ **Repository Pattern + Unit of Work** — Atomic transactions and clean data access abstraction
- 🔄 **AutoMapper + DI** — 60%+ less mapping boilerplate, improved testability
- 🏗️ **3-Layer Architecture** — Clear separation between DAL, BLL, and Presentation layers
- 👤 **ASP.NET Identity** — Secure authentication with claims-based RBAC

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Language | C# |
| Framework | ASP.NET Core MVC |
| ORM | Entity Framework Core |
| Database | SQL Server |
| Auth | ASP.NET Identity |
| Mapping | AutoMapper |
| Querying | LINQ |
| Architecture | 3-Layer + Repository Pattern + Unit of Work |

---

## 🏗️ Architecture Overview

```
├── DAL  (Data Access Layer)
│   ├── Repositories
│   ├── Unit of Work
│   └── EF Core DbContext
│
├── BLL  (Business Logic Layer)
│   ├── Services
│   ├── Analytics Service
│   └── AutoMapper Profiles
│
└── Presentation  (ASP.NET Core MVC)
    ├── Controllers
    ├── Views
    └── Identity & RBAC
```

---

## 🚀 Getting Started

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

---

## 👥 User Roles

| Role | Permissions |
|---|---|
| **Super Admin** | Full access — manage admins, members, settings |
| **Admin** | Manage memberships, sessions, view analytics |
| **Member** | View own profile, membership status |

---

## 📬 Contact

**Fady** — [LinkedIn](https://linkedin.com/in/your-profile) · [GitHub](https://github.com/Fady519)
