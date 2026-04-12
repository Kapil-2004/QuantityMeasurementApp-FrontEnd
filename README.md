# UC20 Frontend - Angular Application

A modern, responsive Angular-based frontend application built as part of UC20 project. This application implements a complete authentication system, dashboard interface, and responsive navigation components using Angular 16.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Available Commands](#available-commands)
- [Features](#features)
- [Components](#components)
- [Services](#services)
- [Routing](#routing)
- [Development Workflow](#development-workflow)
- [Best Practices](#best-practices)
- [Contributing](#contributing)

## Overview

This UC20 Frontend project demonstrates a professional Angular implementation with:
- **Authentication System**: Login/Register modal with token-based authentication
- **State Management**: Centralized application state using services
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Service-Oriented Architecture**: Separation of concerns with dedicated services
- **Type Safety**: Full TypeScript implementation with strict typing
- **Code Quality**: Comprehensive unit tests for components and services

## Tech Stack

- **Framework**: Angular 16.2.16
- **Language**: TypeScript 5.1
- **Styling**: CSS3 with responsive design
- **Build Tool**: Angular CLI
- **Testing**: Karma + Jasmine
- **HTTP**: HttpClientModule for API communication
- **Package Manager**: npm
- **Version Control**: Git

## Project Structure

```
src/
├── app/
│   ├── app.module.ts                 # Root module
│   ├── app-routing.module.ts         # Application routing configuration
│   ├── app.component.*               # Root component
│   ├── components/
│   │   ├── auth-modal/               # Authentication modal (login/register)
│   │   ├── dashboard/                # Main dashboard view
│   │   ├── navbar/                   # Top navigation bar
│   │   └── sidebar/                  # Side navigation panel
│   └── services/
│       ├── auth.service.ts           # Authentication & user management
│       ├── auth.interceptor.ts       # HTTP interceptor for auth tokens
│       ├── app-state.service.ts      # Global application state
│       └── quantity.service.ts       # Quantity/inventory management
├── assets/                            # Static assets (images, fonts, etc.)
├── styles.css                         # Global styles
├── index.html                         # Application entry point
└── main.ts                            # Application bootstrap
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)
- Angular CLI (`npm install -g @angular/cli`)

### Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd Main_Project/Frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
- Create environment files in `src/` if needed for API endpoints
- Update `environment.ts` and `environment.production.ts` with your backend API URLs

4. **Verify installation**
```bash
ng version
```

## Available Commands

### Development
```bash
npm start          # Start development server (ng serve)
```
Navigate to `http://localhost:4200/`. Application auto-reloads on source file changes.

### Build
```bash
ng build           # Build for production
ng build --prod    # Optimized production build
```
Build artifacts stored in `dist/` directory.

### Testing
```bash
npm test           # Run unit tests with Karma
ng test --watch    # Run tests in watch mode
ng test --code-coverage  # Generate coverage report
```

### Code Generation
```bash
ng generate component components/my-component
ng generate service services/my-service
ng generate directive my-directive
ng generate pipe my-pipe
```

### Linting
```bash
ng lint            # Run linter checks
```

## Features

### Authentication System
- **Login Modal**: Secure user login interface
- **Register Modal**: Self-service user registration
- **Token Management**: JWT-based authentication
- **Session State**: User session persistence
- **Protected Routes**: Route guards for authenticated pages

### Dashboard
- **User Information Display**: Shows logged-in user details
- **Analytics Overview**: Key metrics and statistics
- **Quick Actions**: Fast access to main features
- **Responsive Layout**: Works seamlessly on desktop, tablet, mobile

### Navigation
- **Navbar**: Top navigation with user profile and logout
- **Sidebar**: Vertical navigation menu with collapsible sections
- **Active Route Highlighting**: Visual feedback for current page
- **Mobile Support**: Hamburger menu for mobile devices

### State Management
- **Global State Service**: Centralized app state (AppStateService)
- **Auth State**: User authentication state and user data
- **Quantity State**: Inventory/quantity tracking
- **Observable Streams**: Real-time state updates

## Components

### AuthModalComponent
```typescript
// Purpose: Handle login and registration
// Location: src/app/components/auth-modal/
// Features: Form validation, error handling, token management
```

### DashboardComponent
```typescript
// Purpose: Main application dashboard
// Location: src/app/components/dashboard/
// Features: User profile, analytics, recent activity
```

### NavbarComponent
```typescript
// Purpose: Top navigation bar
// Location: src/app/components/navbar/
// Features: User menu, logout button, notifications
```

### SidebarComponent
```typescript
// Purpose: Side navigation menu
// Location: src/app/components/sidebar/
// Features: Menu items, navigation links, collapsible sections
```

## Services

### AuthService
Handles all authentication-related operations:
- User login/logout
- User registration
- Token management
- User profile management
- Session validation

### AppStateService
Manages application-wide state:
- User authentication state
- Application configuration
- Global data sharing
- Observable-based updates

### AuthInterceptor
Intercepts HTTP requests to:
- Attach authentication tokens
- Handle token refresh
- Process error responses
- Manage auth failures

### QuantityService
Manages inventory/quantity data:
- Quantity tracking
- Stock management
- Inventory updates

## Routing

Application routing configured in `app-routing.module.ts`:

```typescript
// Example routes
const routes: Routes = [
  { path: '', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'login', component: AuthModalComponent },
  { path: 'register', component: AuthModalComponent },
  { path: '**', redirectTo: '' }
];
```

**Protected Routes**: Implement route guards to prevent unauthorized access.

## Development Workflow

1. **Start Development Server**
   ```bash
   npm start
   ```

2. **Create New Feature**
   ```bash
   ng generate component components/my-feature
   ng generate service services/my-feature
   ```

3. **Implement Component Logic**
   - Write component TypeScript class
   - Create template HTML
   - Add component styles

4. **Add Routing** (if needed)
   - Update `app-routing.module.ts`
   - Add route navigation

5. **Implement Services**
   - Create service for business logic
   - Add HTTP calls for backend communication
   - Manage state with observables

6. **Write Tests**
   - Create `.spec.ts` test files
   - Test component functionality
   - Test service methods

7. **Build and Deploy**
   ```bash
   ng build --prod
   ```

## Best Practices

✅ **Component Design**
- Keep components focused and single-responsibility
- Use OnPush change detection for performance
- Unsubscribe from observables in ngOnDestroy

✅ **Naming Conventions**
- Components: `feature.component.ts`
- Services: `feature.service.ts`
- Use clear, descriptive names

✅ **Type Safety**
- Use strict TypeScript typing
- Avoid `any` type
- Define interfaces for data models

✅ **State Management**
- Use services with observables for state
- Avoid prop drilling
- Use async pipe in templates

✅ **HTTP Communication**
- Use interceptors for common headers
- Handle errors gracefully
- Implement loading states

✅ **Security**
- Store tokens securely
- Validate user input
- Implement proper CORS handling

## Contributing

1. Create a new branch for your feature
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Follow project structure and naming conventions

3. Write tests for new features

4. Run tests before submitting
   ```bash
   npm test
   ```

5. Build and verify
   ```bash
   ng build
   ```

6. Commit with descriptive messages
   ```bash
   git commit -m "feat: add new feature description"
   ```

7. Push and create pull request

## Additional Resources

- [Angular Documentation](https://angular.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Angular CLI Commands](https://angular.io/cli)
- [RxJS Documentation](https://rxjs.dev/)

---

**Project**: UC20 Frontend
**Created**: 2026
**Version**: 1.0.0
