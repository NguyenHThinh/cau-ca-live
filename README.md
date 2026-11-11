# 🎣 Fishing Live — Game Câu Cá Tương Tác TikTok Live (2D Web/OBS)

Game 2D tương tác trực tiếp với người xem **TikTok Live** (hỗ trợ tối đa **40 vị trí câu đồng thời** trên bờ hồ 2 vòng so le):

## ⚙️ Cơ Chế Tương Tác & Gameplay (Chuẩn v1)

1. **Thả Tim (Like) hoặc bình luận `câu` / `!cau` để Quăng Cần:**
   - Người xem xuất hiện bên bờ hồ với Avatar TikTok, tên hiển thị màu sắc theo cấp cần (`Lv1` ➔ `Lv10`) và tự động quăng câu.
   - **Chống Spam (Anti-Spam State Machine):** Khi người xem thả tim hoặc gõ `câu` liên tục trong lúc nhân vật đang quăng câu / chờ cá cắn / kéo cá, hệ thống chỉ cộng tối đa `+3 lượt chờ kế tiếp` và hiện tim bay (`❤️ +1`) thay vì spam bong bóng chữ hay làm lỗi hoạt ảnh.
2. **Follow Kênh ➔ Nâng Cấp Ngay Cần Trúc (Lv2 Vĩnh Viễn):**
   - Người xem mới bắt đầu ở **Cần Tre (Lv1)**.
   - Khi nhấn **Follow kênh** (hoặc đã là Follower khi tương tác), hệ thống tự động nâng lên **Cần Trúc (Lv2)** vĩnh viễn.
3. **Bình Luận `cần` / `!can` ➔ Kiểm Tra Trang Bị:**
   - Hiển thị bong bóng ngắn gọn trên đầu nhân vật: `🎣 LvX • Y/Z💎 • 🦐xN` (có chống spam cooldown `8 giây/người`).
4. **Tặng Quà (Donate/Gift) ➔ Tích Lũy Kim Cương (💎) Nâng 10 Cấp Cần Vĩnh Viễn & Mồi Cao Cấp:**
   - **10 Cấp Cần Câu Vĩnh Viễn (`Lv1` ➔ `Lv10`):** Lưu trữ bền vững trong SQLite Database qua mọi buổi Live (`Lv2`: Follow, `Lv3`: 10💎, `Lv4`: 50💎, `Lv5`: 150💎, `Lv6`: 400💎, `Lv7`: 1.000💎, `Lv8`: 2.500💎, `Lv9`: 6.000💎, `Lv10`: 15.000💎).
   - **Hệ Thống 6 Bậc Mồi (`T1` ➔ `T6`) & Giới Hạn Theo Cần (`capBait`):**
     - Mồi mặc định vô hạn (`T1 Giun đất` cho Cần Lv1–3, `T2 Cám thơm` cho Cần Lv4–6, `T3 Tôm tươi` cho Cần Lv7–10) được tự động ẩn trên UI để thoáng mắt; chỉ hiển thị icon + số lượt khi người chơi sở hữu **Mồi Trả Phí** cao hơn mồi mặc định.
     - Luôn ưu tiên dùng **mồi bậc cao nhất** hiện có trong kho và không bao giờ hạ xuống thấp hơn mồi mặc định của cấp cần.
   - **Phân Tầng Banner Thông Báo:** Quà nhỏ (`≤ 20💎` và không lên cấp cần) chỉ hiện bong bóng gọn trên đầu nhân vật (`+X💎 • 🦐xN`); quà lớn (`> 20💎`) hoặc **Lên Cấp Cần** mới bật Banner trung tâm màn hình.
5. **Hệ Thống 22 Loài Cá Theo 4 Mùa, Giới Hạn Cấp Cần & Bảo Hiểm Pity:**
   - Tự động xoay vòng 4 mùa (**Xuân 🌸 • Hạ ☀️ • Thu 🍂 • Đông ❄️**) mỗi `20 phút` với 4 loài cá Huyền Thoại độc quyền theo mùa (`★`).
   - **Cổng Cấp Cần & Sức Tải KG:** Cần cấp thấp (`Lv1–Lv2`) bị giới hạn tỉ lệ gặp cá Sử Thi / Huyền Thoại cực nhỏ và chịu phạt tỉ lệ sổng nếu gặp cá vượt ngưỡng tải an toàn (`ROD_MAX_SAFE_KG`), khuyến khích nâng cấp cần & dùng mồi xịn.
   - **Bảo Hiểm Nhân Phẩm (Pity):** Sau `10 lượt` liên tiếp chỉ trúng cá Thường/Phổ biến (hoặc sổng), lượt kế tiếp chắc chắn cắn câu cá từ bậc **Hiếm (Rare)** trở lên.
6. **3 Bảng Xếp Hạng Tự Động Xoay Vòng (15 giây/lần):**
   - 🏆 **KỶ LỤC CÁ NẶNG NHẤT:** Top trọng lượng (KG) lớn nhất của 1 con cá đơn lẻ + loài cá giữ kỷ lục.
   - 👑 **THỢ SĂN CÁ HIẾM:** Xếp hạng theo số lượng cá **👑 Huyền Thoại** và **✨ Sử Thi**.
   - ⚖️ **VUA LÀNG CHÀI:** Xếp hạng theo tổng trọng lượng (KG) và tổng số cá câu được.

---

## 🔌 Tích Hợp TikTok Live (`tiktok-live-connector`) & Độ Ổn Định

Service kết nối tại [`src/server/tiktokService.ts`](./src/server/tiktokService.ts) đã được chuẩn hóa theo tài liệu chính thức của `tiktok-live-connector`:
- **Tự động kết nối lại (Auto-Reconnect):** Khi WebSocket của TikTok bị ngắt tạm thời giữa phiên Live (`disconnected`), hệ thống tự động thử kết nối lại tối đa `8 lần` với độ trễ tăng dần (`3.5s ➔ 15s`) mà không làm gián đoạn trạng thái hồ câu.
- **Chống cộng trùng Combo Quà (`giftType === 1` & Deduplication):** Chỉ xử lý gói quà combo khi `repeatEnd === true` kết hợp bộ lọc chống trùng lặp `groupId / msgId` trong 60 giây, đồng thời hỗ trợ đọc `diamondCount` dự phòng từ `extendedGiftInfo`.
- **Chuẩn hóa tiếng Việt (Unicode NFC):** Tự động chuẩn hóa bình luận tiếng Việt từ bàn phím iOS/Android (`"câu"`, `"cần"`) và bọc `try/catch` cô lập lỗi cho toàn bộ sự kiện (`like`, `follow`, `social`, `gift`, `chat`, `error`).

---

## 🚀 Cách Chạy Dự Án

### 1. Chạy chế độ phát triển (Server + Giao diện Game)
```bash
npm run dev
```
- **Giao diện Game (Frontend để bắt cửa sổ OBS / TikTok Live Studio):** `http://localhost:5173`
- **Backend Server & Socket.IO:** `http://localhost:5050`

### 2. Chạy kiểm thử tự động (Unit Test Engine & Anti-Spam)
```bash
npm test
```

---

## 🎥 Hướng Dẫn Phát Lên TikTok Live Studio / OBS

1. Mở trình duyệt vào `http://localhost:5173`.
2. Ở bảng **Host Control & Simulator** bên phải:
   - Chọn tỷ lệ khung hình **Dọc 9:16 (TikTok)** hoặc **Ngang 16:9**.
   - Nhập `@username` kênh TikTok đang phát Live của bạn và bấm **Kết nối** (hoặc dùng ngay các nút giả lập để test offline).
3. Bấm nút **X** ở góc trên bảng điều khiển để ẩn bảng điều khiển khi quay màn hình Live.
