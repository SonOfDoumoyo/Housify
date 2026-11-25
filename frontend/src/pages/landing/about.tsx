import { CreateButton } from "../apppage";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import PeopleIcon from "@mui/icons-material/People";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";


function Section(){
    return (
        <div className="property-item flex flex-col gap-2 h-full">
            <p className="text-2xl">About HousiF<span className="text-primary">y</span></p>
            <div className="flex flex-col gap-9">
                <p className="text-6xl font-semibold">Building Tomorrow, Together.</p>
                <p className="text-2xl">At HousiF<span className="text-primary">y</span>, we believe that finding the right property <br /> is more than a transaction—it's the beginning<br /> of a better life. We're here to make that journey <br /> smooth, transparent, and rewarding.</p>
                <div className="flex flex-row gap-4">
                    <CreateButton name="Our Story" type={2} />
                    <button className="flex flex-row gap-2 text-2xl items-center"><PlayCircleIcon sx={{ fontSize: 31 }} />Watch Video</button>
                </div>
            </div>
        </div>
    )
}

function Values({title, text, id}:any){
    return (
        <div className="flex flex-row gap-2 p-6 bg-primary-light/10 rounded-2xl h-full">
            {(id == 1) && (<FavoriteBorderIcon className="text-primary" sx={{ fontSize: 26}}/>)}
            {(id == 2) && (<VerifiedUserOutlinedIcon className="text-primary" sx={{ fontSize: 26}}/>)}
            {(id == 3) && (<LightbulbOutlinedIcon className="text-primary" sx={{ fontSize: 26}}/>)}
            {(id == 4) && (<WorkspacePremiumOutlinedIcon className="text-primary" sx={{ fontSize: 26}}/>)}
            <div>
                <p className="text-3xl font-semibold">{title}</p>
                <p className="text-2xl">{text}</p>
            </div>
        </div>
    )
}

function Mission(){
    return (
        <div className="property-item grid lg:grid-cols-2 sm:grid-cols-1 justify-between gap-8">
            <div className="w-full flex flex-col gap-9">
                <p className="text-xl font-semibold">OUR MISSION</p>
                <p className="text-5xl font-bold">To connect people with <br /> spaces that inspire.</p>
                <p className="text-2xl">We're on a mission to redefine real estate by <br /> combining technology, integrity, and design <br /> to create experiences that truly matter.</p>
                <div className="flex flex-row gap-3 bg-primary-dark/20 p-9 rounded-[10px]">
                    <VerifiedUserIcon className="text-primary" sx={{ fontSize: 26 }}/>
                    <div className="flex flex-col gap-2 text-2xl">
                        <p className="font-semibold">Our Promise</p>
                        <p>Honest advice Transparent process. <br />Exceptional results.</p>
                    </div>
                </div>
            </div>
            <div className="w-full h-full flex flex-col gap-9">
                <p className="text-xl font-semibold">OUR VALUES</p>
                <div className="grid lg:grid-cols-2 gap-8 h-full">
                    <Values title="People First" text="We put clients at the heart of every decision we make." id={1}/>
                    <Values title="Integrity" text="We believe in transparency, honesty, and doing what's right." id={2}/>
                    <Values title="Innovation" text="We enhance technology and creative solutions to deliver better results." id={3}/>
                    <Values title="Excellence" text="We are committed to the highest standards in everything we do." id={4}/>
                </div>
            </div>
        </div>
    )
}

function StoryBox({title, text, id}:any){
    return (
        <div className="flex flex-row gap-4 items-center">
            {(id == 1) && (<BusinessOutlinedIcon className="text-primary" sx={{ fontSize: 30}}/>)}
            {(id == 2) && (<PeopleIcon className="text-primary" sx={{ fontSize: 30}}/>)}
            {(id == 3) && (<LocationOnOutlinedIcon className="text-primary" sx={{ fontSize: 30}}/>)}
            {(id == 4) && (<WorkspacePremiumOutlinedIcon className="text-primary" sx={{ fontSize: 30}}/>)}
            <div className="flex flex-col gap-2">
                <p className="text-5xl font-bold">{title}</p>
                <p className="text-2xl text-primary">{text}</p>
            </div>
        </div>
    )
}

function Story(){
    return (
        <div className="property-item flex flex-col gap-[70px]">
            <div className="flex flex-row p-16 rounded-2xl shadow-lg shadow-primary-dark bg-primary-light/20 justify-between">
                <StoryBox title="1,200+" text="Properties Listed" id ={1} />
                <StoryBox title="8,500+" text="Happy Clients" id ={2} />
                <StoryBox title="25+" text="Locations" id ={3} />
                <StoryBox title="7+" text="Years Experience" id ={4} />
            </div>
            <div className="grid lg:grid-cols-[3fr_7fr]">
                <div>
                    <p className="text-xl text-primary">OUR STORY</p>
                    <div className="flex flex-col gap-8 items-start">
                        <p className="text-5xl font-semibold">A better way to<br /> find your place.</p>
                        <span className="flex flex-col gap-3">
                            <p className="text-2xl">HousiF<span className="text-primary">y</span> was founded with a simple idea: real estate <br /> should be about people, not just properties.</p>
                            <p className="text-2xl">From humble beginnings, we've grown into a <br />trusted name in real estate—helping thousands<br /> of people find homes, build wealth, and create lasting memories.</p>
                        </span>
                        <CreateButton name="Learn More About Us →" type={1} />
                    </div>
                </div>
                <div className="w-[80%] h-[400px] rounded-[8px] relative overflow-hidden justify-self-end z-10">
                    <img src="../src/assets/videoplay_img.jpeg" alt="" className="property-image w-full h-full object-cover z-10"/>
                    <PlayCircleIcon className="absolute top-[50%] right-[50%]" sx={{ fontSize: 40}}/>
                    <div className="absolute bottom-9 justify-self-center flex flex-row gap-5 w-[93%] items-center">
                        <CalendarMonthOutlinedIcon className="text-primary bg-primary-dark/20 rouned-2xl" sx={{ fontSize: 30 }}/>
                        <span className="flex flex-col gap-2">
                            <p className="text-3xl font-semibold">Founded in 2025</p>
                            <p className="text-2xl">Building trust. Creating communities. <br />Delivering dreams.</p>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function Team (){
    return (
        <div className="property-item flex flex-col items-center gap-8">
            <p className="text-xl text-primary">MEET OUR TEEM</p>
            <p className="text-5xl font-semibold">The people behind HousiF<span className="text-primary">y</span></p>
            <p className="text-center text-2xl">A passionate team of real estate experts, innovators, and problem-solvers <br />working toegther to help you find your perfect place.</p>
            <div className="grid lg:grid-cols-2 gap-11">
                <div className="relative w-[300px] rounded-2xl h-auto shadow-lg shadow-primary">
                    <img src="../src/assets/user_image.jpeg" alt="" className="property-image rounded-3xl"/>
                    <span className="absolute text-xl flex flex-col bottom-6 left-4">
                        <p className="font-semibold text-2xl">Kudos Ajao</p>
                        <p className="text-primary">CEO & Founder</p>
                    </span>
                    <p className="absolute top-4 right-6 text-3xl font-bold">in</p>
                </div>
                <div className="relative w-[300px] h-auto rounded-2xl shadow-lg shadow-primary">
                    <img src="../src/assets/user_image.jpeg" alt="" className="property-image rounded-3xl"/>
                    <span className="absolute flex text-xl flex-col text-xl bottom-6 left-4">
                        <p className="font-semibold text-2xl">Doumoyo Nimi</p>
                        <p className="text-primary">Co-Founder</p>
                    </span>
                    <p className="absolute top-4 right-6 text-3xl font-bold">in</p>
                </div>
            </div>
        </div>
    )
}

export default function About(){
    return (
        <div className="property-content flex flex-col gap-26">
            <Section />
            <Mission />
            <Story />
            <Team />
        </div>
    )
}