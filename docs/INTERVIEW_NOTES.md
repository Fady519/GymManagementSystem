# Interview Notes — Gym Management System

ملف مذاكرة: كل قرار في المشروع، اتعمل ليه، وإزاي تشرحه في الإنترفيو.
الإجابات المقترحة مكتوبة بالإنجليزي عشان أغلب الإنترفيوهات التقنية بتبقى بالإنجليزي.

---

## 1. Architecture — N-Tier (3 layers)

**يعني إيه:** المشروع متقسم 3 طبقات، وكل طبقة ليها مسؤولية واحدة:

| الطبقة | المشروع | مسؤوليتها |
|---|---|---|
| Presentation | `GymManagementAPI` | استقبال الـ HTTP requests والرد عليها (Controllers) |
| Business Logic | `GymManagementBLL` | قواعد الجيم (Services, DTOs, Validators) |
| Data Access | `GymManagementDAL` | الداتا بيز (Entities, DbContext, Repositories, Migrations) |

**سؤال متوقع:** Why did you split the project into layers?
> Separation of concerns. Controllers only handle HTTP, services contain the business rules, and the DAL only talks to the database. Each layer can change without breaking the others, and the business rules can be tested on their own.

---

## 2. Result Pattern (`Result` / `Error`)

**يعني إيه:** الـ Service بترجع `Result` فيه يا نجاح يا خطأ واضح، زي `Plan.NotFound` أو `Plan.NameTaken`، بدل ما ترجع `bool` أو `null` أو ترمي Exception.

**ليه:** الكود القديم كان بيرجع `false` في كل الحالات، فمكانش فيه طريقة تعرف الخطأ كان إيه. دلوقتي الـ Controller بيحوّل كل نوع خطأ لـ status code مناسب (404 / 409 / 400).

**سؤال متوقع:** Why not just throw exceptions?
> Exceptions are for unexpected failures. "Plan not found" or "name already taken" are expected business outcomes, so I return them as values. It's explicit, faster, and the API can map each error type to the right HTTP status code.

---

## 3. ProblemDetails (RFC 7807)

**يعني إيه:** كل الأخطاء بترجع بشكل JSON موحّد فيه `status` و `title` و `detail` و `code` و `traceId`.

**ليه:** الفرونت إند بيتعامل مع شكل واحد لكل الأخطاء. والـ `code` بيخليه يعرض رسالة مناسبة.

> I use the ProblemDetails standard so every error has the same JSON shape. The frontend reads the `code` field to show the right message, and the `traceId` links the error to the server logs.

---

## 4. Validation — FluentValidation

**يعني إيه:** قواعد التحقق من البيانات (الاسم من 2 لـ 50 حرف، السعر أكبر من صفر...) مكتوبة في كلاس منفصل لكل request. فيه Filter بيشغّلها أوتوماتيك قبل أي action.

> Validation rules live in validator classes, separate from the models, and a global action filter runs them automatically. Invalid requests get a 400 with the error for each field, and the controller code stays clean.

---

## 5. Global Exception Handler

**يعني إيه:** لو حصل خطأ مش متوقع، بيتسجّل كامل في الـ logs، والعميل بياخد رسالة عامة (500) من غير تفاصيل داخلية.

> Unexpected errors are logged with full details, but the client only gets a generic 500 response. Internal information like stack traces or SQL never leaks to the client.

---

## 6. Logging — Serilog + Correlation Id

**يعني إيه:** كل طلب بيتسجّل في الشاشة وفي ملف يومي. وكل طلب ليه رقم مميز (`X-Correlation-Id`)، فتقدر تلاقي كل الـ logs بتاعته.

> Each request gets a correlation id that is returned in the response header and added to every log line. When a user reports an error, I search the logs by that id.

---

## 7. Integration Tests

**يعني إيه:** الاختبارات بتشغّل الـ API الحقيقي في الذاكرة (`WebApplicationFactory`) على داتا بيز اختبار منفصلة، وبتبعت requests حقيقية.

> I test the whole pipeline: routing, validation, business rules and the real SQL Server database. A separate test database is created for each run, so tests never touch real data.

---

## 8. Unicode — `nvarchar` vs `varchar`

**المشكلة اللي كانت موجودة:** الأسماء كانت `varchar`، فأي اسم عربي كان بيتخزن "؟؟؟؟".

> `varchar` stores single-byte characters only. `nvarchar` stores Unicode, so it supports Arabic. I kept `varchar` only for emails and phone numbers because they're always ASCII.

---

## 9. Delete Behavior — Restrict vs Cascade

**المشكلة اللي كانت موجودة:** كل العلاقات كانت Cascade، فمسح مدرب كان بيمسح كل جلساته وحجوزاتها.

**دلوقتي:** كل العلاقات Restrict، يعني الداتا بيز بترفض الحذف لو فيه حاجة مرتبطة. الاستثناء الوحيد هو HealthRecord، لأنه جزء من بيانات العضو نفسه.

> Cascade delete is dangerous for business data: deleting one trainer could silently remove months of sessions and bookings. With Restrict, the database refuses the delete and the application must handle it on purpose.

---

## 10. Soft Delete + Global Query Filters

**يعني إيه:** المسح بيعلّم الصف إنه محذوف (`IsDeleted = true`) بدل ما يشيله من الداتا بيز. وفيه `HasQueryFilter` بيخفي الصفوف المحذوفة من كل الاستعلامات أوتوماتيك.

**بيتعمل فين:** في مكان واحد، `GymDbContext.SaveChangesAsync`: لو حاجة soft-deletable اتعلّمت إنها Deleted، بتتحول لـ Update.

> Deleted plans or members may still be referenced by old memberships and revenue reports, so I never physically delete them. The unique indexes are filtered (`WHERE IsDeleted = 0`), so a deleted plan's name can be reused.

---

## 11. Auditing (CreatedAt / UpdatedAt) in UTC

**يعني إيه:** `CreatedAt` و `UpdatedAt` بيتملوا أوتوماتيك عند كل حفظ، وكلهم UTC.

> Times are stored in UTC so they're correct no matter where the server runs, and the frontend converts them to the user's local time (Cairo). Filling them in SaveChanges means no service can forget.

---

## 12. Snapshot (Membership)

**يعني إيه:** الاشتراك بيحفظ نسخة من اسم الخطة وسعرها ومدتها وقت الشراء.

> Like an invoice. If the plan's price changes later, existing memberships keep the price the member actually paid, and revenue reports stay correct.

---

## 13. Stored vs Calculated Status

**القرار:** بنخزّن بس الحالات اللي بتحصل بفعل حد (Active / Frozen / Cancelled). حالة Expired بتتحسب من `EndDate <= now`.

> Expiry happens by itself as time passes. If I stored it, I would need a background job to update rows every day, and the data could be wrong between runs. Calculating it from EndDate is always correct.

---

## 14. Optimistic Concurrency — RowVersion

**المشكلة:** فاضل مكان واحد في الجلسة، واتنين بيحجزوا في نفس اللحظة.

**الحل:** عمود `RowVersion` بيتغير مع كل تعديل. لو اتنين عدّلوا نفس الصف في نفس الوقت، التاني بيفشل بدل ما الجلسة تتحجز أكتر من سعتها.

> I use optimistic concurrency with a SQL Server rowversion column. Conflicts are rare, so I don't lock rows. Instead, I detect the conflict on save and return a clear error.

---

## 15. Repository + Unit of Work

**يعني إيه:** `IGenericRepository<T>` فيه العمليات البسيطة (GetById, List, Any, Add, Remove). وفيه `Query()` للاستعلامات المعقدة (Include, Paging, Select). أما `UnitOfWork.SaveChangesAsync` فبيحفظ كل التعديلات مرة واحدة.

**ملاحظة مهمة:** كل الفلاتر `Expression<Func<T,bool>>`، فـ EF بيحوّلها لـ SQL. الكود القديم كان بيستخدم `Func`، وده كان بيسحب الجدول كله للذاكرة.

> The repository hides EF Core details for simple operations, and the unit of work makes all changes in one request save together in a single transaction.

---

## 16. Pagination on the Server

> Lists use `Skip/Take`, which becomes `OFFSET/FETCH` in SQL, plus a `COUNT`. The database returns only one page, so performance stays the same even with thousands of members.

---

## 17. Why no AutoMapper?

> AutoMapper became commercial from version 15, and the free version 14 has a known high-severity vulnerability (CVE-2026-32933). Manual mapping with small extension methods (`plan.ToResponse()`) is explicit, checked at compile time, and easy to debug.

---

## 18. Safe Database Migrations

الخطوات اللي اتعملت في الـ Migration الكبيرة (B2):
1. Backup للداتا بيز.
2. EF عمل الـ Migration، وبعدين اتراجعت يدوي. مثلاً EF كان هيمسح عمود `CategoryName` ويعمل عمود جديد فاضي، فاتغيّرت لـ `RenameColumn` عشان الداتا ماتضيعش.
3. اتضافت SQL تنقل الداتا للجداول الجديدة وتصلّح الداتا القديمة (التواريخ لـ UTC، وحساب EndDate الغلط).
4. اتجربت على نسخة من الداتا بيز الأول، وبعدين على الأصلية.

> I never trust a generated migration blindly. I review it, add SQL to move or fix existing data, and test it on a copy of the real database before running it on the real one.

---

# B3 — Authentication & Authorization

## 19. Authentication vs Authorization

**يعني إيه:**
- **Authentication** = إنت مين؟ (بنتأكد من الإيميل والباسورد، أو من الـ token).
- **Authorization** = مسموحلك تعمل إيه؟ (حسب الـ role بتاعك).

في الـ pipeline: `UseAuthentication()` الأول، وبعدها `UseAuthorization()`.

> Authentication answers "who are you?" — we check the password at login, then the JWT on every request. Authorization answers "what are you allowed to do?" — we check the user's role against a policy. 401 means "not logged in", 403 means "logged in but not allowed".

---

## 20. ASP.NET Core Identity

**يعني إيه:** مكتبة جاهزة من مايكروسوفت للمستخدمين: بتعمل hash للباسورد، وبتقفل الحساب بعد محاولات غلط، وبتدير الـ roles. إحنا مكتبناش ده بإيدينا.

**عملنا إيه:**
- `ApplicationUser : IdentityUser<int>`، وضفنا بس `FullName` و `IsActive` و `MustChangePassword`.
- بيانات الجيم (التليفون، تاريخ الميلاد...) فضلت في جدول `Members`، ومربوطة بالحساب عن طريق `UserId`.
- استخدمنا `AddIdentityCore` (من غير cookies ومن غير UI)، لأننا بنستخدم JWT.

> I didn't write my own password hashing. Identity hashes passwords with PBKDF2 and a salt, handles lockout and roles, and it's battle-tested. I kept the login account (AspNetUsers) separate from the gym profile (Members), linked by UserId, so a member can exist without an account (added by reception).

---

## 21. JWT (JSON Web Token)

**يعني إيه:** نص فيه 3 أجزاء: `header.payload.signature`.
- الـ payload فيه الـ claims: `sub` (رقم المستخدم)، `role`، `memberId`، ووقت الانتهاء `exp`.
- الـ signature بتتعمل بمفتاح سري موجود على السيرفر بس. لو حد غيّر حرف واحد في الـ token، الـ signature مش هتطابق، والـ API هيرفضه.

**مهم:** الـ payload **مش متشفّر**، أي حد يقدر يقراه (جرّب jwt.io). عشان كده مفيش أي حاجة سرية جواه.

> A JWT is signed, not encrypted. The server can trust its claims without a database call because only the server knows the signing key. I never put secrets inside it. The key is at least 256 bits and lives in User Secrets locally and in an environment variable in production.

---

## 22. Access Token + Refresh Token

| | Access token | Refresh token |
|---|---|---|
| المدة | 15 دقيقة | 7 أيام |
| بيتبعت فين | Header: `Authorization: Bearer ...` | Cookie اسمها `gym_refresh` |
| بيتخزن في الداتا بيز؟ | لأ | آه، بس الـ hash بتاعه (SHA-256) |

**ليه اتنين؟** الـ access token مايتلغيش قبل ما وقته يخلص. فبنخليه قصير (15 دقيقة). والـ refresh token بيجيب access token جديد من غير ما المستخدم يكتب الباسورد تاني.

> Short-lived access tokens limit the damage if one is stolen. The refresh token is long-lived but it's stored as a hash in the database, so we can revoke it (logout, disable user, password change).

---

## 23. Refresh Token Rotation & Reuse Detection

**Rotation:** كل مرة نستخدم الـ refresh token، بيتلغي، وبناخد واحد جديد.

**Reuse detection:** لو refresh token **اتستخدم قبل كده** رجع تاني، يبقى غالباً حد سرقه. فبنلغي **كل** الـ sessions بتاعة المستخدم ده، وهو يعمل login تاني.

> Each refresh token works once. If an already-used token comes back, either the attacker or the real user is holding a stolen copy, and we can't tell which. So we revoke all of that user's sessions and force a new login.

---

## 24. Why an httpOnly Cookie for the Refresh Token?

| Flag | بيعمل إيه |
|---|---|
| `HttpOnly` | الـ JavaScript مايقدرش يقراها، فهي في أمان من XSS |
| `Secure` | بتتبعت على HTTPS بس |
| `SameSite=Lax` | مابتتبعتش مع POST جاي من موقع تاني، فهي في أمان من CSRF |
| `Path=/api/auth` | بتتبعت لـ endpoints الـ auth بس، مش مع كل request |

> If the refresh token were in localStorage, any XSS bug could steal it. An httpOnly cookie can't be read by JavaScript. The access token is kept in memory on the frontend, so it's gone when the tab closes, and the cookie silently gets a new one.

---

## 25. Roles & Policies

**الـ roles:** `SuperAdmin`، `Admin`، `Trainer`، `Member`.

**الـ policies (قواعد ليها اسم):**

| Policy | مين مسموحله |
|---|---|
| `SuperAdminOnly` | SuperAdmin |
| `AdminAccess` | SuperAdmin, Admin |
| `TrainerAccess` | SuperAdmin, Admin, Trainer |
| `MemberAccess` | Member |

**Secure by default:** فيه `FallbackPolicy` بتقول إن أي endpoint محتاج login، إلا لو مكتوب عليه `[AllowAnonymous]` (زي login وعرض الباقات).

> I use named policies instead of repeating role lists in every controller. The fallback policy makes every endpoint require authentication by default, so forgetting an attribute fails safe, not open.

---

## 26. Account Lockout & Rate Limiting

- **Lockout:** بعد 5 باسوردات غلط ورا بعض، الحساب بيتقفل 15 دقيقة (Identity).
- **Rate limiting:** أقصى 10 requests في الدقيقة لكل IP على login / register / refresh. لو زاد، بيرجع `429` (built-in في .NET).
- **رسالة واحدة** لـ "الإيميل مش موجود" و"الباسورد غلط"، عشان محدش يعرف مين عنده حساب.

> Lockout protects one account from password guessing. Rate limiting protects the server from one IP hammering the login endpoint. And the same error for a wrong email or a wrong password prevents account enumeration.

---

## 27. Temporary Passwords (Admins & Trainers)

**يعني إيه:** الـ SuperAdmin بيعمل حساب Admin، فالسيستم بيعمل باسورد عشوائي (`RandomNumberGenerator`) ويظهر **مرة واحدة بس**. وأول ما الـ Admin يعمل login، بيكون `MustChangePassword = true`، ولازم يغيّره.

لما الباسورد بيتغيّر، كل الـ sessions القديمة بتتلغي.

> The temporary password is generated with a cryptographic RNG, shown once, and never stored in plain text. The user must change it on first login. Changing the password revokes all other sessions.

---

## 28. Register = 2 Tables in 1 Transaction

**المشكلة:** التسجيل بيكتب في جدولين: `AspNetUsers` و `Members`. ولو الأول نجح والتاني فشل، هيبقى عندنا حساب من غير member.

**الحل:** `BeginTransactionAsync` ثم `CommitAsync` في الآخر. لو حصل أي خطأ قبل الـ commit، الاتنين بيتلغوا.

**قرار business:** لو الإيميل موجود أصلاً كـ member (الريسبشن ضافه)، التسجيل بيرجع `409`، ولازم يكلّم الريسبشن. (B7: الأدمن هيبعتله invite بالإيميل). ده بيمنع إن حد ياخد بيانات member تاني.

> Registration writes two tables, so I wrap it in a transaction: either both rows are saved or neither. And if the email already belongs to a gym member, self-registration is refused, so nobody can take over someone else's membership by guessing their email.

---

## 29. Known Trade-off: Disabled User Still Has ≤ 15 Minutes

**يعني إيه:** لما نعمل disable لمستخدم، الـ refresh tokens بتاعته بتتلغي فوراً. بس الـ access token اللي معاه يفضل شغال لحد ما وقته يخلص (أقصى 15 دقيقة)، لأن الـ API مابيسألش الداتا بيز مع كل request.

> That's the classic JWT trade-off: stateless tokens are fast but can't be revoked instantly. With a 15-minute lifetime the window is small. If needed, I could check a "security stamp" on each request, at the cost of one database call per request.
