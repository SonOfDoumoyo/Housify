import { BrowserRouter as Router, Routes, Route} from "react-router-dom";
import AppPage from "./pages/apppage";
import BrowseHomes from "./pages/browse";
import DashboardBrowse from "./pages/dashboardBrowse";
import Dashboard from "./pages/dashboard";
import SignIn from "./pages/signin";
import SignUp from "./pages/signup";
import Verify from "./pages/verify";
import CompleteProfile from "./pages/completeProfile";
import "./interceptors/interceptors";
import { UserProvider } from "./contexts/userContext";
import Layout from "./pages/privatelayout";
import ListHouse from "./pages/listingHouse";
import ListedHouse from "./pages/listedPreview";
import Settings from "./pages/settings";
import ViewListing from "./pages/viewListing";
import Terms from "./pages/terms";
import Admin from "./pages/admin";
import { SignupProvider } from "./contexts/signupContext";

export default function App() {
  return (
    <Router>
      <UserProvider>
      <SignupProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<AppPage/>}/>
        <Route path="/browse" element={<BrowseHomes/>}/>
        <Route path="/listing-details/:uid" element={<ViewListing/>}/>
        <Route path="/create-account" element={<SignUp/>}/>
        <Route path="/sign-in" element={<SignIn/>}/>
        <Route path="/verify-email" element={<Verify/>}/>
        <Route path="/terms" element={<Terms/>}/>
        {/* First-time Google users land here when their account has no role yet */}
        <Route path="/complete-profile" element={<CompleteProfile/>}/>
        <Route path="/choose-role" element={<CompleteProfile/>}/>
        {/* Private workspace — Layout redirects role-less users to /complete-profile */}
        <Route element={<Layout/>}>
          <Route path="/dashboard" element={<Dashboard/>}/>
          <Route path="/dashboard/browse" element={<DashboardBrowse/>}/>
          <Route path="/listing" element={<ListHouse/>}/>
          <Route path="/listings" element={<ListedHouse/>}/>
          <Route path="/settings" element={<Settings/>}/>
          <Route path="/admin" element={<Admin/>}/>
        </Route>
      </Routes>
      </SignupProvider>
      </UserProvider>
    </Router>
  )
}
