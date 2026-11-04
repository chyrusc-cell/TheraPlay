# Graph Report - TheraPlay  (2026-11-04)

## Corpus Check
- 227 files · ~110,357 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: (none) 18, .css 4, .example 2)

## Summary
- 1692 nodes · 4512 edges · 101 communities (33 shown, 68 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 92 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `54726152`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Admin UI Class Tokens
- Backend Composer Dependencies
- Auth Pages Styling
- Illuminate\Http\Request
- Illuminate\Database\Eloquent\Model
- useAuth
- Controller
- Frontend Tooling Config
- Dashboard.jsx
- Activity
- Activity Material Upload Tests
- User Management Tests
- TestCase
- bootstrap/app.php
- Backend Tooling Dependencies
- ContactPhotoTest
- Professional Contact Tests
- ActivityResource
- Admin Activity Tests
- PasswordResetTest
- EmailChangeTest
- Activities.jsx
- Feedback Tests
- backend/README.md
- Role Access Tests
- helpers.jsx
- Persistent Completion Tests
- Base Migrations
- Activity Image Tests
- Activity Completion Tests
- ProfessionalContact
- react
- AttachmentPreviewTest
- Child Profile Tests
- 2026_11_01_000001_add_emails_and_phones_to_developer_team_table.php
- Developer Team Tests
- Laravel Application
- Activity
- AppServiceProvider
- ProfileController.php
- EmailVerificationTest
- User Factory
- ProgressTest
- AdminAccountManagementTest
- Profile.jsx
- ChildrenAndConditionsTest
- Condition
- Laravel Application
- Cache Migration
- Categories Migration
- Feedback Migration
- Contact Photo Migration
- User Photo Migration
- VerifyEmailAddress
- Illuminate\Support\Facades\Schema
- Illuminate\Database\Migrations\Migration
- ForgotPasswordTest
- 2026_10_21_080311_create_activities_table.php
- Activity Progress Migration
- Activity Resources Migration
- apiRequest
- Professional Contacts Migration
- Developer Team Migration
- Unit Example Test
- ActivityArchiveTest
- React + Vite
- 2026_10_21_080259_create_child_condition_table.php
- .claude/CLAUDE.md
- AccountDeletionTest
- LogoutTest
- User
- AppServiceProvider
- ChildController
- 2026_11_04_000002_add_archive_to_activities_table.php
- apiRequest
- ConfigurationAndLimitsTest
- ProfilePhotoController
- DeveloperTeam
- 2026_11_02_000001_allow_multiple_children_per_user.php
- CategoryManagementTest
- 2026_10_21_083006_create_personal_access_tokens_table.php
- GlobalSearch.jsx
- PasswordResetSafeguardsTest
- ProfilePhotoTest
- CategoryManagementController
- ActivityCleanupTest
- AuthHardeningTest
- ExampleTest

## God Nodes (most connected - your core abstractions)
1. `User` - 117 edges
2. `Activity` - 84 edges
3. `TestCase` - 66 edges
4. `Controller` - 51 edges
5. `react` - 46 edges
6. `apiRequest()` - 46 edges
7. `react-router-dom` - 43 edges
8. `EmailVerificationTest` - 40 edges
9. `AdminAccountManagementTest` - 37 edges
10. `ChildrenAndConditionsTest` - 36 edges

## Surprising Connections (you probably didn't know these)
- `Status (last updated 2026-11-04)` --references--> `ActivityCompletionController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/ActivityCompletionController.php
- `Status (last updated 2026-11-04)` --references--> `ActivityController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/ActivityController.php
- `Status (last updated 2026-11-04)` --references--> `ActivityManagementController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/Admin/ActivityManagementController.php
- `Status (last updated 2026-11-04)` --references--> `CategoryManagementController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/Admin/CategoryManagementController.php
- `Backend architecture` --references--> `UserManagementController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/Admin/UserManagementController.php

## Import Cycles
- None detected.

## Communities (101 total, 68 thin omitted)

### Community 0 - "Admin UI Class Tokens"
Cohesion: 0.03
Nodes (59): actions, activityFormActions, activityFormGrid, activityPairRow, activityPicture, activityPictureButton, activityTextarea, addButton (+51 more)

### Community 1 - "Backend Composer Dependencies"
Cohesion: 0.04
Nodes (48): pestphp/pest-plugin, php-http/discovery, autoload, autoload-dev, psr-4, psr-4, config, allow-plugins (+40 more)

### Community 2 - "Auth Pages Styling"
Cohesion: 0.05
Nodes (42): backLink, field, fieldInRow, forgotLink, headerText, headerTextLogin, headerTitle, headerTitleLogin (+34 more)

### Community 3 - "Illuminate\Http\Request"
Cohesion: 0.11
Nodes (13): ActivityCompletionController, {closure#1}(), PasswordResetController, ProgressController, ResolvesChild, {closure#1}(), {closure#2}(), {closure#3}() (+5 more)

### Community 4 - "Illuminate\Database\Eloquent\Model"
Cohesion: 0.08
Nodes (5): {closure#1}(), {closure#1}(), {closure#2}(), {closure#3}(), Feedback

### Community 5 - "useAuth"
Cohesion: 0.13
Nodes (27): Frontend architecture, AuthContext, useAuth(), AuthProvider(), getToken(), ChildContext, SELECTED_CHILD_KEY_PREFIX, useChildren() (+19 more)

### Community 6 - "Controller"
Cohesion: 0.10
Nodes (8): FeedbackManagementController, ConditionController, DeveloperTeamController, FeedbackController, LoginController, LogoutController, RegisterController, Controller

### Community 7 - "Frontend Tooling Config"
Cohesion: 0.06
Nodes (46): devDependencies, eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.6, globals@^17.12.0, jsdom@^30.1.3, tailwindcss@^4.3.3 (+38 more)

### Community 8 - "Dashboard.jsx"
Cohesion: 0.12
Nodes (35): Dashboard(), DAY_LETTERS, dayKey(), formatDate(), formatWeekRange(), getCurrentStreak(), getToken(), getWeekStart() (+27 more)

### Community 9 - "Activity"
Cohesion: 0.18
Nodes (3): ActivityManagementController, {closure#3}(), EmailVerificationController

### Community 10 - "Activity Material Upload Tests"
Cohesion: 0.10
Nodes (6): PromoteUserToAdmin, {closure#1}(), RemoveTestActivities, {closure#2}(), ActivityMaterialUploadTest, ArchivedActivityContentTest

### Community 12 - "TestCase"
Cohesion: 0.13
Nodes (4): ActivityProgress, Category, Child, TestCase

### Community 13 - "bootstrap/app.php"
Cohesion: 0.13
Nodes (9): {closure#1}(), {closure#1}(), EnsureActivityNotArchived, EnsureUserHasRole, RequireVerifiedEmailWhenEnforced, {closure#1}(), {closure#2}(), {closure#3}() (+1 more)

### Community 14 - "Backend Tooling Dependencies"
Cohesion: 0.10
Nodes (20): devDependencies, concurrently@^10.0.3, laravel-vite-plugin@^3.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, vite@^8.0.0, tailwindcss, @tailwindcss/vite (+12 more)

### Community 17 - "ActivityResource"
Cohesion: 0.18
Nodes (9): ActivityMaterialController, ActivityResourceController, {closure#1}(), {closure#2}(), {closure#3}(), StreamsActivityMaterials, {closure#1}(), ActivityResource (+1 more)

### Community 21 - "Activities.jsx"
Cohesion: 0.17
Nodes (21): Activities(), DIFFICULTIES, imagePlaceholders, loadCompletedIds(), ActivityDetails(), fetchIsCompleted(), getToken(), ActivityPicture() (+13 more)

### Community 23 - "backend/README.md"
Cohesion: 0.25
Nodes (7): About Laravel, Agentic Development, Code of Conduct, Contributing, Learning Laravel, License, Security Vulnerabilities

### Community 25 - "helpers.jsx"
Cohesion: 0.06
Nodes (57): @testing-library/react, @testing-library/user-event, vitest, leo, mia, progress(), published, setup() (+49 more)

### Community 27 - "Base Migrations"
Cohesion: 0.16
Nodes (9): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}() (+1 more)

### Community 30 - "ProfessionalContact"
Cohesion: 0.16
Nodes (7): {closure#1}(), {closure#2}(), ContactManagementController, {closure#1}(), ContactController, ValidatesImageUploads, ProfessionalContact

### Community 31 - "react"
Cohesion: 0.11
Nodes (24): dependencies, lucide-react@^1.50.0, react@^19.2.8, react-dom@^19.2.8, react-router-dom@^7.18.4, lucide-react, react, react-dom (+16 more)

### Community 36 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 37 - "Activity"
Cohesion: 0.20
Nodes (4): ActivityController, {closure#1}(), ActivityImageController, Activity

### Community 38 - "AppServiceProvider"
Cohesion: 0.13
Nodes (9): ActivitySeeder, ConditionSeeder, DatabaseSeeder, Approved upcoming stages (Stages 2 and 3 are DONE, see Status; Stage 4 is approved but NOT started), Commands, Fixed decisions, graphify, Project status, fixed decisions and roadmap (keep current; read this first after a session reset) (+1 more)

### Community 44 - "Profile.jsx"
Cohesion: 0.18
Nodes (10): EmailVerificationStatus(), noticeColors, getToken(), noticeColors, PHOTO_TYPES, Profile(), splitName(), toFormValues() (+2 more)

### Community 46 - "Condition"
Cohesion: 0.39
Nodes (3): {closure#1}(), ConditionManagementController, Condition

### Community 47 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 61 - "apiRequest"
Cohesion: 0.14
Nodes (25): apiRequest(), clearSession(), mapValidationErrors(), CategoriesAdmin(), ChildFormFields(), ageText(), ChildrenSection(), emptyForm (+17 more)

### Community 75 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 81 - "User"
Cohesion: 0.09
Nodes (8): {closure#1}(), {closure#2}(), {closure#3}(), {closure#4}(), UserManagementController, {closure#1}(), ProfileController, User

### Community 82 - "AppServiceProvider"
Cohesion: 0.22
Nodes (3): AppServiceProvider, ErrorDetailSafeguardTest, Backend architecture

### Community 85 - "apiRequest"
Cohesion: 0.14
Nodes (17): react-router-dom, getToken(), homeFor(), GuestOnly(), Login(), emptyForm, formatDate(), ManageAccounts() (+9 more)

### Community 92 - "GlobalSearch.jsx"
Cohesion: 0.57
Nodes (6): canSee(), normalize(), PAGES, scoreText(), searchActivities(), searchPages()

## Knowledge Gaps
- **68 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `Illuminate\Database\Eloquent\Model`, `Activity`, `Activity Material Upload Tests`, `User Management Tests`, `TestCase`, `ContactPhotoTest`, `Professional Contact Tests`, `Admin Activity Tests`, `PasswordResetTest`, `EmailChangeTest`, `Feedback Tests`, `Role Access Tests`, `Persistent Completion Tests`, `Activity Image Tests`, `Activity Completion Tests`, `AttachmentPreviewTest`, `Child Profile Tests`, `AppServiceProvider`, `ProfileController.php`, `EmailVerificationTest`, `User Factory`, `ProgressTest`, `AdminAccountManagementTest`, `ChildrenAndConditionsTest`, `VerifyEmailAddress`, `ForgotPasswordTest`, `ActivityArchiveTest`, `AccountDeletionTest`, `LogoutTest`, `AppServiceProvider`, `ConfigurationAndLimitsTest`, `CategoryManagementTest`, `PasswordResetSafeguardsTest`, `ProfilePhotoTest`?**
  _High betweenness centrality (0.292) - this node is a cross-community bridge._
- **Should `Admin UI Class Tokens` be split into smaller, more focused modules?**
  _Cohesion score 0.03333333333333333 - nodes in this community are weakly interconnected._
- **Why does `Backend architecture` connect `AppServiceProvider` to `useAuth`, `AppServiceProvider`, `bootstrap/app.php`, `User`, `ProfessionalContact`?**
  _High betweenness centrality (0.208) - this node is a cross-community bridge._
- **Should `Backend Composer Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Why does `ConfirmDialog()` connect `useAuth` to `AppServiceProvider`, `apiRequest`, `react`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Should `Auth Pages Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Illuminate\Http\Request` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._