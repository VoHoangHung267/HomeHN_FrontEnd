# Playwright E2E

Bo test nay duoc tao de bat dau E2E cho frontend Angular.

## Cai dat

```powershell
npm install
npx playwright install
```

## Chay test

```powershell
npm run e2e
npm run e2e:ui
```

## Pham vi hien tai

- Danh sach phong: render, tim kiem, AI search, yeu thich
- Chi tiet phong: gallery, goi y, bao cao, dat lich xem, gui yeu cau thue, danh gia
- Ho so ca nhan: load profile, cap nhat thong tin, doi mat khau, thong ke
- Route guard co ban cho login/profile
- Auth: login, register, forgot password, reset password
- User portal: favorites, bookings, appointments, chat
- Landlord: dashboard, room form
- Admin: dashboard, room management
- Utility pages: map, report detail

## Ma tran coverage theo route

- `/auth/login`: co test
- `/auth/register`: co test
- `/auth/forgot-password`: co test
- `/auth/reset-password`: co test
- `/rooms`: co test
- `/rooms/favorites`: co test
- `/rooms/:id`: co test
- `/bookings`: co test
- `/bookings/:id`: co test gian tiep qua flow tao booking
- `/appointments`: co test
- `/chat`: co test
- `/profile`: co test
- `/map`: co test
- `/landlord`: co test
- `/landlord/rooms/new`: co test
- `/landlord/rooms/:id/edit`: chua co case rieng
- `/admin`: co test
- `/admin/room-management`: co test
- `/reports/:id`: co test

## Rui ro con lai

- Chua phu het moi nhanh nghiep vu ben trong `booking-detail`
- Chua phu rieng flow edit room cua landlord
- Chua phu cac nhanh loi chi tiet cho admin/landlord/chat
- Chua verify tich hop backend that, hien tai dang mock API

## Luu y

- Hien co mot so file giao dien dang loi encoding tieng Viet, vi vay test mau uu tien selector theo `name`, `type`, URL.
- Khi on dinh giao dien, nen bo sung `data-testid` cho cac form va nut quan trong de test ben vung hon.
