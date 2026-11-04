import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/auth';
import { CartProvider } from './store/cart';
import { Shell } from './components/Navbar';
import { GuestOnly, RequireAuth, RequireRole } from './components/Guard';
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { MenuPage } from './pages/Menu';
import { CartPage } from './pages/Cart';
import { CheckoutPage } from './pages/Checkout';
import { OrdersPage } from './pages/Orders';
import { OrderDetailPage } from './pages/OrderDetail';
import { ProfilePage } from './pages/Profile';
import { StaffDashboardPage } from './pages/staff/Dashboard';
import { StaffMenuPage } from './pages/staff/MenuManager';
import { StaffSlotsPage } from './pages/staff/Slots';
import { StaffSettingsPage } from './pages/staff/Settings';
import { AdminPage } from './pages/admin/Overview';
import { AdminLiveOrdersPage } from './pages/admin/LiveOrders';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Shell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/login"
                element={
                  <GuestOnly>
                    <LoginPage />
                  </GuestOnly>
                }
              />
              <Route
                path="/register"
                element={
                  <GuestOnly>
                    <RegisterPage />
                  </GuestOnly>
                }
              />
              <Route path="/menu" element={<MenuPage />} />
              <Route
                path="/cart"
                element={
                  <RequireAuth>
                    <CartPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/checkout"
                element={
                  <RequireAuth>
                    <CheckoutPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/orders"
                element={
                  <RequireAuth>
                    <OrdersPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <RequireAuth>
                    <OrderDetailPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <ProfilePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/staff"
                element={
                  <RequireRole roles={['owner', 'staff', 'admin']}>
                    <StaffDashboardPage />
                  </RequireRole>
                }
              />
              <Route
                path="/staff/menu"
                element={
                  <RequireRole roles={['owner', 'staff', 'admin']}>
                    <StaffMenuPage />
                  </RequireRole>
                }
              />
              <Route
                path="/staff/slots"
                element={
                  <RequireRole roles={['owner', 'staff', 'admin']}>
                    <StaffSlotsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/staff/settings"
                element={
                  <RequireRole roles={['owner', 'staff', 'admin']}>
                    <StaffSettingsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireRole roles={['admin']}>
                    <AdminLiveOrdersPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <RequireRole roles={['admin']}>
                    <AdminLiveOrdersPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/console"
                element={
                  <RequireRole roles={['admin']}>
                    <AdminPage />
                  </RequireRole>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Shell>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}