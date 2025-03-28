import mongoose from "mongoose";
const currencyRateSchema = new mongoose.Schema({
  year: { type: String, required: true },
  months: [
    {
      startMonth: { type: String, required: true },
      endMonth: { type: String, required: true },
      days: [
        {
          date: { type: String, required: true },
          rates: [
            {
              currency: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "AdminCurrencyCategory",
                required: true,
              },
              value: { type: String, required: true },
            },
          ],
        },
      ],
    },
  ],
});

const CurrencyDailyRateModel = (adminDbConnection) => {
  return adminDbConnection.model("CurrencyDailyRate", currencyRateSchema);
};
export default CurrencyDailyRateModel;
