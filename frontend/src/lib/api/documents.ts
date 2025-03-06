import axios, { AxiosResponse } from 'axios';
import { FileItem } from '../types/documents';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5050';

export interface ProcessedFileResult {
  type: string;
  filename: string;
  size: number;
  processed_at: string;
  // PDF-specific fields
  pages?: number;
  preview?: string;
  metadata?: {
    title?: string;
    author?: string;
    creation_date?: string;
  };
  // Excel/CSV-specific fields
  rows?: number;
  columns?: number;
  column_names?: string[];
  sample_data?: any[];
  // DOCX-specific fields
  paragraph_count?: number;
  table_count?: number;
  // XML-specific fields
  root?: {
    name: string;
    attributes: Record<string, string>;
  };
  element_count?: number;
  children_preview?: Array<{
    tag: string;
    attributes: Record<string, string>;
    text: string | null;
  }>;
}

export async function getFiles(): Promise<FileItem[]> {
  const response = await axios.get(`${API_BASE_URL}/api/files`);
  return response.data;
}

export async function deleteFile(fileId: string): Promise<AxiosResponse> {
  console.log("Trying to delete file with ID:", fileId);
  const token = localStorage.getItem('jwt_token');
  try {
    const response = await axios.delete(`${API_BASE_URL}/api/files/${fileId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    console.log("Delete response:", response.data);
    return response;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}

export async function processFile(file: File): Promise<ProcessedFileResult> {
  console.log("processFile called with:", file.name, file.size, file.type);
  
  const formData = new FormData();
  formData.append('file', file);
  console.log("FormData:", formData);
  // Verify FormData contains the file
  for (const [key, value] of formData.entries()) {
    console.log(`FormData contains: ${key}:`, value);
  }

  console.log(`Sending POST request to: ${API_BASE_URL}/api/upload-file`);
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/upload-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log("Response received:", response.status);
    return response.data;
  } catch (error) {
    console.error("Axios error in processFile:", error);
    
    // Detailed error logging
    if (axios.isAxiosError(error)) {
      console.error("Request details:", {
        method: error.config?.method,
        url: error.config?.url,
        headers: error.config?.headers,
        data: error.config?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data
      });
    }
    
    throw error;
  }
} 