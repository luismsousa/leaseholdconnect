# LeaseholdConnect - Association Management Platform

A modern web application for managing leaseholders associations, built with React, TypeScript, Convex, and Clerk authentication.

## Features

### Core Association Management
- **Member Management**: Add, edit, and manage association members
- **Meeting Management**: Schedule and manage meetings with agenda items
- **Voting System**: Create and conduct voting on important decisions
- **Document Management**: Upload and organize association documents
- **Unit Management**: Track and manage individual units within associations
- **Audit Logging**: Comprehensive activity tracking for compliance

### Platform Administration (PaaS)
- **Multi-tenant Architecture**: Manage multiple associations from a single platform
- **Subscription Management**: Handle different subscription tiers (Free, Basic, Premium)
- **Association Lifecycle**: Create, suspend, and reactivate associations
- **Admin Management**: Manage platform administrators with different roles
- **Enterprise Leads**: Track and manage enterprise inquiries

### Enterprise Lead Management
- **Contact Form**: Professional contact form for enterprise inquiries
- **Lead Tracking**: Complete CRM functionality for managing leads
- **Status Management**: Track leads through different stages (New, Contacted, Qualified, Converted, Lost)
- **Assignment System**: Assign leads to specific administrators
- **Notes & Comments**: Add detailed notes and comments to leads
- **Statistics Dashboard**: View lead conversion metrics and trends

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Convex (serverless database and functions)
- **Authentication**: Clerk
- **Deployment**: Vercel
- **Analytics**: PostHog

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Convex account
- Clerk account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd leaseholders_association_management_app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your environment variables:
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
VITE_CONVEX_URL=your_convex_url
VITE_POSTHOG_KEY=your_posthog_key
```

5. Start the development server:
```bash
npm run dev
```

## Enterprise Lead Management

### Contact Form Flow
1. **Landing Page**: Users click "Contact Us" on the Enterprise tier
2. **Contact Form**: Professional form collects:
   - Full name
   - Email address
   - Company name
   - Phone number
   - Custom message (with template)
3. **Lead Creation**: Form submission creates a new lead in the database
4. **Admin Notification**: PaaS admins can view and manage leads

### Lead Management Features
- **Status Tracking**: Move leads through pipeline stages
- **Assignment**: Assign leads to specific administrators
- **Notes**: Add detailed notes and comments
- **Filtering**: Filter leads by status
- **Statistics**: View conversion metrics

### PaaS Admin Dashboard
- **Tabbed Interface**: Switch between Associations and Leads
- **Lead Statistics**: View total, new, contacted, qualified, converted, and lost leads
- **Lead Details**: View full lead information and message
- **Status Updates**: Update lead status and add notes
- **Assignment**: Assign leads to team members

## Database Schema

### Leads Table
```typescript
leads: defineTable({
  name: v.string(),
  email: v.string(),
  companyName: v.string(),
  phoneNumber: v.string(),
  message: v.string(),
  status: v.union(
    v.literal("new"),
    v.literal("contacted"),
    v.literal("qualified"),
    v.literal("converted"),
    v.literal("lost"),
  ),
  notes: v.optional(v.string()),
  assignedTo: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

## API Functions

### Public Functions
- `submitLead`: Submit a new enterprise lead

### PaaS Admin Functions
- `listLeads`: List all leads with optional filtering
- `updateLeadStatus`: Update lead status and notes
- `assignLead`: Assign lead to specific administrator
- `getLeadStats`: Get lead statistics and metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
