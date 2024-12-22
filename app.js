const fs = require("fs");
const path = require("path");
require("dotenv").config();

const express = require("express");

const app = express();

const sequelize = require("./util/database.js");
const cors = require("cors");
const Users = require("./models/users.js");
const Expenses = require("./models/expenses.js");
const Orders = require("./models/order.js");
const Downloads = require("./models/downloads.js");
const compression = require("compression");

const userRoutes = require("./routes/user.js");
const loginSignupRoutes = require("./routes/login_signUp.js");
const purchaseRoutes = require("./routes/purchase.js");
const premiumRoutes = require("./routes/premium.js");
const reportRoutes = require("./routes/report.js");

app.use(compression()); // for compressing css and js files mainly, image files are not compressed.
app.use(cors());
app.use(express.json());

app.use("/auth", loginSignupRoutes);
app.use("/user", userRoutes);
app.use("/purchase", purchaseRoutes);
app.use("/premium", premiumRoutes);
app.use("/report", reportRoutes);

app.use((req, res) => {
  res.sendFile(path.join(__dirname, `public/${req.url}`));
});

Users.hasMany(Expenses);
Users.hasMany(Orders);
Users.hasMany(Downloads);

sequelize
  .sync()
  .then(() => app.listen(3000))
  .catch((err) => console.log(err));
