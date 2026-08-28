import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    // En este entorno el SMTP es Mailhog (docker-compose): no requiere
    // usuario/contraseña ni TLS, solo host/puerto -- para un proveedor real
    // (SendGrid, SES, etc.) alcanza con cambiar estas variables de entorno,
    // el código no cambia. secure se deriva del puerto (465 = TLS implícito)
    // salvo que MAIL_SECURE lo fuerce explícitamente.
    const port = Number(this.configService.get<string>('MAIL_PORT') ?? 1025);
    const secureOverride = this.configService.get<string>('MAIL_SECURE');
    const secure =
      secureOverride !== undefined ? secureOverride === 'true' : port === 465;

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST') ?? 'mailhog',
      port,
      secure,
    });

    this.from =
      this.configService.get<string>('MAIL_FROM') ??
      'Mapa Social <no-responder@mapasocial.local>';
    this.appUrl =
      this.configService.get<string>('APP_URL') ?? 'http://localhost';
  }

  async sendVerificationEmail(
    to: string,
    firstName: string,
    token: string,
  ): Promise<void> {
    const verifyUrl = `${this.appUrl}/verificar-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: 'Confirmá tu cuenta en Mapa Social',
        html: `
          <p>Hola ${firstName},</p>
          <p>Gracias por registrarte en Mapa Social. Confirmá tu cuenta haciendo clic en el siguiente enlace:</p>
          <p><a href="${verifyUrl}">${verifyUrl}</a></p>
          <p>El enlace vence en 48 horas. Hasta confirmarla, vas a poder iniciar sesión pero no publicar necesidades, recursos ni enviar solicitudes.</p>
        `,
      });
    } catch (error) {
      // El registro no debe fallar porque el correo no salió -- la cuenta
      // ya quedó creada y hay un endpoint de reenvío para este caso.
      this.logger.error(
        `No se pudo enviar el email de verificación a ${to}`,
        error as Error,
      );
    }
  }

  // A diferencia de sendVerificationEmail, 'to' acá NO es el email de la
  // cuenta -- es el email institucional que la persona declaró en el
  // formulario. Confirmar este link es la única prueba real de que
  // controla ese canal (ver el comentario en moderator-request.entity.ts).
  async sendModeratorVerificationEmail(
    to: string,
    firstName: string,
    institutionName: string,
    locality: string,
    token: string,
  ): Promise<void> {
    const verifyUrl = `${this.appUrl}/verificar-moderador?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: `Confirmá tu pedido de moderador municipal en Mapa Social`,
        html: `
          <p>Hola ${firstName},</p>
          <p>Recibimos un pedido para que tu cuenta administre "${locality}" en Mapa Social, en representación de ${institutionName}.</p>
          <p>Si fuiste vos, confirmalo haciendo clic en el siguiente enlace:</p>
          <p><a href="${verifyUrl}">${verifyUrl}</a></p>
          <p>El enlace vence en 48 horas. Si no pediste esto, podés ignorar este correo.</p>
        `,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el email de verificación de moderador a ${to}`,
        error as Error,
      );
    }
  }
}
