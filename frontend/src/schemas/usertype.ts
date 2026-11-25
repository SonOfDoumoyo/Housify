import type { Listing } from "./listingtype";

export type User = {
    uid: string;
    email: string;
    fullname: string; 
    phone_number: string;
    hashed_password: string | null;
    auth_provider: string;
    role: string;
    profile_image: string;
    verification_photo_url?: string | null;
    is_verified: boolean;
    is_active: boolean;
    whatsapp_link: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    listed: Listing[]
}

export type Agent = {
    uid: string;
    email: string;
    fullname: string; 
    phone_number: string;
    auth_provider: string;
    role: string;
    profile_image: string;
    is_verified: boolean;
    is_active: boolean;
    whatsapp_link: string;
    created_at: string;
}