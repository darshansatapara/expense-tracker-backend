import express from "express";
import {
  getCurrencyRatesByDate,
  getCurrencyRatesByMonthRange,
} from "../../controllers/CommonController/currencyDailyRateController.js";

const currencyRateRoute = (adminDbConnection) => {
  if (!adminDbConnection) {
    throw new Error("Admin database connection is undefined");
  }

  const router = express.Router();

  // Get currency rates for a specific month or date
  router.get(
    "/currency-daily-rates-by-date",
    getCurrencyRatesByDate(adminDbConnection)
  );
  router.get(
    "/currency-daily-rates-by-month",
    getCurrencyRatesByMonthRange(adminDbConnection)
  );

  return router;
};

export default currencyRateRoute;
