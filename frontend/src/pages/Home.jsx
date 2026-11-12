import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Map as MapIcon, MapPin, MessageSquare, Plus, Search, ShieldCheck, Sparkles, WalletCards } from 'lucide-react'
import api from '../api/client'
import RoomCard from '../components/RoomCard'
import HousingPhoto from '../components/HousingPhoto'
import housingPhotos from '../data/housingPhotos.json'
import { RoomCardSkeleton } from '../components/ui'
import { useMap } from '../context/MapContext'
import { PROPERTY_TYPES } from '../config/brand'

const districts = ['Cầu Giấy', 'Thanh Xuân', 'Đống Đa', 'Hai Bà Trưng', 'Nam Từ Liêm', 'Hà Đông', 'Ba Đình', 'Tây Hồ']
const categories = [
  { type: 'RENTAL_ROOM', label: 'Phòng cho thuê', desc: 'Phù hợp sinh viên, người đi làm', photo: housingPhotos.RENTAL_ROOM },
  { type: 'STUDIO', label: 'Studio', desc: 'Không gian riêng, gọn và tiện', photo: housingPhotos.STUDIO },
  { type: 'APARTMENT', label: 'Căn hộ', desc: 'Nhiều tiện nghi, ở dài hạn', photo: housingPhotos.APARTMENT },
  { type: 'WHOLE_HOUSE', label: 'Nhà nguyên căn', desc: 'Cho gia đình hoặc nhóm bạn', photo: housingPhotos.WHOLE_HOUSE },
  { type: 'SHARED_ROOM', label: 'Ở ghép', desc: 'Chia sẻ chi phí hợp lý', photo: housingPhotos.SHARED_ROOM },
  { type: 'MINI_APARTMENT', label: 'Chung cư mini', desc: 'Riêng tư, đủ tiện nghi cơ bản', photo: housingPhotos.MINI_APARTMENT },
]

function PropertySection({ eyebrow, title, subtitle, items, loading, link = '/rooms' }) {
  return (
    <section className="container-x py-14">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-600">{eyebrow}</p><h2 className="mt-1 text-2xl font-extrabold text-ink-900 sm:text-3xl">{title}</h2>{subtitle && <p className="mt-2 max-w-2xl text-sm text-ink-500">{subtitle}</p>}</div>
        <Link to={link} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:text-brand-800">Xem tất cả <ArrowRight size={16} /></Link>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <RoomCardSkeleton key={i} />) : items?.slice(0, 8).map((r) => <RoomCard key={r.id} room={r} />)}
      </div>
    </section>
  )
}

export default function Home() {
  const [featured, setFeatured] = useState(null)
  const [newRooms, setNewRooms] = useState(null)
  const [goodPrice, setGoodPrice] = useState(null)
  const [search, setSearch] = useState({ keyword: '', budget: '', room_type: '' })
  const { openMap } = useMap()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/rooms/featured?limit=8').then((res) => setFeatured(res.data || [])).catch(() => setFeatured([]))
    api.get('/rooms?sort=newest&page_size=8').then((res) => setNewRooms(res.data?.items || [])).catch(() => setNewRooms([]))
    api.get('/rooms?sort=price_asc&page_size=8').then((res) => setGoodPrice(res.data?.items || [])).catch(() => setGoodPrice([]))
  }, [])

  const doSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search.keyword.trim()) params.set('keyword', search.keyword.trim())
    if (search.room_type) params.set('room_type', search.room_type)
    if (search.budget) {
      const [min, max] = search.budget.split('-')
      if (min) params.set('price_min', min)
      if (max) params.set('price_max', max)
    }
    navigate(`/rooms?${params.toString()}`)
  }

  return (
    <div className="animate-fadeUp">
      <section aria-labelledby="home-search-title" className="border-b border-ink-200 bg-[#f5f3ed]">
        <div className="container-x grid items-center gap-5 py-6 sm:gap-7 sm:py-11 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)] lg:gap-12 lg:py-14">
          <div>
            <h1 id="home-search-title" className="max-w-xl text-balance text-4xl font-extrabold leading-[1.12] tracking-tight text-ink-900 sm:text-5xl">
              Tìm chỗ ở <span className="whitespace-nowrap">phù hợp</span> tại <span className="whitespace-nowrap">Hà Nội</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-600 sm:mt-4 sm:text-base">Lọc phòng trọ, studio và căn hộ theo khu vực và ngân sách thuê mỗi tháng.</p>

            <form onSubmit={doSearch} aria-label="Tìm chỗ ở" className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-ink-200 bg-white p-3 shadow-soft sm:mt-7 sm:p-4">
              <label className="col-span-2">
                <span className="label">Khu vực hoặc từ khóa</span>
                <span className="relative block">
                  <MapPin aria-hidden="true" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                  <input type="search" value={search.keyword} onChange={(e) => setSearch({ ...search, keyword: e.target.value })} className="input h-11 bg-ink-50 pl-9 placeholder:text-ink-500" placeholder="Ví dụ Cầu Giấy" />
                </span>
              </label>
              <label className="min-w-0">
                <span className="label">Loại chỗ ở</span>
                <select value={search.room_type} onChange={(e) => setSearch({ ...search, room_type: e.target.value })} className="input h-11 bg-ink-50 px-2 sm:px-3">
                  {PROPERTY_TYPES.map((t) => <option key={t.value || 'all'} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label className="min-w-0">
                <span className="label">Giá mỗi tháng</span>
                <select value={search.budget} onChange={(e) => setSearch({ ...search, budget: e.target.value })} className="input h-11 bg-ink-50 px-2 sm:px-3">
                  <option value="">Mọi mức giá</option>
                  <option value="-3000000">Dưới 3 triệu</option>
                  <option value="3000000-5000000">3–5 triệu</option>
                  <option value="5000000-8000000">5–8 triệu</option>
                  <option value="8000000-12000000">8–12 triệu</option>
                  <option value="12000000-">Trên 12 triệu</option>
                </select>
              </label>
              <button type="submit" className="btn-primary col-span-2 h-11"><Search aria-hidden="true" size={17} /> Tìm chỗ ở</button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="mr-1 font-medium text-ink-600">Theo quận</span>
              {['Cầu Giấy', 'Thanh Xuân', 'Nam Từ Liêm', 'Hà Đông'].map((district) => (
                <Link key={district} to={`/rooms?district=${encodeURIComponent(district)}`} className="inline-flex min-h-[36px] items-center rounded-full border border-ink-200 bg-white px-3 font-medium text-ink-700 hover:border-brand-300 hover:text-brand-800">{district}</Link>
              ))}
            </div>
          </div>
          <figure className="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-soft">
            <HousingPhoto photo={housingPhotos.hero} priority className="aspect-video w-full sm:aspect-[2/1] lg:aspect-[5/4]" sizes="(min-width: 1280px) 596px, (min-width: 1024px) 47vw, 100vw" imageClassName="object-[58%_center]" />
            <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-3 sm:px-5">
              <span className="text-sm font-semibold text-ink-800">{housingPhotos.hero.title}</span>
              <Link to="/photo-credits" className="text-xs font-medium text-brand-800 underline underline-offset-2 hover:text-brand-900">Ảnh chụp minh họa · Nguồn ảnh</Link>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="container-x py-9 sm:py-12">
        <div className="mb-5">
          <h2 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">Khám phá theo loại chỗ ở</h2>
          <p className="mt-2 text-sm text-ink-600">Chọn một loại chỗ ở để lọc tin đăng. Các ảnh chỉ dùng để minh họa.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <Link key={c.type} to={`/rooms?room_type=${c.type}`} className="group overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft transition hover:border-brand-300 hover:shadow-lift">
              <HousingPhoto photo={c.photo} sizes="(min-width: 1024px) 190px, (min-width: 768px) 30vw, 48vw" className="aspect-[4/3] w-full" imageClassName="motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:scale-105" />
              <div className="p-3.5">
                <h3 className="flex items-start justify-between gap-1 text-sm font-bold text-ink-900">
                  {c.label} <ArrowRight size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-700" />
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-600">{c.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <PropertySection eyebrow="Được quan tâm" title="Chỗ ở nổi bật" subtitle="Các tin có thông tin đầy đủ, hình ảnh rõ và được ưu tiên hiển thị." items={featured} loading={featured === null} />
      <div className="border-y border-ink-100 bg-white"><PropertySection eyebrow="Vừa cập nhật" title="Chỗ ở mới đăng" subtitle="Theo dõi các lựa chọn mới để tìm căn phù hợp sớm hơn." items={newRooms} loading={newRooms === null} /></div>
      <PropertySection eyebrow="Dễ tiếp cận" title="Giá tốt cho bạn" subtitle="Sắp xếp theo giá để bạn nhanh chóng đối chiếu với ngân sách." items={goodPrice} loading={goodPrice === null} link="/rooms?sort=price_asc" />

      <section className="border-y border-ink-100 bg-white py-14">
        <div className="container-x">
          <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-600">Theo khu vực</p><h2 className="mt-1 text-2xl font-extrabold text-ink-900 sm:text-3xl">Khám phá Hà Nội</h2><p className="mt-2 text-sm text-ink-500">Lọc nhanh theo những khu vực có nhiều lựa chọn thuê.</p></div><button onClick={openMap} className="btn-secondary"><MapIcon size={17} /> Xem bản đồ</button></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {districts.map((d, i) => <Link key={d} to={`/rooms?district=${encodeURIComponent(d)}`} className="group rounded-2xl border border-ink-100 bg-gradient-to-br from-brand-50 to-white p-5 transition hover:border-brand-200 hover:shadow-soft"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft"><MapPin size={19} /></div><h3 className="mt-4 font-bold text-ink-900">{d}</h3><p className="mt-1 text-xs text-ink-500">Khám phá chỗ ở tại khu vực này</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-700">Xem chỗ ở <ArrowRight size={13} /></span></Link>)}
          </div>
        </div>
      </section>

      <section className="container-x py-16">
        <div className="grid items-center gap-8 rounded-3xl bg-ink-900 p-7 sm:p-10 lg:grid-cols-2 lg:p-12">
          <div><span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-200"><Sparkles size={14} /> YangMatch</span><h2 className="mt-4 text-3xl font-extrabold text-white">Để YangMatch gợi ý chỗ ở hợp nhu cầu</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">Hệ thống hiện dùng rule-based scoring theo ngân sách, khu vực, loại chỗ ở và tiện nghi. Không tuyên bố machine learning khi chưa có mô hình ML thật.</p><Link to="/ai-recommend" className="btn mt-6 bg-white text-ink-900 hover:bg-brand-50"><Sparkles size={17} /> Thử YangMatch</Link></div>
          <div className="grid grid-cols-2 gap-3">
            {[['Ngân sách','Ưu tiên trong khoảng bạn chọn'],['Khu vực','Tập trung đúng nơi bạn muốn ở'],['Tiện nghi','So khớp Wi-Fi, bếp, máy giặt...'],['Loại chỗ ở','Phòng, studio, căn hộ hoặc nhà']].map(([t,d]) => <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-4"><BadgeCheck size={18} className="text-brand-300"/><p className="mt-3 text-sm font-bold text-white">{t}</p><p className="mt-1 text-xs leading-relaxed text-white/60">{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="container-x pb-16">
        <div className="mb-8 text-center"><p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-600">Vì sao chọn YangRent</p><h2 className="mt-1 text-2xl font-extrabold text-ink-900 sm:text-3xl">Thuê dễ hiểu, quản lý rõ ràng hơn</h2></div>
        <div className="grid gap-5 md:grid-cols-3">
          {[{icon:ShieldCheck,title:'Thông tin rõ ràng',desc:'Hiển thị trạng thái xác minh, tiện nghi, chi phí và công cụ báo cáo tin đáng ngờ.'},{icon:WalletCards,title:'Chi phí minh bạch',desc:'Giá thuê theo tháng cùng điện, nước, internet được tách rõ trong dữ liệu quản lý.'},{icon:MessageSquare,title:'Kết nối trong nền tảng',desc:'Người thuê và chủ nhà có thể trao đổi, quản lý yêu cầu và theo dõi lịch sử.'}].map((f) => <div key={f.title} className="card p-6"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><f.icon size={22}/></div><h3 className="mt-4 text-base font-bold text-ink-900">{f.title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-500">{f.desc}</p></div>)}
        </div>
      </section>

      <section className="container-x pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-brand-700 px-7 py-12 sm:px-10 lg:px-14">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto]"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-100">Dành cho chủ nhà</p><h2 className="mt-2 text-3xl font-extrabold text-white">Bạn có nhà/phòng muốn cho thuê?</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">Đăng tin trên YangRent và quản lý bất động sản, người thuê, hợp đồng, hóa đơn, điện nước trong cùng một hệ thống.</p></div><Link to="/post-room" className="btn bg-white text-brand-700 hover:bg-brand-50"><Plus size={18}/> Đăng tin miễn phí</Link></div>
        </div>
      </section>
    </div>
  )
}
