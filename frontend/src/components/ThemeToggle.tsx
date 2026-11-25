import { Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/themeContext";

/** Sun/moon toggle used in the public nav and the app topbar. */
export default function ThemeToggle({ className = "icon-btn" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      className={className}
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
