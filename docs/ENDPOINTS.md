# API Endpoints and Access

Generated from the running API by `EndpointSecurityTests`. Do not edit by hand.
The tests fail if an endpoint is anonymous or open to every role by mistake.

Total: 90 endpoints.

| Method | Route | Access | Roles | Rate limit |
|---|---|---|---|---|
| GET | `/api/analytics/attendance-rate` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/analytics/members-growth` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/analytics/plans-distribution` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/analytics/revenue` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/analytics/summary` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/analytics/top-categories` | AdminAccess | SuperAdmin, Admin |  |
| POST | `/api/auth/accept-invite` | Anonymous |  | auth |
| POST | `/api/auth/change-password` | Any logged-in user |  |  |
| POST | `/api/auth/forgot-password` | Anonymous |  | auth |
| POST | `/api/auth/login` | Anonymous |  | auth |
| POST | `/api/auth/logout` | Anonymous |  |  |
| GET | `/api/auth/me` | Any logged-in user |  |  |
| POST | `/api/auth/refresh` | Anonymous |  | auth |
| POST | `/api/auth/register` | Anonymous |  | auth |
| POST | `/api/auth/reset-password` | Anonymous |  | auth |
| POST | `/api/bookings` | BookingAccess | SuperAdmin, Admin, Member |  |
| POST | `/api/bookings/{id:int}/attend` | TrainerAccess | SuperAdmin, Admin, Trainer |  |
| POST | `/api/bookings/{id:int}/cancel` | BookingAccess | SuperAdmin, Admin, Member |  |
| GET | `/api/categories` | Anonymous |  |  |
| POST | `/api/categories` | AdminAccess | SuperAdmin, Admin |  |
| DELETE | `/api/categories/{id:int}` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/categories/{id:int}` | Anonymous |  |  |
| PUT | `/api/categories/{id:int}` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/check-ins` | AdminAccess | SuperAdmin, Admin |  |
| POST | `/api/check-ins` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/exports/check-ins` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/exports/members` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/exports/memberships` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/exports/payments` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/me` | MemberAccess | Member |  |
| PUT | `/api/me` | MemberAccess | Member |  |
| GET | `/api/me/bookings` | MemberAccess | Member |  |
| POST | `/api/me/bookings` | MemberAccess | Member |  |
| POST | `/api/me/bookings/{id:int}/cancel` | MemberAccess | Member |  |
| PUT | `/api/me/health-record` | MemberAccess | Member |  |
| GET | `/api/me/memberships` | MemberAccess | Member |  |
| GET | `/api/me/payments` | MemberAccess | Member |  |
| DELETE | `/api/me/photo` | MemberAccess | Member |  |
| PUT | `/api/me/photo` | MemberAccess | Member |  |
| GET | `/api/me/qr` | MemberAccess | Member |  |
| POST | `/api/me/qr/regenerate` | MemberAccess | Member |  |
| GET | `/api/members` | AdminAccess | SuperAdmin, Admin |  |
| POST | `/api/members` | AdminAccess | SuperAdmin, Admin |  |
| DELETE | `/api/members/{id:int}` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/members/{id:int}` | AdminAccess | SuperAdmin, Admin |  |
| PUT | `/api/members/{id:int}` | AdminAccess | SuperAdmin, Admin |  |
| POST | `/api/members/{id:int}/account` | AdminAccess | SuperAdmin, Admin |  |
| PUT | `/api/members/{id:int}/health-record` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/members/{id:int}/payments` | AdminAccess | SuperAdmin, Admin |  |
| DELETE | `/api/members/{id:int}/photo` | AdminAccess | SuperAdmin, Admin |  |
| PUT | `/api/members/{id:int}/photo` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/memberships` | AdminAccess | SuperAdmin, Admin |  |
| POST | `/api/memberships` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/memberships/expiring-soon` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/memberships/{id:int}` | AdminAccess | SuperAdmin, Admin |  |
| POST | `/api/memberships/{id:int}/cancel` | AdminAccess | SuperAdmin, Admin |  |
| POST | `/api/memberships/{id:int}/freeze` | AdminAccess | SuperAdmin, Admin |  |
| POST | `/api/memberships/{id:int}/renew` | AdminAccess | SuperAdmin, Admin |  |
| POST | `/api/memberships/{id:int}/unfreeze` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/payments` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/plans` | Anonymous |  |  |
| POST | `/api/plans` | AdminAccess | SuperAdmin, Admin |  |
| DELETE | `/api/plans/{id:int}` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/plans/{id:int}` | Anonymous |  |  |
| PUT | `/api/plans/{id:int}` | AdminAccess | SuperAdmin, Admin |  |
| PATCH | `/api/plans/{id:int}/status` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/sessions` | Anonymous |  |  |
| POST | `/api/sessions` | AdminAccess | SuperAdmin, Admin |  |
| DELETE | `/api/sessions/{id:int}` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/sessions/{id:int}` | Anonymous |  |  |
| PUT | `/api/sessions/{id:int}` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/sessions/{id:int}/available-members` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/sessions/{id:int}/bookings` | TrainerAccess | SuperAdmin, Admin, Trainer |  |
| POST | `/api/sessions/{id:int}/cancel` | AdminAccess | SuperAdmin, Admin |  |
| POST | `/api/trainer/bookings/{id:int}/attend` | TrainerOnly | Trainer |  |
| GET | `/api/trainer/me` | TrainerOnly | Trainer |  |
| GET | `/api/trainer/sessions` | TrainerOnly | Trainer |  |
| GET | `/api/trainer/sessions/{id:int}/bookings` | TrainerOnly | Trainer |  |
| GET | `/api/trainers` | AdminAccess | SuperAdmin, Admin |  |
| POST | `/api/trainers` | AdminAccess | SuperAdmin, Admin |  |
| DELETE | `/api/trainers/{id:int}` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/trainers/{id:int}` | AdminAccess | SuperAdmin, Admin |  |
| PUT | `/api/trainers/{id:int}` | AdminAccess | SuperAdmin, Admin |  |
| POST | `/api/trainers/{id:int}/account` | AdminAccess | SuperAdmin, Admin |  |
| GET | `/api/users` | SuperAdminOnly | SuperAdmin |  |
| POST | `/api/users/admins` | SuperAdminOnly | SuperAdmin |  |
| GET | `/api/users/{id:int}` | SuperAdminOnly | SuperAdmin |  |
| POST | `/api/users/{id:int}/resend-invite` | SuperAdminOnly | SuperAdmin |  |
| PATCH | `/api/users/{id:int}/status` | SuperAdminOnly | SuperAdmin |  |
| ANY | `/health` | Anonymous |  |  |
