// src/app/core/models/index.ts

export type Role               = 'ADMIN' | 'LANDLORD' | 'SEEKER';
export type RoomStatus         = 'ACTIVE' | 'PENDING' | 'REJECTED' | 'HIDDEN' | 'EXPIRED' | 'RENTED' | 'AVAILABLE_SOON' | 'HIDDEN_REVIEW';
export type RoomType           = 'PHONG_TRO' | 'CHUNG_CU_MINI' | 'STUDIO' | 'NGAN_PHONG' | 'NHA_NGUYEN_CAN';
export type GenderRequirement  = 'ALL' | 'MALE' | 'FEMALE';

export interface User {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  avatarUrl: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface EmailAvailabilityResponse {
  exists: boolean;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface Room {
  id: number;
  landlordId: number;
  landlordName: string;
  landlordPhone: string;
  landlordAvatar: string;
  title: string;
  description: string;
  price: number;
  area: number;
  electricPrice: number;
  waterPrice: number;
  otherFees: number;
  address: string;
  ward: string;
  district: string;
  city: string;
  latitude: number;
  longitude: number;
  roomType: RoomType;
  isFurnished: boolean;
  maxPeople: number;
  genderRequirement: GenderRequirement;
  status: RoomStatus;
  viewCount: number;
  imageUrls: string[];
  primaryImageUrl: string;
  amenities: string[];
  createdAt: string;
  favorited: boolean;
  avgRating?: number;
  reviewCount?: number;
  availableFrom?: string;
}

export interface RoomFilter {
  keyword?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  roomType?: RoomType;
  isFurnished?: boolean;
  genderRequirement?: GenderRequirement;
  sortBy?: 'createdAt' | 'price_asc' | 'price_desc' | 'viewCount';
  page?: number;
  size?: number;
}

export interface ChatRoom {
  id: number;
  roomId: number;
  roomTitle: string;
  roomPrimaryImage: string;
  seekerId: number;
  seekerName: string;
  landlordId: number;
  landlordName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: number;
  chatRoomId: number;
  senderId: number;
  senderName: string;
  senderAvatar: string;
  content: string;
  isRead: boolean;
  sentAt: string;
}

export interface RoomFormData {
  title: string;
  description: string;
  price: number | null;
  area: number | null;
  electricPrice: number;
  waterPrice: number;
  otherFees: number;
  address: string;
  ward: string;
  district: string;
  city: string;
  latitude?: number;
  longitude?: number;
  roomType: RoomType;
  isFurnished: boolean;
  maxPeople: number;
  genderRequirement: GenderRequirement;
  amenities: string[];
}

export interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
  address: { road?: string; suburb?: string; city_district?: string; city?: string; };
}

export interface Review {
  id: number;
  reviewerId: number;
  reviewerName: string;
  reviewerAvatar: string;
  rating: number;
  ratingLocation?: number;
  ratingPrice?: number;
  ratingLandlord?: number;
  ratingHygiene?: number;
  comment: string;
  media: ReviewMedia[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewMedia {
  id: number;
  type: 'IMAGE' | 'VIDEO';
  url: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedId: number;
  relatedType?: string;
  actionUrl?: string;
  createdAt: string;
}

export type ViewingAppointmentStatus =
  'PENDING' | 'ACCEPTED' | 'RESCHEDULED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface ViewingAppointment {
  id: number;
  roomId: number;
  roomTitle: string;
  roomPrimaryImage: string;
  seekerId: number;
  seekerName: string;
  seekerPhone: string;
  landlordId: number;
  landlordName: string;
  requestedAt: string;
  message: string;
  landlordNote: string;
  status: ViewingAppointmentStatus;
  createdAt: string;
}

export type RentalBookingStatus =
  'REQUESTED' | 'PENDING_PAYMENT' | 'DEPOSIT_PAID' | 'ACTIVE' | 'EXPIRING_SOON' | 'RENEWAL_PENDING' | 'REJECTED' | 'CANCELLED' | 'PAYMENT_FAILED' | 'COMPLETED';

export type RentalPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
export type RentalPaymentMethod = 'VNPAY' | 'CASH';
export type ContractAdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ContractAdjustmentProposerRole = 'SEEKER' | 'LANDLORD';

export interface ContractAdjustment {
  id: number;
  bookingId: number;
  proposerRole: ContractAdjustmentProposerRole;
  extensionMonths?: number;
  proposedMonthlyRent?: number;
  proposedDepositAmount?: number;
  proposedElectricPrice?: number;
  proposedWaterPrice?: number;
  proposedOtherFees?: number;
  proposedContractTerms?: string;
  proposalNote?: string;
  status: ContractAdjustmentStatus;
  responderRole?: ContractAdjustmentProposerRole;
  responseNote?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalBooking {
  id: number;
  roomId: number;
  roomTitle: string;
  roomPrimaryImage: string;
  roomStatus?: RoomStatus;
  seekerId: number;
  seekerName: string;
  landlordId: number;
  landlordName: string;
  tenantFullName: string;
  tenantPhone: string;
  tenantEmail?: string;
  tenantIdentityNumber?: string;
  moveInDate: string;
  contractEndDate?: string;
  leaseMonths: number;
  occupantCount: number;
  monthlyRent: number;
  depositAmount: number;
  electricPrice?: number;
  waterPrice?: number;
  otherFees?: number;
  contractCode: string;
  contractTerms: string;
  note?: string;
  landlordNote?: string;
  status: RentalBookingStatus;
  paymentStatus: RentalPaymentStatus;
  paymentProvider: string;
  paymentMethod?: RentalPaymentMethod;
  paymentOrderId?: string;
  paymentPayUrl?: string;
  paymentDeeplink?: string;
  paymentQrCodeUrl?: string;
  paymentTransId?: number;
  paymentResultCode?: number;
  paymentMessage?: string;
  depositPaidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  PHONG_TRO:     'Phòng trọ',
  CHUNG_CU_MINI: 'Chung cư mini',
  STUDIO:        'Studio',
  NGAN_PHONG:    'Ngăn phòng',
  NHA_NGUYEN_CAN:'Nhà nguyên căn'
};

export const GENDER_LABELS: Record<GenderRequirement, string> = {
  ALL:    'Tất cả',
  MALE:   'Nam',
  FEMALE: 'Nữ'
};

export const STATUS_LABELS: Record<RoomStatus, string> = {
  ACTIVE:   'Đang hiển thị',
  PENDING:  'Chờ duyệt',
  REJECTED: 'Bị từ chối',
  HIDDEN:   'Đã ẩn',
  EXPIRED:  'Hết hạn',
  RENTED:   'Đã cho thuê',
  AVAILABLE_SOON: 'Sắp trống',
  HIDDEN_REVIEW: 'Tạm ẩn chờ xử lý'
};

export const DISTRICTS_HN = [
  'Hoàn Kiếm', 'Cửa Nam', 'Ba Đình', 'Ngọc Hà', 'Giảng Võ',
  'Hai Bà Trưng', 'Vĩnh Tuy', 'Bạch Mai', 'Đống Đa', 'Kim Liên',
  'Văn Miếu - Quốc Tử Giám', 'Láng', 'Ô Chợ Dừa', 'Hồng Hà', 'Lĩnh Nam',
  'Hoàng Mai', 'Vĩnh Hưng', 'Tương Mai', 'Định Công', 'Hoàng Liệt',
  'Yên Sở', 'Thanh Xuân', 'Khương Đình', 'Phương Liệt', 'Cầu Giấy',
  'Nghĩa Đô', 'Yên Hòa', 'Tây Hồ', 'Phú Thượng', 'Tây Tựu',
  'Phú Diễn', 'Xuân Đỉnh', 'Đông Ngạc', 'Thượng Cát', 'Từ Liêm',
  'Xuân Phương', 'Tây Mỗ', 'Đại Mỗ', 'Long Biên', 'Bồ Đề',
  'Việt Hưng', 'Phúc Lợi', 'Hà Đông', 'Dương Nội', 'Yên Nghĩa',
  'Phú Lương', 'Kiến Hưng', 'Thanh Liệt', 'Chương Mỹ', 'Sơn Tây',
  'Tùng Thiện', 'Thanh Trì', 'Đại Thanh', 'Nam Phù', 'Ngọc Hồi',
  'Thượng Phúc', 'Thường Tín', 'Chương Dương', 'Hồng Vân', 'Phú Xuyên',
  'Phượng Dực', 'Chuyên Mỹ', 'Đại Xuyên', 'Thanh Oai', 'Bình Minh',
  'Tam Hưng', 'Dân Hòa', 'Vân Đình', 'Ứng Thiên', 'Hòa Xá',
  'Ứng Hòa', 'Mỹ Đức', 'Hồng Sơn', 'Phúc Sơn', 'Hương Sơn',
  'Phú Nghĩa', 'Xuân Mai', 'Trần Phú', 'Hòa Phú', 'Quảng Bị',
  'Minh Châu', 'Quảng Oai', 'Vật Lại', 'Cổ Đô', 'Bất Bạt',
  'Suối Hai', 'Ba Vì', 'Yên Bài', 'Đoài Phương', 'Phúc Thọ',
  'Phúc Lộc', 'Hát Môn', 'Thạch Thất', 'Hạ Bằng', 'Tây Phương',
  'Hòa Lạc', 'Yên Xuân', 'Quốc Oai', 'Hưng Đạo', 'Kiều Phú',
  'Phú Cát', 'Hoài Đức', 'Dương Hòa', 'Sơn Đồng', 'An Khánh',
  'Đan Phượng', 'Ô Diên', 'Liên Minh', 'Gia Lâm', 'Thuận An',
  'Bát Tràng', 'Phù Đổng', 'Thư Lâm', 'Đông Anh', 'Phúc Thịnh',
  'Thiên Lộc', 'Vĩnh Thanh', 'Mê Linh', 'Yên Lãng', 'Tiến Thắng',
  'Quang Minh', 'Sóc Sơn', 'Đa Phúc', 'Nội Bài', 'Trung Giã',
  'Kim Anh'
].sort((a, b) => a.localeCompare(b, 'vi'));

export const AMENITIES_LIST = [
  'WiFi','Điều hòa','Máy giặt','Tủ lạnh','Bếp từ',
  'Nước nóng','Ban công','Thang máy','Giữ xe máy',
  'Giữ ô tô','Camera an ninh','Bảo vệ 24/7'
];
