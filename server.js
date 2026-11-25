require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const db = require("./store");

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.static("public"));
app.use("/api", rateLimit({windowMs: 60_000, limit: 90}));
app.use(express.json({limit:"30kb"}));

const required = ["ADMIN_USERNAME","ADMIN_PASSWORD_HASH","JWT_SECRET"];
for (const k of required) if (!process.env[k] || process.env[k].startsWith("REPLACE_")) {
  console.warn(`CONFIG REQUIRED: ${k}`);
}
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET}) : null;

function admin(req,res,next){
  try {
    const token=(req.headers.authorization||"").replace(/^Bearer /,"");
    const data=jwt.verify(token,process.env.JWT_SECRET);
    if(data.role!=="admin") throw new Error("role");
    next();
  } catch { res.status(401).json({error:"Admin login required"}); }
}
app.post("/api/admin/login", async (req,res)=>{
  const {username,password}=req.body||{};
  if(username!==process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH ||
     !(await bcrypt.compare(password||"",process.env.ADMIN_PASSWORD_HASH)))
    return res.status(401).json({error:"Invalid login"});
  res.json({token:jwt.sign({role:"admin"},process.env.JWT_SECRET,{expiresIn:"4h"})});
});
app.get("/api/storefront", (req,res)=>{
  const settings=db.prepare("SELECT key,value FROM settings").all();
  const s=Object.fromEntries(settings.map(x=>[x.key,x.value]));
  res.json({rate:Number(s.rate||0),stock:db.prepare("SELECT COUNT(*) n FROM inventory WHERE sold=0").get().n,
    contacts:{whatsapp:s.whatsapp||"",instagram:s.instagram||"",telegram:s.telegram||""}});
});
app.get("/api/admin/inventory",admin,(req,res)=>{
  res.json(db.prepare("SELECT id,login_id,sold,created_at FROM inventory ORDER BY id DESC").all());
});
app.post("/api/admin/inventory",admin,(req,res)=>{
  const {loginId,password}=req.body||{};
  if(!loginId||!password||String(loginId).length>30||String(password).length>100)
    return res.status(400).json({error:"Valid ID and password required"});
  try {
    db.prepare("INSERT INTO inventory(login_id,password) VALUES(?,?)").run(String(loginId),String(password));
    res.json({ok:true});
  } catch {res.status(409).json({error:"ID already exists"});}
});
app.put("/api/admin/settings",admin,(req,res)=>{
  const allowed=["rate","whatsapp","instagram","telegram"];
  const put=db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
  const tx=db.transaction(obj=>{for(const k of allowed) if(obj[k]!==undefined) put.run(k,String(obj[k]));});
  tx(req.body||{}); res.json({ok:true});
});
app.get("/api/admin/orders",admin,(req,res)=>{
  res.json(db.prepare("SELECT id,quantity,amount,status,created_at FROM orders ORDER BY id DESC").all());
});
app.post("/api/orders",async(req,res)=>{
  try {
    if(!razorpay) return res.status(503).json({error:"Payment gateway is not configured yet"});
    const quantity=Number(req.body?.quantity);
    if(!Number.isInteger(quantity)||quantity<1||quantity>100) return res.status(400).json({error:"Quantity must be 1–100"});
    const rate=Number(db.prepare("SELECT value FROM settings WHERE key='rate'").get()?.value||0);
    const stock=db.prepare("SELECT COUNT(*) n FROM inventory WHERE sold=0").get().n;
    if(rate<=0) return res.status(503).json({error:"Admin has not set the ID price"});
    if(stock<quantity) return res.status(409).json({error:"Insufficient stock"});
    const amount=rate*quantity;
    const order=db.prepare("INSERT INTO orders(quantity,amount,status) VALUES(?,?,'created')").run(quantity,amount);
    const rp=await razorpay.orders.create({amount:amount*100,currency:"INR",receipt:`mbs_${order.lastInsertRowid}`});
    db.prepare("UPDATE orders SET gateway_order_id=? WHERE id=?").run(rp.id,order.lastInsertRowid);
    res.json({orderId:order.lastInsertRowid,gatewayOrderId:rp.id,amount,currency:"INR",keyId:process.env.RAZORPAY_KEY_ID});
  } catch(e){console.error(e);res.status(500).json({error:"Could not create payment order"});}
});
// Configure this endpoint as a Razorpay webhook. Fulfilment occurs only after a valid signature.
app.post("/api/payments/razorpay-webhook",express.raw({type:"application/json"}),(req,res)=>{
  const secret=process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature=req.headers["x-razorpay-signature"];
  if(!secret||!signature) return res.status(400).send("Webhook not configured");
  const expected=crypto.createHmac("sha256",secret).update(req.body).digest("hex");
  if(!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(signature))) return res.status(400).send("Invalid signature");
  const event=JSON.parse(req.body.toString());
  if(event.event==="order.paid"){
    const gatewayId=event.payload?.order?.entity?.id;
    const order=db.prepare("SELECT * FROM orders WHERE gateway_order_id=?").get(gatewayId);
    if(order && order.status!=="paid"){
      const fulfill=db.transaction(()=>{
        const ids=db.prepare("SELECT id FROM inventory WHERE sold=0 ORDER BY id LIMIT ?").all(order.quantity);
        if(ids.length!==order.quantity) throw new Error("Stock changed before fulfilment");
        const mark=db.prepare("UPDATE inventory SET sold=1,order_id=? WHERE id=?");
        ids.forEach(x=>mark.run(order.id,x.id));
        db.prepare("UPDATE orders SET status='paid' WHERE id=?").run(order.id);
      });
      try{fulfill();}catch(e){console.error("Fulfilment needs admin review:",e.message);}
    }
  }
  res.json({received:true});
});
app.get("/health",(req,res)=>res.json({ok:true}));
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`Mithun Bhai Service listening on ${port}`));
