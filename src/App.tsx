import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Login from "./pages/admin/Login";

import Home from "./pages/admin/Home";

import UserHome from "./pages/user/UserHome";
import Works from "./pages/user/Works";
import Services from "./pages/user/Services";
import About from "./pages/user/About";
import Clients from "./pages/user/Clients";
import Contact from "./pages/user/Contact";
import ClientDetails from "./pages/user/ClientDetails";


import ProtectRoutes from "./routes/ProtectRotes";

import PublicRoute from "./routes/PublicRoute";

import { AuthProvider } from "./context/AuthContext";
import InstagramReel from "./components/user/AutoSwitchSection";


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* PUBLIC USER */}
          <Route
            path="/"
            element={<UserHome />}
          />
          <Route
            path="/about"
            element={<About />}
          />
          <Route
            path="/services"
            element={<Services />}
          />
          <Route
            path="/clients"
            element={<Clients />}
          />
          <Route
  path="/client-details/:id"
  element={<ClientDetails />}
/>
          <Route
  path="/instareel"
  element={<InstagramReel />}
/>
          <Route
            path="/works"
            element={<Works />}
          />
          <Route
            path="/contact"
            element={<Contact />}
          />

          {/* LOGIN */}
          <Route element={<PublicRoute />}>
            <Route
              path="/login"
              element={<Login />}
            />
          </Route>

          {/* ADMIN */}
          <Route
            element={<ProtectRoutes />}
          >
            <Route
              path="/admin"
              element={<Home />}
            />
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;