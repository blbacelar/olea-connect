# Slack signup alert

The `/api/stripe/checkout` route sends one Slack alert after a **new** auth account, provisioning request and required consent records have been saved. A duplicate account attempt, invalid referral, or rolled-back signup does not send an alert. The alert states that email verification and payment may still be pending; it is not a paid-subscription notification.

The message includes the person's name and email, organization, selected plan, and referral code if supplied. It uses Slack `plain_text` blocks so user-entered text cannot create mentions or links. Slack delivery errors are logged but do not cancel the signup. The current integration makes one delivery attempt; failed attempts are not queued for retry.

## Configuration

1. The private [#olea-signups](https://app.slack.com/client/T0BCZ6D2BU2/C0CGLK5U6EN) channel exists in the **Olive Social Impact** workspace. The **Olea Connects Signup Alerts** app is installed with only the bot `chat:write` scope and is a member of that channel. Slack's [`chat.postMessage` documentation](https://docs.slack.dev/reference/methods/chat.postMessage/) describes the channel API.
2. Vercel **Production** has `SLACK_SIGNUP_BOT_TOKEN` as a Secret, `SLACK_SIGNUP_DESTINATION_ID=C0CGLK5U6EN`, and `SLACK_SIGNUP_NOTIFY_USER_ID=U0BD2RBB736`. The app mentions Bruno in the channel so Slack raises a personal notification. Do not put the token in source control or a `NEXT_PUBLIC_` variable. Configure Preview separately only if test alerts are wanted there.
3. Redeploy the target environment. Submit a disposable signup with a real QA email address, then check for exactly one message in #olea-signups. Verify the message says verification/payment may still be pending, and that a repeat attempt does not alert again.

Without all three environment variables, signup still works and the server logs `Signup Slack alert is not configured`. A configured Slack API error is logged as `Unable to send signup Slack alert`.

On 2026-11-10, a disposable signup against development Supabase Auth produced [one Slack message](https://olivesocialimpact.slack.com/archives/C0CGLK5U6EN/p1794354393228689) with the configured Bruno mention and `Environment: development`. The signup returned `verification_required`; a repeated request was rate-limited, and the disposable Auth user and provisioning request were removed afterward. This check used the production bot token only in a temporary local process environment; it did not deploy code.
