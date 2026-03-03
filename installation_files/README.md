# Ticketing Tool - React Frontend

A modern, fully responsive React frontend for a ticketing tool similar to GLPI (without asset management). Built with React, Vite, Tailwind CSS, and React Router.

## Features

### Core Functionality
- **Dashboard**: Overview with statistics, charts, and recent tickets
- **Ticket Management**: 
  - Ticket list with filtering and search
  - Create new tickets
  - Detailed ticket view with comments
  - Status and priority management

### Authentication & Security
- **Login Page**: Traditional email/password authentication
- **SSO Integration**: 
  - SAML 2.0 authentication
  - OAuth 2.0 authentication
  - Azure Entra ID (Microsoft) authentication
- **Multi-Factor Authentication (MFA)**: Setup and enable MFA for enhanced security

### User Management
- **User Profile**: Manage personal information and security settings
- **Admin User Management**: Create, edit, and delete users
- **Role Management**: Define roles with granular permissions

### Admin Settings
- **Email Configuration**: 
  - SMTP settings for outgoing emails
  - IMAP settings for incoming emails and ticket creation
- **SSO Configuration**: Configure SAML, OAuth, and Azure AD settings

## Tech Stack

- **React 18**: UI library
- **Vite**: Build tool and dev server
- **React Router**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Recharts**: Chart library for dashboard
- **React Hot Toast**: Toast notifications
- **date-fns**: Date formatting utilities

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/
│   ├── layout/          # Layout components (Sidebar, TopBar, Layout)
│   ├── ui/              # Reusable UI components (Button, Input, Modal, etc.)
│   └── ProtectedRoute.jsx
├── contexts/
│   └── AuthContext.jsx  # Authentication context
├── pages/
│   ├── Admin/           # Admin pages (Users, Roles, Email, SSO)
│   ├── SSO/             # SSO login pages
│   ├── Tickets/         # Ticket-related pages
│   ├── Dashboard.jsx
│   ├── Login.jsx
│   ├── MFASetup.jsx
│   └── Profile.jsx
├── App.jsx              # Main app component with routing
├── main.jsx             # Entry point
└── index.css            # Global styles
```

## Features in Detail

### Responsive Design
- Mobile-first approach
- Collapsible sidebar on mobile devices
- Responsive tables and forms
- Touch-friendly interface

### UI Components
- **Button**: Multiple variants (primary, secondary, danger, outline)
- **Input**: Text inputs with labels, errors, and icons
- **Select**: Dropdown selects
- **Textarea**: Multi-line text inputs
- **Modal**: Reusable modal dialogs
- **Badge**: Status and priority indicators
- **Card**: Container component for content sections

### Authentication Flow
1. User visits login page
2. Can choose traditional login or SSO (SAML/OAuth/Azure)
3. After login, redirected to dashboard
4. Can enable MFA from profile settings

### Ticket Workflow
1. View all tickets on the ticket list page
2. Filter by status, priority, or search
3. Create new tickets with detailed information
4. View ticket details and add comments
5. Update ticket status and assignees

### Admin Features
- **Users**: Manage system users, roles, and status
- **Roles**: Define custom roles with specific permissions
- **Email**: Configure SMTP/IMAP for email integration
- **SSO**: Configure single sign-on providers

## Customization

### Colors
Edit `tailwind.config.js` to customize the color scheme. The primary color is defined in the theme.

### Routes
Add new routes in `App.jsx` and create corresponding page components.

### Components
All reusable components are in `src/components/ui/` and can be customized as needed.

## Notes

- This is a frontend-only application. You'll need to connect it to a backend API for full functionality.
- Authentication is currently simulated with localStorage. Replace with actual API calls.
- All data is mocked for demonstration purposes.

## License

MIT

