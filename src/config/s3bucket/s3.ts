import { S3Client } from "@aws-sdk/client-s3";

export const bucketName = "growvy-app-new";

export const s3 = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY!,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_KEY!,
  },
});