import { Outlet } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";

export default function AppLayout() {
  return (
    <div className="app-shell">
      <AppHeader />
      <div className="app-content">
        <Outlet />
        <AppFooter />
      </div>
    </div>
  );
}
