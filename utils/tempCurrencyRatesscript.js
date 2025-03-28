import axios from "axios";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectAdminDatabase } from "../config/database.js";
import { AdminCurrencyCategory } from "../models/AdminModel/AdminCategoryModels.js";
import CurrencyDailyRateModel from "../models/CommonModel/CurrencyDailyRatesModel.js";

dotenv.config(); // Load environment variables

const CURRENCYBEACON_API_KEY = process.env.CURRENCYBEACON_API_KEY; // Use your actual API key
const API_URL = "https://api.currencybeacon.com/v1/historical";

// Format date as "DD-MM-YYYY"
const formatDate = (date) => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

// Convert "DD-MM-YYYY" to "YYYY-MM-DD" (for CurrencyBeacon API)
const convertToAPIDate = (dateString) => {
  const [day, month, year] = dateString.split("-");
  return `${year}-${month}-${day}`;
};

// Get all dates in the last month
const getAllDatesInLastMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const lastMonth = now.getMonth() - 1;

  // If current month is January, last month should be December of previous year
  const firstDay =
    lastMonth === -1 ? new Date(year - 1, 11, 1) : new Date(year, lastMonth, 1);
  const lastDay =
    lastMonth === -1
      ? new Date(year - 1, 11, 31)
      : new Date(year, lastMonth + 1, 0);

  let dates = [];
  for (let d = firstDay; d <= lastDay; d.setDate(d.getDate() + 1)) {
    dates.push(formatDate(new Date(d))); // Store in "DD-MM-YYYY"
  }
  return dates;
};

// Fetch exchange rates for a specific date
const fetchCurrencyRates = async (date) => {
  try {
    const apiDate = convertToAPIDate(date);
    console.log(`🔄 Fetching currency rates for ${date}...`);

    const response = await axios.get(
      `${API_URL}?api_key=${CURRENCYBEACON_API_KEY}&date=${apiDate}`
    );

    if (response.data && response.data.rates) {
      return response.data.rates; // Return exchange rates
    } else {
      throw new Error("Invalid response from CurrencyBeacon API.");
    }
  } catch (error) {
    console.error(
      `❌ Error fetching exchange rates for ${date}:`,
      error.message
    );
    return null;
  }
};

// Store exchange rates for the last month
const storeLastMonthRates = async (adminDbConnection) => {
  const today = new Date();
  const year = today.getFullYear();
  let lastMonth = today.getMonth() - 1;

  if (lastMonth === -1) {
    lastMonth = 11; // If current month is Jan, last month should be Dec
  }

  const lastYear = lastMonth === 11 ? year - 1 : year;
  const formattedYear = lastYear.toString();

  const CurrencyRateModel = CurrencyDailyRateModel(adminDbConnection);

  let currencyRate = await CurrencyRateModel.findOne({ year: formattedYear });

  if (!currencyRate) {
    currencyRate = new CurrencyRateModel({
      year: formattedYear,
      months: [
        {
          startMonth: formatDate(new Date(lastYear, lastMonth, 1)),
          endMonth: formatDate(new Date(lastYear, lastMonth + 1, 0)),
          days: [],
        },
      ],
    });
  }

  let monthData = currencyRate.months.find(
    (m) => m.startMonth === formatDate(new Date(lastYear, lastMonth, 1))
  );

  if (!monthData) {
    monthData = {
      startMonth: formatDate(new Date(lastYear, lastMonth, 1)),
      endMonth: formatDate(new Date(lastYear, lastMonth + 1, 0)),
      days: [],
    };
    currencyRate.months.push(monthData);
  }

  const existingDates = monthData.days.map((d) => d.date);
  const allDates = getAllDatesInLastMonth();
  const newDates = allDates.filter((d) => !existingDates.includes(d));

  if (newDates.length === 0) {
    console.log("✅ All dates for last month already have exchange rates.");
    return;
  }

  console.log(`🔄 Fetching rates for ${newDates.length} missing days...`);

  for (const date of newDates) {
    const rates = await fetchCurrencyRates(date);
    if (!rates) continue;

    // Fetch matching currencies from AdminCurrencyCategory
    const currencyDocs = await AdminCurrencyCategory(adminDbConnection).find({
      currency: { $in: Object.keys(rates) },
    });

    const mappedRates = currencyDocs.map((currency) => ({
      currency: currency._id,
      value: rates[currency.currency].toString(),
    }));

    monthData.days.push({ date, rates: mappedRates });
  }

  await currencyRate.save();
  console.log(`✅ Exchange rates stored for ${newDates.length} days.`);
};

// ** Main function to run the job every 1 minute **
const startFetchingRates = async () => {
  console.log("🚀 Connecting to Admin Database...");
  const adminDbConnection = await connectAdminDatabase();

  if (!adminDbConnection) {
    console.error("❌ Failed to connect to Admin Database. Exiting...");
    process.exit(1);
  }

  console.log("✅ Connected to Admin Database!");

  await storeLastMonthRates(adminDbConnection);
 
};

// Run the script
startFetchingRates();
