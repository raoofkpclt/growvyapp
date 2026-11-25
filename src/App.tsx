

import { BrowserRouter, Routes, Route } from "react-router-dom";

// Admin
import Login from "./pages/admin/Login";
import Home from "./pages/admin/Home";

// Staff
import StaffLogin from "./pages/staff/Login";

import StaffHome from "./pages/staff/Home";

// Public user
import UserHome from "./pages/user/UserHome";
import Works from "./pages/user/Works";
import Services from "./pages/user/Services";
import About from "./pages/user/About";
import Clients from "./pages/user/Clients";
import Contact from "./pages/user/Contact";
import ClientDetails from "./pages/user/ClientDetails";

// Route guards
import ProtectRoutes from "./routes/ProtectRotes";
import PublicRoute from "./routes/PublicRoute";
import { StaffProtectRoute, StaffPublicRoute } from "./routes/StaffRoutes ";

import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* PUBLIC USER */}
          <Route path="/" element={<UserHome />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/client-details/:id" element={<ClientDetails />} />
          <Route path="/works" element={<Works />} />
          <Route path="/contact" element={<Contact />} />

          {/* ADMIN LOGIN */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* ADMIN */}
          <Route element={<ProtectRoutes />}>
            <Route path="/admin" element={<Home />} />
          </Route>

          {/* STAFF LOGIN + REGISTER */}
          <Route element={<StaffPublicRoute />}>
            <Route path="/staff/login" element={<StaffLogin />} />
            
          </Route>

          {/* STAFF */}
          <Route element={<StaffProtectRoute />}>
            <Route path="/staff" element={<StaffHome />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
