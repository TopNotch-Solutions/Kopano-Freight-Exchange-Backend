const express = require("express");
const bodyParser = require("body-parser");
const sequelize = require("./src/config/database");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Op } = require("sequelize");
require("dotenv").config();
const { Server } = require("socket.io");


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
  },
});

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());
app.use(express.static("uploads"));
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true,
    exposedHeaders: ["Authorization", "x-access-token", "data-access-token"],
  })
);

const notificationRoute = require("./src/common/routes/notificationRoute");
const authRoute = require("./src/common/routes/authRoute");
const loadRoute = require("./src/shipper/routes/loadRoute");
const loadAssignmentRoute = require("./src/carrier/routes/loadRoute");


app.use("/api/notifications", notificationRoute);

app.use("/api/auth", authRoute);
app.use("/api/load-assignments", loadAssignmentRoute);

app.use("/api/loads", loadRoute);

sequelize
  .sync()
  .then(() => {
    console.log("Database connected");
    const PORT = process.env.PORT;
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error synchronizing database:", error);
  });