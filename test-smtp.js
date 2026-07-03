const nodemailer = require('nodemailer');

async function testSmtp() {
  const user = 'moses.nyarko@htu.edu.gh';
  // Remove spaces from the app password, just in case
  const pass = 'bgya elid gdil hvkc'.replace(/\s/g, '');

  console.log("Testing SMTP connection with:", user);
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: user,
      pass: pass,
    },
  });

  try {
    const success = await transporter.verify();
    console.log("SMTP Connection Successful:", success);

    // Try sending an actual email
    const info = await transporter.sendMail({
      from: `"HTU Testing" <${user}>`,
      to: user,
      subject: "Test Email from Backend",
      text: "If you get this, SMTP is working!"
    });
    console.log("Email sent successfully! Message ID:", info.messageId);

  } catch (error) {
    console.error("SMTP Connection Error:");
    console.error(error);
  }
}

testSmtp();
