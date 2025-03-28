import express from "express";
import dotenv from "dotenv";

// Database imports
import {
  connectUserDatabase,
  connectAdminDatabase,
} from "./config/database.js";

import cors from "cors";

// Routes
import userAuthRoute from "./routes/UserRoutes/userAuthRoutes.js";
import userExpenseRoute from "./routes/UserRoutes/userExpenseRoutes.js";
import userIncomeRoute from "./routes/UserRoutes/userIncomeRoutes.js";
import otpRoute from "./routes/CommonRoute/otpRoutes.js";
import adminCategoryRoutes from "./routes/AdminRoutes/adminCategoryRoutes.js";
import userCategoryRoute from "./routes/UserRoutes/userCategoryRoutes.js";
import userProfileRoute from "./routes/UserRoutes/userProfileRoutes.js";
import { CurrencyDailyRateJob } from "./jobs/currencyDailyRateJob.js";
import currencyRateRoute from "./routes/CommonRoute/currencyDailyRateRoute.js";

dotenv.config(); // Load environment variables

(async () => {
  try {
    const userDbConnection = await connectUserDatabase();
    const adminDbConnection = await connectAdminDatabase();

    if (!userDbConnection || !adminDbConnection) {
      console.error("Error connecting to the databases.");
      process.exit(1);
    }
    const app = express();

    // Middleware
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ limit: "10mb", extended: true }));
    app.use(cors());

    // User Routes*********************************************************
    app.use("/api/otp", otpRoute);
    app.use("/api/auth", userAuthRoute(userDbConnection)); // Pass the user database connection to routes
    app.use(
      "/api/expense",
      userExpenseRoute(userDbConnection, adminDbConnection)
    );
    app.use(
      "/api/income",
      userIncomeRoute(userDbConnection, adminDbConnection)
    );
    app.use(
      "/api/usercategories",
      userCategoryRoute(userDbConnection, adminDbConnection)
    );
    app.use(
      "/api/userprofile",
      userProfileRoute(userDbConnection, adminDbConnection)
    );

    // Admin-specific routes (if any)****************************************************************
    app.use(
      "/api/admincategories",
      adminCategoryRoutes(adminDbConnection, userDbConnection)
    );

    //currency rate routes (if any)****************************************************************
    // Register currencyRateRoute with the app
    app.use("/api/currencyrate", currencyRateRoute(adminDbConnection));
    // Schedule the currency update job
    CurrencyDailyRateJob(adminDbConnection);

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error initializing server:", error);
    process.exit(1);
  }
})();
