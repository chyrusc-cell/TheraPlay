# Graph Report - TheraPlay  (2026-10-29)

## Corpus Check
- 168 files · ~67,083 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 25 file(s) not represented in the graph (top: (none) 18, .css 4, .example 1)

## Summary
- 1173 nodes · 2808 edges · 92 communities (36 shown, 56 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bd29d1bf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Admin UI Class Tokens
- Backend Composer Dependencies
- Auth Pages Styling
- ForgotPasswordTest
- Activity and Progress Models
- Frontend Dependencies
- Illuminate\Http\Request
- Frontend Tooling Config
- Contact.jsx
- Public Activity Controller
- Activity Material Upload Tests
- User Management Tests
- Image Upload and Hardening Tests
- Contact Management Controller
- Backend Tooling Dependencies
- Skeleton.jsx
- Professional Contact Tests
- ActivityResourceController.php
- Admin Activity Tests
- PasswordResetTest
- Login, Register and User Model
- Feedback Tests
- backend/README.md
- Role Access Tests
- Activity Details Page
- Persistent Completion Tests
- Base Migrations
- Activity Image Tests
- Activity Completion Tests
- Profile Photo Tests
- TheraPlay.jsx
- Developer Team API
- Child Profile Tests
- 2026_11_01_000001_add_emails_and_phones_to_developer_team_table.php
- Developer Team Tests
- Laravel Application
- Progress Page
- Laravel Bootstrap
- Database Seeders
- Profile Page
- User Factory
- Progress Tests
- ProfilePhotoController.php
- ActivityCompletionController.php
- ChildrenAndConditionsTest
- Logout Tests
- Laravel Application
- Cache Migration
- Categories Migration
- Feedback Migration
- Contact Photo Migration
- User Photo Migration
- Illuminate\Support\Facades\Schema
- Illuminate\Database\Migrations\Migration
- PasswordResetTest.php
- Activities Migration
- Activity Progress Migration
- Activity Resources Migration
- AuthHardeningTest
- Professional Contacts Migration
- Developer Team Migration
- Unit Example Test
- React + Vite
- ExampleTest
- .claude/CLAUDE.md
- Controller
- Illuminate\Http\UploadedFile
- ChildController.php
- ContactPhotoTest
- AppServiceProvider
- ActivityController.php
- Register.jsx
- searchIndex.js
- 2026_11_02_000002_create_activity_condition_table.php
- PromoteUserToAdmin.php
- 2026_11_02_000001_allow_multiple_children_per_user.php
- CLAUDE.md
- 2026_10_21_083006_create_personal_access_tokens_table.php

## God Nodes (most connected - your core abstractions)
1. `User` - 73 edges
2. `Activity` - 57 edges
3. `Controller` - 47 edges
4. `TestCase` - 42 edges
5. `apiRequest()` - 35 edges
6. `react` - 34 edges
7. `ActivityMaterialUploadTest` - 30 edges
8. `ChildrenAndConditionsTest` - 30 edges
9. `UserManagementTest` - 30 edges
10. `react-router-dom` - 25 edges

## Surprising Connections (you probably didn't know these)
- `Commands` --references--> `AppServiceProvider`  [INFERRED]
  CLAUDE.md → backend/app/Providers/AppServiceProvider.php
- `Backend architecture` --references--> `UserManagementController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/Admin/UserManagementController.php
- `Frontend architecture` --references--> `ResolvesChild`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Concerns/ResolvesChild.php
- `Backend architecture` --references--> `EnsureUserHasRole`  [INFERRED]
  CLAUDE.md → backend/app/Http/Middleware/EnsureUserHasRole.php
- `Frontend architecture` --references--> `clearSession()`  [INFERRED]
  CLAUDE.md → src/api.js

## Import Cycles
- None detected.

## Communities (92 total, 56 thin omitted)

### Community 0 - "Admin UI Class Tokens"
Cohesion: 0.04
Nodes (56): actions, activityFormActions, activityFormGrid, activityPairRow, activityPicture, activityPictureButton, activityTextarea, addButton (+48 more)

### Community 1 - "Backend Composer Dependencies"
Cohesion: 0.04
Nodes (48): pestphp/pest-plugin, php-http/discovery, autoload, autoload-dev, psr-4, psr-4, config, allow-plugins (+40 more)

### Community 2 - "Auth Pages Styling"
Cohesion: 0.04
Nodes (45): backgroundStyle, backLink, divider, dividerText, field, fieldInRow, forgotLink, headerText (+37 more)

### Community 4 - "Activity and Progress Models"
Cohesion: 0.12
Nodes (3): {closure#1}(), ConditionManagementController, Condition

### Community 5 - "Frontend Dependencies"
Cohesion: 0.17
Nodes (20): Frontend architecture, react, AuthContext, useAuth(), AuthProvider(), getToken(), ChildContext, SELECTED_CHILD_KEY_PREFIX (+12 more)

### Community 6 - "Illuminate\Http\Request"
Cohesion: 0.13
Nodes (6): ChildController, LoginController, PasswordResetController, ProfilePhotoController, RegisterController, GET /user()

### Community 7 - "Frontend Tooling Config"
Cohesion: 0.09
Nodes (32): devDependencies, eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.6, globals@^17.12.0, tailwindcss@^4.3.3, @tailwindcss/vite@^4.3.3 (+24 more)

### Community 8 - "Contact.jsx"
Cohesion: 0.21
Nodes (12): dependencies, lucide-react@^1.50.0, react@^19.2.8, react-dom@^19.2.8, react-router-dom@^7.18.4, lucide-react, Collapsible(), Contact() (+4 more)

### Community 9 - "Public Activity Controller"
Cohesion: 0.18
Nodes (5): {closure#3}(), ActivityImageController, ActivityManagementController, {closure#1}(), Activity

### Community 12 - "Image Upload and Hardening Tests"
Cohesion: 0.20
Nodes (4): ActivityProgress, Category, Child, TestCase

### Community 13 - "Contact Management Controller"
Cohesion: 0.21
Nodes (6): {closure#1}(), {closure#2}(), ContactManagementController, {closure#1}(), ContactController, ProfessionalContact

### Community 14 - "Backend Tooling Dependencies"
Cohesion: 0.10
Nodes (20): devDependencies, concurrently@^10.0.3, laravel-vite-plugin@^3.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, vite@^8.0.0, tailwindcss, @tailwindcss/vite (+12 more)

### Community 15 - "Skeleton.jsx"
Cohesion: 0.15
Nodes (27): Dashboard(), DAY_LETTERS, dayKey(), formatDate(), formatWeekRange(), getCurrentStreak(), getToken(), getWeekStart() (+19 more)

### Community 17 - "ActivityResourceController.php"
Cohesion: 0.25
Nodes (5): ActivityMaterialController, ActivityResourceController, {closure#3}(), StreamsActivityMaterials, ActivityResource

### Community 21 - "Login, Register and User Model"
Cohesion: 0.13
Nodes (3): {closure#1}(), UserManagementController, User

### Community 23 - "backend/README.md"
Cohesion: 0.25
Nodes (7): About Laravel, Agentic Development, Code of Conduct, Contributing, Learning Laravel, License, Security Vulnerabilities

### Community 25 - "Activity Details Page"
Cohesion: 0.27
Nodes (13): Activities(), DIFFICULTIES, imagePlaceholders, loadCompletedIds(), ActivityDetails(), fetchIsCompleted(), getToken(), ActivityPicture() (+5 more)

### Community 27 - "Base Migrations"
Cohesion: 0.23
Nodes (6): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#3}()

### Community 31 - "TheraPlay.jsx"
Cohesion: 0.12
Nodes (30): react-dom, react-router-dom, API_URL, apiRequest(), clearSession(), mapValidationErrors(), ageText(), ChildrenSection() (+22 more)

### Community 32 - "Developer Team API"
Cohesion: 0.22
Nodes (3): DeveloperTeamManagementController, DeveloperTeamController, DeveloperTeam

### Community 36 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 37 - "Progress Page"
Cohesion: 0.26
Nodes (12): useChildren(), ChildLoadError(), NoChildPrompt(), DAY_LABELS, dayKey(), formatDate(), formatWeekLabel(), getLongestStreak() (+4 more)

### Community 38 - "Laravel Bootstrap"
Cohesion: 0.32
Nodes (3): {closure#1}(), {closure#2}(), {closure#3}()

### Community 39 - "Database Seeders"
Cohesion: 0.25
Nodes (3): ActivitySeeder, ConditionSeeder, DatabaseSeeder

### Community 40 - "Profile Page"
Cohesion: 0.43
Nodes (6): getToken(), noticeColors, PHOTO_TYPES, Profile(), splitName(), toFormValues()

### Community 43 - "ProfilePhotoController.php"
Cohesion: 0.29
Nodes (4): {closure#1}(), {closure#1}(), {closure#1}(), EnsureUserHasRole

### Community 44 - "ActivityCompletionController.php"
Cohesion: 0.18
Nodes (4): ActivityCompletionController, {closure#1}(), ProgressController, ResolvesChild

### Community 47 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 75 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 79 - "Controller"
Cohesion: 0.14
Nodes (7): {closure#1}(), FeedbackManagementController, ConditionController, FeedbackController, LogoutController, Controller, Feedback

### Community 80 - "Illuminate\Http\UploadedFile"
Cohesion: 0.27
Nodes (3): {closure#2}(), ValidatesImageUploads, Backend architecture

### Community 81 - "ChildController.php"
Cohesion: 0.22
Nodes (4): {closure#1}(), {closure#2}(), {closure#3}(), ProfileController

### Community 85 - "Register.jsx"
Cohesion: 0.57
Nodes (5): ChildFormFields(), dateLimits(), validateChild(), Register(), useConditions()

### Community 86 - "searchIndex.js"
Cohesion: 0.57
Nodes (6): canSee(), normalize(), PAGES, scoreText(), searchActivities(), searchPages()

### Community 87 - "2026_11_02_000002_create_activity_condition_table.php"
Cohesion: 0.33
Nodes (3): {closure#1}(), {closure#2}(), {closure#3}()

### Community 90 - "CLAUDE.md"
Cohesion: 0.40
Nodes (3): Commands, graphify, Working with graphify and claude-mem (do this on every prompt)

## Knowledge Gaps
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Frontend architecture` connect `Frontend Dependencies` to `CLAUDE.md`, `ActivityCompletionController.php`, `Progress Page`, `TheraPlay.jsx`?**
  _High betweenness centrality (0.348) - this node is a cross-community bridge._
- **Should `Admin UI Class Tokens` be split into smaller, more focused modules?**
  _Cohesion score 0.03508771929824561 - nodes in this community are weakly interconnected._
- **Why does `ResolvesChild` connect `ActivityCompletionController.php` to `Frontend Dependencies`?**
  _High betweenness centrality (0.330) - this node is a cross-community bridge._
- **Should `Backend Composer Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Why does `User` connect `Login, Register and User Model` to `ForgotPasswordTest`, `Activity Material Upload Tests`, `User Management Tests`, `Image Upload and Hardening Tests`, `Professional Contact Tests`, `Admin Activity Tests`, `PasswordResetTest`, `Feedback Tests`, `Role Access Tests`, `Persistent Completion Tests`, `Activity Image Tests`, `Activity Completion Tests`, `Profile Photo Tests`, `Child Profile Tests`, `Database Seeders`, `User Factory`, `Progress Tests`, `ProfilePhotoController.php`, `ChildrenAndConditionsTest`, `Logout Tests`, `PasswordResetTest.php`, `ContactPhotoTest`, `PromoteUserToAdmin.php`?**
  _High betweenness centrality (0.176) - this node is a cross-community bridge._
- **Should `Auth Pages Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `Activity and Progress Models` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._