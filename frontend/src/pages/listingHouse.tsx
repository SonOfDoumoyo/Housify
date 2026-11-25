import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom";
import { api } from "../interceptors/api";
import axios from "axios";
import { useUser } from "../contexts/userContext";
import { useUserPage } from "../hooks/useUser";
import { Check, Video } from "lucide-react";
import { addAddress, getAddresses, type AddressOption } from "../lib/addresses";
import { CURRENCIES, formatMoney } from "../lib/format";
import { missingAgentRequirements } from "../lib/agentReadiness";

interface SelectedVideo {
    id: string;
    file: File;
    preview: string;
    duration: number;
}

const MAX_VIDEO_SECONDS = 30;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function videoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const el = document.createElement("video");
        el.preload = "metadata";
        el.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve(el.duration);
        };
        el.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Could not read video"));
        };
        el.src = url;
    });
}



interface SelectedImage {
    id: string;
    file: File;
    preview: string;
    caption: string;
}

interface Step {
  label: string;
}

const steps: Step[] = [
  { label: "Basic Info" },
  { label: "Location" },
  { label: "Details & Price" },
  { label: "Photos" },
  { label: "Preview & Publish" },
];


function StepIndicator({currentStep} : {currentStep: number}){
    return (
        <div className="w-full px-8 py-8">
            <div className="flex items-center max-w-5xl mx-auto">
                {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === currentStep;
                const isCompleted = stepNumber < currentStep;

                return (
                    <div key={step.label} className="flex items-center flex-1 last:flex-none">
                    {/* Circle + Label */}
                    <div className="flex flex-col items-center flex-shrink-0">
                        <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold
                            transition-all duration-300 ease-out
                            ${
                            isActive
                                ? "bg-blue-500 text-white shadow-[0_0_0_4px_rgba(59,130,246,0.2)]"
                                : isCompleted
                                ? "bg-green-500 text-white"
                                : "bg-[#151a29] text-slate-500 border border-slate-700/60"
                            }`}
                        >
                        {isCompleted ? <Check size={18} strokeWidth={3} /> : stepNumber}
                        </div>
                        <span
                        className={`mt-2.5 text-bs font-medium tracking-wide whitespace-nowrap transition-colors duration-300
                            ${isActive ? "text-blue-400" : isCompleted ? "text-green-500" : "text-slate-500"}
                        `}
                        >
                        {step.label}
                        </span>
                    </div>
                    {/* Connector line */}
                    {index < steps.length - 1 && (
                        <div className={`flex-1 h-[1px] mx-3 rounded-full ${isCompleted ? "bg-green-500" : "bg-slate-700/60"} relative overflow-hidden -mt-6`}>
                        <div
                            className={`absolute inset-y-0 left-0 bg-green-500 transition-all duration-500 ease-out ${
                            stepNumber < currentStep ? "w-full" : "w-0"
                            }`}
                        />
                        </div>
                    )}
                    </div>
                );
                })}
            </div>
        </div>
    )
}

export default function ListHouse(){
    //"list/post_listing"title, description, location, address, price, status, captions for image. 
    //"list/add_listing_images"
    const { fetchUser } = useUser();
    const { currentUser } = useUserPage();
    const [ listData, setListData ] = useState({
        title: "",
        description: "",
        location: "federal_university_of_otuoke",
        address: "",
        price: "",
        currency: "NGN",
        status: "available"
    })

    const initialListData = {
        title: "",
        description: "",
        location: "federal_university_of_otuoke",
        address: "",
        price: "",
        currency: "NGN",
        status: "available"
    }

    const [ error, setError ] = useState("")

    // Agents must have contact details in Settings before they can
    // use the listing flow (the backend enforces the same gate when
    // publishing).
    const missingRequirements = missingAgentRequirements(currentUser);
    const gated = missingRequirements.length > 0;

    const [images, setImages] = useState<SelectedImage[]>([]);
    const imagesRef = useRef<SelectedImage[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Short video tour — max 30 seconds per clip, max 50 MB each.
    const [videos, setVideos] = useState<SelectedVideo[]>([]);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const [videoError, setVideoError] = useState("");

    // Areas come from the backend list; agents can add a new one with "Other".
    const [addresses, setAddresses] = useState<AddressOption[]>([]);
    const [newAddress, setNewAddress] = useState("");
    const [addingAddress, setAddingAddress] = useState(false);
    const [showNewAddressInput, setShowNewAddressInput] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const rows = await getAddresses();
            if (!cancelled) {
                setAddresses(rows);
                if (rows.length > 0) {
                    setClicked2Type(rows[0].name);
                    setListData((prev) => ({ ...prev, location: rows[0].name }));
                }
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const addVideos = async (files: FileList | File[]) => {
        const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
        const accepted: SelectedVideo[] = [];
        for (const file of Array.from(files)) {
            if (!allowedTypes.includes(file.type)) {
                setVideoError(`"${file.name}" is not a supported video (MP4, WebM or MOV).`);
                continue;
            }
            if (file.size > MAX_VIDEO_BYTES) {
                setVideoError(`"${file.name}" is over the 50 MB limit.`);
                continue;
            }
            let duration = 0;
            try {
                duration = await videoDuration(file);
            } catch {
                setVideoError(`Could not read "${file.name}". Try another file.`);
                continue;
            }
            if (!Number.isFinite(duration) || duration > MAX_VIDEO_SECONDS) {
                setVideoError(`"${file.name}" is ${Math.round(duration)}s — videos must be 30 seconds or shorter.`);
                continue;
            }
            accepted.push({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), duration });
        }
        if (accepted.length) {
            setVideoError("");
            setVideos((current) => [...current, ...accepted]);
        }
    };

    const removeVideo = (id: string) => {
        setVideos((current) => {
            const toRemove = current.find((v) => v.id === id);
            if (toRemove) URL.revokeObjectURL(toRemove.preview);
            return current.filter((v) => v.id !== id);
        });
    };

    useEffect(() => {
        imagesRef.current = images;
    }, [images]);

    useEffect(() => {
        return () => {
            imagesRef.current.forEach((image) => {
                URL.revokeObjectURL(image.preview);
            })
        }
    }, [])

    const addFiles = (files: FileList | File[]) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        const newImages = Array.from(files).filter((file) => {
            const validType = allowedTypes.includes(file.type);
            const validSize = file.size <= 10 * 1024 * 1024;

            return validType && validSize;

        }).map((file) => ({
            id: crypto.randomUUID(),
            file,
            preview: URL.createObjectURL(file),
            caption: ""
        }))

        setImages((current) => [
            ...current,
            ...newImages,
        ]);
    };

    const removeImage = (id: string) => {
        setImages((current) => {
            const imageToRemove = current.find(
                (image) => image.id === id
            );

            if (imageToRemove){
                URL.revokeObjectURL(imageToRemove.preview)
            }

            return current.filter(
                (image) => image.id !== id
            );
        })
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();

        if (e.dataTransfer.files.length){
            addFiles(e.dataTransfer.files);
        }
    };
    const [listed, setListed] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const handleSubmit = async () => {
        // One atomic publish: fields + photos + videos go in a single
        // request. If anything fails, the server stores nothing, so a
        // failed publish never leaves a half-saved listing behind.
        const formData = new FormData();
        formData.append("title", listData.title);
        formData.append("description", listData.description);
        formData.append("location", listData.location);
        formData.append("address", listData.address);
        formData.append("price", listData.price);
        formData.append("currency", listData.currency);
        formData.append("status", listData.status);
        images.forEach((image) => {
            formData.append("images", image.file);
            formData.append("captions", image.caption.trim());
        });
        videos.forEach((video) => {
            formData.append("videos", video.file);
        });
        setPublishing(true);
        setError("");
        try {
            const res = await api.post("/list/publish", formData);
            if (res.status === 200) {
                setListed(true);
            }
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const detail = err.response?.data?.detail;
                setError(
                    (typeof detail === "object" && detail?.message) ||
                    (typeof detail === "string" ? detail : "") ||
                    "Failed to publish listing. Nothing was saved — try again."
                );
            } else {
                setError("Server Not Reachable");
            }
        } finally {
            setPublishing(false);
        }
    }

    const[ showList, setShowList ] = useState(false);
    const[ show2List, setShow2List ] = useState(false);
    const[ show3List, setShow3List ] = useState(false);
    const [ clickedType, setClickedType ] = useState("Apartment");
    const [ clicked2Type, setClicked2Type ] = useState("");
    const [ clicked3Type, setClicked3Type ] = useState("");

    /** "Other" → type a new area; it is saved and appended to the list. */
    const saveNewAddress = async () => {
        const name = newAddress.trim();
        if (!name) return;
        setAddingAddress(true);
        try {
            const saved = await addAddress(name);
            setAddresses((rows) => {
                if (rows.some((r) => r.name.toLowerCase() === saved.name.toLowerCase())) return rows;
                return [...rows, saved];
            });
            setClicked2Type(saved.name);
            setListData((prev) => ({ ...prev, location: saved.name }));
            setNewAddress("");
            setShow2List(false);
        } catch {
            setError("Could not add that address. Check your connection and try again.");
        } finally {
            setAddingAddress(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault()
        const {name, value} = e.target;

        setListData((prev) => ({
            ...prev,
            [name] : value
        }))
    }

    const navigate = useNavigate();
    const [ currentStep, setCurrentStep ] = useState(1);
    
    const hasMissingCaption = images.some(
        (image) => !image.caption.trim()
    );


    const handleContinue = () => {
        if (currentStep == 1){
            if(listData.title == "" || listData.description == ""){
                return false;
            }if(listData.description.length < 20){
                return false;
            }
            else{
                setCurrentStep(2);
                return true;
            }
        }else if (currentStep == 2){
            if(listData.address == ""){
                return false;
            }else{
                setCurrentStep(3);
                return true;
            }
        }else if (currentStep == 3){
            if(listData.price == ""){
                return false;
            }else{
                setCurrentStep(4);
                return true;
            }
        }else if (currentStep == 4){
            if (hasMissingCaption) {
                setError("Please add a caption for every image.");
                return false;
            }else if (images.length === 0) {
                setError("Please upload at least one image.");
                return;
            }else{
                setCurrentStep(5);
                return true;
            }
        }
    }

    const resetPage = () => {
        // setListed(false);
        // setCurrentStep(1);
        // setListData(initialListData);
        window.location.href = "/listing";
    }

    // Agents must update their contact details in Settings before
    // they can use the listing flow.
    if (!listed && gated) {
        return (
            <div className="w-full relative flex flex-col items-center px-6 py-16">
                <div className="max-w-xl w-full rounded-2xl border border-amber-300 bg-amber-50 p-8 text-center">
                    <h1 className="text-3xl font-black text-gray-900">Update your details first</h1>
                    <p className="text-xl text-gray-600 mt-4">
                        Before you can publish a listing, update your
                        contact details (phone number) in Settings, so
                        customers can reach you about your homes.
                    </p>
                    <button
                        type="button"
                        className="mt-6 px-8 py-4 text-2xl font-bold text-white bg-blue-600 rounded-2xl"
                        onClick={() => navigate("/settings")}
                    >
                        Go to Settings
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full relative flex flex-col">
        {listed && (
            <div className="flex flex-col justify-center align-middle items-center w-full gap-11 py-36">
                <div>
                    <div className="p-6 border border-green-600 bg-green/10 rounded-full self-start"><i className="bx bx-check-circle text-[10em] text-green-600"/></div>
                </div>
                
                <h1 className="text-7xl font-black text-white">Listing Published!</h1>
                <p className="text-3xl text-gray-400 items-center lg:w-[30%] sm:w-[50%] text-center">Your listing "{listData.title}" is now live and visible to thousands of students looking for housing near their campus.</p>
                <div className="flex flex-row gap-6 lg:w-[50%]">
                    <button className="bg-blue-500 text-3xl font-bold text-white p-6 w-[50%] rounded-2xl" onClick={() => navigate("/listings")}>View All Listings</button>
                    <button className="bg-gray-950/10 border border-gray-700 text-3xl font-bold text-white p-6 w-full rounded-2xl" onClick={resetPage}>Post Another</button>
                </div>
            </div>
        )}
        {listed == false && (<div className="flex flex-col w-full h-screen z-30">
            <div className="px-28 py-8 border-b border-b-gray-700 flex flex-row justify-between items-center bg-white/10">
                <button className="text-2xl font-bold border border-orange-600/40 text-orange-600/40 rounded-xl p-4" onClick={() => navigate("/dashboard")}><i className="bx bx-chevron-left text-orange-600"/>Dashboard</button>
                <h1 className="text-center text-3xl font-black text-gray-100">Publish Listing</h1>
            </div>
            <div>
                <StepIndicator currentStep={currentStep}/>
            </div>
            <div className="px-28 py-8">
                {currentStep === 1 && (<div className="grid lg:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-9">
                        <div className="flex flex-col gap-3">
                            <h1 className="text-gray-500 text-3xl">PROPERTY TITLE *</h1>
                            <input className="text-2xl font-semibold text-gray-50 p-6 w-full outline-none bg-gray-950/20 border border-gray-500/10 rounded-2xl" type="text" value={listData.title} name="title" onChange={handleChange}/>
                        </div>
                        <div className="w-full flex flex-col gap-3">
                            <h1 className="text-gray-500 text-3xl w-[35%]">AVAILABILITY STATUS*</h1>
                            <div className="w-full flex flex-row flex-wrap gap-4">
                                {[
                                  { value: "available", label: "Available" },
                                  { value: "taken", label: "Taken" },
                                  { value: "paid_for", label: "Paid For" },
                                  { value: "rented_out", label: "Rented Out" },
                                  { value: "coming_soon", label: "Coming Soon" },
                                ].map((s) => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        className={`${listData.status == s.value ? "text-green-500 border border-green-500 bg-green-500/10" : "text-gray-500 border border-gray-500 "} p-4 text-2xl border rounded-2xl flex-1 whitespace-nowrap`}
                                        onClick={() => setListData((prev) => ({ ...prev, status: s.value }))}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <h1 className="text-gray-500 text-3xl">DESCRIPTION*</h1>
                        <textarea className="outline-none w-full p-4 text-2xl rounded-2xl h-[320px] bg-gray-950/20 text-gray-50" name="description" minLength={20} maxLength={1000} value={listData.description} onChange={(e) => setListData({...listData, description: e.target.value})}></textarea>
                        <div className="flex flex-row justify-between text-xl mt-4 text-gray-500"><p>Min. 20 characters</p><p>{listData.description.length}/1000</p></div>
                    </div>
                </div>)}
                {currentStep === 2 && (<div className="grid lg:grid-cols-2 gap-10">
                    <div className="flex flex-col gap-8 w-full">
                        <div className="flex flex-col">
                            <h1 className="text-gray-500 text-3xl">Place:</h1>
                            <div className="flex flex-col items-start  lg:w-[100%] sm:w-full text-3xl text-gray-500 font-semibold bg-gray-800/20 border border-gray-800 rounded-xl shadow-inner">
                                {!show2List && (<div onClick={() => setShow2List(true)} className="p-5">{clicked2Type || "Choose an area…"}</div>)}
                                {show2List && (<ul className="flex flex-col w-full h-[150px] overflow-auto">
                                    {addresses.map((area) => (
                                        <li key={String(area.id)} onClick={() => {setClicked2Type(area.name); setShow2List(false); setShowNewAddressInput(false); setListData((prev) => ({ ...prev, location: area.name}))}} className="border-b w-full border-blue-200/10 p-5">{area.name}</li>
                                    ))}
                                    <li onClick={() => {setShow2List(false); setShowNewAddressInput(true);}} className="border-b w-full border-blue-200/10 p-5 text-blue-400">+ Other — add a new area…</li>
                                </ul>)}
                            </div>
                            {showNewAddressInput && (
                                <div className="flex flex-row gap-3 mt-3">
                                    <input
                                        className="text-2xl font-semibold text-gray-50 p-5 outline-none bg-gray-950/20 border border-gray-500/10 rounded-2xl flex-1 min-w-0"
                                        type="text"
                                        placeholder="Type the new area…"
                                        value={newAddress}
                                        onChange={(e) => setNewAddress(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void saveNewAddress(); } }}
                                    />
                                    <button type="button" className="text-2xl font-bold text-white bg-blue-600 px-6 rounded-2xl" disabled={addingAddress || !newAddress.trim()} onClick={() => void saveNewAddress()}>
                                        {addingAddress ? "Adding…" : "Add"}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="w-full">
                            <h1 className="text-gray-500 text-3xl">Address:</h1>
                            <div className="relative flex flex-row w-full"><i className="bx bx-map absolute top-[50%] -translate-y-[50%] text-4xl text-gray-500 left-6"/><input className="text-2xl font-semibold text-gray-50 p-6 pl-20 outline-none bg-gray-950/20 border border-gray-500/10 rounded-2xl w-full" type="text" value={listData.address} name="address" onChange={handleChange}/></div>
                        </div>
                    </div>
                    <div className="border-2 border-dashed border-blue-600/30 bg-blue-600/5 p-8 h-[350px] items-center justify-center flex flex-col rounded-2xl opacity-65">
                        <i className="bx bx-map text-4xl text-gray-500 left-6"/>
                        <p className="text-xl text-gray-500">Map preview coming soon</p>
                        <p className="text-lg text-gray-500 opacity-20">Your pin will appear here</p>
                    </div>
                </div>
                )}
                {currentStep == 3 && (
                <div>
                    <div className="flex flex-col gap-6 items-start">
                        <h1 className="text-gray-500 text-3xl w-[35%]">ANNUAL RENT *</h1>
                        <div className="flex flex-row gap-4 w-full lg:w-[50%]">
                            <input className="text-2xl font-semibold text-gray-50 p-6 outline-none bg-gray-950/20 border border-gray-500/10 rounded-2xl flex-1 min-w-0" type="text" value={listData.price} name="price" onChange={handleChange} />
                            <select
                                className="text-2xl font-semibold text-gray-50 p-6 outline-none bg-gray-950/20 border border-gray-500/10 rounded-2xl"
                                value={listData.currency}
                                aria-label="Currency"
                                onChange={(e) => setListData((prev) => ({ ...prev, currency: e.target.value }))}
                            >
                                {CURRENCIES.map((c) => (
                                    <option key={c.code} value={c.code}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                        <p className="text-xl text-gray-400">Housify works anywhere — pick the currency your rent is priced in.</p>
                    </div>
                </div>
                )}
                {currentStep == 4 && (
                    <div className="flex flex-col gap-6">
                    <div className="w-full">
                       {/* hidden file input */}
                       <input 
                        ref={inputRef}
                        type="file" 
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        hidden
                        onChange={(e) => {
                            if (e.target.files){
                                addFiles(e.target.files)
                                //allows selecting the same file again later
                                e.target.value = "";
                            }
                        }}
                       />
                       {/* upload zone */}
                       <div
                            onClick={() => inputRef.current.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            className="
                                min-h-52
                                border-2
                                border-dashed
                                border-blue-600
                                bg-blue-500/5
                                rounded-2xl
                                flex
                                flex-col
                                gap-2
                                items-center
                                justify-center
                            "
                       >
                            <i className="bx bx-cloud-upload text-5xl text-blue-600"/>
                            <p className="text-3xl text-white/80 font-bold">Click or drag images here</p>
                            <span className="text-xl text-gray-400">JPEG, PNG or WebP - max 10mb</span>
                       </div>

                       {/* images preview */}
                       <div className="grid grid-cols-2 md:grid-cols-3 sm:grid-cols-3 gap-4 mt-6">
                        {images.map((image, index) => (
                            <div key={image.id} className="relative rounded-2xl bg-gray-400/10">
                                {index == 0 && (
                                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-3 py-1 rounded-full">Cover</span>
                                )}
                                <img src={image.preview} alt={`Property ${index + 1}`} className="w-full h-auto aspect-[5/3] object-cover rounded-t-2xl"/>
                                <div className="flex justify-center lg:p-4 lg:px-5 sm:px-3 sm:p-3">
                                    <input className="w-full outline-none lg:text-2xl lg:p-5  sm:px-3 sm:p-2  sm:text-xl sm:rounded-2xl rounded-3xl font-bold bg-gray-300/5 text-gray-50 border border-gray-500" type="text" placeholder="Add a caption..." value={image.caption} onChange={(e) => {
                                    setImages((current) => 
                                        current.map((img) =>
                                            img.id === image.id 
                                            ? {
                                                ...img,
                                                caption: e.target.value,
                                            }
                                            : img
                                        )
                                    )
                                     }}/>
                                </div>
                                
                                <button type="button" onClick={() => removeImage(image.id)} className="absolute top-2 right-2 w-[3em] h-[3em] rounded-xl bg-orange-600 text-white"><i className="bx bx-x text-4xl" /></button>
                            </div>
                        ))}
                       </div>

                       {/* video tour — short clips, max 30 seconds each */}
                       <h2 className="text-3xl font-bold text-white mt-10 mb-4 flex items-center gap-3">
                           <Video size={26} className="text-blue-500" /> Video tour <span className="text-xl font-normal text-gray-400">(optional, max 30 sec per clip)</span>
                       </h2>
                       <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        multiple
                        hidden
                        onChange={(e) => {
                            if (e.target.files){
                                void addVideos(e.target.files);
                                e.target.value = "";
                            }
                        }}
                       />
                       <div
                            onClick={() => videoInputRef.current?.click()}
                            className="min-h-40 border-2 border-dashed border-blue-600 bg-blue-500/5 rounded-2xl flex flex-col gap-2 items-center justify-center cursor-pointer"
                       >
                            <i className="bx bx-video text-5xl text-blue-600"/>
                            <p className="text-3xl text-white/80 font-bold">Click to add a video tour</p>
                            <span className="text-xl text-gray-400">MP4, WebM or MOV — max 30 seconds, max 50 MB</span>
                       </div>
                       {videoError && <p className="text-xl text-red-400 font-semibold mt-3">{videoError}</p>}
                       {videos.length > 0 && (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                            {videos.map((video) => (
                                <div key={video.id} className="relative rounded-2xl bg-gray-400/10 overflow-hidden">
                                    <video src={video.preview} controls playsInline preload="metadata" className="w-full aspect-video object-cover" />
                                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-3 py-1 rounded-full">
                                        {Math.round(video.duration)}s
                                    </span>
                                    <button type="button" onClick={() => removeVideo(video.id)} className="absolute top-2 right-2 w-[3em] h-[3em] rounded-xl bg-orange-600 text-white"><i className="bx bx-x text-4xl" /></button>
                                </div>
                            ))}
                           </div>
                       )}
                    </div>
                </div>
                )}
                {currentStep == 5 && (
                    <div className="grid lg:grid-cols-2 sm:grid-cols-1 gap-24">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-white text-3xl font-black">Listing Summary</h1>
                            <div className="flex flex-col gap-11">
                                <p className="text-gray-400/80 opacity-65 text-2xl">Review all details before publishing to Housify.</p>
                                <div>
                                    <div className="flex flex-row justify-between text-2xl text-gray-400/80"><h1>Title</h1><div className="flex flex-row gap-2 items-center justify-center align-middle text-center"><h1 className="text-white font-semibold">{listData.title}</h1><i className="bx bx-check-circle text-[19px] text-green-600"/></div></div>
                                    <div className="flex-1 bg-gray-800/50 h-px my-6"/>
                                    <div className="flex flex-row justify-between text-2xl text-gray-400/80"><h1>Status</h1><div className="flex flex-row gap-2 items-center justify-center align-middle text-center"><h1 className="text-white font-semibold">{listData.status}</h1><i className="bx bx-check-circle text-[19px] text-green-600"/></div></div>
                                    <div className="flex-1 bg-gray-800/50 h-px my-6"/>
                                    <div className="flex flex-row justify-between text-2xl text-gray-400/80"><h1>Address</h1><div className="flex flex-row gap-2 items-center justify-center align-middle text-center"><h1 className="text-white font-semibold">{listData.address}</h1><i className="bx bx-check-circle text-[19px] text-green-600"/></div></div>
                                    <div className="flex-1 bg-gray-800/50 h-px my-6"/>
                                    <div className="flex flex-row justify-between text-2xl text-gray-400/80"><h1>Location</h1><div className="flex flex-row gap-2 items-center justify-center align-middle text-center"><h1 className="text-white font-semibold">{listData.location}</h1><i className="bx bx-check-circle text-[19px] text-green-600"/></div></div>
                                    <div className="flex-1 bg-gray-800/50 h-px my-6"/>
                                    <div className="flex flex-row justify-between text-2xl text-gray-400/80"><h1>Annual Rent</h1><div className="flex flex-row gap-2 items-center justify-center align-middle text-center"><h1 className="text-white font-semibold">{formatMoney(listData.price, listData.currency)}</h1><i className="bx bx-check-circle text-[19px] text-green-600" /></div></div>
                                    <div className="flex-1 bg-gray-800/50 h-px my-6"/>
                                    <div className="flex flex-row justify-between text-2xl text-gray-400/80"><h1>Photos</h1><div className="flex flex-row gap-2 items-center justify-center align-middle text-center"><h1 className="text-white font-semibold">{images.length} uploaded</h1><i className="bx bx-check-circle text-[19px] text-green-600"/></div></div>
                                    <div className="flex-1 bg-gray-800/50 h-px my-6"/>
                                    <div className="flex flex-row justify-between text-2xl text-gray-400/80"><h1>Video tour</h1><div className="flex flex-row gap-2 items-center justify-center align-middle text-center"><h1 className="text-white font-semibold">{videos.length} clip{videos.length === 1 ? "" : "s"}</h1><i className="bx bx-check-circle text-[19px] text-green-600"/></div></div>
                                </div>
                                {error && <p className="text-xl text-red-400 font-semibold text-center">{error}</p>}
                                <div className="flex w-full items-center justify-center"><button className="p-6 sm:w-full text-2xl font-bold text-white bg-green-600 my-6 rounded-2xl w-[70%]" type="button" onClick={() => void handleSubmit()} disabled={!images.length || publishing}><i className="bx bx-send -rotate-45 text-3xl" />{publishing ? "Publishing…" : "Publish Listing"}</button></div>
                            </div>
                        </div>
                        <div>     
                            <div className="grid gap-4 mt-6 border border-blue-600 rounded-3xl">
                                <div className="flex flex-col relative w-full">
                                    <h1 className="text-xl text-blue-600 p-7 font-bold">LIVE PREVIEW</h1>
                                    <div className="inline-flex items-center gap-2 bg-green-400 backdrop-blur-md px-5 py-2 rounded-full text-xl text-white font-bold absolute left-6 top-[9%]">
                                        <span className="w-3 h-3 bg-green-200 rounded-full animate-pulse"></span>
                                        AVAILABLE NOW
                                    </div>
                                    <img src={images[0]?.preview} alt="Property Cover" className="w-full h-[70%] object-cover"/>
                                    <div className="absolute flex flex-row justify-between top-[71%] w-full px-6"><h1 className="text-white font-black text-4xl">{formatMoney(listData.price, listData.currency)}<span className="text-xl text-gray-300">/yr</span></h1><h1 className="text-2xl bg-black/50 p-2 rounded-xl font-semibold">{images.length} photo(s)</h1></div>
                                    <div className="p-11">
                                        <h1 className="text-4xl font-black text-white">{listData.title}</h1>
                                        <p className="text-2xl text-gray-600 flex flex-row"><i className="bx bx-map text-4xl text-blue-500"></i>{listData.address}</p>
                                        <div className="flex-1 bg-gray-800/70 h-px my-6"/>
                                        <h1 className="text-2xl text-gray-400">{listData.description}</h1>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex-1 bg-gray-800 h-px my-6"/>
                <div className="flex flex-row w-full justify-between">
                    <button className={`${currentStep == 1 ? "bg-gray-500/10 opacity-20" : "bg-transparent"} p-4 w-[10%] text-2xl font-bold border border-gray-500 text-gray-500 rounded-2xl`} onClick={() => setCurrentStep((prev) => prev - 1)} disabled={currentStep == 1 ? true : false}>Back</button>
                    <button className={`p-4 w-[10%] text-2xl ${currentStep == 5 ? "opacity-20" : ""} font-bold text-white bg-blue-600  rounded-2xl`} onClick={handleContinue}>Continue</button>
                </div>
            </div>
        </div>)}
    </div>
    )
}