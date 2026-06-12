# Playwright E2E

Bộ test này được tạo để bắt đầu E2E cho frontend Angular.

## Cài đặt

```powershell
npm install
npx playwright install
```

## Chạy test

```powershell
npm run e2e
npm run e2e:ui
```

## Phạm vi hiện tại

- Danh sách phòng: render, tìm kiếm, AI search, yêu thích
- Chi tiết phòng: gallery, gợi ý, báo cáo, đặt lịch xem, gửi yêu cầu thuê, đánh giá
- Hồ sơ cá nhân: load profile, cập nhật thông tin, đổi mật khẩu, thống kê
- Route guard cơ bản cho login/profile
- Auth: login, register, forgot password, reset password
- User portal: favorites, bookings, appointments, chat
- Landlord: dashboard, room form
- Admin: dashboard, room management
- Utility pages: map, report detail

## Ma trận coverage theo route

- `/auth/login`: có test
- `/auth/register`: có test
- `/auth/forgot-password`: có test
- `/auth/reset-password`: có test
- `/rooms`: có test
- `/rooms/favorites`: có test
- `/rooms/:id`: có test
- `/bookings`: có test
- `/bookings/:id`: có test gián tiếp qua flow tạo booking
- `/appointments`: có test
- `/chat`: có test
- `/profile`: có test
- `/map`: có test
- `/landlord`: có test
- `/landlord/rooms/new`: có test
- `/landlord/rooms/:id/edit`: chưa có case riêng
- `/admin`: có test
- `/admin/room-management`: có test
- `/reports/:id`: có test

## Rủi ro còn lại

- Chưa phủ hết mọi nhánh nghiệp vụ bên trong `booking-detail`
- Chưa phủ riêng flow edit room của landlord
- Chưa phủ các nhánh lỗi chi tiết cho admin/landlord/chat
- Chưa verify tích hợp backend thật, hiện tại đang mock API

## Lưu ý

- Hiện có một số file giao diện đang lỗi encoding tiếng Việt, vì vậy test mẫu ưu tiên selector theo `name`, `type`, URL.
- Khi ổn định giao diện, nên bổ sung `data-testid` cho các form và nút quan trọng để test bền vững hơn.
