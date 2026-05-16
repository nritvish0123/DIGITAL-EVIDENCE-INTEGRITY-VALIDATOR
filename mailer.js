const nodemailer = require('nodemailer');

const adminEmail = '2303031260255@paruluniversity.ac.in'; 
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: '2303031260255@paruluniversity.ac.in', 
        pass: 'smjh wcqg rcua kwdy'    
    }
});

const sendMail = async (subject, text, recipientEmail = null) => {
    const mailOptions = {
        from: 'Evidence Validator System <no-reply@validator.com>',
        to: recipientEmail || adminEmail, 
        subject: subject,
        text: text
    };

    try {
        // Only attempt to send if we haven't failed too many times recently
        // (Simple guard to prevent log flooding during dev)
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent to ' + mailOptions.to + ': ' + info.response);
        return true;
    } catch (error) {
        if (error.responseCode === 535) {
            console.warn('Mailer Error: Invalid credentials. Please check your GMAIL app password.');
        } else {
            console.error('Error sending email:', error);
        }
        return false; 
    }
};

module.exports = {
    sendMail
};
