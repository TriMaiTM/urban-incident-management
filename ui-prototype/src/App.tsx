import ComponentGallery from './ComponentGallery'
import DevMenu from './components/DevMenu'
import CommandCenterScreen from './screens/CommandCenterScreen'
import MyReportsScreen from './screens/MyReportsScreen'
import ReportDetailScreen from './screens/ReportDetailScreen'
import FeedbackScreen from './screens/FeedbackScreen'
import NotificationsScreen from './screens/NotificationsScreen'
import AnalyticsScreen from './screens/AnalyticsScreen'
import TrackingScreen from './screens/TrackingScreen'
import VerifyScreen from './screens/VerifyScreen'
import TaskResolveScreen from './screens/TaskResolveScreen'
import TaskDetailScreen from './screens/TaskDetailScreen'
import TaskListScreen from './screens/TaskListScreen'
import SlaWatchScreen from './screens/SlaWatchScreen'
import FieldUnitsScreen from './screens/FieldUnitsScreen'
import IncidentsScreen from './screens/IncidentsScreen'
import TechnicianHistoryScreen from './screens/TechnicianHistoryScreen'
import TechnicianProfileScreen from './screens/TechnicianProfileScreen'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'
import ForgotPasswordScreen from './screens/ForgotPasswordScreen'
import ProfileScreen from './screens/ProfileScreen'
import IncidentListScreen from './screens/IncidentListScreen'
import UsersScreen from './screens/UsersScreen'
import AuditLogsScreen from './screens/AuditLogsScreen'
import ZonesScreen from './screens/ZonesScreen'
import SettingsScreen from './screens/SettingsScreen'
import IntegrationsScreen from './screens/IntegrationsScreen'
import { NotFoundScreen, ForbiddenScreen, ServerErrorScreen, MaintenanceScreen, OfflineScreen } from './screens/ExceptionScreens'
import Open311Screen from './screens/Open311Screen'
import HomeScreen from './screens/HomeScreen'
import ReportScreen from './screens/ReportScreen'

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  return (
    <>
      {path === '/developers/open311' ? <Open311Screen /> : path === '/404' ? <NotFoundScreen /> : path === '/403' ? <ForbiddenScreen /> : path === '/500' ? <ServerErrorScreen /> : path === '/maintenance' ? <MaintenanceScreen /> : path === '/offline' ? <OfflineScreen /> : path === '/admin/zones' ? <ZonesScreen /> : path === '/admin/settings' ? <SettingsScreen /> : path === '/admin/integrations' ? <IntegrationsScreen /> : path === '/admin/users' ? <UsersScreen /> : path === '/admin/audit-logs' ? <AuditLogsScreen /> : path === '/incidents' ? <IncidentListScreen /> : path === '/auth/login' ? <LoginScreen /> : path === '/auth/register' ? <RegisterScreen /> : path === '/auth/forgot-password' ? <ForgotPasswordScreen /> : path === '/profile' ? <ProfileScreen /> : path === '/technician/history' ? <TechnicianHistoryScreen /> : path === '/technician/profile' ? <TechnicianProfileScreen /> : path === '/dispatcher/sla-watch' ? <SlaWatchScreen /> : path === '/dispatcher/field-units' ? <FieldUnitsScreen /> : path === '/dispatcher/incidents' ? <IncidentsScreen /> : path === '/citizen/my-reports' ? <MyReportsScreen /> : path.startsWith('/citizen/reports/') ? <ReportDetailScreen id={decodeURIComponent(path.split('/')[3])} /> : path.startsWith('/citizen/feedback/') ? <FeedbackScreen code={decodeURIComponent(path.split('/')[3])} /> : path === '/citizen/notifications' ? <NotificationsScreen /> : path === '/admin/analytics' ? <AnalyticsScreen /> : path.startsWith('/tracking/') ? <TrackingScreen code={decodeURIComponent(path.split('/')[2])} /> : path === '/dispatcher/verify' ? <VerifyScreen /> : /^\/technician\/tasks\/[^/]+\/resolve$/.test(path) ? <TaskResolveScreen id={decodeURIComponent(path.split('/')[3])} /> : path.startsWith('/technician/tasks/') ? <TaskDetailScreen id={decodeURIComponent(path.split('/')[3])} /> : path === '/technician/tasks' ? <TaskListScreen /> : path === '/dispatcher/command-center' ? <CommandCenterScreen /> : path === '/report' ? <ReportScreen /> : path === '/gallery' ? <ComponentGallery /> : <HomeScreen />}
      <DevMenu />
    </>
  )
}
