const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAILUSERNAME,
    pass: process.env.EMAILPASS,
  },
});

const sendPriceDropEmail = async (email, product, oldPrice, newPrice) => {
  try {
    const mailOptions = {
      from: process.env.EMAILUSERNAME,
      to: email,
      subject: `Price Drop Alert: ${product.name}`,
      html: `
        <h2>Good News!</h2>
        <p>The price for <strong>${product.name}</strong> has dropped.</p>
        <p>Old Price: ₹${oldPrice}</p>
        <p><strong>New Price: ₹${newPrice}</strong></p>
        <p><a href="${product.url}">Click here to view the product</a></p>
      `,
    };
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Price drop alert sent to ${email} for ${product.name}`);
  } catch (error) {
    console.error("[Email] Error sending price drop email:", error);
  }
};

const sendWeeklyReportEmail = async (email, products) => {
  try {
    let productListHtml = products.map(p => `
      <li>
        <a href="${p.url}">${p.name}</a> - Current Price: ₹${p.price}
      </li>
    `).join("");

    const mailOptions = {
      from: process.env.EMAILUSERNAME,
      to: email,
      subject: "Your Weekly Price Tracking Report",
      html: `
        <h2>Weekly Price Report</h2>
        <p>Here is the status of the products you are currently tracking:</p>
        <ul>
          ${productListHtml}
        </ul>
      `,
    };
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Weekly report sent to ${email}`);
  } catch (error) {
    console.error("[Email] Error sending weekly report email:", error);
  }
};

module.exports = {
  sendPriceDropEmail,
  sendWeeklyReportEmail,
};
