import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import HeadsetMicOutlinedIcon from "@mui/icons-material/HeadsetMicOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import { CreateButton } from "../apppage";

export default function Contact(){
    return (
        <div className="property-card text-2xl">
            <p className="text-xl text-primary">CONTAC US</p>
            <div className="grid lg:grid-cols-2">
                <div className="flex flex-col gap-9">
                    <p className="text-7xl font-bold">We're here to<br /> help you <span className="bg-gradient-to-r from-primary-light via-primary-bright to bg-primary-dark bg-clip-text text-transparent">home.</span></p>
                    <p className="text-2xl">Have a question, need support, or want to partner with HousiF<span className="text-primary">y</span>?<br />We'd love to hear from you.</p>
                    <div className="flex flex-col gap-7 p-8">
                        <span className="flex flex-row gap-7 items-center">
                            <EmailOutlinedIcon sx={{fontSize: 20}} className="text-primary"/>
                            <span>
                                <p className="font-semibold">Email Us</p>
                                <p>hello@housify.com <br/>We typically reply within 24 hours.</p>
                            </span>
                        </span>
                        <span className="flex flex-row gap-7 items-center">
                            <PhoneOutlinedIcon sx={{fontSize: 20}} className="text-primary"/>
                            <span>
                                <p className="font-semibold">Call Us</p>
                                <p>+234 913 856 5782<br/>Mon -Fri, 9:00 AM - 6:00 PM</p>
                            </span>
                        </span>
                        <span className="flex flex-row gap-7 items-center">
                            <LocationOnOutlinedIcon sx={{fontSize: 20}} className="text-primary"/>
                            <span>
                                <p className="font-semibold">Visit Us</p>
                                <p>123 Real Estate Avenue<br/>Victoria island, Lagos, Nigeri</p>
                            </span>
                        </span>
                        <span className="flex flex-row gap-7 items-center">
                            <AccessTimeOutlinedIcon sx={{fontSize: 20}} className="text-primary"/>
                            <span>
                                <p className="font-semibold">Business Hours</p>
                                <p>Mon - Fri, 9:00 AM - 6:00 PM<br/>Sat: 10:00 AM - 3:00 PM <br />Sun: Closed</p>
                            </span>
                        </span>
                    </div>
                </div>
                <div className="flex flex-col gap-8 text-2xl">
                 <div className="bg-gradient-to-r from-primary-dark/80 to-primary-light/20 p-8 rounded-3xl shadow-[inset_0_0_30px_var(--primary-dark)]">
                    <p className="text-4xl font-bold">Send us a message</p>
                    <p>Fill out the form below and we'll get back to you.</p>
                    <form className="flex flex-col gap-4">
                        <div className="flex flex-row gap-4">
                            <div className="flex flex-row w-[400px] gap-2 items-center shadow-primary shadow-sm hover:shadow-[inset_30px_0_40px_var(--primary-dark] transition-all duration-300  border border-primary/30 bg-[#7c3aed]/0.1 backdrop-blur-[5px] rounded-[3px]">
                                <PersonOutlineOutlinedIcon className="ml-5"/>
                                <input type="text" className="outline-none  w-full p-[13.5px] text-2xl" placeholder="Your Name"/>
                            </div>
                            <div className="flex flex-row w-[400px] gap-2 items-center shadow-primary shadow-sm hover:shadow-[inset_30px_0_40px_var(--primary-dark] transition-all duration-300 border border-primary/30 bg-[#7c3aed]/0.1 backdrop-blur-[5px] rounded-[3px]">
                                <EmailOutlinedIcon className="ml-5"/>
                                <input type="text" className="outline-none  w-full p-[13.5px] text-2xl" placeholder="Your Email"/>
                            </div>
                        </div>
                        <div className="flex flex-row w-full gap-2 items-cente shadow-primary shadow-sm transition-all duration-300 border border-primary/30 bg-[#7c3aed]/0.1 backdrop-blur-[5px] rounded-[3px]">
                            <LocalOfferOutlinedIcon className="ml-5"/>
                            <input type="text" className="outline-none  w-full p-[13.5px] text-2xl" placeholder="Your Subject"/>
                        </div>
                        <div className="flex flex-row w-full relative gap-2 shadow-primary shadow-sm transition-all duration-300 border border-primary/30 bg-[#7c3aed]/0.1 backdrop-blur-[5px] rounded-[3px]">
                            <textarea className="outline-none  h-[150px] w-full p-[7.5px] text-2xl" placeholder="Your Message"></textarea>
                        </div>
                        <CreateButton name="Send Message"/>
                    </form>
                 </div>
                 <div className="flex flex-row justify-between w-full items-center bg-gradient-to-r from-primary-dark/80 to-primary-light/20 p-8 rounded-3xl shadow-[inset_0_0_30px_var(--primary-dark)]">
                    <span className="flex flex-row gap-4 items-center justify-between">
                        <HeadsetMicOutlinedIcon className="bg-primary p-2 rounded-[6px]" sx={{fontSize:28}}/>
                        <span>
                            <p className="text-2xl font-bold">Need Immediate Help?</p>
                            <p>Check out our Help Center for answers to common questions.</p>
                        </span>
                    </span>
                    <p className="text-primary">Visit Help Center →</p>
                </div>
                </div>
            </div>
        </div>
    )
}