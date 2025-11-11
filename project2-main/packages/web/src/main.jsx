import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./components/auth/AuthContext.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NavBar } from "./components/NavBar.jsx";
import SignInApp from "./components/SignInApp.jsx";
import Connect from './components/Connect.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';



ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<SignInApp />} />
          <Route path="/signin" element={<SignInApp />} />
          <Route path='/connect' element={<Connect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
