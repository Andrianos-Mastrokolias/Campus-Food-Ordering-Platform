# Git Workflow Guide - User Story 3

## Initial Setup (First Time Only)

### Step 1: Configure Git (if not already done)
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@students.wits.ac.za"
```

### Step 2: Navigate to Your Repository
```bash
cd /path/to/Campus-Food-Ordering-Platform
```

### Step 3: Check Current Status
```bash
git status
```

---

## Adding Files to the Repository

### Step 1: Review Changes
```bash
# See what files have changed
git status

# See detailed changes in files
git diff
```

### Step 2: Stage Files

**Option A: Add all files**
```bash
git add .
```

**Option B: Add specific files/directories**
```bash
# Add Firebase configuration
git add src/config/firebase.js

# Add services
git add src/services/

# Add components
git add src/components/AdminApplication/

# Add documentation
git add docs/
git add README.md
git add TAIGA_BACKLOG.md

# Add dependencies
git add package.json
```

### Step 3: Verify Staged Files
```bash
git status
```

---

## Committing Changes

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Recommended Commits for User Story 3

**Commit 1: Firebase Configuration**
```bash
git add src/config/firebase.js docs/DATABASE_SCHEMA.md
git commit -m "feat(config): add Firebase configuration and database schema

- Set up Firebase initialization with Auth and Firestore
- Define database schema for users and adminApplications collections
- Document Firestore security rules
- Add required indexes documentation"
```

**Commit 2: Authentication Service**
```bash
git add src/services/authService.js
git commit -m "feat(auth): implement Firebase authentication service

- Add user registration with email/password
- Implement login and logout functionality
- Add getCurrentUser and onAuthStateChange listeners
- Implement error handling with user-friendly messages
- Include role management in user profiles"
```

**Commit 3: Admin Application Service**
```bash
git add src/services/adminApplicationService.js
git commit -m "feat(admin): implement admin application service

- Add submitApplication function with duplicate check
- Implement getUserApplications and getPendingApplication
- Add getAllApplications for admin dashboard
- Implement approveApplication with role update
- Add rejectApplication with required notes
- Include application statistics function"
```

**Commit 4: Application Form Component**
```bash
git add src/components/AdminApplication/AdminApplicationForm.js
git add src/components/AdminApplication/AdminApplicationForm.css
git commit -m "feat(ui): create admin application form component

- Build form with validation (50+ characters)
- Add character counter for reason field
- Implement application submission logic
- Display application history with status badges
- Add loading states and error handling
- Make component fully responsive"
```

**Commit 5: Admin Review Dashboard**
```bash
git add src/components/AdminApplication/AdminReviewDashboard.js
git add src/components/AdminApplication/AdminReviewDashboard.css
git commit -m "feat(ui): create admin review dashboard

- Display statistics cards (total/pending/approved/rejected)
- Implement filter buttons for application status
- Build application grid with detailed cards
- Add approve/reject modal with review notes
- Implement approval and rejection logic
- Make dashboard fully responsive"
```

**Commit 6: App Integration & Routing**
```bash
git add src/App.js src/App.css
git commit -m "feat(routing): integrate admin components with routing

- Set up React Router with protected routes
- Add navigation for admin application form
- Implement admin dashboard route (admin-only)
- Create login and registration pages
- Add authentication state management
- Include 404 page"
```

**Commit 7: Documentation**
```bash
git add README.md TAIGA_BACKLOG.md
git commit -m "docs: add comprehensive setup and backlog documentation

- Create detailed README with Firebase setup instructions
- Document local development setup steps
- Add deployment guide for Firebase Hosting
- Create Taiga product backlog with user story
- Define all tasks and acceptance criteria
- Include sprint review viva preparation notes"
```

**Commit 8: Dependencies**
```bash
git add package.json
git commit -m "chore(deps): add Firebase and React dependencies

- Add firebase@10.7.1 for Auth and Firestore
- Add react-router-dom@6.21.0 for routing
- Configure build scripts"
```

---

## Pushing to GitHub

### Step 1: Ensure You're on the Correct Branch
```bash
# Check current branch
git branch

# If not on main, switch to it
git checkout main

# Or create a feature branch
git checkout -b feature/admin-role-application
```

### Step 2: Pull Latest Changes (Avoid Conflicts)
```bash
git pull origin main
```

### Step 3: Push Your Commits
```bash
# Push to main branch
git push origin main

# Or push feature branch
git push origin feature/admin-role-application
```

---

## Complete Workflow Example

### Scenario: First-time setup and commit

```bash
# 1. Navigate to repository
cd ~/Campus-Food-Ordering-Platform

# 2. Check status
git status

# 3. Stage all new files
git add .

# 4. Make initial commit
git commit -m "feat(user-story-3): implement admin role application system

Complete implementation of User Story 3 including:
- Firebase authentication and Firestore database setup
- Authentication service with login/logout/registration
- Admin application service with CRUD operations
- Application form component with validation
- Admin review dashboard with approve/reject functionality
- App integration with React Router
- Comprehensive documentation and Taiga backlog

This feature allows users to apply for admin privileges and existing
admins to review and process applications."

# 5. Pull latest changes
git pull origin main

# 6. Push to GitHub
git push origin main
```

---

## Feature Branch Workflow (Recommended)

### Step 1: Create Feature Branch
```bash
git checkout -b feature/admin-role-application
```

### Step 2: Make Changes and Commit
```bash
# Make your changes...

git add .
git commit -m "feat(admin): implement application submission"
```

### Step 3: Push Feature Branch
```bash
git push origin feature/admin-role-application
```

### Step 4: Create Pull Request on GitHub
1. Go to your repository on GitHub
2. Click "Pull requests" tab
3. Click "New pull request"
4. Select base: `main` and compare: `feature/admin-role-application`
5. Add title and description
6. Click "Create pull request"

### Step 5: Merge After Review
1. Review the changes
2. Ensure CI/CD passes (if configured)
3. Click "Merge pull request"
4. Delete the feature branch

---

## Incremental Commits Throughout Sprint

### Week 1: Setup
```bash
# Day 1: Firebase setup
git add src/config/firebase.js docs/DATABASE_SCHEMA.md
git commit -m "feat(config): set up Firebase and define database schema"
git push origin main

# Day 2: Auth service
git add src/services/authService.js
git commit -m "feat(auth): implement authentication service"
git push origin main
```

### Week 2: Services
```bash
# Day 1: Application service
git add src/services/adminApplicationService.js
git commit -m "feat(admin): implement application service"
git push origin main
```

### Week 3: UI Components
```bash
# Day 1-2: Application form
git add src/components/AdminApplication/AdminApplicationForm.*
git commit -m "feat(ui): create application form component"
git push origin main

# Day 3-4: Review dashboard
git add src/components/AdminApplication/AdminReviewDashboard.*
git commit -m "feat(ui): create admin review dashboard"
git push origin main
```

### Week 4: Integration & Docs
```bash
# Day 1: Integration
git add src/App.js src/App.css
git commit -m "feat(routing): integrate components with routing"
git push origin main

# Day 2: Documentation
git add README.md TAIGA_BACKLOG.md
git commit -m "docs: add setup guide and backlog"
git push origin main
```

---

## Handling Merge Conflicts

### If a merge conflict occurs:

```bash
# 1. Pull latest changes
git pull origin main

# 2. Git will show conflicted files
# Edit the files to resolve conflicts (remove <<<<<<, ======, >>>>>> markers)

# 3. Stage resolved files
git add <resolved-file>

# 4. Complete the merge
git commit -m "merge: resolve conflicts with main branch"

# 5. Push
git push origin main
```

---

## Viewing Commit History

```bash
# View all commits
git log

# View compact log
git log --oneline

# View with graph
git log --graph --oneline --all

# View specific file history
git log -- src/services/authService.js
```

---

## Undoing Changes (If Needed)

### Unstage files (before commit)
```bash
git reset HEAD <file>
```

### Discard local changes
```bash
git checkout -- <file>
```

### Amend last commit message
```bash
git commit --amend -m "new commit message"
```

### Revert a commit (creates new commit)
```bash
git revert <commit-hash>
```

---

## Best Practices

### ✅ DO:
- Commit frequently with small, logical changes
- Write clear, descriptive commit messages
- Pull before pushing to avoid conflicts
- Use feature branches for major features
- Review changes before committing (`git diff`)
- Keep commits focused on single functionality

### ❌ DON'T:
- Commit sensitive data (API keys, passwords)
- Make huge commits with unrelated changes
- Use vague commit messages ("fix stuff", "update")
- Push directly to main without review (team setting)
- Commit commented-out code or debug statements
- Forget to add new files

---

## .gitignore File

**Create `.gitignore` to exclude sensitive/unnecessary files:**

```bash
# Create .gitignore file
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
package-lock.json

# Build output
build/
dist/

# Environment variables (IMPORTANT!)
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Firebase
.firebase/
.firebaserc
firebase-debug.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/
EOF

# Commit .gitignore
git add .gitignore
git commit -m "chore: add .gitignore file"
git push origin main
```

---

## Quick Reference Commands

```bash
# Check status
git status

# Stage all changes
git add .

# Commit
git commit -m "type(scope): message"

# Push
git push origin main

# Pull
git pull origin main

# View log
git log --oneline

# Create branch
git checkout -b branch-name

# Switch branch
git checkout branch-name

# Merge branch
git merge branch-name
```

---

## Commit Message Examples

### Good Examples ✅
```
feat(auth): implement user registration with Firebase
fix(validation): correct minimum character count for application reason
docs(readme): add Firebase setup instructions
style(dashboard): improve mobile responsiveness
test(services): add unit tests for adminApplicationService
refactor(auth): simplify error handling logic
```

### Bad Examples ❌
```
update files
fix bug
changes
WIP
test
asdf
```

---

## Sprint Review Preparation

### Before Sprint Review, ensure:

1. **All commits pushed:**
```bash
git log --oneline
git push origin main
```

2. **No uncommitted changes:**
```bash
git status
# Should show "working tree clean"
```

3. **Meaningful commit history:**
```bash
git log --oneline --graph
# Should show incremental commits throughout sprint
```

---

## Getting Help

```bash
# Git help
git help <command>
git help commit
git help push

# Check Git version
git --version

# View remote URLs
git remote -v
```
