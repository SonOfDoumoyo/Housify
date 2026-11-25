import type { AppProps } from "next/app";
import "../src/index.css";
import "../src/App.css";
import "../src/assets/css/dasboard.css";
import "boxicons/css/boxicons.min.css";
import { ThemeProvider } from "../src/contexts/themeContext";

export default function HousifyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
