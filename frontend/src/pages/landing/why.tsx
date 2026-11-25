import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import FavoriteIcon from "@mui/icons-material/Favorite";
import BoltIcon from "@mui/icons-material/Bolt";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";

function WhyBox({title, description, icon}: any) {
    return (
        <div className="flex flex-col w-full text-2xl gap-4 items-start border border-primary/20 bg-[#7c3aed]/0.1 backdrop-blur-[5px] rounded-[8px] py-16 px-11 shadow-lg shadow-primary-dark/20">
            <div className="flex items-center justify-center p-3 bg-primary/20 rounded-[50%] mb-4">
                {icon == 1 && <VerifiedUserIcon className="text-primary" sx={{ fontSize: 36 }}/>}
                {icon == 2 && <FavoriteIcon className="text-primary" sx={{ fontSize: 36 }}/>}
                {icon == 3 && <BoltIcon className="text-primary" sx={{ fontSize: 36 }}/>}
                {icon == 4 && <HeadsetMicIcon className="text-primary" sx={{ fontSize: 36 }}/>}
            </div>
            <p className="text-3xl font-bold">{title}</p>
            <p className="w-[70%]">{description}</p>
        </div>
    )
}

export default function Why() {
    return (
        <div className="property-card flex flex-col items-center gap-[55px] w-full">
            <h1 className="text-6xl font-bold">Why Choose HousiF<span className="text-primary">y</span></h1>
            <div className="flex flex-row gap-6">
                <WhyBox title="Verified Listings" description="All properties are verified for your peace of mind." icon={1} />
                <WhyBox title="Save Favourites" description="Save and compare your favorite properties easily." icon={2} />
                <WhyBox title="Fast & Easy" description="Find your perfect home with our streamlined process." icon={3} />
                <WhyBox title="Dedicated Support" description="Our dedicated team is always here to help you." icon={4} />
            </div>
            
        </div>
    )
}