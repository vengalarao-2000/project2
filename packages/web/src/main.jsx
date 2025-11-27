

import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./components/auth/AuthContext.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NavBar } from "./components/NavBar.jsx";
import SignInApp from "./components/SignInApp.jsx";
import Connect from './components/Connect.jsx';
import Dashboard from "./components/Dashboard.jsx";
import Profile from "./components/Profile.jsx"
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import Renditions from "./components/Renditions.jsx";
import RefineCaption from "./components/RefineCaption.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);