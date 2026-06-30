import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isLoggedIn } from './lib/auth';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SwipePage from './pages/SwipePage';
import ResultsPage from './pages/ResultsPage';
import ProductDetailPage from './pages/ProductDetailPage';

function Protected({ children }: { children: React.ReactNode }) {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Protected><HomePage /></Protected>} />
        <Route path="/swipe" element={<Protected><SwipePage /></Protected>} />
        <Route path="/results/:sessionId" element={<Protected><ResultsPage /></Protected>} />
        <Route path="/product/:id" element={<Protected><ProductDetailPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
