export function vnd(n) {
  if (n === null || n === undefined) return '0 ₫'
  return new Intl.NumberFormat('vi-VN').format(n) + ' ₫'
}

export function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN')
}

export function timeAgo(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'Vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`
  return fmtDate(iso)
}

export const ROOM_STATUS_LABEL = {
  AVAILABLE: 'Còn trống',
  RENTED: 'Đã cho thuê',
  RESERVED: 'Đã giữ chỗ',
  BOOKED: 'Đã có người đặt',
  HIDDEN: 'Đã ẩn',
}

export const ROOM_STATUS_STYLE = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700',
  RENTED: 'bg-ink-100 text-ink-600',
  RESERVED: 'bg-amber-50 text-amber-700',
  BOOKED: 'bg-blue-50 text-blue-700',
  HIDDEN: 'bg-ink-100 text-ink-500',
}

export const ROOM_TYPE_LABEL = {
  RENTAL_ROOM: 'Phòng cho thuê',
  STUDIO: 'Studio',
  MINI_APARTMENT: 'Chung cư mini',
  APARTMENT: 'Căn hộ',
  WHOLE_HOUSE: 'Nhà nguyên căn',
  SHARED_ROOM: 'Ở ghép',
  // Legacy values kept so old databases continue to render correctly.
  FULL_FURNITURE: 'Phòng full nội thất',
  SEMI_FURNITURE: 'Phòng nội thất cơ bản',
  EMPTY: 'Phòng chưa nội thất',
  SHARED_HOUSE: 'Nhà ở ghép',
}

export const MODERATION_LABEL = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' }
export const INVOICE_STATUS_LABEL = { PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', FAILED: 'Thất bại', EXPIRED: 'Quá hạn' }
export const CONTRACT_STATUS_LABEL = { DRAFT: 'Nháp', SENT: 'Đã gửi', ACTIVE: 'Đang hiệu lực', COMPLETED: 'Hoàn tất', TERMINATED: 'Chấm dứt' }
export const MAINTENANCE_STATUS_LABEL = { PENDING: 'Chờ xử lý', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã xử lý', REJECTED: 'Từ chối' }
export const PRIORITY_LABEL = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', URGENT: 'Khẩn cấp' }
export const REPORT_STATUS_LABEL = { PENDING: 'Chờ xử lý', REVIEWING: 'Đang xem xét', RESOLVED: 'Đã xử lý', REJECTED: 'Từ chối' }
export const POST_TYPE_LABEL = { LOOKING_ROOM: 'Tìm chỗ ở', LOOKING_ROOMMATE: 'Tìm người ở ghép' }
export const METER_TYPE_LABEL = { ELECTRICITY: 'Điện', WATER: 'Nước' }
export const GENDER_LABEL = { MALE: 'Nam', FEMALE: 'Nữ', ANY: 'Không yêu cầu' }
