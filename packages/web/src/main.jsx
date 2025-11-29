

import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./components/auth/AuthContext.jsx";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NavBar } from "./components/NavBar.jsx";
import SignInApp from "./components/SignInApp.jsx";
import Connect from './components/Connect.jsx';
import Dashboard from "./components/Dashboard.jsx";
import Profile from "./components/Profile.jsx"
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import ReactGA from 'react-ga4';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import Renditions from "./components/Renditions.jsx";
import RefineCaption from "./components/RefineCaption.jsx";

//initialize google analytics with measurement ID from environment variable
//this runs when the app bundle loads
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

if (GA_ID) {
  ReactGA.initialize(GA_ID);
} else {
  console.warn("GA Measurement ID missing in .env");
}

function AppRoot() {
  useEffect(() => {
    // Send initial pageview only if ID exists
    if (GA_ID) {
      ReactGA.send({ hitType: "pageview", page: window.location.pathname });
    }
  }, []);


  return (
    <React.StrictMode>
      <AuthProvider>
        <BrowserRouter>
          <NavBar />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<SignInApp />} />
            <Route path="/signin" element={<SignInApp />} />

            {/* Protected Routes */}
            <Route
              path='/connect'
              element={
                // ensures only signed in user can access
                <ProtectedRoute>
                  <Connect />
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
            <Route path="/review/:id" element={
              <ProtectedRoute>
                <Renditions />
              </ProtectedRoute>
            } />
            <Route path="/refine/:id" element={
              <ProtectedRoute><RefineCaption /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><Profile /></ProtectedRoute>
            } />
            {/* catch all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AppRoot />);