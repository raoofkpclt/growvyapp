// ─── Types ───────────────────────────────────────────────────────────────────
export interface Client {
  firestoreId?: string;
  id: string;
  name: string;
  description: string;
  profileImage: string;
  portfolioImage: string;
  email: string;
  phone:string;
  status: "active" | "inactive";
  joinedDate: string;
}

export interface Creative {
  id: string;
  clientId: string;
  type: "poster" | "reel" | "website";
  title: string;
  imageUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  uploadedAt: string;
}
