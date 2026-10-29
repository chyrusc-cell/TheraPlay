# Graph Report - TheraPlay  (2026-10-29)

## Corpus Check
- 151 files · ~58,874 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 25 file(s) not represented in the graph (top: (none) 18, .css 4, .example 1)

## Summary
- 1075 nodes · 2458 edges · 79 communities (26 shown, 53 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.89)
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
- Child and Feedback Controllers
- Frontend Tooling Config
- API Helpers and Branding
- Public Activity Controller
- Activity Material Upload Tests
- User Management Tests
- Image Upload and Hardening Tests
- Contact Management Controller
- Backend Tooling Dependencies
- Contact.jsx
- Professional Contact Tests
- Activity Resource Controllers
- Admin Activity Tests
- PasswordResetTest
- ContactManagementController.php
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
- apiRequest
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
- EnsureUserHasRole.php
- Activity Completion Controller
- Profile Photo Controller
- Logout Tests
- Laravel Application
- Cache Migration
- Categories Migration
- Feedback Migration
- Contact Photo Migration
- User Photo Migration
- Illuminate\Database\Migrations\Migration
- Conditions Migration
- Child-Condition Migration
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

## God Nodes (most connected - your core abstractions)
1. `User` - 68 edges
2. `Activity` - 54 edges
3. `Controller` - 43 edges
4. `TestCase` - 40 edges
5. `ActivityMaterialUploadTest` - 30 edges
6. `UserManagementTest` - 30 edges
7. `react` - 28 edges
8. `apiRequest()` - 27 edges
9. `ProfessionalContactTest` - 23 edges
10. `AdminActivityManagementTest` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Backend architecture` --references--> `UserManagementController`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Api/Admin/UserManagementController.php
- `Backend architecture` --references--> `ValidatesImageUploads`  [INFERRED]
  CLAUDE.md → backend/app/Http/Controllers/Concerns/ValidatesImageUploads.php
- `Backend architecture` --references--> `EnsureUserHasRole`  [INFERRED]
  CLAUDE.md → backend/app/Http/Middleware/EnsureUserHasRole.php
- `Commands` --references--> `AppServiceProvider`  [INFERRED]
  CLAUDE.md → backend/app/Providers/AppServiceProvider.php
- `Frontend architecture` --references--> `clearSession()`  [INFERRED]
  CLAUDE.md → src/api.js

## Import Cycles
- None detected.

## Communities (79 total, 53 thin omitted)

### Community 0 - "Admin UI Class Tokens"
Cohesion: 0.04
Nodes (56): actions, activityFormActions, activityFormGrid, activityPairRow, activityPicture, activityPictureButton, activityTextarea, addButton (+48 more)

### Community 1 - "Backend Composer Dependencies"
Cohesion: 0.04
Nodes (48): pestphp/pest-plugin, php-http/discovery, autoload, autoload-dev, psr-4, psr-4, config, allow-plugins (+40 more)

### Community 2 - "Auth Pages Styling"
Cohesion: 0.04
Nodes (45): backgroundStyle, backLink, divider, dividerText, field, fieldInRow, forgotLink, headerText (+37 more)

### Community 3 - "ForgotPasswordTest"
Cohesion: 0.06
Nodes (6): AppServiceProvider, ForgotPasswordTest, Backend architecture, Commands, graphify, Working with graphify and claude-mem (do this on every prompt)

### Community 4 - "Activity and Progress Models"
Cohesion: 0.09
Nodes (3): {closure#1}(), Condition, Feedback

### Community 5 - "Frontend Dependencies"
Cohesion: 0.17
Nodes (21): Frontend architecture, getToken(), AuthContext, useAuth(), AuthProvider(), getToken(), GlobalSearch(), Layout() (+13 more)

### Community 6 - "Child and Feedback Controllers"
Cohesion: 0.09
Nodes (14): ActivityController, FeedbackManagementController, ChildController, ContactController, DeveloperTeamController, FeedbackController, LoginController, LogoutController (+6 more)

### Community 7 - "Frontend Tooling Config"
Cohesion: 0.09
Nodes (32): devDependencies, eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.6, globals@^17.12.0, tailwindcss@^4.3.3, @tailwindcss/vite@^4.3.3 (+24 more)

### Community 8 - "API Helpers and Branding"
Cohesion: 0.15
Nodes (14): dependencies, lucide-react@^1.50.0, react@^19.2.8, react-dom@^19.2.8, react-router-dom@^7.18.4, react, react-dom, react-router-dom (+6 more)

### Community 9 - "Public Activity Controller"
Cohesion: 0.20
Nodes (5): {closure#1}(), ActivityImageController, ActivityManagementController, {closure#1}(), Activity

### Community 12 - "Image Upload and Hardening Tests"
Cohesion: 0.16
Nodes (5): {closure#1}(), ActivityProgress, Category, Child, TestCase

### Community 13 - "Contact Management Controller"
Cohesion: 0.18
Nodes (5): {closure#1}(), ContactManagementController, {closure#1}(), ProfessionalContact, ContactPhotoTest

### Community 14 - "Backend Tooling Dependencies"
Cohesion: 0.10
Nodes (20): devDependencies, concurrently@^10.0.3, laravel-vite-plugin@^3.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, vite@^8.0.0, tailwindcss, @tailwindcss/vite (+12 more)

### Community 15 - "Contact.jsx"
Cohesion: 0.17
Nodes (18): lucide-react, Collapsible(), ContactCard(), Dashboard(), DAY_LETTERS, dayKey(), formatDate(), formatWeekRange() (+10 more)

### Community 17 - "Activity Resource Controllers"
Cohesion: 0.13
Nodes (10): ActivityMaterialController, {closure#1}(), ActivityResourceController, {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), StreamsActivityMaterials (+2 more)

### Community 21 - "Login, Register and User Model"
Cohesion: 0.17
Nodes (4): {closure#1}(), UserManagementController, {closure#1}(), User

### Community 23 - "backend/README.md"
Cohesion: 0.25
Nodes (7): About Laravel, Agentic Development, Code of Conduct, Contributing, Learning Laravel, License, Security Vulnerabilities

### Community 25 - "Activity Details Page"
Cohesion: 0.22
Nodes (18): Activities(), DIFFICULTIES, imagePlaceholders, loadCompletedIds(), ActivityDetails(), fetchIsCompleted(), getToken(), ActivityPicture() (+10 more)

### Community 27 - "Base Migrations"
Cohesion: 0.23
Nodes (6): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#3}()

### Community 31 - "apiRequest"
Cohesion: 0.16
Nodes (28): API_URL, apiRequest(), clearSession(), mapValidationErrors(), Contact(), DeveloperTeamEditor(), toRows(), emptyForm (+20 more)

### Community 36 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 37 - "Progress Page"
Cohesion: 0.42
Nodes (8): DAY_LABELS, dayKey(), formatDate(), formatWeekLabel(), getLongestStreak(), getToken(), getWeekStart(), Progress()

### Community 38 - "Laravel Bootstrap"
Cohesion: 0.32
Nodes (3): {closure#1}(), {closure#2}(), {closure#3}()

### Community 40 - "Profile Page"
Cohesion: 0.36
Nodes (7): getToken(), noticeColors, PHOTO_TYPES, Profile(), splitName(), toFormValues(), pageMainNarrow

### Community 47 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 75 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **53 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Frontend architecture` connect `Frontend Dependencies` to `ForgotPasswordTest`, `apiRequest`?**
  _High betweenness centrality (0.366) - this node is a cross-community bridge._
- **Should `Admin UI Class Tokens` be split into smaller, more focused modules?**
  _Cohesion score 0.03508771929824561 - nodes in this community are weakly interconnected._
- **Why does `Backend architecture` connect `ForgotPasswordTest` to `Activity Resource Controllers`, `EnsureUserHasRole.php`, `Login, Register and User Model`?**
  _High betweenness centrality (0.362) - this node is a cross-community bridge._
- **Should `Backend Composer Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Why does `User` connect `Login, Register and User Model` to `ForgotPasswordTest`, `Activity and Progress Models`, `Child and Feedback Controllers`, `Activity Material Upload Tests`, `User Management Tests`, `Image Upload and Hardening Tests`, `Contact Management Controller`, `Professional Contact Tests`, `Activity Resource Controllers`, `Admin Activity Tests`, `PasswordResetTest`, `ContactManagementController.php`, `Feedback Tests`, `Role Access Tests`, `Persistent Completion Tests`, `Activity Image Tests`, `Activity Completion Tests`, `Profile Photo Tests`, `Developer Team API`, `Child Profile Tests`, `Database Seeders`, `User Factory`, `Progress Tests`, `Logout Tests`?**
  _High betweenness centrality (0.271) - this node is a cross-community bridge._
- **Should `Auth Pages Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `ForgotPasswordTest` be split into smaller, more focused modules?**
  _Cohesion score 0.06262626262626263 - nodes in this community are weakly interconnected._