const PDFDocument = require('pdfkit')
const fs          = require('fs')
const path        = require('path')
const sendEmail   = require("../services/sendMail")
const ewayService = require("../services/ewayService")
const Transaction = require("../models/TransactionModelNew")
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel")
const SubscriptionPlan = require("../models/SubscriptionPlanModel")
const SubscriptionType = require("../models/SubscriptionTypeModel")
const Provider = require("../models/providerModel")

exports.initiatePayment = async (req, res) => {
  try {
    const requiredCustomerFields = ["FirstName","LastName","Email","CardDetails"]
    const requiredCardFields     = ["Name","Number","ExpiryMonth","ExpiryYear","CVN"]
    const requiredPaymentFields  = ["TotalAmount","CurrencyCode"]
    const { Customer, Payment, userId, subscriptionPlanId } = req.body

    if (!Customer || !Payment) {
      return res.status(400).json({ message:"Missing Customer or Payment object" })
    }

    const missingCustomer = requiredCustomerFields.filter(f => !Customer[f])
    const missingCard     = requiredCardFields.filter(f => !Customer.CardDetails?.[f])
    const missingPayment  = requiredPaymentFields.filter(f => !Payment[f])
    if (missingCustomer.length || missingCard.length || missingPayment.length) {
      return res.status(400).json({
        message:"Missing required fields",
        missingFields:{ Customer: missingCustomer, CardDetails: missingCard, Payment: missingPayment }
      })
    }

    const provider         = await Provider.findById(userId).lean()
    const subscriptionPlan = await SubscriptionPlan.findById(subscriptionPlanId).lean()
    const subscriptionType = subscriptionPlan
      ? await SubscriptionType.findById(subscriptionPlan.type).lean()
      : null

    if (!provider)         return res.status(404).json({ message:"Provider not found" })
    if (!subscriptionPlan) return res.status(404).json({ message:"Subscription Plan not found" })
    if (!subscriptionType) return res.status(404).json({ message:"Subscription Type not found" })

    const paymentData = {
      Customer: {
        FirstName: Customer.FirstName,
        LastName:  Customer.LastName,
        Email:     Customer.Email,
        CardDetails: {
          Name:        Customer.CardDetails.Name,
          Number:      Customer.CardDetails.Number.replace(/\s/g,""),
          ExpiryMonth: Customer.CardDetails.ExpiryMonth.padStart(2,"0"),
          ExpiryYear:  Customer.CardDetails.ExpiryYear.length===2
                        ? `20${Customer.CardDetails.ExpiryYear}`
                        : Customer.CardDetails.ExpiryYear,
          CVN:         Customer.CardDetails.CVN
        }
      },
      Payment: {
        TotalAmount:  Payment.TotalAmount,
        CurrencyCode: Payment.CurrencyCode
      },
      TransactionType: "MOTO",
      Capture: true
    }
    const ewayResponse = await ewayService.createTransaction(paymentData)
    const txId = ewayResponse.TransactionID
    if (!txId) {
      return res.status(400).json({
        message: "Failed to process payment: Missing TransactionID",
        error:   "TransactionID not found in response",
        details: ewayResponse
      })
    }

    const amountCharged = (Payment.TotalAmount||0)/100
    const txn = new Transaction({
      userId,
      subscriptionPlanId,
      status:   ewayResponse.TransactionStatus ? "completed" : "failed",
      amount:   amountCharged,
      currency: Payment.CurrencyCode,
      transaction: {
        transactionPrice:  amountCharged,
        transactionStatus: ewayResponse.TransactionStatus ? "Success" : "Failed",
        transactionType:   ewayResponse.TransactionType,
        authorisationCode: ewayResponse.AuthorisationCode,
        transactionDate:   new Date(),
        transactionId:     txId
      },
      payment: {
        paymentSource: "eway",
        totalAmount:   amountCharged,
        countryCode:   Payment.CurrencyCode
      },
      payer: {
        payerId:    ewayResponse.Customer.TokenCustomerID||"",
        payerName:  ewayResponse.Customer.CardDetails.Name,
        payerEmail: ewayResponse.Customer.Email
      }
    })
    await txn.save()

    const setToMidnight = d => { d.setHours(0,0,0,0); return d }
    const todayMidnight  = setToMidnight(new Date())

    const existingActive = await SubscriptionVoucherUser.findOne({
      userId,
      status: "active"
    }).sort({ startDate:-1 })

    let newStartDate, newStatus

    if (existingActive && subscriptionType.type !== "Subscription") {
      existingActive.status  = "expired"
      existingActive.endDate = todayMidnight
      await existingActive.save()

      newStartDate = todayMidnight
      newStatus    = "active"
    } else {
      const latestSub = await SubscriptionVoucherUser.findOne({
        userId,
        status: { $in:["active","upcoming"] }
      }).sort({ endDate:-1 })

      if (latestSub) {
        newStartDate = setToMidnight(new Date(latestSub.endDate))
        newStatus    = "upcoming"
      } else {
        newStartDate = todayMidnight
        newStatus    = "active"
      }
    }

    const newEndDate = new Date(newStartDate)
    newEndDate.setDate(newEndDate.getDate() + subscriptionPlan.validity)

    const newSubscription = new SubscriptionVoucherUser({
      userId,
      type:               subscriptionType.type,
      subscriptionPlanId,
      startDate:          newStartDate,
      endDate:            newEndDate,
      status:             newStatus,
      kmRadius:           subscriptionPlan.kmRadius
    })
    await newSubscription.save()

    if (newStatus === "active") {
      await Provider.findByIdAndUpdate(userId, {
        subscriptionStatus: 1,
        isGuestMode:       false,
        subscriptionType:  subscriptionType.type,
        subscriptionPlanId,
        "address.radius":  subscriptionPlan.kmRadius * 1000
      })
    }

    const gst      = +(amountCharged * 0.10).toFixed(2)
    const subTotal = +(amountCharged * 0.90).toFixed(2)
    const nowDate  = new Date().toLocaleDateString()
    const doc      = new PDFDocument({ margin:50 })
    const buffers  = []
    doc.on('data', buffers.push.bind(buffers))

    const { pdfGenerated, emailSent } = await new Promise(resolve => {
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(buffers)
        let emailSuccess = false
        try {
          await sendEmail(
            Customer.Email,
            `Your Invoice #${txId}`,
            `<p>Hi ${Customer.FirstName},</p>
             <p>Thank you for your payment of $${amountCharged.toFixed(2)}. Please find your invoice attached.</p>
             <p>Regards,<br/>Trade Hunters Team</p>`,
            [{ filename:`invoice_${txId}.pdf`, content:pdfBuffer, contentType:'application/pdf' }]
          )
          emailSuccess = true
        } catch(err) {
          console.error("Invoice email failed:", err)
        }
        resolve({ pdfGenerated: pdfBuffer.length>0, emailSent: emailSuccess })
      })

      const logoPath = path.join(__dirname, '../utils/tredhunter.jpg')
      const leftX    = 50
      const rightX   = 330
      const pageWidth= doc.page.width - 2 * leftX
      const lineHeight = 20
      let y = 50

      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, leftX, y, { width:50 })
      }

      doc
        .fontSize(18)
        .fillColor('#003366')
        .font('Helvetica-Bold')
        .text('Trade Hunters PVT LTD', rightX, y, { align: 'right' })
        .fontSize(10)
        .fillColor('black')
        .font('Helvetica')
        .text('ABN: 24 682 578 892', rightX, y + lineHeight, { align: 'right' })

      y += lineHeight * 3

      doc
        .moveTo(leftX, y)
        .lineTo(leftX + pageWidth, y)
        .strokeColor('#666')
        .lineWidth(1)
        .stroke()

      y += 15

      doc.fontSize(11).fillColor('#000')
      doc
        .text('Business Name:', leftX, y)
        .font('Helvetica-Bold')
        .text(provider.businessName, leftX + 110, y)
        .font('Helvetica')

      y += lineHeight
      doc.text('Business Address:', leftX, y)
      const addrHeight = doc.heightOfString(provider.address.addressLine, { width:220 })
      doc
        .font('Helvetica-Bold')
        .text(provider.address.addressLine, leftX + 100, y, { width:180 })
        .font('Helvetica')

      y -= lineHeight
      doc
        .text('Invoice No.:', rightX + 50, y)
        .font('Helvetica-Bold')
        .text(txId.toString(), rightX + 120, y)
        .font('Helvetica')

      y += lineHeight
      doc
        .text('Invoice Date:', rightX + 50, y + addrHeight - lineHeight)
        .font('Helvetica-Bold')
        .text(nowDate, rightX + 120, y + addrHeight - lineHeight)
        .font('Helvetica')

      y += addrHeight + 50

      doc
        .moveTo(leftX, y)
        .lineTo(leftX + pageWidth, y)
        .strokeColor('#666')
        .lineWidth(1)
        .stroke()

      y += lineHeight

      doc
        .fontSize(12)
        .fillColor('#003366')
        .font('Helvetica-Bold')
        .text('Description:', leftX, y)
      y += lineHeight * 0.8
      doc
        .font('Helvetica')
        .fillColor('black')
        .text(subscriptionPlan.description, leftX, y, { width:pageWidth })
      y = doc.y + lineHeight * 1.2

      doc
        .fillColor('#003366')
        .font('Helvetica-Bold')
        .text('Plan:', leftX, y)
      y += lineHeight * 0.8
      doc
        .fillColor('black')
        .font('Helvetica')
        .text(`${subscriptionType.type} – ${subscriptionPlan.name}`, leftX, y)

      y += lineHeight * 2

      doc
        .rect(rightX + 120, y - 10, 150, lineHeight * 3.5)
        .fillOpacity(0.05)
        .fill('#003366')
        .fillOpacity(1)

      doc
        .fillColor('black')
        .font('Helvetica')
        .text(`Subtotal: $${subTotal.toFixed(2)}`, rightX + 130, y)
        .text(`GST (10%): $${gst.toFixed(2)}`, rightX + 130, y + lineHeight)
        .font('Helvetica-Bold')
        .text(`Total: $${amountCharged.toFixed(2)}`, rightX + 130, y + lineHeight*2)

      const footerY = doc.page.height - 80
      doc
        .fontSize(11)
        .fillColor('black')
        .text('Regards,', leftX, footerY)
        .text('Trade Hunters Team', leftX, footerY + lineHeight - 5)

      doc.end()
    })

    return res.status(200).json({
      message:         "Payment processed successfully",
      userId,
      subscriptionPlanId,
      subscriptionType: subscriptionType.type,
      transactionId:    txId,
      status:           ewayResponse.TransactionStatus,
      responseCode:     ewayResponse.ResponseCode,
      amountCharged:    `${amountCharged}$`,
      gatewayResponse:  ewayResponse,
      pdfGenerated,
      emailSent
    })

  } catch (error) {
    console.error("Payment Processing Error:", error)
    const details = error.response?.data
    return res.status(500).json({
      message: "Payment initiation failed",
      error:   error.message,
      details,
      stack: process.env.NODE_ENV==="development"? error.stack : undefined
    })
  }
}






exports.getAllTransactions = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10)  || 1)
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10)
    const { search } = req.query
    let filter = {}
    if (search && search.trim()) {
      const matchingUsers = await User
        .find({ businessName: { $regex: new RegExp(search.trim(), 'i') } })
        .select('_id')
      const userIds = matchingUsers.map(u => u._id)
      filter.userId = { $in: userIds }
    }

    const totalCount = await Transaction.countDocuments(filter)

    const transactions = await Transaction
      .find(filter)
      .sort({ 'transaction.transactionDate': -1 })   
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'contactName email businessName')
      .populate('subscriptionPlanId', 'planName kmRadius')

    return res.status(200).json({
      count: transactions.length,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      transactions,
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return res.status(500).json({
      message: 'Failed to fetch transactions',
      error: error.message,
    })
  }
}

exports.getTotalSubscriptionRevenue = async (req, res) => {
  try {
    const { month, financialYear } = req.query;
    let conditions = [];

    if (financialYear) {
      const [startYear, endYear] = financialYear.split("-").map(Number);
      const fyStart = new Date(`${startYear}-07-01T00:00:00.000Z`);
      const fyEnd = new Date(`${endYear}-06-30T23:59:59.999Z`);
      conditions.push({ createdAt: { $gte: fyStart, $lte: fyEnd } });
    }

    if (month) {
      let monthNum = Number(month);
      if (isNaN(monthNum)) {
        const monthMapping = {
          january: 1,
          february: 2,
          march: 3,
          april: 4,
          may: 5,
          june: 6,
          july: 7,
          august: 8,
          september: 9,
          october: 10,
          november: 11,
          december: 12,
        };
        monthNum = monthMapping[month.toLowerCase()];
      }
      conditions.push({ $expr: { $eq: [{ $month: "$createdAt" }, monthNum] } });
    }

    const matchConditions = conditions.length > 0 ? { $and: conditions } : {};

    const totalRevenue = await Transaction.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Total subscription revenue fetched",
      data: {
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].totalAmount : 0,
      },
    });
  } catch (error) {
    console.error("Error in getTotalSubscriptionRevenue:", error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Failed to fetch subscription revenue",
      data: null,
    });
  }
};

exports.getSubscriptionByUserId = async (req, res) => {
  try {
    const { userId } = req.user;

    // 1) Fetch all transactions & vouchers
    const transactions = await Transaction.find({ userId })
      .populate("subscriptionPlanId", "planName kmRadius")
      .lean();
    const subscriptions = await SubscriptionVoucherUser.find({ userId })
      .select("subscriptionPlanId startDate endDate status")
      .lean();

    // 2) Group both lists by planId
    const txByPlan = {};
    for (const t of transactions) {
      const planId = t.subscriptionPlanId?._id.toString() || "none";
      txByPlan[planId] = txByPlan[planId] || [];
      txByPlan[planId].push(t);
    }

    const vchByPlan = {};
    for (const v of subscriptions) {
      const planId = v.subscriptionPlanId.toString();
      vchByPlan[planId] = vchByPlan[planId] || [];
      vchByPlan[planId].push(v);
    }

    // 3) For each plan, sort txns & vouchers by date ascending
    for (const planId of Object.keys(txByPlan)) {
      txByPlan[planId].sort((a, b) =>
        new Date(a.transaction.transactionDate) - new Date(b.transaction.transactionDate)
      );
      vchByPlan[planId]?.sort((a, b) =>
        new Date(a.startDate) - new Date(b.startDate)
      );
    }

    // 4) Now zip: i-th transaction → i-th voucher (or last voucher if fewer)
    const combined = [];
    for (const planId of Object.keys(txByPlan)) {
      const txns = txByPlan[planId];
      const vchs = vchByPlan[planId] || [];
      for (let i = 0; i < txns.length; i++) {
        const txn = txns[i];
        const v = vchs[i] || vchs[vchs.length - 1] || null;
        combined.push({
          ...txn,
          subscriptionStartDate: v?.startDate ?? null,
          subscriptionEndDate:   v?.endDate   ?? null,
          subscriptionStatus:    v?.status    ?? null,
        });
      }
    }

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Data fetched successfully",
      data: combined,
    });
  } catch (err) {
    console.error("Error in getSubscriptionByUserId:", err);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};



