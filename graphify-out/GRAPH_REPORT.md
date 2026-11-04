# Graph Report - TheraPlay  (2026-11-04)

## Corpus Check
- 232 files · ~113,404 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: (none) 18, .css 4, .example 2)

## Summary
- 1737 nodes · 4640 edges · 93 communities (35 shown, 58 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 105 edges (avg confidence: 0.9)
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
- Stage4SecurityTest
- Frontend Tooling Config
- Profile.jsx
- Illuminate\Http\JsonResponse
- Activity Material Upload Tests
- User Management Tests
- TestCase
- Closure
- Backend Tooling Dependencies
- ContactPhotoTest
- Dashboard.jsx
- Illuminate\Http\UploadedFile
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
- ProfessionalContactTest
- react
- SendTestMail.php
- Child Profile Tests
- 2026_11_01_000001_add_emails_and_phones_to_developer_team_table.php
- Developer Team Tests
- Laravel Application
- cspPolicy.test.js
- eslint.config.js
- UserManagementController.php
- EmailVerificationTest
- User Factory
- ProgressTest
- AdminAccountManagementTest
- scripts
- ChildrenAndConditionsTest
- Condition
- Laravel Application
- Cache Migration
- Categories Migration
- Feedback Migration
- Contact Photo Migration
- User Photo Migration
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
- .update
- 2026_11_04_000002_add_archive_to_activities_table.php
- ConfigurationAndLimitsTest
- 2026_11_02_000001_allow_multiple_children_per_user.php
- CategoryManagementTest
- 2026_10_21_083006_create_personal_access_tokens_table.php
- GlobalSearch.jsx
- PasswordResetSafeguardsTest
- ProfilePhotoTest
- CategoryManagementController
- ActivityCleanupTest

## God Nodes (most connected - your core abstractions)
1. `User` - 119 edges
2. `Activity` - 84 edges
3. `TestCase` - 68 edges
4. `Controller` - 51 edges
5. `react` - 46 edges
6. `apiRequest()` - 46 edges
7. `react-router-dom` - 43 edges
8. `EmailVerificationTest` - 41 edges
9. `AdminAccountManagementTest` - 37 edges
10. `ChildrenAndConditionsTest` - 36 edges

## Surprising Connections (you probably didn't know these)
- `Status (last updated 2026-11-04)` --references--> `ActivityCompletionController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/ActivityCompletionController.php
- `Status (last updated 2026-11-04)` --references--> `CategoryManagementController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/Admin/CategoryManagementController.php
- `Backend architecture` --references--> `UserManagementController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/Admin/UserManagementController.php
- `Status (last updated 2026-11-04)` --references--> `LoginController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/LoginController.php
- `Frontend architecture` --references--> `ResolvesChild`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Concerns/ResolvesChild.php

## Import Cycles
- None detected.

## Communities (93 total, 58 thin omitted)

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
Cohesion: 0.05
Nodes (27): ActivityCompletionController, {closure#1}(), DeveloperTeamManagementController, FeedbackManagementController, ConditionController, DeveloperTeamController, FeedbackController, LoginController (+19 more)

### Community 4 - "Illuminate\Database\Eloquent\Model"
Cohesion: 0.08
Nodes (3): {closure#1}(), {closure#1}(), Feedback

### Community 5 - "useAuth"
Cohesion: 0.19
Nodes (19): Frontend architecture, react, getToken(), AuthContext, useAuth(), AuthProvider(), ChildContext, SELECTED_CHILD_KEY_PREFIX (+11 more)

### Community 7 - "Frontend Tooling Config"
Cohesion: 0.10
Nodes (26): devDependencies, jsdom@^30.1.3, tailwindcss@^4.3.3, @tailwindcss/vite@^4.3.3, @testing-library/dom@^10.4.2, @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8 (+18 more)

### Community 8 - "Profile.jsx"
Cohesion: 0.13
Nodes (19): EmailVerificationStatus(), noticeColors, formatDate(), ProfessionalDashboard(), noticeColors, PHOTO_TYPES, Profile(), splitName() (+11 more)

### Community 9 - "Illuminate\Http\JsonResponse"
Cohesion: 0.10
Nodes (10): ActivityController, {closure#1}(), ActivityMaterialController, ActivityImageController, ActivityManagementController, {closure#3}(), StreamsActivityMaterials, Activity (+2 more)

### Community 10 - "Activity Material Upload Tests"
Cohesion: 0.09
Nodes (3): ActivityMaterialUploadTest, ArchivedActivityContentTest, AttachmentPreviewTest

### Community 12 - "TestCase"
Cohesion: 0.07
Nodes (8): ActivityProgress, ActivityResource, Category, Child, User, AuthHardeningTest, ExampleTest, TestCase

### Community 13 - "Closure"
Cohesion: 0.05
Nodes (22): {closure#1}(), {closure#1}(), AddSecurityHeaders, EnsureActivityNotArchived, EnsureUserHasRole, RequireVerifiedEmailWhenEnforced, AppServiceProvider, {closure#1}() (+14 more)

### Community 14 - "Backend Tooling Dependencies"
Cohesion: 0.12
Nodes (20): devDependencies, concurrently@^10.0.3, laravel-vite-plugin@^3.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, vite@^8.0.0, tailwindcss, @tailwindcss/vite (+12 more)

### Community 16 - "Dashboard.jsx"
Cohesion: 0.20
Nodes (18): useChildren(), ChildLoadError(), NoChildPrompt(), Dashboard(), DAY_LETTERS, dayKey(), formatDate(), formatWeekRange() (+10 more)

### Community 17 - "Illuminate\Http\UploadedFile"
Cohesion: 0.12
Nodes (6): ActivityResourceController, {closure#1}(), {closure#2}(), {closure#3}(), ProfilePhotoController, ValidatesImageUploads

### Community 20 - "ChildrenSection.jsx"
Cohesion: 0.33
Nodes (8): API_URL, ChildFormFields(), ageText(), ChildrenSection(), emptyForm, dateLimits(), validateChild(), useConditions()

### Community 21 - "Activities.jsx"
Cohesion: 0.13
Nodes (26): Activities(), DIFFICULTIES, imagePlaceholders, loadCompletedIds(), ActivityDetails(), fetchIsCompleted(), ActivityPicture(), IMAGE_TYPES (+18 more)

### Community 23 - "backend/README.md"
Cohesion: 0.25
Nodes (7): About Laravel, Agentic Development, Code of Conduct, Contributing, Learning Laravel, License, Security Vulnerabilities

### Community 25 - "helpers.jsx"
Cohesion: 0.05
Nodes (64): @testing-library/react, @testing-library/user-event, vitest, leo, mia, progress(), published, setup() (+56 more)

### Community 27 - "Base Migrations"
Cohesion: 0.16
Nodes (9): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}() (+1 more)

### Community 30 - "ProfessionalContactTest"
Cohesion: 0.10
Nodes (7): {closure#1}(), {closure#2}(), ContactManagementController, {closure#1}(), ContactController, ProfessionalContact, ProfessionalContactTest

### Community 31 - "react"
Cohesion: 0.11
Nodes (23): dependencies, lucide-react@^1.50.0, react@^19.2.8, react-dom@^19.2.8, react-router-dom@^7.18.4, lucide-react, react-dom, Collapsible() (+15 more)

### Community 32 - "SendTestMail.php"
Cohesion: 0.19
Nodes (4): PromoteUserToAdmin, {closure#1}(), RemoveTestActivities, SendTestMail

### Community 36 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 37 - "cspPolicy.test.js"
Cohesion: 0.19
Nodes (5): @vitejs/plugin-react@^6.1.1, @vitejs/plugin-react, buildCsp(), html, sources

### Community 38 - "eslint.config.js"
Cohesion: 0.18
Nodes (10): eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.6, globals@^17.12.0, eslint, @eslint/js, eslint-plugin-react-hooks (+2 more)

### Community 39 - "UserManagementController.php"
Cohesion: 0.12
Nodes (6): {closure#1}(), {closure#2}(), {closure#3}(), {closure#4}(), UserManagementController, MailDelivery

### Community 40 - "EmailVerificationTest"
Cohesion: 0.06
Nodes (4): VerifyEmailAddress, EmailChangeTest, {closure#1}(), EmailVerificationTest

### Community 44 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:coverage, test:run

### Community 46 - "Condition"
Cohesion: 0.11
Nodes (7): {closure#1}(), ConditionManagementController, ChildController, {closure#1}(), {closure#2}(), {closure#3}(), Condition

### Community 47 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 61 - "apiRequest"
Cohesion: 0.11
Nodes (30): react-router-dom, apiRequest(), clearSession(), mapValidationErrors(), homeFor(), CategoriesAdmin(), ConditionsAdmin(), DeleteAccountCard() (+22 more)

### Community 75 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 81 - ".update"
Cohesion: 0.12
Nodes (5): EmailVerificationController, {closure#1}(), {closure#1}(), ProfileController, {closure#1}()

### Community 92 - "GlobalSearch.jsx"
Cohesion: 0.38
Nodes (9): GlobalSearch(), audienceFor(), canSee(), normalize(), PAGES, scoreText(), searchActivities(), searchPages() (+1 more)

## Knowledge Gaps
- **58 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Status (last updated 2026-11-04)` connect `Illuminate\Http\JsonResponse` to `CategoryManagementController`, `Illuminate\Http\Request`, `useAuth`, `EmailVerificationTest`, `TestCase`, `Closure`, `PasswordResetTest`, `Activities.jsx`, `ForgotPasswordTest`, `PasswordResetSafeguardsTest`, `react`?**
  _High betweenness centrality (0.259) - this node is a cross-community bridge._
- **Should `Admin UI Class Tokens` be split into smaller, more focused modules?**
  _Cohesion score 0.03333333333333333 - nodes in this community are weakly interconnected._
- **Why does `User` connect `TestCase` to `Illuminate\Http\Request`, `Illuminate\Database\Eloquent\Model`, `Stage4SecurityTest`, `Activity Material Upload Tests`, `User Management Tests`, `Closure`, `ContactPhotoTest`, `Illuminate\Http\UploadedFile`, `Admin Activity Tests`, `PasswordResetTest`, `Feedback Tests`, `Role Access Tests`, `Persistent Completion Tests`, `Activity Image Tests`, `Activity Completion Tests`, `ProfessionalContactTest`, `SendTestMail.php`, `Child Profile Tests`, `UserManagementController.php`, `EmailVerificationTest`, `User Factory`, `ProgressTest`, `AdminAccountManagementTest`, `ChildrenAndConditionsTest`, `ForgotPasswordTest`, `ActivityArchiveTest`, `AccountDeletionTest`, `LogoutTest`, `.update`, `ConfigurationAndLimitsTest`, `CategoryManagementTest`, `PasswordResetSafeguardsTest`, `ProfilePhotoTest`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Should `Backend Composer Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Why does `getToken()` connect `useAuth` to `Profile.jsx`, `Illuminate\Http\JsonResponse`, `Dashboard.jsx`, `ChildrenSection.jsx`, `Activities.jsx`, `apiRequest`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Should `Auth Pages Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Illuminate\Http\Request` be split into smaller, more focused modules?**
  _Cohesion score 0.0517503805175038 - nodes in this community are weakly interconnected._