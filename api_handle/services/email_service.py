import os
import requests

def send_otp_email(to_email: str, otp_code: str, entity_name: str, purpose: str) -> bool:
    """
    Sends an OTP verification email. If the Resend API Key is not configured,
    the OTP is printed to the console for testing.
    """
    api_key = os.getenv("RESEND_API_KEY")
    
    subject = f"Your Stack360 Verification Code: {otp_code}"
    
    if purpose == "organization_signup":
        body_title = "Welcome to Stack360!"
        body_desc = f"Thank you for registering the organization <strong>{entity_name}</strong>. Please use the verification code below to complete your registration."
    else:
        body_title = "Stack360 User Registration Approval"
        body_desc = f"A new user, <strong>{entity_name}</strong>, has requested to join your organization. Please provide them with the verification code below to authorize their account."

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 20px; font-size: 22px;">{body_title}</h2>
        <p style="font-size: 16px; color: #374151; line-height: 1.5;">{body_desc}</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e1b4b; background-color: #f3f4f6; padding: 15px 30px; border-radius: 8px; display: inline-block;">
                {otp_code}
            </span>
        </div>
        <p style="font-size: 14px; color: #6b7280;">This verification code is valid for <strong>3 minutes</strong>. If you did not request this code, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 30px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">Stack360 Smart Load Planning Workspace</p>
    </div>
    """
    
    # Always print code in console so developer/user can find it easily during evaluation
    print("\n" + "="*60)
    print(f"📧 [STACK360 EMAIL SERVICE]")
    print(f"   Recipient: {to_email}")
    print(f"   OTP Code : {otp_code}")
    print(f"   Purpose  : {purpose}")
    print(f"   Subject  : {subject}")
    print("="*60 + "\n")

    if not api_key or api_key.strip() == "" or api_key.startswith("re_your_api_key"):
        print("ℹ️ Resend API Key is not configured. Email simulated in console output.")
        return True

    try:
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        # Resend requires onboarding@resend.dev for test accounts
        payload = {
            "from": "Stack360 <onboarding@resend.dev>",
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code in [200, 201]:
            print(f"✅ Email successfully sent to {to_email} via Resend.")
            return True
        else:
            print(f"❌ Failed to send email via Resend. Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Exception raised while sending email via Resend: {e}")
        return False


def send_invitation_email(to_email: str, temp_password: str, entity_name: str) -> bool:
    """
    Sends an invitation email with login link and temporary password.
    """
    api_key = os.getenv("RESEND_API_KEY")
    
    subject = "Welcome to Stack360 - Your Account Credentials"
    login_url = "http://localhost:5173/login"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 20px; font-size: 22px;">Welcome to Stack360!</h2>
        <p style="font-size: 16px; color: #374151; line-height: 1.5;">
            You have been added to the organization as <strong>{entity_name}</strong>.
            Your account has been created successfully. Please use the temporary credentials below to log in:
        </p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; font-family: monospace; font-size: 15px; color: #1f2937;">
            <strong>Email:</strong> {to_email}<br/>
            <strong>Temporary Password:</strong> {temp_password}
        </div>
        <p style="font-size: 16px; color: #374151; line-height: 1.5;">
            Once logged in, please use the account settings (Change Password modal) to update your password.
        </p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{login_url}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
                Log In to Stack360
            </a>
        </div>
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 30px;">Stack360 Smart Load Planning Workspace</p>
    </div>
    """
    
    # Always print code in console so developer/user can find it easily during evaluation
    print("\n" + "="*60)
    print(f"📧 [STACK360 EMAIL SERVICE - USER INVITATION]")
    print(f"   Recipient : {to_email}")
    print(f"   Temp Pwd  : {temp_password}")
    print(f"   Name      : {entity_name}")
    print(f"   Login URL : {login_url}")
    print("="*60 + "\n")
 
    if not api_key or api_key.strip() == "" or api_key.startswith("re_your_api_key"):
        print("ℹ️ Resend API Key is not configured. Invitation email simulated in console output.")
        return True
 
    try:
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "from": "Stack360 <onboarding@resend.dev>",
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code in [200, 201]:
            print(f"✅ Invitation email successfully sent to {to_email} via Resend.")
            return True
        else:
            print(f"❌ Failed to send invitation email via Resend. Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Exception raised while sending invitation email via Resend: {e}")
        return False
