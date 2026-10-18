import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { lazy, Suspense } from "react";

// Funnel and dashboard load on demand so the marketing homepage stays light.
const Enroll = lazy(() => import("./pages/Enroll.tsx"));
const Instructor = lazy(() => import("./pages/Instructor.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/enroll" element={<Enroll />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/instructor" element={<Instructor />} />
          <Route path="/instructor/:id" element={<Instructor />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
