import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Ensure this path is correct

//Handles cases like logged in should only be able to access dashbaord, connect pages
const ProtectedRoute = ({ children }) => {
    // 1. Get the 'user' from your context
    const { user } = useAuth();

    // 2. Check Loading State
    // In your AuthContext, you initialized user as 'undefined'.
    // So if user is still undefined, Firebase hasn't responded yet.
    if (user === undefined) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    // 3. Check Logged Out State
    // In your AuthContext, 'user' becomes null when not logged in.
    if (user === null) {
        return <Navigate to="/signin" replace />;
    }

    // 4. If user is not undefined and not null, they are logged in.
    return children;
};

export default ProtectedRoute;