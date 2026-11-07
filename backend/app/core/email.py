"""
Utilitaire d'envoi d'e-mail GNF-Token.

En développement (SMTP_HOST vide) : imprime le lien dans les logs.
En production   : envoie via SMTP (Gmail, Mailjet, SendGrid SMTP relay…).
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def send_password_reset_email(
    to_email: str,
    reset_url: str,
    first_name: str,
) -> None:
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        # Dev mode — affiche le lien dans les logs
        print(f"[GNF-Token DEV] Reset URL for {to_email}:")
        print(f"  → {reset_url}")
        return

    subject = "Réinitialisation de votre mot de passe GNF-Token"

    html = f"""<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#F4F6FA;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FA;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0A1F44;padding:28px 32px;border-radius:16px 16px 0 0;text-align:center;">
            <span style="color:#F5A623;font-size:22px;font-weight:800;letter-spacing:-0.03em;">GNF</span>
            <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.03em;">-Token</span>
            <p style="color:rgba(255,255,255,0.45);font-size:12px;margin:4px 0 0;">Plateforme sécurisée BCRG</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 32px;border-radius:0 0 16px 16px;
                     border:1px solid #E4E9F2;border-top:none;">
            <h2 style="color:#0D1B2A;font-size:18px;margin:0 0 16px;font-weight:700;">
              Bonjour {first_name},
            </h2>
            <p style="color:#6B7A99;font-size:15px;line-height:1.65;margin:0 0 28px;">
              Vous avez demandé la réinitialisation de votre mot de passe GNF-Token.<br>
              Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
            </p>

            <div style="text-align:center;margin:0 0 28px;">
              <a href="{reset_url}"
                 style="background:#1649FF;color:#ffffff;padding:15px 36px;
                        border-radius:10px;text-decoration:none;font-weight:700;
                        font-size:15px;display:inline-block;letter-spacing:-0.01em;">
                Réinitialiser mon mot de passe
              </a>
            </div>

            <p style="color:#9BA8C0;font-size:13px;line-height:1.6;margin:0 0 24px;">
              ⏱ Ce lien expire dans <strong>1 heure</strong>.<br>
              Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail —
              votre mot de passe reste inchangé.
            </p>

            <hr style="border:none;border-top:1px solid #E4E9F2;margin:0 0 20px;">

            <p style="color:#C0C8D8;font-size:11px;text-align:center;margin:0;">
              © GNF-Token — Données chiffrées &amp; Transactions sécurisées BCRG
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.sendmail(settings.EMAIL_FROM, to_email, msg.as_string())
    except Exception as exc:
        # Ne pas propager — l'API retourne quand même 204 (pas d'énumération)
        print(f"[EMAIL ERROR] {to_email}: {exc}")
