# Graph Report - TheraPlay  (2026-10-30)

## Corpus Check
- 213 files · ~100,890 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: (none) 18, .css 4, .example 2)

## Summary
- 1558 nodes · 4054 edges · 94 communities (34 shown, 60 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 65 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6fc14671`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Admin UI Class Tokens
- Backend Composer Dependencies
- Auth Pages Styling
- ForgotPasswordTest
- Activity and Progress Models
- useAuth
- Illuminate\Http\Request
- Frontend Tooling Config
- react-router-dom
- Illuminate\Http\JsonResponse
- Activity Material Upload Tests
- User Management Tests
- Image Upload and Hardening Tests
- Contact Management Controller
- Backend Tooling Dependencies
- Activities.jsx
- Professional Contact Tests
- Activity
- Admin Activity Tests
- PasswordResetTest
- ProfilePhotoController
- User
- Feedback Tests
- backend/README.md
- Role Access Tests
- helpers.jsx
- Persistent Completion Tests
- Base Migrations
- Activity Image Tests
- Activity Completion Tests
- Profile Photo Tests
- react
- Developer Team API
- Child Profile Tests
- 2026_11_01_000001_add_emails_and_phones_to_developer_team_table.php
- Developer Team Tests
- Laravel Application
- Progress.jsx
- Illuminate\Http\Request
- Database Seeders
- EmailVerificationTest
- User Factory
- Child
- AdminAccountManagementTest
- Profile.jsx
- ChildrenAndConditionsTest
- EmailChangeTest
- Laravel Application
- Cache Migration
- Categories Migration
- Feedback Migration
- Contact Photo Migration
- User Photo Migration
- ChildController.php
- Illuminate\Support\Facades\Schema
- Illuminate\Database\Migrations\Migration
- Activities Migration
- Activity Progress Migration
- Activity Resources Migration
- ChildrenSection.jsx
- Professional Contacts Migration
- Developer Team Migration
- Unit Example Test
- getToken
- React + Vite
- .update
- .claude/CLAUDE.md
- AccountDeletionTest
- LogoutTest
- UserManagementController.php
- bootstrap/app.php
- GlobalSearch.jsx
- apiRequest
- ConfigurationAndLimitsTest
- 2026_11_02_000002_create_activity_condition_table.php
- PromoteUserToAdmin.php
- 2026_11_02_000001_allow_multiple_children_per_user.php
- CategoryManagementTest
- 2026_10_21_083006_create_personal_access_tokens_table.php
- CategoryManagementController
- PasswordResetSafeguardsTest

## God Nodes (most connected - your core abstractions)
1. `User` - 110 edges
2. `Activity` - 63 edges
3. `TestCase` - 56 edges
4. `Controller` - 51 edges
5. `apiRequest()` - 46 edges
6. `react` - 45 edges
7. `react-router-dom` - 41 edges
8. `EmailVerificationTest` - 40 edges
9. `AdminAccountManagementTest` - 37 edges
10. `ChildrenAndConditionsTest` - 36 edges

## Surprising Connections (you probably didn't know these)
- `Backend architecture` --references--> `UserManagementController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/Admin/UserManagementController.php
- `Frontend architecture` --references--> `ResolvesChild`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Concerns/ResolvesChild.php
- `Backend architecture` --references--> `ValidatesImageUploads`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Concerns/ValidatesImageUploads.php
- `Backend architecture` --references--> `User`  [INFERRED]
  CLAUDE.md → backend/app/Models/User.php
- `Frontend architecture` --references--> `ChildProvider()`  [INFERRED]
  CLAUDE.md → src/ChildProvider.jsx

## Import Cycles
- None detected.

## Communities (94 total, 60 thin omitted)

### Community 0 - "Admin UI Class Tokens"
Cohesion: 0.04
Nodes (56): actions, activityFormActions, activityFormGrid, activityPairRow, activityPicture, activityPictureButton, activityTextarea, addButton (+48 more)

### Community 1 - "Backend Composer Dependencies"
Cohesion: 0.04
Nodes (48): pestphp/pest-plugin, php-http/discovery, autoload, autoload-dev, psr-4, psr-4, config, allow-plugins (+40 more)

### Community 2 - "Auth Pages Styling"
Cohesion: 0.05
Nodes (40): backLink, field, fieldInRow, forgotLink, headerText, headerTextLogin, headerTitle, headerTitleLogin (+32 more)

### Community 4 - "Activity and Progress Models"
Cohesion: 0.10
Nodes (4): {closure#1}(), {closure#2}(), Condition, Feedback

### Community 5 - "useAuth"
Cohesion: 0.21
Nodes (15): Frontend architecture, AuthContext, useAuth(), AuthProvider(), getToken(), ConfirmDialog(), GatedOutlet(), GlobalSearch() (+7 more)

### Community 6 - "Illuminate\Http\Request"
Cohesion: 0.11
Nodes (8): ActivityCompletionController, FeedbackManagementController, ConditionController, DeveloperTeamController, FeedbackController, LoginController, LogoutController, Controller

### Community 7 - "Frontend Tooling Config"
Cohesion: 0.06
Nodes (46): devDependencies, eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.6, globals@^17.12.0, jsdom@^30.1.3, tailwindcss@^4.3.3 (+38 more)

### Community 8 - "react-router-dom"
Cohesion: 0.19
Nodes (18): react-router-dom, Collapsible(), ContactCard(), Dashboard(), DAY_LETTERS, dayKey(), formatDate(), formatWeekRange() (+10 more)

### Community 9 - "Illuminate\Http\JsonResponse"
Cohesion: 0.19
Nodes (4): ActivityManagementController, {closure#1}(), {closure#1}(), ConditionManagementController

### Community 12 - "Image Upload and Hardening Tests"
Cohesion: 0.08
Nodes (3): AuthHardeningTest, ExampleTest, TestCase

### Community 13 - "Contact Management Controller"
Cohesion: 0.19
Nodes (6): {closure#1}(), {closure#2}(), ContactManagementController, {closure#1}(), ContactController, ProfessionalContact

### Community 14 - "Backend Tooling Dependencies"
Cohesion: 0.10
Nodes (20): devDependencies, concurrently@^10.0.3, laravel-vite-plugin@^3.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, vite@^8.0.0, tailwindcss, @tailwindcss/vite (+12 more)

### Community 15 - "Activities.jsx"
Cohesion: 0.21
Nodes (19): Activities(), DIFFICULTIES, imagePlaceholders, loadCompletedIds(), ActivityDetails(), fetchIsCompleted(), getToken(), ActivityPicture() (+11 more)

### Community 17 - "Activity"
Cohesion: 0.09
Nodes (11): ActivityController, {closure#1}(), ActivityMaterialController, ActivityImageController, ActivityResourceController, {closure#2}(), {closure#3}(), StreamsActivityMaterials (+3 more)

### Community 23 - "backend/README.md"
Cohesion: 0.25
Nodes (7): About Laravel, Agentic Development, Code of Conduct, Contributing, Learning Laravel, License, Security Vulnerabilities

### Community 25 - "helpers.jsx"
Cohesion: 0.06
Nodes (59): @testing-library/react, @testing-library/user-event, vitest, leo, mia, progress(), published, setup() (+51 more)

### Community 27 - "Base Migrations"
Cohesion: 0.23
Nodes (6): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#3}()

### Community 31 - "react"
Cohesion: 0.12
Nodes (18): dependencies, lucide-react@^1.50.0, react@^19.2.8, react-dom@^19.2.8, react-router-dom@^7.18.4, lucide-react, react, react-dom (+10 more)

### Community 36 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 37 - "Progress.jsx"
Cohesion: 0.22
Nodes (14): ChildContext, SELECTED_CHILD_KEY_PREFIX, useChildren(), readStored(), ChildLoadError(), NoChildPrompt(), DAY_LABELS, dayKey() (+6 more)

### Community 38 - "Illuminate\Http\Request"
Cohesion: 0.13
Nodes (11): PasswordResetController, ProgressController, ResolvesChild, {closure#1}(), {closure#2}(), {closure#3}(), {closure#4}(), {closure#5}() (+3 more)

### Community 39 - "Database Seeders"
Cohesion: 0.25
Nodes (3): ActivitySeeder, ConditionSeeder, DatabaseSeeder

### Community 40 - "EmailVerificationTest"
Cohesion: 0.09
Nodes (3): VerifyEmailAddress, {closure#1}(), EmailVerificationTest

### Community 42 - "Child"
Cohesion: 0.16
Nodes (6): {closure#1}(), {closure#1}(), ActivityProgress, Category, Child, ProgressTest

### Community 44 - "Profile.jsx"
Cohesion: 0.17
Nodes (11): DeleteAccountCard(), EmailVerificationStatus(), noticeColors, getToken(), noticeColors, PHOTO_TYPES, Profile(), splitName() (+3 more)

### Community 47 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 61 - "ChildrenSection.jsx"
Cohesion: 0.18
Nodes (10): API_URL, ChildFormFields(), ageText(), ChildrenSection(), emptyForm, dateLimits(), validateChild(), Login() (+2 more)

### Community 67 - "getToken"
Cohesion: 0.36
Nodes (6): getToken(), NotFound(), useProtectedImage(), useDocumentTitle(), outcomes, VerifyEmail()

### Community 75 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 81 - "UserManagementController.php"
Cohesion: 0.10
Nodes (9): {closure#1}(), {closure#2}(), {closure#3}(), {closure#4}(), UserManagementController, {closure#1}(), {closure#1}(), RegisterController (+1 more)

### Community 83 - "bootstrap/app.php"
Cohesion: 0.08
Nodes (14): {closure#1}(), {closure#1}(), {closure#1}(), EnsureUserHasRole, RequireVerifiedEmailWhenEnforced, AppServiceProvider, {closure#1}(), {closure#2}() (+6 more)

### Community 84 - "GlobalSearch.jsx"
Cohesion: 0.57
Nodes (6): canSee(), normalize(), PAGES, scoreText(), searchActivities(), searchPages()

### Community 85 - "apiRequest"
Cohesion: 0.14
Nodes (31): apiRequest(), clearSession(), mapValidationErrors(), homeFor(), CategoriesAdmin(), ConditionsAdmin(), Contact(), DeveloperTeamEditor() (+23 more)

### Community 87 - "2026_11_02_000002_create_activity_condition_table.php"
Cohesion: 0.33
Nodes (3): {closure#1}(), {closure#2}(), {closure#3}()

## Knowledge Gaps
- **60 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `ForgotPasswordTest`, `Activity and Progress Models`, `Illuminate\Http\Request`, `Activity Material Upload Tests`, `User Management Tests`, `Image Upload and Hardening Tests`, `Professional Contact Tests`, `Activity`, `Admin Activity Tests`, `PasswordResetTest`, `Feedback Tests`, `Role Access Tests`, `Persistent Completion Tests`, `Activity Image Tests`, `Activity Completion Tests`, `Profile Photo Tests`, `Child Profile Tests`, `Database Seeders`, `EmailVerificationTest`, `User Factory`, `Child`, `AdminAccountManagementTest`, `ChildrenAndConditionsTest`, `EmailChangeTest`, `PasswordResetTest.php`, `.update`, `AccountDeletionTest`, `LogoutTest`, `UserManagementController.php`, `bootstrap/app.php`, `ConfigurationAndLimitsTest`, `PromoteUserToAdmin.php`, `CategoryManagementTest`, `PasswordResetSafeguardsTest`?**
  _High betweenness centrality (0.397) - this node is a cross-community bridge._
- **Should `Admin UI Class Tokens` be split into smaller, more focused modules?**
  _Cohesion score 0.03508771929824561 - nodes in this community are weakly interconnected._
- **Why does `Backend architecture` connect `bootstrap/app.php` to `UserManagementController.php`, `useAuth`, `User`, `Activity`?**
  _High betweenness centrality (0.266) - this node is a cross-community bridge._
- **Should `Backend Composer Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Why does `GatedOutlet()` connect `useAuth` to `react-router-dom`, `bootstrap/app.php`, `Profile.jsx`?**
  _High betweenness centrality (0.211) - this node is a cross-community bridge._
- **Should `Auth Pages Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `Activity and Progress Models` be split into smaller, more focused modules?**
  _Cohesion score 0.10052910052910052 - nodes in this community are weakly interconnected._