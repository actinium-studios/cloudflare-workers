import { EmailMessage } from "cloudflare:email";

const RECIPIENTS = {
  PANCAKSE: "you cant see my email grr",
  STILRY: "you cant see stilrys email"
};

export default {
  async fetch(request) {
    return new Response(
      "Actinium Studios email auto-reply Worker is running!",
      {
        status: 200,
        headers: {
          "Content-Type": "text/plain"
        }
      }
    );
  },

  async email(message) {
    console.log("EMAIL RECEIVED");
    console.log("From:", message.from);
    console.log("To:", message.to);

    const subject =
      message.headers.get("subject") || "Your message";

    const originalMessageId =
      message.headers.get("Message-ID");

    // Read the incoming email
    const emailText = await new Response(message.raw).text();

    // Look for: RECEIVER = PANCAKSE
    const match = emailText.match(
      /^\s*RECEIVER\s*=\s*([A-Z0-9_-]+)\s*$/im
    );

    const receiver = match
      ? match[1].toUpperCase()
      : null;

    console.log("Requested receiver:", receiver);

    // Decide who gets the forwarded email
    let destinations = [];

    if (receiver && RECIPIENTS[receiver]) {
      destinations = [RECIPIENTS[receiver]];
    } else {
      // No receiver specified → send to both
      destinations = Object.values(RECIPIENTS);
    }

    console.log("Forwarding to:", destinations);

    // -------------------------
    // AUTO-REPLY
    // -------------------------

    const replyBody = `Hi,

Thanks for contacting us!

We've received your email and will get back to you as soon as possible.

Please wait for our response.

Best,
Actinium Studios
`;

    const newMessageId =
      `<${crypto.randomUUID()}@actinium.top>`;

    const rawEmail = [
      `From: ${message.to}`,
      `To: ${message.from}`,
      `Subject: Re: ${subject}`,
      `Message-ID: ${newMessageId}`,
      originalMessageId
        ? `In-Reply-To: ${originalMessageId}`
        : "",
      originalMessageId
        ? `References: ${originalMessageId}`
        : "",
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      "",
      replyBody
    ]
      .filter(Boolean)
      .join("\r\n");

    const reply = new EmailMessage(
      message.to,
      message.from,
      rawEmail
    );

    await message.reply(reply);

    console.log("Automatic reply sent!");

    // -------------------------
    // FORWARD
    // -------------------------

    for (const destination of destinations) {
      console.log("Forwarding to:", destination);

      try {
        await message.forward(destination);
        console.log("Forward successful:", destination);
      } catch (error) {
        console.error(
          "Forward failed:",
          destination,
          error
        );
      }
    }

    console.log("EMAIL PROCESSING COMPLETE");
  }
};
