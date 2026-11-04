# Graph Report - TheraPlay  (2026-10-31)

## Corpus Check
- 214 files · ~102,252 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: (none) 18, .css 4, .example 2)

## Summary
- 1573 nodes · 4126 edges · 92 communities (35 shown, 57 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 71 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6fc14671`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Admin UI Class Tokens
- Backend Composer Dependencies
- Auth Pages Styling
- bootstrap/app.php
- Activity and Progress Models
- useAuth
- Illuminate\Http\Request
- Frontend Tooling Config
- Activities.jsx
- Activity
- Activity Material Upload Tests
- User Management Tests
- Image Upload and Hardening Tests
- Contact Management Controller
- Backend Tooling Dependencies
- .update
- Professional Contact Tests
- ActivityResourceController.php
- Admin Activity Tests
- PasswordResetTest
- PromoteUserToAdmin.php
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
- Illuminate\Support\Facades\Storage
- Child Profile Tests
- 2026_11_01_000001_add_emails_and_phones_to_developer_team_table.php
- Developer Team Tests
- Laravel Application
- Progress.jsx
- Illuminate\Http\Request
- Database Seeders
- EmailVerificationTest
- User Factory
- ProgressTest
- AdminAccountManagementTest
- Profile.jsx
- ChildrenAndConditionsTest
- Laravel Application
- Cache Migration
- Categories Migration
- Feedback Migration
- Contact Photo Migration
- User Photo Migration
- Child
- Illuminate\Support\Facades\Schema
- Illuminate\Database\Migrations\Migration
- Activities Migration
- Activity Progress Migration
- Activity Resources Migration
- ChildrenSection.jsx
- Professional Contacts Migration
- Developer Team Migration
- Unit Example Test
- React + Vite
- ContactPhotoTest
- .claude/CLAUDE.md
- AccountDeletionTest
- LogoutTest
- UserManagementController.php
- Backend architecture
- GlobalSearch.jsx
- apiRequest
- ConfigurationAndLimitsTest
- 2026_11_02_000002_create_activity_condition_table.php
- 2026_11_02_000001_allow_multiple_children_per_user.php
- CategoryManagementTest
- 2026_10_21_083006_create_personal_access_tokens_table.php
- CategoryManagementController
- PasswordResetSafeguardsTest

## God Nodes (most connected - your core abstractions)
1. `User` - 110 edges
2. `Activity` - 66 edges
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
- `Backend architecture` --references--> `EnsureUserHasRole`  [INFERRED]
  CLAUDE.md → backend/app/Http/Middleware/EnsureUserHasRole.php
- `Backend architecture` --references--> `RequireVerifiedEmailWhenEnforced`  [INFERRED]
  CLAUDE.md → backend/app/Http/Middleware/RequireVerifiedEmailWhenEnforced.php

## Import Cycles
- None detected.

## Communities (92 total, 57 thin omitted)

### Community 0 - "Admin UI Class Tokens"
Cohesion: 0.04
Nodes (56): actions, activityFormActions, activityFormGrid, activityPairRow, activityPicture, activityPictureButton, activityTextarea, addButton (+48 more)

### Community 1 - "Backend Composer Dependencies"
Cohesion: 0.04
Nodes (48): pestphp/pest-plugin, php-http/discovery, autoload, autoload-dev, psr-4, psr-4, config, allow-plugins (+40 more)

### Community 2 - "Auth Pages Styling"
Cohesion: 0.05
Nodes (42): backLink, field, fieldInRow, forgotLink, headerText, headerTextLogin, headerTitle, headerTitleLogin (+34 more)

### Community 3 - "bootstrap/app.php"
Cohesion: 0.15
Nodes (8): {closure#1}(), {closure#1}(), EnsureUserHasRole, RequireVerifiedEmailWhenEnforced, {closure#1}(), {closure#2}(), {closure#3}(), {closure#4}()

### Community 4 - "Activity and Progress Models"
Cohesion: 0.11
Nodes (3): {closure#1}(), ConditionManagementController, Condition

### Community 5 - "useAuth"
Cohesion: 0.22
Nodes (15): Frontend architecture, react, AuthContext, useAuth(), AuthProvider(), getToken(), ChildContext, SELECTED_CHILD_KEY_PREFIX (+7 more)

### Community 6 - "Illuminate\Http\Request"
Cohesion: 0.08
Nodes (11): {closure#1}(), FeedbackManagementController, ConditionController, DeveloperTeamController, FeedbackController, LoginController, LogoutController, ProgressController (+3 more)

### Community 7 - "Frontend Tooling Config"
Cohesion: 0.06
Nodes (46): devDependencies, eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.6, globals@^17.12.0, jsdom@^30.1.3, tailwindcss@^4.3.3 (+38 more)

### Community 8 - "Activities.jsx"
Cohesion: 0.13
Nodes (30): Activities(), DIFFICULTIES, imagePlaceholders, loadCompletedIds(), ActivityDetails(), fetchIsCompleted(), getToken(), ActivityPicture() (+22 more)

### Community 9 - "Activity"
Cohesion: 0.13
Nodes (8): ActivityController, {closure#1}(), ActivityImageController, ActivityManagementController, {closure#1}(), {closure#2}(), EmailVerificationController, Activity

### Community 12 - "Image Upload and Hardening Tests"
Cohesion: 0.13
Nodes (4): Category, AuthHardeningTest, ExampleTest, TestCase

### Community 13 - "Contact Management Controller"
Cohesion: 0.16
Nodes (7): {closure#1}(), {closure#2}(), ContactManagementController, {closure#1}(), ContactController, ValidatesImageUploads, ProfessionalContact

### Community 14 - "Backend Tooling Dependencies"
Cohesion: 0.10
Nodes (20): devDependencies, concurrently@^10.0.3, laravel-vite-plugin@^3.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, vite@^8.0.0, tailwindcss, @tailwindcss/vite (+12 more)

### Community 15 - ".update"
Cohesion: 0.20
Nodes (3): {closure#1}(), {closure#1}(), ProfileController

### Community 17 - "ActivityResourceController.php"
Cohesion: 0.14
Nodes (7): ActivityMaterialController, ActivityResourceController, {closure#1}(), {closure#2}(), {closure#3}(), StreamsActivityMaterials, ActivityResource

### Community 23 - "backend/README.md"
Cohesion: 0.25
Nodes (7): About Laravel, Agentic Development, Code of Conduct, Contributing, Learning Laravel, License, Security Vulnerabilities

### Community 25 - "helpers.jsx"
Cohesion: 0.06
Nodes (58): @testing-library/react, @testing-library/user-event, vitest, leo, mia, progress(), published, setup() (+50 more)

### Community 27 - "Base Migrations"
Cohesion: 0.23
Nodes (6): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#3}()

### Community 31 - "react"
Cohesion: 0.10
Nodes (26): dependencies, lucide-react@^1.50.0, react@^19.2.8, react-dom@^19.2.8, react-router-dom@^7.18.4, lucide-react, react-dom, Button() (+18 more)

### Community 35 - "Developer Team Tests"
Cohesion: 0.15
Nodes (3): DeveloperTeamManagementController, DeveloperTeam, DeveloperTeamTest

### Community 36 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 37 - "Progress.jsx"
Cohesion: 0.16
Nodes (22): useChildren(), renderChildren(), StateProbe(), ChildLoadError(), NoChildPrompt(), Dashboard(), DAY_LETTERS, dayKey() (+14 more)

### Community 38 - "Illuminate\Http\Request"
Cohesion: 0.14
Nodes (10): PasswordResetController, ProfilePhotoController, {closure#1}(), {closure#2}(), {closure#3}(), {closure#4}(), {closure#5}(), {closure#6}() (+2 more)

### Community 39 - "Database Seeders"
Cohesion: 0.25
Nodes (3): ActivitySeeder, ConditionSeeder, DatabaseSeeder

### Community 40 - "EmailVerificationTest"
Cohesion: 0.06
Nodes (4): VerifyEmailAddress, EmailChangeTest, {closure#1}(), EmailVerificationTest

### Community 44 - "Profile.jsx"
Cohesion: 0.16
Nodes (11): EmailVerificationStatus(), noticeColors, getToken(), noticeColors, PHOTO_TYPES, Profile(), splitName(), toFormValues() (+3 more)

### Community 47 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 54 - "Child"
Cohesion: 0.11
Nodes (9): ActivityCompletionController, {closure#1}(), ChildController, {closure#1}(), {closure#2}(), {closure#3}(), ResolvesChild, ActivityProgress (+1 more)

### Community 61 - "ChildrenSection.jsx"
Cohesion: 0.27
Nodes (10): API_URL, ChildFormFields(), ageText(), ChildrenSection(), emptyForm, dateLimits(), validateChild(), ConfirmDialog() (+2 more)

### Community 75 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 81 - "UserManagementController.php"
Cohesion: 0.21
Nodes (5): {closure#1}(), {closure#2}(), {closure#3}(), {closure#4}(), UserManagementController

### Community 83 - "Backend architecture"
Cohesion: 0.20
Nodes (5): AppServiceProvider, Backend architecture, Commands, graphify, Working with graphify and claude-mem (do this on every prompt)

### Community 84 - "GlobalSearch.jsx"
Cohesion: 0.38
Nodes (9): GlobalSearch(), audienceFor(), canSee(), normalize(), PAGES, scoreText(), searchActivities(), searchPages() (+1 more)

### Community 85 - "apiRequest"
Cohesion: 0.12
Nodes (28): react-router-dom, apiRequest(), clearSession(), getToken(), mapValidationErrors(), homeFor(), CategoriesAdmin(), ConditionsAdmin() (+20 more)

### Community 87 - "2026_11_02_000002_create_activity_condition_table.php"
Cohesion: 0.33
Nodes (3): {closure#1}(), {closure#2}(), {closure#3}()

## Knowledge Gaps
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `Activity and Progress Models`, `Illuminate\Http\Request`, `Activity`, `Activity Material Upload Tests`, `User Management Tests`, `Image Upload and Hardening Tests`, `.update`, `Professional Contact Tests`, `ActivityResourceController.php`, `Admin Activity Tests`, `PasswordResetTest`, `PromoteUserToAdmin.php`, `Feedback Tests`, `Role Access Tests`, `Persistent Completion Tests`, `Activity Image Tests`, `Activity Completion Tests`, `Profile Photo Tests`, `Illuminate\Support\Facades\Storage`, `Child Profile Tests`, `Developer Team Tests`, `Database Seeders`, `EmailVerificationTest`, `User Factory`, `ProgressTest`, `AdminAccountManagementTest`, `ChildrenAndConditionsTest`, `Child`, `ContactPhotoTest`, `AccountDeletionTest`, `LogoutTest`, `UserManagementController.php`, `Backend architecture`, `ConfigurationAndLimitsTest`, `CategoryManagementTest`, `PasswordResetSafeguardsTest`?**
  _High betweenness centrality (0.400) - this node is a cross-community bridge._
- **Should `Admin UI Class Tokens` be split into smaller, more focused modules?**
  _Cohesion score 0.03508771929824561 - nodes in this community are weakly interconnected._
- **Why does `Backend architecture` connect `Backend architecture` to `bootstrap/app.php`, `useAuth`, `Contact Management Controller`, `UserManagementController.php`, `User`, `ChildrenSection.jsx`?**
  _High betweenness centrality (0.305) - this node is a cross-community bridge._
- **Should `Backend Composer Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Why does `ConfirmDialog()` connect `ChildrenSection.jsx` to `Backend architecture`, `apiRequest`, `useAuth`, `react`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **Should `Auth Pages Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `bootstrap/app.php` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._