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
