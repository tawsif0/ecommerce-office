// utils/emailTemplates.js
const nodemailer = require("nodemailer");

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Order status email template
const getOrderStatusEmailTemplate = (order, newStatus) => {
  const statusMessages = {
    pending: "is pending confirmation",
    processing: "is now being processed",
    shipped: "has been shipped",
    delivered: "has been delivered successfully",
    cancelled: "has been cancelled",
  };

  const statusColors = {
    pending: "#FFA500",
    processing: "#3498db",
    shipped: "#9b59b6",
    delivered: "#2ecc71",
    cancelled: "#e74c3c",
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
        }
        
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .header {
          background: #000000;
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        
        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
          font-weight: 600;
        }
        
        .header p {
          opacity: 0.9;
          font-size: 16px;
        }
        
        .content {
          padding: 30px;
        }
        
        .status-card {
          background: ${statusColors[newStatus] || "#3498db"};
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
        }
        
        .status-card h2 {
          font-size: 22px;
          margin-bottom: 10px;
          font-weight: 600;
        }
        
        .order-number {
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 2px;
          background: rgba(255,255,255,0.1);
          padding: 10px 20px;
          border-radius: 5px;
          display: inline-block;
          margin: 10px 0;
        }
        
        .info-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 25px 0;
          border-left: 4px solid #000;
        }
        
        .info-section h3 {
          color: #000;
          margin-bottom: 15px;
          font-size: 18px;
        }
        
        .product-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .product-table th {
          background: #f1f1f1;
          padding: 15px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #ddd;
        }
        
        .product-table td {
          padding: 15px;
          border-bottom: 1px solid #eee;
        }
        
        .product-table tr:last-child td {
          border-bottom: none;
        }
        
        .product-image {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 5px;
        }
        
        .summary {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 25px 0;
          border: 1px solid #eee;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f1f1f1;
        }
        
        .summary-row:last-child {
          border-bottom: none;
          font-weight: bold;
          font-size: 18px;
          padding-top: 15px;
          color: #000;
        }
        
        .tracking-link {
          display: block;
          text-align: center;
          background: #000;
          color: white;
          padding: 15px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          margin: 25px 0;
          transition: all 0.3s ease;
        }
        
        .tracking-link:hover {
          background: #333;
        }
        
        .footer {
          text-align: center;
          padding: 25px;
          color: #666;
          font-size: 14px;
          background: #f8f9fa;
          border-top: 1px solid #eee;
        }
        
        .footer p {
          margin: 5px 0;
        }
        
        .contact-info {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 5px;
          }
          
          .header {
            padding: 20px 15px;
          }
          
          .content {
            padding: 20px 15px;
          }
          
          .product-table {
            font-size: 14px;
          }
          
          .product-table th,
          .product-table td {
            padding: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Status Update</h1>
          <p>Your order status has been updated</p>
        </div>
        
        <div class="content">
          <div class="status-card">
            <h2>Order ${statusMessages[newStatus]}</h2>
            <div class="order-number">${order.orderNumber}</div>
            <p>Status: <strong>${newStatus.toUpperCase()}</strong></p>
          </div>
          
          <div class="info-section">
            <h3>Order Information</h3>
            <p><strong>Customer:</strong> ${order.shippingAddress?.firstName} ${order.shippingAddress?.lastName}</p>
            <p><strong>Email:</strong> ${order.shippingAddress?.email}</p>
            <p><strong>Phone:</strong> ${order.shippingAddress?.phone}</p>
            <p><strong>Order Date:</strong> ${new Date(
              order.createdAt,
            ).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
          </div>
          
          <h3 style="color: #000; margin-bottom: 15px;">Order Items</h3>
          <table class="product-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items
                .map(
                  (item) => `
                <tr>
                  <td>
                    <strong>${item.product?.title || "Product"}</strong>
                    ${item.color ? `<br><small>Color: ${item.color}</small>` : ""}
                    ${item.size ? `<br><small>Size: ${item.size}</small>` : ""}
                  </td>
                  <td>${item.quantity}</td>
                  <td>৳${item.price?.toFixed(2)}</td>
                  <td>৳${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="summary">
            <h3 style="color: #000; margin-bottom: 15px;">Order Summary</h3>
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>৳${order.subtotal?.toFixed(2)}</span>
            </div>
            ${
              order.shippingFee > 0
                ? `
            <div class="summary-row">
              <span>Shipping Fee:</span>
              <span>৳${order.shippingFee?.toFixed(2)}</span>
            </div>
            `
                : ""
            }
            ${
              order.discount > 0
                ? `
            <div class="summary-row">
              <span>Discount:</span>
              <span>-৳${order.discount?.toFixed(2)}</span>
            </div>
            `
                : ""
            }
            <div class="summary-row">
              <span>Total Amount:</span>
              <span>৳${order.total?.toFixed(2)}</span>
            </div>
          </div>
          
          <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/track-order/${order.orderNumber}" class="tracking-link">
            Track Your Order
          </a>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #000; margin-bottom: 10px;">Shipping Address</h4>
            <p>${order.shippingAddress?.address}</p>
            <p>${order.shippingAddress?.city}, ${order.shippingAddress?.district || ""} ${order.shippingAddress?.postalCode}</p>
            <p>${order.shippingAddress?.country || "Bangladesh"}</p>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for shopping with us!</p>
          <p>If you have any questions about your order, please contact our support team.</p>
          
          <div class="contact-info">
            <p><strong>Support Email:</strong> ${process.env.SUPPORT_EMAIL || "support@example.com"}</p>
            <p><strong>Support Phone:</strong> ${process.env.SUPPORT_PHONE || "+880 1XXX-XXXXXX"}</p>
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            © ${new Date().getFullYear()} ${process.env.STORE_NAME || "E-Commerce Store"}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send order status email
const sendOrderStatusEmail = async (order, newStatus) => {
  try {
    const transporter = createTransporter();
    const email = order.shippingAddress?.email || order.user?.email;

    if (!email) {
      console.warn(`No email found for order ${order.orderNumber}`);
      return false;
    }

    const mailOptions = {
      from: `"${process.env.STORE_NAME || "E-Commerce Store"}" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: `Order #${order.orderNumber} Status Update - ${newStatus.toUpperCase()}`,
      html: getOrderStatusEmailTemplate(order, newStatus),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Status email sent for order ${order.orderNumber} to ${email}`);
    return true;
  } catch (error) {
    console.error(
      `Failed to send status email for order ${order.orderNumber}:`,
      error,
    );
    return false;
  }
};

module.exports = {
  sendOrderStatusEmail,
  getOrderStatusEmailTemplate,
};
