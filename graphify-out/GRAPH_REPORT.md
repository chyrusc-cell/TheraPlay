# Graph Report - TheraPlay  (2026-11-06)

## Corpus Check
- 274 files · ~150,777 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 27 file(s) not represented in the graph (top: (none) 18, .css 4, .example 2)

## Summary
- 2072 nodes · 5773 edges · 121 communities (51 shown, 70 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 168 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `94b82b06`
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
- Activities.jsx
- ActivityResource
- Admin Activity Tests
- AppServiceProvider
- EmailCodeTest
- react
- FeedbackTest
- backend/README.md
- Role Access Tests
- mockApi
- Persistent Completion Tests
- Base Migrations
- Activity Image Tests
- Activity Completion Tests
- ChildController.php
- Illuminate\Http\Request
- api.php
- Child Profile Tests
- 2026_11_01_000001_add_emails_and_phones_to_developer_team_table.php
- Developer Team Tests
- Laravel Application
- Closure
- Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED
- UserManagementController.php
- EmailVerificationTest
- User Factory
- ProgressTest
- AdminAccountManagementTest
- TheraPlay.jsx
- ChildrenAndConditionsTest
- ActivityJournalTest
- Laravel Application
- Cache Migration
- Categories Migration
- ActivityDetails.jsx
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
- ResolvesChild
- GlobalSearch.jsx
- ForgotPasswordTest
- 2026_11_04_000002_add_archive_to_activities_table.php
- UndoCompletionTest
- ConfigurationAndLimitsTest
- DeveloperTeam
- helpers.jsx
- 2026_11_02_000001_allow_multiple_children_per_user.php
- CategoryManagementTest
- 2026_10_21_083006_create_personal_access_tokens_table.php
- Controller
- ProfessionalContact
- ProfilePhotoTest
- PasswordResetSafeguardsTest
- ActivityCleanupTest
- Condition
- EmailChangeTest
- AppServiceProvider
- UnverifiedAccessTest
- Progress.jsx
- EmailVerificationCode
- ImportActivityLibraryTest
- ChildSelection.test.jsx
- renderWithProviders
- Activities.test.jsx
- User
- Illuminate\Console\Command
- ExampleTest
- ManageAccounts.test.jsx
- signIn
- Journal.test.jsx
- Dashboard.test.jsx
- 2026_11_06_000001_create_activity_journal_entries_table.php
- vitest
- Session.test.jsx

## God Nodes (most connected - your core abstractions)
1. `User` - 156 edges
2. `Activity` - 101 edges
3. `TestCase` - 84 edges
4. `Controller` - 59 edges
5. `Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED` - 59 edges
6. `apiRequest()` - 57 edges
7. `react` - 52 edges
8. `react-router-dom` - 49 edges
9. `EmailVerificationTest` - 42 edges
10. `mockApi()` - 42 edges

## Surprising Connections (you probably didn't know these)
- `Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED` --references--> `ActivityCompletionController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/ActivityCompletionController.php
- `Status (last updated 2026-11-04, after Stage 4)` --references--> `ActivityCompletionController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/ActivityCompletionController.php
- `Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED` --references--> `ActivityJournalController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/ActivityJournalController.php
- `Status (last updated 2026-11-04, after Stage 4)` --references--> `ActivityMaterialController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/ActivityMaterialController.php
- `Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED` --references--> `ActivityUndoController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/ActivityUndoController.php

## Import Cycles
- None detected.

## Communities (121 total, 70 thin omitted)

### Community 0 - "Admin UI Class Tokens"
Cohesion: 0.03
Nodes (65): actions, activityFormActions, activityFormGrid, activityPairRow, activityPicture, activityPictureButton, activityTextarea, addButton (+57 more)

### Community 1 - "Backend Composer Dependencies"
Cohesion: 0.04
Nodes (48): pestphp/pest-plugin, php-http/discovery, autoload, autoload-dev, psr-4, psr-4, config, allow-plugins (+40 more)

### Community 2 - "Auth Pages Styling"
Cohesion: 0.05
Nodes (43): backLink, field, fieldInRow, forgotLink, headerText, headerTextLogin, headerTitle, headerTitleLogin (+35 more)

### Community 3 - "UserManagementController.php"
Cohesion: 0.06
Nodes (5): {closure#1}(), {closure#1}(), {closure#1}(), RegisterController, MailDelivery

### Community 4 - "Illuminate\Database\Eloquent\Model"
Cohesion: 0.06
Nodes (10): ActivityJournalController, {closure#1}(), {closure#3}(), ActivityFeedbackController, {closure#1}(), {closure#1}(), FeedbackManagementController, FeedbackController (+2 more)

### Community 5 - "useAuth"
Cohesion: 0.18
Nodes (22): Frontend architecture, AuthContext, homeFor(), isUnverifiedParent(), ONBOARDING_PATHS, useAuth(), VERIFY_CODE_PATH, AuthProvider() (+14 more)

### Community 7 - "Frontend Tooling Config"
Cohesion: 0.06
Nodes (46): devDependencies, eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.6, globals@^17.12.0, jsdom@^30.1.3, tailwindcss@^4.3.3 (+38 more)

### Community 9 - "Activity"
Cohesion: 0.09
Nodes (11): {closure#1}(), {closure#1}(), RemoveTestActivities, ActivityController, {closure#1}(), ActivityImageController, ActivityManagementController, {closure#3}() (+3 more)

### Community 10 - "Activity Material Upload Tests"
Cohesion: 0.09
Nodes (3): ActivityMaterialUploadTest, ArchivedActivityContentTest, AttachmentPreviewTest

### Community 12 - "User"
Cohesion: 0.09
Nodes (6): {closure#1}(), ActivityProgress, Category, Child, AuthHardeningTest, TestCase

### Community 14 - "Backend Tooling Dependencies"
Cohesion: 0.05
Nodes (32): dependencies, @napi-rs/canvas@0.1.65, pdfjs-dist@4.10.38, devDependencies, concurrently@^10.0.3, laravel-vite-plugin@^3.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0 (+24 more)

### Community 16 - "Activities.jsx"
Cohesion: 0.09
Nodes (27): DIFFICULTIES, imagePlaceholders, Dashboard(), DAY_LETTERS, dayKey(), formatDate(), formatWeekRange(), getCurrentStreak() (+19 more)

### Community 19 - "AppServiceProvider"
Cohesion: 0.19
Nodes (6): ActivitySeeder, ConditionSeeder, DatabaseSeeder, Approved stages (Stages 1-4 are all implemented, see Status; none has had browser testing yet; nothing further is approved), Fixed decisions, Project status, fixed decisions and roadmap (keep current; read this first after a session reset)

### Community 21 - "react"
Cohesion: 0.10
Nodes (31): dependencies, lucide-react@^1.50.0, react@^19.2.8, react-dom@^19.2.8, react-router-dom@^7.18.4, lucide-react, react, react-dom (+23 more)

### Community 23 - "backend/README.md"
Cohesion: 0.25
Nodes (7): About Laravel, Agentic Development, Code of Conduct, Contributing, Learning Laravel, License, Security Vulnerabilities

### Community 25 - "mockApi"
Cohesion: 0.20
Nodes (8): @testing-library/user-event, adhd, autism, setup(), LoginProbe(), renderAt(), setup(), mockApi()

### Community 27 - "Base Migrations"
Cohesion: 0.16
Nodes (9): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}() (+1 more)

### Community 30 - "ChildController.php"
Cohesion: 0.17
Nodes (4): ChildController, {closure#1}(), {closure#2}(), {closure#5}()

### Community 31 - "Illuminate\Http\Request"
Cohesion: 0.11
Nodes (18): PasswordResetController, ProfilePhotoController, {closure#10}(), {closure#11}(), {closure#12}(), {closure#13}(), {closure#14}(), {closure#15}() (+10 more)

### Community 32 - "api.php"
Cohesion: 0.14
Nodes (4): ActivityCompletionController, ActivityUndoController, ContactController, LoginController

### Community 36 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 37 - "Closure"
Cohesion: 0.12
Nodes (11): {closure#1}(), {closure#1}(), AddSecurityHeaders, EnsureActivityNotArchived, EnsureUserHasRole, EnsureVerifiedParent, RequireVerifiedEmailWhenEnforced, {closure#1}() (+3 more)

### Community 38 - "Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED"
Cohesion: 0.33
Nodes (15): Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED, DashboardSkeleton(), HeadingSkeleton(), ListRowSkeleton(), ProfileSkeleton(), ProgressSkeleton(), StatTilesSkeleton(), linkClass() (+7 more)

### Community 39 - "UserManagementController.php"
Cohesion: 0.11
Nodes (7): CategoryManagementController, {closure#2}(), {closure#3}(), {closure#4}(), UserManagementController, ConditionController, EmailVerificationController

### Community 40 - "EmailVerificationTest"
Cohesion: 0.07
Nodes (4): VerificationCodeNotification, VerifyEmailAddress, {closure#1}(), EmailVerificationTest

### Community 44 - "TheraPlay.jsx"
Cohesion: 0.11
Nodes (21): react-router-dom, Activities(), ForgotPassword(), Login(), NotFound(), dotClass(), OnboardingFrame(), stageClass() (+13 more)

### Community 47 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 51 - "ActivityDetails.jsx"
Cohesion: 0.18
Nodes (17): ActivityDetails(), fetchIsCompleted(), JournalForm(), ActivityPicture(), isPdfThumbnail(), show(), API_URL, IMAGE_TYPES (+9 more)

### Community 61 - "apiRequest"
Cohesion: 0.16
Nodes (28): loadCompletedIds(), ActivityFeedbackSection(), apiRequest(), clearSession(), getToken(), CategoriesAdmin(), ConditionsAdmin(), EmailVerificationStatus() (+20 more)

### Community 64 - "ChildrenSection.jsx"
Cohesion: 0.31
Nodes (9): ChildFormFields(), ageText(), ChildrenSection(), emptyForm, dateLimits(), validateChild(), ConfirmDialog(), CreateChild() (+1 more)

### Community 75 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 82 - "GlobalSearch.jsx"
Cohesion: 0.57
Nodes (6): canSee(), normalize(), PAGES, scoreText(), searchActivities(), searchPages()

### Community 87 - "DeveloperTeam"
Cohesion: 0.22
Nodes (3): DeveloperTeamManagementController, DeveloperTeamController, DeveloperTeam

### Community 88 - "helpers.jsx"
Cohesion: 0.16
Nodes (10): setup(), parent(), setup(), empty, setup(), makeChild(), makeUser(), renderApp() (+2 more)

### Community 92 - "Controller"
Cohesion: 0.08
Nodes (14): ActivityMaterialController, ActivityResourceController, {closure#1}(), {closure#2}(), {closure#3}(), {closure#2}(), LogoutController, StreamsActivityMaterials (+6 more)

### Community 93 - "ProfessionalContact"
Cohesion: 0.30
Nodes (4): {closure#1}(), ContactManagementController, {closure#1}(), ProfessionalContact

### Community 99 - "Condition"
Cohesion: 0.29
Nodes (3): {closure#1}(), ConditionManagementController, Condition

### Community 101 - "AppServiceProvider"
Cohesion: 0.15
Nodes (6): AppServiceProvider, ErrorDetailSafeguardTest, Backend architecture, Commands, graphify, Working with graphify and claude-mem (do this on every prompt)

### Community 103 - "Progress.jsx"
Cohesion: 0.21
Nodes (14): ChildContext, SELECTED_CHILD_KEY_PREFIX, useChildren(), readStored(), ChildLoadError(), NoChildPrompt(), DAY_LABELS, dayKey() (+6 more)

### Community 104 - "EmailVerificationCode"
Cohesion: 0.20
Nodes (3): EmailCodeController, {closure#1}(), EmailVerificationCode

### Community 108 - "ChildSelection.test.jsx"
Cohesion: 0.17
Nodes (11): leo, mia, renderChildren(), StateProbe(), ChildSelector(), leo, leoRecords, mia (+3 more)

### Community 109 - "renderWithProviders"
Cohesion: 0.23
Nodes (11): savedTeam, setup(), activity(), openAddForm(), openArchived(), setup(), contact, setup() (+3 more)

### Community 110 - "Activities.test.jsx"
Cohesion: 0.21
Nodes (9): expectFilter(), filterButton(), leo, mia, optionTexts(), pick(), progress(), published (+1 more)

### Community 111 - "User"
Cohesion: 0.09
Nodes (5): InitializeAdmin, {closure#1}(), {closure#2}(), ProfileController, User

### Community 112 - "Illuminate\Console\Command"
Cohesion: 0.21
Nodes (4): GenerateActivityThumbnails, ImportActivityLibrary, PromoteUserToAdmin, SendTestMail

### Community 114 - "ManageAccounts.test.jsx"
Cohesion: 0.22
Nodes (4): base(), me, row(), setup()

### Community 115 - "signIn"
Cohesion: 0.31
Nodes (6): categories, renderAdmin(), account(), LoginProbe(), setup(), signIn()

### Community 116 - "Journal.test.jsx"
Cohesion: 0.25
Nodes (6): complete, completedRecord, detail, memory, mia, open()

### Community 117 - "Dashboard.test.jsx"
Cohesion: 0.40
Nodes (5): leo, mia, noRecords, setup(), makeActivity()

### Community 119 - "vitest"
Cohesion: 0.32
Nodes (3): @testing-library/react, vitest, open()

### Community 120 - "Session.test.jsx"
Cohesion: 0.33
Nodes (4): empty, NavProbe(), renderAt(), setup()

## Knowledge Gaps
- **70 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED` connect `Batch 5 (email delivery, UI consistency, progress, navigation): implemented; automated checks only, nothing tried in a browser, REAL EMAIL STILL UNVERIFIED` to `UserManagementController.php`, `Illuminate\Database\Eloquent\Model`, `useAuth`, `AdminInitializationTest`, `User Management Tests`, `User`, `Activities.jsx`, `ActivityResource`, `AppServiceProvider`, `EmailCodeTest`, `react`, `ChildController.php`, `Illuminate\Http\Request`, `api.php`, `Child Profile Tests`, `Closure`, `EmailVerificationTest`, `AdminAccountManagementTest`, `TheraPlay.jsx`, `ChildrenAndConditionsTest`, `ActivityDetails.jsx`, `EmailTransportTest`, `apiRequest`, `ChildrenSection.jsx`, `ResolvesChild`, `UndoCompletionTest`, `EmailChangeTest`, `AppServiceProvider`, `Progress.jsx`, `EmailVerificationCode`, `ImportActivityLibraryTest`?**
  _High betweenness centrality (0.261) - this node is a cross-community bridge._
- **Should `Admin UI Class Tokens` be split into smaller, more focused modules?**
  _Cohesion score 0.030303030303030304 - nodes in this community are weakly interconnected._
- **Why does `User` connect `User` to `UserManagementController.php`, `Stage4SecurityTest`, `Activity Material Upload Tests`, `User Management Tests`, `User`, `PasswordResetTest`, `ActivityResource`, `Admin Activity Tests`, `AppServiceProvider`, `EmailCodeTest`, `FeedbackTest`, `Role Access Tests`, `Persistent Completion Tests`, `Activity Image Tests`, `Activity Completion Tests`, `ChildController.php`, `Child Profile Tests`, `UserManagementController.php`, `EmailVerificationTest`, `User Factory`, `ProgressTest`, `AdminAccountManagementTest`, `ChildrenAndConditionsTest`, `ActivityJournalTest`, `ProfessionalContactTest`, `EmailTransportTest`, `ActivityArchiveTest`, `AccountDeletionTest`, `LogoutTest`, `ForgotPasswordTest`, `UndoCompletionTest`, `ConfigurationAndLimitsTest`, `CategoryManagementTest`, `Controller`, `ProfilePhotoTest`, `PasswordResetSafeguardsTest`, `EmailChangeTest`, `AppServiceProvider`, `UnverifiedAccessTest`, `EmailVerificationCode`, `Illuminate\Console\Command`?**
  _High betweenness centrality (0.208) - this node is a cross-community bridge._
- **Should `Backend Composer Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Why does `TestCase` connect `User` to `UserManagementController.php`, `Stage4SecurityTest`, `AdminInitializationTest`, `Activity Material Upload Tests`, `User Management Tests`, `PasswordResetTest`, `ActivityResource`, `Admin Activity Tests`, `EmailCodeTest`, `FeedbackTest`, `Role Access Tests`, `Persistent Completion Tests`, `Activity Image Tests`, `Activity Completion Tests`, `Child Profile Tests`, `Developer Team Tests`, `EmailVerificationTest`, `ProgressTest`, `AdminAccountManagementTest`, `ChildrenAndConditionsTest`, `ActivityJournalTest`, `ProfessionalContactTest`, `EmailTransportTest`, `ActivityArchiveTest`, `AccountDeletionTest`, `LogoutTest`, `ForgotPasswordTest`, `UndoCompletionTest`, `ConfigurationAndLimitsTest`, `CategoryManagementTest`, `Controller`, `ProfilePhotoTest`, `PasswordResetSafeguardsTest`, `ActivityCleanupTest`, `EmailChangeTest`, `AppServiceProvider`, `UnverifiedAccessTest`, `ImportActivityLibraryTest`, `ExampleTest`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Should `Auth Pages Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `UserManagementController.php` be split into smaller, more focused modules?**
  _Cohesion score 0.05957767722473605 - nodes in this community are weakly interconnected._