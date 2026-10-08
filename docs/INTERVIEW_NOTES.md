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

---

# B4 — Members, Trainers & Categories

## 30. Server-side Search, Filter, Sort & Paging

**يعني إيه:** لما الفرونت يطلب `GET /api/members?search=fady&membershipState=Active&sortBy=Name&page=2&pageSize=20`، الداتا بيز هي اللي بتعمل البحث والفلترة والترتيب، وبترجع 20 صف بس. مش بنجيب كل الأعضاء في الميموري ونفلتر في C#.

**إزاي:** كل شرط بيتضاف على `IQueryable` بـ `Where`، وفي الآخر `Skip/Take` بيتحوّلوا لـ `OFFSET/FETCH` في SQL. وبنرجع `PagedResult` فيه `TotalCount` و `TotalPages` و `HasNextPage` عشان الفرونت يرسم الـ pagination.

**نقطة مهمة:** في الترتيب بنضيف `ThenBy(m => m.Id)`. لو عضوين ليهم نفس الاسم، من غيرها ممكن نفس العضو يظهر في صفحتين.

> Filtering, sorting and paging all run in SQL. I build the query step by step on `IQueryable`, and `Skip/Take` becomes `OFFSET/FETCH`. So the API reads only one page, even with 100,000 members. I always add the Id as a tie-breaker so pages are stable, and I cap the page size at 100 so nobody can ask for everything at once.

---

## 31. Calculated (not stored) Membership State

**يعني إيه:** حالة العضو (Active / Frozen / Expired / None) مش عمود في الداتا بيز. بتتحسب كل مرة من الاشتراكات بتاعته ومن التاريخ الحالي.

**ليه:** لو خزّناها، لازم حاجة (job) تغيّرها كل يوم لما الاشتراك يخلص، ولو الـ job وقفت تبقى الداتا غلط. لما بنحسبها مابتبقاش غلط أبداً.

**الفلتر:** بما إنها مش عمود، كل فلتر بيوصف الحالة بشروط على الاشتراكات (`Memberships.Any(...)`)، وده بيتحوّل لـ `EXISTS` في SQL.

> The state is derived from the memberships and the current time, so it can never be out of date. There's no nightly job that could fail. Filtering by state still runs in SQL because EF translates `Any()` into `EXISTS`.

---

## 32. Secure File Upload (Member Photo)

**الخطر:** أي حد ممكن يرفع `virus.exe` ويسمّيه `photo.jpg`. أو يرفع ملف 1 GB. أو يبعت اسم ملف زي `../../appsettings.json`.

**الحماية (كل نقطة سطر واحد تقريباً):**

| الخطر | الحل |
|---|---|
| ملف مش صورة باسم `.jpg` | بنقرا أول bytes في الملف (**magic bytes**): JPG بيبدأ بـ `FF D8 FF`، PNG بـ `89 50 4E 47`. الاسم والـ Content-Type مش بنثق فيهم |
| ملف كبير | أقصى 2 MB، و `[RequestSizeLimit]` بيوقف الطلب بدري |
| Path traversal (`../`) | اسم الملف بيتعمل بـ `Guid` على السيرفر، واسم المستخدم مش بيتستخدم خالص |
| المتصفح "يخمّن" نوع الملف | الهيدر `X-Content-Type-Options: nosniff` |

> I never trust the file name or the Content-Type header, because the client controls both. I check the first bytes of the file (magic bytes) to detect the real type. The file gets a random GUID name, so there's no path traversal and no name collisions. The size is limited to 2 MB, and static files are served with `nosniff`.

---

## 33. `IFileStorage` Abstraction

**يعني إيه:** الـ Service مش عارفة الصور بتتحفظ فين. هي بتنادي `IFileStorage.SaveAsync(...)` وخلاص. دلوقتي الـ implementation هو `LocalFileStorage` (فولدر `uploads` على السيرفر).

**ليه:** لو بعدين نقلنا الصور لـ Azure Blob أو Cloudinary، هنكتب كلاس جديد ونغيّر سطر واحد في الـ DI، والـ `MemberService` مش هيتغيّر. وفي التستات بنوجّه الصور لفولدر temp.

> The business layer depends on an interface, not on the disk. Today it's a local folder; tomorrow it could be cloud storage. I'd only add a new class and change one line of DI registration. That's the Dependency Inversion principle in practice.

---

## 34. Delete Rules + Soft Delete + Account Deactivation

**القواعد:**

| بنمسح | ممنوع لو... | الكود |
|---|---|---|
| Member | عنده اشتراك شغال (Active/Frozen) أو حجز جاي | `409 Member.HasActiveMembership` / `Member.HasUpcomingBookings` |
| Trainer | عنده sessions جاية | `409 Trainer.HasUpcomingSessions` |
| Category | فيه مدربين تخصصهم ده، أو sessions جاية | `409 Category.HasTrainers` / `Category.HasUpcomingSessions` |

**Soft delete:** الصف مابيتمسحش. `IsDeleted = true` والـ query filter بيخفيه. ليه؟ عشان التقارير والمدفوعات القديمة تفضل مظبوطة.

**الحساب:** لما نمسح مدرب أو عضو ليه حساب، الحساب بيتعمل disable وكل الـ sessions بتاعته بتتلغي، فمايقدرش يعمل login.

> Deletes are blocked with a clear 409 when they would break something, like a member with an active membership. Otherwise it's a soft delete, so history and reports stay correct. The linked login account is disabled at the same time, so a deleted trainer can't log in anymore.

---

## 35. Trainer + Account in One Transaction

**يعني إيه:** لما الأدمن يضيف مدرب، السيستم بيعمل 2 حاجات: صف في `Trainers` وحساب في `AspNetUsers` (Role = Trainer). الاتنين جوه transaction واحدة.

**الباسورد المؤقت:** بيظهر في الـ response مرة واحدة، والمدرب لازم يغيّره أول login (`MustChangePassword`). (في B7 هيتبعت بالإيميل).

**ميزة إضافية:** لو المدرب اتعدّل إيميله، إيميل الحساب بيتعدّل معاه، عشان يفضل يعرف يعمل login.

> Creating a trainer writes two tables, so both happen in one transaction: if the account fails (for example, the email is already used by another account), the trainer row isn't saved either. The temporary password is returned once and must be changed at first login.

---

## 36. Hand-edited Data Migration (enum → foreign key)

**المشكلة:** زمان تخصص المدرب كان enum (`Specialities = 3` يعني Boxing). دلوقتي بقى FK لجدول `Categories`. الـ EF اقترح `RenameColumn` بس. يعني رقم 3 كان هيتحوّل لـ `CategoryId = 3`. ده صح بالصدفة هنا، بس غلط كمبدأ، لأن الـ ids ممكن تختلف.

**الحل:** عدّلت الـ migration بإيدي:
1. أضفت `CategoryId` nullable.
2. SQL بيربط الـ enum بالكاتيجوري **بالاسم** (3 → 'Boxing').
3. خليت العمود NOT NULL، ومسحت العمود القديم، وأضفت الـ FK.

**قبل التطبيق:** جرّبتها على نسخة من الداتا بيز (restore من backup)، واتأكدت إن `Up` و `Down` شغالين.

> EF only sees the schema, not the meaning of the data, so I always review generated migrations. Here EF suggested a simple rename, which would have treated an enum number as a category id. I rewrote it to map the values by name, then tested both Up and Down on a restored copy of the database before touching the real one.

---

## 37. Arabic Names — `\p{L}`

**المشكلة:** regex زي `^[a-zA-Z ]+$` بيرفض "فادي قيصر".

**الحل:** `^[\p{L}\s.'-]+$`. الـ `\p{L}` معناها "أي حرف في أي لغة" (Unicode letter): عربي، إنجليزي، فرنساوي... بس من غير أرقام أو رموز.

> `\p{L}` matches any Unicode letter, so Arabic and English names are both valid, while digits and symbols are still rejected. The API is used in Egypt, so this matters.

---

## 38. The H6 Fix — Duplicate on Update

**البج القديم (H6):** في الـ MVC، لو عدّلت عضو وحطيت إيميل عضو تاني، الكود كان بيرجع `false` من غير ما يقول السبب.

**دلوقتي:** بنتشيك قبل الحفظ: "فيه عضو **تاني** (`Id != id`) بنفس الإيميل أو التليفون؟" لو آه، بنرجع `409 Member.EmailTaken` أو `Member.PhoneTaken`. والشرط `Id != id` هو اللي بيخلي العضو يحفظ بياناته من غير ما يتعارض مع نفسه. وفيه test لكل حالة.

> On update, the uniqueness check excludes the record itself (`Id != id`). Otherwise saving a member without changing the email would conflict with itself. Duplicates now return a clear 409 with a code, and there's a test for both cases.

---

# B5 — Sessions & Bookings

## 39. Last Seat Race — Optimistic Concurrency (`RowVersion`)

**المشكلة:** فاضل مكان واحد في الحصة، واتنين داسوا "احجز" في نفس اللحظة. الاتنين قروا "فيه مكان"، فالاتنين اتحجزوا والحصة عدّت سعتها.

**الحل:**
1. جدول `Sessions` فيه عمود `RowVersion`، وSQL Server بيغيّره مع كل تعديل.
2. مع كل حجز بنعدّل الحصة كمان (`session.UpdatedAt = now`)، فـ EF بيبعت: `UPDATE Sessions ... WHERE Id = @id AND RowVersion = @old`.
3. الأول بيعدّي. التاني مش بيلاقي الصف بالـ version القديمة، فـ EF بيرمي `DbUpdateConcurrencyException`، والحجز بتاعه بيتلغي.
4. بنعمل **retry**: نقرا تاني، نلاقيها ممتلية، فنرجع `409 Session.Full`.

**التست:** حجزين في نفس اللحظة (`Task.WhenAll`) على آخر مكان، وواحد بس بينجح.

> Every booking also updates the session row, so EF adds `WHERE RowVersion = @old`. If two requests race, the second one updates 0 rows, EF throws, its insert is rolled back, and I retry: re-read, re-check, and now it's full. That's optimistic concurrency: no locks while reading, the conflict is detected at save time.

---

## 40. Time Overlap Check (H13)

**القاعدة:** فترتين بيتداخلوا لو كل واحدة بتبدأ قبل ما التانية تخلص:

`a.Start < b.End && b.Start < a.End`

بنستخدمها في حاجتين: المدرب مايبقاش عنده حصتين في نفس الوقت (`Session.TrainerBusy`)، والعضو مايحجزش حصتين متداخلين (`Booking.MemberBusy`). حصة بتبدأ بالظبط وقت ما التانية بتخلص مش تداخل.

> Two ranges overlap when each starts before the other ends. One condition covers every case, and it runs in SQL. Back-to-back sessions are allowed.

---

## 41. N+1 Problem (H9)

**المشكلة القديمة:** query لجلب الحصص، وبعدين query لكل حصة عشان نعد الحجوزات. 50 حصة = 51 query.

**دلوقتي:** `Select` واحد فيه `s.Bookings.Count(...)`، وEF بيحوّله لـ subquery جوه نفس الـ SQL. صفحة كاملة = query واحد.

> N+1 means one query for the list plus one per row. I project to a DTO and count inside the `Select`, so EF generates a single SQL query for the whole page.

---

## 42. Calculated Session State

الحالة (Upcoming / Ongoing / Completed / Cancelled) مش متخزنة. اللي متخزن بس `Scheduled` أو `Cancelled`، والباقي بيتحسب من الوقت الحالي بالـ UTC. نفس فكرة حالة العضو في #31.

> Only the result of an action is stored (Scheduled or Cancelled). Whether a session is upcoming, running or finished depends on the clock, so it's calculated and can never be out of date.

---

## 43. Business Rules Fixed in B5

| الكود القديم | المشكلة | دلوقتي |
|---|---|---|
| H4 | شرط السعة كان `== 0` | `>=` + RowVersion |
| H5 | "الحضور للحصة الجارية بس" كان تعليق بس | متطبق: `409 Booking.AttendanceNotOpen` |
| H7 | السعة كانت بتقبل 0 | من 1 لـ 25 (من الـ config) |
| H8 | قاعدة الحذف كانت معكوسة وبتمسح الحصص القديمة | الحذف للحصص الجاية اللي مفيهاش حجوزات بس، والقديمة read-only |
| C7 | قايمة "الأعضاء المتاحين" كانت بتقارن بـ Id دايماً 0 | بتستبعد اللي حاجز فعلاً، وبتعرض اللي اشتراكه صالح يوم الحصة بس |

> The old app had these rules written in comments but not in code. Now each one returns a clear error code, and each one has a test.

---

## 44. Who Can Do What (Resource-based Authorization)

الـ policy بتقول **مين يقدر يوصل للـ endpoint** (مثلاً Trainer). بس "المدرب ده هو مدرب الحصة دي؟" ده سؤال عن **البيانات نفسها**، فبنتشيكه في الـ service:

- العضو بيحجز لنفسه بس: الـ memberId بييجي من التوكن، مش من الـ request.
- العضو يلغي حجزه هو بس (`403 Booking.NotYours`).
- الحضور: الأدمن أو مدرب الحصة نفسها بس (`403 Session.NotYours`).

**ملحوظة:** `[Authorize]` على الـ action **بيتضاف** على اللي على الـ controller (لازم الاتنين يعدّوا)، عشان كده حطيت الـ policy على كل action لوحده في `SessionsController`.

> Policies answer "which roles can call this endpoint". Ownership ("is this your booking?") depends on the data, so the service checks it using the ids from the token. A member's id always comes from the token, never from the request body.

---

## 45. Settings in Config (`IOptions` + `ValidateOnStart`)

السعة القصوى ومدة الحصة وموعد الإلغاء (ساعتين) متخزنين في `appsettings.json` في `SessionRules`. ولو حد كتب قيمة غلط، التطبيق مش بيشتغل أصلاً (`ValidateOnStart`) بدل ما يشتغل غلط.

> Business values that may change live in configuration, bound to a typed options class with validation. Invalid values stop the app at startup instead of causing wrong behaviour later.

---

## 46. UTC Everywhere

كل الأوقات في الداتا بيز بالـ UTC، والـ API بيقبل الوقت بالـ UTC بس (لازم ينتهي بـ `Z`). الفرونت إند بيحوّل للتوقيت المحلي وهو بيعرض. كده "6 مساءً" معناها نفس الحاجة على أي سيرفر وأي متصفح.

> All times are stored and accepted in UTC, and the frontend converts them for display. That avoids bugs when the server and the users are in different time zones, or when daylight saving time changes.

---

# B6: Memberships, Payments and Freeze

## 47. One `SaveChanges` = One Transaction (C1 fix)

في الكود القديم الاشتراك كان بيتسجل لوحده، ولو حصل خطأ بعده مكانش فيه دفع مسجّل. دلوقتي الاشتراك والدفع بيتضافوا الاتنين، وبعدين `SaveChangesAsync` **مرة واحدة**. EF بيعمل الـ SQL كله جوه Transaction واحدة: يا الاتنين يتسجلوا، يا ولا واحد. محتاجين `BeginTransaction` بس لما يكون فيه **أكتر من** `SaveChanges`.

> EF Core wraps a single SaveChanges call in a database transaction. I add the membership and its payment to the context and save once, so both rows are written or neither is. An explicit transaction is only needed when one operation calls SaveChanges more than once.

---

## 48. Soft Cancel Instead of Delete (H12 fix)

الكود القديم كان بيمسح الاشتراك من الداتا بيز، وكمان بلينك `GET`. دلوقتي الإلغاء `POST /api/memberships/{id}/cancel`، وبيغيّر الحالة لـ `Cancelled` ويسجل `CancelledAt` والسبب. لو فيه فلوس راجعة بتتسجل كـ Payment نوعه `Refund`. كده التقارير والفلوس فاضلة صح.

**ليه مش `GET`؟** الـ `GET` المفروض ما يغيرش حاجة. المتصفح أو أي preview للينك ممكن يفتحه لوحده.

> Money history must never disappear, so cancelling only changes the status and a refund is a new payment row. State changes use POST because GET must be safe: browsers, crawlers and link previews can call a GET by themselves.

---

## 49. Stored Status vs Calculated State

في الداتا بيز بنخزن بس الحالات اللي بتحصل بفعل حد: `Active / Frozen / Cancelled`. أما `Expired` و `Upcoming` فبنحسبهم من التواريخ في الـ SQL (`CASE`). يعني مفيش Background Job يغيّر الحالة كل يوم، ومستحيل الحالة تبقى غلط.

وحتى التجميد بيخلص لوحده: لو `FrozenUntil` عدى، الاشتراك بيتحسب `Active`.

> I store only states caused by an action. "Expired" and "Upcoming" are calculated from the dates inside the query, so there is no nightly job and the state can't be out of date. A freeze also ends by itself when FrozenUntil passes.

---

## 50. Early Renewal (Queued Membership)

لو العضو جدد قبل ما اشتراكه يخلص، الاشتراك الجديد بيبدأ **من يوم انتهاء القديم** (حالته `Upcoming`)، فمش بيخسر ولا يوم. ولو كان خلص، الجديد بيبدأ النهارده. ومسموح بتجديد واحد بس "مستني".

القواعد اللي بتحمي ده:
- مينفعش تشتري اشتراك جديد وعندك واحد شغال (`Membership.AlreadyHasMembership`). استخدم التجديد.
- مينفعش تلغي الاشتراك الحالي وفيه تجديد مستني بعده (`Membership.HasQueuedRenewal`)، عشان ما يبقاش فيه فراغ.

> An early renewal creates a new membership that starts exactly when the current one ends, so the member doesn't lose paid days. Only one renewal can wait, and the current membership can't be cancelled while a renewal waits after it.

---

## 51. Snapshot of the Plan

الاشتراك بيحتفظ بنسخة من اسم الخطة وسعرها ومدتها وقت الشراء (زي الفاتورة). لو الأدمن غيّر سعر الخطة بكره، الاشتراكات القديمة والإيرادات ما بتتغيرش. ولما العضو يجدد على خطة تانية (ترقية)، بنعمل نسخة من الخطة الجديدة.

> A membership copies the plan's name, price and duration at purchase time, like an invoice. Changing a plan later only affects new memberships, so old revenue numbers stay correct.

---

## 52. Freeze Rules

- التجميد بيبدأ النهارده، من 3 لـ 30 يوم، والإجمالي للاشتراك ما يعديش 30 يوم (القيم في `MembershipRules`).
- `EndDate` بيزيد بعدد الأيام، فالعضو مش بيخسر أيام. ولو فيه تجديد مستني، بيتزحزح هو كمان بنفس الأيام.
- الحجوزات اللي بتقع جوه فترة التجميد بتتلغي، ومينفعش يحجز فيها (`Booking.NoValidMembership`).
- **فك التجميد بدري:** اليوم اللي بدأ بيتحسب مستخدم (تقريب لفوق)، والباقي بيتخصم من `EndDate`.

> Freezing moves the end date (and a waiting renewal) forward by the frozen days and cancels bookings inside the freeze. Unfreezing early gives back the unused days; a started day counts as used. All limits come from configuration.

---

## 53. Who Received the Money?

كل دفعة فيها `ReceivedByUserId`، ودي رقم حساب الموظف اللي عامل Login (من الـ token، مش من الـ body). ده مهم لمراجعة الخزنة آخر اليوم.

> Every payment stores the staff account that received it, taken from the access token, so the cash can be audited per employee.

---

## 54. `IgnoreQueryFilters` for History

الأعضاء عندهم Soft Delete (Global Query Filter). لو عضو اتمسح، مدفوعاته واشتراكاته القديمة لسه لازم تظهر في التقارير، عشان كده قوايم الاشتراكات والمدفوعات بتستخدم `IgnoreQueryFilters()`.

> Soft-deleted members are hidden by a global query filter, but their old payments are still revenue. The payments and memberships lists ignore the filter so reports stay complete.

---

# B7: Email, Password Reset, Invites and Portals

## 55. Invite Instead of a Temporary Password

قبل كده الأدمن كان بيعمل حساب للمدرب ويشوف باسورد مؤقت ويديهوله. ده معناه إن الأدمن **عارف** الباسورد، والباسورد ممكن يتبعت على واتساب. دلوقتي الحساب بيتعمل **من غير باسورد خالص** (`PasswordHash = NULL`، فمستحيل حد يعمل Login)، وبيتبعت إيميل فيه لينك. الشخص بيفتح اللينك ويختار الباسورد بنفسه. محدش غيره عمره هيعرفه.

ده نفس الشيء لكل الحسابات: الأدمن، والمدرب، والعضو (`POST /api/members/{id}/account`). ولو الإيميل ما وصلش، نفس الـ endpoint بيبعته تاني (`inviteSent: false` في الرد معناه إن الإيميل فشل).

> Accounts are created without any password, so nobody can log in until the owner opens the invite link and chooses one. The admin never sees or sends a password. The response says whether the email was sent, and the same endpoint resends it while the invite is pending.

---

## 56. How the Reset / Invite Token Works

الـ token مش متخزن في الداتا بيز. ASP.NET Identity بيعمله بـ **Data Protection**: بيشفّر (رقم اليوزر + الغرض + الوقت + الـ Security Stamp). لما يرجع، بيفك التشفير ويتأكد من كل حاجة.

- **صالح لمدة:** الـ reset ساعة، والـ invite 3 أيام (من `Email` في appsettings).
- **مرة واحدة بس:** تغيير الباسورد بيغيّر الـ Security Stamp، فأي token قديم بيبقى غلط.
- **مينفعش يتبدلوا:** عملنا `InviteTokenProvider` منفصل باسم مختلف، فـ token بتاع reset مينفعش يستخدم كـ invite.
- بنحوله لـ **Base64Url** عشان يبقى آمن جوه اللينك.

> Identity tokens are encrypted, not stored: they contain the user id, purpose, time and security stamp. Changing the password changes the stamp, so a link works only once. Invite links use their own token provider with a longer lifetime, so a reset token can't be used as an invite.

---

## 57. Forgot Password Never Reveals Who Has an Account

`forgot-password` بيرجع **نفس الرد بالظبط** (200 + نفس الرسالة) سواء الإيميل موجود أو لأ. لو كان بيقول "الإيميل مش موجود"، أي حد يقدر يجرب إيميلات ويعرف مين مشترك في الجيم (User Enumeration). وكمان الـ endpoint عليه Rate Limit.

ولو الحساب لسه ما قبلش الدعوة (مالوش باسورد)، بنبعتله الدعوة تاني بدل لينك reset.

**نقطة للتحسين:** وقت الرد ممكن يفرق شوية (لأن إرسال الإيميل بياخد وقت). الحل الكامل إن الإيميل يتبعت في Background Queue، وده ممكن نعمله بعدين.

> The endpoint always returns the same response, so it can't be used to discover which emails have accounts, and it is rate limited. A remaining weakness is response timing; the full fix is sending emails from a background queue.

---

## 58. After a Reset: Sign Out Everywhere

بعد ما الباسورد يتغير من لينك الـ reset:
- كل الـ Refresh Tokens القديمة بتتلغي، فأي جهاز كان فاتح (أو حد سرق الحساب) بيخرج.
- `EmailConfirmed = true` لأنه أثبت إن الإيميل بتاعه.
- عداد المحاولات الغلط والـ Lockout بيتصفروا.

وبنتأكد من الـ token **قبل** ما نشوف الحساب Disabled ولا لأ، وقبل ما نغير أي حاجة.

> A successful reset revokes every refresh token, confirms the email and clears the lockout. The token is verified before anything is checked or changed.

---

## 59. Email Abstraction (`IEmailSender`) + smtp4dev

- `IEmailSender` (الـ "بوسطة") في الـ BLL، والتنفيذ الحقيقي `SmtpEmailSender` بـ **MailKit** في الـ API.
- `AppEmailService` بيعمل محتوى الإيميل (اللينك، القالب، وقت الجلسة بتوقيت القاهرة).
- في التطوير بنستخدم **smtp4dev**: سيرفر إيميل وهمي على `localhost:25` وبيعرض الإيميلات في المتصفح، فمفيش إيميل حقيقي بيخرج.
- في التستات `FakeEmailSender` بيحفظ الإيميلات في الذاكرة، والتست بياخد الـ token من اللينك.

> The business layer depends on an IEmailSender interface. Production uses MailKit over SMTP, development uses smtp4dev (a fake local mail server with a web inbox), and tests use an in-memory fake so they can read the links.

---

## 60. A Failed Email Never Breaks the Operation

`SendAsync` عمره ما بيرمي Exception: لو السيرفر واقع بيكتب Warning في الـ Log ويرجع `false`. والإيميل دايماً بيتبعت **بعد** الـ Commit:
- لو المدرب اتعمل والإيميل فشل: المدرب موجود، و`inviteSent: false`، والأدمن يبعته تاني.
- لو الجلسة اتلغت والإيميل فشل: الإلغاء حصل خلاص.
- ومستحيل نبعت إيميل عن حاجة اتعملها Rollback.

وعمرنا ما بنكتب محتوى الإيميل في الـ Log لأن فيه لينكات سرية.

> Emails are sent only after the database commit, and the sender returns false instead of throwing. So a mail outage never undoes a saved change, and we never email about a change that was rolled back. Email bodies are never logged because they contain one-time links.

---

## 61. Portals: The Id Comes From the Token, Not the URL

`/api/me/*` (العضو) و `/api/trainer/*` (المدرب) مفيهمش أي id في الـ URL. الـ `memberId` و `trainerId` بيتقروا من الـ Access Token. يعني العضو مستحيل يغيّر رقم في اللينك ويشوف بيانات عضو تاني (IDOR).

- العضو على `/api/members` أو المدرب على `/api/members` بياخد 403.
- `GET /api/trainer/sessions?trainerId=5`: الـ `trainerId` اللي جاي بيتشال ويتحط بتاع الـ token.
- لو الحساب Member بس مش مربوط بعضو: 403 `Auth.NotAMember`.

> Portal endpoints never take the member or trainer id from the URL; it is read from the access token. That makes IDOR impossible: changing a number in the URL can't reach someone else's data.

---

## 62. What a Member May Edit About Himself

العضو يقدر يغيّر **التليفون والعنوان والـ Health Record والصورة** بس. الاسم والإيميل وتاريخ الميلاد بيتغيروا من الريسبشن، لأنهم بيانات هوية (والإيميل هو اسم الدخول). الـ `UpdateMyProfileRequest` فيه `Phone` و`Address` بس، فلو بعت `name` في الـ JSON بيتجاهل.

> The self-service DTO only contains the fields a member may change. Identity data (name, email, date of birth) is changed by reception, so extra JSON fields are simply ignored.

---

## 63. Reusing Business Rules in the Portals

الـ portals مش بتكرر الـ logic. "أحجز لنفسي" بتنادي نفس `BookingService.CreateAsync` بتاع الريسبشن (العضوية، السعة، التعارض، الـ concurrency)، و"أسجل حضور" بتنادي نفس `MarkAttendedAsync` اللي بيتأكد إن الجلسة بتاعة المدرب ده وشغالة دلوقتي. الـ Controller بس بيحدد مين اللي بينادي.

> The portal controllers are thin: they call the same services as the admin endpoints, so every business rule lives in one place. The only difference is that the caller's identity comes from the token.

---

# B8: Analytics, QR Check-in and Export

## 64. Reports Are Calculated in SQL, Not in Memory

كل أرقام الداشبورد (الإيراد، عدد الأعضاء، نسبة الحضور، توزيع الخطط) بتتحسب بـ `GroupBy` و`Count` و`Sum` جوه الـ Query، فـ EF بيحولها لـ SQL والسيرفر بيرجع **الأرقام بس**. عمرنا ما بنعمل `ToList()` لجدول المدفوعات كله ونجمع في C#. لو الجيم فيه 100 ألف دفعة، الفرق بين إنك تنقل 100 ألف صف أو 30 رقم.

الأيام اللي مفيهاش فلوس بنكمّلها بصفر في C# عشان الرسم البياني ميبقاش فيه فجوات. والإيراد الشهري بنجمعه من الأرقام اليومية (اللي هي أصلاً متجمعة في SQL).

> All dashboard numbers are aggregated by the database with GroupBy, Count and Sum, so only the final numbers travel over the network. C# only fills empty days with zeros so the chart has no gaps.

---

## 65. Time Zones: "Today" Means Cairo, Not UTC

الأوقات متخزنة UTC (صح). بس "إيراد يوم 5" معناه يوم 5 **بتوقيت القاهرة**: دفعة الساعة 1 بالليل بتوقيت القاهرة لسه UTC بتاعها اليوم اللي قبله. ومصر رجّعت التوقيت الصيفي، فالفرق مرة ساعتين ومرة 3، يعني مينفعش نضيف رقم ثابت.

- في SQL: `EF.Functions.AtTimeZone(...)` بيتحول لـ `AT TIME ZONE 'Egypt Standard Time'`، وSQL Server عارف التوقيت الصيفي.
- في C#: `GymTimeZone` (Singleton) بيحول ويحسب بداية اليوم بالـ UTC.
- اسم المنطقة الزمنية بقى في `"Gym": { "TimeZoneId" }` بدل ما كان جوه إعدادات الإيميل، وعليه `ValidateOnStart`: لو الاسم غلط البرنامج مش هيشتغل خالص بدل ما يغلط في التقارير.

> Times are stored in UTC, but business days are Cairo days, and Egypt has daylight saving, so a fixed offset is wrong. SQL groups with AT TIME ZONE and C# uses a single GymTimeZone service. The time zone is validated at startup so a typo fails fast.

---

## 66. Two Old Dashboard Bugs Fixed (C6 / M8)

- **M8:** "الأعضاء النشطين" كان بيعد **العضويات** مش **الأعضاء**. عضو جدد قبل ما القديمة تخلص كان بيتعد مرتين. دلوقتي `Select(MemberId).Distinct().Count()`.
- **C6:** عدد "الجلسات الشغالة دلوقتي" كان فيه `x.EndDate >= x.EndDate`، يعني بيقارن العمود بنفسه، فالشرط دايماً true وأي جلسة بدأت كانت بتتعد "شغالة" حتى لو خلصت من شهر. دلوقتي: `StartDate <= now && EndDate > now`.

وكل واحدة عليها تست بيثبت إنها مش هترجع.

> Active members are now counted as distinct members, not memberships, so a renewal doesn't count twice. The ongoing-sessions count compared EndDate with itself, which is always true; now it means started and not ended yet. Both fixes have regression tests.

---

## 67. One Check-in Per Day, Enforced by the Database

القاعدة: العضو يدخل **مرة واحدة في اليوم**. أول محاولة في اليوم Allowed، وأي محاولة بعدها Denied بسبب `AlreadyCheckedInToday`.

الـ Check في الكود لوحده مش كفاية: لو اتنين في الريسبشن عملوا Scan لنفس الكود في نفس اللحظة، الاتنين هيشوفوا "لسه ما دخلش". عشان كده:
- عمود `Day` (تاريخ القاهرة) متخزن في الجدول.
- **Filtered Unique Index** على `(MemberId, Day)` بشرط `Result = 'Allowed'`. يعني الـ Denied تتكرر عادي، بس Allowed واحدة بس في اليوم.
- لو الحفظ فشل بسبب الـ Index (`DbUpdateException`)، بنشيل التغيير ونسجل المحاولة Denied بدل ما نرجع 500.

ليه خزّنا `Day` ومحسبناهوش من `CheckedInAt`؟ عشان الـ Index محتاج عمود ثابت، ولأن اليوم بتوقيت القاهرة مش UTC.

> The rule is checked in code, but the guarantee comes from a filtered unique index on (MemberId, Day) for allowed rows only. If two scans race, the second insert fails, and we record it as denied instead of returning an error. The Cairo date is stored because an index needs a real column.

---

## 68. The QR Code Is a Random Token, Not the Member Id

لو الـ QR فيه رقم العضو (`1`, `2`, ...)، أي حد يقدر يعمل QR لرقم تاني ويدخل. فكل عضو ليه `CheckInToken`: 32 حرف عشوائي (128 bit) من `RandomNumberGenerator`.

- الأعضاء القدام خدوا كود من الـ Migration نفسها (`DEFAULT` بـ `NEWID()`، وSQL Server بيدي كل صف قيمة مختلفة). جربناها على نسخة من الداتا بيز الأول.
- العضو يقدر يعمل كود جديد (`POST /api/me/qr/regenerate`) لو صوّر الكود وبعته لحد، والقديم بيبطل فوراً.
- الـ API بيرجع الكود كـ Text، والفرونت إند هو اللي بيرسم الـ QR.
- الكود متخزن عادي مش Hashed: قيمته قليلة (بيدخّل الجيم بس)، والموظف بيشوف صورة العضو واسمه مع كل Scan.

> The QR contains a random 128-bit token, not the member id, so codes can't be guessed. Existing members got codes from the migration default, and a member can regenerate a leaked code. It's stored in plain text because its value is low and staff see the member's photo on every scan.

---

## 69. Denied Scans Are Logged Too

كل Scan لكود معروف بيتسجل، حتى لو Denied، ومعاه السبب (منتهية، متجمدة، لسه ما بدأتش، مالوش عضوية، دخل النهارده) واسم الموظف اللي عمل الـ Scan. ده بيفيد الإدارة: مين بيحاول يدخل بعضوية منتهية؟ (فرصة تجديد). والرد **200 في الحالتين** لأن الطلب نفسه نجح، والنتيجة جوه الـ Body. الكود المش معروف بس هو اللي بيرجع 404.

> Every scan of a known code is stored with its result and reason, including denials, which is useful for follow-ups and audits. Both outcomes return 200 because the request succeeded; only an unknown code returns 404.

---

## 70. Safe CSV and Real Excel Files

- **CSV:** بيتكتب UTF-8 **مع BOM**، لأن من غيره Excel بيفتح الأسماء العربي حروف غريبة. وأي قيمة فيها `,` أو `"` أو سطر جديد بتتحط بين `"..."`.
- **CSV Injection:** لو اسم عضو بيبدأ بـ `=` أو `+` أو `-` أو `@`، Excel ممكن يشغله كـ Formula. فبنحط قبله `'` عشان يتعرض كنص.
- **Excel (ClosedXML):** الأرقام والتواريخ بتتكتب كأرقام وتواريخ حقيقية (مش نص)، فالأدمن يقدر يجمع ويفلتر. والصف الأول Header ثابت وعليه Filter.
- الاسترداد بيتكتب **بالسالب** في ملف المدفوعات، فمجموع العمود = صافي الإيراد.

> CSV files are UTF-8 with a BOM so Arabic opens correctly in Excel, values are properly quoted, and cells starting with = + - @ are prefixed to prevent formula injection. Excel files use typed cells, a frozen header and filters. Refunds are negative so the column sums to net revenue.

---

## 71. Export Row Limit (and Why No Streaming Yet)

الملف بيتبني في الذاكرة الأول وبعدين بيتبعت. عشان كده عليه حد: `Exports:MaxRows` (10,000). بنجيب `MaxRows + 1` صف: لو رجع أكتر من الحد، نرجع 400 `Export.TooManyRows` ونقول للأدمن يضيّق الفلتر، بدل ما السيرفر يستهلك ميموري كتير.

الخطوة الجاية لو الداتا كبرت: CSV بـ **Streaming** (نكتب صف صف في الـ Response). ملف Excel صعب يتعمل Streaming لأنه ZIP.

> Files are built in memory, so exports are capped. We fetch max + 1 rows; if there are more, the user gets a clear 400 and narrows the filter. The next step for big data would be streaming CSV row by row.

---

## 72. Exports Reuse the List Filters

ملف الـ Export بيطلع **نفس اللي الأدمن شايفه في الجدول**. عملنا method خاصة `ListQuery(query)` في كل Service، والـ list والـ export الاتنين بيستخدموها. فأي فلتر جديد بيشتغل في الاتنين أوتوماتيك، ومستحيل الملف يطلع مختلف عن الشاشة.

> The paged list and the export share one private method that builds the filtered query, so the downloaded file always matches what the admin sees, and a new filter works in both places.

---

# B9: Hardening and Backend Delivery

## 73. Security Review as Code (Endpoint Allowlist Test)

بدل ما نراجع الـ Controllers بالعين، عملنا تست بيقرا **كل الـ Endpoints** من `EndpointDataSource` (90 endpoint) ويتأكد إن:
- أي Endpoint من غير تسجيل دخول (AllowAnonymous) لازم يكون في **قائمة مسموحة** مكتوبة في التست (الكتالوج العام، Login، Register، Reset...، و`/health`).
- أي Endpoint متاح لأي حد مسجل دخول (من غير Policy) لازم يكون في قائمة تانية صغيرة (`GET /api/auth/me` و`change-password`).
- Endpoints الـ Auth الحساسة عليها Rate Limit.

فلو حد ضاف Endpoint جديد ونسي الـ `[Authorize(Policy = ...)]`، التست بيفشل فوراً. وكمان عندنا **Fallback Policy** بتقفل أي حاجة مش متعلم عليها. والتست بيطلع ملف `docs/ENDPOINTS.md` فيه كل Endpoint ومين يقدر يستخدمه.

> Instead of reviewing controllers by eye, a test reads every endpoint from EndpointDataSource. Anonymous endpoints and "any logged-in user" endpoints must be in explicit allowlists, and sensitive auth endpoints must be rate limited. A new endpoint without a policy fails the build. The same test generates docs/ENDPOINTS.md, a table of every route and who can call it.

---

## 74. Security Headers (and Why OnStarting)

عملنا Middleware بيضيف Headers لكل Response:
- `X-Content-Type-Options: nosniff`: المتصفح ميخمنش نوع الملف (مهم للصور اللي بيرفعها الأعضاء).
- `X-Frame-Options: DENY` و`frame-ancestors 'none'`: محدش يحط الـ API جوه iframe (Clickjacking).
- `Referrer-Policy: no-referrer`.
- `Content-Security-Policy: default-src 'none'`: الـ API بيرجع JSON بس، فمفيش سبب لأي Script. **ما عدا `/swagger`** لأن صفحته محتاجة Scripts وStyles.
- `Cache-Control: no-store` على `/api`، عشان بيانات الأعضاء متتخزنش في Cache.
- وشلنا Header الـ `Server: Kestrel` عشان منقولش للمهاجم إحنا شغالين على إيه.

الـ Headers بتتضاف في `Response.OnStarting` مش قبل الـ `next()`، لأن الـ Exception Handler **بيمسح الـ Headers** لما يحصل Error. كده حتى الـ 500 عليها نفس الحماية، وفيه تست بيتأكد من ده.

> A middleware adds nosniff, frame denial, no-referrer, a strict CSP (except on Swagger, which needs scripts) and no-store on API responses, and the Server header is removed. Headers are added in OnStarting because the exception handler clears headers, so even error responses are protected. Tests check all of this.

---

## 75. Swagger Shows the Real Security of Each Endpoint

قبل كده كان فيه قفل 🔒 على **كل** Endpoint في Swagger، حتى Login. عملنا `AuthResponsesOperationFilter` بيبص على كل Endpoint ويضيف:
- القفل (Bearer) بس لو الـ Endpoint محتاج تسجيل دخول.
- Response `401` لو محتاج تسجيل دخول، و`403` لو عليه Policy (يعني محتاج Role معين)، و`429` لو عليه Rate Limit.

فاللي بيقرا الـ Docs (أو بيعمل Frontend) يعرف من غير ما يجرب: محتاج Token؟ ممكن ياخد 403؟

> An operation filter marks only protected endpoints with the Bearer lock and documents 401, 403 (when a policy applies) and 429 (when rate limited), so the docs tell the truth about each endpoint.

---

## 76. The OpenAPI Contract Snapshot

حفظنا `docs/openapi.json` في الريبو، وفيه تست بيجيب الـ Swagger JSON من الـ API ويقارنه بالملف. لو حد غيّر شكل Response أو اسم Field من غير قصد، التست بيفشل ويوريه الفرق. ولو التغيير مقصود، بيعمل Regenerate للملف ويبان في الـ Git Diff.

ده مهم للـ Frontend: الـ Next.js هيولّد الـ TypeScript Types من الملف ده، فالعقد بين الاتنين ثابت ومتراجع.

> docs/openapi.json is committed and a test compares it with the live Swagger document, so any accidental contract change fails the build and intended changes show up in the diff. The Next.js frontend will generate its TypeScript types from this file.

---

## 77. Performance Review: Indexes That Match the Queries

راجعنا كل Query في الـ Services. مكانش فيه N+1 ولا تحميل جداول كاملة في الميموري. اللي اتصلح:
- **Indexes جديدة** على الأعمدة اللي التقارير والفلاتر بتستخدمها: Bookings `(SessionId, Status)`، CheckIns `CheckedInAt` و`(MemberId, CheckedInAt)`، Memberships `EndDate` و`CreatedAt`.
- معلومة مهمة: الـ **Filtered Index** (زي `WHERE Status = 'Booked'`) مينفعش SQL Server يستخدمه لـ Query مش فيها نفس الشرط. فكان لازم Index عادي للتقارير.
- الـ Migration اتجربت على **نسخة** من الداتا الأول، وبعد Backup.
- **Paging Tiebreaker:** لو بترتب بالاسم وفيه اسمين زي بعض، الترتيب مش مضمون، وممكن عضو يظهر في صفحتين أو ميظهرش خالص. فضفنا `.ThenBy(x => x.Id)`.
- عدد "الاشتراكات اللي قربت تخلص" في الداشبورد بقى `Count` في SQL بدل ما نجيب الليستة ونعدها.

حاجات بسيطة سبناها وموثقة: عدد الـ Round Trips في ملخص الداشبورد (~11)، والإيميلات بتتبعت جوه الـ Request.

> A review found no N+1 queries or in-memory scans. We added indexes that match the report and filter queries (a filtered index can't serve a query without the same filter), tested the migration on a copy after a backup, added Id tiebreakers so paging is stable, and moved a dashboard count into SQL. Minor items, like about 11 round trips in the summary and inline emails, are documented.

---

## 78. The Demo Data Seed

أمر `dotnet run -- --seed-demo` بيملا الداتابيز بداتا واقعية: 6 مدربين، 40 عضو، اشتراكات وتجديدات وإلغاء باسترداد وتجميد، 240 حصة، أكتر من 1300 حجز، وحوالي 950 Check-in.
- **Idempotent:** لو اتشغل تاني بيقول "Demo data already exists" ومبيكررش حاجة.
- **Transaction واحدة:** يا كله يتسجل يا ولا حاجة.
- **`new Random(2026)`:** نفس الداتا كل مرة، فالتستات والـ Screenshots ثابتة.
- **التواريخ نسبية لـ "النهارده"** (بتوقيت القاهرة)، فالداشبورد دايماً فيه داتا حديثة مهما شغلناه امتى.
- **بيمشي على قواعد البيزنس:** مفيش حجز من غير اشتراك ساري، ومفيش اشتراكين متداخلين لنفس العضو. وفيه تست بيتأكد من القواعد دي على الداتا اللي اتولدت (والتست ده لقى فعلاً اشتراك متداخل واتصلح).
- `CreatedAt` بقى بيتحط أوتوماتيك **بس لو فاضي**، عشان الـ Seed يقدر يعمل عضو "اشترك من 80 يوم".

> A --seed-demo command creates realistic data. It is idempotent, runs in one transaction, uses a fixed random seed, and uses dates relative to today in Cairo time, so the dashboard always looks alive. It follows the business rules, and a test checks them on the generated data; that test caught an overlapping membership. CreatedAt is only auto-set when empty, so the seed can backdate rows.

---

## 79. Demo Accounts Without a Password in the Code

فيه 3 حسابات: `admin@demo.gym` و`trainer@demo.gym` و`member@demo.gym`. الباسورد **مش مكتوب في الكود**، بييجي من `DemoData:Password` (User Secrets على الجهاز، و Environment Variable على السيرفر). لو مش موجود، الـ Seed بيرفض يشتغل. كده محدش يقدر يعرف الباسورد من الـ GitHub.

> Three demo accounts (admin, trainer, member) get their password from configuration (user secrets locally, an environment variable in production). Without it the seed refuses to run, so the password never appears in the repository.

---

## 80. Postman Collection Tests, and the Bug They Found

ضفنا Tests على مستوى الـ Collection كلها بتشتغل مع كل Request: مفيش 500، والـ Errors كلها `application/problem+json` فيها `status` و`title`، والـ Security Headers موجودة. والـ Collection بقت تتشغل كلها مرة واحدة بالـ **Runner** (أو `newman`) أكتر من مرة: إيميلات وتليفونات عشوائية، وتسجيل دخول بحسابات الديمو في أول كل Portal، والحذف في فولدر **Cleanup** في الآخر.

الـ Runner لقى **Bug حقيقي**: رفع صورة من غير ملف كان بيرجع **500**. السبب: الـ `IFormFile photo` مكانش Nullable، وإحنا قافلين الـ Required التلقائي، فكان بيوصل `null` ويضرب. الحل: `IFormFile? photo` ونرجع 400 `File.Empty`، وضفنا تست عشان ميرجعش تاني.

> Collection-level Postman tests check every response: no 500s, errors are problem+json, and the security headers are present. The collection now runs end to end, repeatedly, with newman. It found a real bug: uploading a photo without a file returned 500 because the parameter was non-nullable; it now returns 400 File.Empty, with a regression test.

---

## 81. Why Swagger Is On in Production

ده مشروع Portfolio، فالـ Swagger هو **واجهة العرض** للي بيراجع الشغل: يقدر يشوف كل Endpoint ويجربه بحساب الديمو. ده آمن لأن الحماية في الـ Authorization نفسه (كل Endpoint عليه Policy ومتراجع بالتست)، مش في إخفاء الـ Docs. في شركة حقيقية ممكن نقفله أو نحطه ورا تسجيل دخول.

> This is a portfolio project, so Swagger in production is the showcase where reviewers can try every endpoint with a demo account. It is safe because security comes from authorization on each endpoint, which is tested, not from hiding the docs. A real company might disable it or put it behind login.

---

# F0: Frontend Setup and Design System

## 82. One Repo, Two Apps, One Origin

الواجهة في فولدر `gym-web` جوه نفس الـ Repo (Monorepo)، منفصلة تماماً عن الباك. المتصفح **مبيكلمش الـ API مباشرة**: بيبعت لـ `/api/...` على نفس عنوان الواجهة، و`next.config.ts` فيه **Rewrites** بتحوّل الطلب للـ API.

الفايدة:
- مفيش **CORS** خالص، لأن المتصفح شايف عنوان واحد.
- الـ Refresh Token Cookie بقت **First-party**، فمش هتتقفل من المتصفحات اللي بتمنع Third-party Cookies.
- عنوان الـ API متغير واحد `API_URL`، بنغيره وقت النشر بس.

> The frontend lives in the same repo but is a separate app. The browser only calls its own origin, and Next.js rewrites /api to the ASP.NET Core API. That removes CORS entirely and keeps the refresh cookie first-party. The API address is one environment variable.

---

## 83. TypeScript Types Generated From the API Contract

مبنكتبش Types الـ DTOs بإيدينا. `npm run gen:api` بيقرا `docs/openapi.json` (اللي الباك بيطلعه ومتراجع بتست) ويولّد `src/types/api.d.ts`. لو الباك غيّر اسم Field، بنعمل Regenerate والـ Build بيفشل في كل مكان بيستخدم الاسم القديم.

وعشان الأنواع تطلع مظبوطة، فعّلنا في Swagger `SupportNonNullableReferenceTypes()`: كده `string` في C# بقت `string` في TypeScript، و`string?` بقت `string | null`. قبلها كل النصوص كانت `string | null` والكود كان هيتملي Checks ملهاش لازمة.

> DTO types are generated from openapi.json, never written by hand, so a renamed field breaks the frontend build instead of production. We enabled non-nullable reference type support in Swagger so C# nullability maps exactly to TypeScript.

---

## 84. Server State vs Client State

فيه نوعين داتا، وكل نوع ليه أداة:
- **Server State** (الأعضاء، الخطط، الحجوزات): بتيجي من الـ API وممكن تتغير من حد تاني. دي مع **TanStack Query**: Cache، Loading/Error، Retry، وتحديث بعد أي تعديل.
- **Client State** (مين مسجل دخول، السايدبار مفتوح ولا لأ): ملك المتصفح بس. دي مع **Redux Toolkit**.

ومبنحطش داتا السيرفر في Redux، عشان مايبقاش عندنا نسختين من نفس الداتا.

الـ Access Token متخزن **في الذاكرة بس** (Redux)، مش في `localStorage`، عشان أي Script غريب (XSS) ميقدرش يقراه من الـ Storage. ولما الصفحة تتعمل Refresh، الـ Cookie بتجيب Token جديد (ده في F1).

> Server data (members, plans) lives in TanStack Query, which handles caching, loading and error states, and refetching. Client-only state (the logged-in user, UI toggles) lives in Redux Toolkit. Server data is never copied into Redux. The access token is kept in memory, not localStorage, so an injected script can't read it from storage.

---

## 85. One Axios Client, One Error Type

فيه Axios Instance واحد للتطبيق كله:
- **Request Interceptor** بيضيف `Authorization: Bearer ...` لوحده.
- **Response Interceptor** بيحوّل أي Error لـ `ApiError` واحد فيه `status` و`code` (زي `Membership.Overlap`) ورسالة مفهومة و Errors لكل Field.

فالصفحات عمرها ما بتتعامل مع Axios Errors ولا بتفك JSON الـ ProblemDetails بنفسها. والـ QueryClient مبيعملش Retry لأي 4xx، لأن 404 أو 403 مش هيتصلحوا بالإعادة.

> A single Axios instance adds the bearer token and converts every failure into one typed ApiError (status, API error code, message, field errors), so components never parse Problem Details themselves. Queries don't retry 4xx errors because they won't succeed on retry.

---

## 86. Design Tokens and Dark Mode

الألوان كلها **CSS Variables** في `globals.css` (`--primary`، `--success`، `--warning`...)، وكل Component في shadcn/ui بيستخدمها. اللون الأساسي هو أزرق اللوجو بتاع النسخة القديمة (`#1E1EB4`). تغيير لون في مكان واحد بيغيّره في الموقع كله.

الـ Dark Mode بـ `next-themes`: بيحط Class اسمه `dark` على الصفحة **قبل** ما React يشتغل، فمفيش وميض أبيض. والـ shadcn/ui مش مكتبة بنعملها Install، دي Components بتتنسخ جوه المشروع، فنقدر نعدّل فيها براحتنا.

> All colors are CSS variables used by every shadcn/ui component, so the brand blue is defined once. Dark mode uses next-themes, which sets the class before React loads to avoid a flash. shadcn/ui components are copied into the project, so we fully own them.

---

## 87. A Next.js 16 Gotcha: No Random Values While Prerendering

Next.js 16 مع **Cache Components** بيعمل Prerender للصفحة وقت الـ Build، وبيرفض أي قيمة عشوائية (`Math.random()`) تتحسب وقت الـ Render، لأنها هتتجمد في الـ HTML. الـ Build وقع لأن `combineReducers` في Redux بيستخدم `Math.random()` جواه. الحل: نعمل `combineReducers` مرة واحدة على مستوى الملف، و`configureStore` بس جوه الـ Component.

والـ Store نفسه بيتعمل **مرة لكل Tab** جوه `useState`، مش Global، لأن السيرفر بيعمل Render لمستخدمين كتير في نفس الوقت، وStore مشترك ممكن يسرّب بيانات مستخدم لمستخدم تاني.

> With Cache Components, Next.js 16 rejects random values computed during prerendering. Redux's combineReducers calls Math.random, so we build the root reducer once at module level and only create the store inside the component. The store is created per browser tab, never shared on the server, so one user's state can't leak to another.

---

## 88. Calling a Local HTTPS API From Node.js

المتصفح بيثق في شهادة الـ HTTPS بتاعة ASP.NET على الجهاز، لكن Node.js (اللي بيعمل الـ Rewrite) مبيثقش فيها، فكان بيرجع 500. الحل: Script صغير بيشتغل قبل `npm run dev` ويطلّع الجزء العام من الشهادة لفولدر `.certs` (متجاهل في Git)، وبعدين `NODE_EXTRA_CA_CERTS` بيقول لـ Node يثق فيها. **مقفلناش التحقق من الشهادات**، وده الحل الآمن.

> The browser trusts the ASP.NET Core dev certificate but Node.js didn't, so the proxy failed. A pre-dev script exports the certificate's public part to a git-ignored folder, and NODE_EXTRA_CA_CERTS tells Node to trust it. TLS verification is never disabled.

---

## 89. No Dead UI: Everything on Screen Is Real

قاعدة في المشروع: **أي حاجة المستخدم بيشوفها لازم تكون حقيقية**. كل رقم وخطة وبرنامج وحصة في الصفحة الرئيسية جاي من الـ API (أقل سعر في الشهر، عدد المدربين، عدد الحصص الجاية، الأماكن الفاضية في كل حصة). وكل زرار بيعمل حاجة فعلاً. زراير زي "اشترك" و"احجز" مش هتظهر غير لما الصفحة بتاعتها تبقى جاهزة.

ومثال على إن الداتا بتتحسب مش بتتكتب: علامة "Best value" بتروح للخطة اللي **سعرها في الشهر أقل**، مش لأغلى خطة، وكل خطة بتعرض بتوفر كام في المية مقارنة بأغلى سعر شهري.

وكل جزء بيحمّل داتا ليه 3 حالات: Skeleton وهو بيحمّل، ورسالة واضحة وزرار Try again لو فشل، وحالة فاضية بكلام مناسب لو مفيش داتا.

> Everything a visitor sees is real: every number, plan, program and class comes from the API, and every button works. Actions like sign-up or booking only appear once their pages exist. Values are computed, not hard-coded; for example, "Best value" goes to the lowest price per month. Every data section has loading, error-with-retry and empty states.

---

# F1: Auth, Layouts and Route Protection

## 90. Where the Tokens Live

الـ **Access Token** (15 دقيقة) متخزن في الذاكرة بس (Redux)، مش في `localStorage`، عشان لو حصل XSS الـ Script ميلاقيهوش متخزن. والـ **Refresh Token** (7 أيام) في Cookie نوعها `HttpOnly`، يعني JavaScript مش قادر يقراها أصلاً، ومسارها `/api/auth` بس، فمبتتبعتش غير لـ Endpoints الـ Auth.

العيب إن الـ Access Token بيضيع لما الصفحة تتعمل Refresh، فأول ما التطبيق يفتح بنطلب `/api/auth/refresh` ونرجّع الجلسة من غير ما المستخدم يحس.

> The access token (15 minutes) is kept in memory only, never in localStorage, so an XSS script can't read it from storage. The refresh token (7 days) is an HttpOnly cookie scoped to /api/auth, so JavaScript can't read it at all. Because memory is lost on reload, the app calls /api/auth/refresh once on startup to restore the session silently.

---

## 91. Silent Refresh With a 401 Interceptor

لما أي Request يرجع **401** لأن الـ Access Token خلص، الـ Interceptor بتاع Axios بيعمل Refresh مرة واحدة ويعيد نفس الـ Request بالتوكن الجديد. المستخدم مبيشوفش أي خطأ.

وفيه شرطين مهمين: الـ Retry بيحصل **مرة واحدة بس** لكل Request (علامة `_retried`)، و**مبيحصلش** على Endpoints زي login وregister، لأن الـ 401 هناك معناها "باسورد غلط" مش "التوكن خلص". وطلب الـ Refresh نفسه بيروح من Axios Instance تانية من غير Interceptors، عشان لو فشل ميعملش Refresh للأبد.

> When a request fails with 401 because the access token expired, the Axios interceptor refreshes once and replays the request, so the user never notices. Each request is retried at most once, auth endpoints like login are excluded (their 401 means wrong credentials), and the refresh call uses a separate Axios instance without interceptors to avoid infinite loops.

---

## 92. Refresh Token Rotation Needs Single-Flight

الباك بيعمل **Rotation**: كل Refresh Token بيشتغل مرة واحدة، ولو نفس التوكن اتبعت تاني، الباك بيعتبره مسروق ويقفل **كل** جلسات المستخدم. يعني لو طلبين عملوا Refresh في نفس اللحظة، المستخدم هيتطرد.

عشان كده `refreshSession()` **Single-Flight**: لو فيه Refresh شغال، أي حد تاني بيطلب بياخد نفس الـ Promise. ولو المستخدم فاتح الموقع في كذا Tab، بنستخدم **Web Locks API** (`navigator.locks`) فالـ Tabs التانية بتستنى، وبعدين بتبعت الـ Cookie الجديدة مش القديمة. ودي كمان بتحمي من React Strict Mode اللي بيشغّل الـ Effect مرتين في الـ Development.

> The API rotates refresh tokens and treats a reused token as theft, signing the user out everywhere. So two refreshes at the same moment would log the user out. refreshSession() is single-flight: concurrent callers share one promise, and the Web Locks API makes other tabs wait so they send the new cookie, not the used one. This also covers React Strict Mode running effects twice in development.

---

## 93. Route Protection in Three Layers

الحماية على 3 مستويات:

1. **`proxy.ts`** (اسمه كان Middleware قبل Next.js 16): بيشتغل على السيرفر قبل الصفحة. لو مفيش جلسة بيحوّل لـ `/login?next=...`، ولو عضو فتح `/dashboard` بيحوّله لـ `/me`.
2. **`AppShell`** في المتصفح: مبيعرضش أي صفحة غير لما يتأكد من المستخدم ودوره، وبيجبر اللي عنده باسورد مؤقت يغيّره الأول.
3. **الـ API**: ده الحماية الحقيقية. كل Endpoint بيتأكد من الـ JWT والـ Role.

الـ Proxy مش بيقدر يشوف الـ Refresh Cookie (مسارها `/api/auth`)، فبنحط Cookie صغيرة مقروءة اسمها `pf_session` فيها المنطقة بس (`admin`/`trainer`/`member`). دي **للـ UX مش للأمان**: لو حد غيّرها، هيشوف Shell فاضي والـ API هيرفض كل طلباته.

> Protection has three layers: proxy.ts redirects on the server before the page loads, the AppShell guard in the browser renders nothing until the user and role are known, and the API is the real enforcement (JWT and roles on every endpoint). The proxy can't see the HttpOnly refresh cookie, so a small readable hint cookie holds only the area. It is for UX, not security: a forged hint shows an empty shell and the API rejects every request.

---

## 94. Role-Based Areas and Safe Redirects

كل دور ليه منطقة بـ Prefix واحد: الأدمن `/dashboard/...`، المدرب `/trainer/...`، العضو `/me/...`، و`/account` للكل. ده بيخلي الحماية سطر واحد: نشوف المسار بيبدأ بإيه.

وبعد اللوجين بنرجّع المستخدم للصفحة اللي كان عايزها من `?next=`، بس **بعد ما نتأكد** إنها مسار داخلي (بيبدأ بـ `/` واحدة) وإنها من منطقته. غير كده بيروح للصفحة الرئيسية بتاعته. ده بيمنع **Open Redirect** زي `/login?next=https://evil.com`.

> Each role has one URL prefix (/dashboard, /trainer, /me; /account is shared), so access checks are a simple prefix match. After login the user returns to ?next= only if it is an internal path inside their own area; otherwise they go to their home page. This prevents open-redirect attacks like /login?next=https://evil.com.

---

## 95. Forms: Same Rules on Both Sides

الفورمز بـ **React Hook Form + Zod**. قواعد Zod منسوخة من الـ FluentValidation في الباك بنفس الأرقام (طول الاسم، رقم الموبايل المصري، الباسورد القوي، السن من 12 لـ 100)، فأغلب الأخطاء بتظهر قبل ما الطلب يتبعت.

وأخطاء السيرفر بتظهر **تحت الحقل الصح**: أخطاء الـ 400 بتيجي بأسماء الحقول، وأكواد زي `Auth.EmailTaken` و`Auth.PhoneTaken` متربوطة بحقل الإيميل والموبايل. وأي خطأ تاني بيظهر فوق الفورم. ده كله في Helper واحد `applyServerErrors` بتستخدمه كل الفورمز.

> Forms use React Hook Form with Zod schemas that copy the backend FluentValidation rules exactly, so most mistakes are caught before sending. Server errors land under the right field: 400 validation errors by field name, and known conflict codes like Auth.EmailTaken map to their field; anything else shows at the top. One applyServerErrors helper does this for every form.

---

## 96. Two Bugs Only a Real Browser Found

**الأول: Strict Mode والـ Store.** في الـ Development، React بيشغّل الـ `useState` Initializer مرتين ويرمي نتيجة منهم. كنا بنسلّم الـ Store لـ Axios من جوه الـ Initializer، فـ Axios أحياناً كان ماسك الـ Store المرمي، والطلبات بتروح من غير توكن (401). الحل: نسلّم الـ Store اللي `useState` رجّعه فعلاً.

**التاني: Hydration Mismatch.** Next.js بيعمل Hydration للصفحة على أجزاء، فالـ Session Check ممكن يخلص قبل ما الـ Header يتعمله Hydration، فيظهر "Log in" مكان الـ Placeholder اللي جه من السيرفر. الحل: Hook اسمه `useHydrated` بيرجّع `false` لحد ما الـ Hydration يخلص، فأول Render بيطابق السيرفر.

الاتنين اتكشفوا بـ Script بيشغّل Edge ويعمل لوجين حقيقي من الفورم، مش بـ curl.

> Two bugs only showed up in a real browser. First, React Strict Mode runs the useState initializer twice and discards one result; the API client was injected from inside it and sometimes held the discarded store, so requests had no token. Fixed by injecting the store useState actually returned. Second, selective hydration let the session check finish before the header hydrated, causing a mismatch; a useHydrated hook makes the first render match the server.

---

## 97. Dashboards Built Only From Real Data

كل صفحة رئيسية بتعرض داتا حقيقية من الـ API:

- **الأدمن**: الأعضاء النشطين، إيراد الشهر، الـ Check-ins، الحصص الجاية، ونسبة الأعضاء النشطين. بتتحدث لوحدها كل دقيقة، وفيه زرار Refresh.
- **المدرب**: تخصصه، الحصة الجاية، وحصصه الجاية بنسبة الحجز في كل واحدة.
- **العضو**: كارت الاشتراك (الأيام الباقية، المدة اللي عدّت، التجميد، التجديد الجاي)، بياناته، وتاريخ اشتراكاته. ولو مفيش اشتراك، فيه زرار يوديه للخطط في الصفحة الرئيسية.

والـ Sidebar مفيهوش غير الصفحات الموجودة فعلاً، وكل مرحلة بتضيف صفحاتها.

> Each role's home page shows only real API data: admin KPIs that auto-refresh every minute, the trainer's upcoming classes with live booking fill, and the member's membership card with days left, freeze and renewal info. The sidebar only lists pages that exist; each phase adds its own.
---

# F2: Admin Core (Tables, Plans, Members, Trainers, Categories)

## 98. The URL Is the Source of Truth for Lists

حالة أي جدول (البحث، الفلاتر، الترتيب، رقم الصفحة، عدد الصفوف) متخزنة في الـ **URL** مش في `useState`. مثال: `/dashboard/members?state=Active&gender=Female&sortBy=Name&dir=asc&page=2`.

الفايدة: لو عملت Reload الصفحة بترجع زي ما هي، ولو بعت اللينك لزميلك هيشوف نفس النتيجة، وزرار Back في المتصفح بيرجع للفلتر اللي قبله. كل ده من Hook واحد `useListParams`: بيقرا القيم، وبيكتبها بـ `router.replace`، وبيمسح القيم الفاضية عشان اللينك يفضل نضيف، وأي تغيير غير الصفحة نفسها بيرجّع لصفحة 1.

> List state (search, filters, sort, page, page size) lives in the URL, not in component state. Reloading keeps the view, links can be shared, and Back works. One useListParams hook reads and writes it with router.replace, drops empty values, and resets to page 1 whenever anything except the page changes.

---

## 99. A Headless Table With Server-Side Paging

الجدول معمول بـ **TanStack Table v9**، وهي مكتبة **Headless**: بتدير الأعمدة والصفوف بس، والشكل كله بتاعنا (shadcn). عملنا Component واحد `DataTable` بتستخدمه كل الصفحات، وفيه الـ Skeleton والحالة الفاضية والترتيب والضغط على الصف.

الترتيب والصفحات **على السيرفر**: الجدول مبيرتبش حاجة بنفسه، هو بيقول "المستخدم عايز يرتب بالاسم" والصفحة بتحط ده في الـ URL، والـ API يرجّع الصفحة المطلوبة بس مع العدد الكلي. فلو عندنا 10,000 عضو، المتصفح بيستلم 10 بس.

> The table uses TanStack Table v9, a headless library: it manages columns and rows while the markup is ours. One reusable DataTable handles skeletons, empty states, sortable headers and row clicks. Sorting and paging happen on the server: the table only reports the user's choice, the page writes it to the URL, and the API returns one page plus the total count.

---

## 100. When to Filter on the Server and When in the Browser

مش كل جدول محتاج فلترة على السيرفر. **الأعضاء** ممكن يبقوا آلاف، فالبحث والفلتر والصفحات على السيرفر. لكن **الخطط** والتصنيفات عددها صغير ومحدود (5 أو 10)، فبنجيبهم مرة واحدة ونفلتر في المتصفح. ده كمان بيدينا العدد جنب كل Tab (All 5، On sale 5، Hidden 0) من غير طلبات زيادة.

القاعدة: لو الداتا ممكن تكبر من غير حد، الفلترة على السيرفر. لو صغيرة ومحدودة بطبيعتها، في المتصفح أبسط وأسرع.

> Members can grow to thousands, so search, filters and paging run on the server. Plans and categories are small, bounded lists, so we load them once and filter in the browser, which also gives the tab counts for free. Rule of thumb: unbounded data is filtered on the server, small bounded data in the browser.

---

## 101. Debounced Search Without Losing Keystrokes

البحث بيستنى **300ms** بعد آخر حرف قبل ما يحدّث الـ URL (Debounce)، عشان منبعتش طلب مع كل حرف.

بس فيه مشكلة خفية: الـ URL بيتحدث متأخر شوية، فلو الـ Input بياخد قيمته من الـ URL ممكن يرجع لقيمة قديمة والمستخدم لسه بيكتب، والحروف تضيع. الحل: الـ Input بيحتفظ بآخر قيمة **بعتها** وآخر قيمة **شافها** في الـ URL، ومبيقبلش قيمة من الـ URL غير لو اتغيرت من برّه (زي زرار Clear filters أو زرار Back).

> Search waits 300 ms after the last keystroke before updating the URL. The subtle bug: the URL catches up later, and syncing the input from it could overwrite what the user is still typing. The input remembers what it sent and what it last saw in the URL, and only accepts a URL value that changed from outside (Clear filters, Back button).

---

## 102. Updating the Cache vs Refetching

بعد أي تعديل بنستخدم طريقتين في **TanStack Query**:

- **Invalidate**: نقول للكاش "الداتا دي قديمة" فيجيبها تاني. بنستخدمه للقوايم، لأن عضو جديد ممكن يغيّر الترتيب والعدد والصفحات.
- **setQueryData**: الـ API بيرجّع العضو بعد التعديل، فبنحطه في الكاش على طول. صفحة العضو بتتحدث فوراً من غير طلب زيادة.

ولما نعدّل تصنيف، بنعمل Invalidate كمان لقايمة المدربين، لأن اسم التخصص بيظهر جنب كل مدرب. لازم تفكر: التعديل ده بيأثر على أنهي شاشات تانية؟

> After a change we either invalidate (lists, because one new row can change order, counts and pages) or write the API response straight into the cache with setQueryData (the member's own page updates instantly with no extra request). Renaming a category also invalidates the trainers list, because each trainer shows their speciality name.

---

## 103. Shared Form Sections With FormProvider

العنوان موجود في فورم العضو وفورم المدرب، والجنس كمان. بدل ما نكرر الكود، عملنا Components زي `AddressFieldset` و`GenderField` و`HealthFieldset` بتقرا الفورم من **`useFormContext`**، والفورم الكبير بيلفّهم بـ **`FormProvider`**.

والقواعد كمان مشتركة في `lib/validation.ts` (الاسم، الموبايل المصري، الإيميل، السن). وفيه قاعدة خاصة للأجزاء الاختيارية زي العنوان: **يا كله يا مفيش**. لو كتبت رقم العمارة بس، هيقولك اكتب الشارع والمدينة، لكن لو سبته فاضي خالص عادي.

> Address, gender and health sections are shared components that read the form through useFormContext, wrapped in a FormProvider. Validation rules live once in lib/validation.ts and mirror the backend. Optional sections like the address are all-or-nothing: empty is fine, but a partly filled address asks for the missing parts.

---

## 104. A Multi-Step Form Is Still One Form

فورم إضافة عضو 4 خطوات (البيانات، العنوان، الصحة، الصورة)، بس هو **فورم واحد** فيه كل الحقول. زرار Continue بيعمل `trigger` لحقول الخطوة الحالية بس، فمش هتعدّي وفيه غلط، والحقول اللي في الخطوات الجاية مبتتراجعش لسه.

تفاصيل مهمة:

- زرار **Enter** في خطوة في النص معناه "التالي" مش "احفظ".
- لو السيرفر رجّع "الإيميل مستخدم"، الفورم بيرجع لوحده للخطوة اللي فيها الإيميل ويعرض الخطأ تحته.
- الكارت اللي على اليمين بيعرض ملخص حي للي اتكتب، عشان الريسبشن يراجع قبل الحفظ.

> The four-step wizard is a single react-hook-form instance. Continue calls trigger() on the current step's fields only. Enter on a middle step means Next, not save. If the server rejects the email, the wizard jumps back to that step and shows the error under the field. A live summary card helps reception double-check before saving.

---

## 105. Uploading a Photo: Two Requests and Checks on Both Sides

العضو بيتعمل بطلب JSON، وبعد ما ينجح بنرفع الصورة بطلب تاني نوعه **multipart/form-data**. فصلناهم لأن الـ JSON مبيشيلش ملفات، ولأن لو الصورة فشلت العضو يفضل موجود، وبنقول ده بوضوح ونكمّل لصفحته.

الصورة بتتشيك **مرتين**: في المتصفح (النوع JPG أو PNG أو WEBP، والحجم لحد 2 ميجا) عشان المستخدم يعرف على طول، وفي السيرفر لأن أي حد ممكن يبعت طلب من غير الموقع. والـ Preview معمول بـ `FileReader` كـ Data URL، فمفيش Object URL محتاج نمسحه بعدين.

ملحوظة: الـ Axios Client معندوش `Content-Type` ثابت، فلما نبعت `FormData` المتصفح بيحط الـ Boundary الصح بنفسه.

> The member is created with JSON, then the photo is uploaded in a second multipart request; if only the photo fails, the member still exists and we say so clearly. The file is checked in the browser for quick feedback and again on the server for security. The preview is a FileReader data URL, so there is no object URL to revoke. The API client sets no default Content-Type, so the browser adds the correct multipart boundary.

---

## 106. Fixing Generated Types Instead of Fighting Them

الـ Types بتتولد أوتوماتيك من الـ OpenAPI بتاع الباك. بس المولّد كان بيشيل `null` من حقول زي `address` و`healthRecord`، مع إن الباك ممكن يرجّعها `null` فعلاً. ولو صدّقنا الـ Type، الكود هيقع لما يعمل `member.address.city`.

بدل ما نعدّل الملف المتولد (هيتمسح أول ما نولّده تاني)، عملنا Helper صغير `WithNullable` في `types/index.ts` بيرجّع `| null` للحقول دي بس. كده TypeScript بيجبرنا نتعامل مع الحالة الفاضية.

> Types are generated from the backend's OpenAPI document, but the generator dropped null from optional objects like address and healthRecord. Instead of editing the generated file (it is overwritten on every run), a small WithNullable helper in types/index.ts adds | null back, so TypeScript forces us to handle the empty case.

---

## 107. Side Panel or Full Page?

الفورمز الصغيرة (خطة، تصنيف، مدرب) بتفتح في **Side Panel** فوق الجدول، فالأدمن مبيخسرش مكانه في الجدول والفلاتر. لكن إضافة عضو ليها **صفحة كاملة** `/dashboard/members/new`، لأنها 4 خطوات وفيها صورة وملخص، ومحتاجة مساحة.

والـ Panel بيتمسح محتواه لما يتقفل، فكل مرة بيفتح بفورم جديد نضيف من غير Reset يدوي. وزرار الحفظ في الـ Footer بره الفورم، ومربوط بيه بـ `form="plan-form"`.

> Small forms (plan, category, trainer) open in a side sheet so the admin keeps their place in the table. Adding a member gets its own page because it has four steps, a photo and a summary. The sheet unmounts its content when closed, so every open starts with a fresh form, and the footer's submit button is linked to the form with the form attribute.

---

## 108. Bugs the Browser Test Caught in F2

الـ Script اللي بيشغّل Edge لقى 3 مشاكل مكانتش هتبان في الـ Type Check:

- **زرار من غير `type`**: زرار "Remove" بتاع الصورة كان جوه الفورم ومن غير `type="button"`، فالمتصفح بيعتبره **Submit**، وكان هيحفظ العضو بدل ما يشيل الصورة. الحل: `type="button"`.
- **Build وقع في صفحة العضو**: الإطار الأساسي بيقرا المسار بـ `usePathname`، وفي صفحة فيها جزء متغير زي `[id]` الـ Next.js مبيعرفش المسار وقت الـ Build، فلازم يبقى جوه `Suspense`. لفّينا الإطار بـ `Suspense` بنفس شاشة التحميل.
- **زرار في مكان غلط**: هيدر الكارت معمول بـ CSS Grid، فكلاسات الـ Flex مكانتش بتعمل حاجة. الحل: الـ Slot الجاهز `CardAction`.

> The Edge test script caught three bugs type checks missed: a Remove button inside the wizard form had no type, so it would have submitted the form and saved the member; the production build failed on /dashboard/members/[id] because the shell reads usePathname and a dynamic route needs a Suspense boundary; and a card header button sat in the wrong place because the header is a CSS grid, fixed with the CardAction slot.

---

# F3: Daily Operations (Classes, Bookings, Memberships, Payments)

## 109. Time Zones: The User Types Cairo Time, the API Stores UTC

الأدمن بيكتب "الساعة 6:15 الصبح" وهو قاصد توقيت القاهرة، لكن الـ API بيخزن كل المواعيد بـ **UTC** وبيرفض أي وقت من غير علامة `Z`. التحويل بيحصل في ملف واحد `lib/cairo-time.ts`: الدالة `cairoToUtc("2026-10-11", "06:15")` بترجع `2026-10-11T03:15:00Z`.

النقطة المهمة: مصر فيها **توقيت صيفي** (+3 في الصيف و+2 في الشتا)، فمينفعش نطرح ساعتين ثابتين. الدالة بتسأل `Intl.DateTimeFormat` عن الفرق في اليوم ده بالذات، فبتشتغل صح في أي يوم في السنة ومن أي جهاز، حتى لو المستخدم قاعد في دولة تانية. وجربناها فعلًا: 06:15 القاهرة اتخزنت 03:15 في الداتا بيز.

> Admins type Cairo wall-clock time; the API stores UTC and rejects times without a Z. One helper converts using Intl to find the Cairo offset for that exact day, so Egypt's daylight saving time (+3 in summer, +2 in winter) is handled and the result does not depend on the browser's own time zone.

---

## 110. Optimistic Updates With Rollback

لما الأدمن يضغط **Book**، العداد بيتحرك فورًا (من 0/3 لـ 1/3) والعضو بيظهر في القائمة بعلامة "Booking…" قبل ما السيرفر يرد. ده اسمه **Optimistic Update**.

الخطوات في `onMutate`: نوقف أي طلبات شغالة لنفس الكلاس (`cancelQueries`)، ناخد **Snapshot** من الداتا الحالية، ونعدّل الكاش بإيدينا. لو السيرفر رفض (مثلًا الكلاس اتملى من جهاز تاني)، `onError` بيرجّع الـ Snapshot والعداد يرجع زي ما كان، ويظهر Toast بالسبب. وفي `onSettled` بنعمل `invalidate` عشان ناخد الحقيقة من السيرفر في الحالتين.

> Booking updates the seat counter and the list instantly. onMutate cancels in-flight queries, snapshots the cache and writes the expected result; onError restores the snapshot and shows the server's reason; onSettled refetches so the cache always ends in the server's truth.

---

## 111. Mapping Server Error Codes to Form Fields

الـ API بيرجّع كود ثابت لكل قاعدة، زي `Session.TrainerBusy` أو `Session.CapacityBelowBookings`. الفورم عنده جدول صغير بيربط كل كود بالحقل المناسب، فالرسالة بتظهر **تحت الحقل نفسه** مش في Toast عام: "The trainer already has another session at this time" بتظهر تحت وقت البداية.

ده بيخلي كل قاعدة بيرفضها السيرفر واضحة للمستخدم، وفي نفس الوقت الفاليديشن بتاع Zod في المتصفح بيمسك الأخطاء البسيطة (حقل فاضي، النهاية قبل البداية) من غير ما نبعت طلب أصلًا.

> The API returns a stable code per rule. Each form maps codes to fields (TrainerBusy to the start time, CapacityBelowBookings to capacity), so the message appears under the right input. Zod still catches simple mistakes in the browser before any request is sent.

---

## 112. A Weekly Calendar Without a Library

بدل مكتبة تقيلة، عملنا Calendar بسيط بـ CSS Grid: 7 أعمدة للأيام، وكل ساعة ارتفاعها 60px، فمكان الكلاس = (دقيقة البداية - أول ساعة) والطول = مدة الكلاس.

الحاجة الذكية هي **الكلاسات المتداخلة** (مدربين مختلفين في نفس الوقت): بنقسمها **Lanes** زي Google Calendar، كل كلاس بياخد أول عمود فاضي، والمجموعة بتتقسم على عدد الأعمدة اللي احتاجتها. وفيه خط أحمر للوقت الحالي، والضغط على خانة فاضية بيفتح فورم الكلاس بالتاريخ والساعة جاهزين. وعلى الموبايل الـ 7 أعمدة مش هتكفي، فبيتحول لقائمة لكل يوم.

> A hand-made week grid: 7 day columns, 60px per hour, position from start minute, height from duration. Overlapping classes are split into lanes like Google Calendar. A red line marks now, clicking an empty future slot opens the form prefilled, and phones get a per-day agenda instead.

---

## 113. State Is Calculated, Not Stored

الكلاس في الداتا بيز ليه `Status` واحد بس: `Scheduled` أو `Cancelled`. لكن الشاشة بتعرض أربع حالات: Upcoming و Live now و Completed و Cancelled. الحالة دي **بتتحسب** من الوقت: لو البداية لسه جاية يبقى Upcoming، لو إحنا بين البداية والنهاية يبقى Live، لو النهاية عدّت يبقى Completed.

ليه؟ لأن لو خزنّا "Completed" هنحتاج Job يغيّر الحالة كل دقيقة، ولو الـ Job وقف الداتا هتبقى غلط. الحساب من الوقت دايمًا صح. نفس الفكرة في الاشتراكات (Active / Frozen / Upcoming / Expired)، وفي الحجوزات: حجز لسه `Booked` بعد ما الكلاس خلص بيظهر **Missed**.

> The database stores only Scheduled or Cancelled; Upcoming, Live and Completed are derived from the clock in the query. Storing them would need a background job that can fall behind. Memberships work the same way, and a booking still "Booked" after its class ended is shown as Missed.

---

## 114. Freeze and Unfreeze: Showing the Result Before Saving

تجميد الاشتراك بيأجل تاريخ النهاية بعدد الأيام، وبيلغي الحجوزات اللي جوه فترة التجميد. عشان الأدمن ميتفاجئش، الـ Dialog بيعرض **Before → After** قبل ما يضغط: الحالة Active → Frozen، والنهاية 7 Nov → 21 Nov.

فك التجميد بدري بيرجّع الأيام اللي متستخدمتش بس، والقاعدة إن **أي يوم بدأ بيتحسب مستخدم** (`Days - ceil(elapsed)`). جربنا تجميد 14 يوم وفكه بعد دقايق: رجع 13 يوم، والشاشة قالت قبل التنفيذ "it will end on 8 Nov" وده نفس اللي السيرفر عمله بالظبط، لأن الحسبة في المتصفح نسخة من حسبة السيرفر.

> Freezing pushes the end date by N days and cancels bookings inside the freeze. The dialog previews before and after values. Unfreezing early returns only unused whole days (a started day counts as used); the preview uses the same rule as the server, so what the admin sees is what gets saved.

---

## 115. Renewals Queue Up Instead of Overlapping

لو العضو اشتراكه لسه شغال وجدد، التجديد **مبيبدأش النهارده** (كده هيضيع عليه الأيام الباقية)، لكن بيتحط في الطابور ويبدأ لحظة ما الحالي يخلص. لو الاشتراك خلص خلاص، التجديد بيبدأ فورًا.

وده بيعمل قاعدة تانية: مينفعش تلغي الاشتراك الحالي وفيه تجديد مستنيه، لأن التجديد هيبقى معلق في الهوا. السيرفر بيرجّع `HasQueuedRenewal` والشاشة بتقول "Cancel the renewal first". والاسترداد مينفعش يزيد عن المبلغ المدفوع (`RefundTooHigh`)، والفورم بيمنعه قبل ما يتبعت كمان.

> A renewal on a running membership starts when the current one ends, so no paid day is lost; an expired one restarts today. Cancelling a membership that has a queued renewal is blocked (HasQueuedRenewal), and a refund can never exceed the price paid (RefundTooHigh), checked in the form and on the server.

---

## 116. Totals From the Server, Not From the Current Page

صفحة المدفوعات فيها 4 كروت: الداخل، المسترد، الصافي، والعدد. لو حسبناهم من الجدول هنحسب **الصفحة الحالية بس** (20 صف)، والرقم هيبقى غلط. عشان كده عملنا Endpoint منفصل `GET /api/payments/summary` بياخد **نفس الفلاتر** بتاعة القائمة ويرجّع المجموع بـ `SUM` في SQL.

الكروت والجدول بيقروا نفس الفلاتر من الـ URL، فلما تغيّر الفترة لـ Today أو النوع لـ Refund الاتنين بيتغيروا مع بعض، والـ Reload بيحافظ عليهم.

> Summary cards must not be computed from the visible page (only 20 rows). A separate summary endpoint takes the same filters as the list and aggregates with SUM in SQL. Cards and table read the same URL filters, so they always agree.

---

## 117. Cache Invalidation Across Features

بيع اشتراك مش بيأثر على صفحة الاشتراكات بس: بيضيف دفعة في **المدفوعات**، وبيغيّر حالة العضو في **الأعضاء**، وبيغيّر أرقام **الداشبورد**، وبيخلي العضو يقدر يحجز كلاسات. فبعد أي عملية على اشتراك، الدالة `applyChange` بتحط رد السيرفر في الكاش فورًا، وبعدين بتعمل `invalidate` للمفاتيح دي كلها.

وفي حالة المسح عملنا العكس: بعد مسح كلاس، بنحدّث كل القوائم **ما عدا** الكلاس الممسوح نفسه، لأن لو طلبناه تاني هيرجع 404 والصفحة لسه بتعمل Redirect.

> One membership action touches payments, members, the dashboard and bookings, so applyChange writes the server's response into the cache and invalidates every related key. After deleting a class we refresh every list except the deleted class itself, which would only return 404 while the page redirects.

---

## 118. Testing the Whole Flow in a Real Browser

بعد كل صفحة شغّلنا سكريبت بيفتح **Edge Headless** ويتحكم فيه بـ **Chrome DevTools Protocol**: بيعمل Login، يجدول كلاس، يحجز 3 أعضاء لحد ما يتملى، يلغي حجز، يجمّد ويفك ويجدد ويلغي اشتراك، ويفلتر المدفوعات. وبعد كل خطوة بيقرا الداتا بيز بـ `sqlcmd` ويتأكد إن اللي ظهر في الشاشة هو اللي اتخزن فعلًا.

وفي الآخر بيطبع أي طلب API رجع بخطأ وأي Error في الـ Console. ده مسك مشاكل حقيقية، زي طلبات 404 بعد مسح كلاس، وقائمة Completed اللي كانت بتبدأ بأقدم كلاس بدل أحدث واحد.

> A script drives headless Edge over the DevTools Protocol through the real flows (schedule, book until full, cancel, freeze, renew, refund, filter payments), checks the database with sqlcmd after each step, and reports failed API calls and console errors. It caught real issues such as 404s after a delete and the Completed list sorted oldest first.

---

# F4: Dashboard, QR Check-in and Exports

## 119. Lazy Loading the Charts With next/dynamic

مكتبة **Recharts** تقيلة، ولو اتحمّلت مع أول صفحة هتبطّأ فتح الداشبورد. عشان كده كل رسم بياني في ملف `charts.tsx` بيتحمّل بـ `next/dynamic` مع `ssr: false`. يعني الكود بتاعه بينزل في ملف لوحده **بعد** ما الصفحة تفتح، وفي الوقت ده بيظهر Skeleton بنفس مقاس الكارت عشان الصفحة متتنططش.

وكل كارت ليه 4 حالات واضحة: بيحمّل، فيه خطأ مع زرار Retry، مفيش داتا، أو الرسم نفسه. ولما تغيّر الفترة من 30 يوم لـ 12 شهر بنستخدم `placeholderData` فالرسم القديم يفضل باهت لحد ما الجديد يوصل بدل ما يختفي.

> Recharts is heavy, so every chart is loaded with next/dynamic and ssr: false. The chart code downloads in its own chunk after the page is interactive, while a same-size skeleton holds the layout. Each card handles loading, error with retry, empty and data states, and keeps the previous data faded while a new range loads.

---

## 120. Downloading Files That Need a Token

زرار Export مينفعش يكون لينك عادي `<a href>`، لأن الـ API محتاج **JWT** في الـ Header، واللينك العادي مش بيبعت Headers. الحل في `lib/download.ts`: بنطلب الملف بـ Axios مع `responseType: "blob"`، فالـ Interceptor بيحط التوكن وبيعمل Refresh لو انتهى. بعدين بنعمل `URL.createObjectURL` ونضغط على لينك مؤقت، واسم الملف بناخده من Header اسمه `Content-Disposition`.

المشكلة الخفية: لو السيرفر رجّع خطأ، الرد هيبقى Blob برضه مش JSON، فرسالة الخطأ هتضيع. عشان كده الدالة `readBlobError` بتقرا الـ Blob كنص وتحوّله JSON تاني قبل ما نعرض الرسالة.

> Exports need the JWT, so a plain link cannot work. Axios downloads the file as a blob (the interceptor adds the token and refreshes it), then a temporary object URL saves it with the name from Content-Disposition. Error responses also arrive as blobs, so they are parsed back into ProblemDetails JSON before showing the message.

---

## 121. Export Respects the Filters on Screen

لو الأدمن فلتر المدفوعات على "آخر 30 يوم" ونوع "Refund" ودوس Export، لازم الملف يطلع **نفس الصفوف اللي شايفها** بالظبط. عشان كده زرار `ExportButton` بياخد نفس الـ Object اللي بنبعته لقائمة الصفحة، ومش بيحسب فلاتر لوحده.

وده سهل لأن كل الفلاتر متخزنة في الـ **URL**: الجدول والكروت والـ Export بيقروا من نفس المكان. واختبرناها: عدد صفوف ملف CSV طلع نفس الـ `totalCount` اللي راجع من الـ API في الأعضاء والاشتراكات والمدفوعات وسجل الحضور.

> The export button receives the exact filter object the list uses, so the file always contains the rows on screen. Because filters live in the URL, the table, the summary cards and the export all read from one source. The browser test compared CSV row counts with the API totals for every page.

---

## 122. Running the Camera Safely With html5-qrcode

الكاميرا عملية **Async**: التشغيل بياخد وقت، ولو المستخدم داس Stop وهي لسه بتشتغل، أو React شغّل الـ Effect مرتين، المكتبة بترمي Error. الحل إن كل أوامر Start و Stop بتدخل **طابور** (Queue) وبتتنفذ واحدة ورا التانية، فمفيش أمرين بيتداخلوا.

كمان المكتبة بتتحمّل بـ `import()` جوه المتصفح بس، وأخطاء الكاميرا (مفيش إذن، مفيش كاميرا، الكاميرا مستخدمة في برنامج تاني) بتتحوّل لرسائل مفهومة. ولو نفس الكود اتقرا تاني خلال 8 ثواني بنتجاهله، عشان العضو اللي لسه ماسك الموبايل قدام الكاميرا ميتسجلش مرتين.

> Starting and stopping the camera are async and fail if they overlap (a quick Stop, or React running effects twice), so every start/stop call goes through a promise queue. The library is imported only in the browser, camera errors become readable messages, and the same code is ignored for 8 seconds so one member is not logged twice.

---

## 123. A Big, Clear Result at the Door

الموظف اللي على الباب مش هيقرا جدول. فبعد كل Scan بتظهر شاشة كاملة **خضرا** أو **حمرا** بـ Framer Motion، فيها صورة العضو واسمه وعدد الأيام الباقية، أو سبب الرفض زي "Membership frozen" أو "Already checked in today"، ومعاها صوت مختلف للقبول والرفض بالـ Web Audio API.

الشاشة بتقفل لوحدها بعد 5 ثواني أو بـ Esc أو بلمسة، عشان الطابور يمشي. وكل محاولة بتتسجل في الداتا بيز حتى المرفوضة، فالأدمن يقدر يراجعها في Attendance log ويفلترها.

> The door needs a result readable from a distance: a full-screen green or red overlay with the photo, name and days left, or the refusal reason, plus distinct sounds. It closes after 5 seconds, on Esc or on tap so the queue keeps moving. Every attempt, refused or not, is logged and can be filtered in the attendance log.

---

## 124. Animated Numbers Without Re-rendering React

أرقام الكروت في الداشبورد بتعد من 0 لحد القيمة. لو عملنا ده بـ `useState` هنعمل Re-render للكارت 60 مرة في الثانية. بدل كده `AnimatedNumber` بيستخدم `animate` من Framer Motion ويكتب الرقم مباشرة في `nodeValue` بتاع الـ Text Node جوه `useLayoutEffect`.

يعني React بيرسم الرقم النهائي مرة واحدة (فالـ SEO وقارئ الشاشة بيشوفوا الرقم الصح)، والحركة نفسها بتحصل بره React من غير أي Render إضافي.

> Count-up numbers would re-render 60 times a second with useState. AnimatedNumber renders the final value once, then Framer Motion's animate writes frames straight into the text node's nodeValue inside a layout effect, so the animation costs no React renders and the DOM always ends on the real number.

---

## 125. Checking the Dashboard Numbers Against the Database

داشبورد بأرقام غلط أسوأ من مفيش داشبورد. فسكريبت المتصفح بيقارن كل رقم: الكروت مع `GET /api/analytics/summary`، وإجمالي الإيراد في الرسم مع `SUM` في SQL بعد تحويل الأيام لتوقيت القاهرة.

واكتشفنا حاجة مهمة في الاختبار: الصورة الكاملة للصفحة (Full-page Screenshot) كانت بتطلع الرسوم فاضية، مع إن الرسوم شغالة في المتصفح. السبب إن طريقة التصوير بتغيّر مقاس الصفحة فجأة، وRecharts بيعيد الرسم. الحل إننا نكبّر الشاشة الأول ونستنى ثانيتين وبعدين نصوّر، والدرس إنك تتأكد إن المشكلة في الكود مش في أداة الاختبار.

> The test compares every KPI with the summary endpoint and the revenue total with a SQL SUM over Cairo-local days. Full-page screenshots showed blank charts even though the browser rendered them: the capture resizes the page and Recharts redraws. Enlarging the viewport and waiting before capturing fixed it, a reminder to separate tool artifacts from real bugs.

---

# F5: Member Portal, Trainer Portal and Public Site

## 126. The Landing Page Is a Cached Server Component

الصفحة الرئيسية `app/[locale]/page.tsx` عبارة عن **Server Component** بيجيب كل الداتا من الـ API على السيرفر مرة واحدة بـ `Promise.all` (الإعدادات، الأرقام، الباقات، البرامج، المدربين، جدول الحصص). كل دالة في `features/public-site/api.ts` معلَّمة بـ `"use cache"` ومعاها `cacheTag("public-site")`، يعني الزائر بياخد HTML جاهز وسريع، ومفيش طلب للـ API مع كل زيارة.

ولما الأدمن يعدّل إعدادات النادي، الـ Server Action اسمه `refreshPublicSite` بينادي `updateTag("public-site")`، فالصفحة بتتبني من جديد بالبيانات الجديدة على طول من غير ما نستنى أي وقت.

> The landing page is a Server Component that fetches everything in parallel on the server. Each fetch uses "use cache" with a shared cache tag, so visitors get fast pre-rendered HTML. When an admin saves the gym settings, a server action calls updateTag to rebuild the page on demand, so the change is visible immediately.

---

## 127. The Server Action Checks the Admin Before Clearing the Cache

أي Server Action ممكن أي حد يناديه من بره، لأنه في الآخر مجرد POST request. عشان كده `refreshPublicSite(token)` مش بيثق في الواجهة: قبل ما يمسح الكاش بيبعت الـ Token للـ API على `GET /api/settings/gym`، وده Endpoint للأدمن بس. لو الرد مش 200 مبيعملش حاجة، فمحدش غريب يقدر يرهق السيرفر بإعادة بناء الصفحة كل شوية.

> Server actions are public POST endpoints, so the action never trusts the client. It forwards the token to an admin-only API endpoint first and only clears the cache if that call succeeds.

---

## 128. SEO: Metadata, hreflang and JSON-LD

كل لغة ليها `title` و`description` خاصين بيها من `generateMetadata`، ومعاهم `canonical` وروابط `hreflang` (en و ar و x-default) عشان Google يعرف إن الصفحتين نسختين من نفس المحتوى بلغتين. وكمان فيه Open Graph عشان شكل اللينك لما يتشارك على واتساب وفيسبوك.

وضفنا **JSON-LD** من نوع `HealthClub` فيه الاسم والعنوان والتليفون ومواعيد العمل، وكله جاي من جدول `GymSettings`. وفيه `sitemap.xml` و`robots.txt` بيمنعوا الأرشفة لأي صفحة خاصة زي `/dashboard` و`/me` و`/trainer` باللغتين.

> Each locale gets its own metadata with canonical and hreflang alternates, plus Open Graph tags. A HealthClub JSON-LD block is built from the real gym settings. The sitemap lists public pages only, and robots.txt blocks every private area in both languages.

---

## 129. Two Languages With next-intl and RTL

الإنجليزي هو الأساسي على `/`، والعربي على `/ar` مع `dir="rtl"`. كل النصوص متخزنة في `messages/en.json` و`messages/ar.json`، وفيه Script اسمه `check-messages` بيتأكد إن الملفين فيهم نفس المفاتيح بالظبط (505 مفتاح)، فمستحيل صفحة تظهر بنص ناقص.

العربي ليه 6 صيغ للجمع (zero, one, two, few, many, other)، وده بيطلع جمل صح زي "حصة واحدة" و"حصتان" و"3 حصص". ولتنسيق الصفحة بنستخدم Classes منطقية زي `ms-` و`pe-` بدل `ml-` و`pr-`، فالتصميم بيتقلب لوحده في العربي. أما الأسهم فبتتلف بـ `rtl:rotate-180`، والتليفونات والأوقات بتاخد `dir="ltr"`.

> English is the default at / and Arabic lives at /ar with RTL. A script checks that both message files have exactly the same keys. Arabic plurals use all six ICU forms. Layout uses logical Tailwind classes so it mirrors automatically; arrows rotate in RTL, and phone numbers and times stay LTR.

---

## 130. Never Read the Clock During Render

لما كتبنا `new Date()` جوه Component، الـ Build وقف بخطأ، لأن السيرفر بيبني الصفحة في وقت والمتصفح بيفتحها في وقت تاني، فالنتيجة هتختلف (Hydration mismatch). الحل هو Hook اسمه `useNow()` مبني على `useSyncExternalStore`: على السيرفر بيرجع `null`، وفي المتصفح بيرجع الوقت الحالي وبيتحدث كل دقيقة.

وبكده حاجات زي "مفتوح الآن" و"صباح الخير" و"ينتهي خلال 10 أيام" بتظهر صح وبتتغير لوحدها لو الصفحة فضلت مفتوحة.

> Reading new Date() during render breaks prerendering and causes hydration mismatches. A useNow hook built on useSyncExternalStore returns null on the server and the current time in the browser, ticking every minute, so open now badges and greetings stay correct.

---

## 131. Booking Rules in the UI Mirror the Backend

صفحة حجز الحصص بتعرض الحالة قبل ما العضو يدوس: "محجوزة"، "مكتملة"، "خارج مدة اشتراكك"، أو "عندك حصة في نفس الوقت". الدوال دي موجودة في `booking-rules.ts` وبتطبق نفس القواعد اللي في `BookingService`، زي الإلغاء المسموح لحد قبل الحصة بساعتين.

لكن **الـ Backend هو صاحب القرار النهائي**. الواجهة بس بتوفّر على المستخدم ضغطة مالهاش لازمة، ولو حصل تعارض (مثلًا حد تاني خد آخر مكان) الـ API بيرجع الخطأ والواجهة بتعرضه مترجم.

> The classes page shows booked, full, not covered and busy states before the member clicks, using helpers that mirror BookingService, including the 2-hour cancellation deadline. The API is still the source of truth; the UI only saves a pointless click, and race conditions come back as translated errors.

---

## 132. Attendance Only While the Class Is Running

زرار "تسجيل الحضور" في بوابة المدرب بيشتغل بس وقت الحصة نفسها. قبل ما تبدأ بيبقى مقفول ومعاه رسالة توضح إمتى هيفتح، وبعد ما تخلص بيختفي والعضو اللي محضرش بيظهر "لم يحضر". والـ API بيطبق نفس القاعدة وبيرجع `Booking.AttendanceNotOpen` لو حد حاول من بره الواجهة.

وكمان لو مدرب فتح صفحة حصة مدرب تاني، بنعرض "الحصة غير موجودة" بالظبط زي الحصة اللي مش موجودة فعلًا، فمحدش يقدر يعرف إيه الحصص الموجودة عند غيره.

> Mark attended is enabled only while the class is running, with a hint before it starts and a no-show label after it ends; the API enforces the same rule. Another trainer's class looks exactly like a missing one, so the page leaks nothing.

---

## 133. Public Endpoints Expose Only Safe Fields

الـ Endpoint العام `GET /api/public/trainers` بيرجع DTO مخصوص اسمه `PublicTrainerResponse` فيه الاسم والتخصص وعدد الحصص الجاية بس. مفيش إيميل ولا تليفون ولا تاريخ ميلاد ولا عنوان، وفيه Test بيتأكد إن الـ JSON مفيهوش الخصائص دي خالص. واستخدام DTO منفصل أأمن من إننا نرجع الـ Entity ونخبي منها حقول، لأن أي حقل جديد يتضاف للـ Entity بعدين مش هيظهر للعامة بالغلط.

> The public trainers endpoint returns a dedicated DTO with name, specialty and upcoming class count only. A test asserts that email, phone and date of birth never appear. A separate whitelist DTO is safer than hiding fields, because new entity fields can never leak by accident.

---

## 134. A Separate Rate Limit for Token Refresh

في الاختبار اكتشفنا إن المستخدم بيخرج من حسابه لوحده بعد كام Reload. السبب إن `refresh` كان بيشارك نفس حد المحاولات بتاع `login`، وهو 10 في الدقيقة لكل IP، والموقع بينادي `refresh` مع كل فتحة صفحة. الحل كان Policy منفصلة اسمها `refresh` بحد 60 في الدقيقة وقيمتها في الإعدادات، ومعاها Test يثبت إن استهلاك حد الدخول مش بيأثر على التجديد.

وفيه ملاحظة مهمة: الطلبات بتعدي من Next.js الأول، فالـ API بيشوف كل المستخدمين على IP واحد. في الإنتاج الصح إن الـ Proxy يبعت الـ IP الحقيقي في `X-Forwarded-For`، أو إن تحديد المحاولات يتعمل عند الـ Edge زي Nginx أو Cloudflare.

> Testing showed users being signed out after a few reloads, because refresh shared the 10-per-minute login limit. Refresh now has its own policy (60 per minute, configurable) with tests. Behind the Next.js proxy every client shares one IP, so in production the real IP should be forwarded or limits applied at the edge.

---

## 135. The QR Check-in Card

صفحة رمز الدخول بتعرض QR على خلفية بيضا (عشان الماسح يقراه حتى في الوضع الداكن)، وتحته الكود نفسه كنص مع زرار نسخ، عشان لو الكاميرا في الاستقبال مش شغالة الموظف يكتبه بإيده. ولو العضو حس إن حد صوّر الكود، يقدر يعمل كود جديد بعد تأكيد، والكود القديم بيبطل يشتغل في نفس اللحظة.

> The QR is drawn on white so scanners read it in dark mode, with the code text and a copy button underneath as a fallback when the camera fails. Members can regenerate the code after a confirmation, which invalidates the old one immediately.

---

# F6: Arabic/English Localization and Polish

## 136. Localize the UI, Not the Data

القاعدة اللي مشينا عليها زي المواقع الكبيرة: تغيير اللغة بيغيّر الواجهة بس. كل نصوص الأزرار والعناوين ورسائل الخطأ جاية من ملفات ترجمة في الـ Frontend (`messages/en.json` و`messages/ar.json`)، مش من قاعدة البيانات. أما البيانات اللي المستخدم أو الأدمن بيدخلها (اسم العضو، اسم المدرب، وصف الحصة، اسم الباقة، العنوان) فبتتخزن مرة واحدة زي ما اتكتبت، ومفيش أعمدة عربي وإنجليزي، ومفيش ترجمة آلية. كنا جربنا أعمدة `NameAr` وفي الآخر رفضناها، لأنها بتجبر المستخدم يدخل نفس البيانات مرتين.

> Language switching changes the UI only. Every label, button and error comes from frontend message files; user-entered data (names, descriptions, addresses) is stored once, exactly as typed, with no duplicate Arabic/English columns and no machine translation. Multilingual content structures are added only when a real requirement exists.

---

## 137. Enums Are Stored in English and Translated in the UI

الحالات وطرق الدفع والنوع والحاجات الثابتة دي كلها بتتخزن في قاعدة البيانات كنص إنجليزي ثابت (`Active`، `Cash`، `Female`)، والـ API بيرجعها زي ما هي. الـ Frontend عنده Namespace اسمه `Enums` بيترجمها: ``t(`PaymentMethod.${method}`)``. كده الـ Database والـ API لغتهم واحدة وثابتة، والترجمة في مكان واحد بس، وأي صفحة جديدة بتستخدم نفس الكلمات.

> Fixed values are stored as stable English strings and returned as-is by the API. One canonical `Enums` message namespace translates them in the UI, so every page uses the same wording and the database never depends on the display language.

---

## 138. Fixing Two Schema Violations Safely

المراجعة طلّعت مخالفتين: عنوان الجيم كان في عمودين `AddressEn` و`AddressAr`، والـ `Gender` كان متخزن كرقم في حين إن باقي الـ Enums متخزنة كنص. الحل كان Migration مكتوبة بإيدينا مش اللي EF ولّدها، لأن EF كان هيعمل Rename وتحويل من int لـ nvarchar يحفظ "1" و"2" بدل `Male` و`Female`. الخطوات: عمود مؤقت، نسخ البيانات بـ `CASE`، بعدين NOT NULL، بعدين حذف القديم. لو ظهر رقم مش معروف الـ Migration بتفشل وترجع بدل ما تحفظ قيمة غلط. وقبلها Backup، وبعدها قارنّا عدد الذكور والإناث قبل وبعد.

> The review found duplicated address columns and Gender stored as an int. Both were fixed with hand-written migrations (EF's scaffold would have saved "1"/"2"): add a temp column, copy with CASE, enforce NOT NULL, drop the old one. Unknown values fail and roll back instead of saving garbage. The database was backed up first and counts were compared before and after.

---

## 139. Translating API Errors by Code

الـ API بيرجع ProblemDetails فيها `code` زي `Membership.Overlap` ومعاها `detail` بالإنجليزي. الـ Frontend بيترجم بالـ code من Namespace اسمه `Errors`، ولو الكود مش معروف بيرجع لنص السيرفر كحل أخير. ولأن `toastError` دالة عادية مش React Component ومستخدمة في أكتر من 100 مكان، عملنا Component صغير اسمه `ErrorMessagesBridge` بيسجل دالة الترجمة في متغير، فكل الأماكن القديمة بقت بتترجم من غير ما نغير ولا سطر فيها.

> The API returns a stable error code plus an English detail. The UI translates by code through an `Errors` namespace and falls back to the server text only for unknown codes. A tiny bridge component registers the translator so the plain `toastError` function, used in 100+ places, became localized without touching its callers.

---

## 140. Language Detection and Persistence

أول زيارة: الـ Middleware بتاع next-intl بيقرا `Accept-Language` من المتصفح، فلو المتصفح عربي بيحوّل على `/ar`. بعد كده اختيار المستخدم من زرار اللغة بيتحفظ في Cookie اسمها `NEXT_LOCALE` لمدة سنة (الافتراضي كان Session Cookie بتضيع لما المتصفح يتقفل)، والـ Cookie المحفوظة بتكسب على لغة المتصفح. وزرار اللغة موجود دايمًا في الهيدر حتى على الموبايل.

> First visits follow the browser's Accept-Language; afterwards the user's explicit choice is stored in a one-year NEXT_LOCALE cookie and wins over the browser setting. The language switcher is always visible, including on mobile.

---

## 141. RTL Pitfalls We Actually Hit

شوية مشاكل ظهرت بس في العربي:
- مكتبة Radix (Tabs وSelect والقوائم) بتفترض LTR لو محدش قالها، فكانت التابات معكوسة والتواريخ جواها متلخبطة. الحل `Direction.Provider` مرة واحدة حوالين التطبيق كله.
- علامة `%` بعد كلام عربي بتنط للناحية التانية ("%31")، فعملنا `f.percent()` بيعزل الرقم والعلامة كوحدة LTR.
- `dir="auto"` بيخلي الخانة الفاضية LTR فالـ Placeholder العربي بيظهر شمال؛ حلّيناها بقاعدة CSS واحدة `unicode-bidi: plaintext`.
- أسماء المستخدمين الإنجليزي جوه جملة عربي بنلفها بـ `<bdi>` أو بعلامات العزل Unicode في النصوص العادية زي الـ Toasts.

> Real RTL bugs: Radix primitives default to LTR (fixed once with a global Direction provider); a bare "%" jumps sides after Arabic text (fixed with an isolated percent formatter); empty dir="auto" inputs render LTR (fixed with unicode-bidi: plaintext); user data inside translated sentences is wrapped in <bdi> or Unicode isolates.

---

## 142. Charts in Right-to-Left

في العربي الوقت لازم يمشي من اليمين للشمال، فمحور X في الرسوم البيانية بيتعكس (`reversed`) والمحور Y بيروح يمين. الأرقام والشهور بتتنسق بـ `Intl` حسب اللغة، والـ Tooltip بياخد اتجاهه صريح. الرسم نفسه جوه Wrapper بـ `dir="ltr"` عشان مكتبة Recharts بتحسب الإحداثيات على أساس LTR، وإحنا اللي بنعكس بقصد.

> In Arabic, time flows right-to-left: the X axis is reversed and the Y axis moves to the right. Numbers and months use Intl for the active locale. Charts render inside an LTR wrapper because Recharts computes coordinates left-to-right, and mirroring is applied deliberately.

---

## 143. Parallel Agents, One Messages File

الترجمة اتقسمت على أكتر من جزء شغالين في نفس الوقت، وكلهم محتاجين يكتبوا في نفس ملفي الترجمة. عشان محدش يمسح شغل التاني، كل جزء بيكتب Patch صغير بالـ Namespaces بتاعته بس، وسكريبت Merge بيدمجه Deep Merge وعليه Lock File. وسكريبت `check-messages` بيتأكد إن الملفين فيهم نفس المفاتيح بالظبط (1711 مفتاح)، فمستحيل صفحة تظهر بمفتاح ناقص في لغة.

> Several workstreams translated in parallel but shared two message files. Each wrote a patch limited to its own namespaces, merged by a deep-merge script guarded by a lock file, and a check script guarantees both languages have exactly the same keys.

---

## 144. A Sweep Test for Leftover English

بعد الترجمة عملنا Sweep أوتوماتيك: بيدخل كل صفحة بكل دور (زائر، أدمن، عضو، مدرب) بالعربي والإنجليزي، ويتأكد من `dir` الصح، ومفيش Console Errors، ومفيش مفاتيح ترجمة ظاهرة زي `Members.title`. وكمان بيطلع الكلمات الإنجليزي اللي في الصفحات العربي بعد ما يشيل الكلمات اللي جاية من قاعدة البيانات (الأسماء والباقات)، فأي نص واجهة نسيناه بيبان على طول. كده لقينا مثلًا إن الـ aria-label بتاع منطقة الإشعارات كان لسه إنجليزي.

> An automated sweep visits every page for every role in both languages, checking the html dir, console errors and raw message keys, and lists Latin words on Arabic pages after removing words that come from the database. It caught leftovers such as the English aria-label of the toast region.

---

## 145. What Stays in English on Purpose

مش كل حاجة لازم تتترجم: الإيميلات اللي السيرفر بيبعتها وعناوين الأعمدة في ملفات Excel/CSV لسه إنجليزي، لأنها بتتولد في الـ Backend من غير ما يكون فيه Request بلغة الواجهة، وترجمتها محتاجة قرار (لغة مفضلة محفوظة لكل مستخدم). وكمان البيانات نفسها زي أسماء الأعضاء والباقات بتفضل زي ما اتكتبت. ده قرار موثّق مش نسيان.

> Server emails and export column headers stay in English because they are generated in the backend without a UI language; localizing them would need a stored per-user language preference. User data stays as typed. These are documented decisions, not omissions.
