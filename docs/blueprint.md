Cloud Functions — functions/src/
TypeScript · firebase-functions v6.6 · Secrets via defineSecret()
createMidtransTransaction
onCall · midtrans.ts
Buat Snap token · simpan midtransRedirectUrl + expiryTime ke Firestore
handleMidtransNotification
onRequest (webhook)
Terima notif Midtrans · update paymentStatus + status order
checkExpiredOrders
onSchedule · tiap 1 jam
Sweep pending_payment > 24 jam → failed + Cancelled · sudah deployed ✅
searchBiteshipArea
onCall · biteship.ts
Autocomplete kota/kode pos via Biteship Maps API
getBiteshipRates
onCall · Mix Rates
Origin dari Firestore settings/store · reguler + instan sekaligus
createBiteshipOrder
onCall · admin only
Booking pickup kurir · update waybillId + trackingUrl
trackBiteshipOrder
onCall
Ambil history tracking resi · sync status ke Firestore
biteshipWebhook
onRequest (webhook)
Status update otomatis dari Biteship → update order Firestore
External Services
Integrasi pihak ketiga via Cloud Functions
Midtrans
Snap payment gateway · GoPay, QRIS, VA, Indomaret · expiry 24 jam · webhook settlement/expire/cancel
Payment
Biteship
Mix Rates API · JNE, J&T, SiCepat, GoSend, Grab, Paxel · Area search · Order + tracking
Shipping
Google Maps
Flutter: LocationPickerScreen · reverse geocode · koordinat GPS alamat pembeli
GPS
Alur Order & Pembayaran
1 · Checkout
Pilih alamat → FAST PATH area ID → fetchBiteshipRates → pilih kurir
2 · Buat Order
processOrder() → Firestore orders/{id} · status: Pending · paymentStatus: Unpaid
3 · Midtrans
createMidtransTransaction() → Snap token + redirectUrl + expiryTime disimpan
4 · WebView
Android: WebView intercept URL · Web: url_launcher + Firestore stream
5 · Webhook
Midtrans → handleMidtransNotification → update paymentStatus Firestore
Hasil pembayaran:
✓ Paid
→ paymentStatus=paid · status=Processing → Tab Belum Proses
⏳ Tutup
→ paymentStatus=pending_payment → Tab Belum Bayar · bisa bayar ulang
✕ Expire
→ webhook expire / checkExpiredOrders → failed + Cancelled → Tab Dibatalkan
Alur Pengiriman Biteship
1 · Simpan Alamat
biteshipDestinationAreaId + koordinat GPS → Firestore users/{uid}/addresses
2 · Cek Ongkir
FAST PATH: area ID dari Firestore → getBiteshipRates (Mix Rates) → tampil di checkout
3 · Order Pending
Pengiriman TIDAK dipanggil dari Flutter. Admin Gallery-POS-Web yang trigger
4 · Admin Booking
createBiteshipOrder() → origin dari settings/store → waybillId + trackingUrl
5 · Tracking
Webhook Biteship → update status · Pembeli: tombol Lacak → riwayat tracking inline
Firestore — Field Kunci
orders/{orderId}
paymentStatus
string
paid · pending_payment · failed · cancelled
status
string
Pending · Processing · Dikirim · Selesai · Cancelled
midtransRedirectUrl
string
URL bayar ulang dari tab Belum Bayar
midtransExpiryTime
Timestamp
now + 24 jam · dibaca checkExpiredOrders
biteshipOrderId
string
diisi admin setelah booking kurir
waybillId
string
nomor resi untuk tracking
destinationLatitude/Longitude
number
koordinat GPS pembeli
users/{uid}/addresses/{id}
biteshipDestinationAreaId
string
FAST PATH — skip searchArea() di checkout
biteshipDestinationAreaName
string
label tampilan kecamatan tujuan
latitude / longitude
double
GPS dari LocationPickerScreen
postalCode
string
prioritas pencarian area Biteship
settings/store
biteshipOriginAreaId
string
dibaca getStoreOrigin() Cloud Function
biteshipOriginLatitude/Longitude
number
koordinat toko → kurir instan Mix Rates
storeContactName/Phone
string
label pengirim di Biteship order

8 Cloud Functions yang sudah deployed — 3 Midtrans, 5 Biteship — semua di region asia-southeast1 dan menggunakan Secrets Manager.
Inovasi teknis utama yang kita selesaikan:

FAST PATH checkout: biteshipDestinationAreaId tersimpan di Firestore alamat → skip searchArea() → langsung fetchBiteshipRates() — inilah yang membuat Android berfungsi
_toStringDynamic() helper — menyelesaikan Map<Object?,Object?> vs Map<String,dynamic> yang menyebabkan Android silent fail
Platform-aware payment: WebView untuk Android, url_launcher + Firestore stream untuk Chrome
Origin Biteship dibaca dari settings/store Firestore (bukan hardcoded secrets) — bisa diubah admin tanpa redeploy
checkExpiredOrders scheduled function sebagai backup sweeper order expire 24 jam

