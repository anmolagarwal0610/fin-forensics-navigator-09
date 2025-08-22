
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import Layout from "@/components/layout/Layout";
import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import Security from "@/pages/Security";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import Reset from "@/pages/Reset";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Dashboard from "@/pages/app/Dashboard";
import NewCase from "@/pages/app/NewCase";
import CaseDetail from "@/pages/app/CaseDetail";
import CaseUpload from "@/pages/app/CaseUpload";
import Account from "@/pages/app/Account";
import AdminCases from "@/pages/app/AdminCases";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Layout><Landing /></Layout>} />
            <Route path="/pricing" element={<Layout><Pricing /></Layout>} />
            <Route path="/security" element={<Layout><Security /></Layout>} />
            <Route path="/about" element={<Layout><About /></Layout>} />
            <Route path="/contact" element={<Layout><Contact /></Layout>} />
            <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
            <Route path="/terms" element={<Layout><Terms /></Layout>} />
            
            {/* Auth routes */}
            <Route path="/signin" element={<Layout showHeaderFooter={false}><SignIn /></Layout>} />
            <Route path="/signup" element={<Layout showHeaderFooter={false}><SignUp /></Layout>} />
            <Route path="/reset" element={<Layout showHeaderFooter={false}><Reset /></Layout>} />
            
            {/* Protected app routes */}
            <Route path="/app/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/app/cases/new" element={<ProtectedRoute><NewCase /></ProtectedRoute>} />
            <Route path="/app/cases/:id" element={<ProtectedRoute><CaseDetail /></ProtectedRoute>} />
            <Route path="/app/cases/:id/upload" element={<ProtectedRoute><CaseUpload /></ProtectedRoute>} />
            <Route path="/app/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/app/admin/cases" element={<ProtectedRoute><AdminCases /></ProtectedRoute>} />
            
            {/* 404 route */}
            <Route path="*" element={<Layout><NotFound /></Layout>} />
          </Routes>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
