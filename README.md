# 🏥 Smart Hospital Digital Twin Dashboard

A comprehensive digital twin dashboard for smart hospital management featuring real-time patient monitoring, IoT device management, and AI-powered health analytics.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.3.1-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)
![Vite](https://img.shields.io/badge/Vite-7.0.5-purple.svg)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-teal.svg)

## 🌟 Features

### 🏥 Core Hospital Management
- **Patient Management**: Complete patient lifecycle with medical records, room assignments, and bed management
- **Staff Management**: Healthcare staff scheduling, role-based access, and duty management
- **Room & Bed Management**: Real-time room occupancy, bed assignments, and facility resource tracking
- **Multi-Role Dashboard**: Specialized interfaces for Admins, Doctors, and Hospital Staff

### 📱 IoT & Real-time Monitoring
- **Device Management**: IoT device registration, configuration, and status monitoring
- **Real-time Vital Signs**: Live monitoring of patient vital signs from connected medical devices
- **Device-Patient Linking**: Automatic and manual assignment of monitoring devices to patients
- **Equipment Tracking**: Monitor device status, calibration schedules, and maintenance

### 🚨 Intelligent Alert System
- **Real-time Alerts**: Instant notifications for critical patient conditions
- **Multi-level Severity**: Critical, High, Medium, and Low priority alerts
- **Alert Filtering**: Filter alerts by type, severity, and status
- **Auto-refresh**: Automatic polling for new alerts every 30 seconds
- **Device Alerts**: Equipment malfunction and calibration notifications

### 🤖 AI-Powered Analytics
- **Risk Assessment**: Patient risk scoring using machine learning algorithms
- **Predictive Analytics**: Early warning system for patient deterioration
- **Anomaly Detection**: AI-powered detection of unusual vital sign patterns
- **Critical Patient Identification**: Automatic identification of high-risk patients

### 📊 Dashboard Features
- **Role-based Views**: Customized dashboards for different user roles
- **Real-time Statistics**: Live hospital metrics and occupancy rates
- **Patient Details Modal**: Comprehensive patient information with medical history
- **Responsive Design**: Mobile-friendly interface with modern UI/UX

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript 5.5.3
- **Build Tool**: Vite 7.0.5 for fast development and building
- **Styling**: Tailwind CSS 3.4.1 for responsive, utility-first CSS
- **Icons**: Lucide React for modern, consistent iconography
- **State Management**: React Context API for global state

### Development Tools
- **Linting**: ESLint with TypeScript support
- **Code Quality**: TypeScript for type safety
- **Hot Reload**: Vite HMR for instant development feedback
- **PostCSS**: Advanced CSS processing with Autoprefixer

### Backend Integration
- **Database**: Firebase Realtime Database
- **Real-time Data**: Live data synchronization
- **Authentication**: Role-based authentication system
- **API Integration**: RESTful API communication

## 🚀 Quick Start

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ahmed-a133b/SmartHospitalBackend.git
   cd project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_BASE_URL=your_backend_api_url
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

6. **Preview production build**
   ```bash
   npm run preview
   ```

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/                    # Authentication components
│   │   └── AuthContainer.tsx
│   └── dashboard/               # Dashboard components
│       ├── Dashboard.tsx        # Main dashboard component
│       ├── Header.tsx          # Dashboard header
│       ├── Sidebar.tsx         # Navigation sidebar
│       ├── components/         # Feature components
│       │   ├── admin/          # Admin-specific components
│       │   │   ├── PatientManagement.tsx
│       │   │   ├── StaffManagement.tsx
│       │   │   ├── RoomManagement.tsx
│       │   │   ├── DeviceManagement.tsx
│       │   │   └── RoomForm.tsx
│       │   └── doctor/         # Doctor-specific components
│       │       └── HealthAlerts.tsx
│       └── views/              # Role-based dashboard views
│           ├── AdminDashboard.tsx
│           ├── DoctorDashboard.tsx
│           └── StaffDashboard.tsx
├── contexts/
│   ├── AuthContext.tsx         # Authentication context
│   └── HospitalDataContext.tsx # Hospital data management
├── hooks/
│   └── useRealTimeAlerts.ts    # Real-time alerts hook
├── api/
│   ├── types.ts               # TypeScript type definitions
│   ├── config.ts              # API configuration
│   └── hooks/
│       └── useBeds.ts         # Bed management hook
├── utils/
│   └── deviceUtils.ts         # Device utility functions
└── App.tsx                    # Main application component
```

## 🎭 User Roles & Permissions

### 👨‍💼 Hospital Administrator
- **Dashboard Access**: Complete system overview with statistics
- **Patient Management**: Add, edit, remove patients and manage admissions
- **Staff Management**: Manage healthcare staff and schedules
- **Room Management**: Configure rooms, beds, and assign equipment
- **Device Management**: Register and configure IoT devices
- **System Analytics**: Access to comprehensive hospital analytics
- **Alert Management**: System-wide alert configuration and monitoring

### 👨‍⚕️ Doctor
- **Patient Overview**: View assigned patients and medical records
- **Health Alerts**: Real-time notifications for patient conditions
- **Critical Patients**: Quick access to high-risk patient information
- **Patient Details**: Comprehensive patient medical history and status
- **Real-time Monitoring**: Live vital signs and device status
- **Risk Assessment**: AI-powered patient risk scoring

### 👩‍⚕️ Hospital Staff
- **Schedule Management**: View personal duty schedules
- **Room Status**: Check room availability and occupancy
- **Assigned Patients**: Access to patients under their care
- **Task Management**: Daily task and responsibility tracking

## 🔧 Configuration

### Environment Variables
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000

```

### Build Configuration
The project uses Vite for building and development:
- **Development**: Hot Module Replacement (HMR) for instant updates
- **Production**: Optimized builds with code splitting
- **TypeScript**: Full type checking and IntelliSense support

## 📊 Key Features in Detail

### Real-time Patient Monitoring
- Live vital signs display (heart rate, blood pressure, temperature, oxygen saturation)
- Automatic device-patient linking
- Historical data tracking and trends
- Alert generation for abnormal readings

### Intelligent Alert System
- **Critical Alerts**: Life-threatening conditions requiring immediate attention
- **Warning Alerts**: Conditions requiring prompt medical review
- **Device Alerts**: Equipment malfunctions and maintenance notifications
- **Auto-refresh**: Updates every 30 seconds without page reload

### Advanced Room Management
- Real-time bed availability and status
- Patient-bed assignments with device linking
- Room occupancy tracking and statistics
- Equipment assignment to specific beds

### AI-Powered Analytics
- Patient risk assessment using machine learning
- Predictive analytics for early intervention
- Anomaly detection in vital signs patterns
- Critical patient identification algorithms

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use Tailwind CSS for styling consistency
- Implement proper error handling
- Write meaningful commit messages
- Ensure responsive design compatibility

## 📝 API Integration

This frontend integrates with the Smart Hospital Backend API. Key integration points:

- **Patient API**: CRUD operations for patient management
- **IoT Data API**: Real-time device data and vital signs
- **Alerts API**: Alert management and notifications
- **Staff API**: Staff management and scheduling
- **Room API**: Room and bed management

For backend documentation, see: [Smart Hospital Backend Repository](https://github.com/ahmed-a133b/SmartHospitalBackend)

## 🔒 Security Features

- **Role-based Access Control**: Different permissions for each user role
- **Authentication**: Secure login and session management
- **Data Validation**: Client-side and server-side input validation
- **API Security**: Secure communication with backend services

## 📱 Responsive Design

The dashboard is fully responsive and optimized for:
- **Desktop**: Full-featured dashboard experience
- **Tablet**: Optimized layout for touch interactions
- **Mobile**: Essential features accessible on mobile devices

## 🐛 Troubleshooting

### Common Issues

**Development server won't start:**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Build fails:**
```bash
# Check TypeScript errors
npm run lint
# Fix any type errors and rebuild
npm run build
```

**Real-time features not working:**
- Verify API endpoints in environment variables
- Check network connectivity
- Ensure backend services are running

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Ahmed Ateeb** - *Initial work* - [ahmed-a133b](https://github.com/ahmed-a133b)

## 🙏 Acknowledgments

- React community for excellent documentation
- Tailwind CSS for the utility-first CSS framework
- Lucide React for beautiful icons
- Vite team for the amazing build tool

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

**Built with ❤️ for modern healthcare management**
