import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Camera } from 'lucide-react'
import HousingPhoto from '../components/HousingPhoto'
import photos from '../data/housingPhotos.json'

export default function PhotoCredits() {
  return (
    <div className="container-x py-10 sm:py-14">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700"><ArrowLeft size={16} /> Về trang chủ</Link>
      <div className="mt-7 max-w-3xl">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-600"><Camera size={17} /> Nguồn hình ảnh</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink-900 sm:text-4xl">Những không gian được ghi lại bằng ảnh chụp</h1>
        <p className="mt-4 leading-relaxed text-ink-600">Banner và các nhóm chỗ ở dùng ảnh chụp minh họa từ bộ ảnh đã lưu của YangRent. Ảnh giới thiệu loại không gian, không xác nhận địa chỉ, giá thuê hay tình trạng còn phòng.</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">Ảnh trong từng tin đăng do người đăng cung cấp. Khi một tin chưa có ảnh, YangRent hiển thị trạng thái “Chưa có hình ảnh”.</p>
      </div>
      <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(photos).map((photo) => (
          <article key={photo.id} className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <HousingPhoto photo={photo} sizes="(min-width: 1024px) 380px, (min-width: 640px) 48vw, 100vw" className="aspect-[4/3]" />
            <div className="p-5">
              <h2 className="font-bold text-ink-900">{photo.title}</h2>
              <p className="mt-2 text-sm text-ink-600">Ảnh: {photo.credit}</p>
              <p className="mt-1 text-xs text-ink-400">{photo.provider} · Bộ ảnh đã lưu của dự án</p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-brand-700">
                <a href={photo.provenanceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">Nguồn ảnh đã lưu <ArrowUpRight size={13} /></a>
                <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Điều khoản Pexels</a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
