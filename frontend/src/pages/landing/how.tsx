import { CreateButton } from "../apppage";
import SearchIcon from "@mui/icons-material/Search";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

function Steps({title, text, number}:any){
    return (
        <div className="flex flex-row justify-between items-center w-[80%]">
            <div className="flex flex-row gap-11 gap-20">
                {number == "01" && <SearchIcon className="bg-primary-light/30 p-3 text-primary rounded-2xl border border-primary" sx={{ fontSize: 50}}/>}
                {number == "02" && <FavoriteBorderIcon className="bg-primary-light/30 p-3 text-primary rounded-2xl border border-primary" sx={{ fontSize: 50}}/>}
                {number == "03" && <CalendarMonthOutlinedIcon className="bg-primary-light/30 p-3 text-primary rounded-2xl border border-primary" sx={{ fontSize: 50}}/>}
                {number == "04" && <DescriptionOutlinedIcon className="bg-primary-light/30 p-3 text-primary rounded-2xl border border-primary" sx={{ fontSize: 50}}/>}
                {number == "05" && <BuildOutlinedIcon className="bg-primary-light/30 p-3 text-primary rounded-2xl border border-primary" sx={{ fontSize: 50}}/>}

                <div className="flex flex-row gap-11">
                    <span className="text-primary text-2xl font-semibold flex flex-row items-center justify-center gap-3"><p>{number}</p> <p>•••••••</p> </span>
                    <span>
                        <p className="text-3xl font-semibold">{title}</p>
                        <p className="text-2xl w-[75%]">{text}</p>
                    </span>
                </div>
            </div>
            <ChevronRightIcon className="text-primary" sx={{ fontSize: 26 }}/>
        </div>
    )
}

export default function HowItWOrks(){
    return (
        <div className="property-content flex flex-col">
            <div className="property-item flex flex-col gap-4 items-start mb-[60px]">
                <p className="text-primary text-xl">HOW IT WORKS</p>
                <p className="text-6xl font-bold">Simple Steps.<br />Smart Moves.</p>
                <p className="text-2xl">HousiF<span className="text-primary">y</span> makes finding, buying, or renting a property<br /> easy and stress free. Follow these simple steps to<br /> find your perfect space.</p>
                <CreateButton name="Start your Journey →" type={2}/>
            </div>
            <div className="property-item flex items-center justify-center flex-col">
                <p className="text-primary text-xl">THE PROCESS</p>
                <p className="text-5xl font-bold mb-[60px]">How HousiF<span className="text-primary">y</span> Works</p>
                <div className="w-full flex flex-col items-center gap-[30px]">
                    <Steps title="Search & Discover" text="Browse thousands of verified properties. Use filters to find exactly what you need." number="01" />
                    <Steps title="Save & Compare" text="Save your favourite listings and compare features, prices, and locations side by side." number="02" />
                    <Steps title="Schedule a Visit" text="Book a viewing with our agents at a time that works for you." number="03" />
                    <Steps title="Make an Offer" text="Found the one? Our exports with guide you through the offer and negotiation." number="04" />
                    <Steps title="Close & Move in" text="We handle the paperwork while you get the keys to your new space." number="05" />
                </div>
            </div>
            <div className="property-item relative w-full h-[450px] rounded-3xl mt-16">
                <img src="../src/assets/city_image.jpeg" alt="" className="absolute bg-cover w-full h-full rounded-3xl"/>
                <div className="absolute top-11 left-11 flex flex-col gap-4 items-start">
                    <p className="text-xl text-primary">READY TO GET STARTED</p>
                    <p className="text-7xl font-bold mb-11">Your perfect place<br /> is just a few clicks away.</p>
                    <CreateButton name="Browse Properties →" type={2} />
                </div>
            </div>
        </div>
    )
}