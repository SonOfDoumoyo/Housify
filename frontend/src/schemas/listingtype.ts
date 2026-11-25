import type { Images } from "./imagestype";

export type ListingVideo = {
    video_id: string;
    video_url: string;
    duration_seconds?: number | null;
};

export type Listing = {
    listing_id: string;
    title: string;
    description: string;
    location: string;
    address: string;
    walk_time?: number | null;
    drive_time?: number | null;
    price: number;
    currency?: string | null;
    status: string;
    agent_id: string;
    uploaded_at: string;
    status_updated_at?: string | null;
    images: Images[];
    videos?: ListingVideo[];
    views_count?: number;
    contact_count?: number;
}
