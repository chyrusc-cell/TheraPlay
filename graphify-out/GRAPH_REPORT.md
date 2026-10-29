# Graph Report - TheraPlay  (2026-10-29)

## Corpus Check
- 157 files · ~55,487 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 25 file(s) not represented in the graph (top: (none) 18, .css 4, .example 1)

## Summary
- 1025 nodes · 2371 edges · 75 communities (25 shown, 50 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Admin UI Class Tokens
- Backend Composer Dependencies
- Auth Pages Styling
- Service Provider and Auth Tests
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
- Activities Page
- Professional Contact Tests
- Activity Resource Controllers
- Admin Activity Tests
- Feedback and User Admin Controllers
- Auth, Reset and Role Middleware
- Login, Register and User Model
- Feedback Tests
- Forgot Password Tests
- Role Access Tests
- Activity Details Page
- Persistent Completion Tests
- Base Migrations
- Activity Image Tests
- Activity Completion Tests
- Profile Photo Tests
- Manage Activities Page
- Developer Team API
- Child Profile Tests
- Contact Photo Tests
- Developer Team Tests
- Parent Dashboard
- Progress Page
- Laravel Bootstrap
- Database Seeders
- Profile Page
- User Factory
- Progress Tests
- Global Search Index
- Activity Completion Controller
- Profile Photo Controller
- Logout Tests
- Promote Admin Command
- Cache Migration
- Categories Migration
- Feedback Migration
- Contact Photo Migration
- User Photo Migration
- Children Migration
- Conditions Migration
- Child-Condition Migration
- Activities Migration
- Activity Progress Migration
- Activity Resources Migration
- Access Tokens Migration
- Professional Contacts Migration
- Developer Team Migration
- Unit Example Test

## God Nodes (most connected - your core abstractions)
1. `User` - 68 edges
2. `Activity` - 54 edges
3. `Controller` - 43 edges
4. `TestCase` - 40 edges
5. `ActivityMaterialUploadTest` - 30 edges
6. `UserManagementTest` - 30 edges
7. `react` - 27 edges
8. `apiRequest()` - 26 edges
9. `ProfessionalContactTest` - 23 edges
10. `AdminActivityManagementTest` - 22 edges

## Surprising Connections (you probably didn't know these)
- `{closure#1}()` --calls--> `ActivityProgress`  [EXTRACTED]
  backend/app/Http/Controllers/Api/ActivityCompletionController.php → backend/app/Models/ActivityProgress.php
- `{closure#1}()` --references--> `Feedback`  [EXTRACTED]
  backend/app/Http/Controllers/Api/Admin/FeedbackManagementController.php → backend/app/Models/Feedback.php
- `{closure#1}()` --references--> `User`  [EXTRACTED]
  backend/app/Http/Controllers/Api/PasswordResetController.php → backend/app/Models/User.php
- `ActivityCompletionController` --inherits--> `Controller`  [EXTRACTED]
  backend/app/Http/Controllers/Api/ActivityCompletionController.php → backend/app/Http/Controllers/Controller.php
- `ActivityController` --inherits--> `Controller`  [EXTRACTED]
  backend/app/Http/Controllers/Api/ActivityController.php → backend/app/Http/Controllers/Controller.php

## Import Cycles
- None detected.

## Communities (75 total, 50 thin omitted)

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
Cohesion: 0.09
Nodes (5): ActivityProgress, Category, Child, Condition, Feedback

### Community 5 - "Frontend Dependencies"
Cohesion: 0.12
Nodes (24): dependencies, lucide-react@^1.50.0, react@^19.2.8, react-dom@^19.2.8, react-router-dom@^7.18.4, lucide-react, react, react-dom (+16 more)

### Community 6 - "Child and Feedback Controllers"
Cohesion: 0.10
Nodes (10): ChildController, FeedbackController, LoginController, LogoutController, PasswordResetController, ProfileController, ProgressController, RegisterController (+2 more)

### Community 7 - "Frontend Tooling Config"
Cohesion: 0.09
Nodes (32): devDependencies, eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.6, globals@^17.12.0, tailwindcss@^4.3.3, @tailwindcss/vite@^4.3.3 (+24 more)

### Community 8 - "API Helpers and Branding"
Cohesion: 0.20
Nodes (17): react-router-dom, apiRequest(), clearSession(), mapValidationErrors(), Contact(), DeveloperTeamAdmin(), ForgotPassword(), Login() (+9 more)

### Community 9 - "Public Activity Controller"
Cohesion: 0.16
Nodes (6): ActivityController, {closure#1}(), ActivityImageController, ActivityManagementController, {closure#1}(), Activity

### Community 12 - "Image Upload and Hardening Tests"
Cohesion: 0.15
Nodes (3): AuthHardeningTest, ExampleTest, TestCase

### Community 13 - "Contact Management Controller"
Cohesion: 0.15
Nodes (7): {closure#1}(), {closure#2}(), ContactManagementController, {closure#1}(), ContactController, ValidatesImageUploads, ProfessionalContact

### Community 14 - "Backend Tooling Dependencies"
Cohesion: 0.10
Nodes (20): devDependencies, concurrently@^10.0.3, laravel-vite-plugin@^3.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, vite@^8.0.0, tailwindcss, @tailwindcss/vite (+12 more)

### Community 15 - "Activities Page"
Cohesion: 0.18
Nodes (18): Activities(), DIFFICULTIES, imagePlaceholders, loadCompletedIds(), Collapsible(), ContactCard(), holdSkeleton(), MIN_SKELETON_MS (+10 more)

### Community 17 - "Activity Resource Controllers"
Cohesion: 0.20
Nodes (7): ActivityMaterialController, ActivityResourceController, {closure#1}(), {closure#2}(), {closure#3}(), StreamsActivityMaterials, ActivityResource

### Community 19 - "Feedback and User Admin Controllers"
Cohesion: 0.19
Nodes (4): {closure#1}(), FeedbackManagementController, {closure#1}(), UserManagementController

### Community 20 - "Auth, Reset and Role Middleware"
Cohesion: 0.13
Nodes (4): {closure#1}(), {closure#1}(), {closure#1}(), EnsureUserHasRole

### Community 25 - "Activity Details Page"
Cohesion: 0.29
Nodes (13): ActivityDetails(), fetchIsCompleted(), getToken(), ActivityPicture(), ActivityCardsSkeleton(), ActivityDetailsSkeleton(), CardsSkeleton(), ContactCardsSkeleton() (+5 more)

### Community 27 - "Base Migrations"
Cohesion: 0.23
Nodes (6): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#3}()

### Community 31 - "Manage Activities Page"
Cohesion: 0.27
Nodes (9): API_URL, ALLOWED_EXTENSIONS, arrayToLines(), emptyForm, formatSize(), linesToArray(), ManageActivities(), PICTURE_TYPES (+1 more)

### Community 32 - "Developer Team API"
Cohesion: 0.29
Nodes (3): DeveloperTeamManagementController, DeveloperTeamController, DeveloperTeam

### Community 36 - "Parent Dashboard"
Cohesion: 0.42
Nodes (8): Dashboard(), DAY_LETTERS, dayKey(), formatDate(), formatWeekRange(), getCurrentStreak(), getToken(), getWeekStart()

### Community 37 - "Progress Page"
Cohesion: 0.42
Nodes (8): DAY_LABELS, dayKey(), formatDate(), formatWeekLabel(), getLongestStreak(), getToken(), getWeekStart(), Progress()

### Community 38 - "Laravel Bootstrap"
Cohesion: 0.32
Nodes (3): {closure#1}(), {closure#2}(), {closure#3}()

### Community 40 - "Profile Page"
Cohesion: 0.36
Nodes (7): getToken(), noticeColors, PHOTO_TYPES, Profile(), splitName(), toFormValues(), pageMainNarrow

### Community 43 - "Global Search Index"
Cohesion: 0.57
Nodes (6): canSee(), normalize(), PAGES, scoreText(), searchActivities(), searchPages()

## Knowledge Gaps
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Login, Register and User Model` to `Service Provider and Auth Tests`, `Activity and Progress Models`, `Activity Material Upload Tests`, `User Management Tests`, `Image Upload and Hardening Tests`, `Professional Contact Tests`, `Admin Activity Tests`, `Feedback and User Admin Controllers`, `Auth, Reset and Role Middleware`, `Feedback Tests`, `Forgot Password Tests`, `Role Access Tests`, `Persistent Completion Tests`, `Activity Image Tests`, `Activity Completion Tests`, `Profile Photo Tests`, `Child Profile Tests`, `Contact Photo Tests`, `Database Seeders`, `User Factory`, `Progress Tests`, `Logout Tests`, `Promote Admin Command`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Should `Admin UI Class Tokens` be split into smaller, more focused modules?**
  _Cohesion score 0.03508771929824561 - nodes in this community are weakly interconnected._
- **Why does `Activity` connect `Public Activity Controller` to `Child Profile Tests`, `Activity and Progress Models`, `Child and Feedback Controllers`, `Database Seeders`, `Activity Material Upload Tests`, `Progress Tests`, `Activity Completion Controller`, `Image Upload and Hardening Tests`, `User Management Tests`, `Activity Resource Controllers`, `Admin Activity Tests`, `Auth, Reset and Role Middleware`, `Login, Register and User Model`, `Persistent Completion Tests`, `Activity Image Tests`, `Activity Completion Tests`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `Backend Composer Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Why does `TestCase` connect `Image Upload and Hardening Tests` to `Service Provider and Auth Tests`, `Activity and Progress Models`, `Activity Material Upload Tests`, `User Management Tests`, `Professional Contact Tests`, `Admin Activity Tests`, `Login, Register and User Model`, `Feedback Tests`, `Forgot Password Tests`, `Role Access Tests`, `Persistent Completion Tests`, `Activity Image Tests`, `Activity Completion Tests`, `Profile Photo Tests`, `Child Profile Tests`, `Contact Photo Tests`, `Developer Team Tests`, `Progress Tests`, `Logout Tests`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `Auth Pages Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `Service Provider and Auth Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.07307692307692308 - nodes in this community are weakly interconnected._