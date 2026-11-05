# Graph Report - TheraPlay  (2026-11-05)

## Corpus Check
- 259 files · ~139,097 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 27 file(s) not represented in the graph (top: (none) 18, .css 4, .example 2)

## Summary
- 1953 nodes · 5312 edges · 109 communities (37 shown, 72 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 153 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0447673b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Admin UI Class Tokens
- Backend Composer Dependencies
- Auth Pages Styling
- UserManagementController.php
- Illuminate\Database\Eloquent\Model
- useAuth
- Stage4SecurityTest
- Frontend Tooling Config
- AdminInitializationTest
- Activity
- Activity Material Upload Tests
- User Management Tests
- User
- Backend Tooling Dependencies
- PasswordResetTest
- Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED
- ActivityResource
- Admin Activity Tests
- AppServiceProvider
- EmailCodeTest
- Activities.jsx
- FeedbackTest
- backend/README.md
- Role Access Tests
- helpers.jsx
- Persistent Completion Tests
- Base Migrations
- Activity Image Tests
- Activity Completion Tests
- ChildController.php
- Illuminate\Http\Request
- Controller
- Child Profile Tests
- 2026_11_01_000001_add_emails_and_phones_to_developer_team_table.php
- Developer Team Tests
- Laravel Application
- Closure
- ChildrenSection.jsx
- UserManagementController.php
- EmailVerificationTest
- User Factory
- ProgressTest
- AdminAccountManagementTest
- TheraPlay.jsx
- ChildrenAndConditionsTest
- Illuminate\Console\Command
- Laravel Application
- Cache Migration
- Categories Migration
- Feedback Migration
- Contact Photo Migration
- User Photo Migration
- ProfessionalContactTest
- Illuminate\Support\Facades\Schema
- Illuminate\Database\Migrations\Migration
- EmailTransportTest
- 2026_10_21_080311_create_activities_table.php
- Activity Progress Migration
- Activity Resources Migration
- apiRequest
- Professional Contacts Migration
- Developer Team Migration
- ChildrenSection.jsx
- Unit Example Test
- ActivityArchiveTest
- React + Vite
- 2026_10_21_080259_create_child_condition_table.php
- .claude/CLAUDE.md
- AccountDeletionTest
- LogoutTest
- CategoryManagementController
- GlobalSearch.jsx
- ForgotPasswordTest
- 2026_11_04_000002_add_archive_to_activities_table.php
- UndoCompletionTest
- ConfigurationAndLimitsTest
- DeveloperTeam
- Profile.jsx
- 2026_11_02_000001_allow_multiple_children_per_user.php
- CategoryManagementTest
- 2026_10_21_083006_create_personal_access_tokens_table.php
- ActivityResourceController.php
- ProfessionalContact
- ProfilePhotoTest
- PasswordResetSafeguardsTest
- ActivityCleanupTest
- Condition
- EmailChangeTest
- ImportActivityLibraryTest
- ProfilePhotoController
- User
- AuthHardeningTest
- ExampleTest

## God Nodes (most connected - your core abstractions)
1. `User` - 142 edges
2. `Activity` - 95 edges
3. `TestCase` - 80 edges
4. `Controller` - 55 edges
5. `apiRequest()` - 53 edges
6. `react` - 49 edges
7. `react-router-dom` - 46 edges
8. `Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED` - 45 edges
9. `EmailVerificationTest` - 42 edges
10. `ChildrenAndConditionsTest` - 39 edges

## Surprising Connections (you probably didn't know these)
- `Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED` --references--> `linkClass()`  [INFERRED]
  CLAUDE.md → src/Sidebar.jsx
- `Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED` --references--> `ActivityCompletionController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/ActivityCompletionController.php
- `Status (last updated 2026-11-04, after Stage 4)` --references--> `ActivityCompletionController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/ActivityCompletionController.php
- `Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED` --references--> `ActivityUndoController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/ActivityUndoController.php
- `Status (last updated 2026-11-04, after Stage 4)` --references--> `CategoryManagementController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/Admin/CategoryManagementController.php

## Import Cycles
- None detected.

## Communities (109 total, 72 thin omitted)

### Community 0 - "Admin UI Class Tokens"
Cohesion: 0.03
Nodes (65): actions, activityFormActions, activityFormGrid, activityPairRow, activityPicture, activityPictureButton, activityTextarea, addButton (+57 more)

### Community 1 - "Backend Composer Dependencies"
Cohesion: 0.04
Nodes (48): pestphp/pest-plugin, php-http/discovery, autoload, autoload-dev, psr-4, psr-4, config, allow-plugins (+40 more)

### Community 2 - "Auth Pages Styling"
Cohesion: 0.05
Nodes (43): backLink, field, fieldInRow, forgotLink, headerText, headerTextLogin, headerTitle, headerTitleLogin (+35 more)

### Community 4 - "Illuminate\Database\Eloquent\Model"
Cohesion: 0.13
Nodes (3): {closure#1}(), {closure#2}(), Feedback

### Community 5 - "useAuth"
Cohesion: 0.13
Nodes (33): Frontend architecture, react, getToken(), AuthContext, homeFor(), useAuth(), AuthProvider(), ChildContext (+25 more)

### Community 7 - "Frontend Tooling Config"
Cohesion: 0.06
Nodes (46): devDependencies, eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.6, globals@^17.12.0, jsdom@^30.1.3, tailwindcss@^4.3.3 (+38 more)

### Community 9 - "Activity"
Cohesion: 0.08
Nodes (14): {closure#1}(), {closure#1}(), RemoveTestActivities, ActivityController, {closure#1}(), ActivityMaterialController, ActivityImageController, ActivityManagementController (+6 more)

### Community 10 - "Activity Material Upload Tests"
Cohesion: 0.09
Nodes (3): ActivityMaterialUploadTest, ArchivedActivityContentTest, AttachmentPreviewTest

### Community 12 - "User"
Cohesion: 0.13
Nodes (4): ActivityProgress, ActivityResource, Child, TestCase

### Community 14 - "Backend Tooling Dependencies"
Cohesion: 0.06
Nodes (30): dependencies, @napi-rs/canvas@0.1.65, pdfjs-dist@4.10.38, devDependencies, concurrently@^10.0.3, laravel-vite-plugin@^3.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0 (+22 more)

### Community 16 - "Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED"
Cohesion: 0.12
Nodes (32): Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED, ONBOARDING_PATHS, Collapsible(), Contact(), ContactCard(), DashboardSkeleton(), HeadingSkeleton(), ListRowSkeleton() (+24 more)

### Community 19 - "AppServiceProvider"
Cohesion: 0.08
Nodes (11): AppServiceProvider, ActivitySeeder, ConditionSeeder, DatabaseSeeder, ErrorDetailSafeguardTest, Approved stages (Stages 1-4 are all implemented, see Status; none has had browser testing yet; nothing further is approved), Commands, Fixed decisions (+3 more)

### Community 21 - "Activities.jsx"
Cohesion: 0.15
Nodes (23): Activities(), DIFFICULTIES, imagePlaceholders, loadCompletedIds(), ActivityDetails(), fetchIsCompleted(), ActivityPicture(), isPdfThumbnail() (+15 more)

### Community 23 - "backend/README.md"
Cohesion: 0.25
Nodes (7): About Laravel, Agentic Development, Code of Conduct, Contributing, Learning Laravel, License, Security Vulnerabilities

### Community 25 - "helpers.jsx"
Cohesion: 0.05
Nodes (65): @testing-library/react, @testing-library/user-event, vitest, leo, mia, progress(), published, setup() (+57 more)

### Community 27 - "Base Migrations"
Cohesion: 0.16
Nodes (9): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}() (+1 more)

### Community 30 - "ChildController.php"
Cohesion: 0.19
Nodes (4): ChildController, {closure#1}(), {closure#2}(), {closure#5}()

### Community 31 - "Illuminate\Http\Request"
Cohesion: 0.10
Nodes (18): EmailCodeController, PasswordResetController, RegisterController, {closure#1}(), {closure#10}(), {closure#11}(), {closure#12}(), {closure#13}() (+10 more)

### Community 32 - "Controller"
Cohesion: 0.07
Nodes (12): ActivityCompletionController, {closure#1}(), ActivityUndoController, {closure#1}(), FeedbackManagementController, ConditionController, FeedbackController, LoginController (+4 more)

### Community 36 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 37 - "Closure"
Cohesion: 0.12
Nodes (11): {closure#1}(), {closure#1}(), AddSecurityHeaders, EnsureActivityNotArchived, EnsureUserHasRole, RequireVerifiedEmailWhenEnforced, {closure#1}(), {closure#2}() (+3 more)

### Community 38 - "ChildrenSection.jsx"
Cohesion: 0.14
Nodes (18): dependencies, lucide-react@^1.50.0, react@^19.2.8, react-dom@^19.2.8, react-router-dom@^7.18.4, lucide-react, react-dom, Button() (+10 more)

### Community 39 - "UserManagementController.php"
Cohesion: 0.12
Nodes (6): {closure#2}(), {closure#3}(), {closure#4}(), UserManagementController, EmailVerificationController, ProfileController

### Community 40 - "EmailVerificationTest"
Cohesion: 0.07
Nodes (4): VerificationCodeNotification, VerifyEmailAddress, {closure#1}(), EmailVerificationTest

### Community 44 - "TheraPlay.jsx"
Cohesion: 0.12
Nodes (21): react-router-dom, ForgotPassword(), Login(), NotFound(), dotClass(), OnboardingFrame(), stageClass(), STAGES (+13 more)

### Community 46 - "Illuminate\Console\Command"
Cohesion: 0.15
Nodes (5): GenerateActivityThumbnails, ImportActivityLibrary, InitializeAdmin, PromoteUserToAdmin, SendTestMail

### Community 47 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 61 - "apiRequest"
Cohesion: 0.12
Nodes (33): apiRequest(), clearSession(), mapValidationErrors(), CategoriesAdmin(), ConditionsAdmin(), DeleteAccountCard(), DeveloperTeamEditor(), toRows() (+25 more)

### Community 64 - "ChildrenSection.jsx"
Cohesion: 0.36
Nodes (8): ChildFormFields(), ageText(), ChildrenSection(), emptyForm, dateLimits(), validateChild(), CreateChild(), useConditions()

### Community 75 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 82 - "GlobalSearch.jsx"
Cohesion: 0.38
Nodes (9): GlobalSearch(), audienceFor(), canSee(), normalize(), PAGES, scoreText(), searchActivities(), searchPages() (+1 more)

### Community 87 - "DeveloperTeam"
Cohesion: 0.22
Nodes (3): DeveloperTeamManagementController, DeveloperTeamController, DeveloperTeam

### Community 88 - "Profile.jsx"
Cohesion: 0.23
Nodes (6): noticeColors, PHOTO_TYPES, Profile(), splitName(), toFormValues(), SectionErrorBoundary

### Community 92 - "ActivityResourceController.php"
Cohesion: 0.22
Nodes (3): {closure#1}(), {closure#2}(), {closure#3}()

### Community 93 - "ProfessionalContact"
Cohesion: 0.15
Nodes (7): {closure#1}(), {closure#2}(), ContactManagementController, {closure#1}(), ContactController, ValidatesImageUploads, ProfessionalContact

### Community 99 - "Condition"
Cohesion: 0.23
Nodes (3): {closure#1}(), ConditionManagementController, Condition

### Community 111 - "User"
Cohesion: 0.09
Nodes (4): {closure#1}(), {closure#1}(), User, EmailVerificationCode

## Knowledge Gaps
- **72 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED` connect `Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED` to `useAuth`, `AdminInitializationTest`, `User Management Tests`, `ActivityResource`, `AppServiceProvider`, `EmailCodeTest`, `Activities.jsx`, `ChildController.php`, `Illuminate\Http\Request`, `Controller`, `Child Profile Tests`, `ChildrenSection.jsx`, `EmailVerificationTest`, `AdminAccountManagementTest`, `TheraPlay.jsx`, `ChildrenAndConditionsTest`, `EmailTransportTest`, `apiRequest`, `ChildrenSection.jsx`, `UndoCompletionTest`, `Profile.jsx`, `EmailChangeTest`, `ImportActivityLibraryTest`, `AuthHardeningTest`?**
  _High betweenness centrality (0.220) - this node is a cross-community bridge._
- **Should `Admin UI Class Tokens` be split into smaller, more focused modules?**
  _Cohesion score 0.030303030303030304 - nodes in this community are weakly interconnected._
- **Why does `User` connect `User` to `UserManagementController.php`, `Illuminate\Database\Eloquent\Model`, `Stage4SecurityTest`, `Activity Material Upload Tests`, `User Management Tests`, `User`, `PasswordResetTest`, `ActivityResource`, `Admin Activity Tests`, `AppServiceProvider`, `EmailCodeTest`, `FeedbackTest`, `Role Access Tests`, `Persistent Completion Tests`, `Activity Image Tests`, `Activity Completion Tests`, `ChildController.php`, `Illuminate\Http\Request`, `Controller`, `Child Profile Tests`, `Closure`, `UserManagementController.php`, `EmailVerificationTest`, `User Factory`, `ProgressTest`, `AdminAccountManagementTest`, `ChildrenAndConditionsTest`, `Illuminate\Console\Command`, `ProfessionalContactTest`, `EmailTransportTest`, `ActivityArchiveTest`, `AccountDeletionTest`, `LogoutTest`, `ForgotPasswordTest`, `UndoCompletionTest`, `ConfigurationAndLimitsTest`, `CategoryManagementTest`, `ProfilePhotoTest`, `PasswordResetSafeguardsTest`, `EmailChangeTest`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Should `Backend Composer Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Why does `Status (last updated 2026-11-04, after Stage 4)` connect `Activity` to `Controller`, `PasswordResetSafeguardsTest`, `EmailChangeTest`, `Closure`, `useAuth`, `ChildrenSection.jsx`, `EmailVerificationTest`, `PasswordResetTest`, `AuthHardeningTest`, `CategoryManagementController`, `AppServiceProvider`, `ForgotPasswordTest`, `Activities.jsx`, `apiRequest`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Should `Auth Pages Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `UserManagementController.php` be split into smaller, more focused modules?**
  _Cohesion score 0.0907563025210084 - nodes in this community are weakly interconnected._