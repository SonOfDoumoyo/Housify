import LocationOnIcon from "@mui/icons-material/LocationOn";
import BedIcon from "@mui/icons-material/Bed";
import BathtubIcon from "@mui/icons-material/Bathtub";
import { CreateButton } from "../apppage";

function Houses({name, loc, price, bedrooms, bathrooms, src, offer}: any) {
    return (
        <div className="flex flex-col h-[480px] gap-4 border border-primary/20 bg-[#7c3aed]/0.1 backdrop-blur-[5px] rounded-[8px] shadow-md shadow-primary-dark/20">
            <div className="w-full h-full rounded-t-[8px] overflow-hidden relative">
                <img src={src} alt="" className="w-full h-full transition-transform duration-500 hover:scale-103 object-cover"/>
                <span className="absolute top-6 justify-self-center flex flex-row justify-between w-[93%] items-center">{!offer && <p className="bg-primary text-white p-2 text-2xl font-semibold rounded-xl">For Sale</p>}{offer && <p className="bg-primary text-white p-2 text-2xl font-semibold rounded-xl">For Rent</p>}<i className="bx bx-heart text-white text-5xl"/></span>
            </div>
            <div className="h-[50%] p-8 justify-between flex flex-col">
                <div className="flex flex-col gap-4">
                    <p className="text-3xl font-semibold">{name}</p>
                    <p className="text-text-secondary text-xl"><LocationOnIcon /> {loc}</p>
                    <p className="text-primary text-3xl font-semibold">&#8358;{price}</p>
                </div>
                <div className="flex flex-row gap-4 border-t border-primary/20 pt-4 justify-between">
                    <p className="text-text-secondary text-xl text-center"><BedIcon /> Beds: {bedrooms}</p>
                    <p className="text-text-secondary text-xl text-center"><BathtubIcon /> Baths: {bathrooms}</p>
                </div>
            </div>
        </div>
    )
}

export default function FeaturedProperties() {
    return (
        <div className="property-card flex flex-col gap-12">
            <div className="flex flex-row justify-between">
                <p className="text-5xl font-semibold">Featured Properties</p>
                <p className="text-primary text-2xl">View All Properties →</p>
            </div>
            <div className="grid lg:grid-cols-4 gap-6">
                <Houses name="Modern 2 Bedroom Apartment" loc="Lekki, Lagos" price={`${(350000).toLocaleString()} / year`} bedrooms={2} bathrooms={2} src="../src/assets/apartment_1.jpeg" offer={true} />
                <Houses name="Luxury 4 Bedroom Duplex" loc="Ikoyi, Lagos" price={`${(120000000).toLocaleString()}`} bedrooms={4} bathrooms={5} src="../src/assets/apartment_2.jpeg" offer={false} />
                <Houses name="Modern Apartment" loc="Asokoro, Abuja" price={`${(350000).toLocaleString()} / year`} bedrooms={2} bathrooms={2} src="../src/assets/apartment_3.jpeg" offer={true} />
                <Houses name="Contemporary 5 Bedroom House" loc="Yaba, Lagos" price={`${(150000000).toLocaleString()}`} bedrooms={5} bathrooms={6} src="../src/assets/apartment_4.jpeg" offer={false} />
            </div>
            <div className="flex flex-row items-center justify-between px-22 py-4 gap-8 bg-primary-dark/20 shadow-md shadow-primary-dark/70 backdrop-blur-[5px] rounded-[8px]">
                <div className="flex flex-row gap-7 items-center">
                    <img src="../src/assets/housify_logo.png" alt="" className="w-[135px]"/>
                    <div className="flex flex-col gap-3">
                        <p className="text-5xl">Ready to find your dream home?</p>
                        <p className="text-2xl">Join thousands of happy homeoweners and renters <br />who found their perfect match on HousiF<span className="text-primary"></span>y</p>
                    </div>
                </div>
                <CreateButton name="Get Started →" type={2} />
            </div>
        </div>
    )
}