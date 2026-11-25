import { useState, useRef, useMemo, useEffect } from "react";
import { api } from "../interceptors/api";
import { useUserPage } from "../hooks/useUser";

type UploadStatus = "idle" | "uploading" | "success" | "error"

export default function FileUploader(){
    const { currentUser } = useUserPage();
    const [ file, setFile ] = useState<File | null>(null);
    const [ status, setStatus ] = useState<UploadStatus>("idle");
    const [uploadProgress, setUploadProgress] = useState(0);
    

    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>){

        const selectedFile = e.target.files[0]
        if (!selectedFile) return;

        setFile(selectedFile);
        setStatus("idle")
        setUploadProgress(0);
        
    }

    function openFilePicker(){
        fileInputRef.current?.click();
    }

    async function handleFileUpload(){
        if(!file) return;

        const formData = new FormData();
        formData.append("profile_image", file);

        setStatus('uploading');
        setUploadProgress(0);

        try {
            console.log(formData)
            await api.patch(`/user/set_profile`, formData, {onUploadProgress: (progressEvent) => {
                const progress = progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0;
                setUploadProgress(progress)
            }})
            setStatus("success");
            setUploadProgress(100);
        } catch {
            setStatus('error');
            setUploadProgress(0);
        }
    }

    const preview = useMemo(() => {
        return file ? URL.createObjectURL(file) : "";
    }, [file]);

    useEffect(()=> {
        return () => {
            if(preview) URL.revokeObjectURL(preview);
        }
    }, [preview]);
    return(
        <div className="w-full text-white h-full p-4">
            <input ref={fileInputRef} type="file" onChange={handleFileChange} style={{display: "none"}}/>
            <button onClick={openFilePicker} className="p-4 w-[10%] text-2xl font-bold text-gray-400 border border-gray-600  rounded-2xl">
                Choose Image
            </button>
            {file && (
                <div className="grid w-full ">
                    <div className="w-full h-full flex items-center justify-center">
                        <img className="max-w-[500px] max-h-[400px]" src={preview} alt="profile" />
                    </div>
                    <div className="flex w-full justify-end">
                        <button onClick={handleFileUpload} className="p-4 w-[10%] text-2xl font-bold text-white bg-blue-600 rounded-2xl">upload</button>
                    </div>
                    
                </div>
            )}
            {status === "uploading" && (
                <div className="w-full h-7 border rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-600 flex items-center justify-center text-white"
                        style={{ width: `${uploadProgress}%` }}
                    >
                        {uploadProgress}%
                    </div>
                </div>
            )}
        </div>
    );
}