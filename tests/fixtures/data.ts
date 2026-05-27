export function apiResponse<T>(data: T, message = 'OK') {
  return {
    success: true,
    message,
    data,
  };
}

export function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    email: 'playwright@example.com',
    fullName: 'Playwright User',
    phone: '0900000000',
    avatarUrl: '',
    role: 'SEEKER',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeRoom(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    landlordId: 100 + id,
    landlordName: `Chu nha ${id}`,
    landlordPhone: '0901234567',
    landlordAvatar: '',
    title: `Phong tro ${id}`,
    description: `Mo ta phong ${id}`,
    price: 3_500_000 + id * 100_000,
    area: 24,
    electricPrice: 3500,
    waterPrice: 15000,
    otherFees: 100000,
    address: '12 Nguyen Trai',
    ward: 'Thanh Xuan Trung',
    district: 'Cau Giay',
    city: 'Ha Noi',
    latitude: 21.028,
    longitude: 105.804,
    roomType: 'STUDIO',
    isFurnished: true,
    maxPeople: 2,
    genderRequirement: 'ALL',
    status: 'ACTIVE',
    viewCount: 128,
    imageUrls: [
      `https://picsum.photos/seed/room-${id}-1/1200/800`,
      `https://picsum.photos/seed/room-${id}-2/1200/800`,
    ],
    primaryImageUrl: `https://picsum.photos/seed/room-${id}-1/1200/800`,
    amenities: ['WiFi', 'Dieu hoa', 'May giat'],
    createdAt: '2026-05-01T09:00:00.000Z',
    favorited: false,
    avgRating: 4.5,
    reviewCount: 3,
    ...overrides,
  };
}

export function makeRoomsPage(content: Array<Record<string, unknown>>) {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 12,
  };
}

export function makeReview(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    reviewerId: 200 + id,
    reviewerName: `Nguoi dung ${id}`,
    reviewerAvatar: '',
    rating: 5,
    ratingLocation: 5,
    ratingPrice: 4,
    ratingLandlord: 5,
    ratingHygiene: 4,
    comment: `Danh gia ${id}`,
    media: [],
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-01T09:00:00.000Z',
    ...overrides,
  };
}

export function makeProfileStats(overrides: Record<string, unknown> = {}) {
  return {
    totalFavorites: 8,
    totalAppointments: 2,
    totalBookings: 1,
    totalRooms: 0,
    totalViews: 0,
    ...overrides,
  };
}

export function makeBooking(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    roomId: 1,
    roomTitle: 'Studio gan truong',
    roomPrimaryImage: 'https://picsum.photos/seed/booking-room/1200/800',
    roomStatus: 'ACTIVE',
    seekerId: 1,
    seekerName: 'Playwright User',
    landlordId: 101,
    landlordName: 'Chu nha 1',
    tenantFullName: 'Playwright User',
    tenantPhone: '0900000000',
    tenantEmail: 'playwright@example.com',
    tenantIdentityNumber: '012345678901',
    moveInDate: '2026-06-01',
    contractEndDate: '2026-12-01',
    leaseMonths: 6,
    occupantCount: 1,
    monthlyRent: 4200000,
    depositAmount: 4200000,
    electricPrice: 3500,
    waterPrice: 15000,
    otherFees: 100000,
    contractCode: 'HD-TEST-001',
    contractTerms: 'Dieu khoan hop dong mau',
    note: 'Can vao o dau thang sau',
    landlordNote: '',
    status: 'REQUESTED',
    paymentStatus: 'PENDING',
    paymentProvider: 'VNPAY',
    paymentMethod: 'VNPAY',
    paymentOrderId: 'ORDER-001',
    paymentMessage: '',
    createdAt: '2026-05-27T10:00:00.000Z',
    updatedAt: '2026-05-27T10:00:00.000Z',
    ...overrides,
  };
}

export function makeAppointment(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    roomId: 1,
    roomTitle: 'Studio gan truong',
    roomPrimaryImage: 'https://picsum.photos/seed/appointment-room/1200/800',
    seekerId: 1,
    seekerName: 'Playwright User',
    seekerPhone: '0900000000',
    landlordId: 101,
    landlordName: 'Chu nha 1',
    requestedAt: '2026-06-01T10:00:00',
    message: 'Muon xem phong vao cuoi tuan',
    landlordNote: '',
    status: 'PENDING',
    createdAt: '2026-05-27T10:00:00.000Z',
    ...overrides,
  };
}

export function makeChatRoom(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    roomId: 1,
    roomTitle: 'Studio gan truong',
    roomPrimaryImage: 'https://picsum.photos/seed/chat-room/1200/800',
    seekerId: 1,
    seekerName: 'Playwright User',
    landlordId: 101,
    landlordName: 'Chu nha 1',
    lastMessage: 'Chao ban',
    lastMessageAt: '2026-05-27T10:00:00.000Z',
    unreadCount: 0,
    ...overrides,
  };
}

export function makeMessage(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    chatRoomId: 1,
    senderId: 101,
    senderName: 'Chu nha 1',
    senderAvatar: '',
    content: `Tin nhan ${id}`,
    isRead: true,
    sentAt: '2026-05-27T10:00:00.000Z',
    ...overrides,
  };
}

export function makeAdminStats(overrides: Record<string, unknown> = {}) {
  return {
    totalUsers: 25,
    totalRooms: 14,
    pendingRooms: 2,
    totalReports: 3,
    ...overrides,
  };
}

export function makeReport(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    roomId: 1,
    roomTitle: 'Studio gan truong',
    reporterName: 'Nguoi bao cao',
    reporterEmail: 'reporter@example.com',
    reason: 'Thong tin khong dung',
    status: 'PENDING',
    adminNote: '',
    createdAt: '2026-05-27T10:00:00.000Z',
    ...overrides,
  };
}
