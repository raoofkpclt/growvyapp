import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const PublicRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  return user ? (
    <Navigate to="/admin" replace />
  ) : (
    <Outlet />
  );
};

export default PublicRoute;