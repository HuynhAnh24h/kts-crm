import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { AttendancePayrollPage } from './pages/AttendancePayrollPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { LoginPage } from './pages/LoginPage';
import { MyProfilePage } from './pages/MyProfilePage';
import { OrganizationPage } from './pages/OrganizationPage';
import { PayslipPrintPage } from './pages/PayslipPrintPage';
import { ProductionPlansPage } from './pages/ProductionPlansPage';
import { PurchasingPage } from './pages/PurchasingPage';
import { TasksKanbanPage } from './pages/TasksKanbanPage';
import { UsersPage } from './pages/UsersPage';
import { useAppSelector } from './store';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tasks" element={<TasksKanbanPage />} />
          <Route path="production-plans" element={<ProductionPlansPage />} />
          <Route path="purchasing" element={<PurchasingPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="organization" element={<OrganizationPage />} />
          <Route path="attendance-payroll" element={<AttendancePayrollPage />} />
          <Route path="payslips" element={<PayslipPrintPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="my-profile" element={<MyProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
