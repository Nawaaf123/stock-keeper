export interface BillOfLading {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: Date;
  notes?: string;
  fileUrl: string;
}
