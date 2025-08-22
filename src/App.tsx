import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Security from "./pages/Security";
import About from "./pages/About";
import Contact from "./pages/Contact";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Reset from "./pages/Reset";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public pages with header/footer */}
          <Route path="/" element={<Layout><Landing /></Layout>} />
          <Route path="/pricing" element={<Layout><Pricing /></Layout>} />
          <Route path="/security" element={<Layout><Security /></Layout>} />
          <Route path="/about" element={<Layout><About /></Layout>} />
          <Route path="/contact" element={<Layout><Contact /></Layout>} />
          
          {/* Auth pages without header/footer */}
          <Route path="/signin" element={<Layout showHeaderFooter={false}><SignIn /></Layout>} />
          <Route path="/signup" element={<Layout showHeaderFooter={false}><SignUp /></Layout>} />
          <Route path="/reset" element={<Layout showHeaderFooter={false}><Reset /></Layout>} />
          
          {/* 404 page */}
          <Route path="*" element={<Layout showHeaderFooter={false}><NotFound /></Layout>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
