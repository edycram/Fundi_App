import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { SignIn } from './pages/auth/SignIn';
import { SignUp } from './pages/auth/SignUp';
import { Onboarding } from './pages/fundi/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Search } from './pages/client/Search';
import { BookingForm } from './pages/client/BookingForm';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute role="fundi">
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/search"
              element={
                <ProtectedRoute role="client">
                  <Search />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/book/:fundiId"
              element={
                <ProtectedRoute role="client">
                  <BookingForm />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;