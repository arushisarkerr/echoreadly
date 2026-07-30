/**
 * Object storage helpers (uploads, signed URLs, asset lifecycle).
 */

export {
  buildAudioExportObjectKey,
  createAudioExportSignedUrl,
  isOwnedAudioExportObjectKey,
  removeAudioExportObjects,
  uploadAudioExportObject,
  type AudioExportSignedUrlResult,
  type RemoveAudioExportObjectsResult,
  type UploadAudioExportResult,
} from "./audio-export";
export {
  createPdfSignedUrl,
  PDF_SIGNED_URL_EXPIRES_IN,
  toPdfObjectKey,
  type PdfSignedUrlResult,
} from "./create-signed-url";
export {
  removePdfObject,
  type RemovePdfResult,
} from "./delete-pdf";
export {
  downloadPdfBytes,
  type DownloadPdfResult,
} from "./download-pdf";
export {
  LIBRARY_PAGE_SIZE,
  LIBRARY_PAGE_SIZE_MAX,
  listPdfs,
  listPdfsPage,
  type ListPdfsPageInput,
  type ListPdfsPageResult,
  type ListPdfsResult,
  type ListPdfsSort,
  type StoredPdfObject,
} from "./list-pdfs";
export {
  isOwnedDocumentObjectKey,
  isOwnedPdfObjectKey,
  userPdfFolderPrefix,
} from "./ownership";
export {
  createDocumentObjectKey,
  createPdfObjectKey,
  uploadDocument,
  uploadPdf,
  type PdfUploadError,
  type PdfUploadErrorCode,
  type PdfUploadProgress,
  type PdfUploadResult,
  type PdfUploadStatus,
  type UploadPdfOptions,
} from "./upload-pdf";
