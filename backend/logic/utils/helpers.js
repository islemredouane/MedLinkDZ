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
    <html lang="fr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap');
            
            body {
                margin: 0;
                padding: 0;
                width: 100% !important;
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
                background-color: #050b12;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            img {
                border: 0;
                outline: none;
                text-decoration: none;
                -ms-interpolation-mode: bicubic;
            }
            
            .title-text {
                font-family: 'Space Grotesk', -apple-system, sans-serif;
            }
            
            .cta-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5) !important;
                background: linear-gradient(135deg, #14b8a6 0%, #10b981 100%) !important;
            }
            
            @media only screen and (max-width: 600px) {
                .email-container {
                    width: 100% !important;
                    padding: 10px !important;
                }
                .card-body {
                    padding: 30px 20px !important;
                }
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #050b12; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050b12; background-image: radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 50%), radial-gradient(circle at 50% 100%, rgba(20, 184, 166, 0.08) 0%, transparent 50%); padding: 40px 10px;">
            <tr>
                <td align="center">
                    <table class="email-container" width="100%" max-width="580" border="0" cellspacing="0" cellpadding="0" style="background-color: #091520; border-radius: 16px; border: 1px solid rgba(16, 185, 129, 0.18); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4); max-width: 580px; width: 100%; overflow: hidden;">
                        <tr>
                            <td height="4" style="background: linear-gradient(90deg, #10b981 0%, #14b8a6 100%); line-height: 4px; font-size: 0px;">&nbsp;</td>
                        </tr>
                        <tr>
                            <td class="card-body" style="padding: 45px 35px;">
                                <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 35px; width: 100%;">
                                    <tr>
                                        <td>
                                            <table border="0" cellspacing="0" cellpadding="0" align="left">
                                                <tr>
                                                    <td style="vertical-align: middle; padding-right: 12px;">
                                                        <div style="background-color: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; width: 44px; height: 44px; text-align: center; display: inline-block;">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 10px; display: inline-block; vertical-align: middle;">
                                                                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                                                                <path d="M3.22 12H9.5l1.5-3.5 2 7 1.5-3.5h3.28"/>
                                                            </svg>
                                                        </div>
                                                    </td>
                                                    <td style="vertical-align: middle;">
                                                        <span style="font-family: 'Space Grotesk', -apple-system, sans-serif; font-size: 23px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; line-height: 44px;">
                                                            Med<span style="color: #10b981;">Link</span>
                                                            <span style="font-family: 'Inter', -apple-system, sans-serif; font-weight: 600; font-size: 11px; color: #94a3b8; border: 1px solid rgba(148,163,184,0.15); background-color: rgba(255,255,255,0.03); padding: 3px 7px; border-radius: 6px; margin-left: 6px; letter-spacing: 0.5px; vertical-align: middle;">DZ</span>
                                                        </span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <h2 class="title-text" style="color: #ffffff; margin-top: 0; font-size: 24px; font-weight: 700; margin-bottom: 18px; letter-spacing: -0.01em;">Bonjour ${user.prenom},</h2>
                                
                                <p style="color: #94a3b8; font-size: 15px; line-height: 1.65; margin-bottom: 30px; margin-top: 0;">
                                    Bienvenue sur <strong>MedLink DZ</strong> ! Nous sommes ravis de vous compter parmi nous. Pour commencer à utiliser notre plateforme d'entraide médicale, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :
                                </p>
                                
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 35px;">
                                    <tr>
                                        <td align="center">
                                            <a href="${verifyUrl}" class="cta-btn" style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); background-color: #10b981; color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 30px; font-size: 16px; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35); transition: all 0.3s ease;">
                                                Vérifier mon email
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050b12; border: 1px solid rgba(148, 163, 184, 0.08); border-radius: 10px; padding: 18px;">
                                    <tr>
                                        <td>
                                            <p style="color: #475569; font-size: 12px; margin: 0 0 8px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Si le bouton ne fonctionne pas, copiez ce lien :</p>
                                            <a href="${verifyUrl}" style="color: #14b8a6; font-size: 13px; font-family: 'Courier New', Courier, monospace, monospace; text-decoration: none; word-break: break-all; font-weight: 500;">${verifyUrl}</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="background-color: rgba(5, 11, 18, 0.5); padding: 25px 30px; border-top: 1px solid rgba(148, 163, 184, 0.06);">
                                <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.5; text-align: center;">
                                    Si vous n'avez pas créé de compte, vous pouvez ignorer cet email en toute sécurité.<br>
                                    <span style="display: inline-block; margin-top: 10px; color: #34d399; font-weight: 500;">MedLink DZ &bull; Plateforme d'entraide médicale</span>
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
    <html lang="fr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap');
            
            body {
                margin: 0;
                padding: 0;
                width: 100% !important;
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
                background-color: #050b12;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            img {
                border: 0;
                outline: none;
                text-decoration: none;
                -ms-interpolation-mode: bicubic;
            }
            
            .title-text {
                font-family: 'Space Grotesk', -apple-system, sans-serif;
            }
            
            .cta-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5) !important;
                background: linear-gradient(135deg, #14b8a6 0%, #10b981 100%) !important;
            }
            
            @media only screen and (max-width: 600px) {
                .email-container {
                    width: 100% !important;
                    padding: 10px !important;
                }
                .card-body {
                    padding: 30px 20px !important;
                }
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #050b12; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050b12; background-image: radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 50%), radial-gradient(circle at 50% 100%, rgba(20, 184, 166, 0.08) 0%, transparent 50%); padding: 40px 10px;">
            <tr>
                <td align="center">
                    <table class="email-container" width="100%" max-width="580" border="0" cellspacing="0" cellpadding="0" style="background-color: #091520; border-radius: 16px; border: 1px solid rgba(16, 185, 129, 0.18); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4); max-width: 580px; width: 100%; overflow: hidden;">
                        <tr>
                            <td height="4" style="background: linear-gradient(90deg, #10b981 0%, #14b8a6 100%); line-height: 4px; font-size: 0px;">&nbsp;</td>
                        </tr>
                        <tr>
                            <td class="card-body" style="padding: 45px 35px;">
                                <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 35px; width: 100%;">
                                    <tr>
                                        <td>
                                            <table border="0" cellspacing="0" cellpadding="0" align="left">
                                                <tr>
                                                    <td style="vertical-align: middle; padding-right: 12px;">
                                                        <div style="background-color: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; width: 44px; height: 44px; text-align: center; display: inline-block;">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 10px; display: inline-block; vertical-align: middle;">
                                                                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                                                                <path d="M3.22 12H9.5l1.5-3.5 2 7 1.5-3.5h3.28"/>
                                                            </svg>
                                                        </div>
                                                    </td>
                                                    <td style="vertical-align: middle;">
                                                        <span style="font-family: 'Space Grotesk', -apple-system, sans-serif; font-size: 23px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; line-height: 44px;">
                                                            Med<span style="color: #10b981;">Link</span>
                                                            <span style="font-family: 'Inter', -apple-system, sans-serif; font-weight: 600; font-size: 11px; color: #94a3b8; border: 1px solid rgba(148,163,184,0.15); background-color: rgba(255,255,255,0.03); padding: 3px 7px; border-radius: 6px; margin-left: 6px; letter-spacing: 0.5px; vertical-align: middle;">DZ</span>
                                                        </span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <h2 class="title-text" style="color: #ffffff; margin-top: 0; font-size: 24px; font-weight: 700; margin-bottom: 18px; letter-spacing: -0.01em;">Bonjour ${user.prenom},</h2>
                                
                                <p style="color: #94a3b8; font-size: 15px; line-height: 1.65; margin-bottom: 30px; margin-top: 0;">
                                    Vous avez demandé la réinitialisation de votre mot de passe sur <strong>MedLink DZ</strong>. Pas de panique, cela arrive à tout le monde ! Cliquez sur le bouton ci-dessous pour choisir votre nouveau mot de passe de façon sécurisée :
                                </p>
                                
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 35px;">
                                    <tr>
                                        <td align="center">
                                            <a href="${resetUrl}" class="cta-btn" style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); background-color: #10b981; color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 30px; font-size: 16px; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35); transition: all 0.3s ease;">
                                                Réinitialiser mon mot de passe
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050b12; border: 1px solid rgba(148, 163, 184, 0.08); border-radius: 10px; padding: 18px;">
                                    <tr>
                                        <td>
                                            <p style="color: #475569; font-size: 12px; margin: 0 0 8px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Si le bouton ne fonctionne pas, copiez ce lien :</p>
                                            <a href="${resetUrl}" style="color: #14b8a6; font-size: 13px; font-family: 'Courier New', Courier, monospace, monospace; text-decoration: none; word-break: break-all; font-weight: 500;">${resetUrl}</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="background-color: rgba(5, 11, 18, 0.5); padding: 25px 30px; border-top: 1px solid rgba(148, 163, 184, 0.06);">
                                <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.5; text-align: center;">
                                    Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.<br>
                                    <span style="display: inline-block; margin-top: 10px; color: #34d399; font-weight: 500;">MedLink DZ &bull; Plateforme d'entraide médicale</span>
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

