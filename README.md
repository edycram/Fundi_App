# 🛠️ FundiConnect

**FundiConnect** is a pan-African digital platform that connects clients with verified, skilled fundis (service professionals) across Africa. Whether you need an electrician in Nairobi, a tailor in Accra, or a mechanic in Lagos, FundiConnect makes it easy to search, book, pay, and review trusted fundis in your area.

> 💡 "Skilled Hands, Trusted Across Africa"

---

## 🌍 Purpose

FundiConnect bridges the gap between informal workers and modern digital tools by offering:
- Discovery and instant booking for clients
- Exposure, job scheduling, and loyalty rewards for fundis
- Trusted review and rating system
- Location-based services across African regions
- Secure payments (Paystack, M-Pesa) and loyalty programs
- Dispute resolution and platform mediation

---

## 🧱 Tech Stack

| Layer            | Technology                                    |
|------------------|-----------------------------------------------|
| Frontend         | React.js, TypeScript, Tailwind CSS, Vite      |
| State/Auth       | React Context, Supabase Auth                  |
| Backend          | Supabase (PostgreSQL, Edge Functions)         |
| Payments         | Paystack, M-Pesa                              |
| Notifications    | WhatsApp (Meta/Twilio), Email (Supabase)      |
| Styling          | Tailwind CSS, PostCSS                         |

---

## ✅ Core Features

### 🧑‍💼 For Clients
- Sign up/login with email/password
- Search fundis by **location, skill, availability**
- Book instantly with real-time fundi responses
- Rate and review fundis after service
- Manage bookings and loyalty points via dashboard
- Redeem loyalty points for discounts or rewards
- Dispute resolution for problematic bookings

### 🔧 For Fundis
- Sign up/login and onboarding with skill profile
- Add work hours, services, and locations
- Accept/reject bookings via dashboard or WhatsApp
- Get notified via WhatsApp/Email
- Track ratings, jobs, and loyalty points
- Priority visibility for premium fundis

### 🛠 Platform Features
- Role-based dashboards (client, fundi, admin)
- Geo-targeting and dynamic pricing
- Secure cross-border payments
- Dispute management and mediation
- Loyalty & referral program
- Admin controls for T&C, pricing, and policies

---

## 🗂️ Project Structure

```
Fundi_App/
  ├── src/
  │   ├── App.tsx                # Main app and routing
  │   ├── components/            # UI components (Loyalty, Disputes, Layout, etc.)
  │   ├── contexts/              # React Contexts (Auth, etc.)
  │   ├── hooks/                 # Custom hooks (useLoyalty, etc.)
  │   ├── lib/                   # Supabase client setup
  │   ├── pages/                 # Page-level components (Home, Dashboard, Auth, etc.)
  │   ├── types/                 # TypeScript types/interfaces
  │   └── assets/                # Static assets (logo, images)
  ├── supabase/
  │   ├── functions/             # Edge Functions (webhooks, business logic)
  │   └── migrations/            # Database migrations (SQL)
  ├── public/                    # Static files (if any)
  ├── package.json               # Dependencies and scripts
  ├── tailwind.config.js         # Tailwind CSS config
  ├── postcss.config.js          # PostCSS config
  ├── vite.config.ts             # Vite config
  └── README.md                  # This file
```

---

## 🚀 Getting Started

### 1. **Clone the Repository**
```bash
git clone https://github.com/your-org/fundiconnect.git
cd fundiconnect
```

### 2. **Install Dependencies**
```bash
npm install
```

### 3. **Environment Variables**
Create a `.env` file in the root with:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. **Run the App Locally**
```bash
npm run dev
```
Visit [http://localhost:5173](http://localhost:5173) in your browser.

### 5. **Lint & Build**
```bash
npm run lint      # Check code quality
npm run build     # Production build
npm run preview   # Preview production build
```

---

## 🏗️ Backend: Supabase Edge Functions

FundiConnect uses Supabase Edge Functions for backend logic:
- **booking-expiration-handler**: Marks pending bookings as expired after a timeout
- **dispute-management**: Handles dispute submission, messaging, and resolution
- **loyalty-webhook**: Awards loyalty points for completed bookings
- **mpesa-webhook**: Handles M-Pesa payment callbacks
- **payment-webhook**: Handles Paystack payment callbacks
- **process-payment**: Initiates payment flows (Paystack, M-Pesa)
- **send-whatsapp-notification**: Sends WhatsApp notifications for bookings
- **whatsapp-webhook**: Handles WhatsApp interactive responses (accept/reject)

All functions are in `supabase/functions/` and are deployed to Supabase Edge.

---

## 🛡️ Authentication & Authorization
- **Supabase Auth** for email/password login
- **React Context** for session management
- **ProtectedRoute** component for role-based access
- **Admin** dashboard for dispute management

---

## 💸 Payments & Loyalty
- **Paystack** and **M-Pesa** for secure payments
- **Loyalty program**: Earn points for bookings, redeem for discounts/vouchers
- **LoyaltyCard** and **LoyaltyTransactions** components for UI

---

## ⚡ Notifications
- **WhatsApp** (Meta API/Twilio) for booking/job notifications
- **Email** via Supabase for account and booking updates

---

## 🧩 Major Components
- **Dashboard**: Unified view for clients and fundis
- **BookingForm**: Book a fundi with scheduling and location
- **Search**: Find fundis by skill, location, rating
- **Disputes**: Submit, view, and resolve disputes
- **Loyalty**: Track and redeem points
- **Admin**: Manage disputes and platform policies

---

## 🧪 Testing & Quality
- **ESLint** for code linting (`npm run lint`)
- **TypeScript** for type safety
- **Manual testing** for booking, payments, and disputes

---

## 🤝 Contributing
1. Fork the repo and create a feature branch
2. Make your changes (with clear commits)
3. Ensure code passes lint and build
4. Submit a pull request with a clear description

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙋 FAQ / Support
- For issues, open a GitHub issue or contact the maintainers.
- For feature requests, use the Discussions tab or submit a PR.

---

**FundiConnect** — Empowering Africa, one skilled hand at a time.
