export interface Asset {
  id: string;
  asset_uid?: string; // 12-digit unique asset ID (server-generated)
  name: string;
  category: string;
  serialNumber: string;
  department: string;
  location: string;
  purchaseDate: string;
  warrantyExpiry: string;
  amcExpiry: string;
  hasAmc?: boolean; // derived from import or manual
  status: 'Active' | 'Deployed' | 'Under Repair' | 'Disposed';
  acknowledgmentStatus?: string;
  verificationStatus?: string;
  verifiedAt?: string;
  value: number;
  supplier: string;
  gem_contract_number?: string;
  qrCode: string;
  lastMovement?: string;
  // Procurement tracking fields
  purchaseOrderId?: string;
  procurementStatus?: ProcurementStatus;
  deliveryStatus?: DeliveryStatus;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  invoiceNumber?: string;
  paymentStatus?: PaymentStatus;
  procurementNotes?: string;
  // Buyer and End User information
  buyerId?: string;
  buyerName?: string;
  buyerDepartment?: string;
  endUserId?: string;
  endUserName?: string;
  endUserDesignation?: string;
  endUserEmail?: string;
  allocationDate?: string;
  /** CamelCase mirrors from API / processAssets */
  assetUid?: string;
  sellerOrderId?: string | number;
  gemContractNumber?: string;
  verificationMetadata?: Record<string, unknown> | null;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  title: string;
  description: string;
  department: string;
  requestedBy: string;
  requestedDate: string;
  approvedBy?: string;
  /** DB-only mirror for mapped seller orders (superadmin approval). */
  approved_by?: string;
  approvedDate?: string;
  supplier: string;
  supplierContact: string;
  totalAmount: number;
  currency: string;
  status: PurchaseOrderStatus;
  expectedDeliveryDate: string;
  items: PurchaseOrderItem[];
  notes?: string;
  attachments?: string[];
  createdAt: string;
  sellerOrderId?: string; // Reference to the original seller order
  updatedAt: string;
  // Buyer mapping fields (for seller orders)
  buyerId?: string;
  buyerName?: string;
  mappedAt?: string;
  isMappedToBuyer?: boolean;
  assigneeId?: string;
  assigneeName?: string;
  // GeM Contract fields
  gemContractNumber?: string;
  gemOrderCategory?: string;
  gemBuyerDepartment?: string;
  expectedDeliveryStartDate?: string;
  expectedDeliveryEndDate?: string;
  oemAuthorizationLetterPath?: string;
  gemOrderFilePath?: string;
  workOrderFilePath?: string;
  purchaseOrderFilePath?: string;
  deliveryInformation?: {
    batches?: Array<{
      batchNumber?: string;
      custodianName?: string;
      inventoryManagerName?: string;
      contactNumber?: string;
      location?: string;
      productName?: string;
      quantity?: number;
      status?: string;
      deliveredAt?: string;
    }>;
    buyerConfirmed?: boolean;
    buyerConfirmedAt?: string;
  };
}

export interface PurchaseOrderItem {
  id: string;
  assetName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: string;
  category: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  deliveryStatus: DeliveryStatus;
  assetId?: string; // Linked asset ID once delivered
}

/** Uniform workflow (buyer POs and mapped seller orders). */
export type PurchaseOrderStatus =
  | 'Pending Approval'
  | 'Pending'
  | 'Approved'
  | 'In Progress'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected';

export type ProcurementStatus = 
  | 'Not Started'
  | 'Requirement Identified'
  | 'Vendor Selection'
  | 'Quote Requested'
  | 'Quote Received'
  | 'Negotiation'
  | 'Purchase Order Created'
  | 'Order Confirmed'
  | 'In Production'
  | 'Ready for Delivery'
  | 'In Transit'
  | 'Delivered'
  | 'Asset Registered'
  | 'Completed';

export type DeliveryStatus = 
  | 'Not Started'
  | 'Scheduled'
  | 'In Production'
  | 'In Transit'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Received'
  | 'Inspected'
  | 'Accepted'
  | 'Rejected'
  | 'Returned';

export type PaymentStatus = 
  | 'Pending'
  | 'Partial'
  | 'Paid'
  | 'Overdue'
  | 'Disputed';

export interface Complaint {
  id: string;
  assetId: string;
  assetName: string;
  department: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  reportedBy: string;
  reportedDate: string;
  assignedTo?: string;
  resolution?: string;
}

export interface Department {
  id: string;
  name: string;
  head: string;
  totalAssets: number;
  activeAssets: number;
  underWarranty: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Department Officer' | 'End User';
  department: string;
}

export interface Alert {
  id: string;
  type: 'warranty' | 'amc' | 'maintenance';
  message: string;
  severity: 'info' | 'warning' | 'error';
  date: string;
  assetId: string;
}

// Procurement tracking interfaces
export interface ProcurementTimeline {
  id: string;
  purchaseOrderId: string;
  status: PurchaseOrderStatus;
  timestamp: string;
  updatedBy: string;
  notes?: string;
  attachments?: string[];
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  gstNumber?: string;
  panNumber?: string;
  rating: number;
  category: string[];
  status: 'Active' | 'Inactive' | 'Blacklisted';
  registrationDate: string;
  lastOrderDate?: string;
  performance?: {
    totalOrders: number;
    completedOrders: number;
    onTimeDelivery: number;
    totalValue: number;
    completionRate: number;
    averageDeliveryTime: number;
    averageOrderValue: number;
  };
}

export interface Quote {
  id: string;
  purchaseOrderId: string;
  vendorId: string;
  vendorName: string;
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
  totalAmount: number;
  currency: string;
  terms: string;
  deliveryTime: string;
  warranty: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  items: QuoteItem[];
  attachments?: string[];
}

export interface QuoteItem {
  id: string;
  assetName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications: string;
  deliveryTime: string;
  warranty: string;
}

// Buyer Registration Types
export interface BuyerRegistration {
  id: string;
  organization_type: OrganizationType;
  ministry_department: string;
  organization_name: string;
  buyer_designation: string;
  contact_person_name: string;
  email_id: string;
  contact_number: string;
  office_address: {
    zone: string;
    city: string;
    state: string;
    pin: string;
    fullAddress: string;
  };
  gstin?: string;
  payment_mode: PaymentMode;
  billing_authority_designation: string;
  consignee_name: string;
  consignee_designation: string;
  past_work_orders?: File[];
  authorized_designations: string[];
  contract_reference_numbers?: string[];
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  password_hash: string; // Hashed password
  logo_path?: string; // Path to uploaded logo file
}

export type OrganizationType = 
  | 'Central Govt'
  | 'State Govt'
  | 'PSU'
  | 'Autonomous Body'
  | 'Local Body'
  | 'Other';

export type PaymentMode = 
  | 'PFMS'
  | 'CGDA'
  | 'Offline'
  | 'ISRO Internal'
  | 'Other';



// Seller Registration Types
export interface SellerRegistration {
  id: string;
  company_name: string;
  gem_seller_id: string;
  contact_person_name: string;
  mobile_number: string;
  email_id: string;
  company_address: {
    street: string;
    city: string;
    state: string;
    pin: string;
    fullAddress: string;
  };
  gstin: string;
  msme_registration_no?: string;
  social_category: SocialCategory;
  nature_of_business: NatureOfBusiness;
  brands_dealt_with: string[];
  product_categories: string[];
  tan_certificate?: File[];
  amc_contact_name?: string;
  amc_contact_mobile?: string;
  amc_contact_email?: string;
  execution_contact_name?: string;
  execution_contact_mobile?: string;
  execution_contact_email?: string;
  accounts_contact_name?: string;
  accounts_contact_mobile?: string;
  accounts_contact_email?: string;
  director_contact_name?: string;
  director_contact_mobile?: string;
  director_contact_email?: string;
  shop_est_or_mca_certificate?: File[];
  gst_certificate?: File[];
  msme_certificate?: File[];
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  password_hash: string; // Hashed password
  logo_path?: string; // Path to uploaded logo file
}

export type SocialCategory = 'General' | 'SC' | 'ST' | 'OBC';

export type Gender = 'Male' | 'Female' | 'Other';

export type NatureOfBusiness = 'OEM' | 'Authorized Distributor' | 'Reseller';



// End User Device Registration Types
export interface EndUserDeviceRegistration {
  id: string;
  full_name: string;
  designation: string;
  department_office_name: string;
  email_id: string;
  mobile_number: string;
  devices_assigned: DeviceType[];
  device_serial_numbers: string[];
  delivery_confirmation_otp: boolean;
  hardware_software_functioning: {
    pre_installed_os_present: boolean;
    battery_charger_cable_working: boolean;
    antivirus_ms_office_activation: boolean;
  };
  language_preference: LanguagePreference;
  signed_delivery_receipt?: File[];
  amc_support_contact_details_shown: boolean;
  issues_reported?: string;
  issues_reported_files?: File[];
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  logo_path?: string; // Path to uploaded logo file
}

export type DeviceType = 'Laptop' | 'Desktop' | 'Printer' | 'Scanner' | 'Webcam' | 'Software License Key';

export type LanguagePreference = 'English' | 'Hindi' | 'Marathi' | 'Gujarati' | 'Bengali' | 'Tamil' | 'Telugu' | 'Kannada' | 'Malayalam' | 'Punjabi' | 'Odia' | 'Assamese';

// End User Device Management Types
export interface AllocatedDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'Laptop' | 'Desktop' | 'Printer' | 'Scanner' | 'Webcam' | 'Other';
  serialNumber: string;
  model: string;
  manufacturer: string;
  allocationDate: string;
  status: 'Allocated' | 'Acknowledged' | 'Verified' | 'In Use' | 'Under Maintenance';
  acknowledgmentStatus: 'Pending' | 'Completed';
  verificationStatus: 'Pending' | 'In Progress' | 'Completed';
  warrantyInfo: {
    startDate: string;
    endDate: string;
    type: 'Standard' | 'Extended' | 'Premium';
    provider: string;
    contactNumber: string;
    contactEmail: string;
  };
  amcInfo?: {
    contractNumber: string;
    startDate: string;
    endDate: string;
    provider: string;
    contactNumber: string;
    contactEmail: string;
    serviceType: 'Preventive' | 'Corrective' | 'Emergency';
  };
  location: string;
  assignedTo: string;
  department: string;
}

export interface DeviceVerificationChecklist {
  id: string;
  deviceId: string;
  checklistItems: {
    id: string;
    item: string;
    category: 'Hardware' | 'Software' | 'Accessories' | 'Documentation';
    status: 'Pending' | 'Passed' | 'Failed' | 'Not Applicable';
    notes?: string;
    completedAt?: string;
  }[];
  overallStatus: 'Pending' | 'In Progress' | 'Completed' | 'Failed';
  startedAt?: string;
  completedAt?: string;
  verifiedBy: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  deviceType: string[];
  category: 'Setup' | 'Usage' | 'Maintenance' | 'Troubleshooting';
  content: string;
  videoUrl?: string;
  attachments?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface OTPVerification {
  id: string;
  deviceId: string;
  otp: string;
  status: 'Pending' | 'Verified' | 'Expired' | 'Failed';
  createdAt: string;
  expiresAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  attempts: number;
  maxAttempts: number;
}

// Seller Order Types
export interface SellerOrder {
  id: string;
  gemContractNumber: string;
  gemOrderCategory: string;
  gemBuyerDepartmentName: string;
  buyerContact: {
    officerName: string;
    designation: string;
    email: string;
    contactNumber: string;
  };
  projectManager: {
    officerName: string;
    designation: string;
    contactNumber: string;
  };
  deliveryPerson?: {
    officerName: string;
    designation: string;
    contactNumber: string;
  };
  expectedDeliveryWindow: {
    startDate: string;
    endDate: string;
  };
  items: SellerOrderItem[];
  // Buyer mapping fields
  buyerId?: string;
  buyerName?: string;
  mappedAt?: string;
  isMappedToBuyer?: boolean;
  oemAuthorizationLetter?: File | null;
  gemOrderFile?: File | null;
  workOrderFile?: File | null;
  purchaseOrderFile?: File | null;
  createdAt: string;
  updatedAt: string;
  status: PurchaseOrderStatus;
  sellerId: string;
  sellerName: string;
  // Order-level totals
  totalAmount?: number; // grand total including GST
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
  deliveryInformation?: PurchaseOrder['deliveryInformation'];
}

export interface SellerOrderItem {
  id: string;
  productName: string;
  brand: string;
  modelNumber: string;
  categoryType: string;
  quantity: number;
  // Pricing fields
  unitPrice?: number; // per-item unit price
  gst?: number; // GST amount for this line item
  totalPrice?: number; // subtotal + GST for this line item
  gstin: string;
  warrantyPeriod: number;
  amcResponsibility: string;
  installationRequired: boolean;
}

