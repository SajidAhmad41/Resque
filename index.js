const express = require("express");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const session = require("express-session");
const path = require("path");

const serviceAccount = require("./auth.json");
let firebaseInitialized = false;

if (!firebaseInitialized) {
    admin.initializeApp({
        credential: admin.cert(serviceAccount),
    });
    firebaseInitialized = true;
}

const app = express();
const port = process.env.PORT || 3000;
const firestore = getFirestore();

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
    session({
        secret: process.env.SESSION_SECRET || "rapidrescue_secret",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 * 8 },
    })
);

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.get("/", (req, res) => {
    if (req.session.user) {
        return res.redirect("/dashboard");
    }
    res.redirect("/choosing");
});

app.get("/choosing", (req, res) => {
    res.render("choosing", { user: req.session.user || null });
});

app.get("/signup", (req, res) => {
    res.render("signup", { error: null });
});

app.post("/signup", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).render("signup", { error: "Email and password are required." });
    }

    try {
        const userRecord = await admin.auth().createUser({ email, password });
        req.session.user = { uid: userRecord.uid, email: userRecord.email };
        req.session.save(() => res.redirect("/dashboard"));
    } catch (error) {
        console.error("Signup Error:", error.message);
        res.status(400).render("signup", { error: error.message });
    }
});

app.get("/login", (req, res) => {
    res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).render("login", { error: "Email and password are required." });
    }

    try {
        const user = await admin.auth().getUserByEmail(email);
        req.session.user = { uid: user.uid, email: user.email };
        req.session.save(() => res.redirect("/dashboard"));
    } catch (error) {
        console.error("Login Error:", error.message);
        res.status(400).render("login", { error: error.message });
    }
});

app.get("/dashboard", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.render("dashboard", { user: req.session.user });
});

app.get("/volunteerdata", (req, res) => {
    res.render("volunteerdata", { user: req.session.user || null });
});

app.post("/volunteerdata", async (req, res) => {
    const { fullName, email, phone, address } = req.body;

    if (!fullName || !email || !phone) {
        return res.status(400).json({ success: false, message: "Full name, email, and phone are required." });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    try {
        const volunteerRef = await firestore.collection("volunteers").add({
            fullName,
            email,
            phone,
            address: address || "",
            createdAt: new Date().toISOString(),
        });

        res.status(201).json({
            success: true,
            message: "Volunteer information saved successfully.",
            volunteerId: volunteerRef.id,
        });
    } catch (error) {
        console.error("Volunteer submission failed:", error.message);
        res.status(500).json({ success: false, message: "Volunteer submission failed. Please try again later." });
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
