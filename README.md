# मिथुन भाई सर्विस — शुरुआती backend

यह deploy-ready नहीं, बल्कि backend integration starter है। इसमें Express API, SQLite inventory/orders, admin login, rate/contact settings और Razorpay order creation/webhook verification का आधार है।

## चलाने का तरीका
1. Node.js 20+ इंस्टॉल करें।
2. `npm install`
3. `.env.example` की कॉपी `.env` बनाएं।
4. मजबूत `JWT_SECRET`, admin username और bcrypt password hash सेट करें।
5. `npm start` चलाएं और `http://localhost:3000` खोलें।

## जरूरी अधूरे काम
- Razorpay Checkout frontend जोड़ना और signature/payment verification को पूरा करना।
- Webhook endpoint को Razorpay Dashboard में configure करना।
- ग्राहक को खरीदी गई ID/Password सुरक्षित तरीके से दिखाने के लिए authenticated order-retrieval flow जोड़ना।
- Admin UI को API से जोड़ना, CSRF/session hardening, audit logs, backups, HTTPS, production hosting और security review।
- ID/password को plaintext में स्टोर करने के बजाय encryption-at-rest और access controls लागू करना।

**लाइव भुगतान न लें** जब तक ये काम पूरे, टेस्ट और security-reviewed न हों। `.env` या API secrets किसी से साझा न करें। केवल उन IDs को बेचें जिनकी बिक्री का अधिकार आपके पास है।
