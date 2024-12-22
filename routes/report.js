const express = require("express");
const reportController = require("../controllers/report");
const authMiddleware = require("../middlewares/auth");
const router = express.Router();

// router.post('/monthlyList', authMiddleware.authenticate, reportController.monthlyList);
// router.post('/download-monthly-list', authMiddleware.authenticate, reportController.downloadMonthlyList);
// router.get('/list-downloads', authMiddleware.authenticate, reportController.listDownloads);
// router.post('/add-to-downloads', authMiddleware.authenticate, reportController.addToDownloads);

const { Op } = require("sequelize");
const Expenses = require("../models/expenses");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3"); // AWS SDK v3
const Downloads = require("../models/downloads");

// AWS S3 client initialization
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.IAM_USER_KEY,
    secretAccessKey: process.env.IAM_USER_SECRET,
  },
});

// Function to upload data to S3
async function uploadToS3(data, filename) {
  const BUCKET_NAME = process.env.BUCKET_NAME;

  const params = {
    Bucket: BUCKET_NAME,
    Key: filename,
    Body: data,
    ACL: "public-read", // Makes the file publicly readable
  };

  try {
    const command = new PutObjectCommand(params);
    await s3.send(command);
    // Return the file URL
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
  } catch (error) {
    console.error("Error uploading to S3", error);
    throw error;
  }
}

// Monthly expenses list
exports.monthlyList = async (req, res) => {
  try {
    const selectedMonth = req.body.selectedMonth;
    const [year, month] = selectedMonth.split("-");

    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(year, month, 0);

    const totalRecords = await Expenses.count({
      where: {
        userId: req.user.id,
        date: {
          [Op.between]: [startDate, endDate], // Filter by date range
        },
      },
    });

    const page = req.query.page || 1;
    const perPage = req.query.perPage || 10;

    const expensesForSelectedMonth = await Expenses.findAll({
      where: {
        userId: req.user.id,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [["date", "ASC"]],
      attributes: ["amount", "description", "date", "category", "isIncome"],
      limit: Number(perPage),
      offset: (page - 1) * perPage,
    });
    res.json({ expensesForSelectedMonth, totalRecords });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error while getting records" });
  }
};

// Download monthly expenses list
exports.downloadMonthlyList = async (req, res) => {
  try {
    const { selectedMonth, csvString } = req.body;

    const filename = `Expenses/${selectedMonth}/${
      req.user.id
    }/${new Date().toISOString()}.csv`;
    const fileUrl = await uploadToS3(csvString, filename);

    res.status(200).json({ fileUrl, success: true, string: csvString });
  } catch (error) {
    console.error(error);
    res.status(500).json({ fileUrl: "", success: false, error: error });
  }
};

// Add to downloads
exports.addToDownloads = async (req, res) => {
  try {
    const { fileUrl, selectedMonth, dateTime } = req.body;

    const newDownload = await Downloads.create({
      link: fileUrl,
      reportOfMonth: selectedMonth,
      dateTime: dateTime,
      userId: req.user.id,
    });

    res.status(200).json(newDownload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error in adding new download to model" });
  }
};

// List downloads
exports.listDownloads = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const perPage = req.query.perPage || 10;

    const downloadsList = await Downloads.findAll({
      attributes: ["reportOfMonth", "link", "dateTime"],
      where: { userId: req.user.id },
      order: [["dateTime", "DESC"]],
      limit: Number(perPage),
      offset: (page - 1) * perPage,
    });

    res.status(200).json(downloadsList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error in getting downloads list" });
  }
};

module.exports = router;
