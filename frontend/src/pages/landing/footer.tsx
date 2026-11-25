import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import XIcon from "@mui/icons-material/X";
import { Link } from "react-router-dom";
import { CreateButton } from "../apppage";

export default function Footer(){
    return (
        <div className="flex flex-col justify-between gap-[50px] p-7">
            <div className="flex flex-row justify-between">
                <div className="flex flex-col gap-4 items-center">
                    <div className="flex flex-row gap-1 items-center">
                        <img src="../src/assets/housify_logo.png" alt="" className="w-[65px]"/>
                        <p className="text-5xl text-bold">Housif<span className="text-primary">y</span></p>
                    </div>
                    <p className="text-2xl">Making property search simple,<br /> transparent and trustworthy.</p>
                    <div className="flex items-center flex-row gap-4">
                        <FacebookIcon className="cursor-pointer hover:text-primary" />
                        <XIcon className="cursor-pointer hover:text-primary" />
                        <InstagramIcon className="cursor-pointer hover:text-primary" />
                        <LinkedInIcon className="cursor-pointer hover:text-primary" />
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    <p className="text-4xl font-bold">Quick Links</p>
                    <div className="flex flex-col gap-1 text-2xl">
                        <p>Home</p>
                        <p>Properties</p>
                        <p>About Us</p>
                        <p>How it Works</p>
                        <p>Contact</p>
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    <p className="text-4xl font-bold">Resources</p>
                    <div className="flex flex-col gap-1 text-2xl">
                        <p>FAQs</p>
                        <p>Blog</p>
                        <p>Privacy Policy</p>
                        <Link to="/terms">Terms of Service</Link>
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    <p className="text-4xl font-bold">Subscribe to our newsletter</p>
                    <div className="flex flex-col gap-1 text-2xl">
                        <p>Get the latest property listings and updates <br /> delivered to your inbox.</p>
                    </div>
                    
                    <div className="flex flex-row w-[400px] gap-2 items-center border border-primary/30 bg-[#7c3aed]/0.1 backdrop-blur-[5px] rounded-[3px]">
                        <input type="text" className="outline-none  w-full p-[7.5px] text-2xl" placeholder="Enter your email address"/>
                        <CreateButton name="Subscribe" type={2} />
                    </div>
                </div>
            </div>
            <div>
                <p className="text-2xl">© 2026 HousiFy. All rights reserved.</p>
            </div>
        </div>
    )
}