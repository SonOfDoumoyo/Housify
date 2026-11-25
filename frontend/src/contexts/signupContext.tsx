import { useContext, createContext, useState } from "react";
import type { ReactNode, Dispatch, SetStateAction } from "react";
type SignupData = { fullname: string; email: string; phone_number: string; role: string; password: string; profile_image: string };
type SignupContextType = { signUpData: SignupData; setSignUpData: Dispatch<SetStateAction<SignupData>> };
const SignupContext = createContext<SignupContextType | null>(null);
export const SignupProvider = ({ children }: { children: ReactNode }) => {
  const [signUpData, setSignUpData] = useState<SignupData>({ fullname: "", email: "", phone_number: "", role: "", password: "", profile_image: "" });
  return <SignupContext.Provider value={{ signUpData, setSignUpData }}>{children}</SignupContext.Provider>;
};
export const useSignup = () => { const context = useContext(SignupContext); if (!context) throw new Error("useSignup must be used inside SignupProvider"); return context; };
