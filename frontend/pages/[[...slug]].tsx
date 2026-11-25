import dynamic from "next/dynamic";

// Housify currently uses BrowserRouter for its existing route tree and auth
// context. Render it client-side inside Next.js so existing URLs and flows stay
// intact while Next.js owns the application entry point and deployment build.
const HousifyRoutes = dynamic(() => import("../src/App"), { ssr: false });

export default function HousifyPage() {
  return <HousifyRoutes />;
}
