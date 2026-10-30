export type ToolTab = 'home' | 'image-to-pdf' | 'merge' | 'split' | 'edit' | 'resize';

export interface UploadedImage {
  id: string;
  name: string;
  size: number;
  originalDataUrl: string;
  processedDataUrl: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  brightness: number; // 50 to 150
  contrast: number; // 50 to 150
  grayscale: boolean;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PaperImageElement {
  id: string;
  imageId: string;
  dataUrl: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface PaperTextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  isBold?: boolean;
  isItalic?: boolean;
  backgroundColor?: 'none' | 'white' | 'yellow' | 'stamp';
}

export interface ImageTextOverlay {
  id: string;
  text: string;
  xPercent: number; // 0 to 1 relative to image width
  yPercent: number; // 0 to 1 relative to image height
  fontSize: number;
  color: string;
  isBold: boolean;
  isItalic?: boolean;
  backgroundColor: 'none' | 'white' | 'dark' | 'yellow' | 'stamp';
}

export interface MergePageItem {
  id: string;
  fileId: string;
  fileName: string;
  originalPageIndex: number; // 0-based
  pageNumber: number; // 1-based display
  thumbnailUrl: string;
  rotation: number; // 0, 90, 180, 270
  width: number;
  height: number;
}

export interface PdfFileItem {
  id: string;
  name: string;
  size: number;
  data: Uint8Array;
  numPages: number;
}

export type AnnotationType = 
  | 'text'
  | 'draw'
  | 'highlighter'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'whiteout'
  | 'stamp'
  | 'image'
  | 'checkmark'
  | 'cross';

export interface BaseAnnotation {
  id: string;
  pageIndex: number;
  type: AnnotationType;
  x: number; // relative to canvas or page pts
  y: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  fontSize: number;
  color: string;
  fontFamily: 'Helvetica' | 'Times' | 'Courier';
  isBold?: boolean;
  isItalic?: boolean;
}

export interface DrawAnnotation extends BaseAnnotation {
  type: 'draw' | 'highlighter';
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  opacity: number;
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'rectangle' | 'circle' | 'whiteout';
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface LineAnnotation extends BaseAnnotation {
  type: 'line' | 'arrow';
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
}

export interface StampAnnotation extends BaseAnnotation {
  type: 'stamp' | 'checkmark' | 'cross';
  text: string;
  color: string;
  size: number;
}

export interface ImageAnnotation extends BaseAnnotation {
  type: 'image';
  dataUrl: string;
  width: number;
  height: number;
}

export type Annotation =
  | TextAnnotation
  | DrawAnnotation
  | ShapeAnnotation
  | LineAnnotation
  | StampAnnotation
  | ImageAnnotation;

export interface ResizeOptions {
  pageSize: 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5' | 'Custom';
  customWidthMm?: number;
  customHeightMm?: number;
  orientation: 'auto' | 'portrait' | 'landscape';
  marginPt: number;
  scaleMode: 'fit' | 'fill' | 'none';
  pageRange: 'all' | string;
}
