// service/billStorage.ts
import { Upload } from "@aws-sdk/lib-storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"; // npm i @aws-sdk/s3-request-presigner
import { s3, bucketName } from "../config/s3bucket/s3";
import type { Bill } from "../utils/types/Types";

const REGION = "ap-south-1";

/** Uploads a bill PDF to s3://<bucket>/bills/<year>/<timestamp>-<name>.pdf */
export const uploadBillPdf = async (blob: Blob, fileName: string) => {
  const safe = fileName.replace(/[^\w.\-]+/g, "_");
  const key = `bills/${new Date().getFullYear()}/${Date.now()}-${safe}`;

  await new Upload({
    client: s3,
    params: {
      Bucket: bucketName,
      Key: key,
      Body: blob,
      ContentType: "application/pdf",
      ContentDisposition: `inline; filename="${safe}"`,
    },
  }).done();

  return {
    key,
    url: `https://${bucketName}.s3.${REGION}.amazonaws.com/${key}`,
  };
};

/** Temporary link for PRIVATE buckets (use this instead of pdfUrl). */
export const getBillPdfUrl = (key: string, expiresIn = 3600) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: bucketName, Key: key }), {
    expiresIn,
  });

/** Downloads the saved PDF of a bill from S3 as a Blob (private or public bucket). */
export const fetchBillPdfBlob = async (bill: Bill): Promise<Blob> => {
  const url = bill.pdfKey ? await getBillPdfUrl(bill.pdfKey) : bill.pdfUrl;
  if (!url) throw new Error("This bill has no saved PDF.");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load PDF (${res.status}).`);
  return res.blob();
};
