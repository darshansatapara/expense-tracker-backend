import axios from "axios";
import CurrencyDailyRateModel from "../../models/CommonModel/CurrencyDailyRatesModel.js";
import { AdminCurrencyCategory } from "../../models/AdminModel/AdminCategoryModels.js";
import dotenv from "dotenv";
dotenv.config();

const CURRENCYBEACON_API_KEY = process.env.CURRENCYBEACON_API_KEY;
const API_URL = "https://api.currencybeacon.com/v1/historical";

// Function to fetch latest currency rates from CurrencyBeacon API

const fetchCurrencyRates = async (date) => {
  try {
    const formattedDate = date.split("-").reverse().join("-"); // Convert DD-MM-YYYY to YYYY-MM-DD
    console.log(`🔄 Fetching currency rates for ${date}...`);

    const response = await axios.get(
      `${API_URL}?api_key=${CURRENCYBEACON_API_KEY}&date=${formattedDate}`
    );

    if (response.data && response.data.rates) {
      return response.data.rates;
    } else {
      throw new Error("Invalid response from CurrencyBeacon API.");
    }
  } catch (error) {
    console.error("❌ Error fetching exchange rates:", error.message);
    return null;
  }
};

// Function to store currency rates into the admin database
const storeRates = async (adminDbConnection, date) => {
  const CurrencyRateModel = CurrencyDailyRateModel(adminDbConnection);

  const today = new Date(date.split("-").reverse().join("-"));
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-12
  const day = today.getDate();

  const formattedDate = date;

  const startMonth = `01-${month.toString().padStart(2, "0")}-${year}`;
  const endMonth =
    new Date(year, month, 0).getDate().toString().padStart(2, "0") +
    `-${month.toString().padStart(2, "0")}-${year}`;

  let currencyRate = await CurrencyRateModel.findOne({ year: year.toString() });

  if (!currencyRate) {
    currencyRate = new CurrencyRateModel({
      year: year.toString(),
      months: [
        {
          startMonth,
          endMonth,
          days: [{ date: formattedDate, rates: [] }],
        },
      ],
    });
  } else {
    let monthData = currencyRate.months.find(
      (m) => m.startMonth === startMonth
    );

    if (!monthData) {
      currencyRate.months.push({
        startMonth,
        endMonth,
        days: [{ date: formattedDate, rates: [] }],
      });
    } else {
      let dayData = monthData.days.find((d) => d.date === formattedDate);
      if (dayData) {
        console.log(
          `✅ Rates for ${formattedDate} already exist. Skipping update.`
        );
        return;
      } else {
        monthData.days.push({ date: formattedDate, rates: [] });
      }
    }
  }

  const rates = await fetchCurrencyRates(formattedDate);
  if (!rates) return;

  const currencyDocs = await AdminCurrencyCategory(adminDbConnection).find({
    currency: { $in: Object.keys(rates) },
  });

  const mappedRates = currencyDocs.map((currency) => ({
    currency: currency._id,
    value: rates[currency.currency].toString(),
  }));

  currencyRate.months.forEach((month) => {
    month.days.forEach((day) => {
      if (day.date === formattedDate) {
        day.rates = mappedRates;
      }
    });
  });

  await currencyRate.save();
  console.log(`✅ Currency rates for ${formattedDate} stored successfully.`);
};

export const getCurrencyRatesByDate =
  (adminDbConnection) => async (req, res) => {
    try {
      const { date } = req.body;

      if (!date || !/^\d{2}-\d{2}-\d{4}$/.test(date)) {
        return res.status(400).json({
          success: false,
          message: "Invalid or missing date format. Expected DD-MM-YYYY.",
        });
      }

      const [day, month, year] = date.split("-");
      const CurrencyRateModel = CurrencyDailyRateModel(adminDbConnection);

      const currencyRate = await CurrencyRateModel.findOne({ year }).populate({
        path: "months.days.rates.currency",
        model: AdminCurrencyCategory(adminDbConnection),
        select: "symbol name",
      });

      if (!currencyRate) {
        return res
          .status(404)
          .json({ success: false, message: "Rates not found for this year." });
      }

      const monthData = currencyRate.months.find(
        (m) => m.startMonth === month || m.endMonth === month
      );
      if (!monthData) {
        return res
          .status(404)
          .json({ success: false, message: "Rates not found for this month." });
      }

      const dayData = monthData.days.find((d) => d.date === date);
      if (!dayData) {
        return res
          .status(404)
          .json({ success: false, message: "Rates not found for this date." });
      }

      res.status(200).json({ success: true, data: dayData });
    } catch (error) {
      console.error("Error fetching currency rates by date:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  };

export const getCurrencyRatesByMonthRange =
  (adminDbConnection) => async (req, res) => {
    try {
      const { startDate, endDate } = req.body;

      if (
        !startDate ||
        !endDate ||
        !/^\d{2}-\d{2}-\d{4}$/.test(startDate) ||
        !/^\d{2}-\d{2}-\d{4}$/.test(endDate)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid or missing date format. Expected DD-MM-YYYY.",
        });
      }

      const [startDay, startMonth, startYear] = startDate.split("-");
      const [endDay, endMonth, endYear] = endDate.split("-");

      if (startYear !== endYear) {
        return res.status(400).json({
          success: false,
          message: "Start and End dates must be in the same year.",
        });
      }

      const CurrencyRateModel = CurrencyDailyRateModel(adminDbConnection);
      const currencyRate = await CurrencyRateModel.findOne({
        year: startYear,
      }).populate({
        path: "months.days.rates.currency",
        model: AdminCurrencyCategory(adminDbConnection),
        select: "symbol name",
      });

      if (!currencyRate) {
        return res
          .status(404)
          .json({ success: false, message: "Rates not found for this year." });
      }

      const filteredMonths = currencyRate.months.filter(
        (monthData) =>
          monthData.startMonth === startDate && monthData.endMonth === endDate
      );

      if (!filteredMonths.length) {
        return res
          .status(404)
          .json({ success: false, message: "Rates not found for this range." });
      }

      res.status(200).json({ success: true, data: filteredMonths });
    } catch (error) {
      console.error("Error fetching currency rates by month range:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  };


export default storeRates;
