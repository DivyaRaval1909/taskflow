
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB before starting Express
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`TaskFlow API running on port ${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`${signal} received. Closing server...`);

      server.close(async () => {
        try {
          const mongoose = require("mongoose");

          await mongoose.connection.close();

          console.log("MongoDB connection closed.");
          process.exit(0);
        } catch (error) {
          console.error("Shutdown error:", error.message);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
