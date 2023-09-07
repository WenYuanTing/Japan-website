const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const passport = require("passport");
const path = require("path");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LocalStrategy = require("passport-local");

const session = require("express-session");
const User = require("./models/user.model");
const Travel = require("./models/travel-model");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const notifier = require("node-notifier");
function handleEmailSentSuccess() {
  // 使用 node-notifier 顯示通知
  notifier.notify({
    title: "成功",
    message: "郵件已成功寄送！",
  });
}
mongoose
  .connect("mongodb://127.0.0.1:27017/JapanTravelDB")
  .then(() => {
    console.log("成功連接到JapanTravelDB...");
  })
  .catch((e) => {
    console.log(e);
  });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(
  session({
    secret: process.env.SESSION, // 這個是用來加密 session 的秘密金鑰，可以隨意設定
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static("public"));
app.get("/app.js", (req, res) => {
  res.header("Content-Type", "application/javascript");
  // 在這裡傳送您的 app.js 檔案
  res.sendFile(__dirname + "/app.js");
});

app.use(express.static(path.join(__dirname, "../client")));

app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  next();
});

const authCheck = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    return res.redirect("/login");
  }
};

app.get("/", (req, res) => {
  res.render("index", {
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
  });
});

app.get("/signup", (req, res) => {
  res.render("signup", {
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
  });
});

app.get("/login", (req, res) => {
  res.render("login", {
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
  });
});

app.get("/logout", (req, res) => {
  req.logOut((err) => {
    if (err) return res.send(err);
    return res.redirect("/");
  });
});

app.get("/contact-us", (req, res) => {
  res.render("contact-us", {
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
  });
});

app.get("/book-a-travel", authCheck, (req, res) => {
  res.render("book-a-travel", {
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
  });
});

app.get("/booked-travel", authCheck, async (req, res) => {
  let traveFound = await Travel.find({ author: req.user._id });
  res.render("booked-travel", {
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
    travels: traveFound,
  });
});

app.get("/new-password", (req, res) => {
  res.render("new-password", {
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
  });
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

app.get(
  "/auth/google/redirect",
  passport.authenticate("google"),
  (req, res) => {
    console.log("進入 /auth/google 路由");
    console.log("isAuthenticated = " + req.isAuthenticated());

    // 登入成功，可以進行相應的處理
    return res.redirect("/"); // 導向首頁或其他頁面
  }
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:8080/auth/google/redirect",
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("進入Google Strategy區域");

      let foundUSer = await User.findOne({ googleID: profile.id }).exec();
      if (foundUSer) {
        console.log("使用者已經存在，無須存入資料庫");

        return done(null, foundUSer);
      } else {
        console.log("偵測到新用戶，需存入資料庫");
        let newUser = new User({
          name: profile.displayName,
          googleID: profile.id,
          thumbnail: profile.photos[0].value,
          email: profile.emails[0].value,
        });

        let saveUser = await newUser.save();
        console.log("成功創建新用戶");

        return done(null, saveUser);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("serializeUser..");
  console.log(user);
  // 這裡可以根據需要存儲使用者資訊到 session 中
  // 例如，存儲使用者的 ID
  done(null, user.id);
});

passport.deserializeUser(async (_id, done) => {
  console.log("deserializeUser...");
  let foundUser = await User.findOne({ _id });
  // 根據存儲在 session 中的資訊還原出使用者物件
  // 例如，使用傳入的 ID 去查詢使用者資料庫
  // 然後將使用者物件傳遞到 done

  done(null, foundUser);
});

app.post("/signup", async (req, res) => {
  console.log("註冊後進入signup");
  let { name, email, password } = req.body;

  let foundEmail = await User.findOne({ email }).exec();
  if (foundEmail) {
    req.flash(
      "error_msg",
      "信箱已經被註冊，請使用另一個信箱或者嘗試使用此信箱登入系統"
    );
    return res.redirect("/signup");
  }

  let hashedPassword = await bcrypt.hash(password, 12);
  let newUser = new User({ name, email, password: hashedPassword });
  await newUser.save();
  req.flash("success_msg", "恭喜註冊成功，現在可以登入系統了!");
  return res.redirect("/login");
});

app.post("/book-a-travel", async (req, res) => {
  console.log("送出預約行程表單");
  let {
    people,
    departDate,
    comebackDate,
    airline,
    destination,
    location,
    phoneNumber,
    budget,
    check,
    pickup,
    tips,
  } = req.body;
  console.log(req.body);
  let newTravel = new Travel({
    people,
    departDate,
    comebackDate,
    airline,
    destination,
    location,
    phoneNumber,
    budget,
    check,
    pickup,
    tips,
    author: req.user._id,
  });
  console.log(newTravel);
  await newTravel.save();
  return res.redirect("/booked-travel");
});

//------------------------------------------------------------------------

app.post("/submit-to-email", async (req, res) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.GMAIL_ACCOUNT, // 您的伺服器郵件帳號
      pass: process.env.GMAIL_PASSWORD, // 您的伺服器郵件密碼
    },
  });

  let { category, name, phoneNumber, email, orderNumber, suggess } = req.body;
  // 郵件內容
  const mailOptions = {
    from: "mhome86@gmail.com", // 寄件人地址
    to: "mhome86@yahoo.com.tw", // 收件人地址
    subject: name + "的" + category, // 郵件主題
    text:
      "來自 " +
      name +
      "的" +
      category +
      "問題\n" +
      "電子信箱 :" +
      email +
      "\n電話號碼 :" +
      phoneNumber +
      "\n 訂單編號 : " +
      orderNumber +
      "\n 建議 : " +
      suggess,
  };

  // 發送郵件
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("發送郵件時出現錯誤：", error);
    } else {
      console.log("郵件已成功發送：", info.response);
      handleEmailSentSuccess();
    }
  });

  return res.redirect("/");
});
//------------------------------------------------------------------------
app.post("/submit-to-email2", async (req, res) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.GMAIL_ACCOUNT, // 您的伺服器郵件帳號
      pass: process.env.GMAIL_PASSWORD, // 您的伺服器郵件密碼
    },
  });

  let {
    company,
    name,
    phone,
    Number,
    phoneNumber,
    email,
    topics,
    departDate,
    kind,
    days,
    destination,
    people,
    budget,
    check,
    pickup,
    tips,
  } = req.body;
  // 郵件內容
  const mailOptions = {
    from: "mhome86@gmail.com", // 寄件人地址
    to: "mhome86@yahoo.com.tw", // 收件人地址
    subject: company + "的" + name + "團體規劃問題", // 郵件主題
    text:
      "來自 " +
      company +
      "  " +
      name +
      " 的團體規劃問題\n" +
      "電子信箱 : " +
      email +
      "\n市話 : " +
      phone +
      Number +
      "\n電話號碼 :" +
      phoneNumber +
      "\n 旅遊主題 : " +
      topics +
      "\n 出發日期 : " +
      departDate +
      "\n 旅遊類型 : " +
      kind +
      "\n 旅遊天數 : " +
      days +
      "\n 旅遊地點 : " +
      destination +
      "\n 旅遊人數 : " +
      people +
      "\n 旅遊預算 : " +
      budget +
      "\n " +
      check +
      " 簽證、機場稅與兵檢\n" +
      pickup +
      " 機場接送\n" +
      tips +
      " 領隊導遊司機小費\n",
  };

  // 發送郵件
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("發送郵件時出現錯誤：", error);
    } else {
      console.log("郵件已成功發送：", info.response);
      handleEmailSentSuccess();
    }
  });

  return res.redirect("/");
});
//------------------------------------------------------------------------
app.post("/new-password", async (req, res) => {
  console.log("進入到忘記密碼");
  let { name, email, password } = req.body;

  let foundUser = await User.findOne({ name: name });
  let foundEmail = await User.findOne({ email: email });
  if (foundUser.email == email) {
    console.log("信箱比對成功，允許更改密碼");
    console.log("變更前密碼 : " + foundUser.password);

    let hashedPassword = await bcrypt.hash(password, 12);
    foundUser.password = hashedPassword;
    await foundUser.save();
    console.log("變更後密碼 : " + foundUser.password);

    req.flash("success_msg", "恭喜密碼更改成功，現在可以登入系統了!");
    return res.redirect("/login");
  } else {
    req.flash("error_msg", "姓名或信箱不正確，無法變更密碼");
    res.redirect("/new-password");
  }
});

//------------------------------------------------------------------------
passport.use(
  new LocalStrategy(async (username, password, done) => {
    console.log("進入passport local");
    let foundUser = await User.findOne({ email: username });
    if (foundUser) {
      let result = await bcrypt.compare(password, foundUser.password);
      if (result) {
        console.log("驗證成功");

        done(null, foundUser);
      } else {
        console.log("密碼錯誤");
        done(null, false);
      }
    } else {
      console.log("帳號錯誤");

      done(null, false);
    }
  })
);

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: "登入失敗，帳號或密碼不正確",
  }),
  (req, res) => {
    console.log("登入成功!");

    return res.redirect("/");
  }
);

app.listen(8080, () => {
  console.log("伺服器正在 port 8080 上面運行...");
});
