import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const FRONTEND_URL = (process.env.FRONTEND_URL?.trim() || 'http://localhost:5173').replace(/\/$/, '');

const sendEmail = async ({ to, subject, html, text }) => {
    const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim();
    const SENDER_EMAIL = process.env.SENDER_EMAIL?.trim();

    if (!BREVO_API_KEY || !SENDER_EMAIL) {
        console.log('Brevo API key or Sender Email not configured. Fallback content:');
        console.log('\n==== EMAIL DEVELOPMENT FALLBACK ====');
        console.log(`${text}`);
        console.log('====================================\n');
        return false;
    }

    try {
        await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { email: SENDER_EMAIL, name: 'MedLink DZ' },
            to: [{ email: to }],
            subject: subject,
            htmlContent: html,
            textContent: text
        }, {
            headers: {
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        return true;
    } catch (error) {
        console.error('Failed to send email via Brevo:', error?.response?.data || error.message);
        console.log('\n==== EMAIL DEVELOPMENT FALLBACK ====');
        console.log(`Email failed to send. Fallback link:\n${text}\n`);
        console.log('====================================\n');
        return false;
    }
};

// Hash a plain text password
export const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

// Compare plain text password with hashed password
export const comparePassword = async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
};

// Generate a JWT token with user info
export const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Generate a verification token for email confirmation
export const generateVerifyToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, type: 'verify' },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
};

// Generate a password reset token
export const generateResetToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, type: 'reset' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
};

// Verify a JWT token and return the decoded payload
export const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

// Verify a password reset token and return the decoded payload
export const verifyResetToken = (token) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'reset') {
        throw new Error('Invalid reset token');
    }
    return decoded;
};

// Verify an email verification token and return the decoded payload
export const verifyVerifyToken = (token) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'verify') {
        throw new Error('Invalid verification token');
    }
    return decoded;
};

export const sendVerificationEmail = async (user, token) => {
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Vérifiez votre email MedLink DZ';
    const text = `Bonjour ${user.prenom},\n\nBienvenue sur MedLink DZ ! Cliquez sur le lien suivant pour vérifier votre adresse email : ${verifyUrl}\n\nSi vous n'avez pas créé de compte, ignorez cet email.`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 600px; width: 100%;">
                        <!-- Header -->
                        <tr>
                            <td align="center" style="background-color: #059669; padding: 30px 20px;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">MedLink DZ</h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="color: #1f2937; margin-top: 0; font-size: 22px;">Bonjour ${user.prenom},</h2>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                                    Bienvenue sur <strong>MedLink DZ</strong> ! Nous sommes ravis de vous compter parmi nous. Pour commencer à utiliser notre plateforme d'entraide médicale, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :
                                </p>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center" style="padding: 10px 0 30px 0;">
                                            <a href="${verifyUrl}" style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);">
                                                Vérifier mon email
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 0;">
                                    Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                                    <a href="${verifyUrl}" style="color: #059669; word-break: break-all;">${verifyUrl}</a>
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td align="center" style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 13px; margin: 0;">
                                    Si vous n'avez pas créé de compte, vous pouvez ignorer cet email en toute sécurité.<br>
                                    &copy; ${new Date().getFullYear()} MedLink DZ. Tous droits réservés.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
    return sendEmail({ to: user.email, subject, text, html });
};

export const sendResetPasswordEmail = async (user, token) => {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = 'Réinitialisation de votre mot de passe MedLink DZ';
    const text = `Bonjour ${user.prenom},\n\nVous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien suivant pour créer un nouveau mot de passe : ${resetUrl}\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez cet email.`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 600px; width: 100%;">
                        <!-- Header -->
                        <tr>
                            <td align="center" style="background-color: #059669; padding: 30px 20px;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">MedLink DZ</h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="color: #1f2937; margin-top: 0; font-size: 22px;">Bonjour ${user.prenom},</h2>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                                    Vous avez demandé la réinitialisation de votre mot de passe sur <strong>MedLink DZ</strong>. Ne vous inquiétez pas, cela arrive à tout le monde ! Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :
                                </p>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center" style="padding: 10px 0 30px 0;">
                                            <a href="${resetUrl}" style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);">
                                                Réinitialiser mon mot de passe
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 0;">
                                    Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                                    <a href="${resetUrl}" style="color: #059669; word-break: break-all;">${resetUrl}</a>
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td align="center" style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 13px; margin: 0;">
                                    Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.<br>
                                    &copy; ${new Date().getFullYear()} MedLink DZ. Tous droits réservés.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
    return sendEmail({ to: user.email, subject, text, html });
};
