# Graph Report - TheraPlay  (2026-11-04)

## Corpus Check
- 238 files · ~119,462 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: (none) 18, .css 4, .example 2)

## Summary
- 1793 nodes · 4819 edges · 106 communities (41 shown, 65 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 119 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `77065dc8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Admin UI Class Tokens
- Backend Composer Dependencies
- Auth Pages Styling
- Illuminate\Http\Request
- Illuminate\Database\Eloquent\Model
- useAuth
- Stage4SecurityTest
- Frontend Tooling Config
- Contact.jsx
- Illuminate\Http\JsonResponse
- Activity Material Upload Tests
- User Management Tests
- TestCase
- Illuminate\Database\Seeder
- Backend Tooling Dependencies
- ContactPhotoTest
- Dashboard.jsx
- ActivityResource
- Admin Activity Tests
- PasswordResetTest
- ChildrenSection.jsx
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
- Progress.jsx
- ProfileController.php
- Child Profile Tests
- 2026_11_01_000001_add_emails_and_phones_to_developer_team_table.php
- Developer Team Tests
- Laravel Application
- Closure
- Illuminate\Http\Request
- UserManagementController.php
- EmailVerificationTest
- User Factory
- ProgressTest
- AdminAccountManagementTest
- TheraPlay.jsx
- ChildrenAndConditionsTest
- ChildController.php
- Laravel Application
- Cache Migration
- Categories Migration
- Feedback Migration
- Contact Photo Migration
- User Photo Migration
- ProfessionalContactTest
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
- Skeleton.jsx
- EmailTransportTest
- 2026_11_04_000002_add_archive_to_activities_table.php
- UndoCompletionTest
- ConfigurationAndLimitsTest
- DeveloperTeam
- AuthHardeningTest
- 2026_11_02_000001_allow_multiple_children_per_user.php
- CategoryManagementTest
- 2026_10_21_083006_create_personal_access_tokens_table.php
- GlobalSearch.jsx
- PasswordResetSafeguardsTest
- ProfilePhotoTest
- ExampleTest
- ActivityCleanupTest
- AppServiceProvider
- cspPolicy.test.js
- eslint.config.js
- Illuminate\Console\Command
- scripts
- ProfilePhotoController

## God Nodes (most connected - your core abstractions)
1. `User` - 123 edges
2. `Activity` - 86 edges
3. `TestCase` - 72 edges
4. `Controller` - 53 edges
5. `apiRequest()` - 49 edges
6. `react` - 46 edges
7. `react-router-dom` - 43 edges
8. `EmailVerificationTest` - 41 edges
9. `AdminAccountManagementTest` - 37 edges
10. `mockApi()` - 37 edges

## Surprising Connections (you probably didn't know these)
- `Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED` --references--> `ActivityCompletionController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/ActivityCompletionController.php
- `Status (last updated 2026-11-04, after Stage 4)` --references--> `ActivityCompletionController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/ActivityCompletionController.php
- `Status (last updated 2026-11-04, after Stage 4)` --references--> `ActivityController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/ActivityController.php
- `Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED` --references--> `ActivityUndoController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/ActivityUndoController.php
- `Status (last updated 2026-11-04, after Stage 4)` --references--> `ActivityManagementController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/Admin/ActivityManagementController.php

## Import Cycles
- None detected.

## Communities (106 total, 65 thin omitted)

### Community 0 - "Admin UI Class Tokens"
Cohesion: 0.03
Nodes (64): actions, activityFormActions, activityFormGrid, activityPairRow, activityPicture, activityPictureButton, activityTextarea, addButton (+56 more)

### Community 1 - "Backend Composer Dependencies"
Cohesion: 0.04
Nodes (48): pestphp/pest-plugin, php-http/discovery, autoload, autoload-dev, psr-4, psr-4, config, allow-plugins (+40 more)

### Community 2 - "Auth Pages Styling"
Cohesion: 0.05
Nodes (42): backLink, field, fieldInRow, forgotLink, headerText, headerTextLogin, headerTitle, headerTitleLogin (+34 more)

### Community 3 - "Illuminate\Http\Request"
Cohesion: 0.09
Nodes (10): ActivityUndoController, {closure#1}(), FeedbackManagementController, ConditionController, EmailVerificationController, FeedbackController, LoginController, LogoutController (+2 more)

### Community 4 - "Illuminate\Database\Eloquent\Model"
Cohesion: 0.11
Nodes (4): {closure#1}(), ConditionManagementController, {closure#1}(), Condition

### Community 5 - "useAuth"
Cohesion: 0.18
Nodes (21): Frontend architecture, getToken(), AuthContext, homeFor(), useAuth(), AuthProvider(), ChildContext, SELECTED_CHILD_KEY_PREFIX (+13 more)

### Community 7 - "Frontend Tooling Config"
Cohesion: 0.10
Nodes (26): devDependencies, jsdom@^30.1.3, tailwindcss@^4.3.3, @tailwindcss/vite@^4.3.3, @testing-library/dom@^10.4.2, @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8 (+18 more)

### Community 8 - "Contact.jsx"
Cohesion: 0.11
Nodes (21): Collapsible(), Contact(), ContactCard(), EmailVerificationStatus(), noticeColors, noticeColors, PHOTO_TYPES, Profile() (+13 more)

### Community 9 - "Illuminate\Http\JsonResponse"
Cohesion: 0.12
Nodes (7): ActivityController, {closure#1}(), ActivityImageController, ActivityManagementController, {closure#3}(), Activity, {closure#2}()

### Community 10 - "Activity Material Upload Tests"
Cohesion: 0.09
Nodes (3): ActivityMaterialUploadTest, ArchivedActivityContentTest, AttachmentPreviewTest

### Community 12 - "TestCase"
Cohesion: 0.12
Nodes (5): ActivityProgress, Child, Feedback, ErrorDetailSafeguardTest, TestCase

### Community 13 - "Illuminate\Database\Seeder"
Cohesion: 0.19
Nodes (6): ActivitySeeder, ConditionSeeder, DatabaseSeeder, Approved stages (Stages 1-4 are all implemented, see Status; none has had browser testing yet; nothing further is approved), Fixed decisions, Project status, fixed decisions and roadmap (keep current; read this first after a session reset)

### Community 14 - "Backend Tooling Dependencies"
Cohesion: 0.12
Nodes (20): devDependencies, concurrently@^10.0.3, laravel-vite-plugin@^3.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, vite@^8.0.0, tailwindcss, @tailwindcss/vite (+12 more)

### Community 16 - "Dashboard.jsx"
Cohesion: 0.20
Nodes (17): useChildren(), ChildLoadError(), NoChildPrompt(), Dashboard(), DAY_LETTERS, dayKey(), formatDate(), formatWeekRange() (+9 more)

### Community 17 - "ActivityResource"
Cohesion: 0.19
Nodes (8): ActivityMaterialController, ActivityResourceController, {closure#1}(), {closure#2}(), {closure#3}(), StreamsActivityMaterials, ActivityResource, Status (last updated 2026-11-04, after Stage 4)

### Community 20 - "ChildrenSection.jsx"
Cohesion: 0.33
Nodes (8): ChildFormFields(), ageText(), ChildrenSection(), emptyForm, dateLimits(), validateChild(), ConfirmDialog(), useConditions()

### Community 21 - "Activities.jsx"
Cohesion: 0.17
Nodes (21): Activities(), DIFFICULTIES, imagePlaceholders, loadCompletedIds(), ActivityDetails(), fetchIsCompleted(), ActivityPicture(), API_URL (+13 more)

### Community 23 - "backend/README.md"
Cohesion: 0.25
Nodes (7): About Laravel, Agentic Development, Code of Conduct, Contributing, Learning Laravel, License, Security Vulnerabilities

### Community 25 - "helpers.jsx"
Cohesion: 0.05
Nodes (66): @testing-library/react, @testing-library/user-event, vitest, leo, mia, progress(), published, setup() (+58 more)

### Community 27 - "Base Migrations"
Cohesion: 0.16
Nodes (9): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}() (+1 more)

### Community 30 - "ProfessionalContact"
Cohesion: 0.19
Nodes (6): {closure#1}(), {closure#2}(), ContactManagementController, {closure#1}(), ContactController, ProfessionalContact

### Community 31 - "Progress.jsx"
Cohesion: 0.21
Nodes (10): dependencies, lucide-react@^1.50.0, react@^19.2.8, react-dom@^19.2.8, react-router-dom@^7.18.4, lucide-react, react-dom, Button() (+2 more)

### Community 32 - "ProfileController.php"
Cohesion: 0.07
Nodes (4): {closure#1}(), {closure#2}(), {closure#3}(), MailDelivery

### Community 36 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 37 - "Closure"
Cohesion: 0.11
Nodes (12): {closure#1}(), {closure#1}(), ValidatesImageUploads, AddSecurityHeaders, EnsureActivityNotArchived, EnsureUserHasRole, RequireVerifiedEmailWhenEnforced, {closure#1}() (+4 more)

### Community 38 - "Illuminate\Http\Request"
Cohesion: 0.09
Nodes (18): ActivityCompletionController, {closure#1}(), CategoryManagementController, {closure#1}(), ProgressController, ResolvesChild, {closure#10}(), {closure#11}() (+10 more)

### Community 39 - "UserManagementController.php"
Cohesion: 0.22
Nodes (5): {closure#1}(), {closure#2}(), {closure#3}(), {closure#4}(), UserManagementController

### Community 40 - "EmailVerificationTest"
Cohesion: 0.06
Nodes (4): VerifyEmailAddress, EmailChangeTest, {closure#1}(), EmailVerificationTest

### Community 44 - "TheraPlay.jsx"
Cohesion: 0.15
Nodes (13): react, react-router-dom, ForgotPassword(), Login(), NotFound(), Register(), RequireRole(), ResetPassword() (+5 more)

### Community 47 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 61 - "apiRequest"
Cohesion: 0.15
Nodes (27): apiRequest(), clearSession(), mapValidationErrors(), CategoriesAdmin(), ConditionsAdmin(), DeleteAccountCard(), DeveloperTeamEditor(), toRows() (+19 more)

### Community 75 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 81 - "User"
Cohesion: 0.11
Nodes (4): {closure#1}(), {closure#1}(), ProfileController, User

### Community 82 - "Skeleton.jsx"
Cohesion: 0.28
Nodes (17): Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED, DashboardSkeleton(), HeadingSkeleton(), ListRowSkeleton(), ProfileSkeleton(), ProgressSkeleton(), StatTilesSkeleton(), formatDate() (+9 more)

### Community 87 - "DeveloperTeam"
Cohesion: 0.22
Nodes (3): DeveloperTeamManagementController, DeveloperTeamController, DeveloperTeam

### Community 92 - "GlobalSearch.jsx"
Cohesion: 0.57
Nodes (6): canSee(), normalize(), PAGES, scoreText(), searchActivities(), searchPages()

### Community 99 - "AppServiceProvider"
Cohesion: 0.12
Nodes (6): PasswordResetController, AppServiceProvider, {closure#1}(), Commands, graphify, Working with graphify and claude-mem (do this on every prompt)

### Community 100 - "cspPolicy.test.js"
Cohesion: 0.19
Nodes (5): @vitejs/plugin-react@^6.1.1, @vitejs/plugin-react, buildCsp(), html, sources

### Community 101 - "eslint.config.js"
Cohesion: 0.18
Nodes (10): eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.6, globals@^17.12.0, eslint, @eslint/js, eslint-plugin-react-hooks (+2 more)

### Community 102 - "Illuminate\Console\Command"
Cohesion: 0.24
Nodes (4): PromoteUserToAdmin, {closure#1}(), RemoveTestActivities, SendTestMail

### Community 103 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:coverage, test:run

## Knowledge Gaps
- **65 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Status (last updated 2026-11-04, after Stage 4)` connect `ActivityResource` to `Illuminate\Http\Request`, `AppServiceProvider`, `Closure`, `Illuminate\Http\Request`, `useAuth`, `EmailVerificationTest`, `Illuminate\Http\JsonResponse`, `Illuminate\Database\Seeder`, `PasswordResetTest`, `apiRequest`, `Activities.jsx`, `AuthHardeningTest`, `ForgotPasswordTest`, `PasswordResetSafeguardsTest`, `Progress.jsx`?**
  _High betweenness centrality (0.215) - this node is a cross-community bridge._
- **Should `Admin UI Class Tokens` be split into smaller, more focused modules?**
  _Cohesion score 0.03076923076923077 - nodes in this community are weakly interconnected._
- **Why does `User` connect `User` to `Illuminate\Http\Request`, `Stage4SecurityTest`, `Activity Material Upload Tests`, `User Management Tests`, `TestCase`, `Illuminate\Database\Seeder`, `ContactPhotoTest`, `Admin Activity Tests`, `PasswordResetTest`, `Feedback Tests`, `Role Access Tests`, `Persistent Completion Tests`, `Activity Image Tests`, `Activity Completion Tests`, `ProfileController.php`, `Child Profile Tests`, `Closure`, `UserManagementController.php`, `EmailVerificationTest`, `User Factory`, `ProgressTest`, `AdminAccountManagementTest`, `ChildrenAndConditionsTest`, `ProfessionalContactTest`, `ForgotPasswordTest`, `PasswordResetTest.php`, `ActivityArchiveTest`, `AccountDeletionTest`, `LogoutTest`, `EmailTransportTest`, `UndoCompletionTest`, `ConfigurationAndLimitsTest`, `CategoryManagementTest`, `PasswordResetSafeguardsTest`, `ProfilePhotoTest`, `Illuminate\Console\Command`?**
  _High betweenness centrality (0.200) - this node is a cross-community bridge._
- **Should `Backend Composer Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Why does `TestCase` connect `TestCase` to `Stage4SecurityTest`, `Activity Material Upload Tests`, `User Management Tests`, `ContactPhotoTest`, `Admin Activity Tests`, `PasswordResetTest`, `Feedback Tests`, `Role Access Tests`, `Persistent Completion Tests`, `Activity Image Tests`, `Activity Completion Tests`, `ProfileController.php`, `Child Profile Tests`, `Developer Team Tests`, `EmailVerificationTest`, `ProgressTest`, `AdminAccountManagementTest`, `ChildrenAndConditionsTest`, `ProfessionalContactTest`, `ForgotPasswordTest`, `PasswordResetTest.php`, `ActivityArchiveTest`, `AccountDeletionTest`, `LogoutTest`, `EmailTransportTest`, `UndoCompletionTest`, `ConfigurationAndLimitsTest`, `AuthHardeningTest`, `CategoryManagementTest`, `PasswordResetSafeguardsTest`, `ProfilePhotoTest`, `ExampleTest`, `ActivityCleanupTest`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Should `Auth Pages Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Illuminate\Http\Request` be split into smaller, more focused modules?**
  _Cohesion score 0.0873440285204991 - nodes in this community are weakly interconnected._