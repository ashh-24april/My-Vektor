import nodemailer from "nodemailer";

export const maskEmail = (emailStr: string): string => {
  if (!emailStr || !emailStr.includes("@")) return emailStr;
  const [namePart, domainPart] = emailStr.split("@");
  if (namePart.length <= 2) {
    return `${namePart.charAt(0)}*@${domainPart}`;
  }
  const firstChar = namePart.charAt(0);
  const lastChar = namePart.charAt(namePart.length - 1);
  return `${firstChar}***${lastChar}@${domainPart}`;
};

export const sendRecoveryEmail = async (destEmail: string, resetUrl: string, userName: string) => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);

  if (!host || !user || !pass) {
    console.log("[SMTP] SMTP no configurado en .env. Se utiliza el enlace generado por Supabase Admin.");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #edf2f7;">
          <h1 style="color: #092C92; margin: 0; font-size: 24px;">MyVektor</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Sistema de Gestión de Transporte</p>
        </div>
        <div style="padding: 24px 0;">
          <h2 style="color: #1e293b; font-size: 18px; margin-bottom: 12px;">Recuperación de Contraseña</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Hola <strong>${userName}</strong>, hemos recibido una solicitud para restablecer la contraseña de tu cuenta.
          </p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Haz clic en el siguiente botón para continuar con el restablecimiento seguro de tu contraseña:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="background-color: #092C92; color: #ffffff; padding: 12px 28px; font-weight: 600; text-decoration: none; border-radius: 8px; font-size: 14px; display: inline-block;">
              Restablecer mi Contraseña
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
            Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura. El enlace caducará por razones de seguridad.
          </p>
        </div>
        <div style="border-top: 1px solid #edf2f7; padding-top: 16px; text-align: center;">
          <p style="color: #cbd5e1; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} MyVektor. Todos los derechos reservados.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"MyVektor Soporte" <${user}>`,
      to: destEmail,
      subject: "Recuperación de Contraseña - MyVektor",
      html: htmlContent
    });

    console.log(`[SMTP] Correo de recuperación enviado con éxito a ${destEmail} vía Nodemailer SMTP`);
    return true;
  } catch (err) {
    console.error("[SMTP] Error enviando correo vía Nodemailer:", err);
    return false;
  }
};
