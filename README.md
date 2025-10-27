# TaskBuddy - Collaborative Task Management App

TaskBuddy is a mobile-first React application designed to help two people manage shared tasks throughout the week. The app allows users to create task templates, instantiate weekly execution plans, and track task completion.

## Features

- **Template Management**: Create and edit task templates for recurring weekly tasks
- **Execution Plans**: Instantiate templates into weekly execution plans
- **Task Assignment**: Assign tasks to either person or leave them unassigned
- **Task Scheduling**: Schedule tasks for specific days of the week
- **Multiple Views**: Switch between week view and day view
- **Mobile-First Design**: Optimized for mobile devices with responsive desktop support
- **Today's Tasks View**: Quick access to see what tasks are assigned for today
- **Real-time Updates**: Changes are saved to the backend immediately
- **Undo Functionality**: Easily undo recent changes
- **Google Authentication**: Secure login with Google accounts

## Tech Stack

- **Frontend**: React with TypeScript
- **UI Framework**: Material-UI (MUI)
- **State Management**: React Context API
- **Backend & Auth**: Firebase (Firestore & Authentication)
- **Drag and Drop**: react-beautiful-dnd
- **Date Handling**: date-fns
- **Build Tool**: Vite

## Project Structure

```
src/
├── assets/            # Static assets like images
├── components/        # Reusable components
│   ├── common/        # Common components like Loading
│   ├── layout/        # Layout components like AppLayout
│   └── tasks/         # Task-specific components
├── context/           # React contexts for state management
├── firebase/          # Firebase configuration and services
├── hooks/             # Custom React hooks
├── pages/             # Page components
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── App.tsx            # Main App component
├── main.tsx           # Entry point
└── theme.ts           # Material-UI theme configuration
```

## Getting Started

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/task-buddy-app.git
   cd task-buddy-app
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn
   ```

3. Configure Firebase
   - Create a new Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Google Authentication in the Firebase console
   - Enable Firestore Database
   - Copy your Firebase configuration
   - Update the configuration in `src/firebase/config.ts`

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## User Flows

### Template Creation

1. User clicks "New Template" button
2. User enters a template name
3. User adds tasks to the unassigned pool
4. User drags tasks to different days and assigns them to people
5. User saves the template

### Execution Plan Creation

1. User selects a template and creates an execution plan
2. User can modify the execution plan for the current week
3. Changes only affect the current execution plan, not the original template

### Task Execution

1. User views today's tasks in the Execute View
2. User completes tasks and marks them as done
3. User can take on unassigned tasks
4. Progress is tracked in real-time

## Deployment

The app can be deployed to Firebase Hosting:

1. Build the production version
   ```bash
   npm run build
   # or
   yarn build
   ```

2. Install Firebase CLI
   ```bash
   npm install -g firebase-tools
   ```

3. Login and deploy
   ```bash
   firebase login
   firebase init hosting
   firebase deploy
   ```

## Mobile-First Design Considerations

- Bottom navigation bar on mobile devices
- Larger touch targets for better mobile usability
- Responsive layouts that adapt to different screen sizes
- Optimized typography for mobile readability
- Swipe gestures and mobile-friendly interactions
- Speed dial for quick actions on mobile

## Future Enhancements

- Enhanced collaboration features
- Push notifications for task reminders
- Historical data and performance analytics
- Multiple templates management
- Recurring tasks across weeks
- Calendar integration

## License

MIT License - See LICENSE file for details.