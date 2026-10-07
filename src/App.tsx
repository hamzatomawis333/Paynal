import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Artisans from "./pages/Artisans";
import About from "./pages/About";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Checkout from "./pages/Checkout";
import SellerDashboard from "./pages/seller/SellerDashboard";
import SellerProducts from "./pages/seller/SellerProducts";
import SellerOrders from "./pages/seller/SellerOrders";
import SellerProfile from "./pages/seller/SellerProfile";
import SellerSubscription from "./pages/seller/SellerSubscription";
import BuyerDashboard from "./pages/buyer/BuyerDashboard";
import BuyerOrders from "./pages/buyer/BuyerOrders";
import BuyerOrderPayment from "./pages/buyer/BuyerOrderPayment";
import BuyerWishlist from "./pages/buyer/BuyerWishlist";
import BuyerHistory from "./pages/buyer/BuyerHistory";
import BuyerProfile from "./pages/buyer/BuyerProfile";
import BuyerPayments from "./pages/buyer/BuyerPayments";
import BuyerMessages from "./pages/buyer/BuyerMessages";
import SellerMessages from "./pages/seller/SellerMessages";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminReports from "./pages/admin/AdminReports";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminBuyerOrders from "./pages/admin/AdminBuyerOrders";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminSellers from "./pages/admin/AdminSellers";
import AdminSellerDetail from "./pages/admin/AdminSellerDetail";
import AdminPaymentMethods from "./pages/admin/AdminPaymentMethods";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminProfile from "./pages/admin/AdminProfile";

import AdminAuditLog from "./pages/admin/AdminAuditLog";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* AuthProvider must wrap CartProvider: the cart hydrates from the
            server based on the resolved login state. */}
        <AuthProvider>
          <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/artisans" element={<Artisans />} />
              <Route path="/about" element={<About />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              {/* Seller Dashboard */}
              <Route element={<ProtectedRoute role="seller" />}>
                <Route path="/seller" element={<SellerDashboard />} />
                <Route path="/seller/products" element={<SellerProducts />} />
                <Route path="/seller/orders" element={<SellerOrders />} />
                <Route path="/seller/profile" element={<SellerProfile />} />
                <Route path="/seller/messages" element={<SellerMessages />} />
                <Route path="/seller/subscription" element={<SellerSubscription />} />
              </Route>
              {/* Buyer Dashboard */}
              <Route element={<ProtectedRoute role="buyer" />}>
                <Route path="/account" element={<BuyerDashboard />} />
                <Route path="/account/orders" element={<BuyerOrders />} />
        <Route path="/account/orders/:id/pay" element={<BuyerOrderPayment />} />
                <Route path="/account/wishlist" element={<BuyerWishlist />} />
                <Route path="/account/history" element={<BuyerHistory />} />
                <Route path="/account/profile" element={<BuyerProfile />} />
                <Route path="/account/payments" element={<BuyerPayments />} />
                <Route path="/account/messages" element={<BuyerMessages />} />
              </Route>
              {/* Admin Dashboard */}
              <Route element={<ProtectedRoute role="admin" />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                <Route path="/admin/messages" element={<AdminMessages />} />
                <Route path="/admin/categories" element={<AdminCategories />} />
                <Route path="/admin/payment-methods" element={<AdminPaymentMethods />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/orders/buyer/:buyerId" element={<AdminBuyerOrders />} />
                <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
                <Route path="/admin/sellers" element={<AdminSellers />} />
                <Route path="/admin/sellers/:id" element={<AdminSellerDetail />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/audit" element={<AdminAuditLog />} />
                <Route path="/admin/profile" element={<AdminProfile />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
