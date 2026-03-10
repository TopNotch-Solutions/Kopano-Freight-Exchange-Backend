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
    origin: ["http://localhost:3000", "http://41.219.71.112:8080"],
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
  },
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());
app.use(express.static("public"));
app.use(
  cors({
    origin: ["http://localhost:3000", "http://4:1.219.71.112:8080", "https://dt.mtc.com.na:4000"],
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true,
    exposedHeaders: ["Authorization", "x-access-token", "data-access-token"],
  })
);

const authRoute = require("./src/common/routes/authRoute");


app.use("/api/auth", authRoute);

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