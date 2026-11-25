import { CreateButton } from "../apppage"
import heroBg from "../../assets/hero-bg_1.jpeg";
import heroBg2 from "../../assets/hero_bg_2.webp";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";


gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(SplitText);


function Filters({text, placeholder}:any){
    return (
        <div className="w-full flex flex-col gap-2">
            <p className="text-2xl">{text}</p>
            <div className="flex flex-row gap-1 items-center border border-primary/30 bg-[#7c3aed]/0.1 backdrop-blur-[5px] rounded-[3px]">
                {text == "Location" && <LocationOnIcon className="text-text text-[1px] ml-3"/>}
                <input type="text" className="outline-none  w-full p-[7.5px] text-2xl" placeholder={placeholder}/>
            </div> 
        </div>
    )
}

function SearchBlock(){
    useGSAP(() => {
        gsap.to('.property-item', {
            ease: 'power1.in',
            opacity: 1,
            y: 0,
            stagger: 1.8
        })
    }, [])
    return (
        <div className="property-item opacity-0 flex flex-col gap-11 w-full bg-[#7c3aed1a] backdrop-blur-[5px] rounded-[8px] py-16 px-11 shadow-lg shadow-primary-dark/20">
            <p className="text-2xl font-semibold"><SearchIcon className="size-[5px]" fontSize="large"/>Search Properties</p>
            <div className="flex flex-row gap-4 w-full items-end-safe">
                <div className="flex flex-row gap-6 w-full">
                    <Filters text="Location" placeholder="Enter city or neighborhood" />
                    <Filters text="Property Type" placeholder="Select property type" />
                    <Filters text="Price Range" placeholder="Select price range" />
                    <Filters text="Purpose" placeholder="Select purpose" />
                </div>
                <CreateButton name="Search" type={2} />
            </div>
        </div>
    )
}

function Hero1() {
  const containerRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        const split = SplitText.create(".text-item", {
            type: "chars",
        });

        const tl = gsap.timeline();

        // 1. Character animation
        tl.fromTo(split.chars, {
                opacity: 0,
                y: 10,
                x: 10
            },
            {
                x: 0,
                y: 0,
                opacity: 1,
                duration: 0.6,
                stagger: 0.03,
                ease: "power3.inOut",
        }, "-=0.3")

        // 2. Second text animation
        .to(".text2-item", {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.15,
            ease: "power1.in",
        }, "-=0.3")

        .fromTo(".button-item",
            {
                opacity: 0,
                y: 10,
                x: 10,
            },
            {
                x: 0,
                y: 0,
                opacity: 1,
                duration: 0.6,
                stagger: 0.3,
                ease: "power3.inOut",
            }
            , "-=0.3"
        );

        return () => {
            split.revert();
        };
    }, { scope: containerRef });

  return (
    <div
      ref={containerRef}
      className="property-item flex flex-col gap-8 bg-no-repeat relative z-50"
    >
      <p className="text-item text-8xl font-bold font-outfit">
        Find Your Perfect <br />
        Place to <span className="text-primary">Call Home</span>
      </p>

      <p className="text2-item opacity-0 text-text-secondary text-2xl">
        Discover verified properties for rent or sale.
        <br />
        Modern living. Better decisions. HOUSIFY.
      </p>

      <div className="flex flex-row gap-6">
        <div className="button-item">
            <CreateButton name="Explore Properties" type={2} />
        </div>

        <div className="button-item">
            <CreateButton name="How It Works" type={1} />
        </div>
      </div>
    </div>
  );
}

export default function Hero() {

    return (
        <div className="property-content flex flex-col z-50 gap-[100px]">
            <Hero1 />
            <SearchBlock />
        </div>
    )
}