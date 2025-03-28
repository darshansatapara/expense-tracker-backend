import CurrencyDailyRateModel from "../models/CommonModel/CurrencyDailyRatesModel.js";

export const getExchangeRate = async (dbConnection, date, currencyId) => {
  if (!currencyId) return null;

  const CurrencyRateModel = CurrencyDailyRateModel(dbConnection);
  const [day, month, year] = date.split("-");
  const rateData = await CurrencyRateModel.findOne({ year });

  if (!rateData) return null;

  const monthData = rateData.months.find(
    (m) => m.startMonth.includes(month) || m.endMonth.includes(month)
  );
  if (!monthData) return null;

  const dayData = monthData.days.find((d) => d.date === date);
  if (!dayData || !dayData.rates.length) return null;

  const currencyRate = dayData.rates.find(
    (r) => r.currency.toString() === currencyId.toString()
  );

  return currencyRate ? parseFloat(currencyRate.value) : null;
};

export const userExpenseAmountCurrencyConverter = async (
  adminDbConnection,
  date,
  amount,
  expenseCurrencyId,
  defaultCurrencyId
) => {
  if (!expenseCurrencyId || !defaultCurrencyId) return "Unavailable";

  // If both currencies are the same, return the amount directly
  if (expenseCurrencyId.toString() === defaultCurrencyId.toString()) {
    return parseFloat(amount).toFixed(2);
  }

  try {
    // Fetch exchange rates for the expense currency and default currency (both against USD)
    const [expenseToUsdRate, defaultToUsdRate] = await Promise.all([
      getExchangeRate(adminDbConnection, date, expenseCurrencyId), // Expense currency → USD
      getExchangeRate(adminDbConnection, date, defaultCurrencyId), // Default currency → USD
    ]);

    // Ensure both rates exist before proceeding
    if (!expenseToUsdRate || !defaultToUsdRate) return "Unavailable";

    // Step 1: Convert amount from expense currency to USD
    const amountInUsd = parseFloat(amount) / expenseToUsdRate;

    // Step 2: Convert amount from USD to the default currency
    const convertedAmount = (amountInUsd * defaultToUsdRate).toFixed(2);

    return convertedAmount;
  } catch (error) {
    console.error("Error in currency conversion:", error);
    return "Unavailable";
  }
};
